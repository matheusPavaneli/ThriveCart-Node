/** An amount in whole US cents. Never a float, never negative. */
export class Money {
  static readonly zero = new Money(0);

  readonly cents: number;

  private constructor(cents: number) {
    if (!Number.isSafeInteger(cents) || cents < 0) {
      throw new RangeError(`Money must be a whole, non-negative number of cents, got ${cents}.`);
    }
    this.cents = cents;
  }

  static cents(cents: number): Money {
    return new Money(cents);
  }

  add(other: Money): Money {
    return new Money(this.cents + other.cents);
  }

  subtract(other: Money): Money {
    return new Money(this.cents - other.cents);
  }

  times(factor: number): Money {
    return new Money(this.cents * factor);
  }

  /** Rounds down to the cent, which is what makes R01, R01 total $54.37. */
  halved(): Money {
    return new Money(Math.floor(this.cents / 2));
  }

  isLessThan(other: Money): boolean {
    return this.cents < other.cents;
  }

  min(other: Money): Money {
    return this.isLessThan(other) ? this : other;
  }

  format(): string {
    const dollars = Math.floor(this.cents / 100);
    const cents = String(this.cents % 100).padStart(2, '0');
    return `$${dollars}.${cents}`;
  }
}
