"use client"
import React, { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { useRouter } from "next/navigation"
import BuildProImage from "@/assets/icons/BuildPro.svg"
import NeuroCoreImage from "@/assets/icons/NeuroCore.svg"

type ServiceCode = "buildpro" | "neurocore"

const serviceMeta: Record<ServiceCode, { title: string; description: string; href: string; icon?: string }> = {
  buildpro: {
    title: "BuildPro",
    description: "Gestión de proyectos y pagos",
    href: "/buildpro/pagos",
    icon: BuildProImage,
  },
  neurocore: {
    title: "NeuroCore",
    description: "Inteligencia de negocio: inventario, ventas y clientes",
    href: "/neurocore/inventario",
    icon: NeuroCoreImage,
  },
}

export default function DashboardPage() {
  const router = useRouter()
  const [services, setServices] = useState<ServiceCode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError("")
      try {
        const res = await fetch("/api/services", { credentials: "include" })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        const raw: string[] = (data?.services ?? [])
        // Filtrar solo servicios soportados
        const supported = raw.filter((s): s is ServiceCode => (s === "buildpro" || s === "neurocore"))
        setServices(supported)
      } catch (e: any) {
        setError(e?.message ?? "Error al cargar servicios")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const go = (s: ServiceCode) => {
    try {
      localStorage.setItem("selected-service", s)
    } catch {}
    const meta = serviceMeta[s]
    if (meta) router.push(meta.href)
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-4xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">Selecciona tu servicio</h1>
          <p className="text-muted-foreground">Elige uno de los módulos que tienes contratados</p>
        </div>
        {loading ? (
          <div className="flex items-center justify-center text-sm text-muted-foreground">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent mr-2" />
            Cargando servicios…
          </div>
        ) : error ? (
          <div className="text-destructive text-center">{error}</div>
        ) : services.length === 0 ? (
          <div className="text-center text-muted-foreground">No hay servicios activos asociados a tu cuenta.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 place-items-center">
            {services.map((s) => {
              const meta = serviceMeta[s]
              return (
                <Card key={s} className="w-full max-w-sm cursor-pointer" onClick={() => go(s)}>
                  <CardContent className="p-6 flex flex-col items-center gap-4">
                    {meta.icon && (
                      <Image src={meta.icon} alt={meta.title} width={64} height={64} />
                    )}
                    <div className="text-center">
                      <div className="text-lg font-semibold">{meta.title}</div>
                      <div className="text-sm text-muted-foreground">{meta.description}</div>
                    </div>
                    <Button className="mt-2" variant="default">Ingresar</Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}