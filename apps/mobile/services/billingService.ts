import { SERVER_URL } from '@/constants/Server';
import { getSupabaseSession } from '@/constants/SupabaseConfig';

export class BillingService {
  private baseUrl = SERVER_URL; // includes /api

  private async getHeaders() {
    const session = await getSupabaseSession();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
    return headers;
  }

  async createCheckoutSession(priceId: string, successUrl: string, cancelUrl: string) {
    const headers = await this.getHeaders();
    const res = await fetch(`${this.baseUrl}/billing/create-checkout-session`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ price_id: priceId, success_url: successUrl, cancel_url: cancelUrl }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Failed to create checkout: ${res.status} ${res.statusText} ${body}`);
    }
    return await res.json(); // { checkout_url }
  }
}

export const billingService = new BillingService();


