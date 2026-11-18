import sharp from 'sharp'
import fs from 'node:fs'
const [out, ...specs] = process.argv.slice(2)
const m = new Map(JSON.parse(fs.readFileSync('src/data/media.generated.json', 'utf8')).items.map((i) => [i.id, i]))
const S = 300, C = 6
const comps = []
for (const [k, spec] of specs.entries()) {
  const [id, deg] = spec.split(':')
  const it = m.get(id)
  const v = (it.variants ?? it.poster)[0]
  const img = await sharp('public/' + v.file).rotate(+deg).resize(S, S - 22, { fit: 'contain', background: '#222' }).toBuffer()
  const x = (k % C) * S, y = Math.floor(k / C) * S
  comps.push({ input: img, left: x, top: y + 22 })
  comps.push({ input: Buffer.from(`<svg width="${S}" height="22"><rect width="100%" height="100%"/><text x="4" y="16" font-size="13" font-family="sans-serif" fill="#ff0">${k}: ${id} ${deg}</text></svg>`), left: x, top: y })
}
await sharp({ create: { width: C * S, height: Math.ceil(specs.length / C) * S, channels: 3, background: '#111' } }).composite(comps).jpeg({ quality: 80 }).toFile(out)
