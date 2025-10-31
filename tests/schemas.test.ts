import { describe, it, expect } from "vitest"
import { AuditSchema, AlertSchema } from "@/lib/api/schemas"

describe("Zod Schemas", () => {
  it("AuditSchema accepts valid payload", () => {
    const parsed = AuditSchema.safeParse({
      module_code: "MOD-NC-INV",
      format: "CSV",
      filters: { criticality: "ALTA" },
      record_count: 10,
    })
    expect(parsed.success).toBe(true)
  })

  it("AuditSchema rejects invalid payload", () => {
    const parsed = AuditSchema.safeParse({
      module_code: "",
      format: "",
      record_count: -1,
    })
    expect(parsed.success).toBe(false)
  })

  it("AlertSchema accepts valid", () => {
    const parsed = AlertSchema.safeParse({ threshold: 5, channel: "portal" })
    expect(parsed.success).toBe(true)
  })

  it("AlertSchema rejects invalid", () => {
    const parsed = AlertSchema.safeParse({ threshold: -1, channel: "sms" })
    expect(parsed.success).toBe(false)
  })
})