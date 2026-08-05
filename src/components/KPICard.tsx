'use client';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { value: string; positive: boolean };
  color: 'blue' | 'emerald' | 'amber' | 'red' | 'purple' | 'cyan';
}

const colorMap = {
  blue:    { gradient: 'from-blue-500 to-blue-600',    shadow: 'shadow-blue-500/20',    iconBg: 'bg-blue-500/15',    iconText: 'text-blue-400' },
  emerald: { gradient: 'from-emerald-500 to-emerald-600', shadow: 'shadow-emerald-500/20', iconBg: 'bg-emerald-500/15', iconText: 'text-emerald-400' },
  amber:   { gradient: 'from-amber-500 to-amber-600', shadow: 'shadow-amber-500/20',   iconBg: 'bg-amber-500/15',   iconText: 'text-amber-400' },
  red:     { gradient: 'from-red-500 to-red-600',     shadow: 'shadow-red-500/20',     iconBg: 'bg-red-500/15',     iconText: 'text-red-400' },
  purple:  { gradient: 'from-purple-500 to-purple-600', shadow: 'shadow-purple-500/20',  iconBg: 'bg-purple-500/15',  iconText: 'text-purple-400' },
  cyan:    { gradient: 'from-cyan-500 to-cyan-600',   shadow: 'shadow-cyan-500/20',    iconBg: 'bg-cyan-500/15',    iconText: 'text-cyan-400' },
};

export default function KPICard({ title, value, subtitle, icon, trend, color }: KPICardProps) {
  const c = colorMap[color];

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-[var(--card)] border border-[var(--border)] p-5 transition-all duration-300 hover:border-[var(--border-hover)] hover:shadow-xl hover:shadow-black/10 hover:-translate-y-0.5">
      {/* Gradient accent line at top */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${c.gradient} opacity-60 group-hover:opacity-100 transition-opacity`} />

      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-[var(--foreground)]">{value}</p>
          {subtitle && (
            <p className="text-xs text-[var(--muted)]">{subtitle}</p>
          )}
          {trend && (
            <div className={`flex items-center gap-1 text-xs font-medium ${trend.positive ? 'text-emerald-400' : 'text-red-400'}`}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                className={trend.positive ? '' : 'rotate-180'}
              >
                <polyline points="18 15 12 9 6 15" />
              </svg>
              {trend.value}
            </div>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl ${c.iconBg} flex items-center justify-center ${c.iconText} shrink-0`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
