# Security Policy

## Supported versions

Pin consumers to a floating major tag (`@v1`) or an immutable patch tag / commit SHA. Only the latest major line receives fixes.

## Reporting a vulnerability

If you discover a security issue in:

- composite actions or reusable workflows in this repository, or
- supply-chain risk in pinned third-party Actions

please **do not** open a public issue with exploit details.

Email **arthur.tkachenko.netweight@gmail.com** with:

1. A short description of the issue
2. Steps to reproduce (or a proof-of-concept)
3. Any suggested fix

We will acknowledge within a few business days and coordinate a fix and disclosure.

## Dependency updates

Third-party Actions are pinned to full commit SHAs. Renovate (`renovate.json`) keeps digests current. Prefer opening a PR for bumps rather than a public advisory for routine upgrades.
