import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createSupabaseRouteClient } from "@/lib/supabase/server"
import { ok, fail, authFail } from "@/lib/api/response"
import { PackageSchema } from "@/lib/api/schemas"

export async function GET(req: NextRequest) {
  const initial = new NextResponse()
  const { supabase, response } = createSupabaseRouteClient(req, initial)
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) return authFail()
  const { data, error } = await supabase
    .from("nc_package_definitions")
    .select("id, base_item_id, quantity_included, package_price, consume_stock, currency, image_url, client_id")
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
  const parsed = PackageSchema.safeParse(json)
  if (!parsed.success) return fail("Validación fallida", 422, parsed.error.flatten())
  const payload = { ...parsed.data, client_id: user.user.id }
  const { data, error } = await supabase.from("nc_package_definitions").insert(payload).select().single()
  if (error) return fail(error.message, 500)
  return ok(data, { headers: response.headers })
}