import { create } from 'zustand';
import { fetchTopology } from '../api/client';
export const useTopologyStore = create((set) => ({
    topology: null,
    loading: false,
    error: null,
    load: async () => {
        set({ loading: true, error: null });
        try {
            const topology = await fetchTopology();
            set({ topology, loading: false });
        }
        catch (err) {
            set({ loading: false, error: String(err) });
        }
    },
}));
