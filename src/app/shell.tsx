import { useEffect, useState, Suspense, type CSSProperties, type ReactElement } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import ChevronsUpDown from 'lucide-react/icons/chevrons-up-down'
import LogOut from 'lucide-react/icons/log-out'
import Menu from 'lucide-react/icons/menu'
import Maximize from 'lucide-react/icons/maximize'
import Minimize from 'lucide-react/icons/minimize'
import Moon from 'lucide-react/icons/moon'
import PanelLeft from 'lucide-react/icons/panel-left'
import ChevronDown from 'lucide-react/icons/chevron-down'
import Search from 'lucide-react/icons/search'
import Sun from 'lucide-react/icons/sun'
import UserRound from 'lucide-react/icons/user-round'
import Zap from 'lucide-react/icons/zap'
import Rows3 from 'lucide-react/icons/rows-3'
import { navigation, navItemFor, type NavItem } from './navigation'
import { CommandPalette } from './command-palette'
import { usePreferences } from '@/stores/preferences'
import { cn, initials } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useSignOut, useStaff } from '@/features/auth/session'
import { PageSkeleton } from '@/components/page-skeleton'
import { BangkokClock } from '@/components/bangkok-clock'
import { BrandLogo, BrandSymbol } from '@/components/brand-mark'

export function useThemeEffect() {
  const theme = usePreferences((state) => state.theme)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])
}

/** Ctrl/⌘ K opens search, Ctrl/⌘ B collapses the sidebar, F2 opens the deal desk from anywhere. */
function useGlobalShortcuts(openPalette: () => void, toggleSidebar: () => void) {
  const navigate = useNavigate()
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        openPalette()
      }
      if (event.key === 'F2') {
        event.preventDefault()
        navigate('/desk')
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'b') {
        event.preventDefault()
        toggleSidebar()
      }
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  }, [navigate, openPalette, toggleSidebar])
}

export function Shell() {
  const { collapsed, toggleSidebar } = usePreferences()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const location = useLocation()
  const current = navItemFor(location.pathname)
  useThemeEffect()
  useGlobalShortcuts(() => setPaletteOpen(true), toggleSidebar)

  return (
    <div
      className="min-h-dvh bg-surface lg:grid lg:grid-cols-[var(--sidebar-width)_minmax(0,1fr)] lg:transition-[grid-template-columns] lg:duration-200"
      style={{ '--sidebar-width': collapsed ? '4.75rem' : '17rem' } as CSSProperties}
    >
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <aside className="sticky top-0 hidden h-dvh lg:block" aria-label="Main navigation">
        <SidebarContent collapsed={collapsed} openSearch={() => setPaletteOpen(true)} />
      </aside>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 border-0 bg-[var(--sidebar)] p-0 text-white [&>button]:text-white">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          {/* Close the drawer when a link inside it is followed. */}
          <div className="h-full" onClickCapture={(event) => (event.target as HTMLElement).closest('a') && setMobileOpen(false)}>
            <SidebarContent
              collapsed={false}
              openSearch={() => {
                setMobileOpen(false)
                setPaletteOpen(true)
              }}
            />
          </div>
        </SheetContent>
      </Sheet>

      <div className="min-w-0 lg:py-2 lg:pr-2">
        <div className="flex min-h-dvh flex-col bg-background lg:min-h-[calc(100dvh-1rem)] lg:rounded-2xl lg:border lg:shadow-xs">
          {/* On large screens the card sits 0.5rem below the window edge; the ::before strip fills that gap
              in the page colour so rows scrolling up never show above the bar. */}
          <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b bg-background px-3 sm:px-5 lg:top-2 lg:rounded-t-2xl lg:px-6 lg:before:pointer-events-none lg:before:absolute lg:before:inset-x-[-1px] lg:before:-top-[calc(0.5rem+1px)] lg:before:h-[calc(0.5rem+1px)] lg:before:bg-surface">            <Button variant="ghost" size="icon-sm" className="lg:hidden" aria-label="Open navigation" onClick={() => setMobileOpen(true)}>
              <Menu />
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="hidden lg:inline-flex"
                  aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                  onClick={toggleSidebar}
                >
                  <PanelLeft />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{collapsed ? 'Expand sidebar' : 'Collapse sidebar'} (Ctrl B)</TooltipContent>
            </Tooltip>
            <div className="ml-1 flex min-w-0 items-center gap-2 rounded-lg px-2 py-1 text-sm">
              <span className="size-2.5 shrink-0 rounded-full bg-[var(--gold)] ring-4 ring-[var(--gold)]/15" aria-hidden="true" />
              <span className="truncate font-semibold">Mergui Boss</span>
              <span className="hidden text-muted-foreground sm:inline">/</span>
              <span className="hidden truncate text-muted-foreground sm:inline">{current?.title ?? 'Workspace'}</span>
            </div>

            <div className="ml-auto flex items-center gap-1">
              <BangkokClock className="hidden px-3 text-sm text-muted-foreground tabular-nums md:block" />
              <Button variant="ghost" size="icon-sm" className="sm:hidden" aria-label="Search" onClick={() => setPaletteOpen(true)}>
                <Search />
              </Button>
              <FullscreenButton />
              <ThemeButton />
              <span className="mx-2 hidden h-6 w-px bg-border sm:block" aria-hidden="true" />
              <AccountMenu />
            </div>
          </header>

          <main id="main" className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <Suspense fallback={<PageSkeleton />}>
              <Outlet />
            </Suspense>
          </main>
        </div>
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  )
}

function SidebarContent({
  collapsed,
  openSearch,
}: {
  collapsed: boolean
  openSearch: () => void
}) {
  const staff = useStaff()
  const { folded, toggleGroup } = usePreferences()
  const visible = (item: NavItem) => !item.requires || staff.permissions[item.requires]
  return (
    <div className="flex h-full flex-col bg-[var(--sidebar)] text-[#d7e6dc]">
      <div className={cn('flex h-16 shrink-0 items-center px-5', collapsed && 'justify-center px-0')}>
        {collapsed ? <BrandSymbol className="h-8" /> : <BrandLogo className="h-10" />}
      </div>

      <div className={cn('grid gap-2 px-4 pb-3', collapsed && 'px-3')}>
        <SidebarTooltip label="Search (Ctrl K)" show={collapsed}>
          <button
            type="button"
            onClick={openSearch}
            className={cn(
              'flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.05] px-3 text-sm text-[#a9c6b5] transition-colors hover:bg-white/[0.08] hover:text-white',
              collapsed && 'justify-center px-0',
            )}
          >
            <Search className="size-4" aria-hidden="true" />
            {collapsed ? (
              <span className="sr-only">Search</span>
            ) : (
              <>
                Search…
                <kbd className="ml-auto border-white/15 bg-white/[0.06] text-[#a9c6b5]">Ctrl K</kbd>
              </>
            )}
          </button>
        </SidebarTooltip>
        <SidebarTooltip label="New deal (F2)" show={collapsed}>
          <NavLink
            to="/desk"
            className={cn(
              'flex h-10 items-center gap-2 rounded-lg bg-[var(--gold)] px-3 text-sm font-bold text-[#17311f] shadow-[0_6px_20px_-8px_#fdb600] transition hover:brightness-105 active:scale-[0.98]',
              collapsed && 'justify-center px-0',
            )}
          >
            <Zap className="size-4" aria-hidden="true" />
            {collapsed ? (
              <span className="sr-only">New deal</span>
            ) : (
              <>
                New deal
                <kbd className="ml-auto border-[#17311f]/20 bg-white/30 text-[10px] text-[#17311f]">F2</kbd>
              </>
            )}
          </NavLink>
        </SidebarTooltip>
      </div>

      <nav
        className="flex-1 overflow-y-auto px-3 pb-4 [scrollbar-color:#ffffff20_transparent] [scrollbar-width:thin]"
        aria-label="Pages"
      >
        {navigation.map((group) => {
          const items = group.items.filter(visible)
          if (!items.length) return null
          return (
            <div key={group.label} className="mb-3">
              {collapsed ? (
                <div className="mx-auto mb-2 h-px w-6 bg-white/10" aria-hidden="true" />
              ) : (
                <button
                  type="button"
                  onClick={() => toggleGroup(group.label)}
                  aria-expanded={!folded.includes(group.label)}
                  className="flex w-full items-center justify-between rounded-md px-3 py-1 text-[11px] font-semibold tracking-[0.08em] text-[#6f9581] uppercase transition-colors hover:text-[#a9c6b5]"
                >
                  {group.label}
                  <ChevronDown
                    className={cn('size-3.5 transition-transform', folded.includes(group.label) && '-rotate-90')}
                    aria-hidden="true"
                  />
                </button>
              )}
              <ul className={cn('grid gap-0.5', !collapsed && folded.includes(group.label) && 'hidden')}>
                {items.map((item) => (
                  <li key={item.path}>
                    <SidebarTooltip label={item.title} show={collapsed}>
                      <NavLink
                        to={item.path}
                        end={item.path === '/'}
                        className={({ isActive }) =>
                          cn(
                            'group flex h-9 items-center gap-3 rounded-lg px-3 text-[14px] text-[#b9d0c3] transition-colors hover:bg-white/[0.06] hover:text-white',
                            collapsed && 'justify-center px-0',
                            isActive && 'bg-white/[0.1] font-semibold text-white shadow-[inset_0_0_0_1px_#ffffff10]',
                          )
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <item.icon
                              className={cn('size-[18px] shrink-0', isActive ? 'text-[var(--gold)]' : 'opacity-80 group-hover:opacity-100')}
                              aria-hidden="true"
                            />
                            {collapsed ? <span className="sr-only">{item.title}</span> : item.title}
                          </>
                        )}
                      </NavLink>
                    </SidebarTooltip>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </nav>

      <div className={cn('border-t border-white/10 p-3', collapsed && 'px-2')}>
        <AccountMenu card collapsed={collapsed} />
      </div>
    </div>
  )
}

function SidebarTooltip({ label, show, children }: { label: string; show: boolean; children: ReactElement }) {
  if (!show) return children
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  )
}

/** Full screen for the whole workspace (hides the browser bar and tabs). Esc also leaves it. */
function FullscreenButton() {
  const [on, setOn] = useState(() => typeof document !== 'undefined' && !!document.fullscreenElement)
  useEffect(() => {
    const sync = () => setOn(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [])
  if (typeof document === 'undefined' || !document.fullscreenEnabled) return null
  const toggle = () => {
    const done = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()
    done.catch(() => toast.error('Full screen is not available in this browser.'))
  }
  const label = on ? 'Exit full screen' : 'Full screen'
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon-sm" onClick={toggle} aria-label={label} aria-pressed={on} className="hidden sm:inline-flex">
          {on ? <Minimize /> : <Maximize />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{on ? 'Exit full screen (Esc)' : 'Full screen'}</TooltipContent>
    </Tooltip>
  )
}

function ThemeButton() {
  const { theme, toggleTheme } = usePreferences()
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon-sm" onClick={toggleTheme} aria-label="Toggle dark mode">
          {theme === 'light' ? <Moon /> : <Sun />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{theme === 'light' ? 'Dark mode' : 'Light mode'}</TooltipContent>
    </Tooltip>
  )
}

function Avatar({ name, photo, size = 'size-9' }: { name: string; photo?: string | null; size?: string }) {
  return photo && !photo.endsWith('user2.png') ? (
    <img src={photo} alt="" className={cn(size, 'shrink-0 rounded-full object-cover ring-2 ring-background')} />
  ) : (
    <span className={cn(size, 'grid shrink-0 place-items-center rounded-full bg-secondary text-xs font-extrabold text-primary ring-2 ring-background')}>
      {initials(name)}
    </span>
  )
}

function AccountMenu({ card = false, collapsed = false }: { card?: boolean; collapsed?: boolean }) {
  const { user } = useStaff()
  const signOut = useSignOut()
  const navigate = useNavigate()
  const { density, setDensity } = usePreferences()
  const role = user.roles?.map((r) => r.name).join(', ') || 'Staff'
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'flex items-center gap-3 rounded-full text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
          card && 'w-full rounded-xl border border-white/10 bg-white/[0.05] p-2.5 hover:bg-white/[0.08]',
          card && collapsed && 'justify-center p-1.5',
        )}
        aria-label="Account menu"
      >
        <Avatar name={user.name} photo={user.photo_url} />
        {card && !collapsed && (
          <>
            <span className="min-w-0 flex-1">
              <strong className="block truncate text-sm font-semibold text-white">{user.name}</strong>
              <small className="block truncate text-xs text-[#8fb19e] capitalize">{role}</small>
            </span>
            <ChevronsUpDown className="size-4 text-[#8fb19e]" aria-hidden="true" />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={card ? 'start' : 'end'} side={card ? 'top' : 'bottom'} className="w-60">
        <DropdownMenuLabel className="flex items-center gap-3">
          <Avatar name={user.name} photo={user.photo_url} size="size-8" />
          <span className="min-w-0">
            <span className="block truncate">{user.name}</span>
            <span className="block truncate text-xs font-normal text-muted-foreground">{user.email}</span>
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate('/profile')}>
          <UserRound /> My profile
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setDensity(density === 'compact' ? 'comfortable' : 'compact')}>
          <Rows3 /> {density === 'compact' ? 'Comfortable rows' : 'Compact rows'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={signOut.isPending} onSelect={() => signOut.mutate()} className="text-destructive focus:text-destructive">
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
