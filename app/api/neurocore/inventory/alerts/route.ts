import { NextRequest, NextResponse } from "next/server"
import { AlertSchema } from "@/lib/api/schemas"
import { createSupabaseRouteClient } from "@/lib/supabase/server"
import { ok, fail, authFail, forbidden } from "@/lib/api/response"

// Schema moved to lib/api/schemas for testability

export async function POST(req: NextRequest) {
  const initial = new NextResponse()
  const { supabase, response } = createSupabaseRouteClient(req, initial)
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) return authFail()

  // Autorización: solo "Admin Cliente" puede crear alertas
  const { data: roleRow, error: roleErr } = await supabase
    .from("nc_user_roles")
    .select("role")
    .eq("user_id", user.user.id)
    .single()
  if (roleErr) return fail(roleErr.message, 500)
  if (!roleRow || roleRow.role !== "Admin Cliente") return forbidden()

  const json = await req.json()
  const parsed = AlertSchema.safeParse(json)
  if (!parsed.success) return fail("Validación fallida", 422, parsed.error.flatten())

  const { threshold, channel } = parsed.data
  const { data, error } = await supabase
    .from("nc_inventory_alerts")
    .insert({ created_by: user.user.id, threshold, channel, active: true })
    .select()
    .single()
  if (error) return fail(error.message, 500)
  return ok(data, { headers: response.headers })
}