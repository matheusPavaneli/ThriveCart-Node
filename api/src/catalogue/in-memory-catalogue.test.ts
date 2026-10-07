import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Money } from '../money.ts';
import { InMemoryCatalogue } from './in-memory-catalogue.ts';
import { UnknownProduct } from './unknown-product.ts';

const red = { code: 'R01', name: 'Red Widget', price: Money.cents(3295) };
const blue = { code: 'B01', name: 'Blue Widget', price: Money.cents(795) };

describe('InMemoryCatalogue', () => {
  it('finds a product by code', () => {
    assert.equal(new InMemoryCatalogue([red, blue]).find('B01'), blue);
  });

  it('lists every product in the order given', () => {
    assert.deepEqual(new InMemoryCatalogue([red, blue]).all(), [red, blue]);
  });

  it('throws UnknownProduct naming the missing code', () => {
    assert.throws(
      () => new InMemoryCatalogue([red]).find('X99'),
      (error) => error instanceof UnknownProduct && error.code === 'X99',
    );
  });

  it('rejects two products with the same code', () => {
    assert.throws(() => new InMemoryCatalogue([red, { ...red, name: 'Other' }]), /Duplicate product code "R01"/);
  });
});
