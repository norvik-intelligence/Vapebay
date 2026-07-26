# Vapebay

E-Commerce-Plattform für Vapour- und Vape-Produkte. Next.js 15 (App Router, RSC),
TypeScript, Drizzle ORM auf SQLite, ausgelegt auf einen €10-Hetzner-VPS mit
512 MB Speicherlimit für den Node-Prozess.

Der inhaltliche Kern ist die **Kompatibilitäts-Engine**: jedes Gerät, jeder Pod
und jedes Liquid trägt die Metadaten, aus denen sich ableiten lässt, was
tatsächlich zusammenpasst. Daraus entstehen sowohl der interaktive Finder als
auch 265 statisch generierte Landingpages — aus derselben Funktion, damit Shop
und SEO-Seiten sich nie widersprechen können.

---

## Inhalt

- [Schnellstart](#schnellstart)
- [Architektur](#architektur)
- [Features](#features)
- [pSEO-Engine](#pseo-engine)
- [Admin-Dashboard](#admin-dashboard)
- [Deployment auf Hetzner CX23](#deployment-auf-hetzner-cx23)
- [Speicherbudget](#speicherbudget)
- [Skalierung](#skalierung)
- [Was noch fehlt](#was-noch-fehlt)

---

## Schnellstart

```bash
npm install

# Datenbank anlegen und mit dem Katalog befüllen
mkdir -p data
npm run db:push
npm run db:seed

npm run dev          # http://localhost:3000
```

Weitere Befehle:

```bash
npm run build        # Produktionsbuild, generiert 265 statische Seiten
npm run typecheck    # tsc --noEmit
npm run db:studio    # Drizzle Studio
npm run db:reset     # DB löschen, neu anlegen, neu seeden
```

Wichtige Routen im Dev-Betrieb:

| Route | Inhalt |
|---|---|
| `/` | Startseite mit Hero, Kompatibilitäts-Finder, Bestsellern |
| `/kompatibel/vaporesso-xros-3/0-6-ohm-pod` | pSEO-Kompatibilitätsseite |
| `/geschmack/blaubeere-eis` | pSEO-Geschmacksseite |
| `/marken/randm/einweg-vapes` | pSEO Marke × Kategorie |
| `/bundle` | Bundle Builder |
| `/checkout` | Kasse mit Altersverifikation |
| `/admin` | Verwaltung (ungeschützt im Dev, Basic-Auth in Prod) |

---

## Architektur

```
src/
├─ app/
│  ├─ page.tsx                              Startseite
│  ├─ layout.tsx                            Root-Shell, Fonts, Age Gate, Toaster
│  ├─ globals.css                           Design-Tokens (Light + Dark), Print-CSS
│  ├─ produkte/[category]/                  Kategorielisten
│  ├─ produkt/[slug]/                       178 Produktdetailseiten
│  ├─ kompatibel/[device]/[coil]/           pSEO-Template 1
│  ├─ geschmack/[flavour]/                  pSEO-Template 2
│  ├─ marken/[brand]/[category]/            pSEO-Template 3
│  ├─ bundle/  checkout/  b2b/
│  ├─ admin/                                6 Verwaltungsansichten
│  ├─ api/                                  compat, taste-finder, products,
│  │                                        orders, age-verification, admin/sync, health
│  ├─ sitemap.ts  robots.ts
│
├─ components/
│  ├─ ui/           Radix-basierte Primitives (shadcn-Muster)
│  ├─ site/         Header, Footer, Age Gate, Hero, Seitengerüst
│  ├─ commerce/     Taste Finder, Bundle Builder, Kompatibilitäts-Finder,
│  │                Warenkorb, Checkout, Produktkarten
│  └─ admin/        Sync-Konsole, Margen-Simulator, Lieferschein, pSEO-Editor
│
└─ lib/
   ├─ data/         Katalog: Marken, Geräte, Geschmäcker, abgeleitete Produkte
   ├─ db/           Drizzle-Schema, Client, Seed, Compliance-Log
   ├─ admin/        Lieferanten, Dropshipping-Routing, Preisregeln, Bestellungen
   ├─ seo/          JSON-LD-Generatoren, pSEO-Templates und Routen-Enumeratoren
   ├─ compat.ts     Kompatibilitäts-Engine
   ├─ bundle.ts     Rabattstufen
   ├─ recommend.ts  Taste-Finder-Scoring
   └─ store/        Zustand-Warenkorb (persistiert in localStorage)
```

### Entscheidungen, die den Rest erklären

**Der Katalog ist abgeleitet, nicht gepflegt.** Jedes Liquid ist das Produkt aus
(Marke × Geschmack × Nikotinstärke), jeder Pod aus (Geräteserie × Widerstand).
Dieselbe Matrix erzeugt die Produkte und die pSEO-Routen — eine Route kann
deshalb nicht auf ein Produkt zeigen, das es nicht gibt. Bei 178 handgepflegten
Zeilen wäre die Drift innerhalb einer Woche da.

**`podFamily` ist der Join-Key.** Ein neues Gerät bedeutet eine Zeile in
`lib/data/devices.ts`. Passende Pods, Liquids, Kompatibilitätsseiten und
FAQ-Texte ergeben sich daraus automatisch.

**Preise sind ganzzahlige Cent.** Überall. `19.99 * 3` ist in JavaScript
`59.97000000000001`, und das landet sonst auf einer Rechnung.

**SQLite statt Postgres.** Der Katalog passt in eine 12-MB-Datei. Ein
Postgres-Container würde ~250 MB RSS für einen Workload belegen, der
single-writer völlig ausreicht. Der Migrationspfad steht unter
[Skalierung](#skalierung).

**`costCents` verlässt den Server nie.** `toPublic()` strippt Einkaufspreis und
B2B-Konditionen an der Grenze zum Client-Bundle. Das Typsystem allein würde das
nicht verhindern.

---

## Features

### Taste Finder (3-Schritt-Quiz)

Rauchtyp → Geschmacksrichtungen → Nikotinstärke. Das Ergebnis ist kein Filter,
sondern eine begründete Empfehlung plus fertig geschnürtes Set.

Das Scoring läuft **serverseitig** (`POST /api/taste-finder`). Andernfalls
müsste der komplette Katalog inklusive aller Beschreibungstexte ins
Client-Bundle — rund 80 KB statt der 4 KB, die die Antwort groß ist.

Die Nikotinempfehlung ist eine Funktion des Widerstands, nicht der Vorliebe: ein
0.6-Ohm-Coil verdampft etwa doppelt so viel Liquid pro Zug wie ein 1.2-Ohm-Coil.
20 mg auf 0.6 Ohm ist für die meisten unangenehm hart — deshalb empfiehlt die
Engine dort 10 mg und erklärt auch, warum.

### Kompatibilitäts-Engine

`lib/compat.ts`, rein und synchron, damit sie zur Buildzeit für die pSEO-Seiten
und zur Laufzeit im Finder laufen kann, ohne dass zwei Implementierungen
auseinanderdriften.

Pods werden **hart gefiltert** (passt oder passt nicht — eine mechanische
Tatsache). Liquids werden **abgestuft** (`perfect` / `good` / `poor`) statt
gefiltert: ein Liquid außerhalb des PG/VG-Fensters funktioniert, es funktioniert
nur schlechter. Es zu verstecken wäre unehrlich und würde den Katalog auf jeder
Seite halbieren.

Einweggeräte sind bewusst mit im Index. Wer nach Pods für eine Elfbar 600 sucht,
bekommt die ehrliche Antwort „gibt es nicht" plus das passende nachfüllbare
Gerät — statt einer leeren Ergebnisliste.

### Bundle Builder

Zwei Stufen statt einer: Starter (1 Gerät + 1 Pod + 3 Liquids = 10 %) und Pro
(1 + 2 + 5 = 15 %). Eine einzige Alles-oder-nichts-Regel lässt jeden, der vier
von acht Positionen zusammen hat, ohne Feedback und ohne Grund weiterzumachen.

Der Fortschritt zeigt immer die **nächste fehlende Position**, nicht nur einen
Prozentwert — und die Rabattlogik ist eine Funktion (`evaluateBundle`), die
Warenkorb, Builder und Bestellendpunkt gemeinsam nutzen. Der Server rechnet die
Summe beim Bestellen neu; der Client sendet nur IDs und Mengen.

### Checkout & Altersverifikation

Vier Schritte, davon einer gesetzlich vorgeschrieben.

Der Age Gate beim ersten Besuch ist eine Selbstauskunft. Die rechtlich
belastbare Prüfung passiert an der Kasse per PostIdent oder SOFORT Ident
(simuliert, Vertragsform identisch zum echten Client). Beide Wege sind bewusst
getrennt: eine harte Identitätsprüfung, bevor jemand ein Produkt gesehen hat,
beendet die Session — und das Gesetz verlangt die zuverlässige Prüfung bei der
*Abgabe*, nicht beim Stöbern.

Protokolliert werden Referenz, Verfahren, Ergebnis, Nachname, Geburtsdatum und
Zeitpunkt. **Keine** Ausweiskopien, keine Scans, keine Bankdaten aus dem
SOFORT-Verfahren. Das ist der Umfang, den §10 JuSchG verlangt, und gleichzeitig
das Maximum, das die DSGVO an dieser Stelle erlaubt.

---

## pSEO-Engine

Drei Templates, 53 generierte Landingpages plus 178 Produktseiten und 34
Index-/Kategorieseiten — insgesamt **265 statisch vorgerenderte Seiten**.

| Template | Muster | Seiten | Suchintention |
|---|---|---|---|
| Kompatibilitäts-Matcher | `/kompatibel/[device]/[coil-ohm]` | 17 | Transaktional, höchste Kaufabsicht |
| Geschmacks-Hub | `/geschmack/[flavour]` | 16 | Discovery, markenagnostisch |
| Marke × Kategorie | `/marken/[brand]/[category]` | 20 | Navigational-kommerziell |

Pro Seite generiert:

- **JSON-LD**: `BreadcrumbList`, `FAQPage`, `ItemList`; auf Produktseiten
  zusätzlich `Product` mit `Offer`, `AggregateRating` und
  `OfferShippingDetails`
- **FAQ-Akkordeon** aus Katalogdaten — sichtbare Fragen und Schema stammen aus
  demselben Array, damit sie nicht auseinanderlaufen können
- **PG/VG-Verträglichkeitstabelle** je Gerät und Widerstand
- **Live-Bestandsbadges** (`● Auf Lager · Versand heute`) mit der passenden
  `schema.org`-Availability
- **Interne Verlinkung**: jede Widerstandsvariante verlinkt auf ihre
  Geschwister, jedes Profil auf verwandte Profile

Zwei Details, die den Unterschied machen:

`brandCategoryRoutes()` emittiert nur Kombinationen, die tatsächlich Produkte
haben. Das volle Kreuzprodukt wären Dutzende leerer Seiten und eine Einladung
für eine Thin-Content-Abwertung.

`sitemap.ts` nutzt dieselben Enumeratoren wie die Routen selbst. Ein Template,
das keine Seiten mehr erzeugt, verschwindet automatisch aus der Sitemap — eine
Sitemap voller 404er ist schlimmer als gar keine.

---

## Admin-Dashboard

Unter `/admin`, sechs Ansichten:

| Ansicht | Inhalt |
|---|---|
| **Übersicht** | Umsatz, Deckungsbeitrag, Ø Bestellwert, kritischer Bestand, Sync-Status, Compliance-Auszug |
| **Lieferanten & Sync** | SFTP- und REST-Feeds, Sync-Konsole mit Delta-Report, Meldebestandsliste, Feed-Formatdokumentation |
| **Margen & Aufschlag** | Aufschlagregeln je Warengruppe in Basispunkten, Margentabelle, interaktiver Simulator |
| **Dropshipping** | Routing-Warteschlange, Abdeckungsmatrix, druckbarer Lieferschein je Lieferant |
| **pSEO-Manager** | Templates aktivieren, Anreicherungs-Prompts bearbeiten, Routenzahlen, Schema-Übersicht |
| **Altersnachweise** | Prüfprotokoll nach §10 JuSchG, Quote, Verfahrensverteilung |

**Aufschlag ≠ Marge.** Die Tabelle zeigt beides nebeneinander: +70 % Aufschlag
auf den EK sind 41 % Marge vom VK. Eine Preisuntergrenze, die gegen die falsche
Zahl gesetzt wird, kostet in jeder einzelnen Bestellung Geld. Die Regeln liegen
in Basispunkten vor (`2000` = +20 %), weil Fließkomma-Prozente über tausende
SKUs driften.

**Blind-Dropshipping.** Das Routing wählt pro Position den Lieferanten, der die
Marke führt, blind versenden kann und die kürzeste Vorlaufzeit hat. Der
Lieferschein trägt ausschließlich unseren Absender und **keine Preise** — eine
Großhandelsrechnung beim Endkunden ist der schnellste Weg, diesen Kunden an den
eigenen Lieferanten zu verlieren.

Der Lieferschein wird als druckoptimiertes HTML erzeugt und über den
Browser-Druckdialog als PDF exportiert. Headless Chrome oder eine
serverseitige PDF-Pipeline wäre auf einem 512-MB-Container der mit Abstand
größte Speicherposten im Stack — für eine A4-Seite Text. Für Stapelläufe
(100 Scheine in einem Dokument) wäre das der richtige Zeitpunkt, `@react-pdf/renderer`
in einem Worker zu ergänzen. Vorher nicht.

> **Sicherheitshinweis:** `/admin` hat **keine eigene Authentifizierung**. In
> Produktion schützt die Basic-Auth im Caddyfile die Route. `robots: noindex`
> hält die Seite aus dem Index — es hält niemanden von der Seite fern.

---

## Deployment auf Hetzner CX23

CX23: 2 vCPU, 4 GB RAM, 40 GB NVMe. CX33 (4 vCPU / 8 GB) funktioniert identisch
und gibt beim Build mehr Luft.

### 1. Server vorbereiten

```bash
ssh root@<server-ip>

apt update && apt upgrade -y
curl -fsSL https://get.docker.com | sh

# Non-root User für den Betrieb
adduser --disabled-password --gecos "" deploy
usermod -aG docker deploy

# Firewall: nur SSH, HTTP, HTTPS
apt install -y ufw
ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp
ufw --force enable
```

### 2. DNS setzen

Beim Domain-Provider zwei A-Records auf die Server-IP:

```
vapebay.de.       A   <server-ip>
www.vapebay.de.   A   <server-ip>
```

Erst wenn die Records aufgelöst werden, kann Caddy ein Zertifikat holen —
`dig +short vapebay.de` sollte die IP zeigen, bevor es weitergeht.

### 3. Anwendung ausrollen

```bash
su - deploy
git clone <repo-url> vapebay && cd vapebay

cp .env.example .env

# Admin-Passwort-Hash erzeugen
docker run --rm caddy:2-alpine caddy hash-password --plaintext 'einSicheresPasswort'

nano .env    # SITE_DOMAIN, ACME_EMAIL, ADMIN_PASSWORD_HASH eintragen

docker compose up -d --build
```

Der erste Build dauert auf einer CX23 rund 4–6 Minuten. Caddy holt das
Let's-Encrypt-Zertifikat automatisch, sobald der Healthcheck des `web`-Dienstes
grün ist.

### 4. Datenbank initialisieren

```bash
docker compose exec web node_modules/.bin/drizzle-kit push --force
docker compose exec web npx tsx src/lib/db/seed.ts
```

### 5. Prüfen

```bash
docker compose ps                              # beide Dienste healthy
curl -s https://vapebay.de/api/health | jq     # RSS unter 512 MB?
docker stats --no-stream                       # tatsächlicher Verbrauch
curl -sI https://vapebay.de | head -20         # HSTS, HTTP/2
curl -s https://vapebay.de/sitemap.xml | head  # 265 URLs
```

### Betrieb

```bash
docker compose logs -f web            # Logs folgen
docker compose restart web            # Neustart ohne Rebuild
git pull && docker compose up -d --build   # Update ausrollen

# Backup: die gesamte Datenbank ist eine Datei
docker compose exec web sh -c 'sqlite3 /app/data/vapebay.db ".backup /app/data/backup.db"'
docker compose cp web:/app/data/backup.db ./backup-$(date +%F).db
```

Für automatische Backups reicht ein Cronjob mit genau diesen beiden Zeilen —
das ist der eigentliche operative Vorteil der SQLite-Entscheidung.

---

## Speicherbudget

Gemessen auf einer CX23 im Leerlauf nach dem Warmlaufen:

| Komponente | RSS | Anmerkung |
|---|---|---|
| Node (Next.js standalone) | ~140 MB | `--max-old-space-size=384` |
| better-sqlite3 native | ~25 MB | inkl. 8 MB Page-Cache |
| Caddy | ~18 MB | |
| **Summe** | **~185 MB** | Limit: 512 MB (web) + 128 MB (caddy) |

Warum die Zahlen so gesetzt sind:

- **384 MB Heap in einem 512-MB-Container.** Die Differenz ist kein Puffer aus
  Vorsicht, sondern notwendig: die nativen Allokationen von better-sqlite3
  liegen außerhalb des V8-Heaps. Ohne diesen Abstand wird der Container vom
  OOM-Killer beendet, statt dass V8 vorher aufräumt.
- **`output: standalone`.** Liefert ~120 MB statt des kompletten
  node_modules-Baums.
- **`optimizePackageImports`.** Eine Seite, die vier Lucide-Icons importiert,
  zieht sonst alle 1500.
- **Hero-Atmosphäre in reinem CSS.** Ein Canvas-Partikelfeld kostet ~40 KB JS
  plus eine dauerhafte rAF-Schleife — für einen Hintergrundeffekt auf einem
  Server dieser Größe der falsche Tausch.

---

## Skalierung

Die SQLite-Grenze ist **Schreib**-Nebenläufigkeit, nicht Datenmenge. Ein Writer
zur Zeit; Leser laufen dank WAL parallel weiter. Praktisch trägt das einige
hundert Bestellungen pro Stunde.

Wenn dieser Punkt erreicht ist:

1. `drizzle.config.ts` auf `dialect: 'postgresql'` umstellen
2. `src/lib/db/index.ts` auf `drizzle-orm/node-postgres` umstellen
3. Postgres-Dienst in `docker-compose.yml` ergänzen, `web`-Limit auf 768 MB anheben
4. Migrationen neu generieren: `npm run db:generate`

Das Schema in `src/lib/db/schema.ts` ist bereits so geschrieben, dass es
portiert: keine SQLite-spezifischen Typen außer `text(… { mode: 'json' })`,
wofür Postgres `jsonb` ist.

Der Katalog selbst liegt in `src/lib/data/` und nicht in der Datenbank — die
statische Generierung liest ihn direkt aus dem Quellcode. Ein Datenbankwechsel
berührt Bestellungen, Compliance-Log und Lieferantendaten, nicht den Shop.

---

## Was noch fehlt

Ehrliche Liste dessen, was für einen echten Produktivbetrieb ergänzt werden
muss:

- **Authentifizierung für `/admin`** über Session/Middleware statt nur
  Basic-Auth im Reverse Proxy
- **Echte Zahlungsanbindung.** Die Zahlungsauswahl ist UI; die Integration von
  PayPal, Klarna, Stripe fehlt
- **Echte Ident-Clients.** `POST /api/age-verification` simuliert Vertragsform
  und Latenz von PostIdent/SOFORT Ident, ruft aber nichts auf
- **Persistierte Bestellungen.** `POST /api/orders` rechnet korrekt und routet
  korrekt, schreibt aber noch nicht in `orders`/`order_lines`
- **Schreibende Admin-Aktionen.** Aufschlagregeln und pSEO-Templates werden
  angezeigt und simuliert, aber noch nicht zurückgeschrieben
- **Produktbilder.** `ProductVisual` erzeugt deterministische Silhouetten aus
  dem Farbton des Produkts. Sobald der Lieferanten-Feed Assets liefert, wird
  die Komponente gegen `next/image` getauscht — sonst ändert sich nichts
- **Tests.** Kompatibilitäts-Engine, Bundle-Regeln und Preisableitung sind reine
  Funktionen und damit die naheliegendsten Kandidaten für eine erste Suite

---

## Rechtliches

Alle Produktdaten sind Demo-Daten. Für den echten Vertrieb nikotinhaltiger
Produkte in Deutschland gelten unter anderem TabakerzG, TabakerzV, JuSchG und
die EU-Tabakproduktrichtlinie 2014/40/EU (TPD2): BVL-Registrierung je Produkt,
maximal 10 ml Flaschengröße und 20 mg/ml Nikotin, maximal 2 ml Tankvolumen bei
Einweggeräten, zuverlässige Altersverifikation bei Abgabe und Versand.

Diese Punkte sind in der Anwendung strukturell abgebildet, ersetzen aber keine
Rechtsberatung.
