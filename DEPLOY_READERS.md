# Shared reader release

Deploy all seven convenience routes and `/ideas/`. Build from a committed checkout
with `EXPLORER_COMMIT` set to the full viewer commit. Run `npm test`, `npm run build`
and `npm run verify`. Release manifests bind viewer and model states and list
SHA-256 digests for every required artifact.

Upload shared content-addressed assets, exact model snapshots and immutable
release directories first. Back up existing convenience HTML and Caddy config,
then replace HTML atomically. Never delete prior assets, model snapshots, manifests
or release directories. Snapshot legacy unversioned renderings before replacement.

AI Pacing's `/ideas/ai-pacing/` route now serves this shared reader. Its specialized
subdomain remains the experience destination. Caddy config must validate before
reload. Verify public manifest digests, all seven convenience pages, old protected
files, and the primary experience destinations after deployment.

Registration of a release is separate from deployment. Register a manifest only
with its exact digest and model state; registration does not constitute an
attestation or empirical validation.
