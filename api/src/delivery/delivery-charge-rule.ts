import type { Money } from '../money.ts';

/** How much more spend reaches a cheaper delivery charge, and what that charge is. */
export interface DeliveryStep {
  readonly remaining: Money;
  readonly charge: Money;
}

export interface DeliveryChargeRule {
  chargeFor(amount: Money): Money;
  /** The next cheaper charge, or null when delivery cannot get any cheaper. */
  nextStep(amount: Money): DeliveryStep | null;
}
