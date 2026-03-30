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

### refresh(element)
Runs refresh hooks for one mounted element.

### recreate(element)
Unmounts current instance on element, then mounts a fresh one.

### destroy(root?)
Unmounts and cleans up instances in scope.

### getInstance(element)
Returns mounted internal instance for element, or `undefined`.
