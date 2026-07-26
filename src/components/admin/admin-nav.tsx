'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Globe,
  LayoutDashboard,
  LogOut,
  Percent,
  PackageSearch,
  RefreshCw,
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

/**
 * The admin sidebar, including its own chrome.
 *
 * It lives here rather than in the layout because the login page shares that
 * layout and must not show navigation to pages the visitor cannot reach — a
 * server layout has no access to the pathname, a client component does.
 */
export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === '/admin/login') return null;

  async function logout() {
    await fetch('/api/admin/login', { method: 'DELETE' });
    router.replace('/admin/login');
    router.refresh();
  }

  return (
    <aside className="min-w-0 lg:w-56 lg:shrink-0">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-xs text-fg-subtle transition-colors hover:text-accent"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Zum Shop
      </Link>

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

      <button
        onClick={logout}
        className={cn(
          'mt-6 flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-sm text-fg-subtle transition-colors',
          'hover:bg-white/[0.05] hover:text-fg',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        )}
      >
        <LogOut className="size-4 shrink-0" aria-hidden />
        Abmelden
      </button>
    </aside>
  );
}
