import { beforeEach, describe, expect, it } from 'vitest'
import { Blob as NodeBlob } from 'node:buffer'
import { setPlatform } from '../src/platform'
import { db } from '../src/db/local/db'
import { entriesRepo } from '../src/db/local/entriesRepo'
import { photosRepo } from '../src/db/local/photosRepo'
import { markdownToTipTap, tipTapToMarkdown } from '../src/lib/dayone/markdown'
import { importDayOne } from '../src/lib/dayone/importer'
import { exportDayOne } from '../src/lib/dayone/exporter'
import { makeFakePlatform } from './fakes'

const USER = 'user-1'

beforeEach(async () => {
  setPlatform(makeFakePlatform().platform)
  await Promise.all([
    db.entries.clear(),
    db.photos.clear(),
    db.syncQueue.clear(),
    db.appMeta.clear(),
  ])
})

describe('markdown <-> tiptap', () => {
  it('converts headings, marks, and lists', () => {
    const doc = markdownToTipTap('# Title\n\nHello **bold** and *italic*.\n\n- one\n- two')
    const types = (doc.content as any[]).map((n) => n.type)
    expect(types).toEqual(['heading', 'paragraph', 'bulletList'])
    const para = (doc.content as any[])[1]
    const marks = para.content.flatMap((c: any) => (c.marks ?? []).map((m: any) => m.type))
    expect(marks).toContain('bold')
    expect(marks).toContain('italic')
  })

  it('round-trips core formatting', () => {
    const md = 'Hello **bold** world\n\n## Section\n\n- a\n- b'
    const doc = markdownToTipTap(md)
    const back = tipTapToMarkdown(doc)
    expect(back).toContain('**bold**')
    expect(back).toContain('## Section')
    expect(back).toMatch(/- a/)
  })
})

describe('import raw Day One JSON (text-only)', () => {
  it('creates entries with titles, dates, and pending sync', async () => {
    const journal = {
      metadata: { version: '1.0' },
      entries: [
        {
          uuid: 'ABCDEF0123456789ABCDEF0123456789',
          creationDate: '2023-05-01T14:30:00Z',
          modifiedDate: '2023-05-01T15:00:00Z',
          timeZone: 'UTC',
          text: '# A good day\n\nWe walked by the river.',
        },
      ],
    }
    const file = new NodeBlob([JSON.stringify(journal)], { type: 'application/json' }) as unknown as File
    const res = await importDayOne(file, USER)

    expect(res.entries).toBe(1)
    const all = await db.entries.where('userId').equals(USER).toArray()
    expect(all).toHaveLength(1)
    expect(all[0].title).toBe('A good day')
    expect(all[0].plainText).toContain('walked by the river')
    expect(all[0].journalDate).toBe('2023-05-01')
    expect(all[0].syncStatus).toBe('pending_create')
  })

  it('is idempotent — re-importing does not duplicate', async () => {
    const journal = {
      entries: [{ uuid: 'AAAABBBBCCCCDDDDEEEEFFFF00001111', creationDate: '2023-01-02T00:00:00Z', text: 'Note' }],
    }
    const mk = () => new NodeBlob([JSON.stringify(journal)]) as unknown as File
    await importDayOne(mk(), USER)
    await importDayOne(mk(), USER)
    expect(await db.entries.where('userId').equals(USER).count()).toBe(1)
  })
})

describe('export -> import round-trip (with a photo)', () => {
  it('preserves the entry and its photo through a Day One zip', async () => {
    // Seed an entry + photo locally.
    const entry = await entriesRepo.importEntry({
      id: '11111111-2222-3333-4444-555555555555',
      userId: USER,
      title: 'Trip',
      content: markdownToTipTap('At the **coast**.'),
      journalDate: '2022-07-04',
      createdAt: Date.parse('2022-07-04T09:00:00Z'),
      updatedAt: Date.parse('2022-07-04T09:00:00Z'),
    })
    const photoBytes = new NodeBlob([new Uint8Array([9, 8, 7, 6, 5])], { type: 'image/jpeg' }) as unknown as Blob
    await photosRepo.addImported({
      id: '99999999-8888-7777-6666-555555555555',
      entryId: entry.id,
      userId: USER,
      blob: photoBytes,
      mimeType: 'image/jpeg',
      width: 100,
      height: 80,
      order: 0,
      createdAt: entry.createdAt,
    })

    // Export → zip.
    const exported = await exportDayOne(USER)
    expect(exported.entries).toBe(1)
    expect(exported.photos).toBe(1)

    // Wipe and re-import from the produced zip (pass the JSZip-produced Blob
    // straight through — re-wrapping it breaks jsdom's FileReader).
    await Promise.all([db.entries.clear(), db.photos.clear(), db.syncQueue.clear(), db.appMeta.clear()])
    const res = await importDayOne(exported.blob as unknown as File, USER)

    expect(res.entries).toBe(1)
    expect(res.photos).toBe(1)
    const entries = await db.entries.where('userId').equals(USER).toArray()
    expect(entries[0].title).toBe('Trip')
    expect(entries[0].plainText).toContain('coast')
    const photos = await db.photos.where('entryId').equals(entries[0].id).toArray()
    expect(photos).toHaveLength(1)
    // Metadata round-tripped through the Day One zip (byte preservation through
    // IndexedDB is covered by the offline-photo test).
    expect(photos[0].mimeType).toBe('image/jpeg')
    expect(photos[0].width).toBe(100)
    expect(photos[0].order).toBe(0)
    expect(photos[0].syncStatus).toBe('pending_create')
  })
})
