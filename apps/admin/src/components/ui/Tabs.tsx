import { createContext, useContext } from 'react'
import * as RadixTabs from '@radix-ui/react-tabs'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'

type Variant = 'underline' | 'pills'

const VariantContext = createContext<Variant>('underline')

export const Tabs = RadixTabs.Root

interface TabsListProps extends RadixTabs.TabsListProps {
  variant?: Variant
}

export function TabsList({ variant = 'underline', className, ...props }: TabsListProps) {
  return (
    <VariantContext.Provider value={variant}>
      <RadixTabs.List
        className={cn(
          'flex items-center',
          variant === 'underline'
            ? 'gap-1 overflow-x-auto border-b border-gray-200 dark:border-gray-800'
            : 'w-fit gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800',
          className,
        )}
        {...props}
      />
    </VariantContext.Provider>
  )
}

interface TabsTriggerProps extends RadixTabs.TabsTriggerProps {
  icon?: LucideIcon
  badge?: number
}

export function TabsTrigger({ icon: Icon, badge, className, children, ...props }: TabsTriggerProps) {
  const variant = useContext(VariantContext)
  return (
    <RadixTabs.Trigger
      className={cn(
        'flex items-center gap-2 whitespace-nowrap text-sm font-medium transition-colors',
        variant === 'underline'
          ? cn(
              '-mb-px border-b-2 border-transparent px-3 py-2.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
              'data-[state=active]:border-primary-500 data-[state=active]:text-primary-600 dark:data-[state=active]:text-primary-400',
            )
          : cn(
              'rounded-lg px-3 py-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
              'data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm dark:data-[state=active]:bg-gray-900 dark:data-[state=active]:text-gray-100',
            ),
        className,
      )}
      {...props}
    >
      {Icon && <Icon className="h-4 w-4" />}
      {children}
      {badge != null && badge > 0 && (
        <span className="rounded-full bg-primary-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary-600 dark:text-primary-400">
          {badge}
        </span>
      )}
    </RadixTabs.Trigger>
  )
}

export function TabsContent({ className, ...props }: RadixTabs.TabsContentProps) {
  return <RadixTabs.Content className={cn('mt-5 outline-none', className)} {...props} />
}
