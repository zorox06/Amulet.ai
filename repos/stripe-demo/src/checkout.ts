import Stripe from 'stripe';

// This placeholder is intentionally non-functional. This repository is parsed, never executed.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy_key_for_demo');

export async function createCardSource(amount: number, currency: string) {
  return stripe.sources.create({ type: 'card', amount, currency });
}
