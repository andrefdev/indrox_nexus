"use client"
import React, { useEffect, useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { createSupabaseClient } from "@/lib/supabase/client"
import { useAuth } from "@/context/auth-context"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose } from "@/components/ui/drawer"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { toast } from "sonner"
import { useUserData } from "@/hooks/useUserData"
import { useFeatureFlags } from "@/hooks/neurocore/useFeatureFlags"
import { usePackages } from "@/hooks/neurocore/usePackages"
import { useCombos } from "@/hooks/neurocore/useCombos"
import { useInventoryItems as useInventoryItemsHook } from "@/hooks/neurocore/useInventoryItems"
import { useExportAudit } from "@/hooks/useExportAudit"
import { useCreateAlert } from "@/hooks/neurocore/useCreateAlert"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog"

type InventoryItem = {
  id: string
  sku: string
  name: string
  description?: string | null
  category: string
  warehouse: string
  status: string
  stock: number
  min_stock_threshold: number
  rotation_rate: number | null
  price?: number | null
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
  const [packageDrawerOpen, setPackageDrawerOpen] = useState(false)
  const [comboDrawerOpen, setComboDrawerOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [isCombosEnabled, setIsCombosEnabled] = useState(false)
  const [activeTab, setActiveTab] = useState<string>("productos")
  const [packages, setPackages] = useState<any[]>([])
  const [combos, setCombos] = useState<any[]>([])
  const [packageForm, setPackageForm] = useState<{ base_item_id: string; quantity_included: number; package_price: number; consume_stock: boolean; currency: string; image_url?: string }>({ base_item_id: "", quantity_included: 1, package_price: 0, consume_stock: true, currency: "S/", image_url: "" })
  const [comboHeaderForm, setComboHeaderForm] = useState<{ combo_name: string; combo_price: number; currency: string; is_active: boolean; image_url?: string }>({ combo_name: "", combo_price: 0, currency: "S/", is_active: true, image_url: "" })
  const [pkgImageFile, setPkgImageFile] = useState<File | null>(null)
  const [pkgImagePreview, setPkgImagePreview] = useState<string>("")
  const [comboImageFile, setComboImageFile] = useState<File | null>(null)
  const [comboImagePreview, setComboImagePreview] = useState<string>("")
  const [comboComponentsForm, setComboComponentsForm] = useState<Array<{ component_item_id: string; component_qty: number; consume_stock: boolean }>>([
    { component_item_id: "", component_qty: 1, consume_stock: true },
  ])
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null)
  const [editingComboId, setEditingComboId] = useState<string | null>(null)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [pendingDeleteItem, setPendingDeleteItem] = useState<InventoryItem | null>(null)
  const [confirmDeletePackageOpen, setConfirmDeletePackageOpen] = useState(false)
  const [pendingDeletePackageId, setPendingDeletePackageId] = useState<string | null>(null)
  const [confirmDeleteComboOpen, setConfirmDeleteComboOpen] = useState(false)
  const [pendingDeleteComboId, setPendingDeleteComboId] = useState<string | null>(null)
  const inventorySchema = z.object({
    sku: z.string().min(1, "SKU es requerido"),
    name: z.string().min(1, "Nombre es requerido"),
    description: z.string().optional(),
    category: z.string().min(1, "Categoría es requerida"),
    warehouse: z.string().min(1, "Bodega es requerida"),
    status: z.string().min(1, "Estado es requerido"),
    item_type: z.enum(["PRODUCTO_SIMPLE", "PAQUETE_FIJO", "COMBO_MIXTO"]).default("PRODUCTO_SIMPLE"),
    stock: z.coerce.number().min(0, "Stock debe ser 0 o mayor"),
    min_stock_threshold: z.coerce.number().min(0, "Mínimo debe ser 0 o mayor"),
    rotation_rate: z.coerce.number().optional(),
    price: z.coerce.number().min(0, "Precio debe ser 0 o mayor").optional(),
    // Permitir cadena vacía para evitar que la validación bloquee el submit cuando no hay imagen
    image_url: z.string().url().optional().or(z.literal("")),
  })

  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<any>({
    resolver: zodResolver(inventorySchema),
    defaultValues: {
      sku: "",
      name: "",
      description: "",
      category: "",
      warehouse: "",
      status: "",
      item_type: "PRODUCTO_SIMPLE",
      stock: 0,
      min_stock_threshold: 0,
      rotation_rate: null,
      price: 0,
      image_url: "",
    },
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>("")
  const [notice, setNotice] = useState<string>("")

  const { data: userData, isLoading: userDataLoading, error: userDataError } = useUserData()
  const qc = useQueryClient()
  const { data: flags } = useFeatureFlags()
  const combosEnabled = Boolean(flags?.NC_INVENTORY_COMBOS)
  const { data: packagesData, createPackage, updatePackage, deletePackage } = usePackages({ enabled: combosEnabled })
  const { data: combosData, createCombo, updateComboHeader, deleteCombo } = useCombos({ enabled: combosEnabled })
  const { createItem, updateItem, deleteItem: deleteItemMutation } = useInventoryItemsHook()
  const exportAudit = useExportAudit()
  const createAlertMutation = useCreateAlert()

  useEffect(() => {
    setLoading(userDataLoading)
    if (userDataError) setError(userDataError.message)
    if (userData) {
      const role = (userData.roles?.[0]?.role as string) || ""
      setIsAdmin(role === "Admin Cliente")
      const invSync = (userData.syncStatus || []).find((r: any) => r.module_code === "MOD-NC-INV")
      setLastSync(invSync?.last_sync_at ?? "")
      setItems((userData.inventoryItems ?? []) as InventoryItem[])
    }
  }, [userData, userDataLoading, userDataError])

  // Sincronizar UI de combos con feature flags
  useEffect(() => {
    const enabled = Boolean(flags?.NC_INVENTORY_COMBOS)
    setIsCombosEnabled(enabled)
    if (!enabled && (activeTab === "paquetes" || activeTab === "combos")) {
      setActiveTab("productos")
    }
  }, [flags])

  useEffect(() => {
    if (packagesData) setPackages(packagesData as any)
  }, [packagesData])

  useEffect(() => {
    if (combosData) setCombos(combosData as any)
  }, [combosData])

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
    // auditoría via API
    await exportAudit.mutateAsync({ module_code: "MOD-NC-INV", format: "CSV", filters, record_count: rows.length })
  }

  const [alertConfig, setAlertConfig] = useState({ threshold: 0, channel: "portal" as "portal" | "email" })
  const createAlert = async () => {
    if (!isAdmin || !user) return
    await createAlertMutation.mutateAsync({ threshold: alertConfig.threshold, channel: alertConfig.channel as any })
  }

  const parseStoragePathFromPublicUrl = (url: string) => {
    try {
      const u = new URL(url)
      const marker = "/product-images/"
      const idx = u.pathname.indexOf(marker)
      if (idx >= 0) {
        return u.pathname.substring(idx + marker.length)
      }
      return ""
    } catch {
      return ""
    }
  }

  const openNew = () => {
    if (activeTab === "productos") {
      setEditingItem(null)
      reset({ sku: "", name: "", description: "", category: "", warehouse: "", status: "", stock: 0, min_stock_threshold: 0, rotation_rate: null, price: 0, image_url: "" })
      setImageFile(null)
      setImagePreview("")
      setDrawerOpen(true)
    } else if (activeTab === "paquetes") {
      setEditingPackageId(null)
      setPackageForm({ base_item_id: "", quantity_included: 1, package_price: 0, consume_stock: true, currency: "S/", image_url: "" })
      setPkgImageFile(null)
      setPkgImagePreview("")
      setPackageDrawerOpen(true)
    } else if (activeTab === "combos") {
      setEditingComboId(null)
      setComboHeaderForm({ combo_name: "", combo_price: 0, currency: "S/", is_active: true, image_url: "" })
      setComboComponentsForm([{ component_item_id: "", component_qty: 1, consume_stock: true }])
      setComboImageFile(null)
      setComboImagePreview("")
      setComboDrawerOpen(true)
    }
  }

  const openEdit = (item: InventoryItem) => {
    console.log("[NC] openEdit:item", item?.id, item)
    if (!item?.id || item.id === "undefined") {
      console.error("[NC] openEdit:error:invalid-id", item)
      setError("No se puede editar: ID del producto inválido")
      toast.error("ID del producto inválido")
      return
    }
    setEditingItem(item)
    reset({
      sku: item.sku,
      name: item.name,
      description: item.description ?? "",
      category: item.category,
      warehouse: item.warehouse,
      status: item.status,
      stock: item.stock ?? 0,
      min_stock_threshold: item.min_stock_threshold ?? 0,
      rotation_rate: item.rotation_rate ?? null,
      price: item.price ?? 0,
      image_url: item.image_url ?? "",
    })
    setImageFile(null)
    setImagePreview(item.image_url || "")
    setDrawerOpen(true)
  }

  const saveItem = async (values: any) => {
    if (!isAdmin) {
      setError("Permiso requerido para guardar cambios")
      return
    }
    setError("")
    setNotice("")
    console.log("[NC] saveItem:start", values)
    try {
      // Subir imagen si corresponde
      let imgUrl: string | undefined = values.image_url || undefined
      if (imageFile) {
        const ext = imageFile.name.split(".").pop() || "jpg"
        const path = `inventory/${(values.sku || "no-sku").replace(/[^a-zA-Z0-9-_]/g, "_")}_${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from("product-images").upload(path, imageFile)
        if (upErr) {
          console.error("[NC] storage.upload:error", upErr)
          toast.warning("No se pudo subir la imagen (RLS). Se creará sin imagen.")
        } else {
          const { data: pub } = await supabase.storage.from("product-images").getPublicUrl(path)
          imgUrl = pub?.publicUrl
        }
      }

      // Solo enviar columnas que existen en la tabla
      const payload: any = {
        sku: values.sku,
        name: values.name,
        category: values.category,
        warehouse: values.warehouse,
        status: values.status,
        item_type: values.item_type || "PRODUCTO_SIMPLE",
        stock: Number(values.stock || 0),
        min_stock_threshold: Number(values.min_stock_threshold || 0),
        rotation_rate: values.rotation_rate ?? null,
        unit_price: values.price != null ? Number(values.price) : null,
      }
      if (imgUrl) payload.image_url = imgUrl

      if (editingItem) {
        if (!editingItem.id) {
          console.error("[NC] saveItem:update:error:missing-id", editingItem)
          setError("ID del producto no está disponible para edición")
          toast.error("No se puede actualizar: ID inválido")
          return
        }
        const fallback = items.find((it) => it.sku === editingItem.sku)?.id
        const idStr = String(editingItem.id || fallback)
        const isUuidLike = /^[0-9a-fA-F-]{36}$/.test(idStr)
        if (!isUuidLike || idStr === "undefined") {
          console.error("[NC] saveItem:update:error:invalid-id", editingItem)
          setError("ID del producto inválido, no se puede actualizar")
          toast.error("No se puede actualizar: ID inválido")
          return
        }
        console.log("[NC] saveItem:update:id", idStr)
        console.log("[NC] saveItem:update:payload", payload)
        const updated = await updateItem.mutateAsync({ id: idStr, data: payload })
        console.log("[NC] saveItem:update:success", updated)
        setItems((prev) => prev.map((it) => (it.id === editingItem.id ? { ...it, ...updated } : it)))
        qc.invalidateQueries({ queryKey: ["user-data"], exact: true })
      } else {
        console.log("[NC] saveItem:create:payload", payload)
        const created = await createItem.mutateAsync(payload as any)
        console.log("[NC] saveItem:create:success", created)
        setItems((prev) => [created as any, ...prev])
        qc.invalidateQueries({ queryKey: ["user-data"], exact: true })
      }

      setDrawerOpen(false)
      setNotice(editingItem ? "Producto actualizado correctamente" : "Producto creado correctamente")
      toast.success(editingItem ? "Producto actualizado" : "Producto creado")
    } catch (e: any) {
      console.error("[NC] saveItem:error", e)
      setError(e?.message || "Error al guardar el ítem")
      toast.error(e?.message || "Error al guardar el producto")
    }
  }

  const deleteItem = async (item: InventoryItem) => {
    if (!isAdmin) {
      setError("Permiso requerido para eliminar")
      return
    }
    setError("")
    try {
      await deleteItemMutation.mutateAsync(item.id)

      // Limpieza opcional de imagen en Storage
      if (item.image_url) {
        const path = parseStoragePathFromPublicUrl(item.image_url)
        if (path) {
          await supabase.storage.from("product-images").remove([path])
        }
      }

      setItems((prev) => prev.filter((it) => it.id !== item.id))
      qc.invalidateQueries({ queryKey: ["user-data"], exact: true })
    } catch (e: any) {
      setError(e?.message || "Error al eliminar el ítem")
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

      {notice && <div className="text-green-600 text-sm">{notice}</div>}

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
            <Button variant="default" onClick={openNew}>{activeTab === "productos" ? "Añadir producto" : activeTab === "paquetes" ? "Añadir paquete" : "Añadir combo"}</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="productos">Productos</TabsTrigger>
              {isCombosEnabled && (
                <>
                  <TabsTrigger value="paquetes">Paquetes</TabsTrigger>
                  <TabsTrigger value="combos">Combos</TabsTrigger>
                </>
              )}
            </TabsList>

            {/* Productos */}
            <TabsContent value="productos">
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
                    {isAdmin && <TableHead className="text-right">Acciones</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={10} className="p-4">Cargando...</TableCell></TableRow>
                  ) : withCriticality.length === 0 ? (
                    <TableRow><TableCell colSpan={isAdmin ? 11 : 10} className="p-4">Sin resultados</TableCell></TableRow>
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
                      {isAdmin && (
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">...</Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(i)}>Editar</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => { setPendingDeleteItem(i); setConfirmDeleteOpen(true) }}>Eliminar</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            {/* Paquetes */}
            {isCombosEnabled && (
              <TabsContent value="paquetes" className="space-y-4">
                <div>
                  {/* Formulario de paquete migrado a Drawer */}

                  <div>
                    <h3 className="text-sm font-semibold mb-2">Paquetes</h3>
                    <Table className="w-full">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Producto base</TableHead>
                          <TableHead className="text-right">Cantidad</TableHead>
                          <TableHead className="text-right">Precio</TableHead>
                          <TableHead>Consume stock</TableHead>
                          <TableHead>Moneda</TableHead>
                          {isAdmin && <TableHead className="text-right">Acciones</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {packages.length === 0 ? (
                          <TableRow><TableCell colSpan={isAdmin ? 6 : 5} className="p-4">Sin paquetes</TableCell></TableRow>
                        ) : packages.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell>{items.find((it) => it.id === p.base_item_id)?.name || p.base_item_id}</TableCell>
                            <TableCell className="text-right">{p.quantity_included}</TableCell>
                            <TableCell className="text-right">{p.package_price}</TableCell>
                            <TableCell>{p.consume_stock ? "Sí" : "No"}</TableCell>
                            <TableCell>{p.currency}</TableCell>
                            {isAdmin && (
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">...</Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => {
                                      setEditingPackageId(p.id)
                                      setPackageForm({
                                        base_item_id: p.base_item_id,
                                        quantity_included: p.quantity_included,
                                        package_price: p.package_price,
                                        consume_stock: p.consume_stock,
                                        currency: p.currency,
                                        image_url: (p as any).image_url || "",
                                      })
                                      setPkgImageFile(null)
                                      setPkgImagePreview((p as any).image_url || "")
                                      setPackageDrawerOpen(true)
                                    }}>Editar</DropdownMenuItem>
                                    <DropdownMenuItem className="text-destructive" onClick={() => { setPendingDeletePackageId(p.id); setConfirmDeletePackageOpen(true) }}>Eliminar</DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>
            )}

            {/* Combos */}
            {isCombosEnabled && (
              <TabsContent value="combos" className="space-y-4">
                <div className="w-full">
                  {/* Formulario de combo migrado a Drawer */}

                  <div>
                    <h3 className="text-sm font-semibold mb-2">Combos</h3>
                    <Table className="w-full">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nombre</TableHead>
                          <TableHead className="text-right">Precio</TableHead>
                          <TableHead>Moneda</TableHead>
                          <TableHead>Activo</TableHead>
                          {isAdmin && <TableHead className="text-right">Acciones</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {combos.length === 0 ? (
                          <TableRow><TableCell colSpan={isAdmin ? 5 : 4} className="p-4">Sin combos</TableCell></TableRow>
                        ) : combos.map((c) => (
                          <TableRow key={c.id}>
                            <TableCell>{c.combo_name}</TableCell>
                            <TableCell className="text-right">{c.combo_price}</TableCell>
                            <TableCell>{c.currency}</TableCell>
                            <TableCell>{c.is_active ? "Sí" : "No"}</TableCell>
                            {isAdmin && (
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">...</Button>
                              </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => {
                                      setEditingComboId(c.id)
                                      setComboHeaderForm({
                                        combo_name: c.combo_name,
                                        combo_price: c.combo_price,
                                        currency: c.currency,
                                        is_active: c.is_active,
                                        image_url: (c as any).image_url || "",
                                      })
                                      setComboImageFile(null)
                                      setComboImagePreview((c as any).image_url || "")
                                      setComboDrawerOpen(true)
                                    }}>Editar</DropdownMenuItem>
                                    <DropdownMenuItem className="text-destructive" onClick={() => { setPendingDeleteComboId(c.id); setConfirmDeleteComboOpen(true) }}>Eliminar</DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>

      {/* Drawer de alta/edición */}
      <Drawer direction="right" open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{editingItem ? "Editar producto" : "Nuevo producto"}</DrawerTitle>
          </DrawerHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" {...register("sku")} />
              {errors.sku && <span className="text-xs text-destructive">{errors.sku.message as string}</span>}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" {...register("name")} />
              {errors.name && <span className="text-xs text-destructive">{errors.name.message as string}</span>}
            </div>
            <div className="flex flex-col gap-2 md:col-span-2">
              <Label htmlFor="description">Descripción</Label>
              <Input id="description" {...register("description")} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="category">Categoría</Label>
              <Select value={watch("category") || ""} onValueChange={(v) => setValue("category", v)}>
                <SelectTrigger className="min-w-40"><SelectValue placeholder="Selecciona categoría" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                </SelectContent>
              </Select>
              {errors.category && <span className="text-xs text-destructive">{errors.category.message as string}</span>}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="warehouse">Bodega</Label>
              <Select value={watch("warehouse") || ""} onValueChange={(v) => setValue("warehouse", v)}>
                <SelectTrigger className="min-w-40"><SelectValue placeholder="Selecciona bodega" /></SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (<SelectItem key={w} value={w}>{w}</SelectItem>))}
                </SelectContent>
              </Select>
              {errors.warehouse && <span className="text-xs text-destructive">{errors.warehouse.message as string}</span>}
            </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="status">Estado</Label>
            <Select value={watch("status") || ""} onValueChange={(v) => setValue("status", v)}>
              <SelectTrigger className="min-w-40"><SelectValue placeholder="Selecciona estado" /></SelectTrigger>
              <SelectContent>
                {statuses.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
              </SelectContent>
            </Select>
            {errors.status && <span className="text-xs text-destructive">{errors.status.message as string}</span>}
          </div>
          <div className="flex flex-col gap-2">
            <Label>Tipo de ítem</Label>
            <Select value={watch("item_type") || "PRODUCTO_SIMPLE"} onValueChange={(v) => setValue("item_type", v)}>
              <SelectTrigger className="min-w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PRODUCTO_SIMPLE">Producto simple</SelectItem>
                {isCombosEnabled && (
                  <>
                    <SelectItem value="PAQUETE_FIJO">Paquete fijo</SelectItem>
                    <SelectItem value="COMBO_MIXTO">Combo mixto</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
            {errors.item_type && <span className="text-xs text-destructive">{(errors.item_type as any)?.message as string}</span>}
          </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="stock">Stock</Label>
              <Input id="stock" type="number" {...register("stock", { valueAsNumber: true })} />
              {errors.stock && <span className="text-xs text-destructive">{errors.stock.message as string}</span>}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="min">Mínimo</Label>
              <Input id="min" type="number" {...register("min_stock_threshold", { valueAsNumber: true })} />
              {errors.min_stock_threshold && <span className="text-xs text-destructive">{errors.min_stock_threshold.message as string}</span>}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="rotation">Rotación</Label>
              <Input id="rotation" type="number" step="0.01" {...register("rotation_rate", { valueAsNumber: true })} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="price">Precio</Label>
              <Input id="price" type="number" step="0.01" {...register("price", { valueAsNumber: true })} />
              {errors.price && <span className="text-xs text-destructive">{errors.price.message as string}</span>}
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
            <form className="flex gap-2 justify-end" onSubmit={handleSubmit(saveItem)}>
              <DrawerClose asChild>
                <Button type="button" variant="outline">Cancelar</Button>
              </DrawerClose>
              <Button type="submit">{editingItem ? "Guardar cambios" : "Crear"}</Button>
            </form>
            {error && <div className="text-red-600 text-sm">{error}</div>}
          </DrawerFooter>
      </DrawerContent>
      </Drawer>
      {/* Drawer de paquete */}
      <Drawer direction="right" open={packageDrawerOpen} onOpenChange={setPackageDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{editingPackageId ? "Editar paquete" : "Nuevo paquete"}</DrawerTitle>
          </DrawerHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
            <div className="flex flex-col gap-2">
              <Label>Producto base</Label>
              <Select value={packageForm.base_item_id} onValueChange={(v) => setPackageForm({ ...packageForm, base_item_id: v })}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Selecciona producto" /></SelectTrigger>
                <SelectContent>
                  {items.map((it) => (<SelectItem key={it.id} value={it.id}>{it.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Cantidad incluida</Label>
              <Input
                type="number"
                value={Number.isNaN(packageForm.quantity_included) ? "" : packageForm.quantity_included}
                onChange={(e) => {
                  const v = e.target.value
                  setPackageForm({ ...packageForm, quantity_included: v === "" ? Number.NaN : Number(v) })
                }}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Precio del paquete</Label>
              <Input
                type="number"
                step="0.01"
                value={Number.isNaN(packageForm.package_price) ? "" : packageForm.package_price}
                onChange={(e) => {
                  const v = e.target.value
                  setPackageForm({ ...packageForm, package_price: v === "" ? Number.NaN : Number(v) })
                }}
              />
            </div>
            <div className="flex items-center gap-2 md:col-span-2">
              <Checkbox id="pkg_consume" checked={packageForm.consume_stock} onCheckedChange={(v) => setPackageForm({ ...packageForm, consume_stock: Boolean(v) })} />
              <Label htmlFor="pkg_consume">Consume stock</Label>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Moneda</Label>
              <Select value={packageForm.currency} onValueChange={(v) => setPackageForm({ ...packageForm, currency: v })}>
                <SelectTrigger className="min-w-32"><SelectValue placeholder="Selecciona moneda" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="S/">PEN (S/)</SelectItem>
                  <SelectItem value="$">USD ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2 md:col-span-2">
              <Label>Imagen</Label>
              <Input type="file" accept="image/*" onChange={(e) => {
                const f = e.target.files?.[0] || null
                setPkgImageFile(f)
                setPkgImagePreview(f ? URL.createObjectURL(f) : "")
              }} />
              {(pkgImagePreview || packageForm.image_url) && (
                <img src={pkgImagePreview || packageForm.image_url || ""} alt="preview" className="h-20 w-20 object-cover rounded border" />
              )}
            </div>
          </div>
          <DrawerFooter>
            <div className="flex gap-2 justify-end">
              <DrawerClose asChild>
                <Button type="button" variant="outline">Cancelar</Button>
              </DrawerClose>
              <Button
                onClick={async () => {
                  try {
                    // Validación básica para evitar NaN al guardar
                    if (Number.isNaN(packageForm.quantity_included) || Number.isNaN(packageForm.package_price)) {
                      toast.error("Completa cantidad y precio del paquete")
                      return
                    }
                    // Subida de imagen opcional a Storage
                    let imgUrl: string | undefined = packageForm.image_url || undefined
                    if (pkgImageFile) {
                      const ext = pkgImageFile.name.split(".").pop() || "jpg"
                      const baseName = items.find((it) => it.id === packageForm.base_item_id)?.sku
                        || items.find((it) => it.id === packageForm.base_item_id)?.name
                        || "package"
                      const baseSlug = String(baseName).replace(/[^a-zA-Z0-9-_]/g, "_")
                      const path = `inventory/packages/${baseSlug}_${Date.now()}.${ext}`
                      const { error: upErr } = await supabase.storage.from("product-images").upload(path, pkgImageFile)
                      if (upErr) {
                        console.error("[NC] storage.upload:package:error", upErr)
                        toast.warning("No se pudo subir la imagen (RLS). Se guardará sin imagen.")
                      } else {
                        const { data: pub } = await supabase.storage.from("product-images").getPublicUrl(path)
                        imgUrl = pub?.publicUrl
                      }
                    }
                    const payload = { ...packageForm, image_url: imgUrl }
                    if (editingPackageId) {
                      await updatePackage.mutateAsync({ id: editingPackageId, data: payload })
                      setNotice("Paquete actualizado correctamente")
                    } else {
                      await createPackage.mutateAsync(payload as any)
                      setNotice("Paquete creado correctamente")
                    }
                    setPkgImageFile(null)
                    setPkgImagePreview("")
                    setEditingPackageId(null)
                    setPackageDrawerOpen(false)
                    toast.success(editingPackageId ? "Paquete actualizado" : "Paquete creado")
                  } catch (e: any) {
                    setError(e?.message || (editingPackageId ? "Error al actualizar paquete" : "Error al crear paquete"))
                    toast.error(e?.message || (editingPackageId ? "Error al actualizar paquete" : "Error al crear paquete"))
                  }
                }}
              >{editingPackageId ? "Guardar cambios" : "Crear"}</Button>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Drawer de combo */}
      <Drawer direction="right" open={comboDrawerOpen} onOpenChange={setComboDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{editingComboId ? "Editar combo" : "Nuevo combo"}</DrawerTitle>
          </DrawerHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
            <div className="flex flex-col gap-2">
              <Label>Nombre</Label>
              <Input value={comboHeaderForm.combo_name} onChange={(e) => setComboHeaderForm({ ...comboHeaderForm, combo_name: e.target.value })} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Precio fijo</Label>
              <Input
                type="number"
                step="0.01"
                value={Number.isNaN(comboHeaderForm.combo_price) ? "" : comboHeaderForm.combo_price}
                onChange={(e) => {
                  const v = e.target.value
                  setComboHeaderForm({ ...comboHeaderForm, combo_price: v === "" ? Number.NaN : Number(v) })
                }}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="combo_active" checked={comboHeaderForm.is_active} onCheckedChange={(v) => setComboHeaderForm({ ...comboHeaderForm, is_active: Boolean(v) })} />
              <Label htmlFor="combo_active">Activo</Label>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Moneda</Label>
              <Select value={comboHeaderForm.currency} onValueChange={(v) => setComboHeaderForm({ ...comboHeaderForm, currency: v })}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Selecciona moneda" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="S/">PEN (S/)</SelectItem>
                  <SelectItem value="$">USD ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2 md:col-span-2">
              <Label>Imagen</Label>
              <Input type="file" accept="image/*" onChange={(e) => {
                const f = e.target.files?.[0] || null
                setComboImageFile(f)
                setComboImagePreview(f ? URL.createObjectURL(f) : "")
              }} />
              {(comboImagePreview || comboHeaderForm.image_url) && (
                <img src={comboImagePreview || comboHeaderForm.image_url || ""} alt="preview" className="h-20 w-20 object-cover rounded border" />
              )}
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label>Componentes</Label>
              {comboComponentsForm.map((c, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                  <div className="col-span-2">
                    <Select value={c.component_item_id} onValueChange={(v) => {
                      const next = [...comboComponentsForm]
                      next[idx] = { ...next[idx], component_item_id: v }
                      setComboComponentsForm(next)
                    }}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Producto" /></SelectTrigger>
                      <SelectContent>
                        {items.map((it) => (<SelectItem key={it.id} value={it.id}>{it.name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Input
                      type="number"
                      value={Number.isNaN(c.component_qty) ? "" : c.component_qty}
                      onChange={(e) => {
                        const v = e.target.value
                        const next = [...comboComponentsForm]
                        next[idx] = { ...next[idx], component_qty: v === "" ? Number.NaN : Number(v) }
                        setComboComponentsForm(next)
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={c.consume_stock} onCheckedChange={(v) => {
                      const next = [...comboComponentsForm]
                      next[idx] = { ...next[idx], consume_stock: Boolean(v) }
                      setComboComponentsForm(next)
                    }} />
                    <span className="text-[10px]">Consume stock</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => {
                      const next = comboComponentsForm.filter((_, j) => j !== idx)
                      setComboComponentsForm(next.length ? next : [{ component_item_id: "", component_qty: 1, consume_stock: true }])
                    }}>Eliminar</Button>
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setComboComponentsForm([...comboComponentsForm, { component_item_id: "", component_qty: 1, consume_stock: true }])}>Agregar componente</Button>
            </div>
          </div>
          <DrawerFooter>
            <div className="flex gap-2 justify-end">
              <DrawerClose asChild>
                <Button type="button" variant="outline">Cancelar</Button>
              </DrawerClose>
              <Button
                onClick={async () => {
                  try {
                    // Validación básica para evitar NaN al guardar
                    if (Number.isNaN(comboHeaderForm.combo_price)) {
                      toast.error("Completa el precio del combo")
                      return
                    }
                    if (comboComponentsForm.some((c) => Number.isNaN(c.component_qty))) {
                      toast.error("Completa la cantidad de todos los componentes")
                      return
                    }
                    // Subida de imagen opcional a Storage
                    let imgUrl: string | undefined = comboHeaderForm.image_url || undefined
                    if (comboImageFile) {
                      const ext = comboImageFile.name.split(".").pop() || "jpg"
                      const baseSlug = String(comboHeaderForm.combo_name || "combo").replace(/[^a-zA-Z0-9-_]/g, "_")
                      const path = `inventory/combos/${baseSlug}_${Date.now()}.${ext}`
                      const { error: upErr } = await supabase.storage.from("product-images").upload(path, comboImageFile)
                      if (upErr) {
                        console.error("[NC] storage.upload:combo:error", upErr)
                        toast.warning("No se pudo subir la imagen (RLS). Se guardará sin imagen.")
                      } else {
                        const { data: pub } = await supabase.storage.from("product-images").getPublicUrl(path)
                        imgUrl = pub?.publicUrl
                      }
                    }
                    if (editingComboId) {
                      await updateComboHeader.mutateAsync({ id: editingComboId, data: {
                        combo_name: comboHeaderForm.combo_name,
                        combo_price: comboHeaderForm.combo_price,
                        currency: comboHeaderForm.currency,
                        is_active: comboHeaderForm.is_active,
                        image_url: imgUrl,
                      }})
                      setNotice("Combo actualizado correctamente")
                      setEditingComboId(null)
                    } else {
                      await createCombo.mutateAsync({
                        header: {
                          combo_name: comboHeaderForm.combo_name,
                          combo_price: comboHeaderForm.combo_price,
                          currency: comboHeaderForm.currency,
                          is_active: comboHeaderForm.is_active,
                          image_url: imgUrl,
                        },
                        components: comboComponentsForm as any,
                      })
                      setNotice("Combo creado correctamente")
                      setComboHeaderForm({ combo_name: "", combo_price: 0, currency: "S/", is_active: true, image_url: "" })
                      setComboComponentsForm([{ component_item_id: "", component_qty: 1, consume_stock: true }])
                    }
                    setComboImageFile(null)
                    setComboImagePreview("")
                    setComboDrawerOpen(false)
                    toast.success(editingComboId ? "Combo actualizado" : "Combo creado")
                  } catch (e: any) {
                    setError(e?.message || (editingComboId ? "Error al actualizar combo" : "Error al crear combo"))
                    toast.error(e?.message || (editingComboId ? "Error al actualizar combo" : "Error al crear combo"))
                  }
                }}
              >{editingComboId ? "Guardar cambios" : "Crear"}</Button>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
      {/* Confirmar eliminación de producto */}
      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar producto</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará el producto {pendingDeleteItem?.name}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={async () => {
                if (!pendingDeleteItem) return
                await deleteItem(pendingDeleteItem)
                setPendingDeleteItem(null)
                setConfirmDeleteOpen(false)
              }}
            >Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmar eliminación de paquete */}
      <AlertDialog open={confirmDeletePackageOpen} onOpenChange={setConfirmDeletePackageOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar paquete</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará el paquete seleccionado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={async () => {
                if (!pendingDeletePackageId) return
                await deletePackage.mutateAsync(pendingDeletePackageId)
                setPackages((prev) => prev.filter((p: any) => p.id !== pendingDeletePackageId))
                setPendingDeletePackageId(null)
                setConfirmDeletePackageOpen(false)
              }}
            >Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmar eliminación de combo */}
      <AlertDialog open={confirmDeleteComboOpen} onOpenChange={setConfirmDeleteComboOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar combo</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará el combo seleccionado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={async () => {
                if (!pendingDeleteComboId) return
                await deleteCombo.mutateAsync(pendingDeleteComboId)
                setCombos((prev) => prev.filter((c: any) => c.id !== pendingDeleteComboId))
                setPendingDeleteComboId(null)
                setConfirmDeleteComboOpen(false)
              }}
            >Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
