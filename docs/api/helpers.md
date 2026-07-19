---
title: Nepali date helper functions (BS ↔ AD)
description: A tree-shakeable, NepaliFunctions-compatible toolkit for Bikram Sambat to Gregorian date math — AD2BS, BS2AD, ConvertToUnicode, GetDaysInMonth and more. Convert dates live in the browser.
---

# Helper functions

A tree-shakeable, `NepaliFunctions`-compatible toolkit for BS↔AD math — usable without any
picker. Convert a date below to see it work:

<HelperFunctions />

## Usage

```ts
import { nepaliFunctions as NF } from 'nepali-datepicker-pro';

NF.AD2BS(new Date());              // → { year, month, day }
NF.BS2AD(2081, 4, 1);              // → Date (AD)
NF.BS.GetDaysInMonth(2081, 4);     // → 32
NF.ConvertToUnicode(2081);         // → '२०८१'
```

Because the helpers are a plain object of pure functions, importing them pulls in the conversion
engine and nothing else — no DOM code, no picker CSS.

## Validity range

Conversions are validated against the official calendar for **BS 1970–2100**. Dates outside that
window throw rather than returning an approximation, so a bad input surfaces at the call site
instead of becoming a silently wrong date downstream.

## See also

- [Migration](/guide/migration) — moving off `window.NepaliFunctions`
