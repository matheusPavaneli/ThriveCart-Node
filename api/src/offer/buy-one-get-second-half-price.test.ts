import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Money } from '../money.ts';
import { BuyOneGetSecondHalfPrice } from './buy-one-get-second-half-price.ts';

const red = { code: 'R01', name: 'Red Widget', price: Money.cents(3295) };
const blue = { code: 'B01', name: 'Blue Widget', price: Money.cents(795) };
const offer = new BuyOneGetSecondHalfPrice('R01');

const discountFor = (...items: (typeof red)[]) => offer.discountFor(items).cents;

describe('BuyOneGetSecondHalfPrice', () => {
  it('takes nothing off without a pair', () => {
    assert.equal(discountFor(), 0);
    assert.equal(discountFor(red), 0);
  });

  it('halves the second item, rounding its price down to the cent', () => {
    assert.equal(discountFor(red, red), 1648);
    assert.equal(discountFor(red, red, red), 1648);
  });

  it('applies once per pair', () => {
    assert.equal(discountFor(red, red, red, red), 3296);
  });

  it('ignores other products', () => {
    assert.equal(discountFor(blue, blue, red), 0);
    assert.equal(discountFor(blue, red, blue, red), 1648);
  });

  it('describes itself for display', () => {
    assert.deepEqual(offer.describe(), { kind: 'second_half_price', productCode: 'R01' });
  });
});
