"use client"
import React, { createContext, useContext, useMemo, useCallback, ReactNode, useEffect, useState } from "react"
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import http from "@/lib/api/http"
import { useAuth } from "@/context/auth-context"

// Tipos de flags conocidos (añadir aquí nuevos conforme se soporten en el backend)
export const KNOWN_FEATURE_FLAGS = [
  "NC_INVENTORY_COMBOS",
] as const

export type FeatureFlagKey = typeof KNOWN_FEATURE_FLAGS[number]
export type FeatureFlagsMap = Record<FeatureFlagKey, boolean>
export type AllFeatureFlags = Record<string, boolean>

interface FeatureFlagsContextValue {
  // Flags conocidos y mapeados con tipos seguros
  flags: FeatureFlagsMap
  // Todos los flags devueltos por el backend (dinámicos)
  allFlags: AllFeatureFlags
  // Estado de carga y error
  loading: boolean
  error: Error | null
  // Utilidad para verificar si un flag está habilitado
  isEnabled: (flag: FeatureFlagKey | string) => boolean
  // Forzar actualización desde backend
  refresh: () => Promise<void>
}

const FeatureFlagsContext = createContext<FeatureFlagsContextValue | undefined>(undefined)

function useFetchFeatureFlags() {
  return useQuery<AllFeatureFlags, Error>({
    queryKey: ["feature-flags"],
    queryFn: async () => {
      const { data } = await http.get("/api/neurocore/features")
      return (data?.data ?? data) as AllFeatureFlags
    },
    // Mantener datos previos para evitar flicker en v5
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })
}

function toTypedFlags(all: AllFeatureFlags): FeatureFlagsMap {
  const base: FeatureFlagsMap = {
    NC_INVENTORY_COMBOS: !!all["NC_INVENTORY_COMBOS"],
  }
  return base
}

export function FeatureFlagsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { data, isLoading, error } = useFetchFeatureFlags()
  const [overrides, setOverrides] = useState<Partial<AllFeatureFlags>>({})

  // Refrescar automáticamente cuando cambia el usuario (permisos/roles)
  useEffect(() => {
    // invalidate + refetch para sincronizar rápido
    queryClient.invalidateQueries({ queryKey: ["feature-flags"] })
  }, [user?.id, queryClient])

  const allFlags = useMemo<AllFeatureFlags>(() => {
    const raw = data ?? ({} as AllFeatureFlags)
    // Aplicar overrides locales (útil para pruebas puntuales o transiciones de permisos)
    return { ...raw, ...overrides } as AllFeatureFlags
  }, [data, overrides])

  const flags = useMemo(() => toTypedFlags(allFlags), [allFlags])

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["feature-flags"] })
    await queryClient.refetchQueries({ queryKey: ["feature-flags"], type: "active" })
  }, [queryClient])

  const isEnabled = useCallback((flag: FeatureFlagKey | string) => {
    // Primero buscar en los conocidos tipados
    if ((KNOWN_FEATURE_FLAGS as readonly string[]).includes(flag)) {
      return !!flags[flag as FeatureFlagKey]
    }
    // Si es dinámico, caer al mapa completo
    return !!allFlags[flag]
  }, [flags, allFlags])

  const value = useMemo<FeatureFlagsContextValue>(() => ({
    flags,
    allFlags,
    loading: isLoading,
    error: error ?? null,
    isEnabled,
    refresh,
  }), [flags, allFlags, isLoading, error, isEnabled, refresh])

  return (
    <FeatureFlagsContext.Provider value={value}>{children}</FeatureFlagsContext.Provider>
  )
}

export function useFeatureFlagsContext() {
  const ctx = useContext(FeatureFlagsContext)
  if (!ctx) throw new Error("useFeatureFlagsContext debe usarse dentro de <FeatureFlagsProvider>")
  return ctx
}

// Hook de conveniencia que expone una API amigable
export function useFeatureFlags() {
  const { flags, allFlags, isEnabled, loading, error, refresh } = useFeatureFlagsContext()
  return { flags, allFlags, isEnabled, loading, error, refresh }
}