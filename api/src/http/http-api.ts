import * as z from 'zod/mini';
import { Basket, type PricingRules } from '../basket.ts';
import { UnknownProduct } from '../catalogue/unknown-product.ts';
import type { TieredDeliveryCharge } from '../delivery/tiered-delivery-charge.ts';

export const MAX_ITEMS = 200;

export interface ApiRequest {
  readonly method: string;
  readonly path: string;
  readonly body: string;
}

export interface ApiResponse {
  readonly status: number;
  readonly body: unknown;
  readonly headers?: Readonly<Record<string, string>>;
}

/** The UI draws the delivery tiers, so this API needs the tiered rule, not any DeliveryChargeRule. */
export type ApiPricingRules = PricingRules & { readonly delivery: TieredDeliveryCharge };

const quoteBody = z.object({ codes: z.array(z.string()) });

export function errorResponse(status: number, code: string, message: string, headers?: Record<string, string>): ApiResponse {
  return { status, body: { error: { code, message } }, ...(headers && { headers }) };
}

/**
 * The JSON API as a plain function of the request, so it is tested without a
 * server. Every amount leaves here as integer cents.
 */
export class HttpApi {
  readonly #rules: ApiPricingRules;

  constructor(rules: ApiPricingRules) {
    this.#rules = rules;
  }

  handle({ method, path, body }: ApiRequest): ApiResponse {
    switch (path) {
      case '/api/catalogue':
        return method === 'GET'
          ? this.#catalogue()
          : errorResponse(405, 'method_not_allowed', 'Use GET for /api/catalogue.', { Allow: 'GET' });
      case '/api/quote':
        return method === 'POST'
          ? this.#quote(body)
          : errorResponse(405, 'method_not_allowed', 'Use POST for /api/quote.', { Allow: 'POST' });
      default:
        return errorResponse(404, 'not_found', `Nothing is served at ${path}.`);
    }
  }

  #catalogue(): ApiResponse {
    const { catalogue, delivery, offers } = this.#rules;
    return {
      status: 200,
      body: {
        products: catalogue.all().map(({ code, name, price }) => ({ code, name, price: price.cents })),
        delivery: { tiers: delivery.tiers.map(({ below, charge }) => ({ below: below.cents, charge: charge.cents })) },
        offers: offers.map((offer) => offer.describe()),
      },
    };
  }

  #quote(body: string): ApiResponse {
    const codes = parseCodes(body);
    if (!Array.isArray(codes)) return codes;

    const basket = new Basket(this.#rules);
    try {
      codes.forEach((code) => basket.add(code));
    } catch (error) {
      if (error instanceof UnknownProduct) return errorResponse(422, 'unknown_product', error.message);
      throw error;
    }

    const quote = basket.quote();
    const next = this.#rules.delivery.nextStep(quote.subtotal.subtract(quote.discount));
    return {
      status: 200,
      body: {
        subtotal: quote.subtotal.cents,
        discount: quote.discount.cents,
        delivery: quote.delivery.cents,
        total: quote.total.cents,
        nextTier: next && { remaining: next.remaining.cents, charge: next.charge.cents },
      },
    };
  }
}

function parseCodes(body: string): string[] | ApiResponse {
  const invalid = errorResponse(400, 'invalid_body', 'The body must be JSON like {"codes": ["R01"]}.');
  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch {
    return invalid;
  }
  const parsed = quoteBody.safeParse(json);
  if (!parsed.success) return invalid;
  if (parsed.data.codes.length > MAX_ITEMS) {
    return errorResponse(413, 'too_many_items', `A basket holds at most ${MAX_ITEMS} items.`);
  }
  return parsed.data.codes;
}
