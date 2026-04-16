import { type LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  iconColor?: string
  iconBg?: string
  trend?: string
  trendPositive?: boolean
}

export default function StatCard({
  label,
  value,
  icon: Icon,
  iconColor = '#89A894',
  iconBg = 'rgba(137,168,148,0.12)',
  trend,
  trendPositive = true,
}: StatCardProps) {
  return (
    <div className="card p-6 flex items-start justify-between">
      <div>
        <p style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: 500, marginBottom: '0.375rem' }}>
          {label}
        </p>
        <p style={{ fontSize: '1.875rem', fontWeight: 700, color: '#1a1a1a', lineHeight: 1.1 }}>
          {value}
        </p>
        {trend && (
          <p style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: trendPositive ? '#10b981' : '#f59e0b', fontWeight: 500 }}>
            {trend}
          </p>
        )}
      </div>
      <div
        className="flex items-center justify-center rounded-xl"
        style={{ width: 48, height: 48, background: iconBg, flexShrink: 0 }}
      >
        <Icon size={22} color={iconColor} />
      </div>
    </div>
  )
}
