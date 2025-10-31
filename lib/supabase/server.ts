import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { loadEnv } from "@/lib/config/env"


export function createSupabaseRouteClient(
  request: NextRequest,
  initialResponse: NextResponse
) {
  const { supabaseUrl: url, supabaseAnonKey: key } = loadEnv()

  let response = initialResponse

  const supabase = createServerClient(url, key, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value
      },
      set(name: string, value: string, options?: any) {
        response.cookies.set(name, value, options)
      },
      remove(name: string) {
        // Eliminar cookie en la respuesta
        response.cookies.delete(name)
      },
    },
  })

  return { supabase, response }
}