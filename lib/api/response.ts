import { NextResponse } from "next/server"

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init)
}

export function fail(message: string, status: number = 400, details?: any) {
  return NextResponse.json({ ok: false, error: { message, details } }, { status })
}

export function authFail() {
  return fail("No autenticado", 401)
}

export function forbidden(message = "No autorizado") {
  return fail(message, 403)
}