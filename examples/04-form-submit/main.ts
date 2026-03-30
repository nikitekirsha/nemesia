import { createApplication, defineComponent, getOption, getRef } from '../../index'

type FormField = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
type ValidationFieldType = 'text' | 'email' | 'textarea' | 'select'

interface ValidationRule {
  fieldTypes: ValidationFieldType[]
  regex: RegExp
  message: string
}

const FIELD_VALIDATIONS: Record<string, ValidationRule> = {
  personName: {
    fieldTypes: ['text'],
    regex: /^[A-Za-z][A-Za-z\s'-]{1,59}$/,
    message: 'Use 2-60 characters: letters, spaces, apostrophe or dash.'
  },
  email: {
    fieldTypes: ['email', 'text'],
    regex: /^\S+@\S+\.\S+$/,
    message: 'Email format is invalid.'
  },
  message: {
    fieldTypes: ['textarea', 'text'],
    regex: /^.{10,500}$/s,
    message: 'Message should be 10-500 characters.'
  }
}

interface FormState {
  loading: boolean
  errors: Record<string, string>
  response: string
  responseType: 'idle' | 'success' | 'error'
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isFormField(node: Element): node is FormField {
  return node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement || node instanceof HTMLSelectElement
}

function resolveFieldType(field: FormField): ValidationFieldType {
  if (field instanceof HTMLTextAreaElement) {
    return 'textarea'
  }

  if (field instanceof HTMLSelectElement) {
    return 'select'
  }

  return field.type.toLowerCase() === 'email' ? 'email' : 'text'
}

async function submitForm(endpoint: string, payload: Record<string, string>): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  await wait(850)

  const joinedPayload = Object.values(payload).join(' ').toLowerCase()

  if (endpoint.includes('/fail') || joinedPayload.includes('error') || joinedPayload.includes('fail')) {
    return { ok: false, error: `Request to ${endpoint} failed. Please try again.` }
  }

  return { ok: true, id: `form_${Math.random().toString(36).slice(2, 8)}` }
}

const formSubmitComponent = defineComponent({
  name: 'form-submit',
  schema: {
    refs: {
      root: getRef('[data-form]', 'form'),
      submit: getRef('[data-submit]', { tag: 'button', optional: true }),
      status: getRef('[data-status]', { tag: 'span', optional: true }),
      response: getRef('[data-response]', { tag: 'div', optional: true })
    },
    options: {
      endpoint: getOption('data-form-endpoint'),
      successText: getOption('data-form-success-text', { default: 'Form submitted successfully.' })
    }
  },
  state: (): FormState => ({
    loading: false,
    errors: {},
    response: '',
    responseType: 'idle'
  }),
  methods: (ctx) => ({
    getFields(): FormField[] {
      return Array.from(ctx.refs.root.querySelectorAll('[data-form-field][name]')).filter(isFormField)
    },
    readPayload(): Record<string, string> {
      const payload: Record<string, string> = {}

      for (const field of ctx.methods.getFields()) {
        payload[field.name] = field.value.trim()
      }

      return payload
    },
    validate(payload: Record<string, string>): Record<string, string> {
      const errors: Record<string, string> = {}

      for (const field of ctx.methods.getFields()) {
        const name = field.name
        const value = payload[name] ?? ''

        if (field.required && !value) {
          errors[name] = field.dataset.requiredMessage ?? 'This field is required.'

          continue
        }

        if (!value) {
          continue
        }

        const validationType = field.dataset.validate

        if (!validationType) {
          continue
        }

        const rule = FIELD_VALIDATIONS[validationType]

        if (!rule) {
          continue
        }

        const fieldType = resolveFieldType(field)

        if (!rule.fieldTypes.includes(fieldType)) {
          errors[name] = `Validation "${validationType}" does not support field type "${fieldType}".`

          continue
        }

        if (!rule.regex.test(value)) {
          errors[name] = field.dataset.errorMessage ?? rule.message
        }
      }

      return errors
    },
    hasErrors(errors: Record<string, string>) {
      return Object.values(errors).some(Boolean)
    },
    clearFieldError(name: string) {
      if (!ctx.state.errors[name]) {
        return
      }

      const next = { ...ctx.state.errors }
      delete next[name]

      ctx.state.errors = next
    },

    updateErrors() {
      const nodes = Array.from(ctx.refs.root.querySelectorAll<HTMLElement>('[data-error-for]'))

      for (const node of nodes) {
        const name = node.dataset.errorFor ?? ''
        node.textContent = name ? ctx.state.errors[name] ?? '' : ''
      }
    },

    updateStatus() {
      ctx.refs.root.toggleAttribute('data-loading', ctx.state.loading)

      if (ctx.refs.submit) {
        ctx.refs.submit.disabled = ctx.state.loading
      }

      if (ctx.refs.status) {
        ctx.refs.status.textContent = ctx.state.loading ? 'sending...' : 'ready'
      }

      if (ctx.refs.response) {
        ctx.refs.response.textContent = ctx.state.response
        ctx.refs.response.className = ctx.state.responseType === 'success' ? 'success' : ctx.state.responseType === 'error' ? 'error' : ''
      }
    }
  }),
  setup(ctx) {
    ctx.watch(['loading', 'errors', 'response', 'responseType'], () => {
      ctx.methods.updateErrors()
      ctx.methods.updateStatus()
    }, { immediate: true })

    for (const field of ctx.methods.getFields()) {
      const clear = () => ctx.methods.clearFieldError(field.name)

      ctx.on(field, 'input', clear)
      ctx.on(field, 'change', clear)
    }

    ctx.on(ctx.refs.root, 'submit', async (e) => {
      e.preventDefault()

      if (ctx.state.loading) {
        return
      }

      const payload = ctx.methods.readPayload()
      const errors = ctx.methods.validate(payload)

      ctx.state.errors = errors

      if (ctx.methods.hasErrors(errors)) {
        ctx.state.responseType = 'error'
        ctx.state.response = 'Please fix validation errors.'

        return
      }

      ctx.state.loading = true
      ctx.state.responseType = 'idle'
      ctx.state.response = ''

      try {
        const result = await submitForm(ctx.options.endpoint, payload)

        if ('id' in result) {
          ctx.state.responseType = 'success'
          ctx.state.response = `${ctx.options.successText} (id: ${result.id}).`
          ctx.state.errors = {}
          ctx.refs.root.reset()
        } else {
          ctx.state.responseType = 'error'
          ctx.state.response = result.error
        }
      } finally {
        ctx.state.loading = false
      }
    })
  }
})

const app = createApplication()

app.register(formSubmitComponent)
app.mount(document)
