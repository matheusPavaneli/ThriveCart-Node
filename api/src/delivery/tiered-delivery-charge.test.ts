import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Money } from '../money.ts';
import { TieredDeliveryCharge } from './tiered-delivery-charge.ts';

const under50 = { below: Money.cents(5000), charge: Money.cents(495) };
const under90 = { below: Money.cents(9000), charge: Money.cents(295) };
const delivery = new TieredDeliveryCharge([under90, under50]);

const chargeFor = (cents: number) => delivery.chargeFor(Money.cents(cents)).cents;

describe('TieredDeliveryCharge', () => {
  it('charges by the lowest threshold the amount is under, whatever order the tiers came in', () => {
    assert.equal(chargeFor(0), 495);
    assert.equal(chargeFor(4999), 495);
    assert.equal(chargeFor(5000), 295);
    assert.equal(chargeFor(8999), 295);
  });

  it('is free at or above every threshold', () => {
    assert.equal(chargeFor(9000), 0);
    assert.equal(chargeFor(50_000), 0);
  });

  it('charges nothing without tiers', () => {
    assert.equal(new TieredDeliveryCharge([]).chargeFor(Money.cents(100)).cents, 0);
  });

  it('rejects two tiers with the same threshold', () => {
    assert.throws(() => new TieredDeliveryCharge([under50, { ...under50 }]), /share the threshold \$50\.00/);
  });

  it('reports how far the next cheaper tier is', () => {
    const step = (cents: number) => {
      const next = delivery.nextStep(Money.cents(cents));
      return next && { remaining: next.remaining.cents, charge: next.charge.cents };
    };
    assert.deepEqual(step(4942), { remaining: 58, charge: 295 });
    assert.deepEqual(step(5790), { remaining: 3210, charge: 0 });
    assert.equal(step(9000), null);
  });
});
