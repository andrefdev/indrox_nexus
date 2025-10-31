import type { AllFeatureFlags, FeatureFlagsMap } from "@/context/feature-flags-context"
import { useFeatureFlags as useFeatureFlagsFromContext } from "@/context/feature-flags-context"

export type FeatureFlags = AllFeatureFlags

// Reexport del hook para mantener compatibilidad con código existente
export function useFeatureFlags() {
  const { allFlags, flags, isEnabled, loading, error, refresh } = useFeatureFlagsFromContext()
  return {
    data: allFlags as FeatureFlags,
    typed: flags as FeatureFlagsMap,
    isEnabled,
    isLoading: loading,
    error,
    refresh,
  }
}