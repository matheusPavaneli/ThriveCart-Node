import type { Product } from '../catalogue/product.ts';
import type { Money } from '../money.ts';

/** What an offer is, in a form a client can display. One member per kind of offer. */
export type OfferDescription = { readonly kind: 'second_half_price'; readonly productCode: string };

export interface Offer {
  /** The amount this offer takes off a basket holding these items. */
  discountFor(items: readonly Product[]): Money;
  describe(): OfferDescription;
}
