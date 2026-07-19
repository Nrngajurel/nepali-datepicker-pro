import { ref } from 'vue';
import type { Framework } from './registry';

const KEY = 'ndp-docs-framework';

// Module-level so the choice survives client-side navigation between pages —
// picking "React" on the installation page keeps every later snippet in React.
const framework = ref<Framework>('vanilla');

export function useFramework() {
  return framework;
}

/** Restore the saved choice. Called once from the theme's client entry. */
export function restoreFramework(): void {
  const saved = localStorage.getItem(KEY);
  if (saved) framework.value = saved as Framework;
}

export function setFramework(value: Framework): void {
  framework.value = value;
  try {
    localStorage.setItem(KEY, value);
  } catch {
    /* private mode — the choice just won't persist */
  }
}
