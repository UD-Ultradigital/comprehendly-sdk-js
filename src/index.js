import { createFieldStore } from './field-store.js'
import { platform } from './platform.js'

const DEFAULT_SCOPES = [
  'forms.schemas:read',
  'forms.submissions:read',
  'forms.submissions:write'
]

export class Comprehendly {
  constructor(opts) {
    this.publishableKey = opts.publishableKey
    this.origin = opts.origin
    this.functionsUrl = opts.functionsUrl || platform.functionsUrl
    this.anonKey = opts.anonKey || platform.supabaseAnonKey
    this.accessToken = null
    this.store = createFieldStore()
  }

  async exchange() {
    const headers = {
      'Content-Type': 'application/json',
      apikey: this.anonKey,
      Authorization: `Bearer ${this.anonKey}`
    }
    if (this.origin && typeof window === 'undefined') headers.Origin = this.origin
    const res = await fetch(`${this.functionsUrl}/integration_exchange`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        key: this.publishableKey,
        audience: 'stepcare-embed',
        requested_scopes: DEFAULT_SCOPES
      })
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      const err = new Error(body.error || 'exchange failed')
      err.code = body.error_code
      throw err
    }
    this.accessToken = body.access_token
    return body
  }

  async gateway(operation, params = {}) {
    if (!this.accessToken) await this.exchange()
    const headers = {
      'Content-Type': 'application/json',
      apikey: this.anonKey,
      Authorization: `Bearer ${this.anonKey}`
    }
    if (this.origin && typeof window === 'undefined') headers.Origin = this.origin
    const res = await fetch(`${this.functionsUrl}/integration_gateway`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        access_token: this.accessToken,
        operation,
        params
      })
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      const err = new Error(body.error || 'gateway failed')
      err.code = body.error_code
      throw err
    }
    return body.data
  }

  catalog = {
    list: (parentId) =>
      this.gateway('forms.catalog.list', parentId ? { parent_id: parentId } : {})
  }

  page = {
    get: async (pageId) => {
      const data = await this.gateway('forms.page.get', { page_id: pageId })
      const page = data.page || data
      this.store.loadPage(page)
      return page
    }
  }

  session = {
    start: (params) =>
      this.gateway('forms.voice.start', {
        page_id: params.pageId,
        session_mode: params.mode || 'silent',
        ui_consent_granted: params.uiConsentGranted !== false,
        assistant_context: params.assistantContext,
        user_info: params.userInfo
      }),
    resolve: () => this.gateway('session.resolve', {})
  }

  submissions = {
    save: (payload) => this.gateway('forms.submissions.save', payload)
  }
}

export { createFieldStore, fillableFields } from './field-store.js'
