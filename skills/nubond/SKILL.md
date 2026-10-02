---
name: nubond
description: Write, extend, and debug applications built on the nuBond TypeScript framework (Web Components + Shadow DOM + nb-* attribute bindings, DI, routing, change detection, aspects, transformers, content projection). Use whenever a project imports `nubond`, contains `nb-*` / `data-nb-*` attributes in HTML, or uses `@AppRoot` / `@Container` / `@Component` / `@Aspect` / `@Transformer` / `@Injectable` decorators — and when scaffolding a new nuBond app via `npm create nubond`.
---

# Building applications with nuBond

nuBond is a zero-runtime-dependency TypeScript UI framework. Entities are plain classes tagged with
decorators; markup lives in separate `.html` files bound through `nb-*` attributes; state updates flow
through a poll-based change-detection pass over a tree of bound DOM elements.

> **Version.** This skill describes the published **`nubond` 1.0.8** package (and the
> `create-nubond` 1.0.11 / `@nubond/posthtml-value-interpolation` 1.0.3 tooling). Check the project's
> installed version (`node_modules/nubond/package.json`) — later releases may lift some of the
> limitations listed here.

**Before writing code, confirm the project's conventions**: read the app's `index.ts` (the `@AppRoot`),
its `tsconfig.json` `paths`, and one existing container + component pair. Match them.

## The mental model

```
@AppRoot            binds a context class to a DOM element, applies global config, sets up the router
  └─ @Container     a context class + HTML template rendered inline (NO shadow DOM) — pages/sections
       └─ @Component  a context class + HTML + CSS as a real custom element (shadow DOM, scoped styles)
            └─ @Aspect      element-level mixin, no new scope — attaches behavior/attributes to any element
            └─ @Transformer global pure function callable from any expression
            └─ @Injectable  DI-resolved service (transient by default, `@Injectable(true)` = singleton)
```

There is **one global registry**. A class is registered the moment its module is imported and its
decorator executes. Names are matched **case-insensitively** across containers, components, aspects,
templates and adopted styles.

## Non-negotiable rules

These cause the most failures. Internalize them.

1. **Every entity referenced only from HTML must be imported and listed in a decorator's dependency
   args.** Transformers, aspects, and components used purely in markup are otherwise tree-shaken and
   never register. List them in `@AppRoot` (global) or in the parent `@Container`/`@Component`.
   ```typescript
   @Container(html, ChildContainer, MyComponent, Tooltip, Localize)
   export class Page { }
   ```
   The args are import-anchors + documentation — registration itself is global and happens at import
   time. Omitting an entity yields a runtime `... with name 'X' not found` error, not a compile error.

2. **Component tag = kebab-cased class name, and it MUST contain a hyphen.** `HelloWorld` →
   `<hello-world>`. A single-word class (`Button` → `button`) fails custom-element registration; give
   an explicit name via the tuple form: `@Component(['my-button', html], css)`.

3. **Containers are referenced by class name with the `@` constant prefix**, case-insensitively:
   `<div nb-container="@ChildContainer">`. Route slot values are container names too (`router.go('basics')`).

4. **Decorator metadata args are resolved by type, not position.** Pass only what you need, in any
   order after the template: style, `Array<string>` of adopted-style names, config object, custom
   element class, dependencies.

5. **These bindings are mutually exclusive on one element** (violation = logged error, all conflicting
   handlers dropped). Conflicts exist only *within* a group:
   - content: `nb-value`, `nb-html`, `nb-switch`, `nb-container`, component tag, `nb-template`
   - structure: `nb-case`, `nb-default`, `nb-repeat`
   - function: `nb-case`, `nb-default`, `nb-if`

   So these combinations are legal and safe: `nb-repeat` + component tag, `nb-case` + component tag,
   `nb-if` + `nb-container`, plus any number of
   `nb-attr:`/`nb-prop:`/`nb-event:`/`nb-aspect:`/`nb-var:`/`nb-in:` on the same element.

   **Do not put two *visibility* handlers on one element** — `nb-if` + `nb-repeat`, `nb-if` +
   `nb-switch`, `nb-repeat` + `nb-switch`. They are not rejected, but they drive one shared hidden
   class with no refcounting, so one handler can show the element while the other still wants it
   hidden (stale content on screen). Put the second condition on a child or wrapper element.

6. **Always write binding names in kebab-case.** HTML lowercases attribute names, so `nb-in:metaData`
   arrives as `metadata` and silently sets the wrong property. nuBond converts kebab → camel for you:
   `nb-in:meta-data` → `metaData`, `nb-var:date-time` → `dateTime`, `nb-prop:read-only` → `readOnly`.
   **`nb-repeat:` prefixes get no conversion** — `nb-repeat:userRole` yields `userroleItem`, so
   `userRoleItem` reads `undefined`, silently. Keep prefixes one lowercase word (a hyphen produces an
   invalid identifier and breaks every expression under the repeat).

7. **`nb-in` deep-clones with `structuredClone`; `nb-in-ref` passes by reference.** Use `nb-in-ref`
   for class instances with methods, DOM nodes, functions — anything not structured-cloneable.

8. **Push inputs and detector values as new, deep-unequal objects — never by mutation.** The `nb-in`
   cache holds the *same reference* your expression returned, so it later compares the object against
   itself and mutations can **never** be delivered (not "usually missed" — never). `@Detector()` is
   gated by deep equality too. Always `this.cfg = { ...this.cfg, x: 2 }`, never `this.cfg.x = 2`.
   (`nb-repeat` is the exception — it reads the collection live, so in-place array edits do render
   once a pass is triggered.)

9. **`@Detector()` / `@Eventer()` go on plain fields of the context class itself.** They are keyed on
   the exact prototype they decorate, so a base class's decorated property has no effect on a derived
   context — and on a `get`/`set` accessor they silently replace your accessor.

10. **Change detection is debounced and asynchronous** (`setTimeout`). The DOM is not updated
    synchronously after mutating state. Calling `detect()` repeatedly in one task coalesces to one pass.

11. **Shadow roots default to `closed`.** You cannot reach into a component's internals from outside;
    communicate via `nb-in`/`nb-in-ref` down and `EventDispatcher` events up. Custom events do **not**
    bubble — re-dispatch at each level to cross more than one boundary.

12. **Components only come alive inside a nuBond-bound template.** They bootstrap through an internal
    `$bind` call, not `connectedCallback` — `document.createElement('my-card')` yields an inert
    element. Relatedly, `onContainerAttached`/`onContainerDetached` fire for **`nb-container` only**,
    never for components.

13. **`nb-attr` stringifies, `nb-prop` passes values through.** `nb-attr:disabled="false"` writes
    `disabled="false"` — which *disables* the control. Use `this.x ? '' : null` or `nb-prop:`.
    Likewise `ElementManipulations` mutations schedule change detection, but
    `ElementSubscriptions.subscribe` (a bare `addEventListener`) does **not**.

14. **`nb-repeat` reuses DOM by index, not by key.** There is no keyed diff: element *N* is always
    bound to item *N*. Reordering a list re-binds every row in place, and any DOM/component state
    (focus, scroll, input value, `ElementInternals` state) stays with the position, not the item.
    The same goes for `#` one-time bindings and `nb-bound` inside a row — they freeze against the
    **row position**, not the item, so only use them on lists that never change shape.

15. **Template expressions are strings — nothing type-checks them.** A renamed method leaves
    `this.oldName()` in markup compiling fine and failing at runtime; an exception thrown inside an
    expression is caught and logged (`expression "…" execution error`), never propagated. Grep the
    templates when renaming, and treat any `nuBond:` console error as a bug.

## Writing an entity

**Container** — a page or section, no style isolation:
```typescript
import html from './settings.html';
import { Container, ChangeDetector } from 'nubond';
import { UserSettings } from '@shared/services/settings/user-settings';

@Container(html, ChildComponent)
export class Settings {
    public items: Array<Item> = [];

    constructor(private _changeDetector: ChangeDetector, public userSettings: UserSettings) { }

    public async load(): Promise<void> {
        this.items = await fetch('/api/items').then(r => r.json());
        this._changeDetector.detect();
    }
}
```

**Component** — reusable custom element with scoped CSS:
```typescript
import html from './item-card.html';
import css from './item-card.scss';
import { Component, EventDispatcher } from 'nubond';

@Component(html, css, ['shared-components'])
export class ItemCard {
    public title: string | undefined;              // ← receives nb-in:title
    constructor(private _eventDispatcher: EventDispatcher) { }
    public save(): void { this._eventDispatcher.dispatch('save', this.title); }
}
```
```html
<!-- parent template -->
<item-card nb-in:title="this.headline" nb-event:save="this.onSave(data)"></item-card>
```

**Aspect** — behavior mixed into any element via `nb-aspect:<kebab-class-name>`:
```typescript
import css from './tooltip.scss';
import { Aspect, ElementManipulations, Helpers } from 'nubond';

@Aspect(css)
export class Tooltip {
    private _data: { text: string, placement?: string } | string | undefined;
    constructor(private _elementManipulations: ElementManipulations) { }

    public get data() { return this._data; }      // the getter lets nuBond skip unchanged values
    public set data(value: { text: string, placement?: string } | string | undefined) {
        this._data = value;
        const text = Helpers.isObject(value) ? (<any>value).text : <string>value;
        this._elementManipulations.attributes.set('tooltip', text);
    }
}
```
The `data` property is the aspect's only input. nuBond compares the new value with `aspect.data`
before assigning, so **always pair the setter with a getter** — a setter-only aspect re-runs on every
change-detection pass.

**Transformer** — global function named after the camelCased class name:
```typescript
import { Transformer } from 'nubond';

@Transformer()
export class Localize {
    constructor(private _localization: Localization) { }
    public transform(key: string, ...args: Array<any>): string { return this._localization.get(key, ...args); }
}
```
Used as `{{ localize('save_button_text') }}`.

## Template quick reference

> **Write text content as `{{ expr }}`, not `nb-value`.** The two compile to the same thing — the
> PostHTML plugin rewrites `{{ }}` into an `nb-value` span — but interpolation reads as markup, keeps
> the text where it belongs in the source, and lets one element mix literal and bound text
> (`<span>Page {{ this.page }} of {{ this.total }}</span>`, which `nb-value` cannot express).
> Reach for `nb-value` only when you must bind text onto an element you cannot add a child to
> — everywhere else use `{{ }}`.
>
> **Options are the trap.** Interpolation compiles to a child `<span>`. Inside a native `<option>`
> the HTML parser may drop that span (a silently **empty dropdown**), and inside a custom option
> element (e.g. `fluent-option`) the span becomes the click target, so selection breaks. Always write
> `<option nb-repeat="…" nb-value="item.label"></option>`. The same applies to any element whose
> content model forbids child elements (`<title>`, `<textarea>`).

```html
<p>{{ this.name }}</p>                                text (textContent) — the default choice
<p nb-value="this.name"></p>                          same thing; use only when {{ }} will not fit
<div nb-html="this.rich"></div>                       innerHTML — NOT sanitized by default
<div nb-class="{active: this.isOpen; big: this.big}"></div>
<div nb-style="opacity: this.fade; color: this.color"></div>
<input nb-attr:disabled="this.locked ? '' : null" nb-prop:checked="this.on" />
<p nb-if="this.visible">…</p>                         toggles a hidden class; stays in the DOM
<div nb-switch="this.status">
    <span nb-case="@active">Active</span>
    <span nb-default>Unknown</span>
</div>
<li nb-repeat="this.items">{{ index + 1 }}. {{ item.title }}</li>
<div nb-repeat:outer="this.groups"><span nb-repeat="this.items">{{ outerItem }} / {{ item }}</span></div>
<button nb-event:click="this.onClick()">…</button>
<input nb-event:input:300="this.search(event)" />     300 ms debounce
<button nb-event:click="#this.once()">…</button>      auto-unsubscribes after first fire
<div nb-var:label="this.makeLabel()">{{ label }}</div>
<span nb-exec="this.tick++"></span>                   runs every cycle, no output
<div nb-bound="this.ref = nativeElement"></div>       runs once when bound
<div nb-container="@Child" nb-in:data="this.v" nb-in-ref:svc="this.service"></div>
<div nb-container="%page"></div>                      route slot
<button nb-aspect:tooltip="@Save changes">…</button>
<span nb-template="@info-icon"></span>
```

**Expression prefixes:** *(none)* = re-evaluated every cycle · `#` = one-time, frozen after first
non-`undefined` result · `@` = constant — a coercion grammar, never evaluated: `@true`→boolean,
`@5`/`@0x10`→number, `@NaN`/`@null`→**strings**, `@{min: 0}`→the **string** `"{min: 0}"`,
`@007`→**SyntaxError**, anything else→string · `%` = route slot (containers only).

**Event params:** `nativeElement`, `element` (ElementManipulations), `event`, `data`
(`event.detail`), `unSubscribe`, `router` (only when routing is configured). `nb-bound` gets
`nativeElement` and `element`.

**Repeat params:** `item`, `index`, `count` — prefixed when named (`nb-repeat:outer` → `outerItem`, …).

**Reserved names** (cannot be a transformer or `nb-var` name, case-insensitive): `item`, `index`,
`count`, `element`, `nativeElement`, `event`, `data`, `unSubscribe`, `router`.

**Value coercion:** `nb-value`/`nb-html`/`nb-attr`/`nb-style` stringify via `Helpers.stringify` —
`null`/`undefined` become `''`, objects become JSON (`nb-attr` and `nb-style` instead *remove* on
`null`/`undefined`). `nb-switch`/`nb-case` compare those stringified values with `===`, which is why
`@0` and `@true` match numbers and booleans. `nb-if` coerces with `!!`. `nb-prop` alone assigns the
raw value.

> Separate expression statements with `,` (comma operator), never `;` — a `;` forces multi-statement
> compilation and the expression then always returns `undefined`. Inside `nb-class`/`nb-style` the
> roles flip: entries are separated by `;` and a `,` is a syntax error that drops the whole binding.

> nuBond ships its own `Reflect.getMetadata` polyfill — do **not** add the `reflect-metadata` package.

## Scaling to a complex application

Large nuBond apps converge on a small set of techniques. Reach for these before inventing your own —
`references/patterns.md` has the full code.

- **Prefix every binding that cannot change.** A binding with no prefix re-runs on *every* pass. Use
  `#` for values fixed after first resolution (`#localize('key')`, constructor-built tables) and `@`
  for literals (`nb-aspect:tooltip="@Delete"`). In a large app this alone halves the expressions per
  pass. (`#` must not be used inside repeats whose rows can change — see rule 14.)
- **Hidden subtrees are nearly free.** A hidden element runs its own handlers but its children are
  not evaluated at all (and are not even built until first shown), so "render every variant, show
  one" with `nb-if`/`nb-switch` costs one expression per hidden branch and keeps each branch's state.
- **Memoize expensive getters per subtree with `nb-var`.** A `nb-var` is evaluated once per pass and
  its value flows to every descendant expression, so `nb-var:date-time="this.dateTime"` replaces a
  dozen re-invocations of a costly getter.
- **Keep high-frequency interaction out of change detection.** Every `nb-event` firing schedules a
  full pass, so never bind `pointermove`/`dragover`/`scroll` with `nb-event`. Use
  `ElementSubscriptions.subscribe` (or one delegated listener on a root), drive visuals through
  `ElementInternals.states` + `:host(:state(x))` CSS or direct style writes, and dispatch an event
  or call `detect()` only when meaningful state settles.
- **Push state through singleton `@Injectable(true)` services** exposing a `CallBackEvent`; subscribe
  in the constructor and **always unsubscribe in `onDispose()`**.
- **Build child inputs as fresh object literals** — `nb-in:data="{...this.data, offset: index}"` — the
  deep-equal gate stops the churn.
- **Use `nb-switch` on a boolean as if/else**: `nb-switch="!!this.started"` with `@true`/`@false`
  cases. The `!!` matters — `undefined` stringifies to `''` and matches neither.
- **Cache derived values in a private field and invalidate it from the input setter**, rather than
  recomputing in a getter read on every pass.

### Hard constraints to design around

These are confirmed limitations of the 1.0.8 release. Each one is cheap to accommodate up front and
expensive to discover late — the full set with mechanisms and workarounds is in
`references/known-limitations.md`.

- **Apply global config that components need in a module imported before any component.**
  `@Component` captures the shadow-root config (and inline templates capture the sanitizers) when its
  decorator runs — i.e. when its module is imported, *before* `@AppRoot`'s config is applied. A
  `shadowRootConfig` or `htmlSanitizer` passed only to `@AppRoot` therefore never reaches them. Call
  `$Config({...})` in a tiny module that `index.ts` imports first.
- **Inject concrete classes only.** An interface- or `any`-typed constructor parameter silently
  receives the wrong object — a `ChangeDetector` in a container, the host DOM element in a component.
  Also declare an explicit constructor on every decorated class: inherited constructors resolve to
  zero arguments.
- **Import every entity eagerly from the app root.** Components, aspects and templates resolve at
  tree-construction time; anything registered later is permanently inert in existing trees. Lazy
  entity modules do not work.
- **Never write a `@Detector()` property from a template expression** — it self-sustains an endless
  detection loop with no diagnostic in the default mode.
- **Hash routing rewrites the URL to the origin root.** An app not served at `/` gets its path
  clobbered at router construction, and the query string is dropped. Plan deployment accordingly, and
  read `location.search` in the first-imported module if you need it.
- **Push `nb-in` values as new objects, never by mutation** (rule 8), and never route a cyclic or
  non-cloneable object through `nb-in` — use `nb-in-ref` for those from the start.
- **Don't put placeholder content inside `nb-value`/`nb-html` elements** — a first value that
  stringifies to `''` (including `undefined`/`null`) leaves the placeholder rendered as if it were data.
- **Sanitize untrusted values yourself.** No sanitizer runs by default. A configured `htmlSanitizer`
  covers `nb-html` values, but not inline templates (see the config-timing point above) and never
  `nb-attr`/`nb-prop` (`nb-attr:onclick`, `javascript:` hrefs, `srcdoc` all bind freely).

## Where to look next

Load a reference file when the task touches its area — don't read them all up front.

| File | Use it for |
|---|---|
| `references/template-bindings.md` | Every `nb-*` attribute in full: exact syntax, semantics per data type, escaping, guard rails, projection |
| `references/entities-and-di.md` | Decorator signatures, template sources, naming rules, DI resolution, built-in services, lifecycle hooks |
| `references/routing-and-change-detection.md` | Route template grammar, Router API, slot binding, CD strategies, `@Detector`/`@Eventer`, manual triggers |
| `references/project-setup.md` | Scaffolding a new app, Parcel/PostHTML/tsconfig wiring, file layout, the `add-*` CLI, reserved file names |
| `references/patterns.md` | Proven patterns from real apps: services, localization, adopted styles, third-party web components, base classes, binding-cost control |
| `references/pitfalls.md` | Console error → cause → fix, plus the traps that don't produce errors |
| `references/known-limitations.md` | **Confirmed framework limitations in 1.0.8** — data-flow, change detection, routing/deployment, DI, registration timing, security. Read before designing anything non-trivial, and when behavior defies explanation |

## Working checklist

When adding a feature:
1. Decide container (inline, page-level) vs component (isolated, reusable) vs aspect (behavior only).
2. Create `<name>.ts` + `<name>.html` (+ `<name>.scss` for components) in a folder named after the entity.
3. Import the class in the parent and add it to the parent's decorator args.
4. Wire inputs with `nb-in:` / `nb-in-ref:`, outputs with `EventDispatcher.dispatch(...)` +
   `nb-event:<name>="...(data)"` on the parent.
5. If state changes outside an `nb-event` handler (timers, promises, external callbacks), either mark
   the property `@Detector()` or inject `ChangeDetector` and call `detect()`.
6. Verify: `npm start` and check the browser console — nuBond soft-fails with `nuBond: …` messages
   rather than throwing. A silent blank region almost always means an unregistered entity; a region
   that renders but carries no data usually means a camelCase binding name or repeat prefix.
