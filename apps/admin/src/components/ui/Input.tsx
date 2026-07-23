import { forwardRef } from 'react'
import { cn } from '../../lib/cn'

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: 'sm' | 'md'
}

export const INPUT_BASE_CLS =
  'rounded-lg border border-gray-300 bg-white text-sm text-gray-900 shadow-sm placeholder-gray-400 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/25 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500 disabled:opacity-50 disabled:cursor-not-allowed'

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ size = 'md', className = '', ...props }, ref) => {
    const sizeCls = size === 'sm' ? 'px-3 py-2' : 'px-4 py-2.5'
    return <input ref={ref} className={cn(INPUT_BASE_CLS, sizeCls, className)} {...props} />
  },
)
Input.displayName = 'Input'
