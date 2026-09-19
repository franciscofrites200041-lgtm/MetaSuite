import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { WelcomeTour } from "@/components/welcome-tour";

export const metadata = { title: "Bienvenido — Toruk AUGUR" };

// The onboarding tour. Server-only shell that wires two server actions:
//   markSeen  — updates user_metadata.tutorial_seen and returns home
//   start     — same, but redirects to /app/companies/new to start creating
// Both live in this file so they close over the current supabase server
// client. The client tour component <WelcomeTour> just fires them.
export default async function WelcomePage() {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  async function markSeen() {
    "use server";
    const supa = await supabaseServer();
    await supa.auth.updateUser({ data: { tutorial_seen: true } });
    redirect("/app");
  }

  async function start() {
    "use server";
    const supa = await supabaseServer();
    await supa.auth.updateUser({ data: { tutorial_seen: true } });
    redirect("/app/companies/new");
  }

  return <WelcomeTour markSeenAction={markSeen} startAction={start} />;
}
