---
title: Installation
description: Install Nepali Datepicker Pro from npm for bundled apps, or drop in the CDN build for a plain HTML page — with per-framework snippets for vanilla JS, HTML, React, Vue and jQuery.
---

# Installation

Install from npm for bundled apps, or drop in the CDN build for a plain HTML page. The snippet
below follows the **Framework** switch — your choice is remembered across every page of these
docs.

<InstallSnippet />

Then import the stylesheet once, anywhere in your app:

```ts
import 'nepali-datepicker-pro/style.css';
```

The stylesheet is theme-aware (light/dark) and everything is namespaced under `.ndp-*`, so it
won't collide with your app's CSS.

## Entry points

The package ships one entry point per stack, so bundlers only pull in what you actually use:

| Import | Use for |
| --- | --- |
| `nepali-datepicker-pro` | Core mount functions and helpers (ES) |
| `nepali-datepicker-pro/vue` | Vue 3 components with `v-model` |
| `nepali-datepicker-pro/react` | React components |
| `nepali-datepicker-pro/jquery` | The jQuery plugin methods |
| `nepali-datepicker-pro/style.css` | The stylesheet |

The UMD build (`dist/nepali-datepicker-pro.umd.cjs`) exposes everything on a global
`NepaliPicker` for `<script>`-tag pages.

## Requirements

- **Node** ≥ 18 for the build tooling (the runtime itself has no Node dependency)
- **Peer dependencies** are all optional — install only the framework you use: `vue` ≥ 3,
  `react`/`react-dom` ≥ 18, or `jquery` ≥ 3

## Next steps

- [Basic usage](/guide/basic-usage) — mount a picker and read its value
- [Quick start snippets](/guide/quick-start) — every picker in every framework, side by side
