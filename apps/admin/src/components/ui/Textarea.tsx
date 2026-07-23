import { forwardRef } from 'react'
import { cn } from '../../lib/cn'
import { INPUT_BASE_CLS } from './Input'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, rows = 3, ...props }, ref) => {
    return <textarea ref={ref} rows={rows} className={cn(INPUT_BASE_CLS, 'px-4 py-2.5', className)} {...props} />
  },
)
Textarea.displayName = 'Textarea'
