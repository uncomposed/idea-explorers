import { createHash } from 'node:crypto'
import { access, readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = resolve(root, 'dist')
const locks = JSON.parse(await readFile(resolve(root, 'models.lock.json'), 'utf8'))
const commit = process.env.EXPLORER_COMMIT || 'development'

for (const lock of locks) {
  const release = resolve(dist, lock.slug, 'releases', commit)
  const manifestPath = resolve(release, 'rendering-manifest.json')
  await access(resolve(dist, lock.slug, 'index.html'))
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  if (manifest.rendering.live_uri !== `https://proximitytoprogress.com/ideas/${lock.slug}/`) throw new Error(`${lock.slug}: wrong live URI`)
  if (manifest.rendering.renders.git.commit !== lock.commit) throw new Error(`${lock.slug}: wrong idea commit`)
  if (manifest.rendering.renders.git.model_digest !== `sha256:${lock.model_sha256}`) throw new Error(`${lock.slug}: wrong model digest`)
  if (commit !== 'development' && manifest.rendering.source.commit !== commit) throw new Error(`${lock.slug}: wrong explorer commit`)
  for (const file of manifest.rendering.files) {
    const bytes = await readFile(resolve(dist, file.path))
    const actual = `sha256:${createHash('sha256').update(bytes).digest('hex')}`
    if (actual !== file.digest) throw new Error(`${lock.slug}: digest mismatch for ${file.path}`)
  }
}

console.log(`Verified ${locks.length} explorer releases at ${commit}.`)
