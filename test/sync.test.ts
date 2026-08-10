import { beforeEach, describe, expect, it } from 'vitest'
import { setPlatform } from '../src/platform'
import { db } from '../src/db/local/db'
import { entriesRepo } from '../src/db/local/entriesRepo'
import { photosRepo } from '../src/db/local/photosRepo'
import { meta } from '../src/db/local/meta'
import { SyncEngine } from '../src/sync/SyncEngine'
import { Blob as NodeBlob } from 'node:buffer'
import { FakeGateway, FakeConnectivity, makeFakePlatform } from './fakes'

const USER = 'user-1'

let gateway: FakeGateway
let net: FakeConnectivity
let engine: SyncEngine

async function clearDb() {
  await Promise.all([
    db.entries.clear(),
    db.photos.clear(),
    db.syncQueue.clear(),
    db.conflicts.clear(),
    db.appMeta.clear(),
  ])
}

beforeEach(async () => {
  const { platform, connectivity } = makeFakePlatform()
  setPlatform(platform)
  net = connectivity
  gateway = new FakeGateway()
  engine = new SyncEngine()
  engine.configure(gateway, USER)
  await clearDb()
})

// Use node:buffer Blob so fake-indexeddb's native structured clone preserves
// the bytes (jsdom's Blob does not clone in this environment).
function jpeg(): File {
  return new NodeBlob([new Uint8Array([1, 2, 3, 4])], { type: 'image/jpeg' }) as unknown as File
}

describe('offline creation', () => {
  it('persists locally offline and syncs exactly once on reconnect', async () => {
    net.set(false)

    const entry = await entriesRepo.create({ userId: USER, title: 'Offline thought' })
    expect(await db.syncQueue.count()).toBe(1)

    // Sync while offline does nothing remote.
    await engine.sync()
    expect(gateway.entries.size).toBe(0)

    // "Restart": the entry is still in local storage.
    const afterRestart = await db.entries.get(entry.id)
    expect(afterRestart?.title).toBe('Offline thought')
    expect(afterRestart?.syncStatus).toBe('pending_create')

    // Reconnect → it syncs.
    net.set(true)
    await engine.sync()
    expect(gateway.entries.size).toBe(1)
    expect((await db.entries.get(entry.id))?.syncStatus).toBe('synced')
    expect(await db.syncQueue.count()).toBe(0)

    // Running sync again must not create a duplicate.
    await engine.sync()
    await engine.sync()
    expect(gateway.entries.size).toBe(1)
  })
})

describe('offline editing', () => {
  it('an edit made offline reaches the server after reconnect', async () => {
    // Create + sync while online.
    const entry = await entriesRepo.create({ userId: USER, title: 'v1' })
    await engine.sync()
    expect(gateway.entries.get(entry.id)?.title).toBe('v1')

    // Go offline, edit.
    net.set(false)
    await entriesRepo.update(entry.id, { title: 'v2 edited' })
    expect((await db.entries.get(entry.id))?.syncStatus).toBe('pending_update')
    await engine.sync()
    expect(gateway.entries.get(entry.id)?.title).toBe('v1') // unchanged offline

    // Reconnect → edit propagates.
    net.set(true)
    await engine.sync()
    expect(gateway.entries.get(entry.id)?.title).toBe('v2 edited')
    expect((await db.entries.get(entry.id))?.syncStatus).toBe('synced')
  })
})

describe('offline photo', () => {
  it('stores the blob locally, survives restart, and uploads on reconnect', async () => {
    net.set(false)
    const entry = await entriesRepo.create({ userId: USER })
    const photo = await photosRepo.addFromFile(entry.id, USER, jpeg())

    // Renders immediately: blob bytes present locally, not yet uploaded.
    let local = await db.photos.get(photo.id)
    expect(local).toBeTruthy()
    expect((local!.blob as Blob).size).toBe(4)
    expect(local!.storagePath).toBeNull()
    expect(local!.syncStatus).toBe('pending_create')

    // "Restart": bytes still present.
    local = await db.photos.get(photo.id)
    expect((local!.blob as Blob).size).toBe(4)

    // Reconnect → uploads and records the storage path + entry reference.
    net.set(true)
    await engine.sync()
    local = await db.photos.get(photo.id)
    expect(local?.storagePath).toBeTruthy()
    expect(local?.syncStatus).toBe('synced')
    expect(gateway.photos.get(photo.id)?.entry_id).toBe(entry.id)
    expect(gateway.objects.size).toBe(1)

    // Idempotent: another sync doesn't re-upload.
    await engine.sync()
    expect(gateway.uploadPhotoCalls).toBe(1)
  })
})

describe('deletion', () => {
  it('removes a synced entry from the server without resurrecting it', async () => {
    const entry = await entriesRepo.create({ userId: USER, title: 'temp' })
    await engine.sync()
    expect(gateway.entries.get(entry.id)?.deleted_at).toBeNull()

    // Delete offline, then reconnect.
    net.set(false)
    await entriesRepo.softDelete(entry.id)
    expect((await db.entries.get(entry.id))?.syncStatus).toBe('pending_delete')
    net.set(true)
    await engine.sync()
    expect(gateway.entries.get(entry.id)?.deleted_at).toBeTruthy()

    // Repeated syncs (which pull) must not resurrect it as active.
    await engine.sync()
    await engine.sync()
    const local = await db.entries.get(entry.id)
    expect(local?.deletedAt).toBeTruthy()
  })

  it('a never-synced entry deleted offline never reaches the server', async () => {
    net.set(false)
    const entry = await entriesRepo.create({ userId: USER })
    await entriesRepo.softDelete(entry.id)
    // Hard-removed locally, queue emptied.
    expect(await db.entries.get(entry.id)).toBeUndefined()
    expect(await db.syncQueue.count()).toBe(0)

    net.set(true)
    await engine.sync()
    expect(gateway.entries.size).toBe(0)
  })
})

describe('duplicate prevention / idempotency', () => {
  it('many edits + repeated syncs yield exactly one server row', async () => {
    const entry = await entriesRepo.create({ userId: USER, title: 'a' })
    await entriesRepo.update(entry.id, { title: 'b' })
    await entriesRepo.update(entry.id, { title: 'c' })
    // Multiple edits coalesce into a single queue item.
    expect(await db.syncQueue.count()).toBe(1)

    await engine.sync()
    await engine.sync()
    await engine.sync()

    expect(gateway.entries.size).toBe(1)
    expect(gateway.entries.get(entry.id)?.title).toBe('c')
  })
})

describe('conflict resolution (last-write-wins, no data loss)', () => {
  it('remote wins when newer and logs the losing local version', async () => {
    const entry = await entriesRepo.create({ userId: USER, title: 'base' })
    await engine.sync()

    // Local pending edit with an OLD clock.
    await db.entries.update(entry.id, {
      title: 'local edit',
      updatedAt: 1, // very old
      syncStatus: 'pending_update',
    })
    await db.syncQueue.clear() // isolate the pull path
    // Remote has a NEWER version; reset cursor so the pull sees it.
    const remote = gateway.entries.get(entry.id)!
    remote.title = 'remote edit'
    remote.updated_at = new Date(Date.now() + 60_000).toISOString()
    await meta.setPullCursor(new Date(0).toISOString())

    await engine.sync()

    expect((await db.entries.get(entry.id))?.title).toBe('remote edit')
    expect(await db.conflicts.count()).toBe(1)
    const conflict = (await db.conflicts.toArray())[0]
    expect(conflict.winner).toBe('remote')
  })

  it('local wins when newer and stays pending', async () => {
    const entry = await entriesRepo.create({ userId: USER, title: 'base' })
    await engine.sync()

    await db.entries.update(entry.id, {
      title: 'local newer',
      updatedAt: Date.now() + 60_000,
      syncStatus: 'pending_update',
    })
    await db.syncQueue.clear() // isolate the pull/conflict path from push
    const remote = gateway.entries.get(entry.id)!
    remote.title = 'remote older'
    remote.updated_at = new Date(Date.now() - 60_000).toISOString()
    await meta.setPullCursor(new Date(0).toISOString())

    await engine.sync()

    const local = await db.entries.get(entry.id)
    expect(local?.title).toBe('local newer')
    expect(await db.conflicts.count()).toBe(1)
    expect((await db.conflicts.toArray())[0].winner).toBe('local')
  })
})
