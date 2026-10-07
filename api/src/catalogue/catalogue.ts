import type { Product } from './product.ts';

export interface Catalogue {
  /** @throws {UnknownProduct} when no product has this code. */
  find(code: string): Product;
  all(): readonly Product[];
}
