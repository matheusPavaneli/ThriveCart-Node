import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { describe, it } from 'node:test';
import { acmePricingRules } from '../acme-widget-co.ts';
import { HttpApi } from './http-api.ts';
import { createApiServer, type ErrorLogger, MAX_BODY_BYTES, type RequestHandler } from './server.ts';

const silent: ErrorLogger = { error: () => {} };

async function withServer(api: RequestHandler, log: ErrorLogger, run: (url: string) => Promise<void>) {
  const server = createApiServer(api, log).listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    await run(`http://127.0.0.1:${(server.address() as AddressInfo).port}`);
  } finally {
    server.closeAllConnections();
    server.close();
  }
}

const post = (url: string, body: string) =>
  fetch(`${url}/api/quote`, { method: 'POST', body, signal: AbortSignal.timeout(5_000) });

describe('createApiServer', () => {
  it('serves a quote as JSON', async () => {
    await withServer(new HttpApi(acmePricingRules()), silent, async (url) => {
      const response = await post(url, JSON.stringify({ codes: ['B01', 'G01'] }));
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('content-type'), 'application/json');
      assert.equal(((await response.json()) as { total: number }).total, 3785);
    });
  });

  it(`refuses a body over ${MAX_BODY_BYTES} bytes with 413`, async () => {
    await withServer(new HttpApi(acmePricingRules()), silent, async (url) => {
      const response = await post(url, ' '.repeat(MAX_BODY_BYTES + 1));
      assert.equal(response.status, 413);
      assert.deepEqual(await response.json(), {
        error: { code: 'payload_too_large', message: `The request body is over ${MAX_BODY_BYTES} bytes.` },
      });
    });
  });

  it('logs a failure with its cause and answers 500 without leaking it', async () => {
    const logged: unknown[] = [];
    const failing: RequestHandler = {
      handle: () => {
        throw new Error('database password is hunter2');
      },
    };
    await withServer(failing, { error: ({ err }) => logged.push(err) }, async (url) => {
      const response = await post(url, '{}');
      assert.equal(response.status, 500);
      const text = await response.text();
      assert.match(text, /internal_error/);
      assert.doesNotMatch(text, /hunter2/);
    });
    assert.equal(logged.length, 1);
    assert.match(String(logged[0]), /hunter2/);
  });
});
