// Simple environment configuration loader with basic validation
export type AppEnv = {
  nodeEnv: "development" | "test" | "production"
  supabaseUrl: string
  supabaseAnonKey: string
}

let cached: AppEnv | null = null

export function loadEnv(): AppEnv {
  if (cached) return cached
  const nodeEnv = (process.env.NODE_ENV as any) || "development"
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase configuration: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY")
  }

  cached = {
    nodeEnv: ["development", "test", "production"].includes(nodeEnv) ? nodeEnv : "development",
    supabaseUrl,
    supabaseAnonKey,
  }
  return cached
}

export const isProd = () => loadEnv().nodeEnv === "production"
export const isDev = () => loadEnv().nodeEnv === "development"
export const isTest = () => loadEnv().nodeEnv === "test"