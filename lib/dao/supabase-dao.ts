import type { SupabaseClient } from "@supabase/supabase-js"
import { selectList } from "@/lib/supabase/queries"
import type { FilterOp } from "@/lib/supabase/queries"

type TableName =
  | "nc_user_roles"
  | "nc_sync_status"
  | "nc_inventory_items"
  | "nc_inventory_alerts"
  | "nc_sales_orders"
  | "nc_customers"
  | "nc_exports_audit"
  | "nc_notifications"
  | "nc_customer_services"

type UserFilterColumn = "user_id" | "created_by" | null

const userFilterMap: Record<TableName, UserFilterColumn> = {
  nc_user_roles: "user_id",
  nc_sync_status: null,
  nc_inventory_items: null,
  nc_inventory_alerts: "created_by",
  nc_sales_orders: null,
  nc_customers: null,
  nc_exports_audit: "user_id",
  nc_notifications: "user_id",
  nc_customer_services: "user_id",
}

export class SupabaseDAO {
  constructor(private supabase: SupabaseClient) {}

  async listByUser<T = any>(table: TableName, userId: string, columns: string = "*") {
    const userColumn = userFilterMap[table]
    const filters: FilterOp[] | undefined = userColumn
      ? [{ op: "eq", column: userColumn as string, value: userId }]
      : undefined
    return selectList<T>(this.supabase, table, columns, filters)
  }
}