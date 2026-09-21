import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createFieldStore } from './field-store.js'

describe('FieldStore bind', () => {
  it('maps element id to field_name', () => {
    const store = createFieldStore()
    store.loadPage({
      elements: [
        {
          id: 'el-1',
          type: 'form_field',
          data: { field_name: 'mood', input_type: 'text', label: 'Mood' }
        }
      ]
    })
    let last
    store.bind({ elementId: 'el-1' }, (v) => {
      last = v
    })
    store.set({ elementId: 'el-1', value: 'ok', source: 'voice' })
    assert.equal(last, 'ok')
    assert.equal(store.get('mood'), 'ok')
  })

  it('hydrates voice patches by field_name', () => {
    const store = createFieldStore()
    store.loadPage({
      elements: [
        {
          id: 'el-1',
          type: 'form_field',
          data: { field_name: 'mood', input_type: 'text', label: 'Mood' }
        }
      ]
    })
    store.applyHostMessage({ field_values: { mood: 'low' } })
    assert.equal(store.get('mood'), 'low')
  })
})
