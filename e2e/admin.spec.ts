import { expect, test, type Page } from '@playwright/test';

import { E2E_ADMIN_PASSWORD } from '../playwright.config';

/**
 * Admin-Flows: Session-Gate, Login, persistierende Schreibpfade.
 *
 * Alles hier läuft gegen die frische E2E-Datenbank aus dem globalSetup — die
 * Schreibtests (Margen-Regel, pSEO-Template) prüfen echte Persistenz, keinen
 * Toast.
 */

async function login(page: Page) {
  await page.goto('/admin/login');
  await page.fill('#admin-password', E2E_ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Anmelden' }).click();
  await page.waitForURL('**/admin');
}

test.describe('Session-Gate', () => {
  test('leitet unangemeldete Besucher auf die Login-Seite um', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login\?next=/);
    // Die Ziel-URL bleibt erhalten — Login landet dort, nicht auf der Übersicht.
    expect(page.url()).toContain('next=%2Fadmin');
  });

  test('Admin-API antwortet 401 statt Redirect', async ({ request }) => {
    const response = await request.post('/api/admin/sync', {
      data: { supplierId: 'sup-eurovape' },
    });
    expect(response.status()).toBe(401);
  });

  test('weist ein falsches Passwort ohne Detailauskunft ab', async ({ page }) => {
    await page.goto('/admin/login');
    await page.fill('#admin-password', 'falsches-passwort');
    await page.getByRole('button', { name: 'Anmelden' }).click();
    await expect(page.getByText(/ungültig/)).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('ignoriert einen externen next-Parameter (Open-Redirect-Schutz)', async ({ page }) => {
    await page.goto('/admin/login?next=https://evil.example');
    await page.fill('#admin-password', E2E_ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Anmelden' }).click();
    // Muss intern landen, niemals auf der fremden Domain.
    await page.waitForURL('**/admin');
    expect(page.url()).toContain('localhost');
  });

  test('Login → Dashboard → Abmelden → wieder gesperrt', async ({ page }) => {
    await login(page);
    await expect(page.getByRole('heading', { name: 'Übersicht' })).toBeVisible();

    await page.getByRole('button', { name: 'Abmelden' }).click();
    await page.waitForURL('**/admin/login');

    // Nach dem Logout darf die alte Session nicht mehr gelten.
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});

test.describe('Schreibpfade', () => {
  test('Margen-Regel speichern überlebt einen Seiten-Reload', async ({ page }) => {
    await login(page);
    await page.goto('/admin/margen');

    await page.fill('#sim-markup', '62');
    await page.getByRole('button', { name: /Regel speichern/ }).click();
    await expect(page.getByText('Regel gespeichert')).toBeVisible();

    // Persistenz, nicht Komponentenzustand: neu laden und nachsehen.
    await page.reload();
    await expect(page.getByText('+62 %').first()).toBeVisible();
  });

  test('pSEO-Prompt speichern überlebt einen Seiten-Reload', async ({ page }) => {
    await login(page);
    await page.goto('/admin/pseo');

    const marker = `E2E-Marker ${Date.now()}`;
    const textarea = page.locator('#prompt-kompatibel');
    await textarea.fill(`Schreibe 2 Absätze über {{device}} bei {{ohm}} Ohm. ${marker}`);
    await page.getByRole('button', { name: 'Speichern' }).first().click();
    await expect(page.getByText('Template gespeichert')).toBeVisible();

    await page.reload();
    await expect(page.locator('#prompt-kompatibel')).toHaveValue(new RegExp(marker));
  });

  test('echte Bestellungen erscheinen in der Dropshipping-Queue', async ({ page, request }) => {
    // Bestellung über die öffentliche API anlegen …
    const order = await request.post('/api/orders', {
      data: {
        customer: {
          email: 'queue@example.de',
          firstName: 'Queue',
          lastName: 'Test',
          street: 'Teststraße 1',
          postcode: '10115',
          city: 'Berlin',
          country: 'DE',
          birthDate: '1990-01-01',
          paymentMethod: 'paypal',
          acceptTerms: true,
          isBusiness: false,
        },
        items: [{ productId: 'dev:vaporesso-xros-3', qty: 1 }],
        identReference: 'SI-E2E-QUEUE',
      },
    });
    expect(order.status()).toBe(201);
    const { orderId, persisted } = await order.json();
    expect(persisted).toBe(true);

    // … und im Admin wiederfinden. Vor dem force-dynamic-Fix zeigte diese
    // Seite für immer nur die Demo-Daten.
    await login(page);
    await page.goto('/admin/dropshipping');
    await expect(page.getByText(orderId).first()).toBeVisible();
  });
});
