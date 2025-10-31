import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import http from "@/lib/api/http"

export type PackageDef = {
  id: string
  base_item_id: string
  quantity_included: number
  package_price: number
  consume_stock: boolean
  currency: string
  image_url?: string
  client_id: string
}

export function usePackages(options?: { enabled?: boolean }) {
  const qc = useQueryClient()

  const list = useQuery<PackageDef[], Error>({
    queryKey: ["nc-packages"],
    queryFn: async () => {
      const { data } = await http.get("/api/neurocore/inventory/packages")
      return (data?.data ?? data) as PackageDef[]
    },
    enabled: options?.enabled ?? true,
  })

  const create = useMutation({
    mutationFn: async (payload: Omit<PackageDef, "id" | "client_id">) => {
      const { data } = await http.post("/api/neurocore/inventory/packages", payload)
      return (data?.data ?? data) as PackageDef
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nc-packages"], exact: true })
    },
  })

  const update = useMutation({
    mutationFn: async (params: { id: string; data: Partial<Omit<PackageDef, "id" | "client_id">> }) => {
      const { data } = await http.put(`/api/neurocore/inventory/packages/${params.id}`, params.data)
      return (data?.data ?? data) as PackageDef
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nc-packages"], exact: true })
    },
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await http.delete(`/api/neurocore/inventory/packages/${id}`)
      return (data?.data ?? data) as { id: string }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nc-packages"], exact: true })
    },
  })

  return { ...list, createPackage: create, updatePackage: update, deletePackage: remove }
}