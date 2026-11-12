const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const script = path.resolve('actions/thin-content-check/scripts/check-thin-content.mjs');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'thin-'));
const build = path.join(root, 'build');
const summary = path.join(root, 'summary');
const run = (...args) => spawnSync(process.execPath, [script, ...args], { cwd: root, encoding: 'utf8', env: { ...process.env, GITHUB_STEP_SUMMARY: summary } });
const words = (n) => Array.from({ length: n }, (_, i) => `word${i}`).join(' ');
// Docusaurus-like doc page: navbar, sidebar, breadcrumbs, TOC, footer and code must not count.
const doc = (content) => `<!doctype html><html><head><title>T</title></head><body>
<nav class="navbar">${words(400)}</nav><aside class="theme-doc-sidebar-container">${words(400)}</aside>
<main><div class="docItemContainer"><nav class="theme-doc-breadcrumbs">${words(50)}</nav>
<div class="theme-doc-markdown markdown">${content}</div>
<div class="theme-doc-toc-mobile tocCollapsible">${words(50)}</div>
<nav class="pagination-nav">${words(50)}</nav></div></main>
<footer class="footer">${words(400)}</footer><script>${words(400)}</script></body></html>`;
const page = (rel, html) => {
  const p = path.join(build, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, html);
};
try {
  page('docs/rich/index.html', doc(`<header><h1>Rich</h1></header><p>${words(200)}</p>`));
  page('docs/thin/index.html', doc(`<header><h1>Thin page</h1></header><p>${words(40)}</p><pre><code>${words(500)}</code></pre>`));
  page('docs/heading/index.html', doc('<header><h1>Only a heading</h1></header><h2>And a sub</h2>'));
  page('docs/gallery/index.html', doc('<h1>Gallery</h1><p><img src="a.jpg"><img src="b.jpg"></p>'));
  page('docs/todo/index.html', doc(`<h1>Plan</h1><p>Coming soon. ${words(10)}</p>`));
  page('docs/empty/index.html', doc(''));
  page('docs/old/index.html', '<html><head><meta http-equiv="refresh" content="0; url=/new/"></head></html>');
  fs.mkdirSync(path.join(root, '.docusaurus', 'plugin'), { recursive: true });
  fs.writeFileSync(path.join(root, '.docusaurus', 'plugin', 'thin.json'), JSON.stringify({ permalink: '/site/docs/thin', source: '@site/docs/thin.md' }));

  const r = run('--base-url', '/site/', '--site-url', 'https://example.github.io/', '--report-json', 'report.json');
  assert.equal(r.status, 0, r.stderr); // warn is the default
  const report = JSON.parse(fs.readFileSync(path.join(root, 'report.json'), 'utf8'));
  const by = Object.fromEntries(report.pages.map((p) => [p.page, p]));
  assert.equal(report.redirects, 1);
  assert.equal(report.scanned, 6);
  assert.ok(!by['docs/rich/index.html'], 'rich page is not reported');
  assert.equal(by['docs/thin/index.html'].words, 42); // heading + body, code and chrome excluded
  assert.deepEqual(by['docs/thin/index.html'].reasons, ['thin']);
  assert.equal(by['docs/thin/index.html'].source, 'docs/thin.md');
  assert.equal(by['docs/thin/index.html'].url, 'https://example.github.io/site/docs/thin/');
  assert.equal(by['docs/thin/index.html'].codeBlocks, 1);
  assert.deepEqual(by['docs/heading/index.html'].reasons, ['heading-only', 'thin']);
  assert.deepEqual(by['docs/gallery/index.html'].reasons, ['image-only', 'thin']);
  assert.equal(by['docs/gallery/index.html'].images, 2);
  assert.ok(by['docs/todo/index.html'].reasons.includes('placeholder'));
  assert.deepEqual(by['docs/empty/index.html'].reasons, ['empty']);
  assert.equal(report.pages[0].page, 'docs/empty/index.html', 'thinnest first');
  assert.deepEqual(report.distribution, { lt50: 5, lt150: 0, lt300: 1, gte300: 0 });
  const md = fs.readFileSync(summary, 'utf8');
  assert.match(md, /## Pages with little content \(thinnest first\)/);
  assert.match(md, /- \[ \] https:\/\/example\.github\.io\/site\/docs\/thin\/ — `docs\/thin\.md` — 42 words, 0 images — thin/);
  assert.match(r.stderr, /::warning::docs\/thin\/index\.html: thin/);

  // fail mode, thresholds and allowlist
  assert.equal(run('--mode', 'fail').status, 1);
  assert.equal(run('--min-words', '0', '--mode', 'fail').status, 1); // empty/heading/image-only still reported
  fs.writeFileSync(path.join(root, 'allow.txt'), '# intentionally short\ndocs/thin/index.html\n/docs/heading/\ndocs/gallery/\ndocs/todo/index.html\ndocs/empty/index.html\n');
  const allowed = run('--allowlist', 'allow.txt', '--mode', 'fail', '--report-json', 'report.json');
  assert.equal(allowed.status, 0, allowed.stderr);
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, 'report.json'), 'utf8')).allowlisted, 5);

  // Generated category indexes are listed only when empty.
  fs.rmSync(build, { recursive: true });
  page('docs/category/a/index.html', '<main><div class="generatedIndexPage_abc"><h1>A</h1><a>card</a></div></main>');
  page('docs/category/b/index.html', '<main><div class="generatedIndexPage_abc"></div></main>');
  const gen = run('--report-json', 'report.json', '--mode', 'fail');
  assert.equal(gen.status, 0);
  const g = JSON.parse(fs.readFileSync(path.join(root, 'report.json'), 'utf8'));
  assert.equal(g.pages.length, 0);
  assert.deepEqual(g.generatedIndexes.map((p) => p.page), ['docs/category/b/index.html']);

  // Configuration errors
  assert.equal(run('--build-dir', 'nope').status, 2);
  assert.equal(run('--mode', 'loud').status, 2);
  assert.equal(run('--min-words', 'many').status, 2);
  assert.equal(run('--allowlist', 'missing.txt').status, 2);
  console.log('thin-content-check: OK');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
