import { redirect } from "next/navigation";
import { cookies } from "next/headers";

// Static, no-DB gate. If there is any auth cookie we send them to /app and let
// that route do the real check. Otherwise straight to /login. This avoids the
// getUser round-trip on the very first page load.
export default async function Root() {
  const jar = await cookies();
  const hasAuth = jar.getAll().some((c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token"));
  redirect(hasAuth ? "/app" : "/login");
}
