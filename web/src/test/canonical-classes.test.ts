import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const srcDir = join(import.meta.dirname, '..');

// Tailwind's spacing step is 4px (0.25rem, not overridden in styles.css), so an
// arbitrary [Npx] with N a multiple of 4 has a canonical utility the editor suggests.
const wholeStepPx = /[\w:-]+-\[(\d+)px\]/g;

function componentFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.tsx'))
    .map((entry) => join(entry.parentPath, entry.name));
}

describe('class names', () => {
  it('write whole spacing steps as canonical utilities, not arbitrary px values', () => {
    const offenders = componentFiles(srcDir).flatMap((file) =>
      [...readFileSync(file, 'utf8').matchAll(wholeStepPx)]
        .filter(([, px]) => Number(px) % 4 === 0)
        .map(([match]) => `${relative(srcDir, file)}: ${match}`),
    );

    expect(offenders).toEqual([]);
  });
});
