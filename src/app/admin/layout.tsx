import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { AdminNav } from '@/components/admin/admin-nav';

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s · Vapebay Admin' },
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Admin shell.
 *
 * NOTE: this route group ships with no authentication. Before deploying,
 * put it behind the Caddy basic-auth block documented in the README (or wire
 * up a real session check in middleware) — `robots: noindex` keeps it out of
 * search results, it does not keep anyone out of the page.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-bg-subtle/30">
      <div className="container flex flex-col gap-8 py-8 lg:flex-row lg:gap-12">
        {/* min-w-0: flex items default to min-width:auto, so without this the
            aside grows to fit the horizontally-scrolling nav on mobile and
            drags the page into a horizontal scroll. */}
        <aside className="min-w-0 lg:w-56 lg:shrink-0">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-1.5 text-xs text-fg-subtle transition-colors hover:text-accent"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            Zum Shop
          </Link>
          <AdminNav />
        </aside>

        <div className="min-w-0 flex-1 pb-16">{children}</div>
      </div>
    </div>
  );
}
