import { cn } from '@/lib/utils';

export function AdminHeader({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4 pb-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="measure mt-2 text-sm leading-relaxed text-fg-muted">{description}</p>
      </div>
      {children && <div className="flex shrink-0 gap-2">{children}</div>}
    </header>
  );
}

export function StatTile({
  label,
  value,
  sub,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'neutral' | 'accent' | 'warning' | 'danger';
}) {
  return (
    <div className="glass rounded-md p-4">
      <p className="text-2xs font-medium uppercase tracking-wide text-fg-subtle">{label}</p>
      <p
        className={cn(
          'mt-2 font-mono text-2xl font-medium tabular',
          tone === 'accent' && 'text-accent',
          tone === 'warning' && 'text-warning',
          tone === 'danger' && 'text-danger',
        )}
      >
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-fg-subtle">{sub}</p>}
    </div>
  );
}

export function Panel({
  title,
  description,
  children,
  className,
  actions,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}) {
  return (
    // min-w-0 so a wide table inside TableWrap scrolls within the panel rather
    // than sizing the grid track it sits in — grid and flex children default to
    // min-width:auto, which is min-content, which is the whole table.
    <section className={cn('glass min-w-0 rounded-lg', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line p-5">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          {description && <p className="measure mt-1 text-xs leading-relaxed text-fg-muted">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

/** Data table wrapper. Horizontal scroll is contained here, never on <body>. */
export function TableWrap({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto">{children}</div>;
}

export function StatusPill({
  status,
  className,
}: {
  status: 'ok' | 'partial' | 'failed' | 'never' | 'verified' | 'rejected' | 'pending' | 'paid' | 'routed' | 'shipped' | 'cancelled';
  className?: string;
}) {
  const LABELS: Record<string, string> = {
    ok: 'Erfolgreich',
    partial: 'Teilweise',
    failed: 'Fehlgeschlagen',
    never: 'Nie gelaufen',
    verified: 'Bestätigt',
    rejected: 'Abgelehnt',
    pending: 'Offen',
    paid: 'Bezahlt',
    routed: 'Weitergeleitet',
    shipped: 'Versendet',
    cancelled: 'Storniert',
  };

  const TONE: Record<string, string> = {
    ok: 'border-accent/30 bg-accent-subtle text-accent',
    verified: 'border-accent/30 bg-accent-subtle text-accent',
    shipped: 'border-accent/30 bg-accent-subtle text-accent',
    partial: 'border-warning/30 bg-warning-subtle text-warning',
    pending: 'border-warning/30 bg-warning-subtle text-warning',
    failed: 'border-danger/30 bg-danger-subtle text-danger',
    rejected: 'border-danger/30 bg-danger-subtle text-danger',
    cancelled: 'border-danger/30 bg-danger-subtle text-danger',
    never: 'border-line bg-white/[0.04] text-fg-subtle',
    paid: 'border-line bg-white/[0.04] text-fg-muted',
    routed: 'border-line bg-white/[0.04] text-fg-muted',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm border px-2 py-0.5 text-2xs font-medium',
        TONE[status] ?? TONE.never,
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {LABELS[status] ?? status}
    </span>
  );
}
