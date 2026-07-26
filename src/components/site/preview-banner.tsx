import { FlaskConical } from 'lucide-react';

/**
 * Preview-Hinweis.
 *
 * Nur auf Vercel-Preview-Deployments. Zwei Dinge muss jemand wissen, der hier
 * klickt: es ist kein echter Shop, und die Datenbank liegt in /tmp der
 * jeweiligen Lambda-Instanz — Bestellungen und gespeicherte Admin-Regeln sind
 * nach dem nächsten Kaltstart weg. Ohne diesen Hinweis wirkt genau das wie ein
 * Fehler.
 *
 * Bewusst nicht schließbar: die Information gilt für jede Seite der Preview,
 * und ein weggeklickter Hinweis führt genau zu der Verwirrung, die er
 * verhindern soll. Dafür flach genug, um das Layout nicht zu dominieren.
 */
export function PreviewBanner() {
  return (
    <div className="border-b border-warning/25 bg-warning-subtle">
      <p className="container flex items-center gap-2 py-2 text-2xs leading-relaxed text-warning">
        <FlaskConical className="size-3.5 shrink-0" aria-hidden />
        <span>
          <strong className="font-medium">Preview-Deployment</strong> · Demo-Daten, keine echten
          Produkte. Bestellungen und Admin-Änderungen liegen in einer flüchtigen Datenbank und
          verschwinden beim nächsten Kaltstart.
        </span>
      </p>
    </div>
  );
}
