import type { SupabaseClient } from "@supabase/supabase-js"

export type FilterOp =
  | { op: "eq"; column: string; value: any }
  | { op: "neq"; column: string; value: any }
  | { op: "gt"; column: string; value: any }
  | { op: "lt"; column: string; value: any }
  | { op: "gte"; column: string; value: any }
  | { op: "lte"; column: string; value: any }
  | { op: "ilike"; column: string; value: string }
  | { op: "like"; column: string; value: string }
  | { op: "in"; column: string; value: any[] }
  | { op: "is"; column: string; value: boolean | null }

function applyFilters<T>(query: any, filters?: FilterOp[]) {
  if (!filters || filters.length === 0) return query
  let q = query
  for (const f of filters) {
    switch (f.op) {
      case "eq":
        q = q.eq(f.column, f.value)
        break
      case "neq":
        q = q.neq(f.column, f.value)
        break
      case "gt":
        q = q.gt(f.column, f.value)
        break
      case "lt":
        q = q.lt(f.column, f.value)
        break
      case "gte":
        q = q.gte(f.column, f.value)
        break
      case "lte":
        q = q.lte(f.column, f.value)
        break
      case "ilike":
        q = q.ilike(f.column, f.value)
        break
      case "like":
        q = q.like(f.column, f.value)
        break
      case "in":
        q = q.in(f.column, f.value)
        break
      case "is":
        q = q.is(f.column, f.value as any)
        break
      default:
        // noop for unsupported ops
        break
    }
  }
  return q
}

export async function selectList<T = any>(
  supabase: SupabaseClient,
  table: string,
  columns: string = "*",
  filters?: FilterOp[]
): Promise<{ data: T[]; error: Error | null }> {
  let q = supabase.from(table).select(columns)
  q = applyFilters(q, filters)
  const { data, error } = await q
  return { data: (data ?? []) as T[], error: error ? new Error(error.message) : null }
}

export async function selectSingle<T = any>(
  supabase: SupabaseClient,
  table: string,
  columns: string = "*",
  filters?: FilterOp[]
): Promise<{ data: T | null; error: Error | null }> {
  let q = supabase.from(table).select(columns).limit(1)
  q = applyFilters(q, filters)
  const { data, error } = await q
  const first = (data && data[0]) ? (data[0] as T) : null
  return { data: first, error: error ? new Error(error.message) : null }
}

export async function insertOne<T = any>(
  supabase: SupabaseClient,
  table: string,
  payload: Partial<T>
): Promise<{ data: T | null; error: Error | null }> {
  const { data, error } = await supabase.from(table).insert(payload).select().single()
  return { data: (data ?? null) as T | null, error: error ? new Error(error.message) : null }
}

export async function upsertMany<T = any>(
  supabase: SupabaseClient,
  table: string,
  payloads: Partial<T>[],
  onConflict?: string
): Promise<{ data: T[]; error: Error | null }> {
  let q = supabase.from(table).upsert(payloads, { onConflict })
  const { data, error } = await q.select()
  return { data: (data ?? []) as T[], error: error ? new Error(error.message) : null }
}

export async function updateById<T = any>(
  supabase: SupabaseClient,
  table: string,
  idColumn: string,
  idValue: any,
  changes: Partial<T>
): Promise<{ data: T[]; error: Error | null }> {
  const { data, error } = await supabase
    .from(table)
    .update(changes)
    .eq(idColumn, idValue)
    .select()
  return { data: (data ?? []) as T[], error: error ? new Error(error.message) : null }
}

export async function deleteById(
  supabase: SupabaseClient,
  table: string,
  idColumn: string,
  idValue: any
): Promise<{ error: Error | null }> {
  const { error } = await supabase.from(table).delete().eq(idColumn, idValue)
  return { error: error ? new Error(error.message) : null }
}

export async function count(
  supabase: SupabaseClient,
  table: string,
  filters?: FilterOp[]
): Promise<{ count: number; error: Error | null }> {
  let q = supabase.from(table).select("*", { count: "exact", head: true })
  q = applyFilters(q, filters)
  const { count, error } = await q
  return { count: count ?? 0, error: error ? new Error(error.message) : null }
}