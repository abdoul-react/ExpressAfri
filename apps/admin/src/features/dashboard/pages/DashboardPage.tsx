import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Package,
  ShoppingBag,
  ShoppingCart,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react'
import { useAdminAuth } from '@/features/auth'
import { useAdminAnalytics, useStoreDashboard } from '@/features/analytics/hooks/useAdminAnalytics'
import type { AnalyticsChartDataPoint, AnalyticsTopItem, GeographicData } from '@/infrastructure/data-source/AdminAnalyticsDataSource'
import {
  AreaChartCard,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DonutChartCard,
  PageHeader,
  Skeleton,
  StatCard,
  StatusBadge,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui'
import { CHART_COLORS } from '@/lib/chart'
import { ORDER_STATUS } from '@/lib/status'
import { formatPrice, formatDate } from '@/lib/format'
import { WORLD_COUNTRIES } from '@/lib/countries'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCurrency(v: number): string {
  const n = Number(v)
  if (!isFinite(n)) return '0'
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + ' Md'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + ' M'
  if (n >= 1_000) return (n / 1_000).toFixed(0) + ' K'
  return n.toString()
}

function fmtNumber(v: number): string {
  const n = Number(v)
  if (!isFinite(n)) return '0'
  return new Intl.NumberFormat('fr-FR').format(n)
}

function fmtGrowth(g: number): string {
  return (g >= 0 ? '+' : '') + g.toFixed(1) + '%'
}

function toChartData(points: AnalyticsChartDataPoint[]): { label: string; value: number }[] {
  return points.map((d) => ({
    label: d.label ?? new Date(d.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
    value: d.value,
  }))
}

// ─── TopList ──────────────────────────────────────────────────────────────────

function TopList({
  title,
  items,
  loading,
  valueLabel = 'FCFA',
  showGrowth = true,
}: {
  title: string
  items: AnalyticsTopItem[]
  loading?: boolean
  valueLabel?: string
  showGrowth?: boolean
}) {
  const max = Math.max(...items.map((i) => i.value), 1)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-3 flex-1" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      ) : (
        <ol className="space-y-3">
          {items.slice(0, 6).map((item, i) => (
            <li key={item.id} className="flex items-center gap-3">
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-xs font-bold text-gray-400 dark:text-gray-500">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">{item.name}</p>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    {showGrowth && item.growth != null && (
                      <span className={`text-xs font-semibold ${item.growth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                        {fmtGrowth(item.growth)}
                      </span>
                    )}
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      {fmtCurrency(item.value)} {valueLabel}
                    </span>
                  </div>
                </div>
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                  <div
                    className="h-full rounded-full bg-primary-500 transition-all duration-700"
                    style={{ width: `${(item.value / max) * 100}%` }}
                  />
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  )
}

// ─── GeographicTable ──────────────────────────────────────────────────────────

function GeographicTable({
  data,
  loading,
}: {
  data: GeographicData[]
  loading?: boolean
}) {
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Répartition géographique</CardTitle>
      </CardHeader>
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Pays</th>
                <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Commandes</th>
                <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Revenus</th>
                <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Clients</th>
                <th className="pb-2 pl-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Part</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
              {data.map((row) => (
                <tr key={row.code} className="group">
                  <td className="py-2.5 font-medium text-gray-800 dark:text-gray-200">
                    <span className="mr-2 text-base">{getFlagEmoji(row.code)}</span>
                    {row.country}
                  </td>
                  <td className="py-2.5 text-right text-gray-600 dark:text-gray-400">{fmtNumber(row.orders)}</td>
                  <td className="py-2.5 text-right font-semibold text-gray-800 dark:text-gray-200">
                    {fmtCurrency(row.revenue)} FCFA
                  </td>
                  <td className="py-2.5 text-right text-gray-600 dark:text-gray-400">{fmtNumber(row.customers)}</td>
                  <td className="py-2.5 pl-4">
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                      <div
                        className="h-full rounded-full bg-primary-500 transition-all duration-700"
                        style={{ width: `${(row.revenue / maxRevenue) * 100}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

function getFlagEmoji(code: string): string {
  return WORLD_COUNTRIES.find((c) => c.code === code)?.flag ?? '🌍'
}

// ─── Sélecteur de période ─────────────────────────────────────────────────────

const PERIODS = [
  { value: 'today', label: "Auj." },
  { value: 'week',  label: '7 j' },
  { value: 'month', label: '30 j' },
  { value: 'quarter', label: '3 mois' },
  { value: 'year',  label: '12 mois' },
] as const

// ─── DashboardPage ────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { admin } = useAdminAuth()
  const navigate = useNavigate()
  const [period, setPeriod] = useState<string>('month')
  const isStoreManager = !!admin?.storeId
  const { data, isLoading, isError } = useAdminAnalytics(period, { enabled: !isStoreManager })
  const { data: storeData, isLoading: storeLoading } = useStoreDashboard(isStoreManager)

  if (isStoreManager) {
    const sd = storeData
    const revenueGrowth = sd?.revenue?.growth ?? 0
    return (
      <div className="space-y-6">
        <PageHeader
          title={`Bonjour${admin?.name ? `, ${admin.name}` : ''} 👋`}
          description="Tableau de bord de votre boutique"
          actions={
            <div className="flex gap-2">
              <Button leftIcon={Package} variant="outline" onClick={() => navigate('/products')}>
                Produits
              </Button>
              <Button leftIcon={ShoppingCart} onClick={() => navigate('/orders')}>
                Commandes
              </Button>
            </div>
          }
        />

        {/* KPIs boutique */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Revenus totaux"
            value={sd ? `${fmtCurrency(sd.revenue.total)} FCFA` : '—'}
            sub={sd ? `Ce mois : ${fmtCurrency(sd.revenue.month)} FCFA` : undefined}
            trend={sd ? { value: revenueGrowth } : undefined}
            icon={Wallet}
            tone="primary"
            loading={storeLoading}
          />
          <StatCard
            label="Commandes"
            value={sd ? fmtNumber(sd.orders.total) : '—'}
            sub={sd ? `${fmtNumber(sd.orders.pending)} en attente` : undefined}
            icon={ShoppingBag}
            tone="success"
            loading={storeLoading}
          />
          <StatCard
            label="Produits actifs"
            value={sd ? fmtNumber(sd.products.active) : '—'}
            icon={Package}
            tone="info"
            loading={storeLoading}
          />
          <StatCard
            label="Commandes en attente"
            value={sd ? fmtNumber(sd.orders.pending) : '—'}
            sub="À traiter en priorité"
            icon={ShoppingCart}
            tone="purple"
            loading={storeLoading}
          />
        </div>

        {/* Commandes récentes */}
        <Card>
          <CardHeader>
            <CardTitle>Commandes récentes</CardTitle>
          </CardHeader>
          <CardContent>
            {storeLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : !sd?.recentOrders?.length ? (
              <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">Aucune commande pour l'instant</p>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {sd.recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex cursor-pointer items-center justify-between py-3 hover:bg-gray-50 dark:hover:bg-gray-800/40 px-1 rounded"
                    onClick={() => navigate(`/orders/${order.id}`)}
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{order.reference ?? order.id.slice(0, 8)}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{formatDate(order.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge map={ORDER_STATUS} value={order.status} />
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {formatPrice(order.total)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Raccourcis */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Voir toutes les commandes', path: '/orders', icon: ShoppingCart },
            { label: 'Gérer les produits', path: '/products', icon: Package },
          ].map((link) => (
            <Button key={link.path} variant="outline" leftIcon={link.icon} rightIcon={ArrowRight}
              onClick={() => navigate(link.path)} className="w-full justify-between">
              <span className="flex-1 truncate text-left">{link.label}</span>
            </Button>
          ))}
        </div>
      </div>
    )
  }

  const s = data?.summary

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={
          <>
            Bienvenue{admin?.name ? `, ${admin.name}` : ''} — vue d'ensemble de l'activité de la plateforme
            {s && (
              <span className="ml-1 text-gray-400 dark:text-gray-500">
                · {new Date(s.periodStart).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                {' – '}
                {new Date(s.periodEnd).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            )}
          </>
        }
        actions={
          <Tabs value={period} onValueChange={setPeriod}>
            <TabsList variant="pills">
              {PERIODS.map(({ value, label }) => (
                <TabsTrigger key={value} value={value}>
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        }
      />

      {/* Erreur */}
      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          Erreur lors du chargement des analytics
        </div>
      )}

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Revenus"
          value={s ? fmtCurrency(s.revenue.total) + ' FCFA' : '—'}
          sub={s ? `Panier moy. ${fmtCurrency(s.averageOrderValue)} FCFA` : undefined}
          trend={s ? { value: s.revenue.growth } : undefined}
          icon={Wallet}
          tone="primary"
          loading={isLoading}
        />
        <StatCard
          label="Commandes"
          value={s ? fmtNumber(s.orders.total) : '—'}
          sub={s ? `${fmtNumber(s.stores.active)} boutiques actives` : undefined}
          trend={s ? { value: s.orders.growth } : undefined}
          icon={ShoppingBag}
          tone="success"
          loading={isLoading}
        />
        <StatCard
          label="Clients"
          value={s ? fmtNumber(s.customers.total) : '—'}
          sub={s ? `+${fmtNumber(s.customers.new)} nouveaux` : undefined}
          trend={s ? { value: s.customers.growth } : undefined}
          icon={Users}
          tone="info"
          loading={isLoading}
        />
        <StatCard
          label="Taux de conversion"
          value={s?.conversionRate != null ? Number(s.conversionRate).toFixed(1) + '%' : '—'}
          sub={s ? `${fmtNumber(s.products.sold)} produits vendus` : undefined}
          icon={TrendingUp}
          tone="purple"
          loading={isLoading}
        />
      </div>

      {/* Évolution revenus + commandes */}
      <div className="grid gap-4 md:grid-cols-2">
        {isLoading ? (
          <Card>
            <Skeleton className="mb-4 h-5 w-32" />
            <Skeleton className="h-[220px] w-full" />
          </Card>
        ) : (
          <AreaChartCard
            title={`Revenus (${PERIODS.find((p) => p.value === period)?.label ?? '30 j'})`}
            data={toChartData(data?.revenueChart ?? [])}
            color={CHART_COLORS.primary}
            height={220}
            valueFormatter={(v) => `${fmtCurrency(v)} FCFA`}
            headerRight={
              s && (
                <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">
                  {fmtCurrency(s.revenue.total)} FCFA
                </span>
              )
            }
          />
        )}
        {isLoading ? (
          <Card>
            <Skeleton className="mb-4 h-5 w-32" />
            <Skeleton className="h-[220px] w-full" />
          </Card>
        ) : (
          <AreaChartCard
            title={`Commandes (${PERIODS.find((p) => p.value === period)?.label ?? '30 j'})`}
            data={toChartData(data?.ordersChart ?? [])}
            color={CHART_COLORS.secondary}
            height={220}
            valueFormatter={(v) => `${fmtNumber(v)} commandes`}
            headerRight={
              s && (
                <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                  {fmtNumber(s.orders.total)} commandes
                </span>
              )
            }
          />
        )}
      </div>

      {/* Top produits + Top boutiques */}
      <div className="grid gap-4 lg:grid-cols-2">
        <TopList title="Top produits" items={data?.topProducts ?? []} loading={isLoading} />
        <TopList title="Top boutiques" items={data?.topStores ?? []} loading={isLoading} />
      </div>

      {/* Top catégories */}
      <div className="grid gap-4 lg:grid-cols-2">
        <TopList title="Top catégories" items={data?.topCategories ?? []} loading={isLoading} valueLabel="FCFA" />
        {isLoading ? (
          <Card>
            <Skeleton className="mb-4 h-5 w-32" />
            <Skeleton className="h-[220px] w-full" />
          </Card>
        ) : (
          <AreaChartCard
            title="Nouveaux clients"
            data={toChartData(data?.customerChart ?? [])}
            color={CHART_COLORS.secondary}
            height={220}
            valueFormatter={(v) => `${fmtNumber(v)} clients`}
            headerRight={
              data?.summary && (
                <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                  +{fmtNumber(data.summary.customers.new)} ce mois
                </span>
              )
            }
          />
        )}
      </div>

      {/* Revenus par paiement + Géo */}
      <div className="grid gap-4 lg:grid-cols-2">
        {isLoading ? (
          <Card>
            <Skeleton className="mb-4 h-5 w-40" />
            <Skeleton className="h-[240px] w-full" />
          </Card>
        ) : (
          <DonutChartCard
            title="Revenus par paiement"
            data={(data?.revenueByPayment ?? []).map((r) => ({ name: r.paymentMethod, value: r.amount }))}
            valueFormatter={(v) => `${fmtCurrency(v)} FCFA`}
          />
        )}
        <GeographicTable
          data={data?.geographicData ?? []}
          loading={isLoading}
        />
      </div>

      {/* Raccourcis rapides */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Gérer les commandes', path: '/orders', icon: ShoppingCart },
          { label: 'Voir les litiges',    path: '/disputes', icon: AlertTriangle },
          { label: 'Modérer produits',    path: '/products', icon: Package },
          { label: 'Analytiques détail',  path: '/analytics', icon: BarChart3 },
        ].map((link) => (
          <Button
            key={link.path}
            variant="outline"
            leftIcon={link.icon}
            rightIcon={ArrowRight}
            onClick={() => navigate(link.path)}
            className="w-full justify-between"
          >
            <span className="flex-1 truncate text-left">{link.label}</span>
          </Button>
        ))}
      </div>
    </div>
  )
}
