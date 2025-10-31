import { NextRequest, NextResponse } from "next/server"
import { createSupabaseRouteClient } from "@/lib/supabase/server"
import { ok, fail, authFail } from "@/lib/api/response"

export async function GET(req: NextRequest) {
  const initial = new NextResponse()
  const { supabase, response } = createSupabaseRouteClient(req, initial)
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) return authFail()
  const { data, error } = await supabase
    .from("nc_feature_flags")
    .select("feature_code, enabled")
    .eq("client_id", user.user.id)
  if (error) return fail(error.message, 500)
  // Construir flags de forma segura evitando el patrón () al inicio de línea
  const flags: Record<string, boolean> = {}
  const rows = Array.isArray(data) ? data : []
  for (const f of rows as any[]) {
    flags[f.feature_code] = !!f.enabled
  }
  return ok(flags, { headers: response.headers })
}