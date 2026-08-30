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
