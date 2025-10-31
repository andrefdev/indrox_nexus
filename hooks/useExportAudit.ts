import { useMutation } from "@tanstack/react-query"
import http from "@/lib/api/http"

export type ExportAuditPayload = {
  module_code: string
  format: string
  filters?: any
  record_count: number
}

export function useExportAudit() {
  return useMutation({
    mutationFn: async (payload: ExportAuditPayload) => {
      const { data } = await http.post("/api/audit/exports", payload)
      return data
    },
  })
}