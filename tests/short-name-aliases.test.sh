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

fail = 0
for long_name, short in rows:
    lp, sp = wf / f'{long_name}.yml', wf / f'{short}.yml'
    for p in (lp, sp):
        if not p.exists():
            print(f'FAIL: {p} is listed in docs/naming.md but does not exist')
            fail = 1
    if lp.exists() and sp.exists():
        missing = inputs(lp) - inputs(sp)
        if missing:
            print(f'FAIL: {short} is missing inputs of {long_name}: {sorted(missing)}')
            fail = 1
        else:
            print(f'ok: {short} -> {long_name} ({len(inputs(lp))} inputs)')
sys.exit(fail)
PY
