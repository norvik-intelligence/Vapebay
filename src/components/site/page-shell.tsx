import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

import type { Crumb } from '@/lib/seo/jsonld';
import { cn } from '@/lib/utils';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export function Breadcrumbs({ crumbs, className }: { crumbs: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Brotkrumen-Navigation" className={cn('text-xs', className)}>
      <ol className="flex flex-wrap items-center gap-1.5 text-fg-subtle">
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1;
          return (
            <li key={crumb.path} className="flex items-center gap-1.5">
              {index > 0 && <ChevronRight className="size-3 shrink-0" aria-hidden />}
              {last ? (
                <span aria-current="page" className="text-fg-muted">
                  {crumb.name}
                </span>
              ) : (
                <Link href={crumb.path} className="transition-colors hover:text-accent">
                  {crumb.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  children,
  className,
}: {
  eyebrow?: React.ReactNode;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('py-10 sm:py-14', className)}>
      {eyebrow && (
        <p className="flex items-center gap-2 font-mono text-2xs uppercase tracking-wide text-accent">
          {eyebrow}
        </p>
      )}
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">{title}</h1>
      {description && (
        <p className="measure mt-4 text-base leading-relaxed text-fg-muted">{description}</p>
      )}
      {children && <div className="mt-7">{children}</div>}
    </header>
  );
}

/**
 * The FAQ accordion every pSEO route renders. Paired with `faqLd()` in the page
 * so the visible markup and the structured data are generated from one array —
 * mismatched FAQ schema is a manual action waiting to happen.
 */
export function FaqSection({
  items,
  title = 'Häufige Fragen',
  className,
}: {
  items: { q: string; a: string }[];
  title?: string;
  className?: string;
}) {
  return (
    <section className={cn('py-14', className)} aria-labelledby="faq-heading">
      <h2 id="faq-heading" className="text-2xl font-semibold tracking-tight">
        {title}
      </h2>
      <Accordion type="single" collapsible className="mt-6 max-w-3xl">
        {items.map((item, index) => (
          <AccordionItem key={item.q} value={`faq-${index}`}>
            <AccordionTrigger>{item.q}</AccordionTrigger>
            <AccordionContent>{item.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}

/** Small key/value spec table — used on product and compatibility pages. */
export function SpecTable({
  rows,
  className,
}: {
  rows: [label: string, value: React.ReactNode][];
  className?: string;
}) {
  return (
    <dl className={cn('divide-y divide-line overflow-hidden rounded-md border border-line', className)}>
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-baseline justify-between gap-4 px-4 py-3">
          <dt className="text-sm text-fg-muted">{label}</dt>
          <dd className="text-right font-mono text-sm tabular">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
