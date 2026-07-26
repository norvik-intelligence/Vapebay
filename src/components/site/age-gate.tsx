'use client';

import * as React from 'react';
import { ShieldCheck, CalendarDays, ExternalLink } from 'lucide-react';

import { useCart } from '@/lib/store/cart';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

/**
 * Age gate (JuSchG §10 / TabakerzG §11).
 *
 * This is a self-declaration gate — the legally binding check happens at
 * checkout via PostIdent / SOFORT Ident. Two reasons it works this way:
 * a hard identity check before anyone has seen a product would kill the
 * session, and the law requires reliable verification at the point of
 * *delivery*, not at the point of browsing.
 */
export function AgeGate() {
  const verified = useCart((s) => s.ageVerified);
  const setVerified = useCart((s) => s.setAgeVerified);
  const [hydrated, setHydrated] = React.useState(false);

  // The store rehydrates from localStorage after mount. Rendering the gate
  // before that would flash it at every returning visitor.
  React.useEffect(() => {
    const unsub = useCart.persist?.onFinishHydration?.(() => setHydrated(true));
    if (useCart.persist?.hasHydrated?.()) setHydrated(true);
    return unsub;
  }, []);

  const open = hydrated && !verified;

  return (
    <Dialog open={open}>
      <DialogContent
        hideClose
        // Escape and outside-click must not dismiss a legal gate.
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        className="max-w-md text-center"
        aria-labelledby="age-gate-title"
      >
        <div className="p-8">
          <div className="mx-auto grid size-14 place-items-center rounded-lg border border-accent/30 bg-accent-subtle">
            <ShieldCheck className="size-6 text-accent" aria-hidden />
          </div>

          <DialogTitle id="age-gate-title" className="mt-6 text-2xl">
            Bist du über 18?
          </DialogTitle>

          <DialogDescription className="mx-auto mt-3 max-w-sm text-balance">
            Nikotinhaltige Produkte dürfen in Deutschland ausschließlich an Volljährige abgegeben
            werden. Beim Checkout prüfen wir dein Alter zusätzlich per Ident-Verfahren.
          </DialogDescription>

          <div className="mt-8 flex flex-col gap-3">
            <Button size="lg" onClick={() => setVerified(true)} className="w-full">
              <CalendarDays className="size-4" aria-hidden />
              Ja, ich bin 18 Jahre oder älter
            </Button>
            <Button variant="ghost" size="lg" asChild className="w-full">
              <a href="https://www.rauchfrei-info.de" target="_blank" rel="noopener noreferrer">
                Nein, ich bin jünger
                <ExternalLink className="size-3.5" aria-hidden />
              </a>
            </Button>
          </div>

          <p className="mt-6 text-2xs leading-relaxed text-fg-subtle">
            Mit der Bestätigung erklärst du wahrheitsgemäß, volljährig zu sein. Falschangaben können
            strafrechtlich verfolgt werden.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
