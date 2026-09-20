# Comprehendly Forms — JavaScript SDK

Public npm-style client for the Comprehendly partner API (`apiVersion` 1).

Docs: https://docs.comprehendly.nz  
CDN widget (existing): https://sdk.comprehendly.nz/embed/v1/forms.js

## Clone and run the demo

You need a **Comprehendly tenant** and a **publishable API key** (`pk_test_…` / `pk_live_…`).

```bash
git clone https://github.com/flobo79/comprehendly-sdk-js.git
cd comprehendly-sdk-js
```

Create a tenant (browser):

```bash
# from the private core CLI, or open:
open https://app.comprehendly.nz/signup
```

Then in Comprehendly: publish a form → **Settings → API** → create a publishable key → allowlist **`http://localhost:4173`**.

```bash
cp demo/env.example.js demo/env.js   # gitignored
# edit demo/env.js — publishableKey + optional pageId
python3 -m http.server 4173 --directory demo
# open http://localhost:4173
```

The demo has two surfaces on the same page:

- **Generated** — fields rendered from `forms.page.get`
- **Bound** — a host `<input>` linked by `element.id`

## Install (app)

```js
import { Comprehendly } from '@comprehendly/forms'

const client = new Comprehendly({ publishableKey: 'pk_test_…' })
await client.exchange()
const page = await client.page.get(pageId)
client.store.loadPage(page)
```

Same methods as Swift: `configure` / `catalog.list` / `page.get` / `store.bind` / `session.start`.
