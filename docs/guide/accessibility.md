---
title: Accessibility
description: How Nepali Datepicker Pro meets WCAG 2.2 AA — the full keyboard map, what screen readers announce, focus handling on desktop and phones, and native form validation.
---

# Accessibility

The pickers target **WCAG 2.2 AA**, and every picker is checked with axe-core in CI, in real
browsers. This page covers what that means for keyboard, screen-reader and form users.

## Keyboard

### In the field

| Key | Does |
| --- | --- |
| Digits | Type into the focused segment (year, month, day, hour…), auto-advancing. Nepali (०–९) and ASCII digits both work |
| ← / → | Previous / next segment |
| ↑ / ↓ | Step the focused segment |
| Ctrl/⌘ + V | Paste a whole date, range or time ([formats](#paste)) |
| **Alt + ↓** (↓ on a read-only field) | Open the popup and move focus into it |
| **Ctrl/⌘ + Backspace** (or Delete) | Clear the value. On a read-only field, plain Backspace/Delete |
| Tab | Leave the field; its popup closes |

The typing order follows a numeric `displayFormat`: with `DD/MM/YYYY` the day comes first.

### In the calendar

| Key | Does |
| --- | --- |
| ← / → | Previous / next day |
| ↑ / ↓ | Same day previous / next week |
| PageUp / PageDown | Previous / next month (with Shift: year). The calendar turns the page |
| Home / End | Start / end of the week |
| Enter / Space | Pick the focused day |
| Escape | Close and return focus to the field |

Only one day is in the Tab order at a time (a roving tab index), so Tab moves on to the panel's
other controls instead of walking every day.

### In the month and year grids

| Key | Does |
| --- | --- |
| Arrow keys | Move between months / years |
| Home / End | Start / end of the row |
| PageUp / PageDown | Four rows up / down |
| Enter / Space | Pick |

### In the time controls

| Control | Key | Does |
| --- | --- | --- |
| Wheel | ↑ / ↓ | Previous / next value (skipping disabled ones) |
| Wheel | PageUp / PageDown | Five values back / forward |
| Wheel | Home / End | First / last value |
| Wheel | Digits and letters | Type-ahead: `0`, `3` → 03; `p` → PM |
| Hour / minute field | ↑ / ↓, PageUp / PageDown | Step by one / by five; Enter commits |
| AM/PM button | ↑ / ↓ | Toggle |

With `timeInputStyle: 'dropdown'` the time is set with native `<select>`s instead, which many
screen-reader users find more familiar.

## Screen readers

- **The field** is a `combobox` that opens a dialog, named by your `<label>` (React: give it an id
  with `inputProps={ { id: 'dob' } }` and use `<label htmlFor="dob">`).
- **The day grid is an ARIA grid**, with the weekday headers and the week rows inside it.
- **Every day has a full spoken name**, in both calendars — for example "Saturday, 01 Baisakh
  2081 (13 April 2024)" — plus "holiday", "start of range", "end of range" or "unavailable" where
  they apply, and the labels of any [events](/guide/options#holidays-events) on that day.
- **Today** is marked `aria-current="date"`.
- **Announcements:** month changes and picks ("… selected", the range start, the full range) are
  announced through a live region.
- **Language:** the default `language: 'bilingual'` labels everything in Nepali and English.
  Use `language: 'en'` or `'ne'` for a single language, and `strings` to change any label — see
  [Localization](/guide/localization).

## Focus

- Focus stays put when the panel re-renders, for example after "Next month".
- Escape closes the popup and returns focus to the field.
- Only one popup is open at a time, and tabbing out of a field closes its popup.
- On phones (screens 560px wide or less) the popup is a bottom sheet and it's **modal**: focus
  moves in, Tab stays inside, and the page behind is inert. Tapping the dimmed backdrop closes it.
- The focus ring is always visible, including on today and on hovered days.

## Forms & validation

- **`required: true`** works with native validation: an empty picker matches `:invalid`,
  `form.reportValidity()` reports it, and the browser blocks submit.
- **A refused typed value shows a message under the field** — for example "Date must be on or
  after 2081-01-01". The message is linked to the field, so screen readers read it with the field,
  and it's set as the field's custom validity. `showValidationMessage: false` hides the visible
  text.
- **`onInvalid(reason, message)`** reports it to your code; `reason` is one of `'invalid'`,
  `'before-min'`, `'after-max'`, `'unavailable'`, `'incomplete'`, `'required'`,
  `'time-unavailable'` or `'span'`. Vue emits `@invalid`; custom elements dispatch `invalid`.
- **`invalidBehavior: 'keep'`** leaves an invalid entry in the field for the user to fix, instead
  of reverting to the last good value (the default, `'revert'`).
- **`disabled: true`** disables the field: no typing, no popup, not submitted.
- **A form reset** restores the picker's initial value.

### Paste

A whole date can be pasted into a typeable field: ISO (`2082-03-15`), slashed, day-first or
month-first according to the display format, Devanagari digits, or month names in either calendar
(`15 Ashar 2082`, `१५ असार २०८२`, `Jun 29 2025`, `29 June 2025`). Ranges paste as
`start – end`, and times as `09:30` or `9:30 pm`.

## Visual

- Colors meet AA contrast in the light and dark themes: text at least 4.5:1, controls and focus
  indicators at least 3:1.
- Small text is at least 10–11px.
- Touch targets grow on touch screens; `density: 'touch'` makes them larger still.
- All motion respects `prefers-reduced-motion`.
- The small "BS" / "AD" label after the value tells sighted users which calendar the field is in.

## See also

- [Theming](/guide/theming)
- [Localization](/guide/localization)
