import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createSupabaseRouteClient } from "@/lib/supabase/server"
import { ok, fail, authFail } from "@/lib/api/response"
import { logRequest, logResponse, logError } from "@/lib/api/logger"

const ItemCreateSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  warehouse: z.string().min(1),
  status: z.string().min(1),
  stock: z.number().int().nonnegative(),
  min_stock_threshold: z.number().int().nonnegative(),
  rotation_rate: z.number().optional().nullable(),
  unit_price: z.number().nonnegative().optional().nullable(),
  image_url: z.string().url().optional(),
  item_type: z.enum(["PRODUCTO_SIMPLE", "PAQUETE_FIJO", "COMBO_MIXTO"]).default("PRODUCTO_SIMPLE"),
})

export async function GET(req: NextRequest) {
  const initial = new NextResponse()
  const { supabase, response } = createSupabaseRouteClient(req, initial)
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) return authFail()
  logRequest("/api/neurocore/inventory/items", "GET", { userId: user.user.id })
  const { data, error } = await supabase
    .from("nc_inventory_items")
    .select("id, sku, name, category, warehouse, status, stock, min_stock_threshold, rotation_rate, image_url, unit_price, item_type, updated_at")
    .eq("client_id", user.user.id)
  if (error) {
    logError("/api/neurocore/inventory/items", "GET", error, { userId: user.user.id })
    return fail(error.message, 500)
  }
  logResponse("/api/neurocore/inventory/items", "GET", 200, { count: (data ?? []).length })
  return ok(data, { headers: response.headers })
}

export async function POST(req: NextRequest) {
  const initial = new NextResponse()
  const { supabase, response } = createSupabaseRouteClient(req, initial)
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) return authFail()
  const json = await req.json()
  logRequest("/api/neurocore/inventory/items", "POST", { userId: user.user.id, body: json })
  const parsed = ItemCreateSchema.safeParse(json)
  if (!parsed.success) {
    logError("/api/neurocore/inventory/items", "POST", new Error("Validación fallida"), { issues: parsed.error.flatten() })
    return fail("Validación fallida", 422, parsed.error.flatten())
  }
  const payload = { ...parsed.data, client_id: user.user.id }
  const { data, error } = await supabase.from("nc_inventory_items").insert(payload).select().single()
  if (error) {
    logError("/api/neurocore/inventory/items", "POST", error, { payload })
    return fail(error.message, 500)
  }
  logResponse("/api/neurocore/inventory/items", "POST", 200, { id: data?.id })
  return ok(data, { headers: response.headers })
}