# Pitfalls, errors and debugging

nuBond **soft-fails**: nearly every problem is a `console.error` prefixed with `nuBond: `, not an
exception — including exceptions thrown inside template expressions, which are caught and logged. A
blank region, a stale value, or an unstyled element usually means a logged message you have not read
yet. Deliberate exceptions that do throw: `@AppRoot` on conflicting metadata, a malformed route
template, and all `Router` methods when routing is not configured.

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
| `Injection 'X' cannot be resolve.` | Class not registered with `@Injectable`/`$Injectable`, or the service is not available for this entity type. The class being constructed is the first console argument. | Add `@Injectable()`; check the availability matrix — `ElementManipulations`/`ElementSubscriptions` exist only in components and aspects. |
| `Injection 'Object' cannot be resolve.` | A constructor parameter typed with an interface, `any`, `unknown`, a union or a generic — TypeScript emits `Object` for those, and the parameter arrives `undefined`. | Type the parameter with a concrete (registered) class. |
| `Injection 'X' cannot be resolve as it is a circular reference: A->B->A` | Constructor cycle. | Break it: inject a shared third service, or resolve lazily inside a method. |
| `Injection 'X' already exists, injection should be unique.` | The same class was registered twice (`@Injectable` plus `$Injectable`, or a duplicated import path). | Register once. |
| `property 'X' has getter or setter or both, such properties cannot be decorated` | `@Detector()`/`@Eventer()` on an accessor. | Use a plain field, and do the extra work in a normal method. |
| `property 'X' should be configurable and cannot be decorated` | Property was defined non-configurable. | Use a plain class field. |
| `Unable to get <entity> template in 3 attempts.` | A URL/provider template kept failing to load. | Fix the path/provider; note nuBond gives up after 3 attempts. |
| `Container 'X' is not ready` / `Aspect 'X' is not ready` | Async template/style requested before it resolved. | Usually transient; if persistent, the fetch is failing — check the preceding error. |
| `invalid operation: context is already binded` / `already set` | The same context instance was bound twice. | Do not reuse a context instance across elements. |
| `Transformers with 'X' name cannot be created, this name is reserved.` | Collides with `item`, `index`, `count`, `element`, `nativeElement`, `event`, `data`, `unSubscribe`, `router`. | Rename, or pass an explicit name: `@Transformer('fmtDate')`. |
| `… class name (Xy) looks like a minified class name.` | Minifier mangled class names. | Configure the minifier to preserve class names, or pass explicit names everywhere. |
| `Attempt to create multiple nuBond applications binded to the same already bounded tree found` | An `@AppRoot` on an element that already is an app root, or that sits inside one (the bound ancestor is the logged element). | Give each app its own, non-nested element/selector. |
| `Element with selector 'X' not found, application cannot be created.` | `@AppRoot` string not starting with `/` is a selector — often a route template missing its leading `/`. | Fix the selector, or prefix the route with `/` (`'/#[page=main]'`). |
| `Invalid selector 'X', application cannot be created.` | Same cause, but the string is not even valid CSS — e.g. `'#/{page}'`. | Prefix the route template with `/`. |
| `Root element is not connected to DOM, application cannot be created.` | `@AppRoot` was given an element that is not in the document. Appending it later does not revive the app. | Attach the element first, then bind. |

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
| `conditional class expression can't mutate static (X) class.` | A conditional `nb-class` key names a class that is also in the element's `class="…"`. That key is not bound; the class stays on. | Remove the class from the markup and let the condition own it. |
| `duplicated class name (X) found.` | The same key twice in a conditional `nb-class`. First one wins. | Merge the conditions into one entry. |
| `value with 'X' name cannot be created, this name is reserved.` / `… is not a valid identifier.` | `nb-var` name collides with a reserved name or a transformer, or is not a JS identifier (`nb-var:let`, `nb-var:my-2nd`). | Rename the variable. |
| `repeat prefix 'X' name cannot be created, it is conflicting with <name> transformer.` | `nb-repeat:x` generates `xItem`/`xIndex`/`xCount` colliding with a transformer. | Rename the prefix. |
| `repeat prefix 'X' name cannot be created, it is not a valid identifier.` | Hyphenated or otherwise non-identifier prefix (`nb-repeat:outer-list`). The repeat does not run. | Use one lowercase word. |
| `invalid operation: template 'X' not found` / `template name should start with '@'` | `nb-template` misuse. | `$Template('x', html)` before use; always write `nb-template="@x"`. |
| `Invalid template 'X': html templates cannot reference themselves.` | The template contains `nb-template="@X"` pointing at itself. It renders empty. | Remove the self-reference (cycles through a second template are *not* caught — they overflow the stack). |
| `X input set error, object cannot be cloned, try to use nb-in-ref:name instead of nb-in:name` | `structuredClone` failed on an `nb-in` value — a function, a DOM node, or an object carrying one. Logged every pass; the child's property is set to `undefined`. | Switch to `nb-in-ref:` — required for callbacks, class instances with methods, DOM nodes. |
| `X input initial value cannot be cloned` (warning) | The *child's own* initial value for an `nb-in` property is not cloneable. | Harmless — the input is still delivered; initialize the property with plain data to silence it. |
| `X event promise error: …` | A promise returned from an `nb-event` handler rejected. | Handle the failure inside the handler. |
| `onX looks like an HTML Event Attribute, event subscription should be done via nb-event` (warning, debug only) | `nb-attr:on…` target. The binding is still created. | Use `nb-event:`. Non-event names starting with `on` (`once`) warn too — ignore those. |
| `expression "…" compilation error` / `execution error` | Syntax error or runtime throw in the expression. | Check quoting inside the attribute; move complex logic into a method. |
| `expression '…' is evaluated in multi-statement way` (warning) | A `;` in the expression. | Use the comma operator `,`. Otherwise the expression always returns `undefined`. |
| `element original children will replaced by nb-value` (warning) | `nb-value`/`nb-html` on an element that has real children. | Move the binding to a child element. |
| `container is mapped to route, that is not configured.` | `nb-container="%slot"` without a route template. | Add the route template to `@AppRoot`, or use `@ContainerName`. |
| `Router: container 'X' not found, can't route.` | Route slot value is not a registered container name. | Register the container, or fix the slot value. |
| `tree can't stabilize in 10 change detection cycles` | Pessimistic strategy with a binding that keeps mutating state. | Remove side effects from bindings (`nb-exec` that writes state read by another binding is the usual culprit). |
| `X property value can't stabilize in 10 change detection cycles, detector is disabled.` | An expression keeps assigning the `@Detector()` property `X` a value that never settles (a counter, `Date.now()`, `Math.random()`). That detector no longer triggers detection for the life of its context. | Move the write out of the template into the handler that changes the source state. |
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

**A hidden component's constructor has not run.** A component or container whose own element starts
hidden (`nb-if` false, an unpicked `nb-case`/`nb-default`, an empty `nb-repeat`) is built only when
that element is first shown. A panel that subscribes to a "reveal me" service event in its
constructor never hears the request that would first show it. Pass such state through an input, or
read the service's current state on construction.

**A hidden container does not swap.** While an `nb-container` element is hidden, changing or emptying
its name (or the route slot it is bound to) does nothing until it is shown again — the old instance
stays alive with its state. Closing a dialog by hiding it and then emptying its container name does
not reset it; empty the name first, or reset the state yourself.

**Hidden by CSS is not hidden to nuBond.** Only `nb-if`/`nb-switch`/`nb-repeat` make an entity lazy.
Components inside a closed `popover`, a `<dialog>` or a collapsed third-party control are all
constructed at startup.

**Boolean values in `nb-attr` become the strings `"true"`/`"false"`.** Since an HTML boolean attribute
counts as set whenever it is *present*, `nb-attr:disabled="false"` **disables** the control. Use
`this.x ? '' : null`, or bind the DOM property with `nb-prop:` instead (property bindings pass values
through unstringified).

**`nb-value`/`nb-html` render `null` and `undefined` as an empty string**, not as `"null"`. Add
`?? '—'` if you want a visible placeholder.

**A switch with no matching case and no `nb-default` hides the switch element itself.** If the wrapper
must stay visible, always provide an `nb-default` (it may be empty).

**Switch/case matching is type-strict.** Primitives are compared with `===` as they are: `@0` matches
the number `0` and `@true` the boolean `true`, but `@5` does **not** match the string `'5'` that comes
out of router state, an `<input>` value or a URL parameter — write `nb-case="'5'"`. Objects and arrays
are compared by JSON text, so two different objects with the same JSON match (and so does a string
case holding that JSON). Do not switch on objects.

**`$Template` must be registered before first use.** `nb-template` resolves during tree construction
and never retries. Call your template registrations at module scope, before `@AppRoot` evaluates.

**A setter-only aspect re-runs on every pass.** The handler gates assignment with
`Helpers.equals(aspect.data, newValue)`; with no getter that read is always `undefined`, so the setter
fires each cycle for a continuously bound expression. Add a `data` getter, or bind with `#`.

**A mistyped debounce subscribes to an event that never fires.** The debounce is the last `:` segment
only when it is numeric; anything else is taken as part of the event name (that is what makes
`nb-event:plugin:ready` work). So `nb-event:click:abc` and `nb-event:click:` listen for events
literally named `click:abc` and `click:` — with no error at any `showDebugInfo` setting.

**`nb-class` is not an object literal.** Keys are taken literally — `{'is-on': x}` toggles a class
named `'is-on'` *including the quotes* — and entries are separated by `;`, not `,`. Write
`{is-on: x; is-off: !x}`. In the array form `[this.a, this.b]` is a single entry that yields only
`this.b`.

**A class written in the markup cannot be toggled off.** `nb-class` never removes a class that is in
the element's `class="…"` attribute. In the simple and array forms that is silent; in the conditional
form the key is rejected with an error and stays unbound. Keep toggled classes out of the markup.

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
functions as never equal, and arrow-function fields are own enumerable properties. A `@Detector()`
value carrying one re-fires on every assignment — and through `nb-in` such an object cannot be cloned
at all. Use prototype methods instead.

**A function passed with `nb-in` arrives as `undefined`.** Every non-primitive `nb-in` value is
cloned, and functions are not cloneable: `nb-in:on-pick="this.pick"` logs an input-set error on every
pass and the child gets nothing. Pass callbacks with `nb-in-ref`, or notify the parent with an event.

**A cyclic object is reported *equal*.** `Helpers.equals` logs `deep equality comparison detected a
circular reference` and returns `true`, so updates are silently dropped. Never route a cyclic graph
through `nb-in` or a `@Detector()` property.

**`Set` comparison is by identity, not deep.** A `Set` of freshly built objects always compares as
different from a structurally identical one — and through `nb-in` a `Set` of objects (or a `Map` with
object keys) never equals its own clone, so it is re-delivered on every pass.

**`nb-switch` on a possibly-`undefined` value matches nothing.** `undefined`/`null` match no case —
not even an empty-string one — so without an `nb-default` the whole switch element is hidden. Coerce
with `!!` for boolean switches.

**Subscriptions taken in a constructor leak without `onDispose()`.** Containers and components are
disposed and recreated as routes change and `nb-repeat` grows/shrinks. Every `service.onChange(...)`,
`router.onAfterStateChange(...)` and manual `addEventListener` must be released in `onDispose()`.

**In-place mutation reaches a child through `nb-in`, but not through `nb-in-ref`.** `nb-in` compares
a fresh clone with the previous clone, so `this.cfg.x = 2` is delivered on the parent's next pass.
`nb-in-ref` shares the object and compares it with itself: no input update, no child pass — the
child's data is current but its DOM is stale. For `nb-in-ref` assign a new reference (or have the
child `detect()`). `@Detector()` only reacts to *assignment* of a deep-unequal value, never to a
mutation inside the object it holds.

**A child's edit to its own input is reverted.** The object delivered by `nb-in` doubles as the
comparison baseline, so after the child changes it the parent's (unchanged) value is delivered again
on the parent's next pass. Copy an input before editing it.

**`nb-repeat` reads its collection live**, so `this.items.push(x)` followed by a `detect()` renders.

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

**Writing a `@Detector()` property from a template disables it.** `nb-exec="this.n = this.n + 1"`
re-triggers its own pass; after about twenty passes the framework logs
`n property value can't stabilize …, detector is disabled.` and `n` stops triggering detection for
good — later assignments from timers or promises then silently render nothing.

**`@Detector()` / `@Eventer()` don't inherit.** They are keyed on the decorated prototype; lookup uses
`instance.constructor.prototype`. Declaring one on a base class silently does nothing for subclasses.

**`@Detector()` / `@Eventer()` need a plain field.** An own non-configurable property or own accessor
is rejected with a logged error — but a class `get`/`set` accessor (which lives on the prototype) is
**silently shadowed**: no error, and your getter/setter code never runs again.

**`nb-html` is not sanitized by default, and a sanitizer doesn't cover everything.** Without a
configured `htmlSanitizer` the value is written raw to `innerHTML`. A configured one is applied to
`nb-html` values and to templates loaded by URL or provider — but never to inline templates and
styles, which are treated as trusted source code, and `nb-attr`/`nb-prop` bypass sanitization
altogether (`nb-attr:onclick`, `javascript:` hrefs, `srcdoc`). **Sanitize untrusted values yourself
before binding them, and never assemble an inline template from untrusted data.**

**Shadow roots are `closed` by default.** `element.shadowRoot` is `null` from outside; you cannot
`querySelector` into a component. Communicate via inputs and events, or open them deliberately —
per component (`shadowRootConfig: { mode: 'open' }`) or app-wide (`$GlobalShadowRootConfig`).

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
7. Input not arriving → is it cloneable (functions are not — use `nb-in-ref`)? Is the new value
   deep-equal to the old one? With `nb-in-ref`, was the object mutated in place instead of replaced?
   Did the parent actually run a pass? Is the property name the camelCase form of the kebab
   attribute? Is the child hidden right now?
8. Route slot empty → is the slot value a registered **container name**, matched case-insensitively?
9. Rows render but carry no data → camelCase `nb-repeat:` prefix, or a `#` frozen at the row
   position.
10. Component/container "missed" something or kept old state → was its element hidden? It is built
    on first show, and a hidden container ignores name changes until shown again.
11. Global config "ignored" → wrong key/type (whole object dropped silently) — including a leftover
    `shadowRootConfig` key. Shadow-root config "ignored" → `$GlobalShadowRootConfig` called after the
    components were imported instead of in a first-imported module.
12. Switch shows the default (or nothing) for a value that "obviously" matches → type mismatch:
    `@5` is a number, the switch value is a string.
