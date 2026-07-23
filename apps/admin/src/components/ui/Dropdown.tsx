import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'

export const Dropdown = DropdownMenu.Root
export const DropdownTrigger = DropdownMenu.Trigger

export function DropdownContent({
  className,
  sideOffset = 6,
  align = 'end',
  ...props
}: DropdownMenu.DropdownMenuContentProps) {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        sideOffset={sideOffset}
        align={align}
        className={cn(
          'z-50 min-w-[190px] overflow-hidden rounded-xl border border-gray-200 bg-white p-1.5 shadow-dropdown',
          'animate-slide-up-fade dark:border-gray-800 dark:bg-gray-900',
          className,
        )}
        {...props}
      />
    </DropdownMenu.Portal>
  )
}

interface DropdownItemProps extends DropdownMenu.DropdownMenuItemProps {
  icon?: LucideIcon
  danger?: boolean
}

export function DropdownItem({ icon: Icon, danger, className, children, ...props }: DropdownItemProps) {
  return (
    <DropdownMenu.Item
      className={cn(
        'flex cursor-pointer select-none items-center gap-2.5 rounded-lg px-3 py-2 text-sm outline-none transition-colors',
        danger
          ? 'text-red-600 data-[highlighted]:bg-red-50 dark:text-red-400 dark:data-[highlighted]:bg-red-500/10'
          : 'text-gray-700 data-[highlighted]:bg-gray-100 dark:text-gray-200 dark:data-[highlighted]:bg-gray-800',
        className,
      )}
      {...props}
    >
      {Icon && <Icon className="h-4 w-4 flex-shrink-0 opacity-70" />}
      {children}
    </DropdownMenu.Item>
  )
}

export function DropdownSeparator({ className, ...props }: DropdownMenu.DropdownMenuSeparatorProps) {
  return (
    <DropdownMenu.Separator className={cn('my-1.5 h-px bg-gray-100 dark:bg-gray-800', className)} {...props} />
  )
}

export function DropdownLabel({ className, ...props }: DropdownMenu.DropdownMenuLabelProps) {
  return (
    <DropdownMenu.Label
      className={cn('px-3 py-1.5 text-xs font-medium text-gray-400 dark:text-gray-500', className)}
      {...props}
    />
  )
}
