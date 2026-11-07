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
  html('<img src="/site/assets/ok.png"><img src="//cdn.example/test.png"><img src="data:image/png;base64,AA==">');
  assert.equal(run('--base-url', '/site/').status, 0);
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
