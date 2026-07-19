---
title: Basic usage
description: Mount a Nepali date picker on an input, read its value as { ad, bs, time, formatted }, and update its options at runtime — in vanilla JS, HTML, React, Vue or jQuery.
---

# Basic usage

Every picker attaches to an `<input>` and returns an instance you can drive programmatically.
Here is a date + time picker in your framework:

<UsageSnippet />

## Reading the value

The value is emitted as `{ ad, bs, time?, formatted }` — you get both calendars and a
preformatted string, so you never have to convert by hand.

Read it whichever way suits your stack:

- an `onChange` option passed at mount time
- `instance.onChange(cb)` on the returned instance, which returns an unsubscribe function
- a bubbling DOM event on the input (`select.nepaliDatePicker`)

All three are covered in [Events & instance API](/api/events).

## Changing options at runtime

```ts
picker.update({ minDate: 'today' });
```

`update()` patches the picker in place — an open popup updates without closing, and the current
value is preserved when it's still valid under the new constraints.

## Cleaning up

```ts
picker.destroy();
```

Call `destroy()` when the host component unmounts. It removes the portal, the document-level
listeners and any hidden fields the picker injected, which keeps SPA route changes leak-free.

## Next steps

- [Components](/components/date-time-picker) — configure a live picker and copy the exact snippet
- [Options](/guide/options) — the integration-level options that are easy to miss
