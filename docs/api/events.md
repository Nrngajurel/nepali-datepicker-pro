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

## Teardown

`destroy()` is safe to call more than once, and removes the portal, the document-level listeners
and any injected hidden fields. In Vue and React the wrapper components call it for you on
unmount.
