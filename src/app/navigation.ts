import LayoutDashboard from 'lucide-react/icons/layout-dashboard'
import ArrowLeftRight from 'lucide-react/icons/arrow-left-right'
import FileBarChart2 from 'lucide-react/icons/file-chart-column'
import ChartNoAxesCombined from 'lucide-react/icons/chart-no-axes-combined'
import UsersRound from 'lucide-react/icons/users-round'
import ContactRound from 'lucide-react/icons/contact-round'
import Settings2 from 'lucide-react/icons/settings-2'
import SlidersHorizontal from 'lucide-react/icons/sliders-horizontal'
import Image from 'lucide-react/icons/image'
import UserRound from 'lucide-react/icons/user-round'
import Trash2 from 'lucide-react/icons/trash'
import Landmark from 'lucide-react/icons/landmark'

export const navigation = [
  {
    label: 'WORKSPACE',
    items: [
      { title: 'Overview', path: '/', icon: LayoutDashboard },
      { title: 'Transactions', path: '/transactions', icon: ArrowLeftRight },
      { title: 'Reports', path: '/reports', icon: FileBarChart2 },
      { title: 'Exchange rates', path: '/rates', icon: ChartNoAxesCombined },
      { title: 'Customers', path: '/customers', icon: ContactRound },
    ],
  },
  {
    label: 'MANAGEMENT',
    items: [
      { title: 'Team members', path: '/settings/users', icon: UsersRound },
      { title: 'Transfer methods', path: '/settings/methods', icon: Landmark },
      { title: 'Customer sources', path: '/settings/sources', icon: SlidersHorizontal },
      { title: 'Receipt settings', path: '/settings/slips', icon: Image },
    ],
  },
  {
    label: 'PERSONAL',
    items: [
      { title: 'Settings', path: '/settings/preferences', icon: Settings2 },
      { title: 'My profile', path: '/profile', icon: UserRound },
      { title: 'Trash', path: '/trash', icon: Trash2 },
    ],
  },
]
export const allNavigation = navigation.flatMap((group) => group.items)
