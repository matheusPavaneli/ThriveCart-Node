import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const cli = fileURLToPath(new URL('./basket.ts', import.meta.url));
const run = (...codes: string[]) => spawnSync(process.execPath, [cli, ...codes], { encoding: 'utf8', timeout: 10_000 });

describe('basket CLI', () => {
  it('prints the breakdown of a basket', () => {
    const result = run('B01', 'B01', 'R01', 'R01', 'R01');
    assert.equal(result.status, 0, result.stderr);
    assert.equal(
      result.stdout,
      'Items:    B01, B01, R01, R01, R01\nSubtotal: $114.75\nDiscount: -$16.48\nDelivery: $0.00\nTotal:    $98.27\n',
    );
  });

  it('exits 1 and names an unknown code on stderr', () => {
    const result = run('R01', 'X99');
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Unknown product code "X99"/);
    assert.equal(result.stdout, '');
  });
});
