#!/usr/bin/env bash
# Every short name advertised in docs/naming.md must exist as a workflow file,
# its long name must still exist, and the alias must accept every input the
# long workflow accepts (so swapping names never breaks a caller).
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

python3 - <<'PY'
import re, sys, pathlib

wf = pathlib.Path('.github/workflows')
rows = re.findall(r'^\| `(reusable-[a-z0-9-]+)` \| `(reusable-[a-z0-9-]+)` \|',
                  pathlib.Path('docs/naming.md').read_text(), re.M)
if not rows:
    sys.exit('no alias rows found in docs/naming.md')

def inputs(path):
    text = path.read_text()
    m = re.search(r'^  workflow_call:\n((?:    .*\n|\n)*)', text, re.M)
    if not m:
        return set()
    block = m.group(1)
    im = re.search(r'^    inputs:\n((?:      .*\n|\n)*)', block, re.M)
    if not im:
        return set()
    return set(re.findall(r'^      ([a-z0-9-]+):\s*$', im.group(1), re.M))

def secrets(path):
    text = path.read_text()
    m = re.search(r'^  workflow_call:\n((?:    .*\n|\n)*)', text, re.M)
    if not m:
        return set()
    sm = re.search(r'^    secrets:\n((?:      .*\n|\n)*)', m.group(1), re.M)
    return set(re.findall(r'^      ([A-Za-z0-9_]+):\s*$', sm.group(1), re.M)) if sm else set()

fail = 0
for long_name, short in rows:
    lp, sp = wf / f'{long_name}.yml', wf / f'{short}.yml'
    for p in (lp, sp):
        if not p.exists():
            print(f'FAIL: {p} is listed in docs/naming.md but does not exist')
            fail = 1
    if lp.exists() and sp.exists():
        missing = inputs(lp) - inputs(sp)
        lost_secrets = secrets(lp) - secrets(sp)
        stext = sp.read_text()
        calls_long = f'uses: ./.github/workflows/{long_name}.yml' in stext
        if missing:
            print(f'FAIL: {short} is missing inputs of {long_name}: {sorted(missing)}')
            fail = 1
        elif lost_secrets:
            print(f'FAIL: {short} does not declare secrets of {long_name}: {sorted(lost_secrets)}')
            fail = 1
        elif calls_long and not all(f'{i}: ${{{{ inputs.{i} }}}}' in stext for i in inputs(lp)):
            print(f'FAIL: {short} does not pass every input through to {long_name}')
            fail = 1
        elif calls_long and not all(f'{n}: ${{{{ secrets.{n} }}}}' in stext or 'secrets: inherit' in stext for n in secrets(lp)):
            print(f'FAIL: {short} does not pass every secret through to {long_name}')
            fail = 1
        else:
            print(f'ok: {short} -> {long_name} ({len(inputs(lp))} inputs, {len(secrets(lp))} secrets)')
sys.exit(fail)
PY
