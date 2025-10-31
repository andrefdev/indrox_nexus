import type { SupabaseClient } from "@supabase/supabase-js"
import { SupabaseDAO } from "@/lib/dao/supabase-dao"
import { logger } from "@/lib/logging/logger"
import { withErrorHandling } from "@/lib/helpers/errors"

export async function getAllUserData(supabase: SupabaseClient, userId: string) {
  const dao = new SupabaseDAO(supabase)
  return logger.time("getAllUserData", async () => withErrorHandling("user-data", async () => {
    const [
      userRoles,
      services,
      exportsAudit,
      notifications,
      alerts,
      syncStatus,
      inventoryItems,
      salesOrders,
      customers,
    ] = await Promise.all([
      dao.listByUser("nc_user_roles", userId, "user_id, role, created_at"),
      dao.listByUser("nc_customer_services", userId, "user_id, service_code, active"),
      dao.listByUser("nc_exports_audit", userId, "id, module_code, format, record_count, created_at"),
      dao.listByUser("nc_notifications", userId, "id, module_code, level, message, created_at, read_at"),
      dao.listByUser("nc_inventory_alerts", userId, "id, threshold, channel, active, created_by"),
      // Tablas sin filtro directo por usuario: se asume RLS o alcance global por servicio
      dao.listByUser("nc_sync_status", userId, "module_code, last_sync_at"),
      dao.listByUser(
        "nc_inventory_items",
        userId,
        "id, sku, name, category, warehouse, status, stock, min_stock_threshold, rotation_rate, image_url, updated_at"
      ),
      dao.listByUser("nc_sales_orders", userId, "id, date, channel, product_id, qty, total_amount, currency, customer_id, created_at"),
      dao.listByUser("nc_customers", userId, "id, name, email, phone, segment, last_purchase_at, ltv, churn_rate, purchase_frequency, updated_at"),
    ])

    const aggregate = {
      roles: userRoles.data,
      services: services.data,
      exports: exportsAudit.data,
      notifications: notifications.data,
      inventoryAlerts: alerts.data,
      syncStatus: syncStatus.data,
      inventoryItems: inventoryItems.data,
      salesOrders: salesOrders.data,
      customers: customers.data,
      errors: [
        userRoles.error,
        services.error,
        exportsAudit.error,
        notifications.error,
        alerts.error,
        syncStatus.error,
        inventoryItems.error,
        salesOrders.error,
        customers.error,
      ].filter(Boolean).map((e) => (e as Error).message),
    }

    logger.info("user-data fetched", { tables: Object.keys(aggregate) })
    return aggregate
  }))
}