import { createApplication, defineComponent, getOption, getRef } from '../../index'

type Category = 'all' | 'books' | 'devices' | 'accessories'

interface Product {
  id: string
  title: string
  category: Exclude<Category, 'all'>
  price: number
  stock: number
}

interface CatalogState {
  query: string
  category: Category
  page: number
  total: number
  items: Product[]
  loading: boolean
  requestId: number
}

interface ProductCardState {
  qty: number
  buying: boolean
  message: string
  kind: 'idle' | 'success' | 'error'
}

interface FetchProductsParams {
  query: string
  category: Category
  page: number
  pageSize: number
}

const ALL_PRODUCTS: Product[] = [
  { id: 'book-1', title: 'Getting Things Done', category: 'books', price: 25, stock: 5 },
  { id: 'book-2', title: 'Refactoring', category: 'books', price: 48, stock: 6 },
  { id: 'book-3', title: 'Clean Architecture', category: 'books', price: 39, stock: 4 },
  { id: 'book-4', title: 'Designing Data-Intensive Apps', category: 'books', price: 55, stock: 3 },
  { id: 'device-1', title: 'Noise-canceling Headphones', category: 'devices', price: 199, stock: 4 },
  { id: 'device-2', title: 'Smart Keyboard', category: 'devices', price: 129, stock: 7 },
  { id: 'device-3', title: '4K Monitor', category: 'devices', price: 429, stock: 2 },
  { id: 'device-4', title: 'USB-C Dock', category: 'devices', price: 89, stock: 8 },
  { id: 'accessory-1', title: 'Laptop Sleeve', category: 'accessories', price: 35, stock: 10 },
  { id: 'accessory-2', title: 'Desk Mat', category: 'accessories', price: 22, stock: 12 },
  { id: 'accessory-3', title: 'Cable Organizer', category: 'accessories', price: 15, stock: 20 },
  { id: 'accessory-4', title: 'Webcam Stand', category: 'accessories', price: 18, stock: 9 }
]

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchProducts(params: FetchProductsParams): Promise<{ items: Product[]; total: number }> {
  await wait(650)

  const query = params.query.trim().toLowerCase()

  const filteredProducts = ALL_PRODUCTS.filter((item) => {
    const matchesCategory = params.category === 'all' || item.category === params.category
    const matchesQuery = !query || item.title.toLowerCase().includes(query)

    return matchesCategory && matchesQuery
  })

  const total = filteredProducts.length
  const start = (params.page - 1) * params.pageSize
  const items = filteredProducts.slice(start, start + params.pageSize)

  return { items, total }
}

async function buyProduct(payload: { id: string; qty: number; stock: number }): Promise<{ ok: true } | { ok: false; error: string }> {
  await wait(700)

  if (payload.qty > payload.stock) {
    return { ok: false, error: `Only ${payload.stock} left in stock.` }
  }

  if (payload.id.endsWith('3') && payload.qty >= 2) {
    return { ok: false, error: 'Order blocked by anti-fraud rule.' }
  }

  return { ok: true }
}

function cardMarkup(product: Product): string {
  return `
    <article
      class="catalog-card"
      data-product-card
      data-product-id="${product.id}"
      data-product-price="${product.price}"
      data-product-stock="${product.stock}"
      data-current-qty="1"
    >
      <div class="grid gap-1.5">
        <strong class="catalog-title">${product.title}</strong>
        <span class="demo-badge">${product.category} • $${product.price}</span>
      </div>

      <div
        class="counter-row"
        data-counter-max="${Math.min(10, product.stock)}"
        data-counter-start="1"
        data-counter-step="1"
        data-product-counter
      >
        <button class="counter-btn" data-counter-minus type="button">-</button>
        <input class="counter-value" data-counter-value value="1" readonly />
        <button class="counter-btn" data-counter-plus type="button">+</button>
      </div>

      <div class="mt-auto grid gap-2">
        <button class="demo-btn demo-btn-primary" data-product-buy type="button">Buy</button>
        <span class="status-chip" data-product-status>idle</span>
      </div>
    </article>
  `
}

const productCounter = defineComponent({
  name: 'product-counter',
  schema: {
    refs: {
      root: getRef('[data-product-counter]', 'div'),
      minus: getRef('[data-counter-minus]', 'button'),
      plus: getRef('[data-counter-plus]', 'button'),
      value: getRef('[data-counter-value]', 'input')
    },
    options: {
      start: getOption('data-counter-start', { type: 'number', default: 1 }),
      step: getOption('data-counter-step', { type: 'number', default: 1 }),
      max: getOption('data-counter-max', { type: 'number', default: 10 })
    }
  },
  state: () => ({ qty: 1 }),
  computed: (ctx) => ({
    get hostCard() {
      return ctx.refs.root.closest('[data-product-card]') as HTMLElement | null
    },
    get qtyText() {
      return String(ctx.state.qty)
    },
    get canDecrement() {
      return ctx.state.qty > 1
    },
    get canIncrement() {
      return ctx.state.qty < ctx.options.max
    }
  }),
  methods: (ctx) => ({
    publish() {
      const card = ctx.computed.hostCard

      if (!card) {
        return
      }

      card.setAttribute('data-current-qty', String(ctx.state.qty))
      card.dispatchEvent(new CustomEvent('catalog:qty-change', { detail: { qty: ctx.state.qty } }))
    },
    updateUI() {
      ctx.refs.value.value = ctx.computed.qtyText
      ctx.refs.minus.disabled = !ctx.computed.canDecrement
      ctx.refs.plus.disabled = !ctx.computed.canIncrement
    },
    increment() {
      ctx.state.qty = Math.min(ctx.state.qty + ctx.options.step, ctx.options.max)
    },
    decrement() {
      ctx.state.qty = Math.max(ctx.state.qty - ctx.options.step, 1)
    }
  }),
  setup(ctx) {
    ctx.state.qty = ctx.options.start

    ctx.watch('qty', () => {
      ctx.methods.updateUI()
      ctx.methods.publish()
    }, { immediate: true })

    ctx.on(ctx.refs.plus, 'click', ctx.methods.increment)
    ctx.on(ctx.refs.minus, 'click', ctx.methods.decrement)
  }
})

const productCard = defineComponent({
  name: 'product-card',
  schema: {
    refs: {
      root: getRef('[data-product-card]', 'article'),
      buy: getRef('[data-product-buy]', 'button'),
      status: getRef('[data-product-status]', 'span')
    },
    options: {
      id: getOption('data-product-id'),
      stock: getOption('data-product-stock', 'number')
    }
  },
  state: (): ProductCardState => ({
    qty: 1,
    buying: false,
    message: 'idle',
    kind: 'idle'
  }),
  computed: (ctx) => ({
    get syncedQty() {
      const counter = ctx.refs.root.querySelector('[data-product-counter]') as Element | null

      if (!counter) {
        return 1
      }

      const counterInstance = app.getInstance(counter, productCounter.name)
      const qty = Number((counterInstance?.ctx.state as { qty?: number } | undefined)?.qty ?? 1)

      return Number.isFinite(qty) ? qty : 1
    },
    get buyLabel() {
      return ctx.state.buying ? 'Buying...' : `Buy (${ctx.state.qty})`
    }
  }),
  methods: (ctx) => ({
    syncQty() {
      ctx.state.qty = ctx.computed.syncedQty
    },
    updateUI() {
      ctx.refs.buy.disabled = ctx.state.buying
      ctx.refs.buy.textContent = ctx.computed.buyLabel
      ctx.refs.status.textContent = ctx.state.message
      ctx.refs.status.setAttribute('data-kind', ctx.state.kind)
      const base = 'status-chip'
      const idle = ''
      const success = ' status-chip-success'
      const error = ' status-chip-error'

      ctx.refs.status.className = `${base}${
        ctx.state.kind === 'success' ? success : ctx.state.kind === 'error' ? error : idle
      }`
    },
    async buy() {
      if (ctx.state.buying) {
        return
      }

      ctx.state.buying = true
      ctx.state.message = 'sending request...'
      ctx.state.kind = 'idle'

      const result = await buyProduct({ id: ctx.options.id, qty: ctx.state.qty, stock: ctx.options.stock })

      if (result.ok) {
        ctx.state.message = `success: ${ctx.state.qty} item(s) added`
        ctx.state.kind = 'success'
      } else if ('error' in result) {
        ctx.state.message = `error: ${result.error}`
        ctx.state.kind = 'error'
      }

      ctx.state.buying = false
    }
  }),
  setup(ctx) {
    ctx.watch(['qty', 'buying', 'message', 'kind'], ctx.methods.updateUI, { immediate: true })
    ctx.onMount(ctx.methods.syncQty)
    ctx.onRefresh(ctx.methods.syncQty)

    ctx.on(ctx.refs.root, 'catalog:qty-change', (e) => {
      const detail = (e as CustomEvent<{ qty?: number }>).detail

      if (typeof detail?.qty === 'number') {
        ctx.state.qty = detail.qty
      }
    })

    ctx.on(ctx.refs.buy, 'click', ctx.methods.buy)
  }
})

const catalog = defineComponent({
  name: 'catalog',
  schema: {
    refs: {
      root: getRef('[data-catalog]', 'section'),
      query: getRef('[data-catalog-query]', 'input'),
      category: getRef('[data-catalog-category]', 'select'),
      grid: getRef('[data-catalog-grid]', 'div'),
      more: getRef('[data-catalog-more]', 'button'),
      meta: getRef('[data-catalog-meta]', 'span'),
      loading: getRef('[data-catalog-loading]', 'span')
    },
    options: {
      pageSize: getOption('data-catalog-page-size', { type: 'number', default: 6 })
    }
  },
  state: (): CatalogState => ({
    query: '',
    category: 'all',
    page: 1,
    total: 0,
    items: [] as Product[],
    loading: false,
    requestId: 0
  }),
  computed: (ctx) => ({
    get metaText() {
      const visible = ctx.state.items.length
      const total = ctx.state.total || visible

      return `${visible} / ${total} items`
    },
    get hasMore() {
      return ctx.state.items.length < ctx.state.total
    },
    get loadingText() {
      return ctx.state.loading ? 'loading...' : 'idle'
    },
    get moreButtonText() {
      return ctx.state.items.length < ctx.state.total ? 'Show more' : 'No more products'
    },
    get nextPage() {
      return ctx.state.page + 1
    }
  }),
  methods: (ctx) => ({
    markupToState(): Product[] {
      const cards = Array.from(ctx.refs.grid.querySelectorAll('[data-product-card]'))

      return cards.map((card) => ({
        id: card.getAttribute('data-product-id') ?? crypto.randomUUID(),
        title: card.querySelector('strong')?.textContent ?? 'Unknown',
        category: (card.querySelector('.demo-badge')?.textContent?.split('•')[0].trim() ?? 'accessories') as Product['category'],
        price: Number(card.getAttribute('data-product-price') ?? 0),
        stock: Number(card.getAttribute('data-product-stock') ?? 1)
      }))
    },
    updateUI() {
      ctx.refs.root.toggleAttribute('data-loading', ctx.state.loading)
      ctx.refs.root.classList.toggle('opacity-70', ctx.state.loading)
      ctx.refs.loading.textContent = ctx.computed.loadingText
      ctx.refs.meta.textContent = ctx.computed.metaText
      ctx.refs.more.disabled = ctx.state.loading || !ctx.computed.hasMore
      ctx.refs.more.textContent = ctx.computed.moreButtonText
    },
    updateUIGrid() {
      ctx.refs.grid.innerHTML = ctx.state.items.map(cardMarkup).join('')
      app.reconcile(ctx.refs.grid)
    },
    async loadPage(page: number, reset: boolean) {
      const requestId = ctx.state.requestId + 1
      ctx.state.requestId = requestId
      ctx.state.loading = true

      const result = await fetchProducts({
        query: ctx.state.query,
        category: ctx.state.category,
        page,
        pageSize: ctx.options.pageSize
      })

      if (requestId !== ctx.state.requestId) {
        return
      }

      ctx.state.page = page
      ctx.state.total = result.total
      ctx.state.items = reset ? result.items : [...ctx.state.items, ...result.items]
      ctx.state.loading = false
      ctx.methods.updateUIGrid()
    }
  }),
  setup(ctx) {
    let debounceTimer = 0

    ctx.state.query = ctx.refs.query.value
    ctx.state.category = (ctx.refs.category.value as Category) || 'all'
    ctx.state.items = ctx.methods.markupToState() as Product[]

    ctx.watch(['query', 'category', 'page', 'total', 'items', 'loading'], ctx.methods.updateUI, { immediate: true })

    ctx.onMount(() => {
      ctx.methods.loadPage(1, true)
    })

    ctx.on(ctx.refs.query, 'input', () => {
      ctx.state.query = ctx.refs.query.value
      window.clearTimeout(debounceTimer)

      debounceTimer = window.setTimeout(() => {
        ctx.methods.loadPage(1, true)
      }, 250)
    })

    ctx.on(ctx.refs.category, 'change', () => {
      ctx.state.category = (ctx.refs.category.value as Category) || 'all'
      ctx.methods.loadPage(1, true)
    })

    ctx.on(ctx.refs.more, 'click', () => {
      if (ctx.state.loading || !ctx.computed.hasMore) {
        return
      }

      ctx.methods.loadPage(ctx.computed.nextPage, false)
    })

    ctx.cleanup(() => {
      window.clearTimeout(debounceTimer)
    })
  }
})

const app = createApplication({ observeDomChanges: true })

app.register(catalog)
app.register(productCounter)
app.register(productCard)
app.mount(document)
