#!/usr/bin/env node
/**
 * Post-build image verifier for the Docusaurus output under build/.
 *
 * For every local <img src>, srcset candidate, and CSS url(...) that looks like
 * an image, assert the file exists under build/ (respecting baseUrl), is
 * non-empty, and is a real image (magic bytes) — not a Git LFS pointer.
 *
 * Usage:
 *   node check-build-images.mjs [--build-dir build] [--base-url /site/]
 *     [--allowlist scripts/build-image-allowlist.txt] [--mode fail|warn]
 *
 * Exit 1 for broken images in fail mode; configuration errors always exit 2.
 */
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const root = process.cwd();

function argValue(flag, fallback) {
  const i = process.argv.indexOf(flag);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

const buildDir = path.resolve(root, argValue('--build-dir', 'build'));
const baseUrl = normalizeBase(argValue('--base-url', '/'));
const allowlistArg = argValue('--allowlist', '');
const allowlistPath = allowlistArg ? path.resolve(root, allowlistArg) : null;
const mode = argValue('--mode', 'fail');
if (!['fail', 'warn'].includes(mode)) {
  console.error('::error::mode must be fail or warn');
  process.exit(2);
}
function escapeCommand(value) {
  return String(value).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
}
function configurationError(message) {
  console.error(`::error::${escapeCommand(message)}`);
  process.exit(2);
}

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|avif|ico|bmp)(\?.*)?$/i;
const LFS_HEADER = 'version https://git-lfs.github.com/spec/';

function normalizeBase(u) {
  if (!u || u === '/') return '/';
  return u.endsWith('/') ? u : `${u}/`;
}

function walk(dir, filter, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, filter, out);
    else if (filter(p)) out.push(p);
  }
  return out;
}

function loadAllowlist(file) {
  if (!file) return new Set();
  if (!fs.existsSync(file)) configurationError(`Allowlist not found: ${file}`);
  const set = new Set();
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const t = line.replace(/#.*$/, '').trim();
    if (t) set.add(t);
  }
  return set;
}

function stripBase(pathname) {
  // pathname is URL path like /site/img/foo.png or /img/foo.png
  let p = pathname.split('?')[0].split('#')[0];
  try { p = decodeURIComponent(p); } catch { /* retain malformed URL for reporting */ }
  if (baseUrl !== '/' && p.startsWith(baseUrl)) {
    p = '/' + p.slice(baseUrl.length);
  }
  return p;
}

function resolveInBuild(ref, pageFile) {
  // Absolute URL or data/blob → skip
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(ref))
    return { skip: true, reason: 'external' };
  // Root-absolute site path
  let urlPath;
  if (ref.startsWith('/')) {
    urlPath = stripBase(ref);
  } else {
    // Relative to the HTML page URL path
    const pageRel = path.relative(buildDir, pageFile).split(path.sep).join('/');
    const pageUrlDir =
      '/' + pageRel.replace(/\/index\.html$/i, '/').replace(/[^/]+$/, '');
    const joined = path.posix.normalize(path.posix.join(pageUrlDir, ref));
    urlPath = stripBase(joined.startsWith('/') ? joined : `/${joined}`);
  }
  const disk = path.resolve(buildDir, '.' + urlPath);
  if (!disk.startsWith(buildDir + path.sep)) {
    return { skip: false, urlPath, disk: path.join(buildDir, '__invalid_image_path__'), ref };
  }
  return { skip: false, urlPath, disk, ref };
}

function isLfsPointer(buf) {
  if (buf.length < 20 || buf.length > 1024) return false;
  const head = buf.subarray(0, 64).toString('utf8');
  return head.startsWith(LFS_HEADER);
}

function detectImageKind(buf) {
  if (!buf || buf.length === 0) return 'empty';
  if (isLfsPointer(buf)) return 'lfs-pointer';
  // Magic bytes
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47)
    return 'png';
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return 'gif';
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  )
    return 'webp';
  if (buf.length >= 12 && buf.toString('ascii', 4, 8) === 'ftyp')
    return 'avif-or-heic';
  if (buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x01 && buf[3] === 0x00)
    return 'ico';
  // SVG (text)
  const head = buf
    .subarray(0, Math.min(buf.length, 256))
    .toString('utf8')
    .trimStart();
  if (head.startsWith('<svg') || head.startsWith('<?xml')) {
    if (
      /<svg[\s>]/i.test(head) ||
      /<svg[\s>]/i.test(buf.toString('utf8', 0, Math.min(buf.length, 4096)))
    ) {
      return 'svg';
    }
  }
  // BMP
  if (buf[0] === 0x42 && buf[1] === 0x4d) return 'bmp';
  return 'unknown';
}

function extractFromHtml(html) {
  const refs = [];
  // <img ... src="...">
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = m[0];
    const src = tag.match(/\bsrc\s*=\s*(["'])([\s\S]*?)\1/i)?.[2];
    if (src) refs.push({ kind: 'img-src', ref: src });
    const srcset = tag.match(/\bsrcset\s*=\s*(["'])([\s\S]*?)\1/i)?.[2];
    if (srcset) {
      for (const part of srcset.split(',')) {
        const u = part.trim().split(/\s+/)[0];
        if (u) refs.push({ kind: 'img-srcset', ref: u });
      }
    }
  }
  // <source srcset>
  for (const m of html.matchAll(/<source\b[^>]*>/gi)) {
    const tag = m[0];
    const srcset = tag.match(/\bsrcset\s*=\s*(["'])([\s\S]*?)\1/i)?.[2];
    if (srcset) {
      for (const part of srcset.split(',')) {
        const u = part.trim().split(/\s+/)[0];
        if (u) refs.push({ kind: 'source-srcset', ref: u });
      }
    }
    const src = tag.match(/\bsrc\s*=\s*(["'])([\s\S]*?)\1/i)?.[2];
    if (src) refs.push({ kind: 'source-src', ref: src });
  }
  // inline style background / url()
  for (const m of html.matchAll(/url\(\s*(['"]?)([^)'"]+)\1\s*\)/gi)) {
    refs.push({ kind: 'css-url-inline', ref: m[2].trim() });
  }
  return refs;
}

function extractFromCss(css) {
  const refs = [];
  for (const m of css.matchAll(/url\(\s*(['"]?)([^)'"]+)\1\s*\)/gi)) {
    refs.push({ kind: 'css-url', ref: m[2].trim() });
  }
  return refs;
}

function looksLikeImageRef(ref) {
  if (/^(https?:|data:|blob:)/i.test(ref)) return false;
  if (IMAGE_EXT.test(ref)) return true;
  // root site assets without query often under /img/
  if (/\/img\//i.test(ref)) return true;
  return false;
}

if (!fs.existsSync(buildDir)) {
  configurationError(`Build directory not found: ${buildDir}`);
}

if (!fs.statSync(buildDir).isDirectory()) configurationError('Build path is not a directory');
const allowlist = loadAllowlist(allowlistPath);
const htmlFiles = walk(buildDir, (p) => p.endsWith('.html'));
const cssFiles = walk(buildDir, (p) => p.endsWith('.css'));
if (!htmlFiles.length && !cssFiles.length) configurationError('No HTML or CSS found in build directory');

/** @type {Map<string, {page: string, kind: string, ref: string, issue: string, disk?: string}[]>} */
const failures = [];
let checked = 0;
let skippedExternal = 0;
let allowlistedHits = 0;

function record(page, kind, ref, issue, disk) {
  failures.push({ page, kind, ref, issue, disk });
}

function checkRef(pageFile, kind, ref) {
  if (!looksLikeImageRef(ref) && !ref.includes('/img/')) {
    // Still check img src even without extension (some CDN-less paths)
    if (kind.startsWith('img') || kind.startsWith('source')) {
      // keep going
    } else {
      return;
    }
  }
  const resolved = resolveInBuild(ref, pageFile);
  if (resolved.skip) {
    skippedExternal++;
    return;
  }
  checked++;
  const pageRel = path.relative(buildDir, pageFile).split(path.sep).join('/');
  const allowKeys = [
    resolved.ref,
    resolved.urlPath,
    path.basename(resolved.urlPath),
  ];
  const isAllowed = allowKeys.some((k) => allowlist.has(k));

  if (!fs.existsSync(resolved.disk)) {
    if (isAllowed) {
      allowlistedHits++;
      return;
    }
    record(pageRel, kind, ref, 'missing', resolved.disk);
    return;
  }
  if (!fs.statSync(resolved.disk).isFile()) {
    record(pageRel, kind, ref, 'not-a-file', resolved.disk);
    return;
  }
  const realBuild = fs.realpathSync(buildDir);
  if (!fs.realpathSync(resolved.disk).startsWith(realBuild + path.sep)) {
    record(pageRel, kind, ref, 'outside-build', resolved.disk);
    return;
  }
  const buf = fs.readFileSync(resolved.disk);
  const imageKind = detectImageKind(buf);
  if (imageKind === 'empty') {
    if (isAllowed) {
      allowlistedHits++;
      return;
    }
    record(pageRel, kind, ref, 'empty-file', resolved.disk);
    return;
  }
  if (imageKind === 'lfs-pointer') {
    if (isAllowed) {
      allowlistedHits++;
      return;
    }
    record(pageRel, kind, ref, 'git-lfs-pointer', resolved.disk);
    return;
  }
  if (imageKind === 'unknown') {
    if (isAllowed) {
      allowlistedHits++;
      return;
    }
    record(pageRel, kind, ref, 'not-an-image', resolved.disk);
  }
}

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  for (const { kind, ref } of extractFromHtml(html)) {
    checkRef(file, kind, ref);
  }
}
for (const file of cssFiles) {
  const css = fs.readFileSync(file, 'utf8');
  for (const { kind, ref } of extractFromCss(css)) {
    if (!looksLikeImageRef(ref)) continue;
    checkRef(file, kind, ref);
  }
}

for (const f of failures) {
  console.error(`::${mode === 'warn' ? 'warning' : 'error'}::${escapeCommand(`${f.page}: ${f.issue}: ${f.ref}`)}`);
}

// Group table by page
const byPage = new Map();
for (const f of failures) {
  if (!byPage.has(f.page)) byPage.set(f.page, []);
  byPage.get(f.page).push(f);
}

const lines = [];
lines.push(`# Build image check`);
lines.push('');
lines.push(`- buildDir: \`${path.relative(root, buildDir) || '.'}\``);
lines.push(`- baseUrl: \`${baseUrl}\``);
lines.push(`- html files: ${htmlFiles.length}, css files: ${cssFiles.length}`);
lines.push(
  `- image refs checked: ${checked} (skipped external/data: ${skippedExternal})`,
);
lines.push(
  `- allowlist entries: ${allowlist.size}, allowlisted hits: ${allowlistedHits}`,
);
lines.push(`- **failures: ${failures.length}**`);
lines.push('');

if (failures.length) {
  lines.push(`| Page | Kind | Ref | Issue |`);
  lines.push(`| --- | --- | --- | --- |`);
  for (const f of failures) {
    const ref = f.ref.replace(/\\/g, '\\\\').replace(/\|/g, '\\|');
    lines.push(`| \`${f.page}\` | ${f.kind} | \`${ref}\` | ${f.issue} |`);
  }
  lines.push('');
  lines.push('## By page');
  for (const [page, items] of [...byPage.entries()].sort()) {
    lines.push(`### \`${page}\` (${items.length})`);
    for (const i of items) {
      lines.push(`- **${i.issue}** \`${i.ref}\` (${i.kind})`);
    }
  }
} else {
  lines.push(
    'All referenced local images exist, are non-empty, and look like real image bytes.',
  );
}

const report = lines.join('\n') + '\n';
// Never interpret untrusted filenames/references as runner workflow commands.
const stopToken = randomUUID();
process.stdout.write(`::stop-commands::${stopToken}\n`);
process.stdout.write(report);
process.stdout.write(`::${stopToken}::\n`);

const summaryPath = process.env.GITHUB_STEP_SUMMARY;
if (summaryPath) {
  fs.appendFileSync(summaryPath, report);
}

if (failures.length > 0 && mode === 'fail') {
  process.exit(1);
}
