import { NextRequest, NextResponse } from "next/server"
import { AuditSchema } from "@/lib/api/schemas"
import { createSupabaseRouteClient } from "@/lib/supabase/server"
import { ok, fail, authFail } from "@/lib/api/response"

// Schema moved to lib/api/schemas for testability

export async function POST(req: NextRequest) {
  const initial = new NextResponse()
  const { supabase, response } = createSupabaseRouteClient(req, initial)
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) return authFail()
  const json = await req.json()
  const parsed = AuditSchema.safeParse(json)
  if (!parsed.success) return fail("Validación fallida", 422, parsed.error.flatten())
  const payload = { ...parsed.data, user_id: user.user.id }
  const { data, error } = await supabase.from("nc_exports_audit").insert(payload).select().single()
  if (error) return fail(error.message, 500)
  return ok(data, { headers: response.headers })
}