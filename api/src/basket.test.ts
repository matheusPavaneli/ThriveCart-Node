import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Basket } from './basket.ts';
import { InMemoryCatalogue } from './catalogue/in-memory-catalogue.ts';
import { UnknownProduct } from './catalogue/unknown-product.ts';
import type { DeliveryChargeRule } from './delivery/delivery-charge-rule.ts';
import { Money } from './money.ts';
import type { Offer } from './offer/offer.ts';

const catalogue = new InMemoryCatalogue([
  { code: 'A', name: 'A', price: Money.cents(1000) },
  { code: 'B', name: 'B', price: Money.cents(500) },
]);

const flatDelivery = (cents: number): DeliveryChargeRule => ({
  chargeFor: () => Money.cents(cents),
  nextStep: () => null,
});

const flatOffer = (cents: number): Offer => ({
  discountFor: () => Money.cents(cents),
  describe: () => ({ kind: 'second_half_price', productCode: 'A' }),
});

const inCents = (quote: ReturnType<Basket['quote']>) => ({
  subtotal: quote.subtotal.cents,
  discount: quote.discount.cents,
  delivery: quote.delivery.cents,
  total: quote.total.cents,
});

describe('Basket', () => {
  it('totals item prices plus delivery when there are no offers', () => {
    const basket = new Basket({ catalogue, delivery: flatDelivery(250), offers: [] });
    basket.add('A');
    basket.add('B');
    basket.add('A');
    assert.deepEqual(inCents(basket.quote()), { subtotal: 2500, discount: 0, delivery: 250, total: 2750 });
    assert.equal(basket.total().cents, 2750);
  });

  it('sums every offer and charges delivery on the discounted amount', () => {
    const pricedOn: number[] = [];
    const delivery: DeliveryChargeRule = {
      chargeFor: (amount) => {
        pricedOn.push(amount.cents);
        return Money.cents(300);
      },
      nextStep: () => null,
    };
    const basket = new Basket({ catalogue, delivery, offers: [flatOffer(100), flatOffer(50)] });
    basket.add('A');
    assert.deepEqual(inCents(basket.quote()), { subtotal: 1000, discount: 150, delivery: 300, total: 1150 });
    assert.deepEqual(pricedOn, [850]);
  });

  it('never discounts more than the subtotal', () => {
    const basket = new Basket({ catalogue, delivery: flatDelivery(0), offers: [flatOffer(5000)] });
    basket.add('B');
    assert.equal(basket.quote().discount.cents, 500);
    assert.equal(basket.total().cents, 0);
  });

  it('rejects an unknown code and leaves the basket untouched', () => {
    const basket = new Basket({ catalogue, delivery: flatDelivery(0), offers: [] });
    basket.add('A');
    assert.throws(() => basket.add('Z'), UnknownProduct);
    assert.equal(basket.total().cents, 1000);
  });

  it('charges only delivery for an empty basket', () => {
    assert.equal(new Basket({ catalogue, delivery: flatDelivery(495), offers: [] }).total().cents, 495);
  });
});
