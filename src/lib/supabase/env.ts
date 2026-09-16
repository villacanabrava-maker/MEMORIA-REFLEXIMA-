const PUBLIC_SUPABASE_FALLBACK = {
  url: "https://qkwcermdjgmvenzskevw.supabase.co",
  publishableKey: "sb_publishable_5Yv_8HSIwHLhEkAdnO7M1A_aRfk0qe-",
} as const;

export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? PUBLIC_SUPABASE_FALLBACK.url;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? PUBLIC_SUPABASE_FALLBACK.publishableKey;

  if (!url || !publishableKey) {
    throw new Error(
      "A conexão pública com o Supabase ainda não foi configurada.",
    );
  }

  return { url, publishableKey };
}
