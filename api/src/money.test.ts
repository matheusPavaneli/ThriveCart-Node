import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Money } from './money.ts';

describe('Money', () => {
  it('adds, subtracts and multiplies in cents', () => {
    assert.equal(Money.cents(3295).add(Money.cents(795)).cents, 4090);
    assert.equal(Money.cents(3295).subtract(Money.cents(795)).cents, 2500);
    assert.equal(Money.cents(1648).times(2).cents, 3296);
  });

  it('halves by rounding down to the cent', () => {
    assert.equal(Money.cents(3295).halved().cents, 1647);
    assert.equal(Money.cents(2494).halved().cents, 1247);
  });

  it('compares and picks the smaller amount', () => {
    assert.equal(Money.cents(4999).isLessThan(Money.cents(5000)), true);
    assert.equal(Money.cents(5000).isLessThan(Money.cents(5000)), false);
    assert.equal(Money.cents(10).min(Money.cents(7)).cents, 7);
  });

  it('formats as dollars', () => {
    assert.equal(Money.cents(9827).format(), '$98.27');
    assert.equal(Money.cents(5).format(), '$0.05');
    assert.equal(Money.zero.format(), '$0.00');
  });

  it('refuses negative, fractional and unsafe amounts', () => {
    assert.throws(() => Money.cents(-1), RangeError);
    assert.throws(() => Money.cents(1.5), RangeError);
    assert.throws(() => Money.cents(Number.NaN), RangeError);
    assert.throws(() => Money.cents(100).subtract(Money.cents(101)), RangeError);
  });
});
