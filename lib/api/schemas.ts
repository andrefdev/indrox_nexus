import { z } from "zod"

export const AuditSchema = z.object({
  module_code: z.string().min(1),
  format: z.string().min(1),
  filters: z.any().optional(),
  record_count: z.number().int().nonnegative(),
})

export const AlertSchema = z.object({
  threshold: z.number().int().nonnegative(),
  channel: z.enum(["portal", "email"]),
})

// Inventario – Paquetes
export const PackageSchema = z.object({
  base_item_id: z.string().uuid(),
  quantity_included: z.number().int().positive(),
  package_price: z.number().nonnegative(),
  consume_stock: z.boolean(),
  currency: z.string().min(1),
  image_url: z.string().url().optional(),
})

export const PackageUpdateSchema = z.object({
  base_item_id: z.string().uuid().optional(),
  quantity_included: z.number().int().positive().optional(),
  package_price: z.number().nonnegative().optional(),
  consume_stock: z.boolean().optional(),
  currency: z.string().min(1).optional(),
  image_url: z.string().url().optional(),
})

// Inventario – Combos
export const ComboHeaderSchema = z.object({
  combo_name: z.string().min(1),
  combo_price: z.number().nonnegative(),
  currency: z.string().min(1),
  is_active: z.boolean(),
  image_url: z.string().url().optional(),
})

export const ComboComponentSchema = z.object({
  component_item_id: z.string().uuid(),
  component_qty: z.number().int().positive(),
  consume_stock: z.boolean(),
})

export const ComboHeaderUpdateSchema = z.object({
  combo_name: z.string().min(1).optional(),
  combo_price: z.number().nonnegative().optional(),
  currency: z.string().min(1).optional(),
  is_active: z.boolean().optional(),
  image_url: z.string().url().optional(),
})