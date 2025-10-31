"use client"
import React, { useEffect, useMemo, useState } from "react"
import { createSupabaseClient } from "@/lib/supabase/client"
import { useAuth } from "@/context/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"

type Customer = {
  id: string
  name: string
  email: string | null
  phone: string | null
  segment: "nuevo" | "activo" | "inactivo"
  last_purchase_at: string | null
  ltv: number | null
  churn_rate: number | null
  purchase_frequency: number | null
}

export default function ClientesPage() {
  const supabase = createSupabaseClient()
  const { user } = useAuth()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")
  const [lastSync, setLastSync] = useState<string>("")
  const [segment, setSegment] = useState<string>("")
  const [isAdmin, setIsAdmin] = useState(false)
  const [selected, setSelected] = useState<Customer | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError("")
      try {
        const res = await fetch("/api/user-data", { credentials: "include" })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        const role = (data.roles?.[0]?.role as string) || ""
        setIsAdmin(role === "Admin Cliente")
        const cliSync = (data.syncStatus || []).find((r: any) => r.module_code === "MOD-NC-CLI")
        setLastSync(cliSync?.last_sync_at ?? "")
        setCustomers((data.customers ?? []) as Customer[])
      } catch (err: any) {
        setError(err?.message ?? "Error al cargar datos")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [supabase, user])

  const filtered = useMemo(() => customers.filter((c) => segment ? c.segment === segment : true), [customers, segment])
  const segments = useMemo(() => ({
    nuevos: customers.filter((c) => c.segment === "nuevo").length,
    activos: customers.filter((c) => c.segment === "activo").length,
    inactivos: customers.filter((c) => c.segment === "inactivo").length,
  }), [customers])

  const kpis = useMemo(() => {
    const ltvAvg = (() => {
      const vals = customers.map((c) => c.ltv ?? 0)
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
    })()
    const churnAvg = (() => {
      const vals = customers.map((c) => c.churn_rate ?? 0)
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
    })()
    const freqAvg = (() => {
      const vals = customers.map((c) => c.purchase_frequency ?? 0)
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
    })()
    return { ltvAvg, churnAvg, freqAvg }
  }, [customers])

  const exportSegment = async () => {
    if (!isAdmin || !user) return
    const rows = filtered
    const headers = ["id","name","email","phone","segment","last_purchase_at","ltv","churn_rate","purchase_frequency"]
    const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => (r as any)[h]).join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `segmento_${segment || "todos"}_${new Date().toISOString().slice(0,19)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    await supabase.from("nc_exports_audit").insert({
      user_id: user.id,
      module_code: "MOD-NC-CLI",
      format: "CSV",
      filters: { segment },
      record_count: rows.length,
    })
  }

  return (
    <div className="flex flex-col gap-6 p-2">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Clientes</h1>
        <div className="text-sm text-muted-foreground">Recencia: {lastSync ? new Date(lastSync).toLocaleString() : "—"}</div>
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card><CardHeader><CardTitle>Nuevos</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{segments.nuevos}</div></CardContent></Card>
        <Card><CardHeader><CardTitle>Activos</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{segments.activos}</div></CardContent></Card>
        <Card><CardHeader><CardTitle>Inactivos</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{segments.inactivos}</div></CardContent></Card>
        <Card><CardHeader><CardTitle>LTV promedio</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{kpis.ltvAvg.toFixed(2)}</div></CardContent></Card>
        <Card><CardHeader><CardTitle>Churn promedio</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{kpis.churnAvg.toFixed(2)}</div></CardContent></Card>
      </div>

      <div className="flex items-end gap-2">
        <div>
          <label className="text-xs">Segmento</label>
          <select className="border rounded p-2" value={segment} onChange={(e) => setSegment(e.target.value)}>
            <option value="">Todos</option>
            <option value="nuevo">Nuevos</option>
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
          </select>
        </div>
        {isAdmin && (
          <button className="ml-auto border rounded px-3 py-2" onClick={exportSegment}>Exportar segmento (CSV)</button>
        )}
      </div>

      <Card>
        <CardHeader className="border-b"><CardTitle>Clientes</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Segmento</TableHead>
                <TableHead>Última compra</TableHead>
                <TableHead className="text-right">LTV</TableHead>
                <TableHead className="text-right">Frecuencia</TableHead>
                <TableHead>Perfil</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell className="p-4" colSpan={8}>Cargando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell className="p-4" colSpan={8}>Sin resultados</TableCell></TableRow>
              ) : filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>{isAdmin ? (c.email ?? "—") : c.email ? c.email.replace(/(.{2}).+(@.+)/, "$1****$2") : "—"}</TableCell>
                  <TableCell>{isAdmin ? (c.phone ?? "—") : c.phone ? c.phone.replace(/(.{3}).+/, "$1****") : "—"}</TableCell>
                  <TableCell>{c.segment}</TableCell>
                  <TableCell>{c.last_purchase_at ? new Date(c.last_purchase_at).toLocaleString() : "—"}</TableCell>
                  <TableCell className="text-right">{c.ltv?.toFixed(2) ?? "—"}</TableCell>
                  <TableCell className="text-right">{c.purchase_frequency?.toFixed(2) ?? "—"}</TableCell>
                  <TableCell><Button variant="outline" size="sm" onClick={() => setSelected(c)}>Ver</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center" onClick={() => setSelected(null)}>
          <div className="bg-white dark:bg-neutral-900 rounded shadow-lg w-full max-w-lg p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">Perfil 360</div>
              <Button variant="outline" size="sm" onClick={() => setSelected(null)}>Cerrar</Button>
            </div>
            <div className="text-sm space-y-1">
              <div><span className="text-muted-foreground">Cliente:</span> {selected.name}</div>
              <div><span className="text-muted-foreground">Email:</span> {isAdmin ? (selected.email ?? "—") : selected.email ? selected.email.replace(/(.{2}).+(@.+)/, "$1****$2") : "—"}</div>
              <div><span className="text-muted-foreground">Teléfono:</span> {isAdmin ? (selected.phone ?? "—") : selected.phone ? selected.phone.replace(/(.{3}).+/, "$1****") : "—"}</div>
              <div><span className="text-muted-foreground">Última compra:</span> {selected.last_purchase_at ? new Date(selected.last_purchase_at).toLocaleString() : "—"}</div>
              <div><span className="text-muted-foreground">LTV:</span> {selected.ltv?.toFixed(2) ?? "—"}</div>
              <div><span className="text-muted-foreground">Frecuencia:</span> {selected.purchase_frequency?.toFixed(2) ?? "—"}</div>
              <div><span className="text-muted-foreground">Churn:</span> {selected.churn_rate?.toFixed(2) ?? "—"}</div>
              <div className="text-muted-foreground text-xs">Si el dato no está disponible en NeuroCore, se muestra como “no sincronizado”.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
