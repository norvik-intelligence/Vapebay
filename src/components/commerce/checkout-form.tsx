'use client';

import * as React from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BadgeCheck,
  Check,
  CreditCard,
  Loader2,
  Lock,
  PackageCheck,
  ShieldCheck,
  Truck,
  XCircle,
} from 'lucide-react';

import {
  CheckoutSchema,
  IDENT_PROVIDERS,
  PAYMENT_METHODS,
  type CheckoutValues,
} from '@/lib/validation';
import { useCart } from '@/lib/store/cart';
import { useCartLines } from '@/lib/hooks/use-cart-lines';
import { cn, formatEur } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Field, Input, Label } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ProductVisual } from './product-visual';

type IdentStatus = 'idle' | 'pending' | 'verified' | 'rejected';

interface OrderResult {
  orderId: string;
  totalCents: number;
  discountCents: number;
  bundleTier: string | null;
  estimatedDelivery: string;
  routing: { parcelCount: number; maxLeadTimeDays: number };
}

export function CheckoutForm() {
  const { lines, bundle, shippingCents, grandTotalCents, isLoading } = useCartLines();
  const clearCart = useCart((s) => s.clear);

  const [identStatus, setIdentStatus] = React.useState<IdentStatus>('idle');
  const [identReference, setIdentReference] = React.useState<string | null>(null);
  const [identMessage, setIdentMessage] = React.useState<string | null>(null);
  const [provider, setProvider] = React.useState<(typeof IDENT_PROVIDERS)[number]['value']>(
    'sofort',
  );
  const [order, setOrder] = React.useState<OrderResult | null>(null);

  const form = useForm<CheckoutValues>({
    resolver: zodResolver(CheckoutSchema),
    defaultValues: {
      country: 'DE',
      paymentMethod: 'paypal',
      isBusiness: false,
      acceptTerms: false,
    },
    mode: 'onBlur',
  });

  const { register, handleSubmit, watch, setValue, formState } = form;
  const paymentMethod = watch('paymentMethod');
  const isBusiness = watch('isBusiness');

  // ── Age verification ────────────────────────────────────────────────────
  const identMutation = useMutation({
    mutationFn: async () => {
      const birthDate = watch('birthDate');
      const lastName = watch('lastName');
      if (!birthDate || !lastName) {
        throw new Error('Bitte zuerst Name und Geburtsdatum ausfüllen');
      }
      const res = await fetch('/api/age-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, birthDate, lastName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Altersprüfung fehlgeschlagen');
      return data as { reference: string; message: string };
    },
    onMutate: () => {
      setIdentStatus('pending');
      setIdentMessage(null);
    },
    onSuccess: (data) => {
      setIdentStatus('verified');
      setIdentReference(data.reference);
      setIdentMessage(data.message);
    },
    onError: (error: Error) => {
      setIdentStatus('rejected');
      setIdentMessage(error.message);
    },
  });

  // ── Order placement ─────────────────────────────────────────────────────
  const orderMutation = useMutation({
    mutationFn: async (customer: CheckoutValues) => {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer,
          items: lines.map((l) => ({ productId: l.product.id, qty: l.qty })),
          identReference,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Bestellung fehlgeschlagen');
      return data as OrderResult;
    },
    onSuccess: (data) => {
      setOrder(data);
      clearCart();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
  });

  if (order) return <OrderConfirmation order={order} />;

  if (!isLoading && lines.length === 0) {
    return (
      <div className="glass mx-auto max-w-lg rounded-lg p-10 text-center">
        <h2 className="text-xl font-semibold">Dein Warenkorb ist leer</h2>
        <p className="measure mx-auto mt-2 text-sm text-fg-muted">
          Füge Artikel hinzu oder lass dir vom Geschmacks-Finder ein Set zusammenstellen.
        </p>
        <Button asChild className="mt-6">
          <Link href="/produkte">Sortiment ansehen</Link>
        </Button>
      </div>
    );
  }

  const canSubmit = identStatus === 'verified' && !orderMutation.isPending;

  return (
    <form
      onSubmit={handleSubmit((values) => orderMutation.mutate(values))}
      className="grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-start"
      noValidate
    >
      <div className="space-y-10">
        {/* ── 1. Contact & shipping ──────────────────────────────────────── */}
        <Section index={1} title="Kontakt & Lieferadresse">
          <div className="grid gap-5">
            <Field label="E-Mail" htmlFor="email" error={formState.errors.email?.message}>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="name@beispiel.de"
                aria-invalid={Boolean(formState.errors.email)}
                {...register('email')}
              />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Vorname" htmlFor="firstName" error={formState.errors.firstName?.message}>
                <Input
                  id="firstName"
                  autoComplete="given-name"
                  aria-invalid={Boolean(formState.errors.firstName)}
                  {...register('firstName')}
                />
              </Field>
              <Field label="Nachname" htmlFor="lastName" error={formState.errors.lastName?.message}>
                <Input
                  id="lastName"
                  autoComplete="family-name"
                  aria-invalid={Boolean(formState.errors.lastName)}
                  {...register('lastName')}
                />
              </Field>
            </div>

            <Field
              label="Straße und Hausnummer"
              htmlFor="street"
              error={formState.errors.street?.message}
            >
              <Input
                id="street"
                autoComplete="street-address"
                aria-invalid={Boolean(formState.errors.street)}
                {...register('street')}
              />
            </Field>

            <div className="grid gap-5 sm:grid-cols-[8rem_1fr_8rem]">
              <Field label="PLZ" htmlFor="postcode" error={formState.errors.postcode?.message}>
                <Input
                  id="postcode"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  maxLength={5}
                  aria-invalid={Boolean(formState.errors.postcode)}
                  {...register('postcode')}
                />
              </Field>
              <Field label="Ort" htmlFor="city" error={formState.errors.city?.message}>
                <Input
                  id="city"
                  autoComplete="address-level2"
                  aria-invalid={Boolean(formState.errors.city)}
                  {...register('city')}
                />
              </Field>
              <Field label="Land" htmlFor="country">
                <select
                  id="country"
                  className="h-11 w-full rounded-md border border-line bg-bg-elevated px-3 text-sm focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
                  {...register('country')}
                >
                  <option value="DE">DE</option>
                  <option value="AT">AT</option>
                </select>
              </Field>
            </div>

            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 size-4 rounded-sm border-line-strong bg-transparent accent-[var(--color-accent)]"
                {...register('isBusiness')}
              />
              <span>
                <span className="font-medium">Ich bestelle als Gewerbetreibender</span>
                <span className="mt-0.5 block text-xs text-fg-subtle">
                  Rechnung mit ausgewiesener USt., auf Wunsch Blind-Dropshipping an Endkunden
                </span>
              </span>
            </label>

            {isBusiness && (
              <Field label="USt-IdNr." htmlFor="vatId" hint="Format: DE123456789">
                <Input id="vatId" placeholder="DE123456789" {...register('vatId')} />
              </Field>
            )}
          </div>
        </Section>

        {/* ── 2. Age verification ────────────────────────────────────────── */}
        <Section index={2} title="Altersverifikation">
          <p className="measure text-sm leading-relaxed text-fg-muted">
            Gesetzlich vorgeschrieben nach §10 JuSchG. Einmalig, danach ist dein Konto dauerhaft
            verifiziert. Wir speichern ausschließlich das Prüfergebnis — keine Ausweiskopie.
          </p>

          <Field
            label="Geburtsdatum"
            htmlFor="birthDate"
            error={formState.errors.birthDate?.message}
            className="mt-5 max-w-xs"
          >
            <Input
              id="birthDate"
              type="date"
              autoComplete="bday"
              max={new Date().toISOString().slice(0, 10)}
              aria-invalid={Boolean(formState.errors.birthDate)}
              {...register('birthDate')}
            />
          </Field>

          <fieldset className="mt-6">
            <legend className="text-sm font-medium">Prüfverfahren</legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {IDENT_PROVIDERS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={provider === option.value}
                  onClick={() => setProvider(option.value)}
                  disabled={identStatus === 'verified'}
                  className={cn(
                    'flex flex-col gap-1 rounded-md border p-4 text-left transition-all',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
                    provider === option.value
                      ? 'border-accent bg-accent-subtle'
                      : 'border-line bg-white/[0.02] hover:border-line-strong',
                    identStatus === 'verified' && 'opacity-60',
                  )}
                >
                  <span className="text-sm font-medium">{option.label}</span>
                  <span className="text-xs text-fg-subtle">{option.hint}</span>
                  <span className="mt-1 font-mono text-2xs text-fg-faint">{option.duration}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <div className="mt-5" aria-live="polite">
            <AnimatePresence mode="wait">
              {identStatus === 'verified' ? (
                <motion.div
                  key="verified"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3 rounded-md border border-accent/30 bg-accent-subtle p-4"
                >
                  <BadgeCheck className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
                  <div>
                    <p className="text-sm font-medium text-accent">Altersprüfung bestanden</p>
                    <p className="mt-1 text-xs leading-relaxed text-fg-muted">{identMessage}</p>
                    <p className="mt-1.5 font-mono text-2xs text-fg-subtle">
                      Referenz: {identReference}
                    </p>
                  </div>
                </motion.div>
              ) : identStatus === 'rejected' ? (
                <motion.div
                  key="rejected"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  role="alert"
                  className="flex items-start gap-3 rounded-md border border-danger/30 bg-danger-subtle p-4"
                >
                  <XCircle className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden />
                  <div>
                    <p className="text-sm font-medium text-danger">Prüfung nicht bestanden</p>
                    <p className="mt-1 text-xs leading-relaxed text-fg-muted">{identMessage}</p>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => identMutation.mutate()}
                    loading={identStatus === 'pending'}
                  >
                    <ShieldCheck className="size-4" aria-hidden />
                    {identStatus === 'pending'
                      ? 'Wird geprüft…'
                      : `Mit ${IDENT_PROVIDERS.find((p) => p.value === provider)?.label} verifizieren`}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Section>

        {/* ── 3. Payment ─────────────────────────────────────────────────── */}
        <Section index={3} title="Zahlungsart">
          <fieldset>
            <legend className="sr-only">Zahlungsart wählen</legend>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.value}
                  type="button"
                  role="radio"
                  aria-checked={paymentMethod === method.value}
                  onClick={() => setValue('paymentMethod', method.value)}
                  className={cn(
                    'flex flex-col gap-1 rounded-md border p-4 text-left transition-all',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
                    paymentMethod === method.value
                      ? 'border-accent bg-accent-subtle'
                      : 'border-line bg-white/[0.02] hover:border-line-strong',
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{method.label}</span>
                    {paymentMethod === method.value && (
                      <span className="grid size-4 place-items-center rounded-full bg-accent">
                        <Check className="size-2.5 text-accent-fg" aria-hidden />
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-fg-subtle">{method.hint}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <p className="mt-4 flex items-center gap-2 text-xs text-fg-subtle">
            <Lock className="size-3.5" aria-hidden />
            Zahlungsdaten werden direkt beim Anbieter erfasst und berühren unsere Server nicht.
          </p>
        </Section>

        {/* ── 4. Confirm ─────────────────────────────────────────────────── */}
        <Section index={4} title="Bestellung abschließen">
          <Label className="flex cursor-pointer items-start gap-3 text-sm font-normal">
            <input
              type="checkbox"
              className="mt-0.5 size-4 shrink-0 rounded-sm border-line-strong bg-transparent accent-[var(--color-accent)]"
              aria-invalid={Boolean(formState.errors.acceptTerms)}
              {...register('acceptTerms')}
            />
            <span className="text-fg-muted">
              Ich akzeptiere die AGB und die Widerrufsbelehrung und bestätige, dass ich das 18.
              Lebensjahr vollendet habe.
            </span>
          </Label>
          {formState.errors.acceptTerms && (
            <p role="alert" className="mt-2 text-xs font-medium text-danger">
              {formState.errors.acceptTerms.message}
            </p>
          )}

          {orderMutation.isError && (
            <p role="alert" className="mt-4 text-sm text-danger">
              {(orderMutation.error as Error).message}
            </p>
          )}

          <Button
            type="submit"
            size="lg"
            className="mt-6 w-full sm:w-auto"
            disabled={!canSubmit}
            loading={orderMutation.isPending}
          >
            <CreditCard className="size-4" aria-hidden />
            Zahlungspflichtig bestellen · {formatEur(grandTotalCents)}
          </Button>

          {identStatus !== 'verified' && (
            <p className="mt-3 text-xs text-fg-subtle">
              Die Altersverifikation in Schritt 2 muss abgeschlossen sein, bevor bestellt werden
              kann.
            </p>
          )}
        </Section>
      </div>

      {/* ── Summary ──────────────────────────────────────────────────────── */}
      <aside className="lg:sticky lg:top-28">
        <div className="glass rounded-lg p-5">
          <h2 className="text-base font-semibold">Deine Bestellung</h2>

          {isLoading ? (
            <p className="mt-4 flex items-center gap-2 text-sm text-fg-subtle">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Wird geladen…
            </p>
          ) : (
            <>
              <ul className="mt-4 space-y-3">
                {lines.map((line) => (
                  <li key={line.product.id} className="flex items-center gap-3">
                    <ProductVisual
                      hue={line.product.hue}
                      kind={line.product.kind}
                      className="size-10 shrink-0 rounded-sm"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs text-fg-muted">
                        {line.product.name}
                      </span>
                      <span className="font-mono text-2xs text-fg-subtle">{line.qty}×</span>
                    </span>
                    <span className="shrink-0 font-mono text-xs tabular">
                      {formatEur(line.lineTotalCents)}
                    </span>
                  </li>
                ))}
              </ul>

              <dl className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
                <div className="flex justify-between">
                  <dt className="text-fg-muted">Zwischensumme</dt>
                  <dd className="font-mono tabular">{formatEur(bundle.subtotalCents)}</dd>
                </div>
                {bundle.discountCents > 0 && (
                  <div className="flex justify-between text-accent">
                    <dt>{bundle.tier?.name}</dt>
                    <dd className="font-mono tabular">−{formatEur(bundle.discountCents)}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-fg-muted">Versand</dt>
                  <dd className={cn('font-mono tabular', shippingCents === 0 && 'text-accent')}>
                    {shippingCents === 0 ? 'Kostenlos' : formatEur(shippingCents)}
                  </dd>
                </div>
                <div className="flex justify-between border-t border-line pt-3 text-base font-medium">
                  <dt>Gesamt</dt>
                  <dd className="font-mono tabular">{formatEur(grandTotalCents)}</dd>
                </div>
              </dl>
              <p className="mt-2 text-2xs text-fg-subtle">inkl. 19 % USt.</p>
            </>
          )}

          <ul className="mt-5 space-y-2.5 border-t border-line pt-4">
            {[
              [Truck, 'Versand heute bei Bestellung bis 15 Uhr'],
              [ShieldCheck, 'Altersprüfung nach §10 JuSchG'],
              [Lock, 'SSL-verschlüsselte Übertragung'],
            ].map(([Icon, text]) => {
              const Component = Icon as React.ComponentType<{ className?: string }>;
              return (
                <li key={text as string} className="flex items-start gap-2 text-xs text-fg-subtle">
                  <Component className="mt-px size-3.5 shrink-0 text-accent" />
                  {text as string}
                </li>
              );
            })}
          </ul>
        </div>
      </aside>
    </form>
  );
}

function Section({
  index,
  title,
  children,
}: {
  index: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={`checkout-step-${index}`}>
      <div className="flex items-center gap-3">
        <span
          className="grid size-7 shrink-0 place-items-center rounded-full border border-accent/40 bg-accent-subtle font-mono text-xs text-accent"
          aria-hidden
        >
          {index}
        </span>
        <h2 id={`checkout-step-${index}`} className="text-xl font-semibold tracking-tight">
          {title}
        </h2>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function OrderConfirmation({ order }: { order: OrderResult }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="glass mx-auto max-w-xl rounded-lg p-8 text-center sm:p-10"
    >
      <div className="mx-auto grid size-14 place-items-center rounded-lg border border-accent/30 bg-accent-subtle">
        <PackageCheck className="size-6 text-accent" aria-hidden />
      </div>

      <h1 className="mt-6 text-2xl font-semibold tracking-tight">Bestellung bestätigt</h1>
      <p className="measure mx-auto mt-3 text-sm leading-relaxed text-fg-muted">
        Wir haben deine Bestellung erhalten und die Bestätigung per E-Mail verschickt. Die Ware
        verlässt unser Lager noch heute.
      </p>

      <dl className="mt-8 divide-y divide-line overflow-hidden rounded-md border border-line text-left">
        {[
          ['Bestellnummer', order.orderId],
          ['Gesamtbetrag', formatEur(order.totalCents)],
          ...(order.bundleTier
            ? [[`Rabatt (${order.bundleTier})`, `−${formatEur(order.discountCents)}`]]
            : []),
          ['Voraussichtliche Lieferung', order.estimatedDelivery],
          [
            'Pakete',
            order.routing.parcelCount === 1
              ? '1 Paket'
              : `${order.routing.parcelCount} Pakete (unterschiedliche Lager)`,
          ],
        ].map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-4 px-4 py-3">
            <dt className="text-sm text-fg-muted">{label}</dt>
            <dd className="text-right font-mono text-sm tabular">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button asChild variant="secondary">
          <Link href="/produkte">Weiter einkaufen</Link>
        </Button>
        <Button asChild>
          <Link href="/">Zur Startseite</Link>
        </Button>
      </div>

      <Badge className="mt-8">
        <ShieldCheck className="size-3" aria-hidden />
        Altersverifikation abgeschlossen
      </Badge>
    </motion.div>
  );
}
