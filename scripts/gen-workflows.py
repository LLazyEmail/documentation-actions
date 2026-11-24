#!/usr/bin/env python3
"""Generate the short-name alias workflows from workflows.manifest.yml and
check the hand-written reusable workflows against it.

    python3 scripts/gen-workflows.py           # write generated files
    python3 scripts/gen-workflows.py --check   # fail if anything is out of date

Aliases (manifest `aliases:`) are generated. Each alias copies the
`workflow_call` block (inputs and secrets, with descriptions and defaults)
from its long workflow, so the long workflow stays the one place an input is
declared. It then forwards every input, and the secrets, to the workflow it
calls.

Hand-written reusable workflows (manifest `workflows:`) are not generated
yet. They are checked so they can't drift:
  - job ids, check names, top-level permissions and declared secrets match
    the manifest;
  - every `with:` key passed to one of this repo's actions is an input of that
    action, and every required action input without a default is passed;
  - every declared input is used, except those listed in `unused-inputs`;
  - this repo's own refs use the `LLazyEmail/documentation-actions/<path>@main`
    form that scripts/pin-release-refs.sh rewrites at release time.

It also checks that every .github/workflows/reusable-*.yml is listed in the
manifest, and writes the alias tables in docs/naming.md and docs/deprecation.md
(between generated-table markers).

Needs PyYAML (`python3 -m pip install pyyaml`).
"""
import argparse
import difflib
import pathlib
import re
import sys

import yaml

OWN = "LLazyEmail/documentation-actions"
GENERATED_NOTE = "# Generated from workflows.manifest.yml by scripts/gen-workflows.py. Edit the manifest, not this file."
OWN_REF = re.compile(r"\b" + re.escape(OWN) + r"/([A-Za-z0-9._/-]+)@([A-Za-z0-9._-]+)")


def load(path):
    return yaml.safe_load(path.read_text())


def workflow_call(doc):
    # PyYAML reads the `on` key as boolean True.
    on = doc.get(True, doc.get("on")) or {}
    return on.get("workflow_call") or {}


def call_block(text):
    """Raw text under `  workflow_call:` (inputs, secrets, outputs), verbatim."""
    m = re.search(r"^  workflow_call:\n((?:    .*\n|\n)*)", text, re.M)
    return m.group(1).rstrip("\n") if m else ""


def render_alias(root, a):
    wf = root / ".github" / "workflows"
    long_text = (wf / f"{a['long']}.yml").read_text()
    long_doc = yaml.safe_load(long_text)
    call = workflow_call(long_doc)
    inputs = list((call.get("inputs") or {}).keys())
    secrets = list((call.get("secrets") or {}).keys())
    target = a.get("calls", a["long"])
    fixed = a.get("with-fixed") or {}
    skip = set(a.get("not-forwarded") or [])

    forwarded = [i for i in inputs if i not in skip]
    if target != a["long"]:
        # Keep the called workflow's input order so the file reads like it.
        target_inputs = list((workflow_call(load(wf / f"{target}.yml")).get("inputs") or {}).keys())
        order = [k for k in target_inputs if k in forwarded or k in fixed]
        missing = [k for k in forwarded + list(fixed) if k not in target_inputs]
        if missing:
            raise SystemExit(f"{a['short']}: {target} has no input(s) {missing}")
    else:
        order = forwarded + [k for k in fixed if k not in forwarded]

    out = [f"name: {a['name']}", "", GENERATED_NOTE]
    out += [f"# {line}" if line else "#" for line in a.get("comment", "").rstrip("\n").splitlines()]
    out += ["", "on:", "  workflow_call:"]
    block = call_block(long_text)
    if block:
        out.append(block)
    out.append("")
    perms = a.get("permissions")
    if perms:
        out.append("permissions:")
        out += [f"  {k}: {v}" for k, v in perms.items()]
        out.append("")
    out += ["jobs:", f"  {a['job']}:", f"    uses: ./.github/workflows/{target}.yml"]
    if order:
        out.append("    with:")
        for k in order:
            if k in fixed:
                v = fixed[k]
                v = "true" if v is True else "false" if v is False else v
                out.append(f"      {k}: {v}")
            else:
                out.append(f"      {k}: ${{{{ inputs.{k} }}}}")
    mode = a.get("secrets", "forward" if secrets else "none")
    if mode == "inherit":
        out.append("    secrets: inherit")
    elif mode == "forward" and secrets:
        out.append("    secrets:")
        out += [f"      {s}: ${{{{ secrets.{s} }}}}" for s in secrets]
    return "\n".join(out) + "\n"


def action_inputs(root, name):
    p = root / "actions" / name / "action.yml"
    if not p.exists():
        return None
    return load(p).get("inputs") or {}


def check_workflow(root, w, errors):
    name = w["file"]
    path = root / ".github" / "workflows" / f"{name}.yml"
    if not path.exists():
        errors.append(f"{name}: listed in the manifest but the file does not exist")
        return
    text = path.read_text()
    doc = yaml.safe_load(text)
    call = workflow_call(doc)
    jobs = doc.get("jobs") or {}

    want_jobs = w.get("jobs") or {}
    if list(jobs) != list(want_jobs):
        errors.append(f"{name}: job ids {list(jobs)} != manifest {list(want_jobs)}")
    for jid, check_name in want_jobs.items():
        got = (jobs.get(jid) or {}).get("name")
        if jid in jobs and got != check_name:
            errors.append(f"{name}: job {jid} name {got!r} != manifest {check_name!r} (check names are caller-visible)")

    if (doc.get("permissions") or None) != (w.get("permissions") or None):
        errors.append(f"{name}: permissions {doc.get('permissions')} != manifest {w.get('permissions')}")

    secrets = list((call.get("secrets") or {}).keys())
    if secrets != list(w.get("secrets") or []):
        errors.append(f"{name}: secrets {secrets} != manifest {w.get('secrets') or []}")

    used_actions = set()
    for jid, job in jobs.items():
        for step in (job or {}).get("steps") or []:
            uses = step.get("uses", "")
            m = re.fullmatch(re.escape(OWN) + r"/actions/([A-Za-z0-9._-]+)@main", uses)
            if not m:
                continue
            act = m.group(1)
            used_actions.add(act)
            ins = action_inputs(root, act)
            if ins is None:
                errors.append(f"{name}: uses missing action actions/{act}")
                continue
            passed = set((step.get("with") or {}).keys())
            unknown = passed - set(ins)
            if unknown:
                errors.append(f"{name}: job {jid} passes {sorted(unknown)} that actions/{act} does not declare")
            required = {k for k, v in ins.items() if (v or {}).get("required") and "default" not in (v or {})}
            if required - passed:
                errors.append(f"{name}: job {jid} does not pass required input(s) {sorted(required - passed)} of actions/{act}")
    if used_actions != set(w.get("actions") or []):
        errors.append(f"{name}: uses actions {sorted(used_actions)} != manifest {sorted(w.get('actions') or [])}")

    # Everything except the top-level `on:` section (where inputs are declared).
    body = re.sub(r"^on:\n(?:[ #].*\n|\n)*", "", text, count=1, flags=re.M)
    unused = [i for i in (call.get("inputs") or {}) if not re.search(r"inputs\." + re.escape(i) + r"\b", body)]
    if sorted(unused) != sorted(w.get("unused-inputs") or []):
        errors.append(f"{name}: unused inputs {unused} != manifest unused-inputs {w.get('unused-inputs') or []}")

    check_own_refs(name, text, errors)


def check_own_refs(name, text, errors):
    for m in OWN_REF.finditer(text):
        if m.group(2) != "main":
            errors.append(f"{name}: own ref {m.group(0)} must use @main on main (pinned at release by pin-release-refs.sh)")
    for line in text.splitlines():
        s = line.strip()
        if s.startswith("uses:") or s.startswith("- uses:"):
            ref = s.split("uses:", 1)[1].strip().strip("'\"")
            if ref.startswith(OWN) and not OWN_REF.fullmatch(ref.split()[0]):
                errors.append(f"{name}: own ref {ref} is not in a form pin-release-refs.sh handles")


# ---------------------------------------------------------------------------
# Wrapper inputs generated from the action's action.yml (manifest
# `workflows[].inputs-from-action` + `inputs`).

def input_chunks(block_text, indent):
    """Split an `inputs:` block into {name: [raw lines]} keeping order."""
    chunks, name = {}, None
    head = re.compile(r"^" + " " * indent + r"([A-Za-z0-9_-]+):\s*$")
    for line in block_text.splitlines():
        m = head.match(line)
        if m:
            name = m.group(1)
            chunks[name] = [line]
        elif name is not None:
            chunks[name].append(line)
    for k in chunks:
        while chunks[k] and not chunks[k][-1].strip():
            chunks[k].pop()
    return chunks


def key_lines(chunk, key, indent):
    """Raw lines of `key:` (and its continuation lines) inside one input chunk."""
    out, on = [], False
    for line in chunk[1:]:
        stripped = line.strip()
        cur = len(line) - len(line.lstrip(" "))
        if on:
            if stripped and cur <= indent:
                break
            out.append(line)
            continue
        if cur == indent and stripped.startswith(key + ":"):
            on = True
            out.append(line)
    while out and not out[-1].strip():
        out.pop()
    return out


def wf_inputs_span(text):
    """(start, end) character span of the `    inputs:` block under workflow_call."""
    m = re.search(r"^  workflow_call:\n", text, re.M)
    if not m:
        return None
    im = re.compile(r"^    inputs:\n((?:      .*\n|\n)*)", re.M).match(text, m.end())
    if not im:
        im = re.compile(r"^(?:    #.*\n)*    inputs:\n((?:      .*\n|\n)*)", re.M).match(text, m.end())
    if not im:
        return None
    end = im.end()
    # Do not swallow the blank line(s) that separate the block from what follows.
    while text[:end].endswith("\n\n"):
        end -= 1
    return im.start(), end


def render_wrapper_inputs(root, w, text):
    act = w["inputs-from-action"]
    apath = root / "actions" / act / "action.yml"
    atext = apath.read_text()
    adoc = yaml.safe_load(atext).get("inputs") or {}
    am = re.search(r"^inputs:\n((?:  .*\n|\n)*)", atext, re.M)
    achunks = input_chunks(am.group(1), 2) if am else {}
    span = wf_inputs_span(text)
    current = input_chunks(text[span[0]:span[1]].split("inputs:\n", 1)[1], 6) if span else {}

    lines = [f"    # inputs: generated from workflows.manifest.yml and actions/{act}/action.yml by scripts/gen-workflows.py",
             "    inputs:"]
    for name, spec in (w.get("inputs") or {}).items():
        if spec == "keep":
            if name not in current:
                raise SystemExit(f"{w['file']}: input {name} is `keep` but not declared in the workflow")
            lines += current[name]
            continue
        typ = spec
        if name not in adoc:
            raise SystemExit(f"{w['file']}: input {name} is not an input of actions/{act}")
        a = adoc[name] or {}
        lines.append(f"      {name}:")
        lines += ["    " + x for x in key_lines(achunks[name], "description", 4)]
        lines.append(f"        type: {typ}")
        lines.append(f"        required: {'true' if a.get('required') else 'false'}")
        if "default" in a:
            if typ == "boolean":
                lines.append(f"        default: {str(a['default']).strip().lower()}")
            elif typ == "number":
                lines.append(f"        default: {int(str(a['default']).strip())}")
            else:
                lines += ["    " + x for x in key_lines(achunks[name], "default", 4)]
    return "\n".join(lines) + "\n", span


DOC_TABLES = ["docs/naming.md", "docs/deprecation.md"]
DOC_BEGIN = ("<!-- generated: alias table from workflows.manifest.yml (scripts/gen-workflows.py); "
             "edit the manifest, not this table -->")
DOC_END = "<!-- end generated -->"

WITH_BEGIN = "# generated: inputs passed through unchanged (scripts/gen-workflows.py)"
WITH_END = "# end generated"


def render_with_lines(w, text):
    """Rewrite the `with:` block of every step that uses the wrapped action.

    Typed inputs from the manifest (`<name>: <type>`, not `keep`) are written as
    `<name>: ${{ inputs.<name> }}` between WITH_BEGIN / WITH_END. A line for the
    same key outside the markers (for example a value conversion) wins and is
    kept by hand, as is every other hand-written line.
    """
    act = w["inputs-from-action"]
    typed = [k for k, v in (w.get("inputs") or {}).items() if v != "keep"]
    lines = text.split("\n")
    uses_re = re.compile(r"^(\s*)(?:- )?uses: " + re.escape(OWN) + r"/actions/" + re.escape(act) + r"@main\s*$")
    out, i, found = [], 0, 0
    while i < len(lines):
        line = lines[i]
        m = uses_re.match(line)
        out.append(line)
        i += 1
        if not m:
            continue
        found += 1
        key_indent = len(m.group(1)) + (2 if line.lstrip().startswith("- ") else 0)
        pad = " " * key_indent
        # Other keys of the step after `uses:` (for example `id:`), up to `with:`.
        while i < len(lines) and lines[i].startswith(pad) and not lines[i].startswith(pad + " ") \
                and not lines[i].startswith(pad + "with:") and lines[i].strip():
            out.append(lines[i])
            i += 1
        hand = []
        if i < len(lines) and lines[i] == pad + "with:":
            i += 1
            inside = False
            while i < len(lines) and lines[i].startswith(pad + "  "):
                body = lines[i].strip()
                if body == WITH_BEGIN:
                    inside = True
                elif body == WITH_END:
                    inside = False
                elif not inside:
                    hand.append(lines[i])
                i += 1
        # A hand line that is already a plain pass-through of a typed input is
        # absorbed into the generated block (same key, same value).
        hand = [h for h in hand
                if not any(h.strip() == f"{k}: ${{{{ inputs.{k} }}}}" for k in typed)]
        hand_keys = {h.strip().split(":", 1)[0] for h in hand if not h.strip().startswith("#")}
        gen = [k for k in typed if k not in hand_keys]
        if gen or hand:
            out.append(pad + "with:")
        if gen:
            out.append(pad + "  " + WITH_BEGIN)
            out += [f"{pad}  {k}: ${{{{ inputs.{k} }}}}" for k in gen]
            out.append(pad + "  " + WITH_END)
        out += hand
    if found == 0:
        # Reported by the caller; check_workflow explains why (for example a non-@main ref).
        return None
    return "\n".join(out)


def check_exposed(root, w, errors):
    act = w["inputs-from-action"]
    adoc = load(root / "actions" / act / "action.yml").get("inputs") or {}
    listed = set(w.get("inputs") or {}) | set(w.get("not-exposed") or [])
    new = [k for k in adoc if k not in listed]
    if new:
        errors.append(f"{w['file']}: actions/{act} input(s) {new} are neither exposed (`inputs:`) nor listed in "
                      f"`not-exposed:`. Add them to the manifest and run python3 scripts/gen-workflows.py")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="fail instead of writing when generated files are out of date")
    ap.add_argument("--root", default=str(pathlib.Path(__file__).resolve().parent.parent))
    args = ap.parse_args()
    root = pathlib.Path(args.root)
    manifest = load(root / "workflows.manifest.yml")
    wf = root / ".github" / "workflows"
    errors, stale = [], []

    aliases = manifest.get("aliases") or []
    workflows = manifest.get("workflows") or []
    for w in workflows:
        if w.get("inputs-from-action"):
            path = wf / f"{w['file']}.yml"
            text = path.read_text()
            block, span = render_wrapper_inputs(root, w, text)
            if span is None:
                errors.append(f"{w['file']}: no workflow_call inputs block to generate into")
            else:
                content = text[:span[0]] + block + text[span[1]:]
                with_content = render_with_lines(w, content)
                if with_content is None:
                    errors.append(f"{w['file']}: no step uses actions/{w['inputs-from-action']}@main to generate with: lines into")
                else:
                    content = with_content
                if content != text:
                    if args.check:
                        stale.append(w["file"])
                        sys.stdout.writelines(difflib.unified_diff(
                            text.splitlines(True), content.splitlines(True),
                            f"a/{path.relative_to(root)}", f"b/{path.relative_to(root)} (generated)"))
                    else:
                        path.write_text(content)
                        print(f"wrote {path.relative_to(root)} (inputs, with: lines)")
            check_exposed(root, w, errors)
        check_workflow(root, w, errors)

    for a in aliases:
        content = render_alias(root, a)
        path = wf / f"{a['short']}.yml"
        current = path.read_text() if path.exists() else ""
        if current != content:
            if args.check:
                stale.append(a["short"])
                sys.stdout.writelines(difflib.unified_diff(
                    current.splitlines(True), content.splitlines(True),
                    f"a/{path.relative_to(root)}", f"b/{path.relative_to(root)} (generated)"))
            else:
                path.write_text(content)
                print(f"wrote {path.relative_to(root)}")
        for m in OWN_REF.finditer(content):
            errors.append(f"{a['short']}: generated alias must only use ./ refs, found {m.group(0)}")

    listed = [a["short"] for a in aliases] + [w["file"] for w in workflows]
    dupes = sorted({n for n in listed if listed.count(n) > 1})
    if dupes:
        errors.append(f"listed more than once in the manifest: {dupes}")
    on_disk = sorted(p.stem for p in wf.glob("reusable-*.yml"))
    for n in sorted(set(on_disk) - set(listed)):
        errors.append(f"{n}.yml is not in workflows.manifest.yml (add it under aliases: or workflows:)")

    # Alias tables in the docs, between DOC_BEGIN / DOC_END markers.
    table = "\n".join(["| Long name (still works) | Prefer |", "|-------------------------|--------|"]
                      + [f"| `{a['long']}` | `{a['short']}` |" for a in aliases])
    for rel in DOC_TABLES:
        path = root / rel
        if not path.exists():
            continue
        doc = path.read_text()
        m = re.search(r"^" + re.escape(DOC_BEGIN) + r"\n(.*?)^" + re.escape(DOC_END) + r"$", doc, re.M | re.S)
        if not m:
            errors.append(f"{rel}: missing the generated alias table markers ({DOC_BEGIN} ... {DOC_END})")
            continue
        content = doc[:m.start(1)] + "\n" + table + "\n\n" + doc[m.end(1):]
        if content != doc:
            if args.check:
                stale.append(rel)
                sys.stdout.writelines(difflib.unified_diff(
                    doc.splitlines(True), content.splitlines(True), f"a/{rel}", f"b/{rel} (generated)"))
            else:
                path.write_text(content)
                print(f"wrote {rel} (alias table)")

    for e in errors:
        print(f"::error::{e}")
    if stale:
        print(f"::error::generated files are out of date: {stale}. Run: python3 scripts/gen-workflows.py")
    if errors or stale:
        return 1
    gen_inputs = sum(1 for w in workflows if w.get("inputs-from-action"))
    print(f"gen-workflows: ok ({len(aliases)} aliases generated, {gen_inputs} wrappers with generated inputs and with: lines, "
          f"{len(workflows)} hand-written workflows checked)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
