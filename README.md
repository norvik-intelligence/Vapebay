# Vapebay

E-Commerce-Plattform für Vapour- und Vape-Produkte. Next.js 15 (App Router, RSC),
TypeScript, Drizzle ORM auf SQLite, ausgelegt auf einen €10-Hetzner-VPS mit
512 MB Speicherlimit für den Node-Prozess.

Der inhaltliche Kern ist die **Kompatibilitäts-Engine**: jedes Gerät, jeder Pod
und jedes Liquid trägt die Metadaten, aus denen sich ableiten lässt, was
tatsächlich zusammenpasst. Daraus entstehen sowohl der interaktive Finder als
auch 269 statisch generierte Landingpages — aus derselben Funktion, damit Shop
und SEO-Seiten sich nie widersprechen können.

---

## Inhalt

- [Schnellstart](#schnellstart)
- [Architektur](#architektur)
- [Features](#features)
- [pSEO-Engine](#pseo-engine)
- [Admin-Dashboard](#admin-dashboard)
- [Tests](#tests)
- [CI auf GitHub](#ci-auf-github)
- [Deployment auf Vercel (Preview)](#deployment-auf-vercel-preview)
- [Deployment auf Hetzner CX23](#deployment-auf-hetzner-cx23)
- [Speicherbudget](#speicherbudget)
- [Skalierung](#skalierung)
- [Was noch fehlt](#was-noch-fehlt)

---

## Schnellstart

```bash
npm install
npm run dev          # http://localhost:3000
```

Die Datenbank legt sich beim ersten Zugriff selbst an: fehlt sie, spielt der
Server das Schema aus `drizzle/` ein und befüllt es aus dem Katalog. Das ist
derselbe Pfad, den ein Vercel-Kaltstart und ein frisches Docker-Volume
durchlaufen — kein Sonderweg für die Entwicklung.

Für `/admin` werden zwei Werte gebraucht — ohne sie bleibt das Panel gesperrt,
und das ist beabsichtigt:

```bash
# Session-Secret
openssl rand -hex 32

# Passwort-Hash (SHA-256, hex — nicht das Klartextpasswort)
node -e "crypto.subtle.digest('SHA-256',new TextEncoder()\
  .encode('deinPasswort')).then(h=>console.log(Buffer.from(h).toString('hex')))"
```

Beides in `.env` als `ADMIN_SESSION_SECRET` und `ADMIN_PASSWORD` eintragen.

Weitere Befehle:

```bash
npm run build        # Produktionsbuild, generiert 269 statische Seiten
npm run typecheck    # tsc --noEmit
npm run test         # Vitest, 112 Tests
npm run test:coverage
npm run test:e2e     # Playwright, 15 Flows (erst `npm run build` ausführen)
npm run db:studio    # Drizzle Studio
npm run db:seed      # Katalogstand auffrischen (Preise, Bestände, Templates)
npm run db:reset     # DB löschen und neu aufbauen
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
| `/admin` | Verwaltung (Login-gesperrt, siehe unten) |

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
│  │                                        orders, age-verification, health,
│  │                                        admin/{sync,login,markup}
│  ├─ middleware.ts (src/)                  Session-Gate für /admin + /api/admin
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
   ├─ db/           Drizzle-Schema, Client, Seed, Bestellungen,
   │                Compliance-Log, Preisregeln
   ├─ admin/        Lieferanten, Dropshipping-Routing, Preisregeln,
   │                Bestellungen, Session-Auth
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
Index-/Kategorieseiten — insgesamt **269 statisch vorgerenderte Seiten**.

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

### Zugriffsschutz

Zwei unabhängige Schichten, beide nötig:

1. **Anwendungs-Session** (`src/middleware.ts`). Signiertes HttpOnly-Cookie,
   HMAC-SHA256 über die Ablaufzeit, 12 Stunden gültig, Vergleich in konstanter
   Zeit. Ohne gesetztes `ADMIN_SESSION_SECRET` bleibt das Panel gesperrt — die
   Prüfung schlägt fehl *geschlossen*, nie offen. `/api/admin/*` antwortet mit
   401 statt mit einem Redirect, den ein API-Client nicht befolgen kann.
2. **Basic-Auth im Reverse Proxy** (`Caddyfile`). Verhindert, dass Next.js
   überhaupt erreicht wird.

Keine der beiden ersetzt die andere: Schicht 1 greift auch dann, wenn der Proxy
falsch konfiguriert oder umgangen wird; Schicht 2 hält Traffic ab, bevor er die
Anwendung kostet. `robots: noindex` hält die Seite aus dem Index — es hält
niemanden von der Seite fern.

Das Passwort liegt als SHA-256-Hex in `ADMIN_PASSWORD`, nicht im Klartext. Das
ist kein Ersatz für eine langsame KDF: SHA-256 ist schnell genug, um ein
schwaches Passwort offline durchzuprobieren. Deshalb ein generiertes Passwort
verwenden, kein selbst ausgedachtes.

---

## Tests

112 Tests über Vitest, alles reine Funktionen — kein DOM, Laufzeit unter zwei
Sekunden.

| Datei | Deckt ab |
|---|---|
| `lib/data/devices.test.ts` | Slug-Round-Trip, Registry-Integrität, Routen-Enumeration |
| `lib/compat.test.ts` | Nikotinempfehlung, Pod-Filterung über Gerätefamilien, Liquid-Abstufung |
| `lib/bundle.test.ts` | Rabattstufen, Fortschritt, Cent-Arithmetik |
| `lib/data/catalog.test.ts` | TPD2-Grenzen, Determinismus, EK-Leck-Schutz |
| `lib/recommend.test.ts` | Taste-Finder-Scoring, Bestandsfilter, Payload-Sicherheit |
| `lib/admin/pricing.test.ts` | Charm-Pricing, Preisuntergrenze, Aufschlag ≠ Marge |
| `lib/admin/auth.test.ts` | Signaturprüfung, Ablauf, Fail-closed ohne Secret |
| `lib/db/bootstrap.test.ts` | Kaltstart: Schema + Seed aus dem Nichts, Idempotenz |
| `lib/env.test.ts` | Indexierbarkeit je Deployment-Umgebung |

Drei davon sind Regressionsgurte für Bugs, die beim Bauen tatsächlich
aufgetreten sind:

- **Der Slug-Round-Trip.** `String(1.0)` ist `"1"`, wodurch jede
  1.0-Ohm-Kompatibilitätsseite gebaut wurde und dann 404 lieferte.
- **Das EK-Leck.** `toPublic()` strippt `costCents`; der Test serialisiert den
  kompletten Katalog und sucht nach dem Feld, statt nur ein Objekt zu prüfen.
- **Aufschlag ≠ Marge.** +70 % Aufschlag sind 41 % Marge; der Test hält beide
  Zahlen auseinander.

Die Aussagekraft der Tests wurde per Mutation geprüft: der Slug-Fix und
`toPublic()` wurden testweise zurückgedreht, die zuständigen Tests sind
erwartungsgemäß rot geworden.

### E2E-Suite (Playwright)

15 Flows unter `e2e/` gegen den echten Produktions-Build, mit eigener frisch
aufgesetzter Datenbank pro Lauf (`data/e2e.db`) — Testbestellungen landen nie
in der Entwicklungs-DB. `npm run build` muss vorher gelaufen sein; die Suite
baut absichtlich nicht selbst.

Abgedeckt: Age Gate (blockiert, merkt sich die Bestätigung), Kompatibilitäts-
Finder inklusive Einweg-Antwort und 1.0-Ohm-Slug-Regression, die komplette
Kaufstrecke vom Taste Finder bis zur Bestellbestätigung, die Abweisung
Minderjähriger auf **beiden** Ebenen (Formular-Validierung und Server), das
Admin-Session-Gate (Redirect, 401 für die API, Open-Redirect-Schutz,
Login/Logout) und die Schreibpfade — Margen-Regel und pSEO-Prompt überleben
einen Reload, eine per API angelegte Bestellung erscheint in der
Dropshipping-Queue.

Drei Fehler, die erst durch Tests bzw. CI aufgefallen sind:

- **Der komplette Katalog-Layer fehlte im Repository.** `.gitignore` enthielt
  `data/` ohne führenden Slash — ein solches Muster matcht jedes Verzeichnis
  dieses Namens in beliebiger Tiefe, also auch `src/lib/data/`. Lokal war davon
  nichts zu sehen; das Repository war nicht baubar. Aufgefallen beim ersten
  CI-Lauf als Kaskade von TS7006-Fehlern.

Zwei weitere aus dem Einrichten der E2E-Suite, beide im Code gelandet:

- Der Age Gate lag als modaler Dialog auch über `/admin/login` und versteckte
  das Login-Formular aus dem Accessibility-Tree — der Betreiber hätte sich auf
  einem frischen Gerät nicht anmelden können. Der Gate rendert jetzt nicht
  mehr auf Admin-Routen.
- Die Formular-Fehlermeldung unter dem Geburtsdatum verschiebt beim Einfügen
  das Layout; ein Klick im selben Moment landet auf den alten Koordinaten.
  Der Test blurt deshalb explizit und wartet die Meldung ab — und prüft damit
  nebenbei beide Abwehrschichten einzeln.

---

## CI auf GitHub

`.github/workflows/ci.yml` läuft bei jedem Push und jedem Pull Request:

1. **Schema-Drift-Guard** — `drizzle-kit generate` und prüfen, ob `drizzle/`
   sich ändert. Der Runtime-Bootstrap liest `drizzle/0000_init.sql`; ein
   Schema, das ohne Neugenerierung geändert wurde, fällt sonst erst beim
   Kaltstart einer laufenden Preview auf.
2. **Typecheck** — `tsc --noEmit`
3. **Unit-Tests** — 112 Vitest-Tests
4. **Produktionsbuild** — 269 Seiten
5. **E2E** — 15 Playwright-Flows gegen genau diesen Build

Bei einem Fehlschlag werden `test-results/` und `playwright-report/` als
Artefakt hochgeladen (7 Tage), inklusive Traces zum Nachspielen.

Ein neuer Push auf denselben Branch bricht den laufenden Job ab
(`cancel-in-progress`) — CI-Minuten für einen überholten Stand helfen niemandem.

---

## Deployment auf Vercel (Preview)

Repo in Vercel importieren, fertig — `vercel.json` setzt Framework, Region
(`fra1`) und Security-Header. Es gibt zwei Dinge zu wissen.

### Die Datenbank ist auf Vercel flüchtig

Serverless hat kein beschreibbares Projektverzeichnis. Die SQLite-Datei landet
deshalb in `/tmp` der jeweiligen Lambda-Instanz und wird beim ersten Zugriff
automatisch angelegt und befüllt.

Konsequenz, die man kennen muss: **Bestellungen und gespeicherte Admin-Regeln
überleben den nächsten Kaltstart nicht.** Für eine Preview ist das genau
richtig — jeder Aufruf startet von einem sauberen, identischen Demo-Stand. Für
echten Betrieb ist es das nicht; dafür ist die Docker-Variante unten gedacht
oder ein Wechsel auf Postgres (siehe [Skalierung](#skalierung)).

Der Preview-Banner oben auf jeder Seite sagt das den Besuchern auch, sonst
wirkt eine verschwundene Bestellung wie ein Fehler.

### Previews werden nicht indexiert

Jede Preview läuft auf einer eigenen Domain mit identischem Inhalt. Indexiert
wäre sie Duplicate Content gegen die eigene Produktionsseite — bei 269
generierten Landingpages kein Randfall. Deshalb liefert ein Deployment mit
`VERCEL_ENV=preview`:

| Signal | Preview | Produktion |
|---|---|---|
| `robots.txt` | `Disallow: /` | normal, mit Sitemap |
| `<meta name="robots">` | `noindex, nofollow` | `index, follow` |
| Canonical & Sitemap | zeigen auf die Preview-URL | auf `NEXT_PUBLIC_SITE_URL` |
| Preview-Banner | sichtbar | aus |

`robots.txt` wird bewusst pro Request ausgewertet statt zur Buildzeit
eingebacken: das Meta-Tag hängt zwangsläufig daran, dass `VERCEL_ENV` schon
beim Build gesetzt ist (auf Vercel ist es das), die wichtigste Sperre soll
davon unabhängig sein.

### Umgebungsvariablen

Der Shop läuft **ohne jede Konfiguration** vollständig. Gesperrt ist nur
`/admin`, bis diese zwei Werte gesetzt sind (Vercel → Settings → Environment
Variables, Scope *Preview* und/oder *Production*):

| Variable | Wert |
|---|---|
| `ADMIN_SESSION_SECRET` | `openssl rand -hex 32` |
| `ADMIN_PASSWORD` | SHA-256-Hex des Passworts, **nicht** das Passwort |

```bash
node -e "crypto.subtle.digest('SHA-256', new TextEncoder()\
  .encode('deinPasswort')).then(h => console.log(\
  Buffer.from(h).toString('hex')))"
```

Optional: `NEXT_PUBLIC_SITE_URL` in der Produktion auf die echte Domain setzen.
Ohne den Wert nutzt die Anwendung `VERCEL_URL`, was für Previews genau richtig
und für die Produktion falsch wäre.

Fehlen die Admin-Werte, erklärt die Login-Seite selbst, was zu tun ist — und
merkt, ob sie auf Vercel oder lokal läuft.

### Preview statt Production

Vercel behandelt Deployments des **Default-Branch** als Production, alles
andere als Preview. Aktuell ist der Arbeitsbranch der Default-Branch — Pushes
darauf würden also als Production deployt. Für echte Previews eine der beiden
Varianten:

- **`main` als Default-Branch anlegen** (empfohlen). Feature-Branches und Pull
  Requests bekommen dann automatisch Preview-Deployments mit eigener URL pro
  Commit.
- **Production Branch in Vercel auf `main` setzen**, ohne dass er existiert
  (Settings → Git). Dann wird jeder tatsächliche Push zur Preview.

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

# Schicht 1 — Anwendungs-Session
openssl rand -hex 32                       # → ADMIN_SESSION_SECRET
node -e "crypto.subtle.digest('SHA-256',new TextEncoder()\
  .encode('einSicheresPasswort')).then(h=>console.log(\
  Buffer.from(h).toString('hex')))"        # → ADMIN_PASSWORD

# Schicht 2 — Basic-Auth im Proxy
docker run --rm caddy:2-alpine caddy hash-password \
  --plaintext 'einSicheresPasswort'        # → ADMIN_PASSWORD_HASH

nano .env    # SITE_DOMAIN, ACME_EMAIL und alle drei Admin-Werte eintragen

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
curl -s https://vapebay.de/sitemap.xml | head  # 252 URLs
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

- **Echte Zahlungsanbindung.** Die Zahlungsauswahl ist UI; die Integration von
  PayPal, Klarna, Stripe fehlt. Das ist die größte verbleibende Lücke.
- **Echte Ident-Clients.** `POST /api/age-verification` bildet Vertragsform und
  Latenz von PostIdent/SOFORT Ident ab, ruft aber nichts auf. Die echte
  Integration ist asynchron (Webhook), der Endpunkt müsste dann 202 liefern.
- **Lieferanten-Feeds.** SFTP- und REST-Sync sind simuliert. Die Parser-Strategie
  (Musterabgleich statt Spaltenindex) ist dokumentiert, aber nicht implementiert.
- **Preise werden beim Speichern einer Regel nicht neu abgeleitet.** Die Regel
  landet in der Datenbank; die Neuberechnung des Katalogs müsste an den
  Sync-Lauf gehängt werden.
- **Auf Vercel ist die Datenbank flüchtig.** Bewusst so für Previews; für
  echten Betrieb Docker oder Postgres, siehe oben.
- **Ein einziger Admin-Account.** Bewusst so: eine Benutzertabelle für einen
  Ein-Personen-Betrieb ist Maschinerie ohne Aufgabe. Beim zweiten Betreiber
  gehört das durch echte Sessions ersetzt, nicht durch ein zweites Secret.
- **Produktbilder.** `ProductVisual` erzeugt deterministische Silhouetten aus
  dem Farbton des Produkts. Sobald der Lieferanten-Feed Assets liefert, wird die
  Komponente gegen `next/image` getauscht — sonst ändert sich nichts.
- **Keine Komponententests auf React-Ebene.** Die reinen Funktionen (Vitest)
  und die Nutzer-Flows (Playwright) sind abgedeckt; isolierte Komponententests
  mit Testing Library fehlen. Bewusst nachrangig: die E2E-Suite prüft dieselben
  Komponenten im echten Zusammenspiel.

---

## Rechtliches

Alle Produktdaten sind Demo-Daten. Für den echten Vertrieb nikotinhaltiger
Produkte in Deutschland gelten unter anderem TabakerzG, TabakerzV, JuSchG und
die EU-Tabakproduktrichtlinie 2014/40/EU (TPD2): BVL-Registrierung je Produkt,
maximal 10 ml Flaschengröße und 20 mg/ml Nikotin, maximal 2 ml Tankvolumen bei
Einweggeräten, zuverlässige Altersverifikation bei Abgabe und Versand.

Diese Punkte sind in der Anwendung strukturell abgebildet, ersetzen aber keine
Rechtsberatung.
