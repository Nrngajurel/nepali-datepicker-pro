---
title: Theming
description: Restyle Nepali Datepicker Pro with CSS custom properties — every design token, the built-in dark theme (theme option or data-ndp-theme attribute), compact/comfortable/touch density and inline calendars.
---

# Theming

Every picker is styled by one stylesheet, `nepali-datepicker-pro/style.css`, driven by CSS custom
properties. There's no CSS-in-JS, no Tailwind requirement and no shadow DOM: override a token, or
target the `.ndp-*` classes like any other CSS.

## Design tokens

Override any token on `:root`, or on a wrapper element to theme only the pickers inside it:

```css
:root {
  --ndp-color-primary: #2563eb;
  --ndp-color-primary-hover: #1d4ed8;
  --ndp-color-primary-bg: #eff6ff;
  --ndp-radius: 6px;
  --ndp-font: 'Inter', 'Noto Sans Devanagari', sans-serif;
}
```

| Token | Default (light) | Used for |
| --- | --- | --- |
| `--ndp-color-primary` | `#257a41` | Selected days, the header, Apply |
| `--ndp-color-primary-hover` | `#1f6837` | Hover on primary controls |
| `--ndp-color-primary-bg` | `#e8f5ed` | Primary tints |
| `--ndp-color-on-primary` | `#ffffff` | Text and icons drawn on the primary color |
| `--ndp-color-accent` | `#245c7a` | Accents; default event dot and focus color |
| `--ndp-color-surface` | `#ffffff` | Panel and field background |
| `--ndp-color-surface-subtle` | `#f3f6f7` | Subtle backgrounds |
| `--ndp-color-surface-hover` | `#e8ecef` | Hover backgrounds |
| `--ndp-color-page` | `#f6f7f8` | Page-level background |
| `--ndp-color-text` | `#262b30` | Text |
| `--ndp-color-text-muted` | `#5f6670` | Secondary text |
| `--ndp-color-text-faint` | `#636b74` | Faint text |
| `--ndp-color-border` | `#dfe4e8` | Borders |
| `--ndp-color-danger` | `#c53030` | Errors and validation messages |
| `--ndp-color-weekend` | `var(--ndp-color-danger)` | Weekend days (`weekendDays`) |
| `--ndp-color-holiday` | `var(--ndp-color-danger)` | Holidays (`events`, `dayCellProps`) |
| `--ndp-color-event` | `var(--ndp-color-accent)` | Event dots without their own `color` |
| `--ndp-color-range-bg` | `var(--ndp-color-primary-bg)` | Days inside a range |
| `--ndp-color-focus` | `var(--ndp-color-accent)` | Focus color |
| `--ndp-focus-ring` | `2px solid var(--ndp-color-focus)` | The keyboard focus outline |
| `--ndp-color-backdrop` | `rgba(15, 23, 32, 0.45)` | Phone bottom-sheet backdrop |
| `--ndp-radius` / `--ndp-radius-lg` | `8px` / `14px` | Corner radii |
| `--ndp-shadow` | soft drop shadow | Popup shadow |
| `--ndp-z-index` | `1000` | Popup stacking order |
| `--ndp-font` | system UI stack with Noto Sans Devanagari | Font family |
| `--ndp-font-size` / `-sm` / `-xs` | `14px` / `12px` / `11px` | Font sizes |
| `--ndp-cell-height` | `44px` | Day cell height (set by `density`) |
| `--ndp-gap` | `2px` | Gap between day cells |
| `--ndp-transition` | short ease | Hover/focus transitions (`none` under reduced motion) |

The default colors meet WCAG 2.2 AA: text at least 4.5:1, controls and focus indicators at least
3:1 against the surfaces they sit on. Keep that in mind when you change them — check white
text on your `--ndp-color-primary`, or set `--ndp-color-on-primary` to a dark color.

## Dark mode

A dark palette is built in. Turn it on per picker with the `theme` option, or for a whole page
or section with the `data-ndp-theme` attribute on any ancestor:

```ts
mountDateTimePicker(input, { theme: 'dark' }); // always dark
mountDateTimePicker(input, { theme: 'auto' }); // follow the OS (prefers-color-scheme)
```

```html
<!-- every picker on the page -->
<html data-ndp-theme="dark">   <!-- or "auto", or "light" -->
```

- Leaving `theme` unset follows the page: light, unless an ancestor sets `data-ndp-theme`.
- The dark theme redefines the same tokens, so your overrides keep working. Scope dark-only
  overrides under `[data-ndp-theme="dark"]`.
- If your site already toggles a dark class, set `data-ndp-theme` alongside it, or apply the theme
  app-wide with `setDefaults({ theme: 'auto' })`.

```css
[data-ndp-theme="dark"] {
  --ndp-color-primary: #60a5fa;
  --ndp-color-on-primary: #0b1220;
}
```

## Density

`density` sizes the cells and controls:

| Value | Day cells | Notes |
| --- | --- | --- |
| `'compact'` | 32px | Tight spacing, for dense admin forms |
| `'comfortable'` | 44px | |
| `'touch'` | 48px | Also 44px header buttons |

Without `density`, each picker uses its own default, and touch targets already grow on touch
screens. You can also set `--ndp-cell-height` and `--ndp-gap` directly.

## Inline calendars

`inline: true` draws the calendar in the page, always visible, instead of in a popup. Mounted on
an `<input>`, the calendar appears under it; mounted on another element (a `<div>`), the calendar
is drawn inside that element with no field.

```ts
mountDateTimePicker(document.querySelector('#calendar'), { inline: true });
```

## Field details

- `showFieldIcon: false` removes the calendar icon at the start of the field.
- `showCalendarSuffix: false` hides the small "BS" / "AD" label after the value. It's display only
  either way — the value and `formatted` never include it.
- On screens 560px wide or less, every popup opens as a bottom sheet. The portal gets the
  `ndp-sheet` class; target `.ndp-sheet .ndp-panel` to restyle it.
- All motion respects `prefers-reduced-motion`.

## See also

- [Accessibility](/guide/accessibility)
- [Options](/guide/options)
