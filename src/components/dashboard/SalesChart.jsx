// ===========================================================================
// Graphique « Évolution des ventes » (Recharts) — montants en FCFA.
// Sélecteur : Aujourd'hui / 7 jours / 30 jours / Cette année.
// ===========================================================================
import { useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const SERIE = '#079fbe'
const SERIE_FILL = 'url(#saleGradient)'

const RANGES = [
  { value: 'jour', label: "Aujourd'hui" },
  { value: '7j', label: '7 jours' },
  { value: '30j', label: '30 jours' },
  { value: 'annee', label: 'Cette année' },
]

const formatMontant = (value) =>
  `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(value) || 0)} F`

function LogoAbscisse({ x, y, payload }) {
  return (
    <text x={x} y={y} dy={14} textAnchor="middle" className="fill-muted-foreground text-[11px]">
      {payload.value}
    </text>
  )
}

function AxeOrdonnee({ x, y, payload }) {
  const v = Number(payload.value) || 0
  const text = v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
  return (
    <text x={x} y={y} dy={3} textAnchor="end" className="fill-muted-foreground text-[11px]">
      {text}
    </text>
  )
}

function InfoTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="mb-1 font-medium text-popover-foreground">{label}</p>
      <p className="font-semibold text-primary">{formatMontant(payload[0].value)}</p>
    </div>
  )
}

export default function SalesChart({ charts, className }) {
  const [range, setRange] = useState('7j')
  const donnees = charts?.[range] || []

  return (
    <Card className={cn('gap-0 py-5', className)}>
      <CardHeader className="flex items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="size-4 text-primary" /> Évolution des ventes
          </CardTitle>
          <CardDescription className="mt-1">Chiffre d'affaires, ventes validées en FCFA.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="px-5">
        {/* Sélecteur de période */}
        <div className="mb-4 flex flex-wrap gap-1">
          {RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              aria-pressed={range === r.value}
              onClick={() => setRange(r.value)}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none',
                range === r.value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={donnees} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="saleGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={SERIE} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={SERIE} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis
                dataKey="label"
                tick={<LogoAbscisse />}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={24}
              />
              <YAxis
                tick={<AxeOrdonnee />}
                axisLine={false}
                tickLine={false}
                width={44}
              />
              <RechartsTooltip content={<InfoTooltip />} cursor={{ stroke: SERIE, strokeOpacity: 0.35 }} />
              <Area
                type="monotone"
                dataKey="total"
                name="CA (FCFA)"
                stroke={SERIE}
                strokeWidth={2}
                fill={SERIE_FILL}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

export function SalesChartSkeleton() {
  return (
    <Card className="gap-0 py-5">
      <CardHeader>
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-3.5 w-64" />
      </CardHeader>
      <CardContent className="px-5">
        <div className="mb-4 flex gap-1">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-6 w-16" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </CardContent>
    </Card>
  )
}