# Proximity to Progress idea explorers

This repository builds the human-facing explorers at
`https://proximitytoprogress.com/ideas/{slug}/`.

Each explorer is an ordinary IRAP rendering. The canonical idea remains the
YAML model in its own repository at the exact commit recorded in
`models.lock.json`. The build downloads those bytes, verifies their SHA-256
digest, and refuses to create a projection if they drift.

The current shared build renders:

- The Price of Going Back
- Cislunar Momentum Loop
- Voting Topics
- Idea Rendering Attestation Protocol

Spoken Margins and AI Pacing retain their existing purpose-built explorers.

## Development

```sh
npm install
npm run dev
```

## Release build

```sh
EXPLORER_COMMIT=$(git rev-parse HEAD) npm run build
EXPLORER_COMMIT=$(git rev-parse HEAD) npm run verify
```

The build emits convenience routes and immutable release manifests. Deploys
must preserve prior hashed assets and release directories so registered
artifact digests remain resolvable.

## Shared reader experience

Price of Going Back and Cislunar Momentum Loop use the shared reader in
`src/ReaderExplorer.tsx`. The entry view explains a small mechanism and its
vocabulary; selecting a step or definition opens its supporting model
propositions. Proposition panels preserve typed relationships in both directions,
evidence requirements, falsifiers, stopping rules, and exact Git source lines.
The inspector is nonmodal on desktop and uses a native modal dialog on narrow
screens. Views and selections have shareable URLs with browser-back support.

`reader-guides.mjs` contains editorial navigation and definitions, each referencing
canonical proposition IDs. These are explicitly identified as reading aids, not
additional canonical claims. `semantic-model.mjs` preserves the original source
sections and rejects dangling IDs or missing hypothesis fields. The full-model
view exposes every source section, including material omitted from the overview.
Background references are kept distinct from claim-specific empirical evidence.

Run `npm test`, `npm run build`, and `npm run verify` before release. Tests cover
the prior falsifier/rationale and claim/evidence conflations, exact source lines,
complete source-section retention, and invalid relationship/guide references.

### Other models

The shared view is deliberately independent of a model's YAML layout. AI Pacing
can map its nodes, typed dependencies, sources, audit events, and falsification
checks into it. Source contributions and history must not be relabeled as
empirical proof. Spoken Margins can map its information objects and invariants to
definitions and propositions, and execution stages to the overview. Its behavioral
evidence paths are proposed checks, not completed findings. Both need dedicated
semantic adapters and reading guides; neither existing explorer is migrated by
this change. Voting Topics and IRAP retain their existing views.

Future adapters must add explicit handling for actual claim-linked evidence;
the current two source revisions provide proposed tests but no such result links.
