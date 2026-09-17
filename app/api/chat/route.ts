import { NextResponse, type NextRequest } from "next/server";
import { streamText, convertToCoreMessages, type CoreMessage } from "ai";
import { supabaseServer } from "@/lib/supabase/server";
import { openrouter } from "@/lib/ai/openrouter";
import { orchestratorSystemPrompt } from "@/lib/ai/prompts";
import { makeTools } from "@/lib/ai/tools";
import { DEFAULT_MODEL_ID } from "@/lib/models";

export const runtime = "nodejs";

type IncomingMessage = { role: "user" | "assistant" | "system" | "tool"; content: string };

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    messages?: IncomingMessage[];
    threadId?: string;
    modelId?: string;
  } | null;
  if (!body?.threadId || !Array.isArray(body.messages)) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const supabase = await supabaseServer();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Load thread + objective + company + meta connection for context.
  const { data: thread } = await supabase
    .from("chat_threads")
    .select("id, objective_id, model_id, objectives!inner(id, title, brief_md, publish_mode, company_id, companies!inner(id, name, industry, description, account_id))")
    .eq("id", body.threadId)
    .maybeSingle();
  if (!thread) return NextResponse.json({ error: "thread_not_found" }, { status: 404 });

  const objective = (thread as unknown as {
    objective_id: string;
    model_id: string | null;
    objectives: {
      id: string;
      title: string;
      brief_md: string;
      publish_mode: "auto" | "approval" | null;
      company_id: string;
      companies: { id: string; name: string; industry: string | null; description: string | null; account_id: string };
    };
  }).objectives;

  // Account default for publish_mode when objective's is null.
  const { data: account } = await supabase
    .from("accounts")
    .select("default_publish_mode")
    .eq("id", objective.companies.account_id)
    .maybeSingle();
  const publishMode: "auto" | "approval" = objective.publish_mode ?? account?.default_publish_mode ?? "approval";

  const { data: metaConn } = await supabase
    .from("meta_connections")
    .select("meta_ad_account_id, status")
    .eq("company_id", objective.companies.id)
    .maybeSingle();

  const modelId = body.modelId ?? (thread as { model_id: string | null }).model_id ?? DEFAULT_MODEL_ID;
  if ((thread as { model_id: string | null }).model_id !== modelId) {
    await supabase.from("chat_threads").update({ model_id: modelId }).eq("id", body.threadId);
  }

  if (!process.env.OPENROUTER_API_KEY) {
    // Graceful degradation: persist user message + a canned reply so the UI keeps working.
    const lastUser = body.messages.filter((m) => m.role === "user").pop();
    if (lastUser) {
      await supabase.from("chat_messages").insert({ thread_id: body.threadId, role: "user", content: lastUser.content });
    }
    const stub =
      "Falta OPENROUTER_API_KEY en el entorno. Cargalo en .env.local y reiniciá `npm run dev` para hablar de verdad conmigo.";
    await supabase.from("chat_messages").insert({ thread_id: body.threadId, role: "assistant", content: stub });
    return NextResponse.json({ text: stub }, { status: 200 });
  }

  // Persist the user message that just came in (last one in messages array).
  const lastUser = [...body.messages].reverse().find((m) => m.role === "user");
  if (lastUser) {
    await supabase.from("chat_messages").insert({ thread_id: body.threadId, role: "user", content: lastUser.content });
  }

  const system = orchestratorSystemPrompt({
    companyName: objective.companies.name,
    companyIndustry: objective.companies.industry,
    companyDescription: objective.companies.description,
    objectiveTitle: objective.title,
    briefMd: objective.brief_md ?? "",
    publishMode,
    metaConnected: !!metaConn && metaConn.status === "active",
    adAccountId: metaConn?.meta_ad_account_id ?? null,
  });

  const coreMessages: CoreMessage[] = convertToCoreMessages(
    body.messages.map((m) => ({
      id: crypto.randomUUID(),
      role: m.role,
      content: m.content,
    }))
  );

  const tools = makeTools({ supabase, objectiveId: objective.id, companyId: objective.companies.id });

  const result = streamText({
    model: openrouter(modelId),
    system,
    messages: coreMessages,
    tools,
    maxSteps: 6,
    onFinish: async ({ text, usage }) => {
      if (text) {
        await supabase.from("chat_messages").insert({
          thread_id: body.threadId!,
          role: "assistant",
          agent: "orquestador",
          content: text,
          tokens_in: usage?.promptTokens ?? null,
          tokens_out: usage?.completionTokens ?? null,
        });
      }
    },
  });

  return result.toDataStreamResponse();
}
