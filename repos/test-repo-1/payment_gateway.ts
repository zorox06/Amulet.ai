import Stripe from 'stripe';

export class PaymentGatewayService {
  private stripe = new Stripe(process.env.STRIPE_API_KEY || '');

  async createPaymentIntent(amount: number, currency: string) {
    return await this.stripe.paymentIntents.create({
      amount,
      currency,
      payment_method_types: ['card'],
    });
  }

  async getCustomer(customerId: string) {
    return await this.stripe.customers.retrieve(customerId);
  }

  async processRefund(chargeId: string, amount: number) {
    return await this.stripe.refunds.create({
      charge: chargeId,
      amount,
    });
  }
}
