import { cn } from '../../lib/cn'

type Padding = 'none' | 'sm' | 'md'

const PADDINGS: Record<Padding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
}

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: Padding
}

export function Card({ padding = 'md', className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-gray-200 bg-white shadow-card dark:border-gray-800 dark:bg-gray-900',
        PADDINGS[padding],
        className,
      )}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mb-4 flex flex-wrap items-start justify-between gap-2', className)} {...props} />
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-base font-semibold text-gray-900 dark:text-gray-100', className)} {...props} />
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('mt-0.5 text-sm text-gray-500 dark:text-gray-400', className)} {...props} />
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(className)} {...props} />
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('mt-4 flex items-center justify-end gap-2 border-t border-gray-100 pt-4 dark:border-gray-800', className)}
      {...props}
    />
  )
}
