import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import http from "@/lib/api/http"

export type ComboHeader = {
  id: string
  combo_name: string
  combo_price: number
  currency: string
  is_active: boolean
  image_url?: string
  client_id: string
}

export type ComboComponent = {
  component_item_id: string
  component_qty: number
  consume_stock: boolean
}

export function useCombos(options?: { enabled?: boolean }) {
  const qc = useQueryClient()

  const list = useQuery<ComboHeader[], Error>({
    queryKey: ["nc-combos"],
    queryFn: async () => {
      const { data } = await http.get("/api/neurocore/inventory/combos")
      return (data?.data ?? data) as ComboHeader[]
    },
    enabled: options?.enabled ?? true,
  })

  const create = useMutation({
    mutationFn: async (payload: { header: Omit<ComboHeader, "id" | "client_id">; components: ComboComponent[] }) => {
      const { data } = await http.post("/api/neurocore/inventory/combos", payload)
      return (data?.data ?? data) as ComboHeader
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nc-combos"], exact: true })
    },
  })

  const updateHeader = useMutation({
    mutationFn: async (params: { id: string; data: Partial<Omit<ComboHeader, "id" | "client_id">> }) => {
      const { data } = await http.put(`/api/neurocore/inventory/combos/${params.id}`, params.data)
      return (data?.data ?? data) as ComboHeader
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nc-combos"], exact: true })
    },
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await http.delete(`/api/neurocore/inventory/combos/${id}`)
      return (data?.data ?? data) as { id: string }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nc-combos"], exact: true })
    },
  })

  return { ...list, createCombo: create, updateComboHeader: updateHeader, deleteCombo: remove }
}