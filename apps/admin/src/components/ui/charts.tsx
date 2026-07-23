import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useTheme } from '../../contexts/ThemeContext'
import { CHART_COLORS, CHART_SERIES, chartTheme } from '../../lib/chart'
import { Card, CardDescription, CardHeader, CardTitle } from './Card'

interface Point {
  label: string
  value: number
}

interface TooltipStyleProps {
  bg: string
  border: string
  text: string
}

function tooltipStyle({ bg, border, text }: TooltipStyleProps): React.CSSProperties {
  return {
    backgroundColor: bg,
    border: `1px solid ${border}`,
    borderRadius: 10,
    color: text,
    fontSize: 12,
    padding: '8px 12px',
    boxShadow: '0 4px 16px -4px rgb(0 0 0 / 0.14)',
  }
}

function useChartTheme() {
  const { theme } = useTheme()
  return chartTheme(theme === 'dark')
}

// ─── Aire (évolution temporelle) ──────────────────────────────────────────────
interface AreaChartCardProps {
  title: string
  description?: string
  data: Point[]
  color?: string
  height?: number
  valueFormatter?: (v: number) => string
  headerRight?: React.ReactNode
}

export function AreaChartCard({
  title,
  description,
  data,
  color = CHART_COLORS.primary,
  height = 260,
  valueFormatter = (v) => v.toLocaleString('fr-FR'),
  headerRight,
}: AreaChartCardProps) {
  const t = useChartTheme()
  const gradientId = `area-${title.replace(/\W/g, '')}`
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {headerRight}
      </CardHeader>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={t.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" stroke={t.axis} fontSize={11} tickLine={false} axisLine={false} dy={6} />
          <YAxis
            stroke={t.axis}
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={48}
            tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
          />
          <RechartsTooltip
            contentStyle={tooltipStyle({ bg: t.tooltipBg, border: t.tooltipBorder, text: t.tooltipText })}
            formatter={(value) => [valueFormatter(Number(value)), '']}
            separator=""
          />
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#${gradientId})`} />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  )
}

// ─── Barres ───────────────────────────────────────────────────────────────────
interface BarChartCardProps {
  title: string
  description?: string
  data: Point[]
  color?: string
  height?: number
  valueFormatter?: (v: number) => string
  layout?: 'horizontal' | 'vertical'
  headerRight?: React.ReactNode
}

export function BarChartCard({
  title,
  description,
  data,
  color = CHART_COLORS.accent,
  height = 260,
  valueFormatter = (v) => v.toLocaleString('fr-FR'),
  layout = 'horizontal',
  headerRight,
}: BarChartCardProps) {
  const t = useChartTheme()
  const vertical = layout === 'vertical'
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {headerRight}
      </CardHeader>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          layout={vertical ? 'vertical' : 'horizontal'}
          margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
        >
          <CartesianGrid stroke={t.grid} strokeDasharray="3 3" horizontal={!vertical} vertical={vertical} />
          {vertical ? (
            <>
              <XAxis type="number" stroke={t.axis} fontSize={11} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="label" stroke={t.axis} fontSize={11} tickLine={false} axisLine={false} width={110} />
            </>
          ) : (
            <>
              <XAxis dataKey="label" stroke={t.axis} fontSize={11} tickLine={false} axisLine={false} dy={6} />
              <YAxis stroke={t.axis} fontSize={11} tickLine={false} axisLine={false} width={48} />
            </>
          )}
          <RechartsTooltip
            cursor={{ fill: t.grid, opacity: 0.35 }}
            contentStyle={tooltipStyle({ bg: t.tooltipBg, border: t.tooltipBorder, text: t.tooltipText })}
            formatter={(value) => [valueFormatter(Number(value)), '']}
            separator=""
          />
          <Bar dataKey="value" fill={color} radius={vertical ? [0, 4, 4, 0] : [4, 4, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}

// ─── Donut (répartition) ──────────────────────────────────────────────────────
interface DonutChartCardProps {
  title: string
  description?: string
  data: { name: string; value: number }[]
  height?: number
  valueFormatter?: (v: number) => string
  headerRight?: React.ReactNode
}

export function DonutChartCard({
  title,
  description,
  data,
  height = 240,
  valueFormatter = (v) => v.toLocaleString('fr-FR'),
  headerRight,
}: DonutChartCardProps) {
  const t = useChartTheme()
  const total = data.reduce((sum, d) => sum + d.value, 0)
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {headerRight}
      </CardHeader>
      <div className="flex flex-wrap items-center gap-6">
        <ResponsiveContainer width={height} height={height}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="62%"
              outerRadius="90%"
              paddingAngle={3}
              strokeWidth={0}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={CHART_SERIES[i % CHART_SERIES.length]} />
              ))}
            </Pie>
            <RechartsTooltip
              contentStyle={tooltipStyle({ bg: t.tooltipBg, border: t.tooltipBorder, text: t.tooltipText })}
              formatter={(value) => [valueFormatter(Number(value)), '']}
              separator=""
            />
          </PieChart>
        </ResponsiveContainer>
        <ul className="min-w-[140px] flex-1 space-y-2">
          {data.map((d, i) => (
            <li key={d.name} className="flex items-center gap-2.5 text-sm">
              <span
                className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                style={{ backgroundColor: CHART_SERIES[i % CHART_SERIES.length] }}
              />
              <span className="flex-1 truncate text-gray-600 dark:text-gray-300">{d.name}</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {total > 0 ? `${Math.round((d.value / total) * 100)}%` : '—'}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  )
}

// ─── Sparkline (mini-courbe sans axes) ────────────────────────────────────────
interface SparklineProps {
  data: number[]
  color?: string
  height?: number
}

export function Sparkline({ data, color = CHART_COLORS.primary, height = 36 }: SparklineProps) {
  const points = data.map((value, i) => ({ label: String(i), value }))
  const gradientId = `spark-${color.replace('#', '')}`
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={points} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} fill={`url(#${gradientId})`} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
