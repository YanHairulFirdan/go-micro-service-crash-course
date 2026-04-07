import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css = readFileSync(new URL('../src/css/custom.css', import.meta.url), 'utf8');

assert.match(
  css,
  /html\[data-theme=['"]dark['"]\]/,
  'Expected a dedicated dark theme selector in custom.css',
);

assert.match(
  css,
  /\.main-wrapper\s*\{[\s\S]*background:\s*var\(--site-page-background\)/,
  'Expected .main-wrapper to own the page background so the viewport repaints correctly in dark mode',
);

assert.doesNotMatch(
  css,
  /html\[data-theme=['"]dark['"]\][\s\S]*rgba\(45,\s*212,\s*191,\s*0\.16\)/,
  'Expected dark theme background to avoid teal tint',
);

assert.match(
  css,
  /html\[data-theme=['"]dark['"]\][\s\S]*\.theme-doc-sidebar-container/,
  'Expected dark theme docs sidebar styling',
);

assert.match(
  css,
  /html\[data-theme=['"]dark['"]\][\s\S]*\[class\*=['"]docItemContainer['"]\]/,
  'Expected dark theme docs article surface styling',
);

assert.match(
  css,
  /html\[data-theme=['"]dark['"]\][\s\S]*\.table-of-contents/,
  'Expected dark theme table of contents styling',
);

assert.match(
  css,
  /html\[data-theme=['"]dark['"]\][\s\S]*\.theme-code-block/,
  'Expected dark theme code block styling',
);

assert.match(
  css,
  /html\[data-theme=['"]dark['"]\][\s\S]*\.theme-doc-markdown table/,
  'Expected dark theme table styling',
);

console.log('Dark theme CSS checks passed.');
