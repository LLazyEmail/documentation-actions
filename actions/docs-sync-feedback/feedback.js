// Docs-sync feedback for contributor PRs (including forks).
//
// Runs from a pull_request_target (or workflow_dispatch) caller with a write token.
// It never checks out or executes PR code: PR files and the PR's README.md are read
// through the API as plain text, and docs pages are read from the BASE checkout.
// When README.md changed without the matching docs page, it labels the PR and posts
// (or edits) one specific comment naming the docs file, section and line to add.
// When the PR is in sync again, it removes the label and marks the comment resolved.
const fs = require('node:fs');
const path = require('node:path');

const MARKER = '<!-- docs-sync-feedback -->';
const URL_RE = /https?:\/\/[^\s)<>"'\]]+/g;
const HEADING_RE = /^(#{1,6})\s+(.*?)\s*#*\s*$/;

function globToRegExp(glob) {
  let re = '';
  const g = String(glob).trim();
  for (let i = 0; i < g.length; i++) {
    if (g.startsWith('**/', i)) { re += '(?:.*/)?'; i += 2; }
    else if (g.startsWith('**', i)) { re += '.*'; i += 1; }
    else if (g[i] === '*') re += '[^/]*';
    else re += g[i].replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`);
}
const urlsOf = text => [...new Set((String(text).match(URL_RE) || []).map(u => u.replace(/[.,;:]+$/, '')))];

// Lines added by a unified diff patch, with their line numbers in the new file.
function addedLines(patch) {
  const out = [];
  let line = 0;
  for (const raw of String(patch || '').split('\n')) {
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(raw);
    if (hunk) { line = Number(hunk[1]); continue; }
    if (!line) continue;
    if (raw.startsWith('+')) { out.push({line, text: raw.slice(1)}); line++; }
    else if (raw.startsWith('-') || raw.startsWith('\\')) continue;
    else line++;
  }
  return out;
}

// The innermost heading section that contains line index idx (0-based).
function sectionAt(lines, idx) {
  let start = -1, level = 7, heading = '';
  for (let i = idx; i >= 0; i--) {
    const m = HEADING_RE.exec(lines[i] || '');
    if (m) { start = i; level = m[1].length; heading = m[2]; break; }
  }
  let end = lines.length;
  for (let i = idx + 1; i < lines.length; i++) {
    const m = HEADING_RE.exec(lines[i]);
    if (m && m[1].length <= level) { end = i; break; }
  }
  return {start: start + 1, end, heading, level: start < 0 ? 0 : level};
}
function headingAbove(lines, idx) {
  for (let i = idx; i >= 0; i--) {
    const m = HEADING_RE.exec(lines[i] || '');
    if (m) return `${m[1]} ${m[2]}`;
  }
  return '';
}

function listDocs(root, glob) {
  const re = globToRegExp(glob);
  const prefix = String(glob).split(/[*?[]/)[0];
  const startDir = path.join(root, prefix.includes('/') ? prefix.slice(0, prefix.lastIndexOf('/')) : '');
  const out = new Map();
  const walk = dir => {
    let entries = [];
    try { entries = fs.readdirSync(dir, {withFileTypes: true}); } catch { return; }
    for (const e of entries) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
      const full = path.join(dir, e.name);
      const rel = path.relative(root, full).split(path.sep).join('/');
      if (e.isDirectory()) walk(full);
      else if (e.isFile() && re.test(rel)) out.set(rel, fs.readFileSync(full, 'utf8'));
    }
  };
  walk(startDir);
  return out;
}

// Decide whether docs are missing and, per added README entry, where it belongs.
// Mirrors reusable-readme-sync: README changed and no docs file changed means missing,
// unless linksInDocs is on and every added link is already on a docs page (or none was added).
function analyze({readmeChanged, docsChanged, added = [], readmeLines = null, docs = new Map(), linksInDocs = false}) {
  if (!readmeChanged || docsChanged) return {missing: false, entries: []};
  const allDocs = [...docs.values()].join('\n');
  let entries = added.filter(a => urlsOf(a.text).length);
  if (linksInDocs) {
    entries = entries.filter(a => urlsOf(a.text).some(u => !allDocs.includes(u)));
    if (!entries.length) return {missing: false, entries: []};
  }
  const addedSet = new Set(added.map(a => a.line));
  return {missing: true, entries: entries.map(a => locate(a, {readmeLines, docs, addedSet}))};
}

function locate(entry, {readmeLines, docs, addedSet}) {
  const result = {line: entry.line, text: entry.text.replace(/\s+$/, ''), urls: urlsOf(entry.text), file: null, heading: '', after: null, before: null};
  result.suggestion = result.text.replace(/^\s*[*+]\s+/, '- ');
  if (!readmeLines) return result;
  const idx = entry.line - 1;
  const sec = sectionAt(readmeLines, idx);
  result.readmeHeading = sec.heading;
  const sectionLines = [];
  for (let i = sec.start; i < sec.end; i++) if (!addedSet.has(i + 1)) sectionLines.push({i, urls: urlsOf(readmeLines[i])});
  // The docs page that already carries most of this README section's links.
  const sectionUrls = [...new Set(sectionLines.flatMap(s => s.urls))];
  let best = null, bestScore = 0;
  for (const [file, text] of docs) {
    const score = sectionUrls.filter(u => text.includes(u)).length;
    if (score > bestScore) { best = file; bestScore = score; }
  }
  if (!best) return result;
  result.file = best;
  const docLines = docs.get(best).split('\n');
  const findDocLine = urls => docLines.findIndex(l => urls.some(u => l.includes(u)));
  // Neighbour entries: the closest README entry above (insert after) or below (insert before).
  const above = sectionLines.filter(s => s.i < idx && s.urls.length).reverse();
  const below = sectionLines.filter(s => s.i > idx && s.urls.length);
  for (const s of above) {
    const d = findDocLine(s.urls);
    if (d >= 0) { result.after = {line: d + 1, text: docLines[d].trim()}; break; }
  }
  if (!result.after) {
    for (const s of below) {
      const d = findDocLine(s.urls);
      if (d >= 0) { result.before = {line: d + 1, text: docLines[d].trim()}; break; }
    }
  }
  const anchor = result.after || result.before;
  if (anchor) {
    result.heading = headingAbove(docLines, anchor.line - 1);
    const bullet = /^\s*([-*+])\s/.exec(docLines[anchor.line - 1]);
    if (bullet) result.suggestion = result.text.replace(/^\s*[-*+]\s+/, `${bullet[1]} `);
  } else {
    const want = sec.heading.toLowerCase();
    const h = docLines.findIndex(l => { const m = HEADING_RE.exec(l); return m && m[2].toLowerCase() === want; });
    if (h >= 0) result.heading = docLines[h].trim();
  }
  return result;
}

function fence(text) {
  const longest = Math.max(2, ...(text.match(/`+/g) || []).map(s => s.length));
  const f = '`'.repeat(longest + 1);
  return `${f}md\n${text}\n${f}`;
}
const linkName = text => (/\[([^\]]+)\]\(/.exec(text) || [])[1] || 'the previous entry';

function missingBody({author, entries, docsGlob, contributingUrl, checkName, blobBase = ''}) {
  const parts = [MARKER, '### 📝 One more step: add your entry to the docs page too', '',
    `Thanks for the contribution${author ? `, @${author}` : ''}! This list keeps every entry in two places: \`README.md\` and the matching page on the docs site. ` +
    `This PR changes \`README.md\` but no docs page, so the **${checkName}** check is failing.`, ''];
  if (!entries.length) {
    parts.push(`Please mirror your \`README.md\` change in the matching page under \`${docsGlob}\`.`, '');
  }
  for (const e of entries) {
    const name = linkName(e.text);
    if (e.file) {
      const where = [blobBase ? `Please add **${name}** to [\`${e.file}\`](${blobBase}/${e.file})` : `Please add **${name}** to \`${e.file}\``];
      if (e.heading) where.push(` under \`${e.heading}\``);
      if (e.after) where.push(`, right after the ${linkName(e.after.text)} entry (line ${e.after.line})`);
      else if (e.before) where.push(`, right before the ${linkName(e.before.text)} entry (line ${e.before.line})`);
      parts.push(`${where.join('')}:`, '', fence(e.suggestion), '');
    } else {
      parts.push(`Please add **${name}** to the page under \`${docsGlob}\` that lists the other tools from the same README section` +
        `${e.readmeHeading ? ` (“${e.readmeHeading}”)` : ''}:`, '', fence(e.suggestion), '');
    }
  }
  parts.push('Push that change to this PR and the check re-runs; this comment updates itself.' +
    (contributingUrl ? ` The [contributing guide](${contributingUrl}) has the full checklist.` : ''));
  return parts.join('\n');
}
function resolvedBody({author}) {
  return [MARKER, '### ✅ Docs sync: resolved', '',
    `Thanks${author ? ` @${author}` : ''}! \`README.md\` and the docs pages are in sync now. Nothing else to do for this check.`].join('\n');
}

async function ensureLabel(github, repo, name) {
  try { await github.rest.issues.getLabel({...repo, name}); } catch (err) {
    if (err.status !== 404) throw err;
    try {
      await github.rest.issues.createLabel({...repo, name, color: 'fbca04', description: 'README.md changed without the matching docs page'});
    } catch (e) { if (e.status !== 422) throw e; } // created concurrently
  }
}

async function run({github, context, core, root = process.cwd(), docsGlob = 'website/docs/**/*.md', linksInDocs = false,
  label = 'needs-docs-sync', contributingUrl = '', prNumber = '', checkName = 'README ↔ docs sync'}) {
  const repo = {owner: context.repo.owner, repo: context.repo.repo};
  let pr = context.payload && context.payload.pull_request;
  if (String(prNumber || '').trim()) {
    if (!/^[1-9]\d*$/.test(String(prNumber).trim())) throw new Error('pr-number must be a positive integer');
    ({data: pr} = await github.rest.pulls.get({...repo, pull_number: Number(prNumber)}));
  }
  if (!pr) { core.info('No pull request in this event; nothing to do.'); return {skipped: true}; }
  if (pr.state && pr.state !== 'open') { core.info(`#${pr.number} is ${pr.state}; nothing to do.`); return {skipped: true}; }
  const docsRe = globToRegExp(docsGlob);
  const files = await github.paginate(github.rest.pulls.listFiles, {...repo, pull_number: pr.number, per_page: 100});
  const readme = files.find(f => f.filename === 'README.md' && f.status !== 'removed');
  const docsChanged = files.some(f => docsRe.test(f.filename));
  let readmeLines = null;
  if (readme && !docsChanged) {
    try {
      const {data} = await github.rest.repos.getContent({...repo, path: 'README.md', ref: pr.head.sha});
      readmeLines = Buffer.from(data.content, 'base64').toString('utf8').split('\n');
    } catch (err) { core.warning(`Could not read README.md at the PR head (${err.message}); comment will be less specific.`); }
  }
  const result = analyze({readmeChanged: Boolean(readme), docsChanged, added: readme ? addedLines(readme.patch) : [],
    readmeLines, docs: readme && !docsChanged ? listDocs(root, docsGlob) : new Map(), linksInDocs});
  const blobBase = `${context.serverUrl || 'https://github.com'}/${repo.owner}/${repo.repo}/blob/${(pr.base && pr.base.ref) || 'HEAD'}`;
  if (!contributingUrl) {
    const found = ['CONTRIBUTING.md', '.github/CONTRIBUTING.md', 'docs/CONTRIBUTING.md'].find(p => fs.existsSync(path.join(root, p)));
    if (found) contributingUrl = `${blobBase}/${found}`;
  }
  const author = pr.user && pr.user.login;
  const comments = await github.paginate(github.rest.issues.listComments, {...repo, issue_number: pr.number, per_page: 100});
  const existing = comments.find(c => (c.body || '').includes(MARKER));
  const hasLabel = (pr.labels || []).some(l => (l.name || l) === label);
  if (result.missing) {
    const body = missingBody({author, entries: result.entries, docsGlob, contributingUrl, checkName, blobBase});
    if (!existing) await github.rest.issues.createComment({...repo, issue_number: pr.number, body});
    else if (existing.body !== body) await github.rest.issues.updateComment({...repo, comment_id: existing.id, body});
    if (label && !hasLabel) {
      await ensureLabel(github, repo, label);
      await github.rest.issues.addLabels({...repo, issue_number: pr.number, labels: [label]});
    }
    core.info(`#${pr.number}: docs sync missing (${result.entries.map(e => e.file || '?').join(', ') || 'generic'}); labelled and commented.`);
  } else {
    if (existing && !existing.body.includes('Docs sync: resolved')) {
      await github.rest.issues.updateComment({...repo, comment_id: existing.id, body: resolvedBody({author})});
    }
    if (label && hasLabel) {
      try { await github.rest.issues.removeLabel({...repo, issue_number: pr.number, name: label}); }
      catch (err) { if (err.status !== 404) throw err; }
    }
    core.info(`#${pr.number}: docs in sync.`);
  }
  if (core.setOutput) core.setOutput('missing', String(result.missing));
  return result;
}

module.exports = {MARKER, globToRegExp, urlsOf, addedLines, sectionAt, listDocs, analyze, missingBody, resolvedBody, run};
