# Reader release scope

This change updates the convenience routes for `price-of-going-back` and
`cislunar-momentum-loop`. Deploy shared content-addressed assets and the two new
immutable release directories first, then atomically replace each route's
`index.html`. Do not delete prior assets, model snapshots, or release directories.
The shared index and other explorer routes can continue using their current assets.

Build from a clean committed checkout with `EXPLORER_COMMIT` set to the full
viewer commit. Run `npm test`, `npm run build`, and `npm run verify`. Preserve the
previous route HTML outside the web root for rollback. Verify every file listed
in the release manifests against its SHA-256 digest before changing live routes.
The release's `rendering-manifest.json` records both exact model and viewer states.

After publishing, check the two public pages, the new release manifests and assets,
and representative prior immutable manifests. A website release is not itself an
IRAP attestation or a new registry registration.
