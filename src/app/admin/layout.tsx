import type { Metadata } from 'next';

import { AdminNav } from '@/components/admin/admin-nav';

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s · Vapebay Admin' },
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Admin shell.
 *
 * Access is gated in `src/middleware.ts` (signed session cookie) with the Caddy
 * basic-auth block as an independent second layer. `robots: noindex` keeps the
 * panel out of search results — it is not, and never was, an access control.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-bg-subtle/30">
      <div className="container flex flex-col gap-8 py-8 lg:flex-row lg:gap-12">
        <AdminNav />
        <div className="min-w-0 flex-1 pb-16">{children}</div>
      </div>
    </div>
  );
}
