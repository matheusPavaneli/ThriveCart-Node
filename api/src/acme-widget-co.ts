import { Basket, type PricingRules } from './basket.ts';
import { InMemoryCatalogue } from './catalogue/in-memory-catalogue.ts';
import { TieredDeliveryCharge } from './delivery/tiered-delivery-charge.ts';
import { Money } from './money.ts';
import { BuyOneGetSecondHalfPrice } from './offer/buy-one-get-second-half-price.ts';

/** The only place that knows Acme's prices, delivery tiers and offers. */
export function acmePricingRules() {
  return {
    catalogue: new InMemoryCatalogue([
      { code: 'R01', name: 'Red Widget', price: Money.cents(3295) },
      { code: 'G01', name: 'Green Widget', price: Money.cents(2495) },
      { code: 'B01', name: 'Blue Widget', price: Money.cents(795) },
    ]),
    delivery: new TieredDeliveryCharge([
      { below: Money.cents(5000), charge: Money.cents(495) },
      { below: Money.cents(9000), charge: Money.cents(295) },
    ]),
    offers: [new BuyOneGetSecondHalfPrice('R01')],
  } satisfies PricingRules;
}

export function acmeBasket(): Basket {
  return new Basket(acmePricingRules());
}
