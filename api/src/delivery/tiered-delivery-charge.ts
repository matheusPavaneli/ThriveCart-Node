import { Money } from '../money.ts';
import type { DeliveryChargeRule, DeliveryStep } from './delivery-charge-rule.ts';

/** Orders below `below` pay `charge`. */
export interface DeliveryTier {
  readonly below: Money;
  readonly charge: Money;
}

/** The lowest threshold the amount is under sets the charge; at or above every threshold, delivery is free. */
export class TieredDeliveryCharge implements DeliveryChargeRule {
  readonly tiers: readonly DeliveryTier[];

  constructor(tiers: readonly DeliveryTier[]) {
    const sorted = tiers.toSorted((a, b) => a.below.cents - b.below.cents);
    sorted.forEach((tier, i) => {
      if (i > 0 && sorted[i - 1]?.below.cents === tier.below.cents) {
        throw new Error(`Two delivery tiers share the threshold ${tier.below.format()}.`);
      }
    });
    this.tiers = sorted;
  }

  chargeFor(amount: Money): Money {
    return this.tiers.find((tier) => amount.isLessThan(tier.below))?.charge ?? Money.zero;
  }

  nextStep(amount: Money): DeliveryStep | null {
    const index = this.tiers.findIndex((tier) => amount.isLessThan(tier.below));
    const tier = this.tiers[index];
    if (tier === undefined) return null;
    return {
      remaining: tier.below.subtract(amount),
      charge: this.tiers[index + 1]?.charge ?? Money.zero,
    };
  }
}
