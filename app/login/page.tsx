import { Suspense } from "react"
import { LoginForm } from "@/components/login-form"

// Evita error de prerender: envolvemos el componente cliente en Suspense

export default function LoginPage() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <Suspense fallback={<div className="text-sm text-muted-foreground">Cargando formulario…</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
