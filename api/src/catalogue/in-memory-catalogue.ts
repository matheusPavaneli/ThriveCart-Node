import type { Catalogue } from './catalogue.ts';
import type { Product } from './product.ts';
import { UnknownProduct } from './unknown-product.ts';

export class InMemoryCatalogue implements Catalogue {
  readonly #products = new Map<string, Product>();

  constructor(products: readonly Product[]) {
    for (const product of products) {
      if (this.#products.has(product.code)) {
        throw new Error(`Duplicate product code "${product.code}".`);
      }
      this.#products.set(product.code, product);
    }
  }

  find(code: string): Product {
    const product = this.#products.get(code);
    if (product === undefined) throw new UnknownProduct(code);
    return product;
  }

  all(): readonly Product[] {
    return [...this.#products.values()];
  }
}
