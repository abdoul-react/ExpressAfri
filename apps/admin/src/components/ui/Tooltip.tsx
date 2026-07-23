import * as RadixTooltip from '@radix-ui/react-tooltip'

export const TooltipProvider = RadixTooltip.Provider

interface TooltipProps {
  content: React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  children: React.ReactNode
}

export function Tooltip({ content, side = 'top', children }: TooltipProps) {
  return (
    <RadixTooltip.Root>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={side}
          sideOffset={6}
          className="z-50 rounded-lg bg-gray-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-dropdown animate-fade-in dark:bg-gray-100 dark:text-gray-900"
        >
          {content}
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  )
}
