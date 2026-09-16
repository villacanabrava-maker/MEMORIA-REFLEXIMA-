const PUBLIC_SUPABASE_FALLBACK = {
  url: "https://qkwcermdjgmvenzskevw.supabase.co",
  publishableKey: "sb_publishable_5Yv_8HSIwHLhEkAdnO7M1A_aRfk0qe-",
} as const;

function configuredOrFallback(value: string | undefined, fallback: string): string {
  const normalized = value?.trim();
  return normalized ? normalized : fallback;
}

export function getSupabaseEnv() {
  const url = configuredOrFallback(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_FALLBACK.url,
  );
  const publishableKey = configuredOrFallback(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    PUBLIC_SUPABASE_FALLBACK.publishableKey,
  );

  return { url, publishableKey };
}
