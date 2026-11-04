import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';
import { TOOLS, buildTool, bundle, bundlePath } from '../scripts/build.mjs';

for (const tool of TOOLS) {
  test(`${tool} bundle is up to date with its modules (run npm run build)`, () => {
    const committed = readFileSync(bundlePath(tool), 'utf8');
    assert.equal(committed, buildTool(tool));
    assert.doesNotThrow(() => new Script(committed, { filename: bundlePath(tool) }));
  });

  test(`${tool} page loads its bundle as a classic script so it opens from file://`, () => {
    const html = readFileSync(new URL(`../site/${tool}/index.html`, import.meta.url), 'utf8');
    assert.ok(html.includes(`<script defer src="../assets/js/${tool}.bundle.js"></script>`));
    assert.ok(!html.includes('type="module"'));
  });
}

test('local links name index.html so they open pages, not folder listings, from file://', () => {
  for (const page of ['index.html', ...TOOLS.map(tool => `${tool}/index.html`)]) {
    const html = readFileSync(new URL(`../site/${page}`, import.meta.url), 'utf8');
    const local = [...html.matchAll(/href="([^"]+)"/g)].map(match => match[1]).filter(href => !/^(https?:|#)/.test(href));
    assert.ok(local.length, page);
    for (const href of local) assert.match(href, /\.(html|css)$/, `${page}: ${href}`);
  }
});

test('bundling strips module syntax and rejects colliding or renamed names', () => {
  const output = bundle([
    { name: 'a.js', source: "export const one = 1;\nexport function two() { return 2; }\n" },
    { name: 'b.js', source: "import { one, two } from './a.js';\nconst { three } = { three: one + two() };\nexport { three };\n" },
  ], 'b.js');
  assert.ok(!/^\s*(import|export)\b/m.test(output));
  assert.match(output, /const one = 1;[\s\S]*const \{ three \}/);
  assert.throws(() => bundle([
    { name: 'a.js', source: 'function helper() {}\n' },
    { name: 'b.js', source: 'function helper() {}\n' },
  ], 'b.js'), /"helper" is declared in both a\.js and b\.js/);
  assert.throws(() => bundle([{ name: 'a.js', source: "import { one as uno } from './b.js';\n" }], 'a.js'), /renamed imports/);
});
