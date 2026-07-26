import type { Metadata } from 'next';

import { Breadcrumbs, PageHeader } from '@/components/site/page-shell';
import { CheckoutForm } from '@/components/commerce/checkout-form';

export const metadata: Metadata = {
  title: 'Kasse',
  description: 'Bestellung abschließen mit Altersverifikation und Sofort-Zahlung.',
  // A checkout page has nothing to rank for and leaks cart state into the index.
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return (
    <div className="container pb-20">
      <Breadcrumbs
        crumbs={[
          { name: 'Start', path: '/' },
          { name: 'Kasse', path: '/checkout' },
        ]}
        className="pt-8"
      />

      <PageHeader
        title="Kasse"
        description="Vier Schritte, davon einer gesetzlich vorgeschrieben. Die Altersprüfung ist einmalig — bei jeder weiteren Bestellung entfällt sie."
      />

      <CheckoutForm />
    </div>
  );
}
