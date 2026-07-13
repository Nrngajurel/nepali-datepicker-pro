<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import PickerCard from './PickerCard.vue';
import HelperFunctions from './HelperFunctions.vue';
import Events from './Events.vue';
import { DEFS, FRAMEWORKS, snippet, type Framework } from './registry';

const framework = ref<Framework>('vanilla');
const menuOpen = ref(false);
const active = ref('introduction');

const NAV = [
  {
    title: 'Getting started', items: [
      { id: 'introduction', label: 'Introduction' },
      { id: 'installation', label: 'Installation' },
      { id: 'usage', label: 'Basic usage' },
    ]
  },
  {
    title: 'Components', items: [
      { id: 'datetime', label: 'Date & Time Picker' },
      { id: 'range', label: 'Date Range Picker' },
      { id: 'month', label: 'Month Picker' },
    ]
  },
  {
    title: 'API reference', items: [
      { id: 'helpers', label: 'Helper functions' },
      { id: 'events', label: 'Events & instance API' },
    ]
  },
];

// A basic-usage snippet that follows the selected framework, reusing the same
// generator the component cards use.
const usageCode = computed(() => snippet(DEFS[0], { withTime: true }, framework.value));

const installCode = computed(() => {
  if (framework.value === 'html' || framework.value === 'jquery') {
    return [
      '<!-- No build step — drop in the CDN bundle -->',
      '<link rel="stylesheet" href="https://unpkg.com/nepali-datepicker-pro/dist/style.css">',
      '<script src="https://unpkg.com/nepali-datepicker-pro/dist/nepali-datepicker-pro.umd.cjs"><\/script>',
    ].join('\n');
  }
  return 'npm install nepali-datepicker-pro';
});

const cssImport = "import 'nepali-datepicker-pro/style.css';";

// ---- copy helpers -----------------------------------------------------------
const copiedKey = ref('');
async function copy(text: string, key: string) {
  await navigator.clipboard.writeText(text);
  copiedKey.value = key;
  setTimeout(() => { if (copiedKey.value === key) copiedKey.value = ''; }, 1400);
}

function go(id: string) {
  menuOpen.value = false;
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ---- scrollspy --------------------------------------------------------------
let observer: IntersectionObserver | null = null;
onMounted(() => {
  if (typeof IntersectionObserver === 'undefined') return; // jsdom / SSR
  const visible = new Map<string, number>();
  observer = new IntersectionObserver((entries) => {
    for (const e of entries) visible.set(e.target.id, e.isIntersecting ? e.intersectionRatio : 0);
    let best = active.value; let top = -1;
    for (const [id, ratio] of visible) if (ratio > top) { top = ratio; best = id; }
    if (top > 0) active.value = best;
  }, { rootMargin: '-64px 0px -55% 0px', threshold: [0, 0.25, 0.5, 1] });
  document.querySelectorAll('.doc-section').forEach((s) => observer!.observe(s));
});
onBeforeUnmount(() => observer?.disconnect());
</script>

<template>
  <header class="topbar">
    <button class="menu-btn" type="button" aria-label="Toggle navigation" @click="menuOpen = !menuOpen">☰</button>
    <a class="brand" href="#introduction" @click.prevent="go('introduction')">
      <span class="mark">न</span>
      <span>Nepali Datepicker<span class="accent">Pro</span></span>
    </a>
    <span class="ver">v1.0</span>
    <span class="spacer"></span>
    <div class="fw-bar">
      <span class="fw-label">Framework</span>
      <div class="fw-tabs">
        <button v-for="f in FRAMEWORKS" :key="f.id" type="button" :aria-selected="framework === f.id"
          @click="framework = f.id">{{ f.label }}</button>
      </div>
    </div>
  </header>

  <div class="backdrop" :class="{ show: menuOpen }" @click="menuOpen = false"></div>

  <div class="layout">
    <aside class="sidebar" :class="{ open: menuOpen }">
      <nav v-for="group in NAV" :key="group.title" class="nav-group">
        <div class="nav-title">{{ group.title }}</div>
        <a v-for="item in group.items" :key="item.id" :href="'#' + item.id" :class="{ active: active === item.id }"
          @click.prevent="go(item.id)">{{ item.label }}</a>
      </nav>
    </aside>

    <main class="content">
      <!-- Introduction -->
      <section class="doc-section" id="introduction">
        <div class="hero">
          <h1 class="hero-title">Nepali Datepicker <span>Pro</span></h1>
          <p class="hero-sub">
            A self-owned Bikram Sambat ↔ Gregorian calendar engine with date, time, range and month
            pickers — framework-agnostic, and ready for vanilla JS, a plain
            <code>&lt;script&gt;</code> tag, jQuery, Vue and React.
          </p>
          <button class="install" type="button" @click="copy('npm install nepali-datepicker-pro', 'hero')">
            <span class="dollar">$</span>
            npm install nepali-datepicker-pro
            <span class="copyhint">{{ copiedKey === 'hero' ? '✓ copied' : 'copy' }}</span>
          </button>
          <div class="hero-badges">
            <span>BS 1970–2100</span>
            <span>~17 KB gzip</span>
            <span>Zero dependencies</span>
          </div>
        </div>

        <div class="feature-grid">
          <div class="feature">
            <h4>Same-screen time</h4>
            <p>Optional 12h/24h time picker sits right under the calendar — no second popup.</p>
          </div>
          <div class="feature">
            <h4>Fiscal-aware ranges</h4>
            <p>Nepali fiscal-year presets, custom ranges and a BS/AD toggle built in.</p>
          </div>
          <div class="feature">
            <h4>Constraints</h4>
            <p>min/max dates with relative tokens, disabled weekdays and custom predicates.</p>
          </div>
          <div class="feature">
            <h4>Any stack</h4>
            <p>One package ships ES, UMD, Vue and React entry points plus auto-init data attributes.</p>
          </div>
        </div>
      </section>

      <!-- Installation -->
      <section class="doc-section" id="installation">
        <p class="sec-eyebrow">Getting started</p>
        <h2 class="sec-title">Installation</h2>
        <p class="sec-lead">Install from npm for bundled apps, or drop in the CDN build for a plain HTML page. The
          snippet below follows the <strong>Framework</strong> switch in the top bar.</p>
        <div class="prose">
          <div class="code-block">
            <button class="copy-btn" :class="{ copied: copiedKey === 'install' }"
              @click="copy(installCode, 'install')">{{ copiedKey === 'install' ? 'Copied!' : 'Copy' }}</button>
            <pre>{{ installCode }}</pre>
          </div>
          <p>Then import the stylesheet once, anywhere in your app:</p>
          <div class="code-block">
            <button class="copy-btn" :class="{ copied: copiedKey === 'css' }" @click="copy(cssImport, 'css')">{{
              copiedKey === 'css' ? 'Copied!' : 'Copy' }}</button>
            <pre>{{ cssImport }}</pre>
          </div>
          <p>The stylesheet is unstyled-framework-agnostic and theme-aware (light/dark). Everything is namespaced under
            <code>.ndp-*</code> so it won't collide with your app's CSS.
          </p>
        </div>
      </section>

      <!-- Basic usage -->
      <section class="doc-section" id="usage">
        <p class="sec-eyebrow">Getting started</p>
        <h2 class="sec-title">Basic usage</h2>
        <p class="sec-lead">Every picker attaches to an <code>&lt;input&gt;</code> and returns an instance you can drive
          programmatically. Here is a date + time picker in your framework:</p>
        <div class="prose">
          <div class="code-block">
            <button class="copy-btn" :class="{ copied: copiedKey === 'usage' }" @click="copy(usageCode, 'usage')">{{
              copiedKey === 'usage' ? 'Copied!' : 'Copy' }}</button>
            <pre>{{ usageCode }}</pre>
          </div>
          <ul>
            <li>The value is emitted as <code>{ ad, bs, time?, formatted }</code> — you get both calendars and a
              preformatted string.</li>
            <li>Read it any way you like: an <code>onChange</code> option, <code>instance.onChange(cb)</code>, or a
              bubbling DOM event on the input.</li>
            <li>Change options at runtime with <code>instance.update({ ... })</code> — the open popup updates in place.
            </li>
          </ul>
          <p>Explore each component below — tweak the options, watch the live preview, and copy the exact snippet.</p>
        </div>
      </section>

      <!-- Component playgrounds -->
      <section v-for="def in DEFS" :key="def.id" class="doc-section" :id="def.id">
        <p class="sec-eyebrow">Component</p>
        <h2 class="sec-title">{{ def.title }} Picker</h2>
        <p class="sec-lead">{{ def.description }}</p>
        <PickerCard :def="def" :framework="framework" />
      </section>

      <!-- Helpers -->
      <section class="doc-section" id="helpers">
        <p class="sec-eyebrow">API reference</p>
        <h2 class="sec-title">Helper functions</h2>
        <p class="sec-lead">A tree-shakeable, <code>NepaliFunctions</code>-compatible toolkit for BS↔AD math — usable
          without any picker.</p>
        <HelperFunctions />
      </section>

      <!-- Events -->
      <section class="doc-section" id="events">
        <p class="sec-eyebrow">API reference</p>
        <h2 class="sec-title">Events &amp; instance API</h2>
        <p class="sec-lead">Every picker returns an instance and fires callbacks plus a bubbling DOM event — wire it up
          however your stack prefers.</p>
        <Events />
      </section>

      <p class="foot">Built from <code>src/</code> · run <code>npm run dev</code> to edit live · MIT licensed.</p>
    </main>
  </div>
</template>
