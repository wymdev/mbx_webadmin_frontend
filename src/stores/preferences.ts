import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Preferences = {
  collapsed: boolean
  theme: 'light' | 'dark'
  density: 'compact' | 'comfortable'
  /** Sidebar groups the user folded away. */
  folded: string[]
  /** Per table: the columns the user chose to show (absent = that table's default set). */
  tableColumns: Record<string, string[]>
  /** Rows per page for paginated tables. */
  pageSize: number
  toggleSidebar: () => void
  toggleGroup: (label: string) => void
  toggleTheme: () => void
  setDensity: (density: Preferences['density']) => void
  setTableColumns: (table: string, columns: string[] | null) => void
  setPageSize: (size: number) => void
}
export const usePreferences = create<Preferences>()(
  persist(
    (set) => ({
      collapsed: false,
      theme: 'light',
      density: 'compact',
      folded: [],
      tableColumns: {},
      pageSize: 25,
      toggleGroup: (label) =>
        set((state) => ({
          folded: state.folded.includes(label) ? state.folded.filter((l) => l !== label) : [...state.folded, label],
        })),
      toggleSidebar: () => set((state) => ({ collapsed: !state.collapsed })),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
      setDensity: (density) => set({ density }),
      setTableColumns: (table, columns) =>
        set((state) => {
          const next = { ...state.tableColumns }
          if (columns) next[table] = columns
          else delete next[table]
          return { tableColumns: next }
        }),
      setPageSize: (pageSize) => set({ pageSize }),
    }),
    { name: 'mbx-ui-preferences', version: 1 },
  ),
)
