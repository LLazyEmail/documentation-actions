// docs-sync-feedback: pure analysis plus run() with a mocked GitHub API and a
// throwaway base checkout. Fixture mirrors awesome-email-marketing #453.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const F = require('../actions/docs-sync-feedback/feedback');

const readme = [
  '# List', '',
  '## Automation Email Marketing platform', '',
  'Docs: [`website/docs/tools/automation-platforms.md`](./website/docs/tools/automation-platforms.md).', '',
  '### All-in-one automation & CRM', '',
  '- [HubSpot](https://hubspot.com) - CRM', '',
  '### Delivery, outbound & infrastructure-owned', '',
  '- [Wraps](https://wraps.dev) - sending through your AWS',
  '- [MisarReach](https://misarreach.com) - AI lead finder',
  '- [WarmySender](https://github.com/warmysender-oss/warmysender) - open-source cold email engine; `npm i`',
  '', '## Tools for effective work with emails', '',
  '* [Litmus](https://litmus.com) - testing', '',
];
const docsPage = [
  '# Automation Platforms', '', '## All-in-one automation & CRM', '', '- [HubSpot](https://hubspot.com) - CRM', '',
  '## Delivery, outbound & infrastructure-owned', '',
  '- [Wraps](https://wraps.dev) — sending through your AWS',
  '- [MisarReach](https://misarreach.com) - AI lead finder', '', '## Related', '',
].join('\n');
const patch = '@@ -13,4 +13,5 @@ x\n - [Wraps](https://wraps.dev) - sending through your AWS\n - [MisarReach](https://misarreach.com) - AI lead finder\n' +
  '+- [WarmySender](https://github.com/warmysender-oss/warmysender) - open-source cold email engine; `npm i`\n \n ## Tools for effective work with emails';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dsf-'));
const write = (rel, text) => { fs.mkdirSync(path.dirname(path.join(root, rel)), {recursive: true}); fs.writeFileSync(path.join(root, rel), text); };
write('website/docs/tools/automation-platforms.md', docsPage);
write('website/docs/tools/email-work-tools.md', '# Work\n\n## Testing\n\n- [Mailtrap](https://mailtrap.io) - x\n- [Litmus](https://litmus.com) - testing\n');
write('website/docs/intro.md', '# Intro\n');
write('website/src/page.js', 'https://wraps.dev https://misarreach.com https://hubspot.com');
write('CONTRIBUTING.md', '# Contributing\n');

(async () => {
  try {
    // Helpers.
    const re = F.globToRegExp('website/docs/**/*.md');
    assert(re.test('website/docs/intro.md') && re.test('website/docs/tools/a.md') && !re.test('website/src/a.md') && !re.test('website/docs/a.mdx'));
    assert.deepEqual(F.addedLines(patch), [{line: 15, text: readme[14]}]);
    assert.equal(F.addedLines('@@ -1,2 +1,2 @@\n-a\n+b\n c\n+d').map(a => a.line).join(), '1,3');
    assert.deepEqual(F.urlsOf('see https://a.com/x, and (https://b.com).'), ['https://a.com/x', 'https://b.com']);
    const docs = F.listDocs(root, 'website/docs/**/*.md');
    assert.deepEqual([...docs.keys()].sort(), ['website/docs/intro.md', 'website/docs/tools/automation-platforms.md', 'website/docs/tools/email-work-tools.md']);

    // Analysis: README-only PR -> missing, mapped to the right page, section and neighbour.
    const added = F.addedLines(patch);
    let r = F.analyze({readmeChanged: true, docsChanged: false, added, readmeLines: readme, docs});
    assert.equal(r.missing, true);
    const [e] = r.entries;
    assert.equal(e.file, 'website/docs/tools/automation-platforms.md');
    assert.equal(e.heading, '## Delivery, outbound & infrastructure-owned');
    assert.deepEqual(e.after, {line: 10, text: '- [MisarReach](https://misarreach.com) - AI lead finder'});
    assert.equal(e.suggestion, readme[14]);
    // Docs changed in the PR -> in sync; README untouched -> in sync.
    assert.equal(F.analyze({readmeChanged: true, docsChanged: true, added, readmeLines: readme, docs}).missing, false);
    assert.equal(F.analyze({readmeChanged: false, docsChanged: false, added: [], docs}).missing, false);
    // pass-if-links-in-docs: link already on a docs page, or no links -> in sync.
    const withEntry = new Map(docs); withEntry.set('website/docs/tools/automation-platforms.md', docsPage + '\n- [WarmySender](https://github.com/warmysender-oss/warmysender)\n');
    assert.equal(F.analyze({readmeChanged: true, docsChanged: false, added, readmeLines: readme, docs: withEntry, linksInDocs: true}).missing, false);
    assert.equal(F.analyze({readmeChanged: true, docsChanged: false, added: [{line: 1, text: 'prose'}], docs, linksInDocs: true}).missing, false);
    // Without it, a prose-only README edit is still missing (generic message).
    r = F.analyze({readmeChanged: true, docsChanged: false, added: [{line: 1, text: 'prose'}], docs});
    assert.equal(r.missing, true); assert.equal(r.entries.length, 0);
    // "*" bullets are converted to the docs page's "-" style; first entry -> insert before the next one.
    r = F.analyze({readmeChanged: true, docsChanged: false, added: [{line: 19, text: '* [Mailtrap](https://mailtrap.io) - x'}],
      readmeLines: [...readme.slice(0, 18), '* [Mailtrap](https://mailtrap.io) - x', ...readme.slice(18)], docs});
    assert.equal(r.entries[0].file, 'website/docs/tools/email-work-tools.md');
    assert.equal(r.entries[0].suggestion, '- [Mailtrap](https://mailtrap.io) - x');
    assert.equal(r.entries[0].before.line, 6);
    // Unknown section -> no file, generic per-entry instruction.
    r = F.analyze({readmeChanged: true, docsChanged: false, added: [{line: 2, text: '- [New](https://new.example)'}], readmeLines: ['# X', '- [New](https://new.example)'], docs});
    assert.equal(r.entries[0].file, null);

    // Comment bodies: fence is longer than any backtick run in the entry.
    const body = F.missingBody({author: 'fortuneflick', entries: [e], docsGlob: 'website/docs/**/*.md', contributingUrl: 'https://c', checkName: 'check-sync', blobBase: 'https://github.com/o/r/blob/main'});
    assert(body.startsWith(F.MARKER));
    assert.match(body, /@fortuneflick/);
    assert.match(body, /\[`website\/docs\/tools\/automation-platforms\.md`\]\(https:\/\/github\.com\/o\/r\/blob\/main\/website\/docs\/tools\/automation-platforms\.md\) under `## Delivery, outbound & infrastructure-owned`, right after the MisarReach entry \(line 10\)/);
    assert.match(body, /```md\n- \[WarmySender\]/);
    assert.match(body, /\[contributing guide\]\(https:\/\/c\)/);
    assert.equal(F.missingBody({entries: [{...e, suggestion: 'a ``` b'}], docsGlob: 'd'}).includes('````md'), true);

    // run(): fork PR, README only -> label created + added, one comment; re-run edits in place.
    const state = {comments: [], labels: [], repoLabels: new Set(), created: 0, updated: 0, removed: 0};
    let files = [{filename: 'README.md', status: 'modified', patch}];
    const pr = {number: 453, state: 'open', user: {login: 'fortuneflick'}, labels: [], head: {sha: 'abc', repo: {full_name: 'fork/r'}}, base: {ref: 'main'}};
    const github = {
      paginate: async fn => fn === 'listFiles' ? files : fn === 'listComments' ? state.comments : [],
      rest: {
        pulls: {listFiles: 'listFiles', get: async () => ({data: pr})},
        repos: {getContent: async p => { assert.equal(p.ref, 'abc'); return {data: {content: Buffer.from(readme.join('\n')).toString('base64')}}; }},
        issues: {
          listComments: 'listComments',
          createComment: async p => { state.created++; state.comments.push({id: state.created, body: p.body}); },
          updateComment: async p => { state.updated++; state.comments.find(c => c.id === p.comment_id).body = p.body; },
          getLabel: async p => { if (!state.repoLabels.has(p.name)) { const err = new Error('nf'); err.status = 404; throw err; } },
          createLabel: async p => { state.repoLabels.add(p.name); },
          addLabels: async p => { state.labels.push(...p.labels); pr.labels = state.labels.map(name => ({name})); },
          removeLabel: async p => { state.removed++; state.labels = state.labels.filter(l => l !== p.name); pr.labels = state.labels.map(name => ({name})); },
        },
      },
    };
    const outputs = {};
    const core = {info() {}, warning() {}, setOutput: (k, v) => { outputs[k] = v; }};
    const ctx = {repo: {owner: 'o', repo: 'r'}, payload: {pull_request: pr}, serverUrl: 'https://github.com'};
    await F.run({github, context: ctx, core, root});
    assert.equal(outputs.missing, 'true');
    assert.equal(state.created, 1);
    assert(state.repoLabels.has('needs-docs-sync'));
    assert.deepEqual(state.labels, ['needs-docs-sync']);
    assert.match(state.comments[0].body, /blob\/main\/CONTRIBUTING\.md/, 'contributing guide auto-detected');
    await F.run({github, context: ctx, core, root});
    assert.equal(state.created, 1, 'no duplicate comment');
    assert.equal(state.updated, 0, 'unchanged body is not re-written');
    assert.deepEqual(state.labels, ['needs-docs-sync'], 'label not added twice');
    // Contributor adds the docs page -> label removed, comment marked resolved (edited in place).
    files = [...files, {filename: 'website/docs/tools/automation-platforms.md', status: 'modified', patch: '+x'}];
    await F.run({github, context: ctx, core, root});
    assert.equal(outputs.missing, 'false');
    assert.equal(state.removed, 1);
    assert.deepEqual(state.labels, []);
    assert.equal(state.comments.length, 1);
    assert.match(state.comments[0].body, /Docs sync: resolved/);
    await F.run({github, context: ctx, core, root});
    assert.equal(state.updated, 1, 'resolved comment is not re-written');
    // A PR that was always in sync gets no comment and no label.
    state.comments = []; state.created = 0;
    await F.run({github, context: ctx, core, root});
    assert.equal(state.created, 0);
    // workflow_dispatch with pr-number; closed PRs are skipped; bad numbers rejected.
    files = [{filename: 'README.md', status: 'modified', patch}];
    await F.run({github, context: {...ctx, payload: {}}, core, root, prNumber: '453', label: ''});
    assert.equal(state.created, 1);
    assert.deepEqual(state.labels, [], 'empty label input disables labelling');
    pr.state = 'closed';
    assert.equal((await F.run({github, context: ctx, core, root})).skipped, true);
    await assert.rejects(F.run({github, context: ctx, core, root, prNumber: '1; rm'}), /positive integer/);
    console.log('docs-sync-feedback tests: ok');
  } finally { fs.rmSync(root, {recursive: true, force: true}); }
})().catch(err => { console.error(err); process.exitCode = 1; });
