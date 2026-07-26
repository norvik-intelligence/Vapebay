import { expect, test, type Page } from '@playwright/test';

/**
 * Storefront-Flows gegen den Produktions-Build.
 *
 * Diese Specs sind die festgeschriebene Fassung der manuellen Verifikation aus
 * der Entwicklung — jeder Test hier hat mindestens einen echten Bug gefangen
 * oder deckt einen Umsatzpfad ab, dessen stiller Bruch Geld kostet.
 */

async function passAgeGate(page: Page) {
  await page.getByRole('button', { name: /18 Jahre oder älter/ }).click();
  await expect(page.getByRole('button', { name: /18 Jahre oder älter/ })).toBeHidden();
}

test.describe('Age Gate', () => {
  test('blockiert den ersten Besuch und merkt sich die Bestätigung', async ({ page }) => {
    await page.goto('/');
    // Der Gate muss da sein, bevor irgendetwas anderes bedienbar ist.
    await expect(page.getByText(/Bist du über 18/)).toBeVisible();
    await passAgeGate(page);

    // Reload: die Bestätigung liegt in localStorage und darf nicht erneut fragen.
    await page.reload();
    await expect(page.getByText(/Bist du über 18/)).toBeHidden();
  });
});

test.describe('Kompatibilitäts-Finder', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await passAgeGate(page);
  });

  test('zeigt nur passende Pods und singularisiert korrekt', async ({ page }) => {
    await page.goto('/kompatibel');
    await page.selectOption('#compat-device', 'uwell-caliburn-g3');
    // 1.2 Ω hat genau einen passenden Pod — der Plural-Bug von damals.
    await page.getByRole('radio', { name: '1.2 Ω' }).click();
    await expect(page.getByText('1 passender Pod gefunden')).toBeVisible();
    await expect(page.getByText(/Empfohlene Stärke: 20 mg\/ml/)).toBeVisible();
  });

  test('gibt Einweggeräten die ehrliche Antwort plus Upgrade-Pfad', async ({ page }) => {
    await page.goto('/kompatibel');
    await page.selectOption('#compat-device', 'randm-tornado-9000');
    await expect(page.getByText(/ist ein Einweggerät/)).toBeVisible();
    // Nicht nur die Absage — auch die Alternative muss da sein.
    await expect(page.getByRole('link', { name: /Ansehen/ })).toBeVisible();
  });

  test('1.0-Ohm-Kompatibilitätsseite ist erreichbar (Slug-Regression)', async ({ page }) => {
    // String(1.0) === "1" hat diese Seiten einmal komplett ge-404t.
    const response = await page.goto('/kompatibel/vaporesso-xros-3/1-0-ohm-pod');
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('1.0 Ohm');
  });
});

test.describe('Kaufstrecke', () => {
  test('Taste Finder → Set → Checkout → Altersprüfung → Bestellung', async ({ page }) => {
    await page.goto('/');
    await passAgeGate(page);

    // — Quiz —
    await page.getByRole('button', { name: /Geschmack in 30 Sekunden finden/ }).click();
    await page.getByRole('radio', { name: /Ich steige gerade um/ }).click();
    await page.getByRole('button', { name: 'Weiter' }).click();
    await page.getByRole('checkbox', { name: /Fruchtig/ }).click();
    await page.getByRole('button', { name: 'Weiter' }).click();
    await page.getByRole('radio', { name: /20 mg\/ml/ }).click();
    await page.getByRole('button', { name: /Empfehlung anzeigen/ }).click();

    // Umsteiger → MTL bei 20 mg. Das ist Fachlogik, kein UI-Detail.
    await expect(page.getByText('MTL-Zug mit 20 mg/ml')).toBeVisible();
    await page.getByRole('button', { name: /Set in den Warenkorb/ }).click();

    // — Warenkorb öffnet sich nach dem Hinzufügen von selbst —
    const drawer = page.getByRole('dialog', { name: 'Warenkorb' });
    await expect(drawer).toBeVisible();
    await drawer.getByRole('link', { name: /Zur Kasse/ }).click();
    await page.waitForURL('**/checkout');

    // — Formular —
    await page.fill('#email', 'e2e@example.de');
    await page.fill('#firstName', 'Lea');
    await page.fill('#lastName', 'Schmidt');
    await page.fill('#street', 'Teststraße 9');
    await page.fill('#postcode', '20095');
    await page.fill('#city', 'Hamburg');
    await page.fill('#birthDate', '1992-08-14');

    // — Bestellen muss VOR der Altersprüfung gesperrt sein —
    await expect(page.getByRole('button', { name: /Zahlungspflichtig bestellen/ })).toBeDisabled();

    await page.getByRole('radio', { name: /SOFORT Ident/ }).click();
    await page.getByRole('button', { name: /verifizieren/ }).click();
    await expect(page.getByText(/Altersprüfung bestanden/)).toBeVisible({ timeout: 10_000 });

    await page.getByRole('radio', { name: /Klarna/ }).click();
    await page.locator('input[type=checkbox]').last().check();
    await page.getByRole('button', { name: /Zahlungspflichtig bestellen/ }).click();

    await expect(page.getByText('Bestellung bestätigt')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('dd').first()).toContainText(/^VB-\d{4}-/);
  });

  test('Minderjährige werden an der Kasse abgewiesen', async ({ page }) => {
    await page.goto('/checkout');
    await passAgeGate(page);

    // Der Warenkorb ist leer — direkt zur Prüfung navigieren geht nicht ohne
    // Artikel, also erst einen hinzufügen.
    await page.goto('/produkt/vaporesso-xros-3');
    await page.getByRole('button', { name: 'In den Warenkorb', exact: true }).click();
    await page.getByRole('dialog', { name: 'Warenkorb' }).getByRole('link', { name: /Zur Kasse/ }).click();
    await page.waitForURL('**/checkout');

    await page.fill('#lastName', 'Jung');
    // 16 Jahre alt — die Prüfung MUSS scheitern.
    const year = new Date().getFullYear() - 16;
    await page.fill('#birthDate', `${year}-06-15`);

    // Abwehrschicht 1: schon die Formular-Validierung lehnt das Datum ab.
    // Explizit blurren und die Meldung abwarten — der eingefügte Fehlertext
    // verschiebt sonst mitten im Klick das Layout unter dem Button weg.
    await page.locator('#birthDate').blur();
    await expect(page.getByText('Du musst mindestens 18 Jahre alt sein')).toBeVisible();

    // Abwehrschicht 2: wer die Client-Validierung umgeht, scheitert am Server.
    await page.getByRole('button', { name: /verifizieren/ }).click();
    await expect(page.getByText(/Prüfung nicht bestanden/)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: /Zahlungspflichtig bestellen/ })).toBeDisabled();
  });
});

test.describe('Bundle-Rabatt', () => {
  test('Warenkorb zeigt den Bundle-Fortschritt mit konkreter nächster Position', async ({
    page,
  }) => {
    await page.goto('/produkt/vaporesso-xros-3');
    await passAgeGate(page);
    await page.getByRole('button', { name: 'In den Warenkorb', exact: true }).click();

    const drawer = page.getByRole('dialog', { name: 'Warenkorb' });
    await expect(drawer).toBeVisible();
    // Nicht nur ein Prozentbalken: die fehlenden Positionen müssen benannt sein.
    await expect(drawer.getByText(/fehlen für 10 % Rabatt/)).toBeVisible();
  });
});
