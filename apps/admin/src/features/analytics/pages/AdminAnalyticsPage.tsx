import { useState } from 'react'
import {
  CreditCard,
  Package,
  Percent,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  Store,
  TrendingUp,
  Users,
  XCircle,
} from 'lucide-react'
import { useAdminAnalytics, useFunnelData, useCohortData, useAbandonedCartData } from '../hooks/useAdminAnalytics'
import {
  AreaChartCard,
  BarChartCard,
  Button,
  Card,
  CardHeader,
  CardTitle,
  DonutChartCard,
  LoadingBlock,
  PageHeader,
  Select,
  StatCard,
} from '@/components/ui'
import { CHART_COLORS } from '@/lib/chart'
import { formatPrice } from '@/lib/format'
function formatNum(n: number) { return n.toLocaleString('fr-FR') }
function pct(n: number) { return (n >= 0 ? '+' : '') + n.toFixed(1) + '%' }

const PERIODS = [
  { value: 'today', label: "Aujourd'hui" },
  { value: 'week', label: '7 jours' },
  { value: 'month', label: '30 jours' },
  { value: 'quarter', label: 'Ce trimestre' },
  { value: 'year', label: 'Cette année' },
]

function toChartData(points: { value: number; label?: string; date?: string }[]): { label: string; value: number }[] {
  return points.map((d, i) => ({
    label: d.label ?? (d.date ? new Date(d.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : String(i + 1)),
    value: d.value,
  }))
}

export function AdminAnalyticsPage() {
  const [period, setPeriod] = useState('month')
  const [advanced, setAdvanced] = useState(false)
  const { data, isLoading } = useAdminAnalytics(period)
  const { data: funnel } = useFunnelData()
  const { data: cohorts } = useCohortData()
  const { data: abandoned } = useAbandonedCartData()

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Indicateurs de performance de la plateforme"
        actions={
          <>
            <Button
              variant={advanced ? 'primary' : 'outline'}
              size="sm"
              leftIcon={SlidersHorizontal}
              onClick={() => setAdvanced(!advanced)}
            >
              Avancé
            </Button>
            {!advanced && (
              <Select
                size="sm"
                value={period}
                onChange={setPeriod}
                options={PERIODS}
              />
            )}
          </>
        }
      />

      {advanced ? (
        <div className="space-y-6">
          {/* Entonnoir de conversion */}
          <Card>
            <CardHeader>
              <CardTitle>Entonnoir de conversion</CardTitle>
            </CardHeader>
            {funnel && (
              <div className="space-y-3">
                {funnel.map((step, i) => (
                  <div key={step.step}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-medium text-gray-700 dark:text-gray-300">{step.step}</span>
                      <span className="text-gray-500 dark:text-gray-400">{step.count.toLocaleString('fr-FR')} ({step.percentage.toFixed(1)}%)</span>
                    </div>
                    <div className="h-5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${i === 0 ? 'bg-blue-500' : i === funnel.length - 1 ? 'bg-green-500' : 'bg-primary-500'}`}
                        style={{ width: `${step.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Abandon de panier */}
          {abandoned && (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <StatCard
                  label="Paniers créés"
                  value={abandoned.reduce((s, d) => s + d.cartCount, 0).toLocaleString('fr-FR')}
                  sub="30 derniers jours"
                  icon={ShoppingCart}
                  tone="info"
                />
                <StatCard
                  label="Abandonnés"
                  value={abandoned.reduce((s, d) => s + d.abandonedCount, 0).toLocaleString('fr-FR')}
                  sub="30 derniers jours"
                  icon={XCircle}
                  tone="warning"
                />
                <StatCard
                  label="Taux moyen"
                  value={`${(abandoned.reduce((s, d) => s + d.rate, 0) / abandoned.length).toFixed(1)}%`}
                  sub="30 derniers jours"
                  icon={Percent}
                  tone="neutral"
                />
              </div>
              <BarChartCard
                title="Abandon de panier (30 jours)"
                description="Taux d'abandon quotidien"
                data={abandoned.map((d) => ({ value: d.rate, label: new Date(d.date).toLocaleDateString('fr-FR') }))}
                color={CHART_COLORS.red}
                height={200}
                valueFormatter={(v) => `${v.toFixed(1)}%`}
              />
            </>
          )}

          {/* Rétention par cohorte */}
          <Card>
            <CardHeader>
              <CardTitle>Rétention par cohorte</CardTitle>
            </CardHeader>
            {cohorts && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      <th className="pb-2 pr-4 font-medium">Cohorte</th>
                      <th className="pb-2 pr-3 font-medium">Taille</th>
                      {cohorts[0]?.periods.map((p) => (
                        <th key={p.period} className="px-2 pb-2 text-center font-medium">{p.period}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {cohorts.map((row) => (
                      <tr key={row.cohort} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                        <td className="py-2 pr-4 font-medium text-gray-900 dark:text-gray-100">{row.cohort}</td>
                        <td className="py-2 pr-3 text-gray-500 dark:text-gray-400">{row.size}</td>
                        {row.periods.map((p) => (
                          <td
                            key={p.period}
                            className={`rounded px-2 py-2 text-center font-medium ${p.retention >= 80 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : p.retention >= 50 ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-500' : p.retention >= 30 ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400' : 'bg-red-50 text-red-500 dark:bg-red-900/10 dark:text-red-400'}`}
                          >
                            {p.retention}%
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      ) : isLoading ? (
        <LoadingBlock label="Chargement..." />
      ) : data && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Revenu total"
              value={formatPrice(data.summary.revenue.total)}
              trend={{ value: data.summary.revenue.growth, label: 'vs période précédente' }}
              icon={CreditCard}
              tone="primary"
            />
            <StatCard
              label="Commandes"
              value={formatNum(data.summary.orders.total)}
              trend={{ value: data.summary.orders.growth, label: 'vs période précédente' }}
              icon={ShoppingBag}
              tone="success"
            />
            <StatCard
              label="Clients"
              value={formatNum(data.summary.customers.total)}
              trend={{ value: data.summary.customers.growth, label: 'vs période précédente' }}
              icon={Users}
              tone="info"
            />
            <StatCard
              label="Taux de conversion"
              value={`${data.summary.conversionRate}%`}
              icon={TrendingUp}
              tone="purple"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Produits vendus"
              value={formatNum(data.summary.products.sold)}
              icon={Package}
              tone="neutral"
            />
            <StatCard
              label="Boutiques actives"
              value={formatNum(data.summary.stores.active)}
              icon={Store}
              tone="warning"
            />
            <StatCard
              label="Panier moyen"
              value={formatPrice(data.summary.averageOrderValue)}
              icon={ShoppingCart}
              tone="neutral"
            />
          </div>

          {/* Revenus */}
          <AreaChartCard
            title="Revenus (30 jours)"
            data={toChartData(data.revenueChart)}
            color={CHART_COLORS.primary}
            height={240}
            valueFormatter={formatPrice}
          />

          {/* Commandes + Nouveaux clients */}
          <div className="grid gap-4 md:grid-cols-2">
            <BarChartCard
              title="Commandes (30 jours)"
              data={toChartData(data.ordersChart)}
              color={CHART_COLORS.accent}
              height={200}
              valueFormatter={formatNum}
            />
            <BarChartCard
              title="Nouveaux clients (30 jours)"
              data={toChartData(data.customerChart)}
              color={CHART_COLORS.blue}
              height={200}
              valueFormatter={formatNum}
            />
          </div>

          {/* Revenus par paiement + Géo */}
          <div className="grid gap-4 md:grid-cols-2">
            <DonutChartCard
              title="Revenus par moyen de paiement"
              data={data.revenueByPayment.map((r) => ({ name: r.paymentMethod, value: r.amount }))}
              valueFormatter={formatPrice}
            />
            <Card>
              <CardHeader>
                <CardTitle>Répartition géographique</CardTitle>
              </CardHeader>
              <div className="space-y-3">
                {data.geographicData.slice(0, 7).map((g) => {
                  const pctVal = (g.revenue / data.summary.revenue.total) * 100
                  return (
                    <div key={g.code}>
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="font-medium text-gray-700 dark:text-gray-300">{g.country}</span>
                        <span className="text-gray-500 dark:text-gray-400">{formatPrice(g.revenue)} ({pctVal.toFixed(1)}%)</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                        <div className="h-full rounded-full bg-primary-500" style={{ width: `${pctVal}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          </div>

          {/* Top produits */}
          <Card>
            <CardHeader>
              <CardTitle>Top produits</CardTitle>
            </CardHeader>
            <div className="space-y-3">
              {data.topProducts.map((p, i) => {
                const pctVal = (p.value / data.topProducts[0].value) * 100
                return (
                  <div key={p.id} className="flex items-center gap-4">
                    <span className="w-5 text-xs font-bold text-gray-400 dark:text-gray-500">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="truncate font-medium text-gray-900 dark:text-gray-100">{p.name}</span>
                        <span className="ml-2 text-gray-500 dark:text-gray-400">{formatPrice(p.value)} ({formatNum(p.count)} vendus)</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                        <div className="h-full rounded-full bg-primary-500" style={{ width: `${pctVal}%` }} />
                      </div>
                    </div>
                    {p.growth !== undefined && (
                      <span className={`flex-shrink-0 text-xs font-medium ${p.growth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {pct(p.growth)}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Top catégories + Top boutiques */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top catégories</CardTitle>
              </CardHeader>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    <th className="pb-2 font-medium">Catégorie</th>
                    <th className="pb-2 font-medium">Revenu</th>
                    <th className="pb-2 font-medium">Ventes</th>
                    <th className="pb-2 font-medium">Évolution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {data.topCategories.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                      <td className="py-2 font-medium text-gray-900 dark:text-gray-100">{c.name}</td>
                      <td className="py-2 text-gray-700 dark:text-gray-300">{formatPrice(c.value)}</td>
                      <td className="py-2 text-gray-500 dark:text-gray-400">{formatNum(c.count)}</td>
                      <td className={`py-2 text-xs font-medium ${(c.growth ?? 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{pct(c.growth ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Top boutiques</CardTitle>
              </CardHeader>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    <th className="pb-2 font-medium">Boutique</th>
                    <th className="pb-2 font-medium">Revenu</th>
                    <th className="pb-2 font-medium">Commandes</th>
                    <th className="pb-2 font-medium">Évolution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {data.topStores.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                      <td className="py-2 font-medium text-gray-900 dark:text-gray-100">{s.name}</td>
                      <td className="py-2 text-gray-700 dark:text-gray-300">{formatPrice(s.value)}</td>
                      <td className="py-2 text-gray-500 dark:text-gray-400">{formatNum(s.count)}</td>
                      <td className={`py-2 text-xs font-medium ${(s.growth ?? 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{pct(s.growth ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
