// The popup renderers and the paste parser are split off and loaded on first
// use (src/render/lazy.ts). Most tests drive the popup synchronously, so load
// them all up front; test/lazy.test.ts covers the on-demand path.
import { preloadAll } from '../src/render/lazy.js';

await preloadAll();
