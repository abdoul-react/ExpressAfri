import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { AlertTriangle, HelpCircle } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Button } from './Button'

export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'default'
  onConfirm: () => void | Promise<void>
}

/** Remplaçant premium de window.confirm() — gère un état de chargement pendant onConfirm. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  variant = 'default',
  onConfirm,
}: ConfirmDialogProps) {
  const [pending, setPending] = useState(false)

  async function handleConfirm() {
    try {
      setPending(true)
      await onConfirm()
      onOpenChange(false)
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={pending ? undefined : onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-gray-950/40 backdrop-blur-[2px] animate-fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-gray-200 bg-white p-6 shadow-dropdown animate-zoom-in dark:border-gray-800 dark:bg-gray-900">
          <div className="flex gap-4">
            <div
              className={cn(
                'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full',
                variant === 'danger'
                  ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'
                  : 'bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400',
              )}
            >
              {variant === 'danger' ? <AlertTriangle className="h-5 w-5" /> : <HelpCircle className="h-5 w-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <Dialog.Title className="text-base font-semibold text-gray-900 dark:text-gray-100">
                {title}
              </Dialog.Title>
              {description && (
                <Dialog.Description className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {description}
                </Dialog.Description>
              )}
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              {cancelLabel}
            </Button>
            <Button variant={variant === 'danger' ? 'danger' : 'primary'} onClick={handleConfirm} loading={pending}>
              {confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
