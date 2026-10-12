---
title: Events & instance API
description: Every callback, bubbling DOM event and instance method a Nepali Datepicker Pro picker exposes — onChange, onApply, onOpen, onClose, getValue, setValue, update and destroy.
---

# Events & instance API

Every picker returns an instance and fires callbacks plus a bubbling DOM event — wire it up
however your stack prefers.

<Events />

## Choosing an approach

- **Callbacks** (`onChange`, `onApply`) are the simplest, and the only option the data-attribute
  auto-init path can't use.
- **`instance.onChange(cb)`** returns an unsubscribe function, which is what you want when the
  subscription outlives the mount call — a store subscription, say.
- **DOM events** bubble, so one delegated listener on a form can serve every picker inside it.
  This is the path to use with auto-init or a server-rendered page.

## Clearing

When the user clears a picker (the × button, the date-time panel's Clear button, or erasing the
typed text), it calls `onClear()` and dispatches a bubbling `clear.*` event with the same suffix
as its change event (`clear.nepaliDatePicker`, `clear.nepaliDateRangePicker`,
`clear.nepaliMonthPicker`, `clear.nepaliYearPicker`, `clear.nepaliTimePicker`,
`clear.nepaliMultiDatePicker`). The change events don't fire
for a clear. `instance.clear()` does the same from code, `instance.onClear(cb)` subscribes, and
`setValue(null)` clears without notifying. In Vue a clear sets `v-model` to `null` and emits
`@clear`.

## Validation and cancel

- `onInvalid(reason, message)` fires when a typed value is refused or a required field is left
  empty — see [Accessibility](/guide/accessibility#forms-validation). Vue emits `@invalid`.
- The range picker's `onCancel()` fires when the popup is dismissed with Cancel. Vue emits
  `@cancel`.

## Framework handles

React components take a `ref` (`PickerHandle`) and Vue components expose the same API through a
template ref (`PickerExpose`): `show()`, `hide()`, `clear()`, `getValue()`, `setValue(v)`,
`update(patch)`, `focus()` and `instance`. Custom elements have `value`, `instance`, `show()`,
`hide()` and `clear()`, and dispatch `change`, `clear`, `open`, `close` and `invalid`.

## Teardown

`destroy()` is safe to call more than once, and removes the portal, the document-level listeners
and any injected hidden fields. Your `<input>` stays in the page with its original attributes, so it
can be mounted again. In Vue and React the wrapper components call it for you on
unmount.
