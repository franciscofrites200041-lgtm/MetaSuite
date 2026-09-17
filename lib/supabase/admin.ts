import { createClient } from "@supabase/supabase-js";

// Service-role client. NEVER import from client components or Route Handlers
// that echo user input into privileged writes without a guard.
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE service-role env");
  return createClient(url, key, { auth: { persistSession: false } });
}
