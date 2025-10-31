"use client"
import React, { useEffect, useMemo, useState } from "react"
import { createSupabaseClient } from "@/lib/supabase/client"
import { useAuth } from "@/context/auth-context"
import { AreaChart, Area, CartesianGrid, Tooltip, XAxis, YAxis, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePicker } from "@/components/ui/date-picker"
import { Button } from "@/components/ui/button"

type Sale = {
  id: string
  date: string
  channel: string
  product_id: string
  qty: number
  total_amount: number
  currency: string
  customer_id: string | null
}

export default function VentasPage() {
  const supabase = createSupabaseClient()
  const { user } = useAuth()
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")
  const [lastSync, setLastSync] = useState<string>("")
  const [filters, setFilters] = useState({ start: "", end: "", channel: "" })
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError("")
      try {
        const res = await fetch("/api/user-data", { credentials: "include" })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        // rol
        const role = (data.roles?.[0]?.role as string) || ""
        setIsAdmin(role === "Admin Cliente")
        // sync del módulo de ventas
        const vtaSync = (data.syncStatus || []).find((r: any) => r.module_code === "MOD-NC-VTA")
        setLastSync(vtaSync?.last_sync_at ?? "")
        // ventas
        setSales((data.salesOrders ?? []) as Sale[])
        // cache último filtro
        try {
          const cached = localStorage.getItem("nc_vta_filters")
          if (cached) setFilters(JSON.parse(cached))
        } catch {}
      } catch (err: any) {
        setError(err?.message ?? "Error al cargar datos")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user])

  const filtered = useMemo(() => {
    const start = filters.start ? new Date(filters.start) : null
    const end = filters.end ? new Date(filters.end) : null
    return sales.filter((s) => {
      const d = new Date(s.date)
      const inRange = (!start || d >= start) && (!end || d <= end)
      const byChannel = filters.channel ? s.channel === filters.channel : true
      return inRange && byChannel
    })
  }, [sales, filters])

  const kpis = useMemo(() => {
    const now = new Date()
    const startOfDay = new Date(now); startOfDay.setHours(0,0,0,0)
    const startOfWeek = new Date(now); const day = startOfWeek.getDay(); const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); startOfWeek.setDate(diff); startOfWeek.setHours(0,0,0,0)
    const startOfMonth = new Date(now); startOfMonth.setDate(1); startOfMonth.setHours(0,0,0,0)
    const sum = (arr: Sale[]) => arr.reduce((acc, s) => acc + (s.total_amount ?? 0), 0)
    const daySales = sum(sales.filter((s) => new Date(s.date) >= startOfDay))
    const weekSales = sum(sales.filter((s) => new Date(s.date) >= startOfWeek))
    const monthSales = sum(sales.filter((s) => new Date(s.date) >= startOfMonth))
    const ticketPromedio = (() => {
      const cnt = sales.length
      const total = sum(sales)
      return cnt ? total / cnt : 0
    })()
    // top productos por cantidad
    const map = new Map<string, number>()
    sales.forEach((s) => map.set(s.product_id, (map.get(s.product_id) ?? 0) + (s.qty ?? 0)))
    const topProductos = Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5)
    return { daySales, weekSales, monthSales, ticketPromedio, topProductos }
  }, [sales])

  const series = useMemo(() => {
    const byDay = new Map<string, number>()
    filtered.forEach((s) => {
      const key = new Date(s.date).toISOString().slice(0,10)
      byDay.set(key, (byDay.get(key) ?? 0) + (s.total_amount ?? 0))
    })
    return Array.from(byDay.entries()).map(([date, total]) => ({ date, total }))
  }, [filtered])

  const previousSeries = useMemo(() => {
    if (!filters.start || !filters.end) return []
    const start = new Date(filters.start)
    const end = new Date(filters.end)
    const delta = end.getTime() - start.getTime()
    const prevStart = new Date(start.getTime() - delta)
    const prevEnd = new Date(end.getTime() - delta)
    const prev = sales.filter((s) => {
      const d = new Date(s.date)
      return d >= prevStart && d <= prevEnd && (filters.channel ? s.channel === filters.channel : true)
    })
    const byDay = new Map<string, number>()
    prev.forEach((s) => {
      const key = new Date(s.date).toISOString().slice(0,10)
      byDay.set(key, (byDay.get(key) ?? 0) + (s.total_amount ?? 0))
    })
    return Array.from(byDay.entries()).map(([date, total]) => ({ date, total }))
  }, [filters, sales])

  const exportCSV = async () => {
    const rows = filtered
    const headers = ["date","channel","product_id","qty","total_amount","currency"]
    const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => (r as any)[h]).join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `ventas_${new Date().toISOString().slice(0,19)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    if (user) {
      await supabase.from("nc_exports_audit").insert({
        user_id: user.id,
        module_code: "MOD-NC-VTA",
        format: "CSV",
        filters,
        record_count: rows.length,
      })
    }
  }

  const channels = useMemo(() => Array.from(new Set(sales.map((s) => s.channel))), [sales])

  useEffect(() => {
    try { localStorage.setItem("nc_vta_filters", JSON.stringify(filters)) } catch {}
  }, [filters])

  return (
    <div className="flex flex-col gap-6 p-2">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Ventas</h1>
        <div className="text-sm text-muted-foreground">Última sincronización: {lastSync ? new Date(lastSync).toLocaleString() : "—"}</div>
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card><CardHeader><CardTitle>Ventas del día</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{kpis.daySales.toFixed(2)}</div></CardContent></Card>
        <Card><CardHeader><CardTitle>Ventas semana</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{kpis.weekSales.toFixed(2)}</div></CardContent></Card>
        <Card><CardHeader><CardTitle>Ventas mes</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{kpis.monthSales.toFixed(2)}</div></CardContent></Card>
        <Card><CardHeader><CardTitle>Ticket promedio</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{kpis.ticketPromedio.toFixed(2)}</div></CardContent></Card>
        <Card><CardHeader><CardTitle>Top productos</CardTitle></CardHeader><CardContent><div className="text-sm">{kpis.topProductos.map(([pid, qty]) => `${pid} (${qty})`).join(", ") || "—"}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="border-b"><CardTitle>Filtros</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2 items-end">
          <div className="flex flex-col gap-1">
            <span className="text-xs">Inicio</span>
            <DatePicker value={filters.start} onChange={(v) => setFilters({ ...filters, start: v })} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs">Fin</span>
            <DatePicker value={filters.end} onChange={(v) => setFilters({ ...filters, end: v })} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs">Canal</span>
            <Select value={filters.channel || "all"} onValueChange={(v) => setFilters({ ...filters, channel: v === "all" ? "" : v })}>
              <SelectTrigger className="min-w-40"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {channels.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <Button className="ml-auto" variant="outline" onClick={exportCSV}>Exportar CSV</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b"><CardTitle>Comparación de períodos</CardTitle></CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ left: 12, right: 12 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Area type="monotone" dataKey="total" stroke="#2563eb" fill="#93c5fd" />
              {previousSeries.length > 0 && (
                <Area type="monotone" dataKey="total" data={previousSeries} stroke="#16a34a" fill="#86efac" />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b"><CardTitle>Transacciones</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Moneda</TableHead>
                <TableHead>Cliente</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell className="p-4" colSpan={7}>Cargando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell className="p-4" colSpan={7}>Sin resultados</TableCell></TableRow>
              ) : filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{new Date(s.date).toLocaleString()}</TableCell>
                  <TableCell>{s.channel}</TableCell>
                  <TableCell>{s.product_id}</TableCell>
                  <TableCell className="text-right">{s.qty}</TableCell>
                  <TableCell className="text-right">{s.total_amount.toFixed(2)}</TableCell>
                  <TableCell>{s.currency}</TableCell>
                  <TableCell>{isAdmin ? (s.customer_id ?? "—") : (s.customer_id ? s.customer_id.slice(0, 4) + "****" : "—")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
