export type OptionType = 'string' | 'number' | 'boolean'
export type RefTag = keyof HTMLElementTagNameMap

export interface RefDescriptor<
  Tag extends RefTag | undefined = undefined,
  Optional extends boolean = false,
  Many extends boolean = false
> {
  readonly kind: 'ref'
  readonly selector: string
  readonly tag: Tag
  readonly optional: Optional
  readonly many: Many
}

export interface OptionDescriptor<
  Type extends OptionType = 'string',
  Optional extends boolean = false,
  HasDefault extends boolean = false,
  DefaultValue = never
> {
  readonly kind: 'option'
  readonly attribute: string
  readonly type: Type
  readonly optional: Optional
  readonly hasDefault: HasDefault
  readonly defaultValue: DefaultValue
}

export type AnyRefDescriptor = RefDescriptor<RefTag | undefined, boolean, boolean>
export type AnyOptionDescriptor = OptionDescriptor<OptionType, boolean, boolean, unknown>

export type RefSchema = Record<string, AnyRefDescriptor>
export type OptionSchema = Record<string, AnyOptionDescriptor>

export interface ComponentSchema<Refs extends RefSchema = RefSchema, Options extends OptionSchema = OptionSchema> {
  readonly refs: Refs
  readonly options: Options
}

type RefElement<Tag extends RefTag | undefined> = Tag extends RefTag ? HTMLElementTagNameMap[Tag] : HTMLElement

export type ResolvedRef<
  Tag extends RefTag | undefined,
  Optional extends boolean,
  Many extends boolean
> = Many extends true
  ? RefElement<Tag>[]
  : Optional extends true
    ? RefElement<Tag> | null
    : RefElement<Tag>

export type OptionValue<Type extends OptionType> = Type extends 'string'
  ? string
  : Type extends 'number'
    ? number
    : boolean

export type ResolvedOption<
  Type extends OptionType,
  Optional extends boolean,
  HasDefault extends boolean
> = HasDefault extends true ? OptionValue<Type> : Optional extends true ? OptionValue<Type> | undefined : OptionValue<Type>

export type ResolvedRefs<Refs extends RefSchema> = {
  [Key in keyof Refs]: Refs[Key] extends RefDescriptor<infer Tag, infer Optional, infer Many>
    ? ResolvedRef<Tag, Optional, Many>
    : never
}

export type ResolvedOptions<Options extends OptionSchema> = {
  [Key in keyof Options]: Options[Key] extends OptionDescriptor<infer Type, infer Optional, infer HasDefault, unknown>
    ? ResolvedOption<Type, Optional, HasDefault>
    : never
}

export type MethodsMap = Record<string, (...args: any[]) => unknown>
export type StateMap = Record<string, any>
type InternalMethodsMap = Record<string, (...args: any[]) => any>

export interface WatchConfig {
  /** Run handler immediately after registration. Default: `false`. */
  immediate?: boolean
}

/**
 * Runtime context available in `methods(ctx)` and `setup(ctx)`.
 */
export interface ComponentContext<
  Refs extends Record<string, unknown> = Record<string, unknown>,
  Options extends Record<string, unknown> = Record<string, unknown>,
  State extends StateMap = StateMap,
  Methods extends MethodsMap = MethodsMap
> {
  /** Component root element instance was mounted on. */
  readonly element: Element
  /** Resolved refs defined in `schema.refs`. */
  readonly refs: Refs
  /** Resolved options defined in `schema.options`. */
  readonly options: Options
  /** Mutable component state object. */
  readonly state: State
  /** Methods returned from `methods(ctx)`. */
  methods: Methods
  /** Applies a partial state patch. */
  setState(patch: Partial<State>): void
  /**
   * Subscribes to a DOM event and returns disposer.
   * Listener is also auto-disposed on component unmount.
   */
  on<K extends keyof DocumentEventMap>(
    target: Document,
    event: K,
    handler: (event: DocumentEventMap[K]) => void,
    options?: AddEventListenerOptions | boolean
  ): () => void
  on<K extends keyof WindowEventMap>(
    target: Window,
    event: K,
    handler: (event: WindowEventMap[K]) => void,
    options?: AddEventListenerOptions | boolean
  ): () => void
  on<T extends HTMLElement, K extends keyof HTMLElementEventMap>(
    target: T,
    event: K,
    handler: (event: HTMLElementEventMap[K]) => void,
    options?: AddEventListenerOptions | boolean
  ): () => void
  /**
   * Fallback signature for untyped/custom event targets.
   */
  on(
    target: EventTarget,
    event: string,
    handler: (event: Event) => void,
    options?: AddEventListenerOptions | boolean
  ): () => void
  /**
   * Subscribes to changes of one or multiple state keys.
   * Returns unwatch disposer.
   */
  watch(
    key: Extract<keyof State, string> | Array<Extract<keyof State, string>>,
    handler: () => void,
    config?: WatchConfig
  ): () => void
  /** Registers a callback executed during component mount stage. */
  onMount(handler: () => void): void
  /** Registers a callback executed on `app.refresh/reconcile`. */
  onRefresh(handler: () => void): void
  /** Registers a callback executed before component teardown. */
  onUnmount(handler: () => void): void
  /** Registers arbitrary cleanup callback executed on unmount. */
  cleanup(dispose: () => void): void
}

/**
 * Declarative component definition consumed by `defineComponent(...)`.
 */
export interface ComponentDefinition<
  Refs extends RefSchema = RefSchema,
  Options extends OptionSchema = OptionSchema,
  State extends StateMap = StateMap,
  Methods extends MethodsMap = MethodsMap
> {
  readonly name: string
  readonly schema: ComponentSchema<Refs, Options>
  readonly state?: () => State
  readonly methods?: MethodsFactory<Refs, Options, State, Methods>
  readonly setup?: (ctx: ComponentContext<ResolvedRefs<Refs>, ResolvedOptions<Options>, State, Methods>) => void
}

export type MethodsFactory<
  Refs extends RefSchema,
  Options extends OptionSchema,
  State extends StateMap,
  Methods extends MethodsMap
> = (ctx: ComponentContext<ResolvedRefs<Refs>, ResolvedOptions<Options>, State, InternalMethodsMap>) => Methods

export type AnyComponentDefinition = any

export interface InternalComponentInstance {
  readonly component: AnyComponentDefinition
  readonly element: Element
  readonly ctx: ComponentContext
  refresh(): void
  unmount(): void
}

export interface CreateApplicationOptions {
  /**
   * Enables MutationObserver integration:
   * added nodes -> `reconcile(node)`, removed nodes -> `destroy(node)`.
   * Default: `false`.
   */
  observeDomChanges?: boolean
}

export interface Application {
  /** Registers component definition in the application registry. */
  register(component: AnyComponentDefinition): Application
  /** Mounts only not-yet-mounted instances in the provided scope. */
  mount(root?: ParentNode): void
  /** Mounts new instances and refreshes already mounted ones. */
  reconcile(root?: ParentNode): void
  /** Runs refresh hooks for a specific mounted element. */
  refresh(element: Element): void
  /** Unmounts instance on element and mounts a fresh one. */
  recreate(element: Element): void
  /** Unmounts and cleans up all instances inside provided scope. */
  destroy(root?: ParentNode): void
  /** Returns mounted instance for element if present. */
  getInstance(element: Element): InternalComponentInstance | undefined
}
