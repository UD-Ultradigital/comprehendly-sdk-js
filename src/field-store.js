const FILLABLE_TYPES = new Set([
  'form_field',
  'form_field_rating',
  'form_field_score'
])

const GENERATED_INPUT_TYPES = new Set([
  'text',
  'textarea',
  'number',
  'date',
  'boolean',
  'select',
  'multiselect'
])

export function fillableFields(page) {
  const elements = Array.isArray(page?.elements) ? page.elements : []
  const fields = []
  for (const el of elements) {
    if (!FILLABLE_TYPES.has(el?.type)) continue
    const data = el.data && typeof el.data === 'object' ? el.data : {}
    const fieldName =
      String(data.field_name || '').trim() ||
      `field_${String(el.id || '').slice(0, 8)}`
    const inputType =
      data.input_type ||
      (el.type === 'form_field_rating'
        ? 'rating'
        : el.type === 'form_field_score'
          ? 'score'
          : 'text')
    fields.push({
      elementId: String(el.id || ''),
      fieldName,
      label: String(data.label || fieldName),
      inputType,
      required: Boolean(data.required),
      options: Array.isArray(data.options) ? data.options : [],
      description: typeof data.description === 'string' ? data.description : '',
      generated: GENERATED_INPUT_TYPES.has(inputType)
    })
  }
  return fields
}

export function createFieldStore() {
  const values = new Map()
  const byElement = new Map()
  const listeners = []
  let fields = []

  function emit(patch) {
    for (const fn of listeners) fn(patch)
  }

  return {
    loadPage(page) {
      fields = fillableFields(page)
      byElement.clear()
      const keep = new Set(fields.map((f) => f.fieldName))
      for (const key of [...values.keys()]) {
        if (!keep.has(key)) values.delete(key)
      }
      for (const f of fields) {
        if (f.elementId) byElement.set(f.elementId, f)
      }
      return fields
    },
    fields: () => fields,
    get(fieldName) {
      return values.get(fieldName)
    },
    values() {
      return Object.fromEntries(values)
    },
    set(patch) {
      const fieldName =
        patch.fieldName ||
        (patch.elementId ? byElement.get(patch.elementId)?.fieldName : undefined)
      if (!fieldName) {
        throw new Error('FieldStore.set: fieldName or known elementId required')
      }
      values.set(fieldName, patch.value)
      const field = fields.find((f) => f.fieldName === fieldName)
      const next = {
        element_id: patch.elementId || field?.elementId || null,
        field_name: fieldName,
        value: patch.value,
        source: patch.source || 'user'
      }
      emit(next)
      return next
    },
    subscribe(fn) {
      listeners.push(fn)
      return () => {
        const i = listeners.indexOf(fn)
        if (i >= 0) listeners.splice(i, 1)
      }
    },
    bind(id, apply) {
      const fieldName =
        id.fieldName ||
        (id.elementId ? byElement.get(id.elementId)?.fieldName : undefined)
      if (!fieldName) {
        throw new Error('FieldStore.bind: unknown field')
      }
      apply(values.get(fieldName))
      return this.subscribe((patch) => {
        if (patch.field_name === fieldName) apply(patch.value)
      })
    },
    hydrate(map, source = 'hydrate') {
      if (!map || typeof map !== 'object') return
      for (const [fieldName, value] of Object.entries(map)) {
        try {
          this.set({ fieldName, value, source })
        } catch {
          /* ignore keys that are not on the page */
        }
      }
    },
    applyHostMessage(data) {
      if (!data || typeof data !== 'object') return
      const bag =
        data.field_values ||
        data.fieldValues ||
        data.values ||
        data.fields
      if (bag && typeof bag === 'object') this.hydrate(bag, 'voice')
    }
  }
}
