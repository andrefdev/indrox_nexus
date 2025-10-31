"use client"
import React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { createSupabaseClient } from "@/lib/supabase/client"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import Portada from "@/assets/imagen de portada 2.jpg"

function oauthRedirectPath() {
  if (typeof window === "undefined") return "/auth/callback"
  const origin = window.location.origin
  return `${origin}/auth/callback`
}

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const supabase = createSupabaseClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [error, setError] = React.useState<string>(searchParams.get("error") ?? "")
  const [loading, setLoading] = React.useState(false)
  // TODO: intentos fallidos y 2FA

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    // Validación básica email
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError("Ingrese un correo válido.")
      setLoading(false)
      return
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.")
      setLoading(false)
      return
    }
    // Intento de login real con Supabase
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (authError) {
      setError(
        authError.message === "Invalid login credentials" ?
          "Credenciales inválidas." : authError.message
      )
      setLoading(false)
      return
    }
    // TODO: flujo 2FA si el usuario lo tiene habilitado
    if (data.session) {
      try {
        const token = data.session.access_token
        if (token) {
          localStorage.setItem("auth-token", token)
          sessionStorage.setItem("auth-token", token)
        }
      } catch {}
      router.push("/dashboard")
    } else {
      setError("No se pudo iniciar sesión. Intente nuevamente.")
    }
    setLoading(false)
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8" onSubmit={handleSubmit}>
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Bienvenido</h1>
                <p className="text-muted-foreground text-balance">
                  Accede con tu correo y contraseña
                </p>
              </div>
              <Field>
                <FieldLabel htmlFor="email">Correo</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@empresa.com"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoFocus
                />
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Contraseña</FieldLabel>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </Field>
              {error && (
                <div className="text-destructive text-sm mb-2">{error}</div>
              )}
              <Field>
                <Button type="submit" disabled={loading} aria-busy={loading}>
                  {loading ? "Accediendo..." : "Acceder"}
                </Button>
              </Field>
              
              {/* Intencionalmente sin enlaces auxiliares para mantener login solo por correo */}
            </FieldGroup>
          </form>
          <div className="bg-muted relative hidden md:block h-full w-full overflow-hidden">
            <Image
              src={Portada}
              alt="Ilustración temática de dashboard"
              className="absolute inset-0 h-full w-full dark:brightness-[0.3] dark:grayscale"
            />
          </div>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        Al continuar aceptas los <a href="#">Términos de Servicio</a> y la <a href="#">Política de Privacidad</a>.
      </FieldDescription>
      {loading && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 backdrop-blur-sm">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
            Redirigiendo al dashboard...
          </div>
        </div>
      )}
    </div>
  )
}
