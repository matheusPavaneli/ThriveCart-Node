import type { Product } from '../catalogue/product.ts';
import { Money } from '../money.ts';
import type { Offer, OfferDescription } from './offer.ts';

/** Every second matching item is half price: two pay for one and a half, four for three. */
export class BuyOneGetSecondHalfPrice implements Offer {
  readonly productCode: string;

  constructor(productCode: string) {
    this.productCode = productCode;
  }

  discountFor(items: readonly Product[]): Money {
    const matching = items.filter((item) => item.code === this.productCode);
    const first = matching[0];
    if (first === undefined) return Money.zero;

    const discountPerPair = first.price.subtract(first.price.halved());
    return discountPerPair.times(Math.floor(matching.length / 2));
  }

  describe(): OfferDescription {
    return { kind: 'second_half_price', productCode: this.productCode };
  }
}
