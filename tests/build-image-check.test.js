const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const script = path.resolve('actions/build-image-check/scripts/check-build-images.mjs');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'images-'));
const build = path.join(root, 'build');
fs.mkdirSync(path.join(build, 'assets'), { recursive: true });
fs.mkdirSync(path.join(build, 'nested'), { recursive: true });
const run = (...args) => spawnSync(process.execPath, [script, ...args], { cwd: root, encoding: 'utf8', env: { ...process.env, GITHUB_STEP_SUMMARY: path.join(root, 'summary') } });
const html = text => fs.writeFileSync(path.join(build, 'index.html'), text);
try {
  fs.writeFileSync(path.join(build, 'assets', 'ok.png'), Buffer.from([137,80,78,71,13,10,26,10]));
  html('<img src="/site/assets/ok.png"><img src="//cdn.example/test.png"><img src="data:image/png;base64,iVBORw0KGgo=">');
  assert.equal(run('--base-url', '/site/').status, 0);
  // Docusaurus production HTML drops quotes around simple attribute values.
  html('<img src=/site/assets/ok.png alt=Logo class="theme logo"/><source srcset=/site/assets/ok.png><a href=/site/assets/ok.png#preview>image</a>');
  const minified = run('--base-url', '/site/');
  assert.equal(minified.status, 0);
  assert.match(minified.stdout, /image refs checked: 3/);
  for (const markup of [
    '<img src=missing.png>',
    '<IMG SRC=missing.png>',
    '<img srcset=missing.png>',
    '<source src=missing.png>',
    '<source srcset=missing.png>',
    '<img srcset="assets/ok.png 1x, missing.png 2x">',
    '<a href=missing.png#preview>image</a>',
    '<link rel=icon href=missing.ico>',
    '<svg><image href=missing.svg></image></svg>',
    '<svg><image xlink:href=missing.svg></image></svg>',
    '<video poster=missing.png></video>',
    '<input type=image src=missing.png>',
    '<object data=missing.png></object>',
    '<img alt="a > b" src=missing.png>',
    "<img src='missing.png'>",
  ]) {
    html(markup);
    const result = run();
    assert.equal(result.status, 1, markup);
    assert.match(result.stderr, /missing/, markup);
    assert.equal(run('--mode', 'warn').status, 0, markup);
  }
  html('<img data-src=missing.png alt="src=missing.png"><a href=/ordinary-page>page</a><link rel=stylesheet href=missing.css>');
  assert.equal(run().status, 0);
  assert.match(run().stdout, /image refs checked: 0/);
  // An LFS pointer that was never pulled gets inlined by Docusaurus as a data: URI.
  const pointer = Buffer.from('version https://git-lfs.github.com/spec/v1\noid sha256:' + 'a'.repeat(64) + '\nsize 123\n').toString('base64');
  html(`<img src="data:image/jpeg;base64,${pointer}">`);
  const inlined = run();
  assert.equal(inlined.status, 1);
  assert.match(inlined.stderr, /inlined-git-lfs-pointer/);
  assert.equal(run('--mode', 'warn').status, 0);
  // A 2-byte placeholder (CRLF) that Docusaurus inlined renders as a broken image.
  html(`<img src="data:image/jpeg;base64,${Buffer.from('\r\n').toString('base64')}">`);
  const placeholder = run();
  assert.equal(placeholder.status, 1);
  assert.match(placeholder.stderr, /inlined-not-an-image/);
  // SVG data URIs are text and stay skipped.
  html('<img src="data:image/svg+xml;base64,PHN2Zy8+">');
  assert.equal(run().status, 0);
  // Per-page report: job summary list and JSON with full page URLs.
  fs.mkdirSync(path.join(build, 'guide', 'intro'), { recursive: true });
  fs.writeFileSync(path.join(build, 'guide', 'intro', 'index.html'), '<img src="/site/missing-a.png"><img src="/site/missing-b.png">');
  html('<img src="/site/assets/ok.png">');
  const summaryFile = path.join(root, 'summary');
  fs.rmSync(summaryFile, { force: true });
  const paged = run('--base-url', '/site/', '--site-url', 'https://example.github.io/', '--report-json', 'report.json', '--mode', 'warn');
  assert.equal(paged.status, 0);
  const report = JSON.parse(fs.readFileSync(path.join(root, 'report.json'), 'utf8'));
  assert.equal(report.failures, 2);
  assert.equal(report.pages.length, 1);
  assert.equal(report.pages[0].page, 'guide/intro/index.html');
  assert.equal(report.pages[0].url, 'https://example.github.io/site/guide/intro/');
  assert.deepEqual(report.pages[0].failures.map(f => f.issue), ['missing', 'missing']);
  const summary = fs.readFileSync(summaryFile, 'utf8');
  assert.match(summary, /## Pages with broken images/);
  assert.match(summary, /- \[ \] https:\/\/example\.github\.io\/site\/guide\/intro\/ \(2\)/);
  fs.rmSync(path.join(build, 'guide'), { recursive: true });
  // Clean build still writes an empty page list.
  assert.equal(run('--base-url', '/site/', '--report-json', 'report.json').status, 0);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, 'report.json'), 'utf8')).pages, []);
  html('<img src=//cdn.example/ok.png><img src=data:image/png;base64,iVBORw0KGgo=>');
  assert.equal(run().status, 0);
  html('<img src=/missing.png>');
  fs.writeFileSync(path.join(root, 'unquoted-allow.txt'), '/missing.png\n');
  assert.equal(run('--allowlist', 'unquoted-allow.txt').status, 0);
  html('<img src="/site/assets/ok.png">');
  fs.writeFileSync(path.join(build, 'nested', 'index.html'), '<img src="../assets/ok.png" srcset="../assets/ok.png 1x">');
  fs.writeFileSync(path.join(build, 'assets', 'style.css'), 'a { background:url(ok.png); }');
  assert.equal(run('--base-url', '/site/').status, 0);
  html('<img src="/missing.png">');
  assert.equal(run().status, 1);
  assert.match(run().stderr, /::error::/);
  assert.equal(run('--mode', 'warn').status, 0);
  assert.match(run('--mode', 'warn').stderr, /::warning::/);
  fs.writeFileSync(path.join(root, 'allow.txt'), '# Known missing asset\n/missing.png\n');
  assert.equal(run('--allowlist', 'allow.txt').status, 0);
  assert.equal(run('--allowlist', 'absent').status, 2);
  assert.equal(run('--mode', 'invalid').status, 2);
  assert.equal(run('--build-dir', 'absent', '--mode', 'warn').status, 2);
  for (const bytes of ['', 'garbage', 'version https://git-lfs.github.com/spec/v1\n']) {
    fs.writeFileSync(path.join(build, 'bad.png'), bytes);
    html('<img src="bad.png">');
    assert.equal(run().status, 1);
  }
  html('<img src="bad\n::error::injected.png">');
  assert.match(run().stderr, /%0A::error::injected/);
  assert.ok(!run().stderr.includes('\n::error::injected'));
  assert.match(run().stdout, /::stop-commands::/);
  assert.match(fs.readFileSync(path.join(root, 'summary'), 'utf8'), /Build image check/);
  console.log('build-image-check: OK');
} finally { fs.rmSync(root, { recursive: true, force: true }); }
