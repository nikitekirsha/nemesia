import { createApplication, defineComponent, getOption, getRef } from '../../index'

interface SwiperInstance {
  activeIndex: number
  on(event: string, handler: () => void): void
  destroy(deleteInstance?: boolean, cleanStyles?: boolean): void
  update(): void
}

declare const Swiper: new (
  element: Element,
  config: {
    slidesPerView: number
    loop: boolean
    navigation: {
      nextEl: Element
      prevEl: Element
    }
  }
) => SwiperInstance

const carouselMarkup = `
  <section data-swiper-widget data-swiper-per-view="1" data-swiper-loop="true">
    <div class="swiper" data-swiper-viewport>
      <div class="swiper-wrapper">
        <div class="swiper-slide">Slide A</div>
        <div class="swiper-slide">Slide B</div>
        <div class="swiper-slide">Slide C</div>
      </div>
    </div>
    <div class="row">
      <button class="btn" data-swiper-prev type="button">Prev</button>
      <button class="btn btn--primary" data-swiper-next type="button">Next</button>
      <span class="badge" data-swiper-status>index 0</span>
    </div>
  </section>
`

const sliderComponent = defineComponent({
  name: 'swiper-widget',
  schema: {
    refs: {
      root: getRef('[data-swiper-widget]', 'section'),
      viewport: getRef('[data-swiper-viewport]', 'div'),
      next: getRef('[data-swiper-next]', 'button'),
      prev: getRef('[data-swiper-prev]', 'button'),
      status: getRef('[data-swiper-status]', 'span')
    },
    options: {
      perView: getOption('data-swiper-per-view', { type: 'number', default: 1 }),
      loop: getOption('data-swiper-loop', { type: 'boolean', default: true })
    }
  },
  state: () => ({
    index: 0
  }),
  methods: (ctx) => ({
    render() {
      ctx.refs.status.textContent = `index ${ctx.state.index}`
    }
  }),
  setup(ctx) {
    let swiper: SwiperInstance | null = null

    ctx.watch('index', ctx.methods.render, { immediate: true })

    ctx.onMount(() => {
      swiper = new Swiper(ctx.refs.viewport, {
        slidesPerView: ctx.options.perView,
        loop: ctx.options.loop,
        navigation: { nextEl: ctx.refs.next, prevEl: ctx.refs.prev }
      })

      ctx.state.index = swiper.activeIndex

      swiper.on('slideChange', () => {
        if (swiper) {
          ctx.state.index = swiper.activeIndex
        }
      })
    })

    ctx.on(window, 'resize', () => {
      swiper?.update()
    })

    ctx.onUnmount(() => {
      swiper?.destroy(true, true)
      swiper = null
    })
  }
})

const app = createApplication({ observeDomChanges: true })

app.register(sliderComponent)
app.mount(document)

document.addEventListener('DOMContentLoaded', () => {
  const host = document.querySelector<HTMLElement>('#carousel-host')
  const toggle = document.querySelector<HTMLButtonElement>('button#toggle-carousel')
  const meta = document.querySelector<HTMLElement>('#shell-meta')

  let visible = true

  if (!!toggle && !!host && !!meta) {
    toggle.addEventListener('click', () => {
      visible = !visible

      if (visible) {
        host.innerHTML = carouselMarkup
        meta.textContent = 'mounted'
      } else {
        host.innerHTML = ''
        meta.textContent = 'unmounted'
      }
    })
  }
})
