import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { voiceBridgeUrl } from './voice-bridge.js'

describe('voiceBridgeUrl', () => {
  it('points at the hosted fill bridge', () => {
    const href = voiceBridgeUrl({
      token: 'scist_x',
      pageId: '11111111-1111-4111-8111-111111111111',
      mode: 'silent'
    })
    const url = new URL(href)
    assert.equal(url.origin, 'https://docs.comprehendly.nz')
    assert.equal(url.pathname, '/voice-bridge.html')
    assert.equal(url.searchParams.get('fill_mode'), 'silent')
    assert.equal(url.searchParams.get('base_url'), 'https://sdk.comprehendly.nz')
  })
})
