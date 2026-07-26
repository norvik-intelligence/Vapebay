'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Lock, ShieldAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';

export function LoginForm({
  next,
  configured,
  onVercel = false,
  env = 'development',
}: {
  next: string;
  configured: boolean;
  onVercel?: boolean;
  env?: 'production' | 'preview' | 'development';
}) {
  const router = useRouter();
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  if (!configured) {
    return (
      <div className="glass rounded-lg p-6">
        <ShieldAlert className="size-5 text-warning" aria-hidden />
        <h1 className="mt-4 text-lg font-semibold">Admin-Zugang nicht konfiguriert</h1>

        <p className="measure mt-2 text-sm leading-relaxed text-fg-muted">
          {onVercel ? (
            <>
              Trage <code className="font-mono text-xs text-fg">ADMIN_SESSION_SECRET</code> und{' '}
              <code className="font-mono text-xs text-fg">ADMIN_PASSWORD</code> in den
              Vercel-Projekteinstellungen unter <em>Settings → Environment Variables</em> ein
              {env === 'preview' && ' (Scope: Preview)'} und deploye neu.
            </>
          ) : (
            <>
              Setze <code className="font-mono text-xs text-fg">ADMIN_SESSION_SECRET</code> und{' '}
              <code className="font-mono text-xs text-fg">ADMIN_PASSWORD</code> in der{' '}
              <code className="font-mono text-xs text-fg">.env</code>.
            </>
          )}{' '}
          Solange beide fehlen, bleibt das Panel gesperrt — das ist beabsichtigt, kein Fehler.
        </p>

        <p className="mt-3 text-xs leading-relaxed text-fg-subtle">
          Der Shop selbst funktioniert vollständig ohne diese Werte; gesperrt ist ausschließlich
          <code className="ml-1 font-mono text-fg-muted">/admin</code>.
        </p>

        <pre className="mt-4 overflow-x-auto rounded-md border border-line bg-bg-subtle p-3 font-mono text-2xs leading-relaxed text-fg-muted">
{`# ADMIN_SESSION_SECRET erzeugen:
openssl rand -hex 32

# ADMIN_PASSWORD erzeugen (SHA-256-Hex, nicht das Klartextpasswort):
node -e "crypto.subtle.digest('SHA-256', new TextEncoder()\\
  .encode('deinPasswort')).then(h => console.log(\\
  Buffer.from(h).toString('hex')))"`}
        </pre>
      </div>
    );
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? 'Anmeldung fehlgeschlagen');
        return;
      }

      // refresh() so the server components behind the gate re-render with the
      // new cookie instead of serving the cached unauthenticated tree.
      router.replace(next);
      router.refresh();
    } catch {
      setError('Server nicht erreichbar');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="glass rounded-lg p-6">
      <span className="grid size-11 place-items-center rounded-md border border-accent/30 bg-accent-subtle">
        <Lock className="size-4 text-accent" aria-hidden />
      </span>

      <h1 className="mt-5 text-xl font-semibold tracking-tight">Vapebay Admin</h1>
      <p className="mt-1.5 text-sm text-fg-muted">
        Zugang nur für Betreiber. Die Sitzung läuft nach 12 Stunden ab.
      </p>

      <Field label="Passwort" htmlFor="admin-password" error={error ?? undefined} className="mt-6">
        <Input
          id="admin-password"
          type="password"
          autoComplete="current-password"
          autoFocus
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={Boolean(error)}
        />
      </Field>

      <Button type="submit" className="mt-5 w-full" loading={pending} disabled={!password}>
        Anmelden
      </Button>
    </form>
  );
}
