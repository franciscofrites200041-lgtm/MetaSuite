import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

// MVP scaffold. Persists user + a canned assistant reply so the UI is smoke-testable
// end-to-end without OpenRouter. The real orchestrator (spec § 6) lands next session,
// wired via Vercel AI SDK + OpenRouter provider.

const bodySchema = z.object({
  threadId: z.string().uuid(),
  modelId: z.string().min(1),
  content: z.string().min(1).max(8000),
});

export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const { threadId, modelId, content } = parsed.data;

  const supabase = await supabaseServer();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Persist user message. RLS enforces membership via chat_threads → objectives → companies.
  const { data: userMsg, error: userErr } = await supabase
    .from("chat_messages")
    .insert({ thread_id: threadId, role: "user", content })
    .select("id, role, content, created_at")
    .single();
  if (userErr || !userMsg) {
    return NextResponse.json({ error: userErr?.message ?? "insert_failed" }, { status: 500 });
  }

  // Update thread model choice if it changed.
  await supabase.from("chat_threads").update({ model_id: modelId }).eq("id", threadId);

  const openrouterKey = process.env.OPENROUTER_API_KEY;
  const stubReply = openrouterKey
    ? "[Scaffold] OpenRouter está configurado pero la orquestación multi-agente se cablea en la siguiente sesión."
    : "[Scaffold] Falta OPENROUTER_API_KEY. Cargalo en .env.local y reiniciá el dev server para hablar de verdad conmigo.";

  const { data: asstMsg } = await supabase
    .from("chat_messages")
    .insert({ thread_id: threadId, role: "assistant", agent: "orquestador", content: stubReply })
    .select("id, role, content, created_at")
    .single();

  return NextResponse.json({
    userMessage: { id: userMsg.id, role: userMsg.role, content: userMsg.content },
    assistantMessage: asstMsg ? { id: asstMsg.id, role: asstMsg.role, content: asstMsg.content } : null,
  });
}
