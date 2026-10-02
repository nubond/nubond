# Routing and change detection

## Route template grammar

```
'/#[SLOT_NAME=DEFAULT]/{SLOT_NAME=DEFAULT}/CONSTANT'
```

| Token | Meaning |
|---|---|
| `/` | Mandatory route-config prefix. |
| `#` | Optional. Hash-based routing (works against `location.hash`). Without it the router uses `location.pathname` + `location.search`. |
| `[NAME=DEFAULT]` | **Container slot** — binds to `nb-container="%NAME"`. Its value must be a registered container name. |
| `{NAME=DEFAULT}` | **Variable slot** — read via `router.state.NAME`. |
| `CONSTANT` | Static path segment; emitted only if the preceding slot has a value. |

Slots are separated by `/`. The default value after `=` is optional. Slot names cannot be empty, and a
slot may have at most one `=`.

```typescript
@AppRoot({ showDebugInfo: true }, '/#[tab=basics]', Basics, Containers, Components)
export class App {
    constructor(public router: Router) { }
}
```

## Positional serialization

The router is **position-based**: each slot's value goes at its own position when possible. As soon as
a slot without a value precedes a slot with a value, every subsequent value is serialized as a **query
parameter** instead.

```
Template: '/[page=dashboard]/{id}/{userId}/[container]'
State:    { page: 'dashboard', userId: 1 }
Result:   '/dashboard/?userId=1'
```

On startup, query parameters are matched to slot names **case-insensitively**; path segments are
matched positionally and `decodeURIComponent`d.

## Template integration

```html
<div nb-container="%tab"></div>                                    <!-- slot-bound container -->
<a nb-event:click="router.go('settings')">Settings</a>             <!-- router is an event param -->
<a nb-class="{active: this.router.state.tab === 'home'}">Home</a>  <!-- inject Router to read state -->
```

`router` is available as an expression parameter in `nb-event:*` only when routing is configured. To
read state in a continuous binding, inject `Router` into the context and expose it (`public router`).

Container slot values are container names and are resolved case-insensitively — `router.go('basics')`
matches the `Basics` container.

## Router API

| Member | Description |
|---|---|
| `router.state` | Current state object, one key per named slot. |
| `router.path` | Current path string. |
| `router.hashBased` | Whether routing is hash-based. |
| `router.isConfigured` | Whether a route template was provided. |
| `router.go(stateOrSlotValue, partialState = true, removeHistory = false)` | Navigate. A bare string is only allowed when the template has exactly **one** named slot; otherwise pass `{slot: value}`. `partialState` merges with the current state; `removeHistory` replaces the current history entry rather than pushing. |
| `router.goBack()` / `router.goForward()` / `router.goTo(offset)` | History navigation over the router's own state list. |
| `router.onBeforeStateChange(cb)` | `cb(preventChange, oldState, newState, oldPath, newPath)`; call `preventChange()` to cancel. Returns an unsubscribe function. |
| `router.onAfterStateChange(cb)` | `cb(oldState, newState, oldPath, newPath)`. Returns an unsubscribe function. |

### Behavior notes

- **Hash routing rewrites the URL to the origin root.** History URLs are built root-absolute with no
  base-path concept, so an app served from `/app/page.html` has its path clobbered to `/` when the
  router is merely constructed — a reload or shared link then fetches the wrong document. Path mode has
  the same defect under a subpath. Plan on deploying at the origin root, or avoid the built-in router.
- **The query string is dropped at bootstrap** by the same rewrite. If the app needs `?flags`, read
  `location.search` in a module that `index.ts` imports first, before `@AppRoot` evaluates.
- **Real hash navigation is ignored** — `<a href="#/settings">` and manual address-bar hash edits reset
  state to defaults. Navigate through `router.go(...)` only.
- **All Router methods throw** when the router is not configured — by design, unlike the rest of the
  framework, which soft-fails via `Console.error`. Guard with `router.isConfigured` when routing is
  optional. A malformed route template (empty slot name, two `=`) also throws.
- **The first `@AppRoot` decides routing for good.** It always initializes the `Router`; without a
  route template that router stays unconfigured, and a later `$Route('/…')` only logs "Router is
  already initialized". Declare the route template on the first `@AppRoot`, or call `$Route` before any
  app root is evaluated.
- Slot values in `router.state` are strings (`router.go({ id: 5 })` stores `'5'`).
- Setting a **container slot** to a name with no registered container logs an error and keeps the
  previous value.
- Setting a slot to `undefined`/`null`/blank resets it to its default.
- The initial state-change during construction is **not preventable**.
- `onBeforeStateChange`/`onAfterStateChange` callbacks receive copies of the state objects.
- A container bound to `%slot` re-resolves automatically on `onAfterStateChange` and requests a
  parent change-detection pass.

```typescript
constructor(public router: Router) {
    router.onAfterStateChange((oldState, newState, oldPath, newPath) => {
        console.log(`Routed to '${newPath}'`, newState);
    });
}
```

---

# Change detection

nuBond runs a **poll-based** pass over the bound element tree: for each element, a *bind* sequence
evaluates expressions, then a *commit* sequence writes to the DOM.

## What triggers a pass

- An `nb-event:*` handler fires (once when it returns, or when a returned `Promise` settles).
- An `@Detector()` property is **assigned** a value that is not deep-equal to the current one.
- `ChangeDetector.detect()` is called.
- An `ElementManipulations` mutation (`attributes.set`, `classes.add`/`remove`/`toggle`,
  `styles.set`/`remove`, `properties.set`) actually changes something.
- An `nb-in`/`nb-in-ref` input on a child actually changes.
- The route state changes (for `%slot` containers).

Nothing else. Timer callbacks, `fetch().then()`, `addEventListener` registered in TypeScript,
third-party library callbacks, **`ElementSubscriptions.subscribe` callbacks**, service
`CallBackEvent`s, and in-place mutation of arrays/objects do **not** trigger a pass on their own.
Assigning an `@Eventer()` property only dispatches its event — the *parent* runs a pass because its
`nb-event` subscriber fired.

Each trigger runs the pass of **one binder** — the bindings of one context's template. A child
container/component has its own binder: the parent's pass reaches it only by delivering a changed
`nb-in` value (which triggers the child's pass). A detection request in one component does not
re-render its siblings, its parent, or children whose inputs didn't change — a service-driven change
that several components display needs each of them to subscribe and call `detect()`.

> `ElementSubscriptions.subscribe` is a plain `addEventListener` wrapper — unlike `nb-event:*` it never
> schedules detection. Call `detect()` inside the callback, or write to a `@Detector()` property.

## Scheduling

Passes are **debounced and asynchronous**: each trigger schedules via `setTimeout` and multiple
triggers within the same task coalesce into a single pass. The DOM is therefore not updated
synchronously after mutating state — do not read back rendered values immediately after `detect()`.

The exception is initial binding. An `@AppRoot` renders **synchronously** as it binds. A
container/component defers its first pass only when it declares `nb-in` inputs (so the first render
already sees them); without inputs it also binds synchronously.

Root contexts whose bound element (other than `document.body`) has been detached from the DOM are
automatically disposed on the next change-detection request. An app root bound to `document.body` is
never auto-disposed.

Containers/components hidden by `nb-if` / `nb-switch` have change detection **disabled** while hidden,
and re-enabled when they become visible. Their `nb-in` inputs are **not refreshed while hidden** — the
child sees the new values only once it becomes visible again.

> **Updates made while hidden are lost.** Detection requests are *dropped* while disabled (no queue),
> and becoming visible re-enables detection without requesting a pass — so the stale DOM stays until
> some unrelated later trigger. If a hidden branch keeps working (timers, promises), call `detect()`
> when it becomes visible again.

## Strategies

| Strategy | Behavior |
|---|---|
| **Optimistic** (default) | One pass per trigger. Side effects produced *during* the pass — e.g. a binding that mutates state another binding reads — are not picked up until the next external trigger. Faster. |
| **Pessimistic** | Same triggers, but after each pass the tree is checked for stability; if any handler committed a change, the pass re-runs until the tree stabilizes. Catches cascading updates within a single trigger, at the cost of extra work. |

Capped at **10** consecutive re-runs; exceeding it logs
`tree can't stabilize in 10 change detection cycles` and stops.

> **The cap does not prevent pass-to-pass loops.** It bounds pessimistic re-runs *within* one pass
> only. An expression that writes a `@Detector()` property re-arms the scheduler and loops forever at
> timer cadence — silently in the default optimistic mode. Never write detector properties from
> `nb-exec` or any bound expression; see `known-limitations.md`.
>
> Pessimistic mode also needs every handler to settle: a setter-only aspect, or an empty-named
> `nb-container`, reports a change on every pass and burns the full cap on every trigger.

```typescript
@AppRoot({ pessimisticChangeDetectionStrategy: true }, ...)       // global
@Container(html, { pessimisticChangeDetectionStrategy: true })    // per container
@Component(html, css, { pessimisticChangeDetectionStrategy: true })
```

## Choosing how to update state

**`@Detector()`** — declarative, best for properties written from async code:
```typescript
@Detector()
public time: Time | undefined;

constructor() {
    setInterval(() => this.time = new Time(DateTime.now()), 60_000);  // assignment triggers CD
}
```
Gated by deep equality, so assigning an equal value is a no-op, and mutating `this.time.hour` in place
is invisible. Assign a **new** instance.

**`ChangeDetector.detect()`** — imperative, best when several properties change at once or the change
originates in a callback you don't control:
```typescript
constructor(private _changeDetector: ChangeDetector, settings: UserSettings) {
    settings.onChange(() => {
        this.refresh();
        this._changeDetector.detect();
    });
}
```

**Promise-returning event handlers** — no manual trigger needed:
```html
<button nb-event:click="this.loadData()">Load</button>
```
```typescript
public loadData(): Promise<void> {          // note: RETURN the promise
    return fetch('/api').then(r => r.json()).then(d => { this.data = d; });
}
```

**`@Eventer()`** — to notify a parent rather than re-render:
```typescript
@Eventer()               // dispatches CustomEvent 'selected-item' with the value as event.detail
public selectedItem: Item | undefined;
```
```html
<my-child nb-event:selected-item="this.onSelected(data)"></my-child>
```

## Performance notes

- `nb-repeat` over a plain object iterates enumerable property names and logs a low-performance
  warning under `showDebugInfo` — prefer arrays.
- Expressions are compiled once and cached per expression + parameter-name set; avoid generating
  dynamically varying expression strings.
- Continuous bindings re-evaluate every pass. Use `#` (single binding) for values that are set once —
  labels, static config, one-time computed text — and `@` for literals. Markup that cannot be hidden
  (a popover menu that is always in the DOM) binds on every pass whether open or not: empty its data
  when it closes, or put it under an `nb-if`.
- The cost of a pass is roughly "expressions evaluated". Hidden subtrees contribute ~one expression
  each, so what matters is the *visible* binding count. In a large app, measure it (and keep it under
  a budget) rather than guessing — prefixing constants routinely halves it.
- Every `nb-event` firing is a full pass of its binder; bind continuous events (`pointermove`,
  `dragover`, `scroll`) through `ElementSubscriptions` or a delegated listener instead.
- Keep bound expressions cheap and side-effect free; heavy work belongs in the context class.
