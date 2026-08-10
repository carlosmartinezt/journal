import type { RemoteGateway } from '../src/sync/gateway'
import type {
  ConnectivityPort,
  ImageProcessorPort,
  LifecyclePort,
  MediaPickerPort,
  Platform,
  ProcessedImage,
  SecureStoragePort,
} from '../src/platform/ports'
import type { Entry, Photo, RemoteEntry, RemotePhoto } from '../src/types'

/** Monotonic ISO clock so server timestamps strictly increase per write. */
export class FakeClock {
  private t = 1_700_000_000_000
  nextIso(): string {
    this.t += 1000
    return new Date(this.t).toISOString()
  }
}

/**
 * In-memory RemoteGateway that mimics Supabase semantics we depend on:
 * upsert-by-id (idempotent, no duplicates), soft-delete, and cursor pulls.
 * It also counts upsert calls so tests can prove idempotency.
 */
export class FakeGateway implements RemoteGateway {
  entries = new Map<string, RemoteEntry>()
  photos = new Map<string, RemotePhoto>()
  objects = new Map<string, Blob>()
  upsertEntryCalls = 0
  uploadPhotoCalls = 0
  private clock = new FakeClock()

  async upsertEntry(entry: Entry): Promise<{ updatedAt: string }> {
    this.upsertEntryCalls++
    const updatedAt = this.clock.nextIso()
    this.entries.set(entry.id, {
      id: entry.id,
      user_id: entry.userId,
      title: entry.title,
      content: entry.content,
      plain_text: entry.plainText,
      journal_date: entry.journalDate,
      created_at: new Date(entry.createdAt).toISOString(),
      updated_at: updatedAt,
      deleted_at: entry.deletedAt ? new Date(entry.deletedAt).toISOString() : null,
    })
    return { updatedAt }
  }

  async deleteEntry(entry: Entry): Promise<{ updatedAt: string }> {
    const updatedAt = this.clock.nextIso()
    const existing = this.entries.get(entry.id)
    if (existing) {
      existing.deleted_at = new Date(entry.deletedAt ?? Date.now()).toISOString()
      existing.updated_at = updatedAt
    }
    return { updatedAt }
  }

  async pullEntries(userId: string, since: string | null): Promise<RemoteEntry[]> {
    return [...this.entries.values()]
      .filter((e) => e.user_id === userId && (!since || e.updated_at > since))
      .sort((a, b) => a.updated_at.localeCompare(b.updated_at))
  }

  async uploadPhoto(photo: Photo): Promise<{ storagePath: string; updatedAt: string }> {
    this.uploadPhotoCalls++
    const updatedAt = this.clock.nextIso()
    const path = `${photo.userId}/${photo.entryId}/${photo.id}.jpg`
    if (photo.blob) this.objects.set(path, photo.blob)
    this.photos.set(photo.id, {
      id: photo.id,
      entry_id: photo.entryId,
      user_id: photo.userId,
      storage_path: path,
      mime_type: photo.mimeType,
      width: photo.width,
      height: photo.height,
      sort_order: photo.order,
      created_at: new Date(photo.createdAt).toISOString(),
      updated_at: updatedAt,
      deleted_at: null,
    })
    return { storagePath: path, updatedAt }
  }

  async deletePhoto(photo: Photo): Promise<{ updatedAt: string }> {
    const updatedAt = this.clock.nextIso()
    const existing = this.photos.get(photo.id)
    if (existing) {
      existing.deleted_at = new Date(photo.deletedAt ?? Date.now()).toISOString()
      existing.updated_at = updatedAt
    }
    if (photo.storagePath) this.objects.delete(photo.storagePath)
    return { updatedAt }
  }

  async pullPhotos(userId: string, since: string | null): Promise<RemotePhoto[]> {
    return [...this.photos.values()]
      .filter((p) => p.user_id === userId && (!since || p.updated_at > since))
      .sort((a, b) => a.updated_at.localeCompare(b.updated_at))
  }

  async downloadPhoto(storagePath: string): Promise<Blob> {
    const blob = this.objects.get(storagePath)
    if (!blob) throw new Error('object not found')
    return blob
  }
}

/** Controllable connectivity for tests. */
export class FakeConnectivity implements ConnectivityPort {
  private online = true
  private listeners = new Set<(o: boolean) => void>()
  isOnline() {
    return this.online
  }
  subscribe(l: (o: boolean) => void) {
    this.listeners.add(l)
    return () => this.listeners.delete(l)
  }
  set(value: boolean) {
    this.online = value
    for (const l of this.listeners) l(value)
  }
}

class NoopLifecycle implements LifecyclePort {
  isForeground() {
    return true
  }
  onForeground() {
    return () => {}
  }
  onBeforeHide() {
    return () => {}
  }
}

class PassthroughImageProcessor implements ImageProcessorPort {
  async process(file: File): Promise<ProcessedImage> {
    return { blob: file, width: 100, height: 100, mimeType: file.type || 'image/jpeg' }
  }
}

class NoopMediaPicker implements MediaPickerPort {
  async pickImages() {
    return []
  }
  async captureImage() {
    return null
  }
  supportsCamera() {
    return false
  }
}

class MemorySecureStorage implements SecureStoragePort {
  private m = new Map<string, string>()
  getItem(k: string) {
    return this.m.get(k) ?? null
  }
  setItem(k: string, v: string) {
    this.m.set(k, v)
  }
  removeItem(k: string) {
    this.m.delete(k)
  }
}

/** Build a full fake Platform, returning handles to the controllable bits. */
export function makeFakePlatform(): {
  platform: Platform
  connectivity: FakeConnectivity
} {
  const connectivity = new FakeConnectivity()
  const platform: Platform = {
    connectivity,
    lifecycle: new NoopLifecycle(),
    media: new NoopMediaPicker(),
    imageProcessor: new PassthroughImageProcessor(),
    secureStorage: new MemorySecureStorage(),
  }
  return { platform, connectivity }
}
