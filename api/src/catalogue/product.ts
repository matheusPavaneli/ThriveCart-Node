import type { Money } from '../money.ts';

export interface Product {
  readonly code: string;
  readonly name: string;
  readonly price: Money;
}
