export type ServiceCode = "buildpro" | "neurocore"

export type NavItem = { title: string; url: string }

const buildproNav: NavItem[] = [
  { title: "BuildPro Pagos", url: "/pagos" },
  { title: "Cambios (CR)", url: "/cr" },
]

const neurocoreNav: NavItem[] = [
  { title: "Inventario", url: "/neurocore/inventario" },
  { title: "Ventas", url: "/neurocore/ventas" },
  { title: "Clientes", url: "/neurocore/clientes" },
]

export function getMenuByServices(services: ServiceCode[]): {
  navMain: NavItem[]
  documents: NavItem[]
} {
  const set = new Set<ServiceCode>(services)
  const navMain: NavItem[] = []
  const documents: NavItem[] = []

  if (set.has("buildpro")) {
    navMain.push(...buildproNav)
    documents.push(
      { title: "Proyectos", url: "/buildpro/123" },
      { title: "Documentos", url: "/buildpro/123#docs" },
    )
  }
  if (set.has("neurocore")) {
    navMain.push(...neurocoreNav)
    // NeuroCore no agrega documentos en este ejemplo
  }

  return { navMain, documents }
}