# Comprehendly Forms SDK contract (apiVersion 1)

Language SDKs **must** expose these names (idiomatic casing allowed: `pageGet` ≡ `page.get`).

## Configure

`configure({ publishableKey, origin? })`

- Exchange via `POST {functionsUrl}/integration_exchange`
- Native clients **must** send `Origin` equal to an allowlisted origin on the key
- Default platform URLs: `spec/platform.json`

## Catalog and page

| Method | Gateway operation |
|--------|-------------------|
| `catalog.list(parentId?)` | `forms.catalog.list` |
| `page.get(pageId)` | `forms.page.get` |

Fillable nodes: `form_field`, `form_field_rating`, `form_field_score` (v1 generated UI implements the seven `input_type`s on `form_field` only).

## Field identity

| Key | Use |
|-----|-----|
| `element.id` | Stable page node. **Preferred bind key** for host UIs |
| `data.field_name` | Voice tools + submission payload |

Do not bind by label. Resolve `element.id` → current `field_name` after each `page.get`.

## FieldStore

One store per fill session. Voice patches and user edits merge here.

Patch event: `spec/field-patch.schema.json`.

## Surfaces

**Generated** — SDK renders a linear list of primitive controls from fillable elements. Not a clone of Comprehendly page layout (no TipTap, grids, media).

**Bound** — host already has widgets. `store.bind({ elementId }` or `{ fieldName }`, setter)`. Complex branded forms always use Bound (or the iframe widget).

## Voice

`session.start({ pageId, mode: "assistant" | "silent" })` → `forms.voice.start`.

Native: load the hosted voice bridge (`sdk.comprehendly.nz` / `forms.js`); do not reimplement Realtime.

## Save

`submissions.save` with field values keyed by `field_name`.
