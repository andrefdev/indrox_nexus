import { useMutation } from "@tanstack/react-query"
import http from "@/lib/api/http"

export type AlertPayload = {
  threshold: number
  channel: "portal" | "email"
}

export function useCreateAlert() {
  return useMutation({
    mutationFn: async (payload: AlertPayload) => {
      const { data } = await http.post("/api/neurocore/inventory/alerts", payload)
      return data
    },
  })
}