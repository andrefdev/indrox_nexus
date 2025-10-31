import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import http from "@/lib/api/http"

export type InventoryItem = {
  id: string
  sku: string
  name: string
  category: string
  warehouse: string
  status: string
  stock: number
  min_stock_threshold: number
  rotation_rate: number | null
  unit_price?: number | null
  image_url?: string | null
  item_type?: "PRODUCTO_SIMPLE" | "PAQUETE_FIJO" | "COMBO_MIXTO"
}

export function useInventoryItems(options?: { enabled?: boolean }) {
  const qc = useQueryClient()

  const list = useQuery<InventoryItem[], Error>({
    queryKey: ["nc-inventory-items"],
    queryFn: async () => {
      const { data } = await http.get("/api/neurocore/inventory/items")
      return (data?.data ?? data) as InventoryItem[]
    },
    enabled: options?.enabled ?? false,
  })

  const createItem = useMutation({
    mutationFn: async (payload: Omit<InventoryItem, "id">) => {
      const { data } = await http.post("/api/neurocore/inventory/items", payload)
      return (data?.data ?? data) as InventoryItem
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nc-inventory-items"], exact: true })
    },
  })

  const updateItem = useMutation({
    mutationFn: async ({ id, data: payload }: { id: string; data: Partial<InventoryItem> }) => {
      const { data } = await http.put(`/api/neurocore/inventory/items/${id}`, payload)
      return (data?.data ?? data) as InventoryItem
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nc-inventory-items"], exact: true })
    },
  })

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await http.delete(`/api/neurocore/inventory/items/${id}`)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nc-inventory-items"], exact: true })
    },
  })

  return { ...list, createItem, updateItem, deleteItem }
}