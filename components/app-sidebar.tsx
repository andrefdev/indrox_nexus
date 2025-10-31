"use client"

import * as React from "react"
import {
  IconCamera,
  IconChartBar,
  IconDashboard,
  IconDatabase,
  IconFileAi,
  IconFileDescription,
  IconFileWord,
  IconFolder,
  IconHelp,
  IconInnerShadowTop,
  IconListDetails,
  IconReport,
  IconSearch,
  IconSettings,
  IconUsers,
  IconCreditCard,
} from "@tabler/icons-react"

import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import { Skeleton } from "@/components/ui/skeleton"
import { getMenuByServices } from "@/lib/sidebar/menu-logic"
import Link from "next/link"
import Image from "next/image"
import { useAuth } from "@/context/auth-context"
import { createSupabaseClient } from "@/lib/supabase/client"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  // navMain será dinámico según servicios
  navClouds: [
    {
      title: "Capture",
      icon: IconCamera,
      isActive: true,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
    {
      title: "Proposal",
      icon: IconFileDescription,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
    {
      title: "Prompts",
      icon: IconFileAi,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "#",
      icon: IconSettings,
    },
  ],
  // documents también será dinámico según servicios
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string>("")
  const [services, setServices] = React.useState<string[]>([])
  const { user: authUser } = useAuth()
  const sidebarUser = React.useMemo(() => ({
    name: (authUser?.user_metadata as any)?.full_name || authUser?.email || data.user.name,
    email: authUser?.email || data.user.email,
    avatar: (authUser?.user_metadata as any)?.avatar_url || data.user.avatar,
  }), [authUser])

  React.useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      setError("")
      try {
        const res = await fetch("/api/services", { credentials: "include" })
        if (!res.ok) throw new Error(`Estado ${res.status}`)
        const json = await res.json()
        if (!mounted) return
        setServices(Array.isArray(json.services) ? json.services : [])
      } catch (e: any) {
        if (!mounted) return
        setError(e?.message || "Error al cargar servicios")
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  const menus = React.useMemo(() => getMenuByServices(services as any), [services])

  // Detectar servicio seleccionado en localStorage
  const [selectedService, setSelectedService] = React.useState<string | null>(null)
  React.useEffect(() => {
    try {
      const s = localStorage.getItem("selected-service")
      if (s) setSelectedService(s)
    } catch {}
  }, [])

  // Realtime: suscripción a cambios de servicio seleccionado
  React.useEffect(() => {
    const supabase = createSupabaseClient()
    const channel = supabase.channel("ui-sync")
      .on("broadcast", { event: "service-selected" }, (payload: any) => {
        const svc = payload?.payload?.service
        if (svc && (svc === "buildpro" || svc === "neurocore")) {
          setSelectedService(svc)
        }
      })
      .subscribe()

    // Fallback: escuchar cambios en localStorage (entre pestañas)
    const onStorage = (e: StorageEvent) => {
      if (e.key === "selected-service" && e.newValue) {
        setSelectedService(e.newValue)
      }
    }
    window.addEventListener("storage", onStorage)

    // Fallback adicional: polling suave en la misma pestaña
    const interval = setInterval(() => {
      try {
        const s = localStorage.getItem("selected-service")
        if (s && s !== selectedService) setSelectedService(s)
      } catch {}
    }, 2000)

    return () => {
      try {
        supabase.removeChannel(channel)
      } catch {}
      window.removeEventListener("storage", onStorage)
      clearInterval(interval)
    }
  }, [selectedService])

  const serviceIconSrc = selectedService === "buildpro" ? "/icons/BuildPro.svg" : selectedService === "neurocore" ? "/icons/NeuroCore.svg" : null
  const serviceHomeHref = selectedService === "buildpro" ? "/buildpro/pagos" : selectedService === "neurocore" ? "/neurocore/inventario" : "/dashboard"

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <Link href={serviceHomeHref}>
                {serviceIconSrc ? (
                  <Image src={serviceIconSrc} alt="Servicio" width={20} height={20} />
                ) : (
                  <IconInnerShadowTop className="size-5!" />
                )}
                <span className="text-base font-semibold">indrox dashboard</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {loading ? (
          <div className="flex flex-col gap-2 px-2 py-1">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-5/6" />
            <Skeleton className="h-8 w-4/6" />
          </div>
        ) : error ? (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton className="text-destructive">
                <IconReport />
                <span>Error al cargar servicios</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        ) : (
          <>
            <NavMain
              items={menus.navMain.map((item) => {
                // Enriquecemos con iconos según título
                const iconMap: Record<string, any> = {
                  Dashboard: IconDashboard,
                  "BuildPro Pagos": IconCreditCard,
                  "Cambios (CR)": IconReport,
                  Inventario: IconDatabase,
                  Ventas: IconChartBar,
                  Clientes: IconUsers,
                }
                const IconComp = iconMap[item.title]
                return IconComp ? { ...item, icon: IconComp } : item
              }) as any}
            />
            {menus.documents.length > 0 && (
              <NavDocuments
                items={menus.documents.map((doc) => {
                  const iconMap: Record<string, any> = {
                    Proyectos: IconFolder,
                    Documentos: IconFileWord,
                    "Prompts AI": IconFileAi,
                  }
                  const IconComp = iconMap[doc.title]
                  return IconComp ? { name: doc.title, url: doc.url, icon: IconComp } : { name: doc.title, url: doc.url, icon: IconFileWord }
                }) as any}
              />
            )}
            <NavSecondary items={data.navSecondary} className="mt-auto" />
          </>
        )}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={sidebarUser} />
      </SidebarFooter>
    </Sidebar>
  )
}
