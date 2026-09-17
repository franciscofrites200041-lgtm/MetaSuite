"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export async function signInWithPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/app");
  if (!email || !password) {
    redirect(`/login?error=${encodeURIComponent("Email y contraseña son obligatorios.")}`);
  }
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`);
  }
  redirect(next);
}

export async function signUpWithPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  if (!email || !password) {
    redirect(`/signup?error=${encodeURIComponent("Email y contraseña son obligatorios.")}`);
  }
  if (password.length < 8) {
    redirect(`/signup?error=${encodeURIComponent("La contraseña necesita al menos 8 caracteres.")}`);
  }
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName || null },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/auth/callback`,
    },
  });
  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }
  redirect("/app");
}

export async function signOut() {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect("/login");
}
