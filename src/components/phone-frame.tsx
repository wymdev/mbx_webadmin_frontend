import type { ReactNode } from 'react'
import BatteryFull from 'lucide-react/icons/battery-full'
import CheckCheck from 'lucide-react/icons/check-check'
import ChevronLeft from 'lucide-react/icons/chevron-left'
import Phone from 'lucide-react/icons/phone'
import Plus from 'lucide-react/icons/plus'
import Signal from 'lucide-react/icons/signal'
import Wifi from 'lucide-react/icons/wifi'
import { cn } from '@/lib/utils'

const clock = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' })

/**
 * A phone showing a chat, for previewing what the customer receives. Receipts reach customers as
 * pictures in Viber / Line / Messenger, so `children` is drawn as a sent picture at phone size.
 */
export function PhoneChatFrame({
  sender,
  avatarUrl,
  caption,
  children,
  className,
}: {
  sender: string
  avatarUrl?: string | null
  /** Short message under the picture. */
  caption?: string
  /** The picture (e.g. a receipt), laid out at its normal width and scaled down to fit. */
  children: ReactNode
  className?: string
}) {
  const time = clock.format(new Date())
  return (
    <div className={cn('mx-auto w-[19.5rem] max-w-full select-none', className)} role="group" aria-label="Phone preview">
      {/* Body and side buttons */}
      <div className="relative rounded-[3rem] bg-[#1b1d1c] p-[0.6rem] shadow-[0_30px_60px_-20px_rgb(0_0_0/0.45),inset_0_0_0_1.5px_#3a3d3b] dark:shadow-[0_30px_60px_-20px_rgb(0_0_0/0.8),inset_0_0_0_1.5px_#4a4d4b]">
        <span aria-hidden="true" className="absolute top-28 -left-[3px] h-10 w-[3px] rounded-l bg-[#2a2d2b]" />
        <span aria-hidden="true" className="absolute top-40 -left-[3px] h-14 w-[3px] rounded-l bg-[#2a2d2b]" />
        <span aria-hidden="true" className="absolute top-36 -right-[3px] h-20 w-[3px] rounded-r bg-[#2a2d2b]" />

        {/* Screen */}
        <div className="relative flex aspect-[9/19] flex-col overflow-hidden rounded-[2.45rem] bg-[#eae6df] text-[#111b21]">
          {/* Status bar + camera island */}
          <div className="relative flex h-11 shrink-0 items-center justify-between bg-white px-7 pt-1 text-[0.8rem] font-semibold">
            <span className="tabular-nums">{time}</span>
            <span aria-hidden="true" className="absolute top-2.5 left-1/2 h-6 w-24 -translate-x-1/2 rounded-full bg-black" />
            <span className="flex items-center gap-1" aria-hidden="true">
              <Signal className="size-3.5" strokeWidth={2.5} />
              <Wifi className="size-3.5" strokeWidth={2.5} />
              <BatteryFull className="size-4" strokeWidth={2} />
            </span>
          </div>

          {/* Chat header */}
          <div className="flex shrink-0 items-center gap-2 border-b border-black/5 bg-white px-2 pb-2">
            <ChevronLeft className="size-5 text-[#7360f2]" aria-hidden="true" />
            <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-[#0b2921]">
              {avatarUrl ? <img src={avatarUrl} alt="" className="size-full object-contain p-1" /> : <span className="text-xs font-bold text-white">{sender.slice(0, 1)}</span>}
            </span>
            <span className="grid min-w-0 flex-1 leading-tight">
              <span className="truncate text-sm font-semibold">{sender}</span>
              <span className="text-[0.68rem] text-[#667781]">online</span>
            </span>
            <Phone className="mr-1 size-4 text-[#7360f2]" aria-hidden="true" />
          </div>

          {/* Messages */}
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto bg-[radial-gradient(#d9d3c9_1px,transparent_1px)] bg-[length:14px_14px] px-3 py-3">
            <span className="mx-auto mt-auto rounded-md bg-white/80 px-2 py-0.5 text-[0.65rem] font-medium text-[#667781] shadow-xs">Today</span>
            <div className="max-w-[78%] self-start rounded-2xl rounded-tl-sm bg-white px-3 py-1.5 text-[0.78rem] shadow-xs">Hi, please send my receipt 🙏</div>
            <div className="max-w-[90%] self-end rounded-2xl rounded-tr-sm bg-[#e4dcfb] p-1 shadow-xs">
              {/* The receipt keeps its real layout and is shrunk like a sent picture. */}
              <div className="overflow-hidden rounded-xl [zoom:0.55]">{children}</div>
              {caption && <p className="px-2 pt-1.5 text-[0.78rem]">{caption}</p>}
              <p className="flex items-center justify-end gap-1 px-2 pb-0.5 text-[0.62rem] text-[#667781]">
                {time} <CheckCheck className="size-3 text-[#7360f2]" aria-hidden="true" />
              </p>
            </div>
          </div>

          {/* Input bar + home indicator */}
          <div className="shrink-0 bg-white px-3 pt-2 pb-5">
            <div className="flex items-center gap-2">
              <Plus className="size-5 text-[#7360f2]" aria-hidden="true" />
              <span className="flex-1 rounded-full border border-black/10 px-3 py-1.5 text-[0.75rem] text-[#8696a0]">Message</span>
            </div>
            <span aria-hidden="true" className="mx-auto mt-3 block h-1 w-28 rounded-full bg-black/80" />
          </div>
        </div>
      </div>
    </div>
  )
}
