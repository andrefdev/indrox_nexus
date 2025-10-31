"use client"
import React, { useEffect, useMemo, useState } from "react"
import { createSupabaseClient } from "@/lib/supabase/client"
import { useAuth } from "@/context/auth-context"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose } from "@/components/ui/drawer"

type InventoryItem = {
  id: string
  sku: string
  name: string
  category: string
  warehouse: string
  status: string
  stock: number
  min_stock_threshold: number
  rotation_rate: number | null
  image_url?: string | null
}

const EXPORT_LIMIT = 10000 // ASUNCIÓN: límite de exportación

export default function InventarioPage() {
  const supabase = createSupabaseClient()
  const { user } = useAuth()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")
  const [lastSync, setLastSync] = useState<string>("")
  const [filters, setFilters] = useState({ category: "", warehouse: "", status: "" })
  const [isAdmin, setIsAdmin] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [form, setForm] = useState<Partial<InventoryItem>>({
    sku: "",
    name: "",
    category: "",
    warehouse: "",
    status: "",
    stock: 0,
    min_stock_threshold: 0,
    rotation_rate: null,
    image_url: "",
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>("")

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
        const invSync = (data.syncStatus || []).find((r: any) => r.module_code === "MOD-NC-INV")
        setLastSync(invSync?.last_sync_at ?? "")
        setItems((data.inventoryItems ?? []) as InventoryItem[])
      } catch (err: any) {
        setError(err?.message ?? "Error al cargar datos")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [supabase, user])

  const filtered = useMemo(() => {
    return items
      .filter((i) => (filters.category ? i.category === filters.category : true))
      .filter((i) => (filters.warehouse ? i.warehouse === filters.warehouse : true))
      .filter((i) => (filters.status ? i.status === filters.status : true))
  }, [items, filters])

  const withCriticality = useMemo(() => {
    return filtered
      .map((i) => ({
        ...i,
        criticality: i.min_stock_threshold - i.stock,
      }))
      .sort((a, b) => b.criticality - a.criticality)
  }, [filtered])

  const kpis = useMemo(() => {
    const totalStock = items.reduce((acc, i) => acc + (i.stock ?? 0), 0)
    const lowStock = items.filter((i) => i.stock <= i.min_stock_threshold).length
    const rotationAvg = (() => {
      const vals = items.map((i) => i.rotation_rate ?? 0)
      return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length) : 0
    })()
    return { totalStock, lowStock, rotationAvg }
  }, [items])

  const categories = useMemo(() => Array.from(new Set(items.map((i) => i.category))), [items])
  const warehouses = useMemo(() => Array.from(new Set(items.map((i) => i.warehouse))), [items])
  const statuses = useMemo(() => Array.from(new Set(items.map((i) => i.status))), [items])

  const exportCSV = async () => {
    const rows = withCriticality
    if (rows.length > EXPORT_LIMIT) {
      setError(`Límite de exportación excedido: ${rows.length} > ${EXPORT_LIMIT}`)
      return
    }
    const headers = [
      "sku",
      "name",
      "category",
      "warehouse",
      "status",
      "stock",
      "min_stock_threshold",
      "rotation_rate",
      "criticality",
    ]
    const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => (r as any)[h]).join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `inventario_${new Date().toISOString().slice(0, 19)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    // auditoría
    if (user) {
      await supabase.from("nc_exports_audit").insert({
        user_id: user.id,
        module_code: "MOD-NC-INV",
        format: "CSV",
        filters: filters,
        record_count: rows.length,
      })
    }
  }

  const [alertConfig, setAlertConfig] = useState({ threshold: 0, channel: "portal" as "portal" | "email" })
  const createAlert = async () => {
    if (!isAdmin || !user) return
    await supabase.from("nc_inventory_alerts").insert({
      created_by: user.id,
      threshold: alertConfig.threshold,
      channel: alertConfig.channel,
      active: true,
    })
  }

  const openNew = () => {
    setEditingItem(null)
    setForm({ sku: "", name: "", category: "", warehouse: "", status: "", stock: 0, min_stock_threshold: 0, rotation_rate: null, image_url: "" })
    setImageFile(null)
    setImagePreview("")
    setDrawerOpen(true)
  }

  const openEdit = (item: InventoryItem) => {
    setEditingItem(item)
    setForm({ ...item })
    setImageFile(null)
    setImagePreview(item.image_url || "")
    setDrawerOpen(true)
  }

  const saveItem = async () => {
    setError("")
    try {
      // Subir imagen si corresponde
      let imgUrl: string | undefined = form.image_url || undefined
      if (imageFile) {
        const ext = imageFile.name.split(".").pop() || "jpg"
        const path = `inventory/${(form.sku || "no-sku").replace(/[^a-zA-Z0-9-_]/g, "_")}_${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from("product-images").upload(path, imageFile)
        if (upErr) throw new Error(upErr.message)
        const { data: pub } = await supabase.storage.from("product-images").getPublicUrl(path)
        imgUrl = pub?.publicUrl
      }

      const payload: any = {
        sku: form.sku,
        name: form.name,
        category: form.category,
        warehouse: form.warehouse,
        status: form.status,
        stock: Number(form.stock || 0),
        min_stock_threshold: Number(form.min_stock_threshold || 0),
        rotation_rate: form.rotation_rate ?? null,
      }
      if (imgUrl) payload.image_url = imgUrl

      if (editingItem) {
        // Update
        const { data, error: updErr } = await supabase
          .from("nc_inventory_items")
          .update(payload)
          .eq("id", editingItem.id)
          .select()
        // Fallback si image_url no existe
        if (updErr?.message?.includes("column") && updErr?.message?.includes("image_url")) {
          delete payload.image_url
          const { data: data2, error: updErr2 } = await supabase
            .from("nc_inventory_items")
            .update(payload)
            .eq("id", editingItem.id)
            .select()
          if (updErr2) throw new Error(updErr2.message)
          // Actualiza estado local
          const updated = data2?.[0]
          setItems((prev) => prev.map((it) => (it.id === editingItem.id ? { ...it, ...updated, image_url: imgUrl ?? it.image_url } : it)))
        } else if (updErr) {
          throw new Error(updErr.message)
        } else {
          const updated = data?.[0]
          setItems((prev) => prev.map((it) => (it.id === editingItem.id ? { ...it, ...updated } : it)))
        }
      } else {
        // Insert
        const { data, error: insErr } = await supabase
          .from("nc_inventory_items")
          .insert(payload)
          .select()
        if (insErr?.message?.includes("column") && insErr?.message?.includes("image_url")) {
          delete payload.image_url
          const { data: data2, error: insErr2 } = await supabase
            .from("nc_inventory_items")
            .insert(payload)
            .select()
          if (insErr2) throw new Error(insErr2.message)
          const created = data2?.[0]
          setItems((prev) => [{ ...created, image_url: imgUrl }, ...prev])
        } else if (insErr) {
          throw new Error(insErr.message)
        } else {
          const created = data?.[0]
          setItems((prev) => [created as InventoryItem, ...prev])
        }
      }

      setDrawerOpen(false)
    } catch (e: any) {
      setError(e?.message || "Error al guardar el ítem")
    }
  }

  return (
    <div className="flex flex-col gap-6 p-2">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Inventario</h1>
        <div className="text-sm text-muted-foreground">
          Última sincronización: {lastSync ? new Date(lastSync).toLocaleString() : "—"}
        </div>
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Stock total</CardTitle>
            <CardDescription>Acumulado de unidades en inventario</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalStock}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Ítems con bajo stock</CardTitle>
            <CardDescription>En o por debajo del umbral</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.lowStock}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Rotación promedio</CardTitle>
            <CardDescription>Promedio por ítem</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.rotationAvg.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 items-end">
          <div className="flex flex-col gap-1">
            <span className="text-xs">Categoría</span>
            <Select value={filters.category || "all"} onValueChange={(v) => setFilters({ ...filters, category: v === "all" ? "" : v })}>
              <SelectTrigger className="min-w-40"><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {categories.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs">Bodega</span>
            <Select value={filters.warehouse || "all"} onValueChange={(v) => setFilters({ ...filters, warehouse: v === "all" ? "" : v })}>
              <SelectTrigger className="min-w-40"><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {warehouses.map((w) => (<SelectItem key={w} value={w}>{w}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs">Estado</span>
            <Select value={filters.status || "all"} onValueChange={(v) => setFilters({ ...filters, status: v === "all" ? "" : v })}>
              <SelectTrigger className="min-w-40"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {statuses.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <Button className="ml-auto" variant="outline" onClick={exportCSV}>Exportar CSV</Button>
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Alertas de quiebre (Admin)</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 items-end">
            <div className="flex flex-col gap-1">
              <span className="text-xs">Umbral</span>
              <input type="number" className="border rounded p-2 h-9" value={alertConfig.threshold}
                onChange={(e) => setAlertConfig({ ...alertConfig, threshold: Number(e.target.value) })} />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs">Notificación</span>
              <Select value={alertConfig.channel} onValueChange={(v) => setAlertConfig({ ...alertConfig, channel: v as any })}>
                <SelectTrigger className="min-w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="portal">Portal</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="default" onClick={createAlert}>Crear alerta</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle>Inventario</CardTitle>
            <Button variant="default" onClick={openNew}>Nuevo producto</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Imagen</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Bodega</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Mínimo</TableHead>
                <TableHead className="text-right">Rotación</TableHead>
                <TableHead className="text-right">Criticidad</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={10} className="p-4">Cargando...</TableCell></TableRow>
              ) : withCriticality.length === 0 ? (
                <TableRow><TableCell colSpan={11} className="p-4">Sin resultados</TableCell></TableRow>
              ) : withCriticality.map((i) => (
                <TableRow key={i.id}>
                  <TableCell>{i.image_url ? (<img src={i.image_url} alt={i.name} className="h-10 w-10 object-cover rounded" />) : "—"}</TableCell>
                  <TableCell>{i.sku}</TableCell>
                  <TableCell>{i.name}</TableCell>
                  <TableCell>{i.category}</TableCell>
                  <TableCell>{i.warehouse}</TableCell>
                  <TableCell>{i.status}</TableCell>
                  <TableCell className="text-right">{i.stock}</TableCell>
                  <TableCell className="text-right">{i.min_stock_threshold}</TableCell>
                  <TableCell className="text-right">{i.rotation_rate ?? "—"}</TableCell>
                  <TableCell className="text-right">{i.criticality}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => openEdit(i)}>Editar</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Drawer de alta/edición */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{editingItem ? "Editar producto" : "Nuevo producto"}</DrawerTitle>
          </DrawerHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" value={form.sku || ""} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="category">Categoría</Label>
              <Input id="category" value={form.category || ""} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="warehouse">Bodega</Label>
              <Input id="warehouse" value={form.warehouse || ""} onChange={(e) => setForm({ ...form, warehouse: e.target.value })} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="status">Estado</Label>
              <Input id="status" value={form.status || ""} onChange={(e) => setForm({ ...form, status: e.target.value })} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="stock">Stock</Label>
              <Input id="stock" type="number" value={String(form.stock ?? 0)} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="min">Mínimo</Label>
              <Input id="min" type="number" value={String(form.min_stock_threshold ?? 0)} onChange={(e) => setForm({ ...form, min_stock_threshold: Number(e.target.value) })} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="rotation">Rotación</Label>
              <Input id="rotation" type="number" step="0.01" value={String(form.rotation_rate ?? "")} onChange={(e) => setForm({ ...form, rotation_rate: e.target.value ? Number(e.target.value) : null })} />
            </div>
            <div className="flex flex-col gap-2 md:col-span-2">
              <Label htmlFor="image">Imagen</Label>
              <input
                id="image"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null
                  setImageFile(file)
                  if (file) {
                    const reader = new FileReader()
                    reader.onload = () => setImagePreview(String(reader.result))
                    reader.readAsDataURL(file)
                  } else {
                    setImagePreview("")
                  }
                }}
                className="border rounded p-2"
              />
              {imagePreview && (
                <img src={imagePreview} alt="preview" className="h-24 w-24 object-cover rounded border" />
              )}
            </div>
          </div>
          <DrawerFooter>
            <div className="flex gap-2 justify-end">
              <DrawerClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DrawerClose>
              <Button onClick={saveItem}>{editingItem ? "Guardar cambios" : "Crear"}</Button>
            </div>
            {error && <div className="text-red-600 text-sm">{error}</div>}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
