import type { Metadata } from 'next';

import { isAdminConfigured } from '@/lib/admin/auth';
import { LoginForm } from '@/components/admin/login-form';

export const metadata: Metadata = {
  title: 'Anmeldung',
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = 'force-dynamic';

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  // Only ever redirect to an internal path. An open redirect on a login page
  // is a phishing primitive: attacker sends ?next=https://evil.example and the
  // victim lands there straight after authenticating on a domain they trust.
  const target = next && next.startsWith('/') && !next.startsWith('//') ? next : '/admin';

  return (
    <div className="mx-auto flex min-h-[70dvh] w-full max-w-sm flex-col justify-center">
      <LoginForm next={target} configured={isAdminConfigured()} />
    </div>
  );
}
