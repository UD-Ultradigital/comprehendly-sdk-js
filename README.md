# Comprehendly Forms JS SDK

Developer guide for engineers integrating the Comprehendly Forms SDK.

Full product documentation: https://docs.comprehendly.nz

## 1. What this package does

This SDK gives a host app the browser-side primitives needed to integrate published Comprehendly forms:

- **List published forms** with `client.catalog.list(parentId?)`
- **Load a page** with `client.page.get(pageId)`
- **Normalize fillable fields** with `FieldStore` via `client.store`
- **Read and write field values** by `field_name` or `element.id`
- **Mount the hosted voice bridge** in an iframe with `mountVoiceBridge(...)`
- **Save submissions** with `client.submissions.save(payload)`

Important behavior:

- `page.get(pageId)` also calls `client.store.loadPage(page)`
- `client.store.fields()` returns the current fillable fields for the loaded page
- `client.store.values()` returns an object keyed by `field_name`
- Generated UI is intentionally primitive; it is not a full recreation of the Comprehendly page layout

## 2. Install / run the demo

This repository includes the SDK source and a local demo. The steps below do not assume the package has been published to a public npm registry.

```bash
git clone https://github.com/UD-Ultradigital/comprehendly-sdk-js.git
cd comprehendly-sdk-js
cp demo/env.example.js demo/env.js
```

Edit `demo/env.js` and set:

- `publishableKey`: your `pk_test_...` or `pk_live_...` key
- `pageId`: optional; leave blank to load the first published form
- `origin`: usually `window.location.origin`

Then allowlist `http://localhost:4173` for that publishable key in Comprehendly.

Run the demo:

```bash
python3 -m http.server 4173 --directory demo
```

Open http://localhost:4173.

The demo shows three integration surfaces on one page:

- **Generated**: controls created from `client.store.fields()`
- **Bound**: host-owned inputs synchronized by `element.id`
- **Voice**: the hosted voice bridge mounted in an iframe

## 3. Authenticate

Use a publishable key only to exchange for a short-lived access token.

```js
import { Comprehendly } from './src/index.js'

const client = new Comprehendly({
  publishableKey: 'pk_test_replace_me'
})

const exchange = await client.exchange()
console.log(exchange.access_token)
```

Authentication flow:

1. Start with a publishable key: `pk_*`
2. Call `client.exchange()`
3. The SDK stores `client.accessToken`
4. Subsequent `client.gateway(operation, params)` calls use that exchanged token

Notes:

- `gateway(...)` automatically calls `exchange()` if `client.accessToken` is missing
- If you run outside the browser, pass an allowlisted `origin` into `new Comprehendly({ ... })`
- **Do not put `pk_*` keys on iframe URLs**
- The voice bridge URL uses the exchanged token (`integration_token`), not the publishable key

## 4. Quickstart

Examples in this repository import from `./src/index.js`. If you vendor the SDK into another app, import the same named exports from your packaged entrypoint.

```js
import { Comprehendly } from './src/index.js'

const client = new Comprehendly({
  publishableKey: 'pk_test_replace_me'
})

await client.exchange()

const catalog = await client.catalog.list()
const pageId = (catalog.forms || [])[0]?.id
if (!pageId) throw new Error('No published forms in catalog')

const page = await client.page.get(pageId)
const fields = client.store.fields()

console.log(page)
console.log(fields)
```

## 5. How-to

### Generate a simple UI from `store.fields()`

Use `client.store.fields()` after `page.get(pageId)`.

```js
const generated = document.getElementById('generated')

for (const field of client.store.fields()) {
  if (!field.generated) continue

  const label = document.createElement('label')
  label.textContent = field.label

  const input =
    field.inputType === 'textarea'
      ? document.createElement('textarea')
      : field.inputType === 'boolean'
        ? Object.assign(document.createElement('input'), { type: 'checkbox' })
        : document.createElement('input')

  if (input.tagName === 'INPUT' && field.inputType === 'number') input.type = 'number'
  if (input.tagName === 'INPUT' && field.inputType === 'date') input.type = 'date'

  input.addEventListener('input', () => {
    const value = input.type === 'checkbox' ? input.checked : input.value
    client.store.set({ fieldName: field.fieldName, value, source: 'user' })
  })

  client.store.bind({ elementId: field.elementId }, (v) => {
    if (input.type === 'checkbox') input.checked = Boolean(v)
    else if (document.activeElement !== input) input.value = v ?? ''
  })

  label.appendChild(input)
  generated.appendChild(label)
}
```

Use this for a basic linear rendering of primitive inputs. It is not a clone of the hosted Comprehendly UI.

### Bind host fields by `element.id` (never by label)

Bind your own controls with `element.id`, not display labels.

- `element.id` is the stable host binding key for the loaded page
- `field_name` is the key used for voice patches and submission payloads
- `label` is presentation text only and must not be used as an identifier

```js
const hostInput = document.getElementById('mood')
const field = client.store.fields()[0]

client.store.bind({ elementId: field.elementId }, (v) => {
  if (document.activeElement !== hostInput) hostInput.value = v ?? ''
})

hostInput.addEventListener('input', () => {
  client.store.set({
    elementId: field.elementId,
    value: hostInput.value,
    source: 'bind'
  })
})
```

### Mount voice with `mountVoiceBridge(...)`

Voice uses a hosted iframe bridge. Do not reimplement the Realtime client in your app.

```js
import { mountVoiceBridge } from './src/index.js'

await client.exchange()

const voice = mountVoiceBridge('#voice', {
  token: client.accessToken,
  pageId,
  mode: 'assistant',
  store: client.store
})

// later
voice.destroy()
```

You can also use `mode: 'silent'`.

### Save submissions with `field_values` keyed by `field_name`

`client.store.values()` already returns a map keyed by `field_name`.

```js
await client.submissions.save({
  page_id: pageId,
  field_values: client.store.values()
})
```

Do not send labels as keys. Do not send `element.id` values as submission keys.

## 6. Public API

### Top-level exports (`src/index.js`)

| Export | Type | Notes |
| --- | --- | --- |
| `Comprehendly` | class | Main SDK client |
| `createFieldStore` | function | Creates a standalone `FieldStore` |
| `fillableFields` | function | Extracts fillable field metadata from a page |
| `voiceBridgeUrl` | function | Builds the hosted voice bridge URL |
| `mountVoiceBridge` | function | Mounts the hosted voice bridge iframe |

### `Comprehendly`

| Member | Type | Notes |
| --- | --- | --- |
| `new Comprehendly({ publishableKey, origin, functionsUrl, anonKey })` | constructor | Creates a client and `store` |
| `client.publishableKey` | property | The publishable key passed to the constructor |
| `client.origin` | property | Optional allowlisted origin override |
| `client.functionsUrl` | property | Integration functions base URL |
| `client.anonKey` | property | Supabase anon key used for exchange/gateway |
| `client.accessToken` | property | Set after `exchange()` |
| `client.store` | property | `FieldStore` instance |
| `client.exchange()` | method | Exchanges `pk_*` for a short-lived access token |
| `client.gateway(operation, params = {})` | method | Calls the integration gateway |
| `client.catalog.list(parentId)` | method | Calls `forms.catalog.list` |
| `client.page.get(pageId)` | method | Calls `forms.page.get`, then `store.loadPage(page)` |
| `client.session.start({ pageId, mode, uiConsentGranted, assistantContext, userInfo })` | method | Calls `forms.voice.start` |
| `client.session.resolve()` | method | Calls `session.resolve` |
| `client.submissions.save(payload)` | method | Calls `forms.submissions.save` |
| `client.submissions.get(submissionId)` | method | Calls `forms.submissions.get` |

### `FieldStore` returned by `createFieldStore()` or `client.store`

| Member | Type | Notes |
| --- | --- | --- |
| `store.loadPage(page)` | method | Rebuilds fillable field metadata for the page |
| `store.fields()` | method | Returns the current fillable field list |
| `store.get(fieldName)` | method | Gets one field value |
| `store.values()` | method | Returns all field values keyed by `field_name` |
| `store.set({ fieldName, elementId, value, source })` | method | Writes a value and emits a patch |
| `store.subscribe(fn)` | method | Subscribes to emitted patches |
| `store.bind({ fieldName, elementId }, apply)` | method | Applies live values to host UI |
| `store.hydrate(map, source = 'hydrate')` | method | Bulk-loads values keyed by `field_name` |
| `store.applyHostMessage(data)` | method | Accepts `field_values`, `fieldValues`, `values`, or `fields` payloads |

### Voice bridge helpers

| Member | Type | Notes |
| --- | --- | --- |
| `voiceBridgeUrl({ token, pageId, mode, docsOrigin, sdkOrigin })` | function | Returns a hosted `voice-bridge.html` URL |
| `mountVoiceBridge(container, opts)` | function | Creates an iframe, wires `postMessage`, and returns `{ iframe, destroy() }` |

## 7. Full guide

For platform-level guidance, product docs, and hosted integration details, see https://docs.comprehendly.nz.
