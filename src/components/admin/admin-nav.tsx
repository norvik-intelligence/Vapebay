'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  RefreshCw,
  Percent,
  PackageSearch,
  Globe,
  ShieldCheck,
} from 'lucide-react';

import { cn } from '@/lib/utils';

const LINKS = [
  { href: '/admin', label: 'Übersicht', icon: LayoutDashboard, exact: true },
  { href: '/admin/inventar', label: 'Lieferanten & Sync', icon: RefreshCw },
  { href: '/admin/margen', label: 'Margen & Aufschlag', icon: Percent },
  { href: '/admin/dropshipping', label: 'Dropshipping', icon: PackageSearch },
  { href: '/admin/pseo', label: 'pSEO-Manager', icon: Globe },
  { href: '/admin/altersnachweis', label: 'Altersnachweise', icon: ShieldCheck },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin-Navigation">
      <p className="px-3 text-2xs font-medium uppercase tracking-wide text-fg-subtle">
        Verwaltung
      </p>
      <ul className="mt-3 flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
        {LINKS.map((link) => {
          const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
          const Icon = link.icon;
          return (
            <li key={link.href} className="shrink-0">
              <Link
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2.5 text-sm transition-colors',
                  active
                    ? 'bg-accent-subtle font-medium text-accent'
                    : 'text-fg-muted hover:bg-white/[0.05] hover:text-fg',
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
