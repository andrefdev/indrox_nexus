import { NextRequest, NextResponse } from "next/server"
import { createSupabaseRouteClient } from "@/lib/supabase/server"
import { getAllUserData } from "@/lib/services/user-data.service"
import { logger } from "@/lib/logging/logger"

export async function GET(request: NextRequest) {
  const initial = new NextResponse()
  const { supabase, response } = createSupabaseRouteClient(request, initial)

  const { data: userRes, error: userErr } = await supabase.auth.getUser()
  if (userErr) {
    logger.error("auth.getUser failed", { error: userErr.message })
    return NextResponse.json({ error: userErr.message }, { status: 500 })
  }
  const user = userRes.user
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  try {
    const data = await getAllUserData(supabase, user.id)
    return NextResponse.json(data, { status: 200 })
  } catch (err: any) {
    logger.error("user-data endpoint failed", { error: err?.message })
    return NextResponse.json({ error: err?.message ?? "internal error" }, { status: 500 })
  }
}