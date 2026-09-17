import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseEnvOk } from "@/lib/supabase/env";

export default async function Root() {
  if (!supabaseEnvOk()) redirect("/login");
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  redirect(data.user ? "/app" : "/login");
}
