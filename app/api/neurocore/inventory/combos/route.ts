import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { ComboHeaderSchema, ComboComponentSchema } from "@/lib/api/schemas"
import { createSupabaseRouteClient } from "@/lib/supabase/server"
import { ok, fail, authFail } from "@/lib/api/response"

// Schemas moved to lib/api/schemas.ts for testability

export async function GET(req: NextRequest) {
  const initial = new NextResponse()
  const { supabase, response } = createSupabaseRouteClient(req, initial)
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) return authFail()
  const { data, error } = await supabase
    .from("nc_combo_headers")
    .select("id, combo_name, combo_price, currency, is_active, image_url, client_id")
    .eq("client_id", user.user.id)
  if (error) return fail(error.message, 500)
  return ok(data, { headers: response.headers })
}

export async function POST(req: NextRequest) {
  const initial = new NextResponse()
  const { supabase, response } = createSupabaseRouteClient(req, initial)
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) return authFail()
  const json = await req.json()
  const headerParsed = ComboHeaderSchema.safeParse(json.header)
  const compsParsed = z.array(ComboComponentSchema).safeParse(json.components ?? [])
  if (!headerParsed.success || !compsParsed.success) {
    return fail("Validación fallida", 422, {
      header: headerParsed.success ? null : headerParsed.error.flatten(),
      components: compsParsed.success ? null : compsParsed.error.flatten(),
    })
  }
  const { data: header, error: headerErr } = await supabase
    .from("nc_combo_headers")
    .insert({ ...headerParsed.data, client_id: user.user.id })
    .select()
    .single()
  if (headerErr) return fail(headerErr.message, 500)

  if (compsParsed.data.length > 0) {
    const itemsPayload = compsParsed.data.map((c) => ({ ...c, combo_id: header.id }))
    const { error: itemsErr } = await supabase.from("nc_combo_items").insert(itemsPayload)
    if (itemsErr) return fail(itemsErr.message, 500)
  }

  return ok(header, { headers: response.headers })
}