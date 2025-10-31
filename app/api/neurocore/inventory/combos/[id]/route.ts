import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createSupabaseRouteClient } from "@/lib/supabase/server"
import { ok, fail, authFail } from "@/lib/api/response"
import { logRequest, logResponse, logError } from "@/lib/api/logger"
import { ComboHeaderUpdateSchema } from "@/lib/api/schemas"

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const initial = new NextResponse()
  const { supabase, response } = createSupabaseRouteClient(req, initial)
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) return authFail()
  const { id } = await context.params
  if (!id || typeof id !== "string" || !/^[0-9a-fA-F-]{36}$/.test(id)) {
    logError(`/api/neurocore/inventory/combos/${String(id)}`, "PUT", new Error("ID inválido"))
    return fail("ID inválido", 400)
  }
  const json = await req.json()
  logRequest(`/api/neurocore/inventory/combos/${id}`, "PUT", { userId: user.user.id, body: json })
  const parsed = ComboHeaderUpdateSchema.safeParse(json)
  if (!parsed.success) {
    logError(`/api/neurocore/inventory/combos/${id}`, "PUT", new Error("Validación fallida"), { issues: parsed.error.flatten() })
    return fail("Validación fallida", 422, parsed.error.flatten())
  }
  const { data, error } = await supabase
    .from("nc_combo_headers")
    .update(parsed.data)
    .eq("id", id)
    .eq("client_id", user.user.id)
    .select()
  if (error) {
    logError(`/api/neurocore/inventory/combos/${id}`, "PUT", error, { payload: parsed.data })
    return fail(error.message, 500)
  }
  logResponse(`/api/neurocore/inventory/combos/${id}`, "PUT", 200, { id })
  return ok(data?.[0], { headers: response.headers })
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const initial = new NextResponse()
  const { supabase, response } = createSupabaseRouteClient(req, initial)
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) return authFail()
  const { id } = await context.params
  if (!id || typeof id !== "string" || !/^[0-9a-fA-F-]{36}$/.test(id)) {
    logError(`/api/neurocore/inventory/combos/${String(id)}`, "DELETE", new Error("ID inválido"))
    return fail("ID inválido", 400)
  }
  logRequest(`/api/neurocore/inventory/combos/${id}`, "DELETE", { userId: user.user.id })
  const { error } = await supabase
    .from("nc_combo_headers")
    .delete()
    .eq("id", id)
    .eq("client_id", user.user.id)
  if (error) {
    logError(`/api/neurocore/inventory/combos/${id}`, "DELETE", error)
    return fail(error.message, 500)
  }
  // On delete cascade should remove related nc_combo_items per FK
  logResponse(`/api/neurocore/inventory/combos/${id}`, "DELETE", 200, { id })
  return ok({ id }, { headers: response.headers })
}