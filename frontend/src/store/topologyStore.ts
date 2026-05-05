import { create } from 'zustand'
import type { Topology } from '../types/domain'
import { fetchTopology } from '../api/client'

interface TopologyStore {
  topology: Topology | null
  loading: boolean
  error: string | null
  load: () => Promise<void>
}

export const useTopologyStore = create<TopologyStore>((set) => ({
  topology: null,
  loading: false,
  error: null,

  load: async () => {
    set({ loading: true, error: null })
    try {
      const topology = await fetchTopology()
      set({ topology, loading: false })
    } catch (err) {
      set({ loading: false, error: String(err) })
    }
  },
}))
