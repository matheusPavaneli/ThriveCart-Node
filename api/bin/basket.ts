import { acmeBasket } from '../src/acme-widget-co.ts';
import { UnknownProduct } from '../src/catalogue/unknown-product.ts';

const codes = process.argv.slice(2);
const basket = acmeBasket();

try {
  codes.forEach((code) => basket.add(code));
} catch (error) {
  if (!(error instanceof UnknownProduct)) throw error;
  console.error(error.message);
  process.exit(1);
}

const quote = basket.quote();
console.log(
  [
    `Items:    ${codes.length === 0 ? '(none)' : codes.join(', ')}`,
    `Subtotal: ${quote.subtotal.format()}`,
    `Discount: -${quote.discount.format()}`,
    `Delivery: ${quote.delivery.format()}`,
    `Total:    ${quote.total.format()}`,
  ].join('\n'),
);
