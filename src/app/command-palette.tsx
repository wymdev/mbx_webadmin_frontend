import { useNavigate } from 'react-router-dom'
import LogOut from 'lucide-react/icons/log-out'
import Moon from 'lucide-react/icons/moon'
import Zap from 'lucide-react/icons/zap'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command'
import { navigation, accountNavigation } from './navigation'
import { useSignOut, useStaff } from '@/features/auth/session'
import { usePreferences } from '@/stores/preferences'

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate()
  const staff = useStaff()
  const toggleTheme = usePreferences((state) => state.toggleTheme)
  const signOut = useSignOut()
  const run = (action: () => void) => {
    onOpenChange(false)
    action()
  }
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Search" description="Jump to a page or run an action">
      <CommandInput placeholder="Type a page or action…" />
      <CommandList>
        <CommandEmpty>Nothing matches.</CommandEmpty>
        <CommandGroup heading="Actions">
          <CommandItem value="new deal pos desk buy sell" onSelect={() => run(() => navigate('/desk'))}>
            <Zap /> New deal <CommandShortcut>F2</CommandShortcut>
          </CommandItem>
          <CommandItem value="toggle dark light theme" onSelect={() => run(toggleTheme)}>
            <Moon /> Toggle dark mode
          </CommandItem>
          <CommandItem value="sign out logout" onSelect={() => run(() => signOut.mutate())}>
            <LogOut /> Sign out
          </CommandItem>
        </CommandGroup>
        {[...navigation, { label: 'Account', items: accountNavigation }].map((group) => {
          const items = group.items.filter((item) => !item.requires || staff.permissions[item.requires])
          if (!items.length) return null
          return (
            <div key={group.label}>
              <CommandSeparator />
              <CommandGroup heading={group.label}>
                {items.map((item) => (
                  <CommandItem
                    key={item.path}
                    value={`${item.title} ${item.keywords ?? ''}`}
                    onSelect={() => run(() => navigate(item.path))}
                  >
                    <item.icon /> {item.title}
                  </CommandItem>
                ))}
              </CommandGroup>
            </div>
          )
        })}
      </CommandList>
    </CommandDialog>
  )
}
