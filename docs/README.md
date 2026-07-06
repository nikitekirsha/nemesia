# Nemesia guide

This guide explains Nemesia from first mount to production cleanup. It is written for developers integrating behavior into HTML rendered by a backend, static-site generator, or CMS.

## Start here

1. [Getting started](01-getting-started.md) — install Nemesia and mount a first component.
2. [HTML contract](02-html-contract.md) — understand roots, refs, options, and nested ownership.
3. [Applications and registration](03-applications.md) — create an app and control its scope.
4. [Concrete components](04-components.md) — define class-based behavior and root constraints.

## Component APIs

5. [Refs](05-refs.md) — request required, optional, and repeated elements.
6. [Options](06-options.md) — parse typed values from root attributes.
7. [Events and lifecycle](07-events-and-lifecycle.md) — attach listeners and release resources.

## Advanced usage

8. [Dynamic DOM observation](08-dynamic-dom.md) — support content added or removed after initial mount.
9. [Distributed components](09-distributed-components.md) — attach delegated behavior to an app scope.
10. [TypeScript and diagnostics](10-typescript-and-diagnostics.md) — public exports, warnings, errors, and bundles.
11. [Recipes](11-recipes.md) — practical patterns for common website interactions.

## Mental model

Nemesia has deliberately narrow responsibilities:

- HTML comes from somewhere else.
- A component class describes behavior for one existing root.
- Fields request the refs and options that behavior needs.
- Invalid markup skips only the invalid instance.
- The app owns mounted instances and cleans them up deterministically.

If a page needs client-side templates, routing, stores, or reactive rendering, use a framework designed for those jobs. Nemesia is designed as the layer between server HTML and repetitive vanilla JavaScript code.

[Back to project README](../README.md)
