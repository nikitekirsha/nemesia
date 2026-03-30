import { createApplication, defineComponent, getOption, getRef } from '../../index'

const modalsComponent = defineComponent({
  name: 'modals',
  schema: {
    refs: {
      root: getRef('[data-modals]', 'body'),
      triggers: getRef('[data-modals-trigger]', { tag: 'button', many: true }),
      dialogs: getRef('dialog[data-modal-id]', { tag: 'dialog', many: true }),
      closers: getRef('[data-modal-close]', { tag: 'button', many: true })
    },
    options: {
      closeOnEsc: getOption('data-modals-close-on-esc', { type: 'boolean', default: false })
    }
  },
  state: () => ({
    activeId: ''
  }),
  methods: (ctx) => ({
    findDialog(id: string) {
      return ctx.refs.dialogs.find((dialog) => dialog.dataset.modalId === id) ?? null
    },
    closeAll() {
      for (const dialog of ctx.refs.dialogs) {
        if (dialog.open) {
          dialog.close()
        }
      }

      ctx.state.activeId = ''
    },
    open(id: string) {
      const dialog = ctx.refs.dialogs.find((item) => item.dataset.modalId === id) ?? null

      if (!dialog) {
        return
      }

      ctx.methods.closeAll()
      dialog.showModal()
      ctx.state.activeId = id
    },
    updateBodyState() {
      ctx.refs.root.toggleAttribute('data-modals-open', Boolean(ctx.state.activeId))
    }
  }),
  setup(ctx) {
    ctx.watch('activeId', ctx.methods.updateBodyState, { immediate: true })

    for (const opener of ctx.refs.triggers) {
      ctx.on(opener, 'click', () => {
        const id = opener.dataset.modalsTrigger

        if (id) {
          ctx.methods.open(id)
        }
      })
    }

    for (const closer of ctx.refs.closers) {
      ctx.on(closer, 'click', () => {
        const dialog = closer.closest('dialog')

        dialog?.close()
      })
    }

    for (const dialog of ctx.refs.dialogs) {
      ctx.on(dialog, 'close', () => {
        if (ctx.state.activeId === dialog.dataset.modalId) {
          ctx.state.activeId = ''
        }
      })
    }

    if (ctx.options.closeOnEsc) {
      ctx.on(document, 'keydown', (e) => {
        if (e.key === 'Escape') {
          ctx.methods.closeAll()
        }
      })
    }

    ctx.onUnmount(ctx.methods.closeAll)
  }
})

const app = createApplication()

app.register(modalsComponent)
app.mount(document)
