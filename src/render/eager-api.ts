// The lazy loader's API (./lazy.ts) over modules that are already bundled in —
// what the single-file <script> builds use in its place (vite.umd.config.ts).
import type { LazyModule, LazyName } from './lazy.js';

type Modules = { [N in LazyName]?: LazyModule<N> };

export function eagerApi(modules: Modules) {
  const loaded = <N extends LazyName>(name: N): LazyModule<N> | undefined => modules[name] as LazyModule<N> | undefined;
  return {
    loaded,
    load: <N extends LazyName>(name: N): Promise<LazyModule<N>> => Promise.resolve(loaded(name)!),
    preloadAll: (): Promise<void> => Promise.resolve(),
    withModule: <N extends LazyName, R>(name: N, use: (mod: LazyModule<N>) => R): R => use(loaded(name)!),
    lazyPanel: <N extends LazyName>(name: N, draw: (mod: LazyModule<N>, root: HTMLElement) => void): {
      renderPanel(root: HTMLElement): void;
      panelReady(): boolean;
      loadPanel(): Promise<unknown>;
    } => ({
      renderPanel: (root) => draw(loaded(name)!, root),
      panelReady: () => true,
      loadPanel: () => Promise.resolve(),
    }),
  };
}
