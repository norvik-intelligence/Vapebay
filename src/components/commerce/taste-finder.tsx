'use client';

import * as React from 'react';
import { useMutation } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Cigarette,
  Flame,
  Grape,
  Leaf,
  RotateCcw,
  Snowflake,
  Sparkles,
  Wind,
  CupSoda,
  Candy,
} from 'lucide-react';

import type { TasteAnswers, TasteRecommendation } from '@/lib/recommend';
import { useCart } from '@/lib/store/cart';
import { cn, formatEur } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/misc';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ProductVisual } from './product-visual';

// ── Question definitions ───────────────────────────────────────────────────

const SMOKER_OPTIONS = [
  {
    value: 'umsteiger' as const,
    icon: Cigarette,
    label: 'Ich steige gerade um',
    hint: 'Aktuell noch Zigaretten, mindestens 10 pro Tag',
  },
  {
    value: 'gelegenheit' as const,
    icon: Wind,
    label: 'Nur gelegentlich',
    hint: 'Am Wochenende, beim Ausgehen',
  },
  {
    value: 'erfahren' as const,
    icon: Flame,
    label: 'Ich dampfe schon länger',
    hint: 'Ich kenne MTL, RDL und Widerstände',
  },
  {
    value: 'neugierig' as const,
    icon: Sparkles,
    label: 'Ich probiere es aus',
    hint: 'Noch kein Gerät, keine Vorerfahrung',
  },
];

const PROFILE_OPTIONS = [
  { value: 'fruchtig' as const, icon: Grape, label: 'Fruchtig', hint: 'Beeren, Melone, Mango' },
  { value: 'suess' as const, icon: Candy, label: 'Süß', hint: 'Bonbon, Dessert, Sirup' },
  { value: 'eis' as const, icon: Snowflake, label: 'Eis', hint: 'Menthol, Kühleffekt' },
  { value: 'minze' as const, icon: Leaf, label: 'Minze', hint: 'Pur, ohne Frucht' },
  { value: 'getraenk' as const, icon: CupSoda, label: 'Getränk', hint: 'Cola, Energy, Limo' },
  { value: 'tabak' as const, icon: Cigarette, label: 'Tabak', hint: 'Klassisch, trocken' },
];

const NICOTINE_OPTIONS = [
  { value: '20' as const, label: '20 mg/ml', hint: 'Umsteiger, ab 10 Zigaretten täglich' },
  { value: '10' as const, label: '10 mg/ml', hint: 'Der Standard für Pod-Systeme' },
  { value: '3' as const, label: '3 mg/ml', hint: 'Sehr mild, für Reduzierer' },
  { value: 'unsicher' as const, label: 'Weiß ich nicht', hint: 'Wir empfehlen dir eine Stärke' },
];

const STEP_COUNT = 3;

// ── Trigger ────────────────────────────────────────────────────────────────

export function TasteFinderTrigger({ className }: { className?: string }) {
  return (
    <TasteFinder>
      <Button variant="secondary" size="sm" className={cn('hidden sm:inline-flex', className)}>
        <Sparkles className="size-4" aria-hidden />
        Geschmack finden
      </Button>
    </TasteFinder>
  );
}

// ── The quiz ───────────────────────────────────────────────────────────────

export function TasteFinder({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState(0);
  const [smokerType, setSmokerType] = React.useState<TasteAnswers['smokerType'] | null>(null);
  const [profiles, setProfiles] = React.useState<TasteAnswers['profiles']>([]);
  const [nicotine, setNicotine] = React.useState<TasteAnswers['nicotine'] | null>(null);
  const addToCart = useCart((s) => s.add);

  const mutation = useMutation<TasteRecommendation, Error, TasteAnswers>({
    mutationFn: async (answers) => {
      const res = await fetch('/api/taste-finder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(answers),
      });
      if (!res.ok) throw new Error('Empfehlung konnte nicht geladen werden');
      return res.json();
    },
  });

  const reset = React.useCallback(() => {
    setStep(0);
    setSmokerType(null);
    setProfiles([]);
    setNicotine(null);
    mutation.reset();
  }, [mutation]);

  const toggleProfile = (value: TasteAnswers['profiles'][number]) => {
    setProfiles((current) =>
      current.includes(value)
        ? current.filter((p) => p !== value)
        // Cap at 3: beyond that the scoring stops discriminating and every
        // flavour matches something.
        : current.length >= 3
          ? current
          : [...current, value],
    );
  };

  const canAdvance =
    (step === 0 && smokerType !== null) ||
    (step === 1 && profiles.length > 0) ||
    (step === 2 && nicotine !== null);

  const advance = () => {
    if (step < STEP_COUNT - 1) {
      setStep((s) => s + 1);
      return;
    }
    if (smokerType && nicotine && profiles.length > 0) {
      mutation.mutate({ smokerType, profiles, nicotine });
    }
  };

  const addBundle = (rec: TasteRecommendation) => {
    const ids = [
      ...(rec.bundle.device ? [rec.bundle.device.id] : []),
      ...rec.bundle.pods.map((p) => p.id),
      ...rec.bundle.liquids.map((p) => p.id),
    ];
    ids.forEach((id) => addToCart(id));
    setOpen(false);
    toast.success('Set im Warenkorb', {
      description: `${ids.length} Artikel · ${formatEur(rec.bundle.savingsCents)} gespart`,
    });
  };

  const result = mutation.data;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        // Reset only after the close animation, so the content doesn't snap
        // back to step 1 while the dialog is still visible.
        if (!next) setTimeout(reset, 220);
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="max-w-2xl">
        <div className="p-6 sm:p-8">
          {!result ? (
            <>
              <div className="flex items-center justify-between gap-4">
                <p className="font-mono text-2xs uppercase tracking-wide text-fg-subtle">
                  Schritt {step + 1} von {STEP_COUNT}
                </p>
                <p className="font-mono text-2xs text-fg-subtle">~30 Sekunden</p>
              </div>
              <Progress
                value={((step + (canAdvance ? 1 : 0)) / STEP_COUNT) * 100}
                className="mt-3"
              />

              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="mt-7"
                >
                  {step === 0 && (
                    <StepShell
                      title="Welcher Rauchtyp bist du?"
                      description="Davon hängt ab, welche Hardware und welche Nikotinstärke wirklich zu dir passt."
                    >
                      <div className="grid gap-3 sm:grid-cols-2">
                        {SMOKER_OPTIONS.map((option) => (
                          <ChoiceTile
                            key={option.value}
                            icon={option.icon}
                            label={option.label}
                            hint={option.hint}
                            selected={smokerType === option.value}
                            onSelect={() => setSmokerType(option.value)}
                          />
                        ))}
                      </div>
                    </StepShell>
                  )}

                  {step === 1 && (
                    <StepShell
                      title="Süß, fruchtig oder eisig?"
                      description="Wähle bis zu drei Richtungen. Wir kombinieren sie zu passenden Profilen."
                    >
                      <div className="grid gap-3 sm:grid-cols-3">
                        {PROFILE_OPTIONS.map((option) => (
                          <ChoiceTile
                            key={option.value}
                            icon={option.icon}
                            label={option.label}
                            hint={option.hint}
                            selected={profiles.includes(option.value)}
                            disabled={!profiles.includes(option.value) && profiles.length >= 3}
                            onSelect={() => toggleProfile(option.value)}
                            multi
                          />
                        ))}
                      </div>
                      <p className="mt-4 text-xs text-fg-subtle" aria-live="polite">
                        {profiles.length} von 3 gewählt
                      </p>
                    </StepShell>
                  )}

                  {step === 2 && (
                    <StepShell
                      title="Wie viel Nikotin brauchst du?"
                      description="20 mg/ml ist die gesetzliche Höchstgrenze in der EU. Unsicher? Wir rechnen es aus deinem Rauchtyp aus."
                    >
                      <div className="grid gap-3 sm:grid-cols-2">
                        {NICOTINE_OPTIONS.map((option) => (
                          <ChoiceTile
                            key={option.value}
                            label={option.label}
                            hint={option.hint}
                            selected={nicotine === option.value}
                            onSelect={() => setNicotine(option.value)}
                            mono
                          />
                        ))}
                      </div>
                    </StepShell>
                  )}
                </motion.div>
              </AnimatePresence>

              {mutation.isError && (
                <p role="alert" className="mt-6 text-sm text-danger">
                  {mutation.error.message}. Bitte versuche es erneut.
                </p>
              )}

              <div className="mt-8 flex items-center justify-between gap-3">
                <Button
                  variant="ghost"
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                  disabled={step === 0}
                >
                  <ArrowLeft className="size-4" aria-hidden />
                  Zurück
                </Button>
                <Button onClick={advance} disabled={!canAdvance} loading={mutation.isPending}>
                  {step === STEP_COUNT - 1 ? 'Empfehlung anzeigen' : 'Weiter'}
                  {!mutation.isPending && <ArrowRight className="size-4" aria-hidden />}
                </Button>
              </div>
            </>
          ) : (
            <ResultView result={result} onRestart={reset} onAddBundle={() => addBundle(result)} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function StepShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <DialogTitle className="text-2xl">{title}</DialogTitle>
      <DialogDescription className="measure mt-2">{description}</DialogDescription>
      <div className="mt-6">{children}</div>
    </>
  );
}

function ChoiceTile({
  icon: Icon,
  label,
  hint,
  selected,
  disabled,
  onSelect,
  multi,
  mono,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  hint: string;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
  multi?: boolean;
  mono?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      // Radio/checkbox semantics so screen readers announce the selected state,
      // not just "button".
      role={multi ? 'checkbox' : 'radio'}
      aria-checked={selected}
      className={cn(
        'group relative flex flex-col gap-1.5 rounded-md border p-4 text-left transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
        selected
          ? 'border-accent bg-accent-subtle shadow-glow'
          : 'border-line bg-white/[0.02] hover:border-line-strong hover:bg-white/[0.05]',
        disabled && 'cursor-not-allowed opacity-40 hover:border-line hover:bg-white/[0.02]',
      )}
    >
      {selected && (
        <span className="absolute right-3 top-3 grid size-5 place-items-center rounded-full bg-accent">
          <Check className="size-3 text-accent-fg" aria-hidden />
        </span>
      )}
      {Icon && (
        <Icon
          className={cn(
            'size-5 transition-colors',
            selected ? 'text-accent' : 'text-fg-subtle group-hover:text-fg-muted',
          )}
        />
      )}
      <span className={cn('pr-6 text-sm font-medium', mono && 'font-mono tabular')}>{label}</span>
      <span className="text-xs leading-relaxed text-fg-subtle">{hint}</span>
    </button>
  );
}

function ResultView({
  result,
  onRestart,
  onAddBundle,
}: {
  result: TasteRecommendation;
  onRestart: () => void;
  onAddBundle: () => void;
}) {
  const items = [
    ...(result.bundle.device ? [result.bundle.device] : []),
    ...result.bundle.pods,
    ...result.bundle.liquids,
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <span className="inline-flex items-center gap-1.5 rounded-sm border border-accent/30 bg-accent-subtle px-2 py-0.5 font-mono text-2xs uppercase tracking-wide text-accent">
        <Sparkles className="size-3" aria-hidden />
        Dein Ergebnis
      </span>

      <DialogTitle className="mt-4 text-2xl">
        {result.drawStyle}-Zug mit {result.nicotineMg} mg/ml
      </DialogTitle>
      <DialogDescription className="measure mt-3 text-sm">{result.rationale}</DialogDescription>

      <div className="mt-6 flex flex-wrap gap-2">
        {result.matchedFlavours.map((flavour) => (
          <span
            key={flavour.slug}
            title={flavour.why}
            className="rounded-sm border border-line bg-white/[0.04] px-2.5 py-1 text-xs text-fg-muted"
          >
            {flavour.name}
          </span>
        ))}
      </div>

      <div className="mt-7 rounded-lg border border-line bg-white/[0.02] p-5">
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="text-sm font-medium">Dein Start-Set</h3>
          <p className="font-mono text-2xs text-fg-subtle">{items.length} Artikel</p>
        </div>

        <ul className="mt-4 space-y-2.5">
          {items.map((product) => (
            <li key={product.id} className="flex items-center gap-3">
              <ProductVisual
                hue={product.hue}
                kind={product.kind}
                className="size-10 shrink-0 rounded-sm"
              />
              <span className="min-w-0 flex-1 truncate text-sm text-fg-muted">{product.name}</span>
              <span className="shrink-0 font-mono text-xs tabular text-fg-subtle">
                {formatEur(product.priceCents)}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex items-end justify-between gap-4 border-t border-line pt-4">
          <div>
            {result.bundle.savingsCents > 0 && (
              <p className="font-mono text-xs text-fg-faint line-through tabular">
                {formatEur(result.bundle.subtotalCents)}
              </p>
            )}
            <p className="font-mono text-xl font-medium tabular">
              {formatEur(result.bundle.discountedCents)}
            </p>
          </div>
          {result.bundle.savingsCents > 0 && (
            <p className="text-xs font-medium text-accent">
              Du sparst {formatEur(result.bundle.savingsCents)}
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button variant="ghost" onClick={onRestart}>
          <RotateCcw className="size-4" aria-hidden />
          Nochmal
        </Button>
        <Button size="lg" onClick={onAddBundle}>
          Set in den Warenkorb
          <ArrowRight className="size-4" aria-hidden />
        </Button>
      </div>
    </motion.div>
  );
}
