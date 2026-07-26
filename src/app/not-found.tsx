import Link from 'next/link';
import { Compass } from 'lucide-react';

import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="container flex min-h-[60dvh] flex-col items-center justify-center py-20 text-center">
      <span className="grid size-14 place-items-center rounded-lg border border-line bg-white/[0.03]">
        <Compass className="size-5 text-fg-subtle" aria-hidden />
      </span>

      <p className="mt-6 font-mono text-2xs uppercase tracking-wide text-fg-subtle">Fehler 404</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
        Diese Seite gibt es nicht
      </h1>
      <p className="measure mt-4 text-base leading-relaxed text-fg-muted">
        Möglicherweise wurde ein Produkt ausgelistet oder eine Gerätekombination existiert nicht.
        Der Kompatibilitäts-Finder führt dich zur passenden Seite.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg">
          <Link href="/kompatibel">Kompatibilität prüfen</Link>
        </Button>
        <Button asChild variant="secondary" size="lg">
          <Link href="/produkte">Sortiment ansehen</Link>
        </Button>
      </div>
    </div>
  );
}
