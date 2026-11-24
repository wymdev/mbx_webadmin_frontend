import { useEffect, useState, Suspense, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import ArrowUpRight from 'lucide-react/icons/arrow-up-right'
import Bell from 'lucide-react/icons/bell'
import Check from 'lucide-react/icons/check'
import ChevronDown from 'lucide-react/icons/chevron-down'
import ChevronRight from 'lucide-react/icons/chevron-right'
import CommandIcon from 'lucide-react/icons/command'
import HelpCircle from 'lucide-react/icons/circle-question-mark'
import LogOut from 'lucide-react/icons/log-out'
import Menu from 'lucide-react/icons/menu'
import Moon from 'lucide-react/icons/moon'
import PanelLeftClose from 'lucide-react/icons/panel-left-close'
import PanelLeftOpen from 'lucide-react/icons/panel-left-open'
import Search from 'lucide-react/icons/search'
import Settings2 from 'lucide-react/icons/settings-2'
import ShieldCheck from 'lucide-react/icons/shield-check'
import Sun from 'lucide-react/icons/sun'
import UserRound from 'lucide-react/icons/user-round'
import X from 'lucide-react/icons/x'
import { navigation, allNavigation } from './navigation'
import { usePreferences } from '@/stores/preferences'
import { cn, initials } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { toast } from 'sonner'

export function Shell({ children, account, livePaths, signOut, signingOut }: {
  children?: ReactNode
  account?: { name: string; email: string }
  livePaths?: readonly string[]
  signOut?: () => void
  signingOut?: boolean
}) {
  const name = account?.name ?? 'Alex Lee'
  const visible = (path: string) => livePaths ? livePaths.includes(path) : path !== '/audit'
  const { collapsed, toggleSidebar, theme, toggleTheme } = usePreferences()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width:760px)').matches)
  const [searchOpen, setSearchOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [read, setRead] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const page =
    allNavigation.find((item) => item.path === location.pathname)?.title ||
    (location.pathname.includes('new') ? 'New transaction' : 'Workspace')
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])
  useEffect(() => {
    const media = window.matchMedia('(max-width:760px)')
    const update = () => setIsMobile(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  useEffect(() => {
    if (!mobileOpen || !isMobile) return
    const previous = document.activeElement as HTMLElement | null
    const sidebar = document.querySelector<HTMLElement>('.sidebar')
    const focusable = () =>
      Array.from(sidebar?.querySelectorAll<HTMLElement>('a[href],button') || []).filter(
        (el) => el.getClientRects().length > 0,
      )
    focusable()[0]?.focus()
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const items = focusable()
      const first = items[0]
      const last = items.at(-1)
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', trap)
    return () => {
      document.body.style.overflow = overflow
      document.removeEventListener('keydown', trap)
      previous?.focus()
    }
  }, [mobileOpen, isMobile])
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen((v) => !v)
      }
      if (event.key === 'Escape') setMobileOpen(false)
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  }, [])
  function go(path: string) {
    navigate(path)
    setSearchOpen(false)
    setMobileOpen(false)
  }
  return (
    <div className={cn('app-layout', collapsed && 'sidebar-collapsed')}>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      {mobileOpen && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={cn('sidebar', mobileOpen && 'is-open')}
        aria-label="Main navigation"
        inert={isMobile && !mobileOpen}
        role={isMobile && mobileOpen ? 'dialog' : undefined}
        aria-modal={isMobile && mobileOpen ? true : undefined}
      >
        <div className="brand-row">
          <NavLink to="/" className="brand">
            <span className="brand-symbol">
              m<span>↗</span>
            </span>
            <span className="sidebar-copy">
              <strong>
                MBX<span className="font-normal opacity-50"> / </span>Ledger
              </strong>
              <small>Money moves. Made simple.</small>
            </span>
          </NavLink>
          <button
            className="mobile-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger className="workspace-selector">
            <span className="workspace-avatar">MB</span>
            <span className="sidebar-copy flex-1 text-left">
              <strong>Mergui Boss</strong>
              <small>Operations workspace</small>
            </span>
            <ChevronDown className="sidebar-copy size-4 opacity-50" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
            <DropdownMenuItem>
              <span className="workspace-avatar mr-2">MB</span>
              <div>
                <strong>Mergui Boss</strong>
                <p className="text-xs text-muted-foreground">{account ? 'Operations workspace' : 'Demo operations workspace'}</p>
              </div>
              <Check className="ml-auto" />
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() =>
                toast.info('Additional workspaces will be available after backend integration.')
              }
            >
              <Settings2 /> Manage workspace
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <nav className="sidebar-nav">
          {navigation.map((group) => (
            <div key={group.label} className="nav-group">
              <div className="nav-group-label sidebar-copy">{group.label}</div>
              {group.items.filter((item) => visible(item.path)).map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end
                  title={collapsed ? item.title : undefined}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) => cn('sidebar-link', isActive && 'active')}
                >
                  <item.icon size={18} />
                  <span className="sidebar-copy flex-1">{item.title}</span>
                  {item.path === '/transactions' && (
                    <span className="sidebar-copy nav-pill">Ledger</span>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <DropdownMenu>
            <DropdownMenuTrigger className="sidebar-account">
              <span className="account-avatar">{initials(name)}</span>
              <span className="sidebar-copy flex-1 text-left">
                <strong>{name}</strong>
                <small>{account ? 'Staff account' : 'Workspace administrator'}</small>
              </span>
              <ChevronDown className="sidebar-copy size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-60">
              <DropdownMenuLabel>{account ? 'Staff account' : 'Demo administrator'}</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => go('/profile')}>
                <UserRound /> My profile
              </DropdownMenuItem>
              {visible('/settings/preferences') && <DropdownMenuItem onSelect={() => go('/settings/preferences')}>
                <Settings2 /> Preferences
              </DropdownMenuItem>}
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled={signingOut}
                onSelect={() =>
                  signOut ? signOut() : toast.info(
                    'Demo mode has no live account session. Refresh to reset demo changes.',
                  )
                }
              >
                <LogOut /> {account ? 'Sign out' : 'About demo session'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
      <div className="workspace-main" inert={isMobile && mobileOpen}>
        <header className="topbar">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="desktop-toggle"
              onClick={toggleSidebar}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="mobile-toggle"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <Menu />
            </Button>
            <span className="text-muted-foreground hidden sm:inline">Workspace</span>
            <ChevronRight size={14} className="text-muted-foreground hidden sm:block" />
            <span className="truncate font-medium">{page}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              aria-label="Search workspace"
              className="global-search"
              onClick={() => setSearchOpen(true)}
            >
              <Search size={15} />
              <span>Search anything…</span>
              <kbd>
                <CommandIcon size={11} /> K
              </kbd>
            </button>
            <Badge variant="outline" className="demo-badge">
              <span className={cn('size-1.5 rounded-full', account ? 'bg-primary' : 'bg-amber-500')} /> {account ? 'Live' : 'Demo'}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {theme === 'light' ? <Moon /> : <Sun />}
            </Button>
            {!account && <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
                  <Bell />
                  {!read && <span className="notification-dot" />}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80">
                <div className="flex justify-between items-center mb-4">
                  <strong>Notifications</strong>
                  <button className="text-xs text-primary" onClick={() => setRead(true)}>
                    Mark all read
                  </button>
                </div>
                <div className="flex gap-3 rounded-lg bg-muted p-3">
                  <ShieldCheck className="shrink-0 text-primary" size={20} />
                  <div>
                    <p className="font-medium text-sm">Your demo workspace is ready</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Explore freely. All records are fictional and changes last for this session.
                    </p>
                  </div>
                </div>
              </PopoverContent>
            </Popover>}
            <span className="topbar-divider" />
            <DropdownMenu>
              <DropdownMenuTrigger
                className="account-avatar topbar-avatar"
                aria-label="Account menu"
              >
                {initials(name)}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  {name}
                  <p className="text-xs text-muted-foreground font-normal mt-1">
                    {account?.email ?? 'alex@example.test'}
                  </p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => go('/profile')}>
                  <UserRound />
                  Profile
                </DropdownMenuItem>
                {visible('/settings/preferences') && <DropdownMenuItem onSelect={() => go('/settings/preferences')}>
                  <Settings2 />
                  Preferences
                </DropdownMenuItem>}
                <DropdownMenuItem onSelect={() => setHelpOpen(true)}>
                  <HelpCircle />
                  Workspace guide
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main id="main" className="main-content">
          <Suspense
            fallback={
              <div className="space-y-4" aria-label="Loading page">
                <div className="h-20 rounded-xl bg-muted animate-pulse" />
                <div className="h-64 rounded-xl bg-muted animate-pulse" />
              </div>
            }
          >
            {children ?? <Outlet />}
          </Suspense>
        </main>
        <footer className="workspace-footer">
          <span>© {new Date().getFullYear()} Mergui Boss · MBX Ledger</span>
          <span className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-primary" />
            {account ? 'Live workspace' : 'Demo workspace / All amounts are sample data'}
          </span>
        </footer>
      </div>
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="p-0 gap-0 overflow-hidden sm:max-w-lg" showCloseButton={false}>
          <DialogHeader className="sr-only">
            <DialogTitle>Search workspace</DialogTitle>
            <DialogDescription>Navigate to a page or create a transaction.</DialogDescription>
          </DialogHeader>
          <Command>
            <CommandInput placeholder="Search pages and actions…" />
            <CommandList>
              <CommandEmpty>No matching pages found.</CommandEmpty>
              <CommandGroup heading="Quick actions">
                <CommandItem onSelect={() => go('/transactions/new')}>
                  <ArrowUpRight />
                  Create transaction
                </CommandItem>
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Pages">
                {allNavigation.filter((item) => visible(item.path)).map((item) => (
                  <CommandItem key={item.path} onSelect={() => go(item.path)}>
                    <item.icon />
                    {item.title}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
          <div className="flex justify-between border-t p-3 text-xs text-muted-foreground">
            <span>↑ ↓ to navigate · Enter to open</span>
            <span>Esc to close</span>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>A home for your daily operations</DialogTitle>
            <DialogDescription>
              {account ? 'MBX Ledger operations workspace' : 'This is an interactive MBX admin template using fictional demo data.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <p>
              Use Transactions to create an exchange and preview its receipt. Filter the ledger,
              explore Reports, and update exchange rates.
            </p>
            <p>
              Press <kbd>Ctrl / ⌘ K</kbd> to jump to a page. Your theme, sidebar and density
              preferences are saved on this browser.
            </p>
            {!account && <p className="text-muted-foreground">
              Records and form changes are kept in memory and reset on refresh. No production
              backend is connected.
            </p>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
