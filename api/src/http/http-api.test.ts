import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { acmePricingRules } from '../acme-widget-co.ts';
import { HttpApi, MAX_ITEMS } from './http-api.ts';

const api = new HttpApi(acmePricingRules());
const quote = (body: unknown) =>
  api.handle({ method: 'POST', path: '/api/quote', body: typeof body === 'string' ? body : JSON.stringify(body) });
const errorCode = (response: { body: unknown }) => (response.body as { error: { code: string } }).error.code;

describe('HttpApi', () => {
  it('serves the catalogue, delivery tiers and offers in cents', () => {
    assert.deepEqual(api.handle({ method: 'GET', path: '/api/catalogue', body: '' }), {
      status: 200,
      body: {
        products: [
          { code: 'R01', name: 'Red Widget', price: 3295 },
          { code: 'G01', name: 'Green Widget', price: 2495 },
          { code: 'B01', name: 'Blue Widget', price: 795 },
        ],
        delivery: { tiers: [{ below: 5000, charge: 495 }, { below: 9000, charge: 295 }] },
        offers: [{ kind: 'second_half_price', productCode: 'R01' }],
      },
    });
  });

  it('quotes a basket with the gap to the next delivery tier', () => {
    assert.deepEqual(quote({ codes: ['R01', 'R01'] }), {
      status: 200,
      body: { subtotal: 6590, discount: 1648, delivery: 495, total: 5437, nextTier: { remaining: 58, charge: 295 } },
    });
  });

  it('reports no next tier once delivery is free', () => {
    assert.deepEqual(quote({ codes: ['B01', 'B01', 'R01', 'R01', 'R01'] }).body, {
      subtotal: 11475,
      discount: 1648,
      delivery: 0,
      total: 9827,
      nextTier: null,
    });
  });

  it('rejects an unknown product with 422', () => {
    const response = quote({ codes: ['R01', 'X99'] });
    assert.equal(response.status, 422);
    assert.equal(errorCode(response), 'unknown_product');
  });

  for (const [label, body] of [
    ['malformed JSON', '{"codes": ['],
    ['a missing codes field', {}],
    ['codes that are not a list', { codes: 'R01' }],
    ['a code that is not a string', { codes: ['R01', 1] }],
  ] as const) {
    it(`rejects ${label} with 400`, () => {
      const response = quote(body);
      assert.equal(response.status, 400);
      assert.equal(errorCode(response), 'invalid_body');
    });
  }

  it(`rejects more than ${MAX_ITEMS} items with 413`, () => {
    assert.equal(quote({ codes: Array(MAX_ITEMS).fill('B01') }).status, 200);
    const response = quote({ codes: Array(MAX_ITEMS + 1).fill('B01') });
    assert.equal(response.status, 413);
    assert.equal(errorCode(response), 'too_many_items');
  });

  it('answers a wrong method with 405 and the allowed one', () => {
    const catalogue = api.handle({ method: 'POST', path: '/api/catalogue', body: '' });
    assert.equal(catalogue.status, 405);
    assert.deepEqual(catalogue.headers, { Allow: 'GET' });
    assert.deepEqual(api.handle({ method: 'GET', path: '/api/quote', body: '' }).headers, { Allow: 'POST' });
  });

  it('answers any other path with 404', () => {
    const response = api.handle({ method: 'GET', path: '/api/nope', body: '' });
    assert.equal(response.status, 404);
    assert.equal(errorCode(response), 'not_found');
  });
});
