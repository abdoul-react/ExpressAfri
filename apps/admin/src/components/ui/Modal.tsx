import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '../../lib/cn'

type Size = 'sm' | 'md' | 'lg' | 'xl'

const SIZES: Record<Size, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

export interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  size?: Size
  footer?: React.ReactNode
  children: React.ReactNode
}

export function Modal({ open, onOpenChange, title, description, size = 'md', footer, children }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-gray-950/40 backdrop-blur-[2px] animate-fade-in" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2',
            'max-h-[calc(100vh-4rem)] overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-dropdown',
            'animate-zoom-in dark:border-gray-800 dark:bg-gray-900',
            SIZES[size],
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-4 dark:border-gray-800">
            <div>
              <Dialog.Title className="text-base font-semibold text-gray-900 dark:text-gray-100">
                {title}
              </Dialog.Title>
              {description && (
                <Dialog.Description className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                  {description}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close
              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>
          <div className="px-6 py-5">{children}</div>
          {footer && (
            <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-6 py-4 dark:border-gray-800">
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
