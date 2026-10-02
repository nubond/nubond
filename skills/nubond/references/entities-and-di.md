# Entities, decorators and dependency injection

## Registration model

Everything lands in **one global registry**, populated as a side effect of a decorator running at
module-import time. There is no per-parent scoping: once `Tooltip` is imported anywhere, every template
in the app can use `nb-aspect:tooltip`.

Consequently the dependency arguments in `@AppRoot(...)`, `@Container(html, ...)` and
`@Component(html, css, ...)` exist so that the referenced class is **imported** (and therefore
registered, and not tree-shaken) and so the dependency graph is readable. Always list every entity a
template uses — especially transformers and aspects, which are never referenced from TypeScript.

Names are compared **case-insensitively** and must be unique within their kind (container, component,
aspect, transformer, template, adopted style).

If a class name is ≤ 2 characters and no explicit name was given, nuBond warns about minification —
configure your minifier to keep class names, or pass explicit names via the tuple form.

## Class-level decorators

### `@AppRoot(...metadata)`

Bootstraps the application. Accepts, in any order:

| Arg type | Meaning |
|---|---|
| `string` starting with `/` | route template |
| other `string` | root element selector |
| `Element` | root element (default: `document.body`) |
| `IGlobalConfig` | global configuration |
| `Array<string>` | `$Template` / `$AdoptedStyle` registration calls (their return values) |
| entity constructors | dependencies |

Unlike the other decorators, `@AppRoot` **throws** on conflicting metadata (two selectors, two route
templates, two global configs). Binding two app roots to the same element is an error.

A string counts as a route template **only if it starts with `/`**. A typo like `'#/[page=main]'` is
taken as an element selector instead — and an invalid selector makes `document.querySelector` throw
out of the decorator, killing module evaluation. A valid-but-unmatched selector logs
`Element with selector '…' not found` and nothing renders.

```typescript
@AppRoot(
    { showDebugInfo: true },
    '/#[page=main]',
    [$AdoptedStyle('shared-components', sharedComponentsStyle)],
    Main, FluentIcon, Tooltip, Localize
)
export class App {
    constructor(public router: Router) { }
}
```

Multiple app roots are supported for incremental migration; in that mode set global config and routing
via `$Config(...)` / `$Route(...)` **before** any `@AppRoot` is registered, since all roots share the
registry.

### `@Container(templateOrTuple, ...metadata)`

A context-bound HTML region rendered inline — **no shadow DOM, no style isolation**. The primary
building block for pages and sections.

- `templateOrTuple`: HTML string, `ITemplateProvider`, or `[name, htmlOrProvider]`.
- Extra metadata: `IContextConfig`, `Array<string>`, entity constructors.
- Registered under the explicit name or the class name; referenced as `nb-container="@ClassName"`.

### `@Component(templateOrTuple, ...metadata)`

A real custom element with shadow DOM and scoped styles.

- Extra metadata (resolved by type): style template (`string` | `ITemplateProvider`),
  `Array<string>` of adopted-style names, `IComponentContextConfig`, a `CustomElementConstructor`,
  entity constructors.
- **Tag name** = explicit name, or `fromCamelToKebabCase(toCamelCase(className))`. It must contain a
  hyphen; `Button` → `button` fails registration. Names already containing `-` are used verbatim.
- Shadow root mode defaults to **`closed`** unless overridden per component or globally.

```typescript
@Component(html, css, { shadowRootConfig: { mode: 'open', delegatesFocus: true } })
export class ConfiguredComponent { }
```

> **A global `shadowRootConfig` must be set before components are imported.** Each `@Component`
> resolves the global shadow-root config the moment its decorator runs. Component modules are imported
> at the top of `index.ts`, while `@AppRoot`'s config is applied only when `App` itself is decorated at
> the bottom — so `@AppRoot({ shadowRootConfig: … })` reaches no component. Put the setting in its own
> module and import it first:
> ```typescript
> // config-first.ts — imported as the very first line of index.ts
> import { $Config } from 'nubond';
> if (process.env.NODE_ENV !== 'production') { $Config({ shadowRootConfig: { mode: 'open' } }); }
> ```
> (Opening shadow roots changes only external script access — useful for test harnesses — not
> styling or event flow.)

**Custom base element.** Passing a `CustomElementConstructor` makes the generated custom element extend
your class instead of `HTMLElement` — the way to add `observedAttributes`, `connectedCallback`, form
association, or other native behavior:

```typescript
class BaseCard extends HTMLElement {
    static observedAttributes = ['variant'];
    attributeChangedCallback(name: string, oldValue: string, newValue: string) { /* … */ }
}

@Component(html, css, BaseCard)
export class ItemCard {
    constructor(private _host: BaseCard) { }   // the host element is injectable
}
```

**Components initialize only inside a nuBond-bound template.** The custom element exposes an internal
`$bind` that the component handler calls when it binds the element; there is no `connectedCallback`
bootstrap. An element created with `document.createElement('item-card')` and appended manually stays
inert — no shadow root, no template, no context. Render components from templates (or from a container
bound by nuBond), never by hand.

On bind, the component attaches its shadow root, adopts the framework's hide stylesheets, then any
`$AdoptedStyle` sheets, then appends its own `<style>` and template, processes projections, and binds
the context to the shadow root.

### `@Aspect(styleOrTuple?, ...metadata)`

An element-level mixin attached with `nb-aspect:<name>`. It creates **no new scope** — it operates on
the host element it is attached to.

- Optional first arg: style (`string` | `ITemplateProvider` | `[name, styleOrProvider]`).
- Extra metadata: `Array<string>` adopted-style names, `(style: string) => string` sanitizer.
- Name = explicit or kebab-cased class name.
- The class exposes a **`data` setter** which receives the bound expression's value whenever it changes.
- Injections: the host element, `ChangeDetector` (requests a pass of the binder that owns the host),
  `ElementManipulations`, `ElementSubscriptions`, `EventDispatcher` (dispatches on the host element).
- Because aspects have no shadow root, adopted stylesheets land on `document.adoptedStyleSheets` for
  light-DOM hosts, or the enclosing shadow root when attached inside a component. Sheets are
  reference-counted and removed when the last aspect using them is disposed.
- Aspects are instantiated eagerly when the element is constructed, not lazily on first bind.
- `nb-aspect:name` may be used **without a value** — the aspect is attached and its `data` setter is
  never called.

> **Always define a `data` getter alongside the setter.** Before assigning, the handler compares the
> new value with `aspect.data` via `Helpers.equals`. With a setter-only aspect that read is always
> `undefined`, so the setter re-runs on every change-detection pass for a continuously bound
> expression — and since every run reports a change, the pessimistic strategy never stabilizes. Adding
> a matching getter restores the gating. Bind static data with `#` (`#{min: 0, max: 100}`) so a fresh
> object literal isn't allocated and deep-compared on every pass.

```typescript
@Aspect(undefined, ['shared-theme'])       // adopted styles only
@Aspect(':host { outline: 1px dashed; }', ['shared-theme'])  // own style + adopted
```

### `@Transformer(name?)`

Registers a global function callable from any expression. The expression name is
`toCamelCase(name ?? className)` — only the first character is lowercased, so `DateFormat` →
`dateFormat`, `Localize` → `localize`.

- Transformers are **singletons** and may take constructor injections.
- `transform()` is wrapped in try/catch: an exception logs
  `Transformer '<name>' failed with exception: …` and the call returns `undefined`.
- The name must be a valid identifier, case-insensitively unique, and not reserved
  (`item`, `index`, `count`, `element`, `nativeElement`, `event`, `data`, `unSubscribe`, `router`).

### `@Injectable(singleton = false)`

Registers a class in the DI container. **Transient by default** — pass `true` for a singleton.

## Property-level decorators

| Decorator | Effect |
|---|---|
| `@Detector()` | Assigning a new value triggers a change-detection cycle (gated by deep equality). |
| `@Eventer(eventName?)` | Assigning dispatches a `CustomEvent` with the value in `event.detail` (an `undefined` value arrives as `null`). Name defaults to the kebab-cased property name. A non-`undefined` initial value fires once after the first cycle. It does **not** schedule detection itself — the parent's `nb-event` subscriber does. |

Both are implemented with `Object.defineProperty` and are supported only on **plain, configurable
fields declared on the context class itself**. An *own* property that already has a getter/setter, or
is non-configurable, is rejected with a logged error. A class `get`/`set` accessor, however, lives on
the prototype where the guard doesn't look: decorating it binds **silently** and shadows the accessor
on the instance, so your getter/setter code never runs again. Never decorate accessors. A property
cannot carry both `@Detector()` and `@Eventer()`.

The rewrite happens **when the context is bound**, not at construction: the current value is captured
into an internal store and the property is replaced by a get/set pair. So values assigned in the
constructor are preserved, and the decorated property becomes enumerable.

The generated setter always stores the new value; it only *acts* (schedules detection / dispatches the
event) when the value is not deep-equal to the previous one.

**They do not inherit.** Registration is keyed on the exact prototype the decorator was applied to, and
lookup uses `instance.constructor.prototype`. A `@Detector()` on a base class has no effect on
subclasses — redeclare it on the concrete context.

## Pseudo-decorators (function-based registration)

| Function | Purpose |
|---|---|
| `$Template(name, htmlOrProvider, sanitizer?)` | Registers a reusable HTML fragment for `nb-template`. **Returns the name.** |
| `$AdoptedStyle(name, cssOrProvider, sanitizer?)` | Registers a shared `CSSStyleSheet`. **Returns the name.** |
| `$Injectable(target, singleton?, ...deps)` | Programmatic registration. `$Injectable(instance)` registers an existing object as a singleton under its constructor — the way to inject third-party classes. |
| `$Config(globalConfig)` | Applies global configuration (before any app root). |
| `$Route(routeConfig)` | Configures routing (before any app root). |

Because `$Template`/`$AdoptedStyle` return the name, they compose neatly inside a decorator's
`Array<string>` slot — registering and referencing in one expression:

```typescript
@Component('', css, [$AdoptedStyle('icons-filled', filled), $AdoptedStyle('icons-regular', regular)])
export class FluentIcon { }
```

Note `Array<string>` means *adopted styles* only for `@Component` and `@Aspect`. Containers have no
shadow root and app roots ignore the array — there the call is a pure registration side effect.

> **`$Template` must run before the template is first used.** `nb-template="@name"` is resolved while
> the element tree is being constructed, not at bind time, and an unregistered name logs
> `template 'X' not found` with no retry. Register templates at module scope or in an explicit
> initializer called before `@AppRoot` is evaluated — the showcase's
> `TemplatesProvider.defineTemplates()` pattern. `$AdoptedStyle` has no such constraint: components
> resolve style names lazily and asynchronously.

## Template sources

The same forms work for `@Container` HTML, `@Component` HTML and style, `@Aspect` style, `$Template`
and `$AdoptedStyle`:

```typescript
@Container(html)                                              // imported .html file (string)
@Container('<div>Hello</div>')                                // inline string
@Container({ get: () => '<div>Dynamic</div>' })               // provider function
@Container({ get: () => fetch('/t.html').then(r => r.text()) })// async provider
@Container('/templates/my-container.html')                    // URL — fetched at runtime
```

A string is treated as a **URL** only when it starts with `/` and contains no spaces, `{` or `<`.
URL- and provider-based sources resolve lazily on first use; inline strings compile eagerly.

> **`https://…`, `./tpl.html` and `templates/tpl.html` are NOT recognized as URLs** — they are treated
> as inline template content and rendered as literal text, with no diagnostic. A root-relative path
> containing a space is not a URL either. Use a root-relative path, or an `ITemplateProvider` whose
> `get()` fetches (it may return a `Promise<string>`) for anything else. Note also that inline strings
> are sanitized at decorator-import time, which is *before* `@AppRoot` applies a global
> `htmlSanitizer` — so a global sanitizer reaches them only if set via `$Config` in a module imported
> before the entity modules.
>
> A failing fetch is retried on later use; after 3 failed attempts the entity gives up with
> `Unable to get <entity> '…' template in 3 attempts`.

## Dependency injection

Constructor injection driven by `emitDecoratorMetadata` (`design:paramtypes`). Dependencies resolve
recursively; circular references are detected and logged, yielding `undefined`.

> **No `reflect-metadata` package is required.** nuBond ships a minimal `Reflect.getMetadata` /
> `Reflect.metadata` polyfill (`ReflectInitializer`, run when `nubond` is imported) and installs it
> only if those functions are not already defined — so it also coexists with `reflect-metadata` if
> another library pulls it in. Do not add the dependency just for nuBond.

**Three DI rules that are not optional:**

1. **Inject concrete classes only.** TypeScript emits `Object` for interface-, union- and `any`-typed
   parameters. `Object` is never registered, so resolution falls through to "first context injection
   that is `instanceof` it" — and everything is. `constructor(private cfg: IMyConfig)` silently
   receives a `ChangeDetector` in a container, or the host **DOM element** in a component. No error,
   no `undefined`.
2. **Declare an explicit constructor on every decorated class.** The bundled `Reflect` polyfill does
   not walk the prototype chain, so a decorated subclass that inherits its constructor finds no
   `design:paramtypes` and is constructed with **zero arguments** — every injection the base expects
   arrives `undefined`. This is why the production base-class pattern forwards each dependency
   explicitly from the derived constructor.

3. **Per-entity services are not available to `@Injectable`s or transformers.** `ChangeDetector`,
   `EventDispatcher`, `ElementManipulations`, `ElementSubscriptions` and the host element are handed
   only to the entity being constructed — not down the dependency chain. A service that asks for
   `ChangeDetector` gets `undefined` plus `Injection 'ChangeDetector' cannot be resolve.` Services
   expose a `CallBackEvent`; the consuming entity subscribes and calls its own `detect()`.

```typescript
@Injectable(true)
export class ApiService { constructor(private _settings: UserSettings) { } }

@Container(html)
export class Page {
    constructor(private _changeDetector: ChangeDetector, private _api: ApiService) { }
}
```

Registering an external/third-party instance:
```typescript
$Injectable(new ExternalClient({ baseUrl: '/api' }));   // singleton, keyed by its constructor
$Injectable(SomeClass, true, DepA, DepB);               // explicit deps, no reflect metadata needed
```

### Built-in injectable services

| Service | Members |
|---|---|
| `ChangeDetector` | `detect()` — schedule a change-detection pass on a zero `setTimeout`; repeated calls in one task coalesce. Anything that must see the rendered result (opening a popover over freshly assigned rows, measuring) has to wait for a later task. |
| `EventDispatcher` | `dispatch(name, data?)` builds a non-bubbling, non-cancelable `CustomEvent` with `data` as `detail`; `dispatch(event)` dispatches a prebuilt event. Returns `dispatchEvent`'s result (`false` only for a cancelable event whose handler called `preventDefault()`). Dispatches on the entity's root element. |
| `ElementManipulations` | `properties` (`get`/`set`), `attributes` (`has`/`get`/`getAll`/`set`/`remove`), `styles` (`has`/`get`/`getAll`/`set`/`remove`), `classes` (`has`/`getAll`/`add`/`remove`/`toggle`). |
| `ElementSubscriptions` | `subscribe(eventName, callback, options?, debounce?)` — thin `addEventListener` wrapper; returns that subscription's unsubscribe function. |
| `Router` | Navigation and route state (see routing reference). |

Two behaviors worth committing to memory:

- **`ElementManipulations` mutations schedule change detection automatically** and are debounced, so
  they are safe to call repeatedly.
- **`ElementSubscriptions.subscribe` does NOT trigger change detection.** It is a plain
  `addEventListener`. If your callback mutates state the template reads, call `ChangeDetector.detect()`
  yourself (or write to a `@Detector()` property). This is the opposite of `nb-event:*`, which always
  triggers a pass.

`EventDispatcher`'s `CustomEvent` is created with only `{ detail }` — **no `bubbles: true`**. The event
fires on the entity's own root element, which is exactly the element the parent's
`nb-event:<name>` is attached to, so parent↔child messaging works (target-phase delivery — this holds
for components too, since the tree builder wraps the shadow root's *host* as the root node). It will
not propagate further up on its own: re-dispatch at each level, or build
`new CustomEvent(name, { detail, bubbles: true })` yourself.

**Use lowercase or kebab-case event names.** `dispatch('myEvent')` can never be caught by
`nb-event:myEvent`, because HTML lowercases the attribute to `myevent`. (`@Eventer` is safe — it
kebab-cases names on registration.)

### Injecting the host element

Components and aspects also receive their **host element** as a resolvable dependency:

```typescript
@Aspect()
export class Measure {
    constructor(private _host: HTMLElement) { }   // the element carrying nb-aspect:measure
}
```

For components this is the custom element instance. If you passed a `CustomElementConstructor` to
`@Component`, inject that class instead and the DI container will match it (it falls back to matching
any `HTMLElement` when the exact constructor isn't found).

**Availability by entity type** — requesting an unavailable service logs an injection error and yields
`undefined`:

| Service | AppRoot | Container | Component | Aspect |
|---|:-:|:-:|:-:|:-:|
| `ChangeDetector` | ✓ | ✓ | ✓ | ✓ |
| `EventDispatcher` | ✓ | ✓ | ✓ | ✓ |
| `ElementManipulations` | — | — | ✓ | ✓ |
| `ElementSubscriptions` | — | — | ✓ | ✓ |
| `Router` | ✓ | ✓ | ✓ | ✓ |

`ElementManipulations` / `ElementSubscriptions` act on the entity's root element, so only components
and aspects get them. User-defined `@Injectable` classes (and `Router`, which is always registered —
configured or not) resolve everywhere, including transformers.

## Lifecycle hooks

Implement any of these on a container/component context (`IContext`):

| Hook | When |
|---|---|
| `onContainerAttached(context)` | After an **`nb-container` in this context's own template** is attached and bound. Fired on the **host** context, receiving the child container's context. A context is never notified of its own attachment. |
| `onContainerDetached(context)` | When that child container is disposed / its name resolves to something else. |
| `onInputsRefreshDone()` | After this context's `nb-in` inputs were updated (only fires when something actually changed). |
| `onDetectChangesDone()` | After a change-detection cycle on this context completes. |
| `onDispose()` | During teardown of this context. |

> **`onContainerAttached` / `onContainerDetached` fire for containers only.** The component handler is
> constructed without the attach/detach notifications, so mounting a `<my-component>` never raises
> them. To know when a component is live, use its constructor, an `nb-bound` capture on the tag, or an
> `EventDispatcher` event from the component itself.

```typescript
@Container(html)
export class Page implements IContext {
    public onContainerAttached(context: IContext): void { this._current = <Tab>context; }
    public onDispose(): void { this._subscription?.(); }
}
```

## Configuration objects

```typescript
interface IGlobalConfig {
    showDebugInfo?: boolean;                      // default false — turn ON during development
    complyWithW3C?: boolean;                      // default false — switches to data-nb-* / --
    pessimisticChangeDetectionStrategy?: boolean; // default false
    shadowRootConfig?: IShadowRootConfig;         // { mode: 'open'|'closed', delegatesFocus, serializable }
    htmlSanitizer?: (html: string) => string;     // default undefined = raw
    styleSanitizer?: (style: string) => string;
}

interface IContextConfig {           // @Container
    pessimisticChangeDetectionStrategy?: boolean;
    htmlSanitizer?: (html: string) => string;
}

interface IComponentContextConfig {  // @Component — IContextConfig plus:
    styleSanitizer?: (style: string) => string;
    shadowRootConfig?: IShadowRootConfig;
}
```

Global config cannot be changed after the first app root is bound. A config object is recognized by
its shape: any unknown key or wrongly typed value (`{ showDebugInfo: 'true' }`) makes the whole
object unrecognized and it is **silently ignored**.

**Config timing.** `showDebugInfo`, `complyWithW3C` and the change-detection strategy are read when
apps bind, so passing them to `@AppRoot` works. `shadowRootConfig`, and the sanitizers as applied to
*inline* templates/styles, are captured when each entity's decorator runs — set those with `$Config`
in a module imported before any entity module (see `@Component` above).

`showDebugInfo: true` also makes expression compile/execution errors **throw** instead of being
logged — invaluable while developing, remove for production.

## Helpers

`Helpers` (exported from `nubond`) is used throughout real nuBond code — prefer it over ad-hoc checks
for consistency with the framework's own semantics.

Type checks: `isUndefined`, `isString`, `isNotEmptyString` (length > 0, **no trim**), `isNumber`,
`isBoolean`, `isObject` (non-null, excludes functions), `isArray`, `isIterableCollection`
(strictly `Map`/`Set`), `isTypedArray`, `isFunction`, `isSymbol`, `isBigInt`, `isValidElementName`,
`isValidCustomElementName`, `isValidIdentifier`.

### `Helpers.equals` — the rules every gate obeys

`equals` decides whether an `nb-in` input, a `@Detector()`/`@Eventer()` assignment, an aspect's `data`,
or an `nb-prop` value counts as changed. Its exact semantics matter at scale:

| Case | Result |
|---|---|
| `a === b` | equal (fast path) |
| Different `typeof` **or different `constructor`** | not equal — a plain `{x:1}` never equals `new Foo()` with the same fields |
| `Date` | compared by `getTime()` |
| `RegExp` | compared by `source` + `flags` |
| `NaN` vs `NaN` | equal |
| Array / typed array | same length, then element-wise deep |
| `Set` | same size, then `b.has(el)` — **identity, not deep**; sets of objects compare by reference |
| `Map` | same size, then deep per key |
| Plain object / class instance | same enumerable key set (`for…in`, so prototype methods and getters are skipped), then deep per key |
| Functions | **never equal** unless identical reference |
| Circular reference | treated as **equal**, and an error is logged |

Two consequences to design around:

- **An own enumerable function property poisons the comparison.** Arrow-function class fields
  (`public onClick = () => {}`) are own+enumerable, so any object carrying one is never deep-equal to
  another — a `@Detector()` holding it fires on every assignment. Use prototype methods (`onClick() {}`),
  which are non-enumerable and skipped.
- **Cyclic graphs are reported equal** after logging `deep equality comparison detected a circular
  reference`. Never pass a cyclic object through `nb-in` or a `@Detector()` property; pass a flat
  projection of it, or use `nb-in-ref` plus a manual `detect()`.

Conversions: `stringify`, `equals` (deep), `fromKebabToCamelCase`, `fromCamelToKebabCase`,
`toCamelCase` (lowercases **first char only**), `toPascalCase` (uppercases first char only),
`format('{0}/{1}', a, b)`, `split(value, separator, escapeChar)`.

`CallBackEvent<T>` — typed callback list with `subscribe(cb)` (returns unsubscribe; duplicates
ignored) and `raise(...data)` (runs every callback even if some throw, then throws a combined error).
It is the idiomatic way to expose change notifications from services.
