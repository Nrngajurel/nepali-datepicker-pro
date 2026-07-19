import type { Theme } from 'vitepress';
import DefaultTheme from 'vitepress/theme';

import '@lib/theme.css';
import './custom.css';

import CodeSnippet from './components/CodeSnippet.vue';
import Events from './components/Events.vue';
import FrameworkTabs from './components/FrameworkTabs.vue';
import HelperFunctions from './components/HelperFunctions.vue';
import InstallSnippet from './components/InstallSnippet.vue';
import PickerDemo from './components/PickerDemo.vue';
import UsageSnippet from './components/UsageSnippet.vue';
import { restoreFramework } from './useFramework';

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    // Registered globally so markdown pages can drop them in without a
    // per-page <script setup> import.
    app.component('PickerDemo', PickerDemo);
    app.component('HelperFunctions', HelperFunctions);
    app.component('Events', Events);
    app.component('FrameworkTabs', FrameworkTabs);
    app.component('InstallSnippet', InstallSnippet);
    app.component('UsageSnippet', UsageSnippet);
    app.component('CodeSnippet', CodeSnippet);
  },
  setup() {
    if (typeof localStorage !== 'undefined') restoreFramework();
  },
} satisfies Theme;
