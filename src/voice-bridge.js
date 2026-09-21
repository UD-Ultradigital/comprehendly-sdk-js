import { platform } from './platform.js'

export function voiceBridgeUrl({
  token,
  pageId,
  mode = 'assistant',
  docsOrigin = platform.docsUrl || 'https://docs.comprehendly.nz',
  sdkOrigin = platform.sdkOrigin
}) {
  const url = new URL('voice-bridge.html', docsOrigin.endsWith('/') ? docsOrigin : docsOrigin + '/')
  url.searchParams.set('integration_token', token)
  url.searchParams.set('page_id', pageId)
  url.searchParams.set('fill_mode', mode)
  url.searchParams.set('base_url', sdkOrigin)
  return url.toString()
}

export function mountVoiceBridge(container, opts) {
  const host = typeof container === 'string' ? document.querySelector(container) : container
  if (!host) throw new Error('voice bridge container not found')
  const iframe = document.createElement('iframe')
  iframe.title = 'Comprehendly voice'
  iframe.allow = 'microphone *; camera *; clipboard-write *; autoplay *'
  iframe.src = voiceBridgeUrl(opts)
  iframe.style.width = '100%'
  iframe.style.height = opts.height || '480px'
  iframe.style.border = '1px solid #d1e5e5'
  iframe.style.borderRadius = '8px'
  host.innerHTML = ''
  host.appendChild(iframe)
  const onMessage = (event) => {
    const data = event.data
    if (!data || typeof data !== 'object') return
    if (opts.store) opts.store.applyHostMessage(data)
    if (typeof opts.onMessage === 'function') opts.onMessage(data)
  }
  window.addEventListener('message', onMessage)
  return {
    iframe,
    destroy() {
      window.removeEventListener('message', onMessage)
      host.innerHTML = ''
    }
  }
}
