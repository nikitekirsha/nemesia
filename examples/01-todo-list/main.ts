import { createApplication, defineComponent, getOption, getRef } from '../../index'

interface TodoItem {
  id: string
  title: string
  done: boolean
}

interface TodoState {
  items: TodoItem[]
}

const todoComponent = defineComponent({
  name: 'todo',
  schema: {
    refs: {
      root: getRef('[data-todo]', 'section'),
      form: getRef('[data-todo-form]', 'form'),
      input: getRef('[data-todo-input]', 'input'),
      list: getRef('[data-todo-list]', 'ul'),
      meta: getRef('[data-todo-meta]', 'span'),
      clearDone: getRef('[data-todo-clear-done]', 'button')
    },
    options: {
      maxItems: getOption('data-todo-max', { type: 'number', default: 10 }),
      trimInput: getOption('data-todo-trim', { type: 'boolean', default: true }),
      doneLabel: getOption('data-todo-done-label', { default: 'done' })
    }
  },
  state: (): TodoState => ({
    items: []
  }),
  methods: (ctx) => ({
    markupToState(): TodoItem[] {
      const items = ctx.refs.list.querySelectorAll('li')

      return Array.from(items).map((item) => {
        const label = item.querySelector('label')

        const id = item.getAttribute('data-id') ?? crypto.randomUUID()
        const done = item.getAttribute('data-done') === 'true'
        const title = label ? label.textContent?.replace(/\s+/g, ' ').trim() ?? '' : ''

        return { id, title, done }
      })
    },
    stateToMarkup() {
      return ctx.state.items
        .map((item) => {
          const checked = item.done ? 'checked' : ''
          const done = item.done ? 'true' : 'false'
          const labelClass = item.done ? 'todo-item-label todo-item-label-done' : 'todo-item-label'

          return `
            <li data-id="${item.id}" data-done="${done}" class="todo-item">
              <label class="${labelClass}"><input type="checkbox" ${checked} /> ${item.title}</label>
              <button class="demo-btn" data-remove type="button">Remove</button>
            </li>
          `
        })
        .join('')
    },
    add(title: string) {
      if (ctx.state.items.length >= ctx.options.maxItems) {
        return
      }

      ctx.state.items = [...ctx.state.items, { id: crypto.randomUUID(), title, done: false }]
    },
    toggle(id: string, done: boolean) {
      ctx.state.items = ctx.state.items.map((item) => (item.id === id ? { ...item, done } : item))
    },
    remove(id: string) {
      ctx.state.items = ctx.state.items.filter((item) => item.id !== id)
    },
    clearDone() {
      ctx.state.items = ctx.state.items.filter((item) => !item.done)
    },
    updateUI() {
      ctx.refs.list.innerHTML = ctx.methods.stateToMarkup()

      const total = ctx.state.items.length
      const completed = ctx.state.items.filter((item) => item.done).length

      ctx.refs.meta.textContent = `${completed} ${ctx.options.doneLabel} / ${total} total`
      ctx.refs.clearDone.disabled = completed === 0
    },
  }),
  setup(ctx) {
    ctx.state.items = ctx.methods.markupToState()
    ctx.watch('items', ctx.methods.updateUI)

    ctx.on(ctx.refs.form, 'submit', (e) => {
      e.preventDefault()

      const value = ctx.refs.input.value
      const title = ctx.options.trimInput ? value.trim() : value

      if (!title) {
        return
      }

      ctx.methods.add(title)
      ctx.refs.input.value = ''
    })

    ctx.on(ctx.refs.list, 'change', (e) => {
      const target = e.target as HTMLInputElement

      if (target.tagName !== 'INPUT' || target.type !== 'checkbox') {
        return
      }

      const item = target.closest('li')

      if (!item?.dataset.id) {
        return
      }

      ctx.methods.toggle(item.dataset.id, target.checked)
    })

    ctx.on(ctx.refs.list, 'click', (e) => {
      const target = e.target as HTMLElement
      const button = target.closest('[data-remove]') as HTMLButtonElement | null

      if (!button) {
        return
      }

      const item = button.closest('li')

      if (!item?.dataset.id) {
        return
      }

      ctx.methods.remove(item.dataset.id)
    })

    ctx.on(ctx.refs.clearDone, 'click', ctx.methods.clearDone)
  }
})

const app = createApplication()

app.register(todoComponent)
app.mount(document)
