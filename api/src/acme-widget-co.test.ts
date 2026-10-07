import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { acmeBasket } from './acme-widget-co.ts';

const examples: [codes: string[], total: string][] = [
  [['B01', 'G01'], '$37.85'],
  [['R01', 'R01'], '$54.37'],
  [['R01', 'G01'], '$60.85'],
  [['B01', 'B01', 'R01', 'R01', 'R01'], '$98.27'],
];

describe('Acme Widget Co example baskets', () => {
  for (const [codes, total] of examples) {
    it(`${codes.join(', ')} totals ${total}`, () => {
      const basket = acmeBasket();
      codes.forEach((code) => basket.add(code));
      assert.equal(basket.total().format(), total);
    });
  }
});
