import { resolve } from 'node:path';
import { defineConfig } from 'vitepress';

// Deployed to GitHub Pages under the project path, so every absolute URL the
// site emits (canonical, og:url, sitemap) has to carry the base.
const HOSTNAME = 'https://nrngajurel.github.io';
const BASE = '/nepali-datepicker-pro/';
const SITE_URL = HOSTNAME + BASE;

const TITLE = 'Nepali Datepicker Pro';
const DESCRIPTION =
  'Framework-agnostic Nepali Bikram Sambat (BS) date, datetime, range and month picker with a same-screen time picker. Works with vanilla JS, a <script> tag, jQuery, Vue and React.';
const OG_IMAGE = SITE_URL + 'images/date-time-picker.png';

export default defineConfig({
  lang: 'en-US',
  title: TITLE,
  titleTemplate: ':title | Nepali Datepicker Pro',
  description: DESCRIPTION,
  base: BASE,

  // Static HTML per route, pretty URLs, and a sitemap — the three things the
  // old single-route SPA could not give a crawler.
  cleanUrls: true,
  metaChunk: true,
  lastUpdated: true,
  sitemap: { hostname: SITE_URL },

  head: [
    ['meta', { name: 'author', content: 'Narayan Gajurel' }],
    [
      'meta',
      {
        name: 'keywords',
        content:
          'nepali datepicker, bikram sambat, BS calendar, nepali calendar, nepali date picker, date range picker, nepali month picker, BS to AD converter, AD to BS, vue nepali datepicker, react nepali datepicker, jquery nepali datepicker',
      },
    ],
    ['meta', { name: 'theme-color', content: '#2f8f4e' }],
    ['link', { rel: 'icon', href: BASE + 'favicon.svg', type: 'image/svg+xml' }],

    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: TITLE }],
    ['meta', { property: 'og:image', content: OG_IMAGE }],
    ['meta', { property: 'og:image:alt', content: 'The Nepali Datepicker Pro date and time picker' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:image', content: OG_IMAGE }],

    // Rich result for the package itself.
    [
      'script',
      { type: 'application/ld+json' },
      JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'SoftwareSourceCode',
        name: TITLE,
        description: DESCRIPTION,
        codeRepository: 'https://github.com/nrngajurel/nepali-datepicker-pro',
        programmingLanguage: 'TypeScript',
        license: 'https://opensource.org/licenses/MIT',
        url: SITE_URL,
        author: { '@type': 'Person', name: 'Narayan Gajurel' },
      }),
    ],
  ],

  // Per-page canonical + Open Graph. VitePress only emits the site-wide tags
  // from `head`, so the page-specific ones are stamped in here.
  transformPageData(pageData) {
    const path = pageData.relativePath.replace(/(index)?\.md$/, '').replace(/\/$/, '');
    const url = SITE_URL + path;
    const title = pageData.frontmatter.title ?? pageData.title ?? TITLE;
    const description = pageData.frontmatter.description ?? pageData.description ?? DESCRIPTION;

    pageData.frontmatter.head ??= [];
    pageData.frontmatter.head.push(
      ['link', { rel: 'canonical', href: url }],
      ['meta', { property: 'og:url', content: url }],
      ['meta', { property: 'og:title', content: title }],
      ['meta', { property: 'og:description', content: description }],
      ['meta', { name: 'twitter:title', content: title }],
      ['meta', { name: 'twitter:description', content: description }],
    );
  },

  themeConfig: {
    logo: { src: '/favicon.svg', width: 24, height: 24 },
    siteTitle: 'Nepali Datepicker Pro',

    nav: [
      { text: 'Guide', link: '/guide/introduction', activeMatch: '/guide/' },
      { text: 'Components', link: '/components/date-time-picker', activeMatch: '/components/' },
      { text: 'API', link: '/api/helpers', activeMatch: '/api/' },
      {
        text: 'npm',
        link: 'https://www.npmjs.com/package/nepali-datepicker-pro',
      },
    ],

    sidebar: [
      {
        text: 'Getting started',
        items: [
          { text: 'Introduction', link: '/guide/introduction' },
          { text: 'Installation', link: '/guide/installation' },
          { text: 'Basic usage', link: '/guide/basic-usage' },
          { text: 'Quick start snippets', link: '/guide/quick-start' },
        ],
      },
      {
        text: 'Components',
        items: [
          { text: 'Date & Time Picker', link: '/components/date-time-picker' },
          { text: 'Date Range Picker', link: '/components/date-range-picker' },
          { text: 'Month Picker', link: '/components/month-picker' },
        ],
      },
      {
        text: 'API reference',
        items: [
          { text: 'Helper functions', link: '/api/helpers' },
          { text: 'Events & instance API', link: '/api/events' },
        ],
      },
      {
        text: 'Reference',
        items: [
          { text: 'Options', link: '/guide/options' },
          { text: 'Migration', link: '/guide/migration' },
        ],
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/nrngajurel/nepali-datepicker-pro' },
    ],

    search: { provider: 'local' },

    editLink: {
      pattern: 'https://github.com/nrngajurel/nepali-datepicker-pro/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024–present Narayan Gajurel',
    },
  },

  vite: {
    resolve: {
      // The docs import the library straight from source so the live demos
      // always reflect the working tree — no build step between edit and page.
      alias: { '@lib': resolve(import.meta.dirname, '../../src') },
    },
  },
});
