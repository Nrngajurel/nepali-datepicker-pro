// Code the field doesn't need until the popup opens (or something is pasted)
// is split off and loaded on first use: a bundler turns each import() below
// into its own chunk. The field prefetches on hover / focus / touch, so the
// chunk is usually there before the click. Once loaded, a module is used
// synchronously from then on.
const loaders = {
  datetime: () => import('./datetime-panel.js'),
  range: () => import('./range-panel.js'),
  month: () => import('./month-panel.js'),
  year: () => import('./year-panel.js'),
  time: () => import('./time-panel.js'),
  multi: () => import('./multi-panel.js'),
  /** Time wheels and entry, for pickers with a time of day. */
  timeControls: () => import('./time.js'),
  /** Placing the popup, the phone sheet, swipe paging. */
  popup: () => import('./popup.js'),
  /** Free-text date parsing, for paste. */
  loose: () => import('../format/loose.js'),
};

export type LazyName = keyof typeof loaders;
export type LazyModule<N extends LazyName> = Awaited<ReturnType<(typeof loaders)[N]>>;

const cache: { [N in LazyName]?: LazyModule<N> } = {};
const pending: { [N in LazyName]?: Promise<LazyModule<N>> } = {};

/** The module if it has loaded, else undefined. */
export function loaded<N extends LazyName>(name: N): LazyModule<N> | undefined {
  return cache[name];
}

/** Load a module (once; a failed load can be retried). */
export function load<N extends LazyName>(name: N): Promise<LazyModule<N>> {
  const ready = cache[name];
  if (ready) return Promise.resolve(ready);
  let promise = pending[name] as Promise<LazyModule<N>> | undefined;
  if (!promise) {
    promise = (loaders[name] as () => Promise<LazyModule<N>>)().then(
      (mod) => { (cache as Record<string, unknown>)[name] = mod; return mod; },
      (error: unknown) => { delete pending[name]; throw error; },
    );
    (pending as Record<string, unknown>)[name] = promise;
  }
  return promise;
}

/** Load every split-off module now — for tests, or a page that would rather
 *  pay up front than on first open. */
export function preloadAll(): Promise<void> {
  return Promise.all((Object.keys(loaders) as LazyName[]).map((name) => load(name))).then(() => undefined);
}

/** Run `use` with the module: synchronously when it's already loaded,
 *  otherwise once it arrives. */
export function withModule<N extends LazyName, R>(name: N, use: (mod: LazyModule<N>) => R): R | Promise<R> {
  const ready = cache[name];
  return ready ? use(ready) : load(name).then(use);
}

/** The popup half of a mount: draw with panel module `name` (plus the time
 *  module while `withTime()`), loading them on first use. */
export function lazyPanel<N extends LazyName>(name: N, draw: (mod: LazyModule<N>, root: HTMLElement) => void, withTime: () => boolean = () => false): {
  renderPanel(root: HTMLElement): void;
  panelReady(): boolean;
  loadPanel(): Promise<unknown>;
} {
  return {
    renderPanel: (root) => draw(loaded(name)!, root),
    panelReady: () => !!loaded(name) && (!withTime() || !!loaded('timeControls')),
    loadPanel: () => Promise.all([load(name), withTime() ? load('timeControls') : null]),
  };
}
