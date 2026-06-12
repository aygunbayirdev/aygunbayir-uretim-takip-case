import { create } from 'zustand'
import type { RecordFilters } from '../types'

interface FilterStore {
  filters: RecordFilters
  setFilters: (filters: Partial<RecordFilters>) => void
  resetFilters: () => void
}

const defaultFilters: RecordFilters = {}

export const useFilterStore = create<FilterStore>((set) => ({
  filters: defaultFilters,
  setFilters: (partial) =>
    set((state) => ({ filters: { ...state.filters, ...partial } })),
  resetFilters: () => set({ filters: defaultFilters }),
}))
