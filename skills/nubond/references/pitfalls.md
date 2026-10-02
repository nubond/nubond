# Pitfalls, errors and debugging

nuBond **soft-fails**: nearly every problem is a `console.error` prefixed with `nuBond: `, not an
exception — including exceptions thrown inside template expressions, which are caught and logged. A
blank region, a stale value, or an unstyled element usually means a logged message you have not read
yet. Deliberate exceptions that do throw: `@AppRoot` on conflicting metadata or an invalid selector
string, a malformed route template, and all `Router` methods when routing is not configured.

Treat any `nuBond:` error as a failing test: in a UI test harness, intercept `console.error`,
`window.onerror` and `unhandledrejection` and fail the running test on any of them.

**Turn on `showDebugInfo: true` while developing.** It adds minification warnings, low-performance
repeat warnings, multi-statement expression warnings, "children will be replaced" warnings — and makes
expression compile/execution errors **throw** instead of silently yielding `undefined`.

## Console message → cause → fix

### Registration and resolution

| Message | Cause | Fix |
|---|---|---|
| `invalid operation: Container with name 'X' not found.` | The container class was never imported, so its decorator never ran. | Import it and add it to the parent's decorator args. Check spelling — lookup is case-insensitive but the name must match the class name. |
| `aspect with 'X' name not found` | Aspect not imported/registered. | Add it to `@AppRoot` deps. Remember the name is the **kebab-cased** class name (`Tooltip` → `tooltip`). |
| `Component name X is not valid custom element name.` | Single-word class name produced a tag without a hyphen. | Rename the class (`ItemCard`) or use the tuple form: `@Component(['my-button', html], css)`. |
| `Component/Container/Aspect with 'X' name already exists…` | Two classes map to the same case-insensitive name. | Rename one, or give an explicit name via the tuple form. |
| `Injection 'X' cannot be resolve.` | Class not registered with `@Injectable`/`$Injectable`, or the service is not available for this entity type. | Add `@Injectable()`; check the availability matrix — `ElementManipulations`/`ElementSubscriptions` exist only in components and aspects. |
| `Injection 'X' cannot be resolve as it is a circular reference: A->B->A` | Constructor cycle. | Break it: inject a shared third service, or resolve lazily inside a method. |
| `Injection 'X' already exists, injection should be unique.` | The same class was registered twice (`@Injectable` plus `$Injectable`, or a duplicated import path). | Register once. |
| `property 'X' has getter or setter or both, such properties cannot be decorated` | `@Detector()`/`@Eventer()` on an accessor. | Use a plain field, and do the extra work in a normal method. |
| `property 'X' should be configurable and cannot be decorated` | Property was defined non-configurable. | Use a plain class field. |
| `Unable to get <entity> template in 3 attempts.` | A URL/provider template kept failing to load. | Fix the path/provider; note nuBond gives up after 3 attempts. |
| `Container 'X' is not ready` / `Aspect 'X' is not ready` | Async template/style requested before it resolved. | Usually transient; if persistent, the fetch is failing — check the preceding error. |
| `invalid operation: context is already binded` / `already set` | The same context instance was bound twice. | Do not reuse a context instance across elements. |
| `Transformers with 'X' name cannot be created, this name is reserved.` | Collides with `item`, `index`, `count`, `element`, `nativeElement`, `event`, `data`, `unSubscribe`, `router`. | Rename, or pass an explicit name: `@Transformer('fmtDate')`. |
| `… class name (Xy) looks like a minified class name.` | Minifier mangled class names. | Configure the minifier to preserve class names, or pass explicit names everywhere. |
| `Attempt to create multiple nuBond applications binded to the same element` | Two `@AppRoot`s on one element. | Give each its own element/selector. |
| `Element with selector 'X' not found` | `@AppRoot` string not starting with `/` is a selector — often a route template missing its leading `/`. | Fix the selector, or prefix the route with `/` (`'/#[page=main]'`). |

### Template / binding

| Message | Cause | Fix |
|---|---|---|
| `element can't have nb-value and nb-html bindings at the same time.` | Mutually exclusive content handlers. | Split across nested elements. Groups: content (`value`/`html`/`switch`/`container`/component/`template`), structure (`case`/`default`/`repeat`), function (`case`/`default`/`if`). |
| `nb-case must have direct nb-switch parent` | A wrapper element sits between switch and case. | Make the case a direct child, or move `nb-switch` onto the wrapper. |
| `there should be only one nb-default for one nb-switch` | Multiple defaults. | Keep one. |
| `classes should be changed via nb-class` / `styles … via nb-style` / `text content … via nb-value` / `html content … via nb-html` / `outerHTML cannot be changed` | Used `nb-attr:class`, `nb-prop:className`, `nb-prop:textContent`, `nb-prop:outerHTML`, etc. | Use the dedicated handler. |
| `system (X) attribute changes is not allowed` | Tried to bind an `nb-*` framework attribute through `nb-attr:`. | Framework attributes are managed by nuBond; drop the binding. |
| `incorrect binding found, nb-X attributes should have value.` | An `nb-*` attribute left empty. | Give it an expression, or remove it. Only `nb-aspect:*` and `nb-default` may be valueless. |
| `multiple handlers for one attribute/property/event/in/variable (X) are not supported` | Duplicate `nb-attr:x` etc. on one element. | Keep one; combine logic in the expression. |
| `incorrect conditional class expression, expected: {a: cond1; b: cond2}` | Malformed `nb-class`. | Use `;` between entries; escape a literal `;` as `\;`. |
| `expression "x, b: y" compilation error: SyntaxError: Unexpected token ':'` (a `bind error` with `showDebugInfo`) on an `nb-class` | Entries separated with `,` — everything after the first key became one malformed expression. No class from that binding is applied. | Separate entries with `;`. |
| `'X' event has wrong debounce data (NaN) and will not be debounced` (debug only) | `nb-event:ns:name` — everything after the first `:` is read as a debounce. | Event names cannot contain `:`; re-dispatch under a colon-free name. |
| `value with 'X' name cannot be created, this name is reserved.` | `nb-var` name collides with a reserved name or a transformer. | Rename the variable. |
| `repeat prefix 'X' name cannot be created, it is conflicting with transformer.` | `nb-repeat:x` generates `xItem`/`xIndex`/`xCount` colliding with a transformer. | Rename the prefix. |
| `invalid operation: template 'X' not found` / `template name should start with '@'` | `nb-template` misuse. | `$Template('x', html)` before use; always write `nb-template="@x"`. |
| `input set error, if object cannot be cloned, try to use nb-in-ref:name` | `structuredClone` failed on an `nb-in` value. | Switch to `nb-in-ref:` — required for class instances with methods, functions, DOM nodes. |
| `expression "…" compilation error` / `execution error` | Syntax error or runtime throw in the expression. | Check quoting inside the attribute; move complex logic into a method. |
| `expression '…' is evaluated in multi-statement way` (warning) | A `;` in the expression. | Use the comma operator `,`. Otherwise the expression always returns `undefined`. |
| `element original children will replaced by nb-value` (warning) | `nb-value`/`nb-html` on an element that has real children. | Move the binding to a child element. |
| `container is mapped to route, that is not configured.` | `nb-container="%slot"` without a route template. | Add the route template to `@AppRoot`, or use `@ContainerName`. |
| `Router: container 'X' not found, can't route.` | Route slot value is not a registered container name. | Register the container, or fix the slot value. |
| `tree can't stabilize in 10 change detection cycles` | Pessimistic strategy with a binding that keeps mutating state. | Remove side effects from bindings (`nb-exec` that writes state read by another binding is the usual culprit). |
| `Low performance for repeat expression is expected…` (warning) | `nb-repeat` over a plain object. | Repeat over an array; convert with `Object.values(...)`. |

## Traps that produce no error at all

**Silent stale UI.** Nothing rendered/updated and the console is clean → the change-detection pass was
never triggered. Only `nb-event` handlers, `@Detector()` assignments, `ChangeDetector.detect()`,
`ElementManipulations` mutations, input changes and route changes trigger a pass — and each only for
its own context's binder. Timers, `fetch().then()`, `addEventListener` registered in TypeScript,
service callbacks, and third-party callbacks do not.

**`ElementSubscriptions.subscribe` does not trigger change detection.** It is a bare
`addEventListener` — the exact opposite of `nb-event:*`, which always schedules a pass. Callbacks that
mutate bound state must call `detect()` themselves.

**A component built with `document.createElement` never initializes.** Components bootstrap through an
internal `$bind` called by the template handler, not through `connectedCallback`. Hand-created
instances get no shadow root, no template and no context, and fail silently. Always render components
from a nuBond-bound template.

**`onContainerAttached` / `onContainerDetached` never fire for components.** They are wired only for
`nb-container`. Use the component's constructor, an `nb-bound` capture, or an `EventDispatcher` event
instead.

**Inputs freeze while a child is hidden.** A container/component hidden by `nb-if`/`nb-switch` stops
refreshing its `nb-in` values until it is visible again — so it can briefly render with stale inputs on
reappearance if you also read them during the same pass.

**Boolean values in `nb-attr` become the strings `"true"`/`"false"`.** Since an HTML boolean attribute
counts as set whenever it is *present*, `nb-attr:disabled="false"` **disables** the control. Use
`this.x ? '' : null`, or bind the DOM property with `nb-prop:` instead (property bindings pass values
through unstringified).

**`nb-value`/`nb-html` render `null` and `undefined` as an empty string**, not as `"null"`. Add
`?? '—'` if you want a visible placeholder.

**A switch with no matching case and no `nb-default` hides the switch element itself.** If the wrapper
must stay visible, always provide an `nb-default` (it may be empty).

**Switch/case comparison is stringified.** `Helpers.stringify` is applied to both sides, so `@0`
matches the number `0` and `@true` matches the boolean `true` — but two different objects with the same
JSON also match. Do not switch on objects.

**`$Template` must be registered before first use.** `nb-template` resolves during tree construction
and never retries. Call your template registrations at module scope, before `@AppRoot` evaluates.

**A setter-only aspect re-runs on every pass.** The handler gates assignment with
`Helpers.equals(aspect.data, newValue)`; with no getter that read is always `undefined`, so the setter
fires each cycle for a continuously bound expression. Add a `data` getter, or bind with `#`.

**Event names cannot contain `:`.** The suffix after the first `:` is parsed as a debounce value, so
`nb-event:my:event` binds `my` with a broken debounce.

**`nb-class` is not an object literal.** Keys are taken literally — `{'is-on': x}` toggles a class
named `'is-on'` *including the quotes* — and entries are separated by `;`, not `,`. Write
`{is-on: x; is-off: !x}`.

**A class added by hand to a bound element disappears.** `nb-class` commits by assigning `className`
wholesale from its own list, so `classList.add('drop-target')` on an element that has `nb-class` (or
any visibility handler) is wiped on the next commit. Use `element.classes.add()` from
`ElementManipulations`, or a `data-*` attribute, for out-of-band markers.

**`nb-repeat` over an empty collection still evaluates the element.** The original element is hidden
but its own bindings run with `item` undefined. Write `item?.x` everywhere on a repeated element.

**`nb-bound` on a repeated element runs once per row element, ever.** It may run for the first row
while the list is still empty, and never re-runs as rows are reused for other items. Feed rows through
continuous bindings instead.

**`#` inside a repeat freezes per row position.** Rows are reused by index, so a `#` binding keeps the
first value it saw at that index. Only use `#` in rows of lists that never change shape.

**A transformer under `#` can freeze `''`.** `#` waits for a non-`undefined` result. `{{ #fmt(item?.x) }}`
in an initially empty repeat freezes the empty string forever if `fmt(undefined)` returns `''`. Make
transformers used under `#` return `undefined` for `undefined` input.

**Debounced events inside rebuilt rows never fire.** A row's subscriptions are re-created whenever its
`item` stops being deep-equal, which cancels a pending debounce. If a list rebuilds its row objects on
every refresh, `nb-event:input:300` inside it never calls the handler.

**A camelCase `nb-repeat` prefix silently breaks the loop variables.** `nb-repeat:userRole` defines
`userroleItem`; `userRoleItem` reads `undefined`. Rows still render, just empty.

**`nb-prop` re-assigns only when the bound value changes.** A control that changes its own state
(checkbox, toggle button that flips on click, a reused form row) drifts from the model when the model
ignores the edit. Write the change back with `nb-event`, and push a fresh value when you reject it.

**`nb-switch` keeps every case it has shown alive.** A component placed in several cases, or in a
repeated switch, exists as several instances; `querySelector` may return a hidden one, and service
callbacks fire on all of them. Pick the visible instance; skip expensive work when off-screen.

**A freshly rendered component is not wired yet.** A component with `nb-in` inputs runs its first pass
in a later task. Its own `nb-event`s don't exist for that moment; don't fire events at it
synchronously after rendering it.

**`detect()` doesn't render now.** Code that assigns rows and immediately opens/measures a popover
operates on the *previous* DOM. Wait a task (or do the follow-up in `onDetectChangesDone()`).

**Template expressions are not type-checked.** Renaming a method leaves `this.oldName()` in markup,
compiling fine and failing only when evaluated. Search templates when renaming.

**camelCase in a binding name silently targets the wrong property.** HTML lowercases attribute names,
so `nb-in:metaData` becomes `nb-in:metadata` → property `metadata`. Always kebab-case
`nb-in:`, `nb-in-ref:`, `nb-prop:` and `nb-var:` names. No error is logged — the child just never
receives the input.

**`nb-repeat` has no keyed diff.** DOM node *N* is always item *N*, so reordering re-binds every row in
place. Focus, scroll position, uncommitted input values and child-component internal state stay with
the *position*. Avoid reordering lists that contain focusable or stateful children; rebuild them with a
distinct top-level `nb-if`/`nb-switch` branch instead.

**An arrow-function class field makes an object permanently "changed".** `Helpers.equals` treats
functions as never equal, and arrow-function fields are own enumerable properties. A `@Detector()` or
`nb-in` value carrying one re-fires on every assignment. Use prototype methods instead.

**A cyclic object is reported *equal*.** `Helpers.equals` logs `deep equality comparison detected a
circular reference` and returns `true`, so updates are silently dropped. Never route a cyclic graph
through `nb-in` or a `@Detector()` property.

**`Set` comparison is by identity, not deep.** A `Set` of freshly built objects always compares as
different from a structurally identical one.

**`nb-switch` on a possibly-`undefined` value matches nothing.** `undefined` stringifies to `''`; with
no `nb-default` the whole switch element is hidden. Coerce with `!!` for boolean switches.

**Subscriptions taken in a constructor leak without `onDispose()`.** Containers and components are
disposed and recreated as routes change and `nb-repeat` grows/shrinks. Every `service.onChange(...)`,
`router.onAfterStateChange(...)` and manual `addEventListener` must be released in `onDispose()`.

**In-place mutation is invisible to `nb-in` — permanently.** The input cache stores the *same
reference* the parent expression returned, so later cycles compare the object against itself and can
never see a mutation. This is not "usually missed", it is "never delivered": with `nb-in` the child
keeps a clone of the first state and diverges silently forever. Assign a new, deep-unequal object.
`@Detector()` is likewise gated by deep equality on the assigned value.

**Exception:** `nb-repeat` reads its collection live through the source handler, so
`this.items.push(x)` followed by a `detect()` *does* render.

**Deep-equal inputs don't refresh.** Passing a brand-new object with identical contents through
`nb-in` does not update the child and does not fire `onInputsRefreshDone()`.

**Change detection is async.** After `detect()` the DOM is not yet updated; don't measure or read back
rendered values in the same task.

**`nb-if` hides, it doesn't remove.** The element stays in the DOM with a `nb-hidden` class
(`display: none !important`). CSS selectors like `:first-child`, `:nth-child`, third-party components
that index their children (menus, tab lists), and layout that counts children still see it. Filter in
TypeScript when that matters. Hidden containers/components also have change detection disabled until
shown again. In tests, "is it shown" means checking the class *and* an ancestor — a child of a hidden
element doesn't carry the class itself (use `checkVisibility()` / `offsetParent`).

**Two visibility handlers on one element desync.** `nb-if` + `nb-repeat` (or + `nb-switch`) are not
rejected, but share one hidden class without refcounting — e.g. `if→false`, list empties, `if→true`
shows an element whose repeat is empty, with stale content. Put the second condition on a child.

**`@Detector()` / `@Eventer()` don't inherit.** They are keyed on the decorated prototype; lookup uses
`instance.constructor.prototype`. Declaring one on a base class silently does nothing for subclasses.

**`@Detector()` / `@Eventer()` need a plain field.** An own non-configurable property or own accessor
is rejected with a logged error — but a class `get`/`set` accessor (which lives on the prototype) is
**silently shadowed**: no error, and your getter/setter code never runs again.

**`nb-html` is not sanitized by default, and a sanitizer doesn't cover everything.** Without a
configured `htmlSanitizer` the value is written raw to `innerHTML`. A configured one is applied to
`nb-html` values, but inline templates are sanitized at decorator-import time — before `@AppRoot`
applies its config — and `nb-attr`/`nb-prop` bypass sanitization altogether (`nb-attr:onclick`,
`javascript:` hrefs, `srcdoc`). **Sanitize untrusted values yourself before binding them.**

**Shadow roots are `closed` by default.** `element.shadowRoot` is `null` from outside; you cannot
`querySelector` into a component. Communicate via inputs and events, or set
`shadowRootConfig: { mode: 'open' }` deliberately.

**Component styles don't leak in.** A `@Component`'s shadow DOM blocks page CSS. Share styles with
`$AdoptedStyle` + `['name']`, or expose CSS custom properties (which do pierce shadow boundaries).

**Containers have no isolation.** `@Container` styles are global — the opposite of components. Choose
deliberately.

**`item` differs by data type.** For a `Map`, `item` is a `[key, value]` pair. For an object, it's the
property *value*. For a number `N`, it's `index + 1`. See the bindings reference.

**Never name an entity `index` or `app`.** Those basenames are reserved by the Parcel pipeline for
entry assets; the import resolves to `undefined` instead of a template string.

**Minification breaks names.** Container/component/aspect/transformer names derive from class names.
Preserve them in the production build.

**Decorator arg order doesn't matter, but arg *type* does.** `@Component(html, css, ['adopted'], Dep)`
resolves by type. Passing a style string where you meant an adopted-style name (or vice versa) fails
quietly — arrays of strings are adopted styles, bare strings are the style template.

**`{{ }}` rewrites double quotes.** The interpolation plugin turns `"` into `'` (the expression lands
in a double-quoted attribute), so `{{ "it's" }}` breaks. Balanced braces are fine
(`{{ this.f({a: 1}) }}`); unbalanced ones leave the text literal with a build-time error.

**`ElementManipulations` in an aspect targets the host element.** Aspects create no scope — attributes
and classes you set land on whatever element carries `nb-aspect:*`.

**`element.attributes.set('class'|'style', …)` is silently destroyed** by the next commit of the
Classes/Styles models. Use `element.classes.add/remove/toggle` and `element.styles.set/remove`, which
route through the owning handlers.

**`ElementSubscriptions` listeners live as long as the element.** They are not removed when the
component/aspect is disposed — but the framework disposes a component or aspect only when its element
leaves the page, so the listener goes with it. Two consequences: a *debounced* subscription can still
fire once after disposal (guard the callback), and anything you subscribe to that outlives the element
— `window`, `document`, a service's `CallBackEvent`, the router — must be released in `onDispose()`.

**Aspects have no dispose lifecycle at all** — never acquire timers or global listeners in an aspect
constructor; there is no way to release them. Aspects are also constructed for elements that never
become visible.

**An entity registered after its tree was built is permanently inert.** Components, aspects and
templates resolve at tree-construction time with no re-scan. Import everything eagerly from the app
root.

**Registering a transformer late can freeze whole subtrees** — a name colliding with an existing
`nb-var` or repeat prefix produces a duplicate strict-mode parameter and every expression in that scope
dies with a `SyntaxError`.

> For the full catalogue of open framework bugs — with mechanisms, confirmations and workarounds —
> see `known-limitations.md`.

## Debugging checklist

1. Is `showDebugInfo: true` on? Turn it on first.
2. Read the browser console for `nuBond: ` messages, top to bottom — the first one usually explains
   everything after it.
3. Region blank/unstyled → is the entity imported **and** listed in a decorator's dependency args?
4. Value stale → what triggers change detection here? Add `@Detector()` or inject `ChangeDetector`.
5. Component tag inert → does the tag name contain a hyphen and match the kebab-cased class name?
6. Expression yields `undefined` → does it contain a `;`? Replace with `,`.
7. Input not arriving → is it cloneable? Is the new value deep-equal to the old one? Was the old
   object mutated in place instead of replaced? Is the property name the camelCase form of the kebab
   attribute? Is the child hidden right now?
8. Route slot empty → is the slot value a registered **container name**, matched case-insensitively?
9. Rows render but carry no data → camelCase `nb-repeat:` prefix, or a `#` frozen at the row
   position.
10. Element visible when it shouldn't be (or vice versa) → two visibility handlers (`nb-if`,
    `nb-repeat`, `nb-switch`) on one element.
11. Global config "ignored" → wrong key/type (whole object dropped silently), or a component-level
    setting passed to `@AppRoot` instead of a first-imported `$Config`.
