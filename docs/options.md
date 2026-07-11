# Options

The full option contract is typed in `packages/core/src/types.ts`.

Important integration options:

- `appendTo`: portals popup DOM into a stable container, usually `document.body` or a modal element.
- `container`: jQuery-compatible alias for `appendTo` on the range picker.
- `locale`: daterangepicker-shaped labels and formatting.
- `altField` and `altFormat`: intended for visible BS inputs plus hidden ISO AD form fields.
- `adapter`: advanced calendar engine override.
- `dateMath`: advanced AD-side date math override.
