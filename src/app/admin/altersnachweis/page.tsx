import type { Metadata } from 'next';
import { FileClock, ShieldCheck } from 'lucide-react';

import { listVerifications } from '@/lib/db/compliance';
import { AdminHeader, Panel, StatTile, StatusPill, TableWrap } from '@/components/admin/primitives';

export const metadata: Metadata = { title: 'Altersnachweise' };

// Compliance data must never be served from a cache.
export const dynamic = 'force-dynamic';

export default function AgeVerificationPage() {
  const entries = listVerifications(100);
  const verified = entries.filter((e) => e.status === 'verified').length;
  const rejected = entries.filter((e) => e.status === 'rejected').length;
  const passRate = entries.length === 0 ? 0 : (verified / entries.length) * 100;

  const byProvider = {
    postident: entries.filter((e) => e.provider === 'postident').length,
    sofort: entries.filter((e) => e.provider === 'sofort').length,
  };

  return (
    <>
      <AdminHeader
        title="Altersnachweise"
        description="Protokoll aller durchgeführten Identitätsprüfungen nach §10 JuSchG und §11 TabakerzG. Gespeichert werden ausschließlich Prüfergebnis, Verfahren und Zeitpunkt — keine Ausweisdaten und keine Ausweiskopien."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Prüfungen gesamt" value={String(entries.length)} sub="im Protokoll" />
        <StatTile label="Bestanden" value={String(verified)} sub={`${passRate.toFixed(0)} % Quote`} tone="accent" />
        <StatTile
          label="Abgelehnt"
          value={String(rejected)}
          sub="Verkauf verweigert"
          tone={rejected > 0 ? 'warning' : 'neutral'}
        />
        <StatTile
          label="Verfahren"
          value={`${byProvider.sofort} / ${byProvider.postident}`}
          sub="SOFORT / PostIdent"
        />
      </div>

      <Panel
        title="Prüfprotokoll"
        description="Absteigend nach Prüfzeitpunkt. Aufbewahrungsfrist: 6 Jahre nach §147 AO."
        className="mt-6"
      >
        {entries.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-12 text-center">
            <span className="grid size-12 place-items-center rounded-lg border border-line bg-white/[0.03]">
              <FileClock className="size-5 text-fg-subtle" aria-hidden />
            </span>
            <p className="text-sm font-medium">Noch keine Prüfungen protokolliert</p>
            <p className="measure text-xs leading-relaxed text-fg-muted">
              Der Log füllt sich, sobald an der Kasse eine Altersverifikation durchlaufen wird.
              Schließe eine Testbestellung ab, um den Ablauf zu sehen.
            </p>
          </div>
        ) : (
          <TableWrap>
            <table className="w-full min-w-[44rem] text-sm">
              <caption className="sr-only">Protokoll der Altersverifikationen</caption>
              <thead>
                <tr className="border-b border-line text-left text-2xs uppercase tracking-wide text-fg-subtle">
                  <th scope="col" className="px-5 py-3 font-medium">Referenz</th>
                  <th scope="col" className="px-5 py-3 font-medium">Verfahren</th>
                  <th scope="col" className="px-5 py-3 font-medium">Nachname</th>
                  <th scope="col" className="px-5 py-3 font-medium">Geburtsjahr</th>
                  <th scope="col" className="px-5 py-3 font-medium">Zeitpunkt</th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">Ergebnis</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {entries.map((entry) => (
                  <tr key={entry.reference}>
                    <th scope="row" className="px-5 py-3 text-left font-mono text-xs font-normal">
                      {entry.reference}
                    </th>
                    <td className="px-5 py-3 text-xs text-fg-muted">
                      {entry.provider === 'postident' ? 'PostIdent' : 'SOFORT Ident'}
                    </td>
                    <td className="px-5 py-3 text-xs">{entry.lastName}</td>
                    {/* Only the year: the full date is not needed to prove the
                        check was performed, and data minimisation is a DSGVO
                        requirement, not a nicety. */}
                    <td className="px-5 py-3 font-mono text-xs tabular text-fg-muted">
                      {entry.birthDate.slice(0, 4)}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-fg-muted">
                      {new Date(entry.checkedAt).toLocaleString('de-DE')}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <StatusPill status={entry.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </Panel>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="glass rounded-lg p-5">
          <h2 className="flex items-center gap-2 text-sm font-medium">
            <ShieldCheck className="size-4 text-accent" aria-hidden />
            Was gespeichert wird
          </h2>
          <ul className="mt-3 space-y-2 text-xs leading-relaxed text-fg-muted">
            <li>Referenznummer des Prüfvorgangs beim Anbieter</li>
            <li>Verfahren (PostIdent oder SOFORT Ident)</li>
            <li>Ergebnis: bestanden oder abgelehnt</li>
            <li>Nachname und Geburtsdatum zur Zuordnung zur Bestellung</li>
            <li>Zeitpunkt der Prüfung</li>
          </ul>
        </div>

        <div className="glass rounded-lg p-5">
          <h2 className="text-sm font-medium">Was nicht gespeichert wird</h2>
          <ul className="mt-3 space-y-2 text-xs leading-relaxed text-fg-muted">
            <li>Keine Ausweiskopien, keine Scans, keine Lichtbilder</li>
            <li>Keine Ausweisnummer und keine ausstellende Behörde</li>
            <li>Keine Bankdaten aus dem SOFORT-Ident-Verfahren</li>
            <li>Keine Videoaufzeichnung des PostIdent-Vorgangs</li>
          </ul>
          <p className="mt-4 text-2xs leading-relaxed text-fg-subtle">
            Diese Daten verbleiben beim Prüfdienstleister als Auftragsverarbeiter. Wir erhalten
            ausschließlich das Ergebnis — das ist der Umfang, den §10 JuSchG verlangt, und
            gleichzeitig das Minimum, das die DSGVO erlaubt.
          </p>
        </div>
      </div>
    </>
  );
}
