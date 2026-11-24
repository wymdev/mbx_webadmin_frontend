import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Preferences = {
  collapsed: boolean
  theme: 'light' | 'dark'
  density: 'compact' | 'comfortable'
  /** Sidebar groups the user folded away. */
  folded: string[]
  toggleSidebar: () => void
  toggleGroup: (label: string) => void
  toggleTheme: () => void
  setDensity: (density: Preferences['density']) => void
}
export const usePreferences = create<Preferences>()(
  persist(
    (set) => ({
      collapsed: false,
      theme: 'light',
      density: 'compact',
      folded: [],
      toggleGroup: (label) =>
        set((state) => ({
          folded: state.folded.includes(label) ? state.folded.filter((l) => l !== label) : [...state.folded, label],
        })),
      toggleSidebar: () => set((state) => ({ collapsed: !state.collapsed })),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
      setDensity: (density) => set({ density }),
    }),
    { name: 'mbx-ui-preferences', version: 1 },
  ),
)
