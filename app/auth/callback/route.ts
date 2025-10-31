import { NextRequest, NextResponse } from "next/server"
import { createSupabaseRouteClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get("code")
  const redirectTo = searchParams.get("redirect_to") || "/dashboard"

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", request.url))
  }

  // Preparamos la respuesta de redirección y la pasamos al cliente para que escriba cookies
  const redirectResponse = NextResponse.redirect(new URL(redirectTo, request.url))
  const { supabase, response } = createSupabaseRouteClient(request, redirectResponse)

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url))
  }

  // Devolver la respuesta con cookies ya seteadas
  return response
}