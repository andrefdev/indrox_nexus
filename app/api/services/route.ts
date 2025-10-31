import { NextRequest, NextResponse } from "next/server"
import { createSupabaseRouteClient } from "@/lib/supabase/server"
import { selectList } from "@/lib/supabase/queries"

export async function GET(request: NextRequest) {
  const initial = new NextResponse()
  const { supabase } = createSupabaseRouteClient(request, initial)

  const { data: userRes, error: userErr } = await supabase.auth.getUser()
  if (userErr) {
    return NextResponse.json({ error: userErr.message }, { status: 500 })
  }
  const user = userRes.user
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const { data, error } = await selectList<{ service_code: string }>(
    supabase,
    "nc_customer_services",
    "service_code",
    [
      { op: "eq", column: "user_id", value: user.id },
      { op: "eq", column: "active", value: true },
    ]
  )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const services = (data ?? []).map((r: any) => r.service_code)
  return NextResponse.json({ services })
}