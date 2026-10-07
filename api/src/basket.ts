import type { Catalogue } from './catalogue/catalogue.ts';
import type { Product } from './catalogue/product.ts';
import type { DeliveryChargeRule } from './delivery/delivery-charge-rule.ts';
import { Money } from './money.ts';
import type { Offer } from './offer/offer.ts';

export interface PricingRules {
  readonly catalogue: Catalogue;
  readonly delivery: DeliveryChargeRule;
  readonly offers: readonly Offer[];
}

export interface Quote {
  readonly subtotal: Money;
  readonly discount: Money;
  readonly delivery: Money;
  readonly total: Money;
}

export class Basket {
  readonly #rules: PricingRules;
  readonly #items: Product[] = [];

  constructor(rules: PricingRules) {
    this.#rules = rules;
  }

  /** @throws {UnknownProduct} before anything is added, so a bad code leaves the basket as it was. */
  add(code: string): void {
    this.#items.push(this.#rules.catalogue.find(code));
  }

  total(): Money {
    return this.quote().total;
  }

  /**
   * Offers come off first and delivery is charged on what is left, so a
   * discount can move a basket into a dearer delivery tier.
   */
  quote(): Quote {
    const subtotal = this.#items.reduce((sum, item) => sum.add(item.price), Money.zero);
    const discount = this.#rules.offers
      .reduce((sum, offer) => sum.add(offer.discountFor(this.#items)), Money.zero)
      .min(subtotal);
    const discounted = subtotal.subtract(discount);
    const delivery = this.#rules.delivery.chargeFor(discounted);
    return { subtotal, discount, delivery, total: discounted.add(delivery) };
  }
}
