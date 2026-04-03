import type {
  AnyOptionDescriptor,
  AnyRefDescriptor,
  ComponentDefinition,
  ComponentContext,
  ComputedFactory,
  ComputedMap,
  MethodsFactory,
  MethodsMap,
  ResolvedOptions,
  ResolvedRefs,
  StateMap
} from '../types/entities'

/**
 * Input schema for `defineComponent(...)`.
 */
export interface DefineComponentSchemaInput<
  Refs extends Record<string, AnyRefDescriptor>,
  Options extends Record<string, AnyOptionDescriptor>
> {
  /**
   * Declarative ref descriptors created with `getRef(...)`.
   *
   * Must include `root` as a required single ref.
   */
  refs: Refs
  /**
   * Declarative option descriptors created with `getOption(...)`.
   */
  options: Options
}

/**
 * Input object accepted by `defineComponent(...)`.
 */
export interface DefineComponentInput<
  Refs extends Record<string, AnyRefDescriptor>,
  Options extends Record<string, AnyOptionDescriptor>,
  State extends StateMap,
  Computed extends ComputedMap,
  Methods extends MethodsMap
> {
  /**
   * Unique component name.
   *
   * Used in runtime warnings and data attribute selector: `[data-nemesia="{name}"]`.
   */
  name: string
  /**
   * Component schema that declares refs and options.
   */
  schema: DefineComponentSchemaInput<Refs, Options>
  /**
   * Creates per-instance initial state.
   *
   * Default: empty object.
   */
  state?: () => State
  /**
   * Creates per-instance computed values.
   *
   * Returned values are available in both `ctx.computed` inside methods/setup.
   */
  computed?: ComputedFactory<Refs, Options, State, Computed>
  /**
   * Creates component methods bound to typed runtime context.
   *
   * Returned methods are available in both `ctx.methods` and `setup(ctx)`.
   */
  methods?: MethodsFactory<Refs, Options, State, Methods, Computed>
  /**
   * Runs after refs/options are resolved and methods are created.
   *
   * Use this for event bindings, watchers and lifecycle hooks.
   */
  setup?: (ctx: ComponentContext<ResolvedRefs<Refs>, ResolvedOptions<Options>, State, Methods, Computed>) => void
}

function assertRootRef(definition: { name: string; schema: { refs: Record<string, { many: boolean; optional: boolean }> } }): void {
  const rootRef = definition.schema.refs.root

  if (!rootRef) {
    throw new Error(`[Nemesia] component "${definition.name}" requires schema.refs.root`)
  }

  if (rootRef.many || rootRef.optional) {
    throw new Error(`[Nemesia] component "${definition.name}" requires schema.refs.root to be required single`) 
  }
}

/**
 * Defines a component with typed schema, state, methods and setup hooks.
 *
 * `schema.refs.root` is required and must be a required single ref.
 * The returned object is used as-is by `app.register(...)`.
 */
export function defineComponent<
  const Refs extends Record<string, AnyRefDescriptor>,
  const Options extends Record<string, AnyOptionDescriptor>,
  State extends StateMap = StateMap,
  Computed extends ComputedMap = ComputedMap,
  Methods extends MethodsMap = MethodsMap
>(definition: DefineComponentInput<Refs, Options, State, Computed, Methods>): ComponentDefinition<Refs, Options, State, Computed, Methods> {
  if (!definition || typeof definition !== 'object') {
    throw new Error('[Nemesia] component definition must be an object')
  }

  if (typeof definition.name !== 'string' || definition.name.trim() === '') {
    throw new Error('[Nemesia] component name must be a non-empty string')
  }

  if (!definition.schema || typeof definition.schema !== 'object') {
    throw new Error(`[Nemesia] component "${definition.name}" requires a schema`)
  }

  if (!definition.schema.refs || typeof definition.schema.refs !== 'object') {
    throw new Error(`[Nemesia] component "${definition.name}" requires schema.refs`)
  }

  if (!definition.schema.options || typeof definition.schema.options !== 'object') {
    throw new Error(`[Nemesia] component "${definition.name}" requires schema.options`)
  }

  assertRootRef(definition)

  return definition
}
