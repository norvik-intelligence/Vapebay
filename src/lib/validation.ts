import { z } from 'zod';

/**
 * Shared checkout schemas. Imported by both the client form (React Hook Form
 * resolver) and the API route — the server must never trust a payload just
 * because the client already validated it.
 */

const GERMAN_POSTCODE = /^\d{5}$/;

export const CheckoutSchema = z.object({
  email: z
    .string()
    .min(1, 'E-Mail wird für die Bestellbestätigung benötigt')
    .email('Bitte eine gültige E-Mail-Adresse angeben'),
  firstName: z.string().min(2, 'Vorname zu kurz'),
  lastName: z.string().min(2, 'Nachname zu kurz'),
  street: z.string().min(4, 'Straße und Hausnummer angeben'),
  postcode: z
    .string()
    .regex(GERMAN_POSTCODE, 'Postleitzahl muss aus 5 Ziffern bestehen'),
  city: z.string().min(2, 'Ort angeben'),
  country: z.enum(['DE', 'AT']),
  birthDate: z
    .string()
    .min(1, 'Geburtsdatum wird für die Altersprüfung benötigt')
    .refine((value) => {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return false;
      // Full-year check, not a naive year subtraction — someone born on
      // 31.12.2007 is not 18 on 01.01.2025.
      const eighteen = new Date(date);
      eighteen.setFullYear(eighteen.getFullYear() + 18);
      return eighteen <= new Date();
    }, 'Du musst mindestens 18 Jahre alt sein'),
  paymentMethod: z.enum(['paypal', 'klarna', 'applepay', 'card', 'sepa']),
  // `refine` rather than `z.literal(true)`: literal makes the schema's input
  // type `true`, which cannot represent the unchecked starting state and breaks
  // the React Hook Form resolver's input/output generic pairing.
  acceptTerms: z
    .boolean()
    .refine((value) => value, 'AGB und Widerrufsbelehrung müssen akzeptiert werden'),
  isBusiness: z.boolean(),
  vatId: z.string().optional(),
});

export type CheckoutValues = z.infer<typeof CheckoutSchema>;

export const OrderSchema = z.object({
  customer: CheckoutSchema,
  items: z
    .array(z.object({ productId: z.string().min(1), qty: z.number().int().min(1).max(99) }))
    .min(1, 'Der Warenkorb ist leer'),
  identReference: z.string().min(1, 'Altersverifikation fehlt'),
});

export type OrderInput = z.infer<typeof OrderSchema>;

export const PAYMENT_METHODS = [
  { value: 'paypal', label: 'PayPal', hint: 'Käuferschutz, ohne Kontodaten' },
  { value: 'applepay', label: 'Apple Pay', hint: 'Ein Tap, Face ID' },
  { value: 'klarna', label: 'Klarna', hint: 'Rechnung, 30 Tage' },
  { value: 'card', label: 'Kreditkarte', hint: 'Visa, Mastercard, Amex' },
  { value: 'sepa', label: 'SEPA-Lastschrift', hint: 'Abbuchung in 3 Werktagen' },
] as const;

export const IDENT_PROVIDERS = [
  {
    value: 'postident',
    label: 'PostIdent',
    hint: 'Per Video-Chat oder in jeder Filiale',
    duration: 'ca. 2 Minuten',
  },
  {
    value: 'sofort',
    label: 'SOFORT Ident',
    hint: 'Über deine Online-Banking-Zugangsdaten',
    duration: 'ca. 45 Sekunden',
  },
] as const;
