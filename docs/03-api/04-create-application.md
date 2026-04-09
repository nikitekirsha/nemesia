# 3.4 createApplication

```ts
createApplication(options?)
```

Creates a runtime instance.

## Options

```ts
{ observeDomChanges?: boolean }
```

Default: `false`.

When enabled:

- Added nodes -> `reconcile(node)`
- Removed nodes -> `destroy(node)`

## Methods

### register(component)
Registers a component and returns the same app instance.

### mount(root?)
Mounts only not-yet-mounted instances in scope.

### reconcile(root?)
Mounts new instances and refreshes already mounted instances.

### refresh(element, componentName)
Runs refresh hooks for one mounted component instance.

### recreate(element, componentName)
Unmounts current component instance on element, then mounts a fresh one.

### destroy(root?)
Unmounts and cleans up instances in scope.

### getInstance(element, componentName)
Returns mounted internal instance for element + component pair, or `undefined`.

`componentName` must be a non-empty string for `refresh`, `recreate`, and `getInstance`.
Otherwise runtime throws: `[Nemesia] componentName is required`.
If no mounted instance exists for a valid pair, `getInstance` returns `undefined`, while `refresh`/`recreate` are no-op.
