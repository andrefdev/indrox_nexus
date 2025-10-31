import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createSupabaseRouteClient } from "@/lib/supabase/server"
import { ok, fail, authFail } from "@/lib/api/response"
import { logRequest, logResponse, logError } from "@/lib/api/logger"

const ItemUpdateSchema = z.object({
  sku: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  warehouse: z.string().min(1).optional(),
  status: z.string().min(1).optional(),
  stock: z.number().int().nonnegative().optional(),
  min_stock_threshold: z.number().int().nonnegative().optional(),
  rotation_rate: z.number().optional().nullable(),
  unit_price: z.number().nonnegative().optional().nullable(),
  image_url: z.string().url().optional(),
})

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const initial = new NextResponse()
  const { supabase, response } = createSupabaseRouteClient(req, initial)
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) return authFail()
  const { id } = await context.params
  if (!id || typeof id !== "string" || !/^[0-9a-fA-F-]{36}$/.test(id)) {
    logError(`/api/neurocore/inventory/items/${String(id)}`, "PUT", new Error("ID inválido"))
    return fail("ID inválido", 400)
  }
  const json = await req.json()
  logRequest(`/api/neurocore/inventory/items/${id}`, "PUT", { userId: user.user.id, body: json })
  const parsed = ItemUpdateSchema.safeParse(json)
  if (!parsed.success) {
    logError(`/api/neurocore/inventory/items/${id}`, "PUT", new Error("Validación fallida"), { issues: parsed.error.flatten() })
    return fail("Validación fallida", 422, parsed.error.flatten())
  }
  const { data, error } = await supabase
    .from("nc_inventory_items")
    .update(parsed.data)
    .eq("id", id)
    .eq("client_id", user.user.id)
    .select()
  if (error) {
    logError(`/api/neurocore/inventory/items/${id}`, "PUT", error, { payload: parsed.data })
    return fail(error.message, 500)
  }
  logResponse(`/api/neurocore/inventory/items/${id}`, "PUT", 200, { id })
  return ok(data[0], { headers: response.headers })
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const initial = new NextResponse()
  const { supabase, response } = createSupabaseRouteClient(req, initial)
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) return authFail()
  const { id } = await context.params
  if (!id || typeof id !== "string" || !/^[0-9a-fA-F-]{36}$/.test(id)) {
    logError(`/api/neurocore/inventory/items/${String(id)}`, "DELETE", new Error("ID inválido"))
    return fail("ID inválido", 400)
  }
  logRequest(`/api/neurocore/inventory/items/${id}`, "DELETE", { userId: user.user.id })
  const { error } = await supabase
    .from("nc_inventory_items")
    .delete()
    .eq("id", id)
    .eq("client_id", user.user.id)
  if (error) {
    logError(`/api/neurocore/inventory/items/${id}`, "DELETE", error)
    return fail(error.message, 500)
  }
  logResponse(`/api/neurocore/inventory/items/${id}`, "DELETE", 200, { id })
  return ok({ id }, { headers: response.headers })
}