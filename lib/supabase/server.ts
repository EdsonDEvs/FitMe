import { createClient } from "@supabase/supabase-js";
import { ensureEnvLoaded } from "@/lib/env/loadEnv";

let cached: ReturnType<typeof createClient> | null = null;

export function getSupabaseServer() {
  if (cached) return cached;

  ensureEnvLoaded();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) throw new Error("Missing env: NEXT_PUBLIC_SUPABASE_URL");
  if (!supabaseServiceRoleKey) throw new Error("Missing env: SUPABASE_SERVICE_ROLE_KEY");

  cached = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false }
  });

  return cached;
}

