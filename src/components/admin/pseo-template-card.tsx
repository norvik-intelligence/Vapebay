'use client';

import * as React from 'react';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ExternalLink, RotateCcw, Save, Sparkles } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/misc';
import { Label } from '@/components/ui/input';

export interface PseoTemplateView {
  id: string;
  name: string;
  pattern: string;
  example: string;
  intent: string;
  enrichmentPrompt: string;
  enabled: boolean;
  routeCount: number;
}

/**
 * Template editor.
 *
 * Saving persists to `pseo_templates`. Toggling a template off does not
 * un-build its pages — they are statically generated, so the switch takes
 * effect on the next build. The copy says so explicitly rather than letting a
 * merchant believe they just deindexed 17 pages.
 */
export function PseoTemplateCard({ template }: { template: PseoTemplateView }) {
  const [enabled, setEnabled] = React.useState(template.enabled);
  const [prompt, setPrompt] = React.useState(template.enrichmentPrompt);
  // Track the last persisted values, not the initial props, so a successful
  // save clears the dirty flag without a page reload.
  const [saved, setSaved] = React.useState({
    prompt: template.enrichmentPrompt,
    enabled: template.enabled,
  });
  const dirty = prompt !== saved.prompt || enabled !== saved.enabled;

  const variables = [...prompt.matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1]);

  const save = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/admin/pseo', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: template.id, enrichmentPrompt: prompt, enabled }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Speichern fehlgeschlagen');
      return data as { note: string };
    },
    onSuccess: (data) => {
      setSaved({ prompt, enabled });
      toast.success('Template gespeichert', { description: data.note });
    },
    onError: (error: Error) => toast.error('Nicht gespeichert', { description: error.message }),
  });

  return (
    <article className={cn('glass rounded-lg', !enabled && 'opacity-70')}>
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-base font-semibold">{template.name}</h3>
            <span className="rounded-sm border border-accent/30 bg-accent-subtle px-2 py-0.5 font-mono text-2xs text-accent">
              {enabled ? template.routeCount : 0} Seiten
            </span>
          </div>
          <p className="mt-1.5 font-mono text-xs text-fg-muted">{template.pattern}</p>
        </div>

        <div className="flex items-center gap-3">
          <Label htmlFor={`toggle-${template.id}`} className="text-xs text-fg-muted">
            Aktiv
          </Label>
          <Switch
            id={`toggle-${template.id}`}
            checked={enabled}
            onCheckedChange={setEnabled}
            aria-label={`${template.name} aktivieren`}
          />
        </div>
      </header>

      <div className="space-y-5 p-5">
        <div>
          <p className="text-2xs font-medium uppercase tracking-wide text-fg-subtle">Suchintention</p>
          <p className="measure mt-1.5 text-xs leading-relaxed text-fg-muted">{template.intent}</p>
        </div>

        <div>
          <p className="text-2xs font-medium uppercase tracking-wide text-fg-subtle">Beispielroute</p>
          <Link
            href={template.example}
            className="mt-1.5 inline-flex items-center gap-1.5 font-mono text-xs text-accent hover:underline"
          >
            {template.example}
            <ExternalLink className="size-3" aria-hidden />
          </Link>
        </div>

        <div>
          <Label htmlFor={`prompt-${template.id}`} className="flex items-center gap-2">
            <Sparkles className="size-3.5 text-accent" aria-hidden />
            Prompt für KI-Textanreicherung
          </Label>
          <p className="mt-1.5 text-2xs text-fg-subtle">
            Platzhalter in doppelten geschweiften Klammern werden pro Route aus den Katalogdaten
            ersetzt.
          </p>
          <textarea
            id={`prompt-${template.id}`}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            className={cn(
              'mt-2.5 w-full resize-y rounded-md border border-line bg-white/[0.03] p-3.5 text-sm leading-relaxed',
              'focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30',
            )}
          />
          {variables.length > 0 && (
            <ul className="mt-2.5 flex flex-wrap gap-1.5">
              {variables.map((variable) => (
                <li
                  key={variable}
                  className="rounded-sm border border-line bg-white/[0.04] px-2 py-0.5 font-mono text-2xs text-fg-subtle"
                >
                  {`{{${variable}}}`}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" disabled={!dirty} loading={save.isPending} onClick={() => save.mutate()}>
            {!save.isPending && <Save className="size-4" aria-hidden />}
            Speichern
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={!dirty || save.isPending}
            onClick={() => {
              setPrompt(saved.prompt);
              setEnabled(saved.enabled);
            }}
          >
            <RotateCcw className="size-4" aria-hidden />
            Zurücksetzen
          </Button>
          {dirty && (
            <span className="text-2xs text-warning" role="status">
              Ungespeicherte Änderungen
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
