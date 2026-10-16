import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

// Realtime evaluates row-level security with the token on its socket. Subscribing before the
// session has loaded would join as anonymous and silently miss every protected row.
export async function realtimeReady(supabase: ReturnType<typeof createClient>) {
  const { data } = await supabase.auth.getSession();
  if (data.session) supabase.realtime.setAuth(data.session.access_token);
}
