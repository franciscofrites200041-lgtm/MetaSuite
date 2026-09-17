import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export default async function Root() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  redirect(data.user ? "/app" : "/login");
}
