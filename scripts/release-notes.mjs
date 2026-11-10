import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Prints the CHANGELOG.md section of one version, to be used as the notes of its GitHub release.
// Usage: node scripts/release-notes.mjs 2.4.1 (a leading "v" is ignored)
// Exits with 1 when the changelog has no section for the version, so the caller can fall back to something else.
const version = process.argv[2]?.replace(/^v/, '')

if (!version) {
	console.error('Usage: node scripts/release-notes.mjs <version>')
	process.exit(2)
}

const changelog = await readFile(join(dirname(fileURLToPath(import.meta.url)), '..', 'CHANGELOG.md'), 'utf8')
const lines = changelog.split('\n')
const start = lines.findIndex(line => line.startsWith(`## ${version} `))

if (start === -1) {
	console.error(`CHANGELOG.md has no section for ${version}`)
	process.exit(1)
}

const length = lines.slice(start + 1).findIndex(line => line.startsWith('## '))
const section = lines.slice(start + 1, length === -1 ? undefined : start + 1 + length)

console.log(section.join('\n').trim())
