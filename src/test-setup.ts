/**
 * Give the tests a working localStorage.
 *
 * Node 22 ships its OWN experimental `localStorage` global, unavailable unless
 * the process is started with `--localstorage-file`. It occupies the name before
 * the DOM environment can install one, so `window.localStorage` is `undefined`
 * under both jsdom and happy-dom — measured, not assumed. Every browser this app
 * targets has it, so the environment is what is wrong here, not the code.
 *
 * This installs the smallest thing that behaves like the real Storage, so
 * `progress.ts` is exercised as written rather than through a mock of itself.
 * Its own try/catch means a browser that genuinely refuses storage (private
 * mode) still degrades to "nothing found yet" — that path is asserted
 * separately and is not what this shim is papering over.
 */
class MemoryStorage implements Storage {
  private map = new Map<string, string>()

  get length(): number {
    return this.map.size
  }
  key(i: number): string | null {
    return [...this.map.keys()][i] ?? null
  }
  getItem(k: string): string | null {
    return this.map.has(k) ? (this.map.get(k) as string) : null
  }
  setItem(k: string, v: string): void {
    this.map.set(String(k), String(v))
  }
  removeItem(k: string): void {
    this.map.delete(k)
  }
  clear(): void {
    this.map.clear()
  }
}

if (typeof globalThis.localStorage === 'undefined') {
  const store = new MemoryStorage()
  // Both names: the app reads window.localStorage, and window IS globalThis in
  // the vitest DOM environments, but define each explicitly rather than relying
  // on that aliasing holding.
  Object.defineProperty(globalThis, 'localStorage', { value: store, configurable: true })
  if (typeof (globalThis as any).window !== 'undefined') {
    Object.defineProperty((globalThis as any).window, 'localStorage', {
      value: store,
      configurable: true,
    })
  }
}
