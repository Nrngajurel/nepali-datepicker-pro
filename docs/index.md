---
layout: home
title: Nepali Datepicker Pro — Bikram Sambat date, range & month picker
titleTemplate: false
description: A self-owned Bikram Sambat ↔ Gregorian calendar engine with date, time, range and month pickers. Zero dependencies, ~17 KB gzip, and ready for vanilla JS, a <script> tag, jQuery, Vue and React.

hero:
  name: Nepali Datepicker Pro
  text: Bikram Sambat pickers for every stack
  tagline: A self-owned BS ↔ AD calendar engine with date, time, range and month pickers — zero dependencies, ~17 KB gzip, and one package for vanilla JS, jQuery, Vue and React.
  image:
    src: /images/date-time-picker.png
    alt: The Nepali Datepicker Pro date and time picker, showing a Bikram Sambat calendar with a same-screen time picker
  actions:
    - theme: brand
      text: Get started
      link: /guide/introduction
    - theme: alt
      text: Live components
      link: /components/date-time-picker
    - theme: alt
      text: View on GitHub
      link: https://github.com/nrngajurel/nepali-datepicker-pro

features:
  - title: Same-screen time
    details: An optional 12h/24h time picker sits right under the calendar — no second popup, no second field.
  - title: Fiscal-aware ranges
    details: Nepali fiscal-year presets, custom ranges and a BS/AD toggle are built into the range picker.
  - title: Real constraints
    details: min/max dates with relative tokens like '+7d', disabled weekdays, and custom per-day predicates.
  - title: Any stack
    details: One package ships ES, UMD, Vue and React entry points plus data-attribute auto-init for plain HTML.
  - title: Backend-ready values
    details: Decouple what the user sees from what you submit — valueFormat, submitName and altField hand your server a clean ISO string.
  - title: Accurate by construction
    details: An O(1) conversion adapter validated against the official calendar for BS 1970–2100.
---

## Install

```bash
npm install nepali-datepicker-pro
```

```ts
import { mountDateTimePicker } from 'nepali-datepicker-pro';
import 'nepali-datepicker-pro/style.css';

mountDateTimePicker(document.querySelector('#picker'), {
  withTime: true,
  valueFormat: 'iso',
});
```

No build step? Drop in the CDN bundle and let auto-init find your inputs — see [Installation](/guide/installation).
