import assert from 'node:assert/strict';
import test from 'node:test';
import { collectBreakBoundaries, pageSlices, renderPdf } from '../site/assets/js/bank-statements/pdf.js';

const nodeAt = (top, bottom) => ({ getBoundingClientRect: () => ({ top, bottom, height: bottom - top }) });

function layout({ top = 0, height, rows = [], sections = [] }) {
  return {
    getBoundingClientRect: () => ({ top, bottom: top + height, height }),
    querySelectorAll: selector => selector === '[data-keep-start]' ? sections : rows,
  };
}

test('PDF boundaries are integer pixels outside rows and heading/first-row groups', () => {
  const header = nodeAt(20, 90.4);
  const firstRow = nodeAt(130.25, 165.5);
  const secondRow = nodeAt(165.5, 196.9);
  const section = { ...nodeAt(90.4, 196.9), querySelector: () => firstRow };
  const boundaries = collectBreakBoundaries(layout({ top: 20, height: 200,
    rows: [header, nodeAt(100, 130.25), firstRow, secondRow], sections: [section] }), 501);
  assert.ok(boundaries.every(Number.isInteger));
  assert.equal(boundaries[0], 0);
  assert.equal(boundaries.at(-1), 501);
  const protectedTop = Math.round((90.4 - 20) * 501 / 200);
  const protectedBottom = Math.round((165.5 - 20) * 501 / 200);
  assert.ok(!boundaries.some(position => position > protectedTop && position < protectedBottom));
  assert.ok(boundaries.includes(protectedBottom));
  assert.deepEqual(boundaries, [...new Set(boundaries)].sort((a, b) => a - b));
});

test('PDF slices cover the canvas exactly once and use only safe boundaries', () => {
  const boundaries = [0, 80, 190, 300, 430, 590, 700, 890, 1000];
  const slices = pageSlices(boundaries, 1000, 310);
  let cursor = 0;
  for (const slice of slices) {
    assert.equal(slice.top, cursor);
    assert.ok(Number.isInteger(slice.height) && slice.height > 0 && slice.height <= 310);
    cursor += slice.height;
    assert.ok(boundaries.includes(cursor));
  }
  assert.equal(cursor, 1000);
  assert.deepEqual(pageSlices([0, 500], 500, 500), [{ top: 0, height: 500 }]);
  assert.throws(() => pageSlices([0, 501], 501, 500), /row is too tall/);
  assert.throws(() => collectBreakBoundaries(layout({ height: 0 }), 100), /preview is unavailable/);
});

test('PDF rendering releases source and slice canvases after success and failures', async () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  try {
    for (const failure of [null, 'empty', 'too-tall', 'context', 'image', 'renderer']) {
      const source = { width: failure === 'empty' ? 0 : 770, height: 2000 };
      const draws = [];
      const slice = { width: 0, height: 0,
        getContext: () => failure === 'context' ? null : { drawImage: (...args) => draws.push(args) },
        toDataURL: () => 'data:image/jpeg;base64,test',
      };
      const calls = { pages: 0, images: 0 };
      globalThis.window = {
        html2canvas: async () => {
          if (failure === 'renderer') throw new Error('Renderer failed');
          return source;
        },
        jspdf: { jsPDF: class {
          constructor(options) { assert.deepEqual(options, { unit: 'in', format: 'letter' }); }
          addPage() { calls.pages++; }
          addImage() {
            if (failure === 'image') throw new Error('Image failed');
            calls.images++;
          }
          output(type) { assert.equal(type, 'blob'); return new Blob(['pdf']); }
        } },
      };
      globalThis.document = { createElement: tag => { assert.equal(tag, 'canvas'); return slice; } };
      const element = layout({ height: 2000,
        rows: failure === 'too-tall' ? [] : [nodeAt(0, 1000), nodeAt(1000, 2000)] });
      if (failure) await assert.rejects(renderPdf(element));
      else {
        const output = await renderPdf(element);
        assert.ok(output instanceof Blob);
        assert.equal(calls.pages, 1);
        assert.equal(calls.images, 2);
        assert.deepEqual(draws.map(args => [args[2], args[4]]), [[0, 1000], [1000, 1000]]);
      }
      if (failure !== 'renderer') assert.deepEqual([source.width, source.height], [0, 0]);
      assert.deepEqual([slice.width, slice.height], [0, 0]);
    }
  } finally {
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
    else delete globalThis.window;
    if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument);
    else delete globalThis.document;
  }
});
