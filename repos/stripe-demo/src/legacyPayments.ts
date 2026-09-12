import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy_key_for_demo');
const paymentsClient = stripe;

// One level of indirection: the indexer must retain this SDK alias.
export async function createLegacySource(amount: number, currency: string) {
  return paymentsClient.sources.create({ type: 'card', amount, currency });
}
