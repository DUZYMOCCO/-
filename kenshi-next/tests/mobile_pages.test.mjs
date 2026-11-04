import test from 'node:test';
import assert from 'node:assert/strict';
import { pageBounds, mobilePager } from '../js/ui/mobile_pages.js';

test('page bounds cover every entry and clamp after a list shrinks', () => {
  assert.deepEqual(pageBounds(11, 0, 4), { index: 0, pages: 3, start: 0, end: 4 });
  assert.deepEqual(pageBounds(11, 2, 4), { index: 2, pages: 3, start: 8, end: 11 });
  assert.deepEqual(pageBounds(2, 8, 4), { index: 0, pages: 1, start: 0, end: 2 });
  assert.deepEqual(pageBounds(0, 0, 4), { index: 0, pages: 1, start: 0, end: 0 });
});

test('mobile navigation exposes remaining pages and desktop keeps the full list', () => {
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  class Element {
    constructor() { this.children = []; this.handlers = {}; }
    append(...items) { this.children.push(...items); }
    setAttribute() {}
    addEventListener(name, fn) { this.handlers[name] = fn; }
  }
  try {
    globalThis.document = { createElement: () => new Element() };
    globalThis.window = { matchMedia: () => ({ matches: true }) };
    let selected = -1;
    const nav = mobilePager(9, 1, 4, page => { selected = page; }, '品物');
    assert.equal(nav.children[1].textContent, '2 / 3');
    nav.children[2].handlers.click();
    assert.equal(selected, 2);
    globalThis.window.matchMedia = () => ({ matches: false });
    assert.equal(mobilePager(9, 1, 4, () => {}), null);
  } finally { globalThis.window = oldWindow; globalThis.document = oldDocument; }
});
