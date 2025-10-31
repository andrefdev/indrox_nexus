import { useQuery } from "@tanstack/react-query"
import http from "@/lib/api/http"

export type UserData = {
  roles?: { role: string }[]
  services?: { service_code: string }[]
  exports?: any[]
  notifications?: any[]
  inventoryAlerts?: any[]
  syncStatus?: { module_code: string; last_sync_at?: string }[]
  inventoryItems?: any[]
  salesOrders?: any[]
  customers?: any[]
  errors?: string[]
}

export function useUserData() {
  return useQuery<UserData, Error>({
    queryKey: ["user-data"],
    queryFn: async () => {
      const { data } = await http.get("/api/user-data")
      return data as UserData
    },
  })
}