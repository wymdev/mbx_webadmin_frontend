import type { LucideIcon } from 'lucide-react'
import LayoutDashboard from 'lucide-react/icons/layout-dashboard'
import ArrowLeftRight from 'lucide-react/icons/arrow-left-right'
import ChartColumn from 'lucide-react/icons/chart-column-big'
import ChartNoAxesCombined from 'lucide-react/icons/chart-no-axes-combined'
import UsersRound from 'lucide-react/icons/users-round'
import ContactRound from 'lucide-react/icons/contact-round'
import SlidersHorizontal from 'lucide-react/icons/sliders-horizontal'
import Palette from 'lucide-react/icons/palette'
import Trash2 from 'lucide-react/icons/trash'
import Landmark from 'lucide-react/icons/landmark'
import ShieldCheck from 'lucide-react/icons/shield-check'
import Zap from 'lucide-react/icons/zap'
import UserRound from 'lucide-react/icons/user-round'
import type { Permission } from '@/features/auth/session'

export type NavItem = {
  title: string
  path: string
  icon: LucideIcon
  /** Hidden unless the signed-in staff member has this permission. */
  requires?: Permission
  /** Extra words the command palette matches. */
  keywords?: string
}

export const navigation: { label: string; items: NavItem[] }[] = [
  {
    label: 'Operations',
    items: [
      { title: 'Overview', path: '/', icon: LayoutDashboard, keywords: 'dashboard home' },
      { title: 'Deal desk', path: '/desk', icon: Zap, keywords: 'pos new transaction buy sell' },
      { title: 'Transactions', path: '/transactions', icon: ArrowLeftRight, keywords: 'ledger deals' },
      { title: 'Customers', path: '/customers', icon: ContactRound, keywords: 'clients people' },
      { title: 'Exchange rates', path: '/rates', icon: ChartNoAxesCombined, keywords: 'board prices' },
      { title: 'Reports', path: '/reports', icon: ChartColumn, keywords: 'analytics export csv summary' },
    ],
  },
  {
    label: 'Management',
    items: [
      { title: 'Team', path: '/settings/users', icon: UsersRound, requires: 'manage_users', keywords: 'staff users roles' },
      { title: 'Transfer methods', path: '/settings/methods', icon: Landmark, keywords: 'banks wallets' },
      { title: 'Customer sources', path: '/settings/sources', icon: SlidersHorizontal, keywords: 'channels viber line facebook' },
      { title: 'Receipt designer', path: '/settings/slips', icon: Palette, keywords: 'slip logo background' },
      { title: 'Audit log', path: '/audit', icon: ShieldCheck, requires: 'view_audit_log', keywords: 'evidence history' },
      { title: 'Trash', path: '/trash', icon: Trash2, keywords: 'deleted restore' },
    ],
  },
]

export const accountNavigation: NavItem[] = [
  { title: 'My profile', path: '/profile', icon: UserRound, keywords: 'password account' },
]

export const allNavigation = [...navigation.flatMap((group) => group.items), ...accountNavigation]

/** The nav item a path belongs to (longest matching prefix). */
export function navItemFor(pathname: string) {
  return [...allNavigation]
    .sort((a, b) => b.path.length - a.path.length)
    .find((item) => (item.path === '/' ? pathname === '/' : pathname.startsWith(item.path)))
}
