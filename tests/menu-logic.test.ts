import { describe, it, expect } from "vitest"
import { getMenuByServices } from "@/lib/sidebar/menu-logic"

describe("getMenuByServices", () => {
  it("solo buildpro", () => {
    const { navMain, documents } = getMenuByServices(["buildpro"])
    expect(navMain.map((i) => i.title)).toEqual([
      "Dashboard",
      "BuildPro Pagos",
      "Cambios (CR)",
    ])
    expect(documents.map((d) => d.title)).toEqual([
      "Proyectos",
      "Documentos",
    ])
  })

  it("solo neurocore", () => {
    const { navMain, documents } = getMenuByServices(["neurocore"])
    expect(navMain.map((i) => i.title)).toEqual([
      "Neuro Inventario",
      "Neuro Ventas",
      "Neuro Clientes",
    ])
    expect(documents.length).toBe(0)
  })

  it("ambos servicios", () => {
    const { navMain } = getMenuByServices(["buildpro", "neurocore"])
    expect(navMain.map((i) => i.title)).toEqual([
      "Dashboard",
      "BuildPro Pagos",
      "Cambios (CR)",
      "Neuro Inventario",
      "Neuro Ventas",
      "Neuro Clientes",
    ])
  })
})