#!/usr/bin/env node
/**
 * Post-build thin-content checker for Docusaurus output under build/.
 *
 * For every built HTML page, take only the main article content
 * (.theme-doc-markdown, blog articleBody, generated index, or <main>), drop
 * navbar/sidebar/footer/TOC/breadcrumbs/pagination, scripts, SVG and code
 * blocks, and count visible words and images. Pages below the thresholds are
 * reported with a reason:
 *   empty         no words and no images
 *   heading-only  headings but (almost) no body text
 *   image-only    images with fewer than --image-only-words words
 *   placeholder   TODO / TBD / coming soon / lorem ipsum style text
 *   thin          fewer than --min-words words
 *
 * Usage:
 *   node check-thin-content.mjs [--build-dir build] [--base-url /site/]
 *     [--site-url https://example.github.io] [--min-words 150]
 *     [--allowlist thin-content-allowlist.txt] [--mode warn|fail]
 *     [--docusaurus-dir .docusaurus] [--report-json thin-content-report.json]
 *
 * Exit 1 for reported pages in fail mode; configuration errors always exit 2.
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
function escapeCommand(value) {
  return String(value).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
}
function configurationError(message) {
  console.error(`::error::${escapeCommand(message)}`);
  process.exit(2);
}
function intArg(flag, fallback) {
  const raw = argValue(flag, String(fallback));
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0) configurationError(`${flag} must be a non-negative integer`);
  return n;
}

const buildDir = path.resolve(root, argValue('--build-dir', 'build'));
const baseUrlRaw = argValue('--base-url', '/');
const baseUrl = baseUrlRaw === '/' ? '/' : `/${baseUrlRaw.replace(/^\/+|\/+$/g, '')}/`;
const siteUrl = argValue('--site-url', '').replace(/\/+$/, '');
const minWords = intArg('--min-words', 150);
const imageOnlyWords = intArg('--image-only-words', 30);
const allowlistArg = argValue('--allowlist', '');
const mode = argValue('--mode', 'warn');
const reportJsonArg = argValue('--report-json', '');
const docusaurusDirArg = argValue('--docusaurus-dir', '');
const placeholderRe = new RegExp(
  argValue(
    '--placeholder-pattern',
    '\\b(TODO|TBD|TBA|WIP|coming soon|lorem ipsum|work in progress|under construction|placeholder)\\b',
  ),
  'i',
);
if (!['fail', 'warn'].includes(mode)) configurationError('mode must be fail or warn');
if (!fs.existsSync(buildDir) || !fs.statSync(buildDir).isDirectory()) {
  configurationError(`Build directory not found: ${buildDir}`);
}

// ---------------------------------------------------------------- HTML utils
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const RAW_TEXT = new Set(['script', 'style', 'textarea', 'template']);

/** Minimal tolerant HTML tokenizer → tree of {tag, attrs, children} / strings. */
export function parseHtml(html) {
  const rootNode = { tag: '#root', attrs: {}, children: [] };
  const stack = [rootNode];
  const tagRe = /<!--[\s\S]*?-->|<!doctype[^>]*>|<\/?([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/gi;
  let last = 0;
  let m;
  while ((m = tagRe.exec(html))) {
    if (m.index > last) stack[stack.length - 1].children.push(html.slice(last, m.index));
    last = tagRe.lastIndex;
    if (!m[1]) continue; // comment / doctype
    const tag = m[1].toLowerCase();
    if (m[0][1] === '/') {
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].tag === tag) { stack.length = i; break; }
      }
      continue;
    }
    const node = { tag, attrs: parseAttrs(m[2] || ''), children: [] };
    stack[stack.length - 1].children.push(node);
    if (RAW_TEXT.has(tag)) {
      const close = html.toLowerCase().indexOf(`</${tag}`, last);
      const end = close < 0 ? html.length : close;
      node.children.push(html.slice(last, end));
      const gt = close < 0 ? html.length : html.indexOf('>', close);
      tagRe.lastIndex = last = gt < 0 ? html.length : gt + 1;
      continue;
    }
    if (!VOID.has(tag) && !/\/\s*$/.test(m[2] || '')) stack.push(node);
  }
  if (last < html.length) stack[stack.length - 1].children.push(html.slice(last));
  return rootNode;
}
function parseAttrs(body) {
  const attrs = {};
  for (const a of body.matchAll(/([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
    const k = a[1].toLowerCase();
    if (!(k in attrs)) attrs[k] = a[2] ?? a[3] ?? a[4] ?? '';
  }
  return attrs;
}
const classes = (n) => (typeof n === 'object' && n.attrs.class ? n.attrs.class.split(/\s+/) : []);
function find(node, pred) {
  if (typeof node !== 'object') return null;
  if (pred(node)) return node;
  for (const c of node.children) {
    const r = find(c, pred);
    if (r) return r;
  }
  return null;
}
const hasClass = (re) => (n) => classes(n).some((c) => re.test(c));

const DROP_TAGS = new Set(['script', 'style', 'noscript', 'svg', 'nav', 'footer', 'aside', 'button', 'template', 'pre']);
const DROP_CLASS = /^(theme-doc-toc|table-of-contents|tableOfContents|breadcrumbs|theme-doc-breadcrumbs|pagination-nav|theme-doc-footer|theme-doc-version|theme-edit-this-page|hash-link|navbar|menu|footer|sidebar|theme-doc-sidebar|tocCollapsible|copyButton|buttonGroup)/;

function decodeEntities(s) {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&(amp|lt|gt|quot|apos|#39);/g, (_, e) => ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'" })[e]);
}

/** Walk content, collecting body text, heading text, image and code counts. */
function measure(node, acc = { body: [], heading: [], images: 0, codeBlocks: 0 }, inHeading = false) {
  for (const c of node.children) {
    if (typeof c === 'string') {
      (inHeading ? acc.heading : acc.body).push(decodeEntities(c));
      continue;
    }
    if (c.tag === 'pre') acc.codeBlocks++;
    if (c.tag === 'img' || (c.tag === 'image' && c.attrs.href)) acc.images++;
    if (c.tag === 'video' || c.tag === 'iframe') acc.images++;
    if (DROP_TAGS.has(c.tag) || classes(c).some((x) => DROP_CLASS.test(x))) continue;
    measure(c, acc, inHeading || /^h[1-6]$/.test(c.tag));
  }
  return acc;
}
const countWords = (parts) => (parts.join(' ').match(/[\p{L}\p{N}][\p{L}\p{N}'’_-]*/gu) || []).length;

export function analyzeHtml(html) {
  const tree = parseHtml(html);
  let content = find(tree, hasClass(/^theme-doc-markdown$/));
  let kind = 'doc';
  if (!content) {
    const gen = find(tree, hasClass(/^generatedIndexPage/));
    if (gen) { content = gen; kind = 'generated-index'; }
  }
  if (!content) {
    const body = find(tree, (n) => n.attrs && n.attrs.itemprop === 'articleBody');
    if (body) { content = body; kind = 'blog-post'; }
  }
  if (!content) {
    content = find(tree, (n) => n.tag === 'main');
    kind = 'page';
  }
  if (!content) return null;
  const titleNode = find(tree, (n) => n.tag === 'title');
  const title = titleNode ? decodeEntities(titleNode.children.filter((c) => typeof c === 'string').join('')).trim() : '';
  const acc = measure(content);
  const bodyText = acc.body.join(' ').replace(/\s+/g, ' ').trim();
  return {
    kind,
    title,
    words: countWords(acc.body) + countWords(acc.heading),
    bodyWords: countWords(acc.body),
    headingWords: countWords(acc.heading),
    images: acc.images,
    codeBlocks: acc.codeBlocks,
    placeholder: placeholderRe.test(bodyText) || placeholderRe.test(acc.heading.join(' ')),
    excerpt: bodyText.slice(0, 120),
  };
}

export function reasonsFor(a) {
  const reasons = [];
  if (a.words === 0 && a.images === 0) reasons.push('empty');
  else if (a.headingWords > 0 && a.bodyWords < 5 && a.images === 0) reasons.push('heading-only');
  if (a.images > 0 && a.bodyWords < imageOnlyWords) reasons.push('image-only');
  if (a.placeholder) reasons.push('placeholder');
  if (a.words < minWords && !reasons.includes('empty')) reasons.push('thin');
  return reasons;
}

// ---------------------------------------------------------------- inputs
function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (p.endsWith('.html')) out.push(p);
  }
  return out;
}
function loadAllowlist(file) {
  if (!file) return new Set();
  const p = path.resolve(root, file);
  if (!fs.existsSync(p)) configurationError(`Allowlist not found: ${file}`);
  const set = new Set();
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const t = line.replace(/#.*$/, '').trim();
    if (t) set.add(t);
  }
  return set;
}
/** permalink → source, from Docusaurus metadata JSON under .docusaurus (optional). */
function loadSources(dir) {
  const map = new Map();
  if (!dir) return map;
  const abs = path.resolve(root, dir);
  if (!fs.existsSync(abs)) return map;
  const visit = (d) => {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, ent.name);
      if (ent.isDirectory()) visit(p);
      else if (p.endsWith('.json')) {
        try {
          const j = JSON.parse(fs.readFileSync(p, 'utf8'));
          const items = Array.isArray(j) ? j : [j];
          for (const it of items) {
            if (it && typeof it.permalink === 'string' && typeof it.source === 'string') {
              map.set(it.permalink.replace(/\/+$/, '') || '/', it.source.replace(/^@site\//, ''));
            }
          }
        } catch { /* not metadata */ }
      }
    }
  };
  visit(abs);
  return map;
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('check-thin-content.mjs')) {
  const allowlist = loadAllowlist(allowlistArg);
  const sources = loadSources(docusaurusDirArg || (fs.existsSync(path.join(root, '.docusaurus')) ? '.docusaurus' : ''));
  const htmlFiles = walk(buildDir).sort();
  if (!htmlFiles.length) configurationError('No HTML found in build directory');

  const pages = [];
  let scanned = 0;
  let allowlisted = 0;
  const generated = [];
  let redirects = 0;
  const buckets = { lt50: 0, lt150: 0, lt300: 0, gte300: 0 };
  for (const file of htmlFiles) {
    const rel = path.relative(buildDir, file).split(path.sep).join('/');
    if (/^(404\.html|search\/)/.test(rel) || /(^|\/)(tags|page\/\d+)\//.test(rel)) continue;
    const html = fs.readFileSync(file, 'utf8');
    if (/<meta[^>]+http-equiv=["']?refresh/i.test(html) && html.length < 4096) { redirects++; continue; }
    const a = analyzeHtml(html);
    if (!a) continue;
    scanned++;
    if (a.kind !== 'generated-index') {
      if (a.words < 50) buckets.lt50++;
      else if (a.words < 150) buckets.lt150++;
      else if (a.words < 300) buckets.lt300++;
      else buckets.gte300++;
    }
    const route = rel.replace(/(^|\/)index\.html$/i, '$1').replace(/\.html$/i, '');
    const urlPath = `${baseUrl}${route}`;
    const entry = {
      page: rel,
      url: `${siteUrl}${encodeURI(urlPath)}`,
      source: sources.get(urlPath.replace(/\/+$/, '') || '/') || null,
      title: a.title,
      kind: a.kind,
      words: a.words,
      images: a.images,
      codeBlocks: a.codeBlocks,
      reasons: reasonsFor(a),
      excerpt: a.excerpt,
    };
    if (!entry.reasons.length) continue;
    if ([rel, urlPath, route, entry.source].some((k) => k && allowlist.has(k))) { allowlisted++; continue; }
    // Generated category indexes are listings by design; report them only when empty.
    if (a.kind === 'generated-index') {
      if (entry.reasons.includes('empty')) generated.push(entry);
      continue;
    }
    pages.push(entry);
  }
  pages.sort((x, y) => x.words - y.words || x.images - y.images || x.url.localeCompare(y.url));

  for (const p of pages) {
    console.error(`::${mode === 'warn' ? 'warning' : 'error'}::${escapeCommand(`${p.page}: ${p.reasons.join(', ')} (${p.words} words, ${p.images} images)`)}`);
  }
  const lines = [
    '# Thin content check',
    '',
    `- pages scanned: ${scanned} (redirect stubs skipped: ${redirects}); min-words: ${minWords}; image-only below ${imageOnlyWords} words`,
    `- word distribution: <50: ${buckets.lt50}, 50–149: ${buckets.lt150}, 150–299: ${buckets.lt300}, 300+: ${buckets.gte300}`,
    `- allowlisted: ${allowlisted}`,
    `- **pages reported: ${pages.length}**${generated.length ? `, empty generated indexes: ${generated.length}` : ''}`,
    '',
  ];
  if (pages.length) {
    lines.push('## Pages with little content (thinnest first)', '');
    for (const p of pages) {
      const src = p.source ? ` — \`${p.source}\`` : '';
      lines.push(`- [ ] ${p.url}${src} — ${p.words} words, ${p.images} images — ${p.reasons.join(', ')}`);
    }
    lines.push('');
  }
  if (generated.length) {
    lines.push('## Empty generated category indexes', '');
    for (const p of generated) lines.push(`- [ ] ${p.url}`);
    lines.push('');
  }
  if (!pages.length && !generated.length) lines.push('No pages below the thresholds.');
  const report = lines.join('\n') + '\n';
  if (reportJsonArg) {
    fs.writeFileSync(
      path.resolve(root, reportJsonArg),
      JSON.stringify({ baseUrl, siteUrl: siteUrl || null, minWords, imageOnlyWords, scanned, redirects, distribution: buckets, allowlisted, reported: pages.length, pages, generatedIndexes: generated }, null, 2) + '\n',
    );
  }
  const stopToken = randomUUID();
  process.stdout.write(`::stop-commands::${stopToken}\n${report}::${stopToken}::\n`);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
  if (pages.length && mode === 'fail') process.exit(1);
}
