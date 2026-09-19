import { tool } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildCampaignInMeta, type BuildCampaignInput } from "@/lib/meta/build";

// Tools the orchestrator can invoke. Each tool is stateless and takes the
// caller's Supabase client + objective id via a factory, so RLS still enforces
// membership on every write.

export function makeTools(opts: {
  supabase: SupabaseClient;
  objectiveId: string;
  companyId: string;
}) {
  const { supabase, objectiveId, companyId } = opts;

  return {
    save_brief: tool({
      description:
        "Guardar o actualizar el brief markdown del objetivo. Usar cuando el brief esté completo o cambie substancialmente.",
      parameters: z.object({
        brief_md: z.string().min(1).describe("Contenido markdown del brief."),
      }),
      execute: async ({ brief_md }) => {
        const { error } = await supabase
          .from("objectives")
          .update({ brief_md })
          .eq("id", objectiveId);
        if (error) return { ok: false, error: error.message };
        return { ok: true };
      },
    }),

    propose_creative: tool({
      description:
        "Proponer una nueva creatividad (copy de anuncio + prompt de imagen). Se guarda como draft para que el usuario elija.",
      parameters: z.object({
        copy_text: z.string().min(1).max(2000).describe("Copy del anuncio, listo para pegar en Meta."),
        image_prompt: z
          .string()
          .max(1000)
          .describe("Prompt de imagen para generar la creatividad visual. Puede quedar vacío."),
      }),
      execute: async ({ copy_text, image_prompt }) => {
        const { data, error } = await supabase
          .from("ad_creatives")
          .insert({ objective_id: objectiveId, copy_text, image_prompt: image_prompt || null })
          .select("id")
          .single();
        if (error || !data) return { ok: false, error: error?.message ?? "insert_failed" };
        return { ok: true, creative_id: data.id };
      },
    }),

    approve_creative: tool({
      description: "Marcar una creatividad como aprobada por el usuario. Solo si el usuario dijo que sí.",
      parameters: z.object({ creative_id: z.string().uuid() }),
      execute: async ({ creative_id }) => {
        const { error } = await supabase
          .from("ad_creatives")
          .update({ status: "approved" })
          .eq("id", creative_id)
          .eq("objective_id", objectiveId);
        if (error) return { ok: false, error: error.message };
        return { ok: true };
      },
    }),

    build_campaign_in_meta: tool({
      description:
        "Armar la campaña completa (campaign + ad set + ads) en la cuenta Meta conectada. Requiere confirmación explícita del usuario. Respeta el publish_mode del objetivo.",
      parameters: z.object({
        campaign_name: z.string().min(1).max(120),
        objective_type: z
          .enum([
            "OUTCOME_LEADS",
            "OUTCOME_SALES",
            "OUTCOME_TRAFFIC",
            "OUTCOME_ENGAGEMENT",
            "OUTCOME_AWARENESS",
            "OUTCOME_APP_PROMOTION",
          ])
          .describe("Objetivo de campaña Meta (ODAX)."),
        daily_budget_cents: z.number().int().positive().describe("Presupuesto diario TOTAL en centavos, en la moneda del ad account."),
        ad_set_name: z.string().min(1).max(120),
        targeting: z.object({
          geo_locations: z.object({
            countries: z.array(z.string().length(2)).optional(),
            regions: z.array(z.object({ key: z.string() })).optional(),
            cities: z.array(z.object({ key: z.string(), radius: z.number().optional() })).optional(),
          }).describe("Formato Meta targeting spec."),
          age_min: z.number().int().min(13).max(65).optional(),
          age_max: z.number().int().min(13).max(65).optional(),
          genders: z.array(z.enum(["1", "2"])).optional().describe("1=hombres, 2=mujeres"),
          interests: z.array(z.object({ id: z.string(), name: z.string() })).optional(),
        }),
        ads: z
          .array(
            z.object({
              creative_id: z.string().uuid().describe("id de ad_creatives ya aprobado"),
              name: z.string().min(1).max(120),
            })
          )
          .min(1)
          .max(6),
      }),
      execute: async (input) => {
        const buildInput: BuildCampaignInput = { ...input, objectiveId, companyId };
        const result = await buildCampaignInMeta(supabase, buildInput);
        return result;
      },
    }),

    adjust_campaign_budget: tool({
      description:
        "Cambiar el presupuesto diario de una campaña ya publicada en Meta. Usar cuando las métricas justifiquen mover plata (CPA muy alto en una, muy bajo en otra). Cada llamada queda registrada con el motivo y se muestra al usuario en el dashboard.",
      parameters: z.object({
        db_id: z.string().uuid().describe("id de la campaña (nuestra tabla)"),
        new_daily_budget_cents: z.number().int().positive().describe("Nuevo presupuesto diario en centavos, moneda del ad account."),
        reason: z.string().min(10).max(280).describe("Motivo en 1-2 frases. Aparece al usuario en el dashboard."),
      }),
      execute: async ({ db_id, new_daily_budget_cents, reason }) => {
        const { data: row } = await supabase
          .from("campaigns")
          .select("id, meta_campaign_id, objective_id, ad_sets(id, meta_adset_id, daily_budget_cents)")
          .eq("id", db_id)
          .maybeSingle();
        if (!row) return { ok: false, error: "not_found" };
        if (!row.meta_campaign_id) return { ok: false, error: "not_yet_in_meta" };

        // Budget in Meta lives at the ad set level under our current build
        // (adset daily budget). Adjust the first ad set as a v1; multi-adset
        // rebalancing is a follow-up.
        const adSetsArr = Array.isArray(row.ad_sets) ? row.ad_sets : row.ad_sets ? [row.ad_sets] : [];
        const primaryAdset = adSetsArr[0] as { id: string; meta_adset_id: string | null; daily_budget_cents: number | null } | undefined;
        if (!primaryAdset?.meta_adset_id) return { ok: false, error: "no_adset_in_meta" };

        const { getMetaConnection } = await import("@/lib/meta/graph");
        const conn = await getMetaConnection(supabase, companyId);
        if (!conn) return { ok: false, error: "meta_not_connected" };

        // POST directly to the adset node — Graph's PATCH-via-POST pattern.
        const params = new URLSearchParams({
          daily_budget: String(new_daily_budget_cents),
          access_token: conn.access_token,
        });
        const res = await fetch(`https://graph.facebook.com/v21.0/${primaryAdset.meta_adset_id}`, { method: "POST", body: params });
        const json = (await res.json()) as { success?: boolean; error?: { message: string } };
        if (!res.ok || json.error) return { ok: false, error: json.error?.message ?? "graph_error" };

        await supabase.from("ad_sets").update({ daily_budget_cents: new_daily_budget_cents }).eq("id", primaryAdset.id);
        await supabase.from("campaign_budget_changes").insert({
          campaign_id: db_id,
          old_daily_budget_cents: primaryAdset.daily_budget_cents,
          new_daily_budget_cents,
          reason,
          changed_by: "agent",
        });
        return { ok: true };
      },
    }),

    pause_or_activate: tool({
      description: "Cambiar el estado de una campaña/ad set/ad en Meta (PAUSED o ACTIVE).",
      parameters: z.object({
        entity: z.enum(["campaign", "ad_set", "ad"]),
        db_id: z.string().uuid(),
        target_status: z.enum(["ACTIVE", "PAUSED"]),
      }),
      execute: async ({ entity, db_id, target_status }) => {
        const table = entity === "campaign" ? "campaigns" : entity === "ad_set" ? "ad_sets" : "ads";
        const idCol = entity === "campaign" ? "meta_campaign_id" : entity === "ad_set" ? "meta_adset_id" : "meta_ad_id";
        const { data: row } = await supabase.from(table).select(`id, ${idCol}`).eq("id", db_id).maybeSingle();
        if (!row) return { ok: false, error: "not_found" };
        const metaId = (row as Record<string, string | null>)[idCol];
        if (!metaId) return { ok: false, error: "not_yet_in_meta" };

        // Delegate to Graph API via helper
        const { updateMetaEntityStatus } = await import("@/lib/meta/graph");
        const res = await updateMetaEntityStatus(supabase, companyId, metaId, target_status);
        if (!res.ok) return res;

        const dbStatus = target_status === "ACTIVE" ? "published" : "paused";
        await supabase.from(table).update({ status: dbStatus }).eq("id", db_id);
        return { ok: true };
      },
    }),
  } as const;
}
