# Proximity to Progress idea explorers

One shared human-facing reader for all seven registered ideas: Price of Going
Back, Cislunar Momentum Loop, AI Pacing, Spoken Margins, Voting Topics, Relic
Guestbook, and Idea Rendering Attestation Protocol.

Canonical YAML remains in each idea's own repository. `models.lock.json` pins its
exact commit and SHA-256; the build refuses changed bytes. `registry-inventory.json`
records the registry coverage checked for this release. `experiences.json` supplies
named destinations and platform requirements for each prominent experience action.

`src/ReaderExplorer.tsx` supplies the consistent interface. Semantic adapters in
`scripts/semantic-model.mjs` and `scripts/additional-models.mjs` preserve each model's
types, relationships, checks and exact source locations. Reading guides are
editorial navigation tied to canonical statements, not new canonical claims.
Proposed checks and source contributions remain distinct from empirical findings.
The full-model view retains every source section.

The inspector is nonmodal on desktop and a native modal on phones. Selection URLs
support sharing and browser Back. Model IDs appear only in labeled source details,
after their human-readable statements. The directory links both readers and actual
experiences; specialized applications remain independently hosted.

## Development and release

```sh
npm install
npm run dev
npm test
EXPLORER_COMMIT=$(git rev-parse HEAD) npm run build
EXPLORER_COMMIT=$(git rev-parse HEAD) npm run verify
```

See [human-factors checks and exceptions](HUMAN_FACTORS.md) and
[deployment safeguards](DEPLOY_READERS.md). Future registered ideas require an
explicit semantic adapter, guide, experience destination, inventory entry, and tests.
