# Known limitations and behavioral traps

Confirmed behavior of the **`nubond` 1.0.9** release, each verified against its source and most
reproduced by execution. Some are open limitations, some are deliberate design positions — either way
they change how you must design a non-trivial app. Later releases may lift some of them; if the
project depends on a newer `nubond`, re-check before working around something that may be fixed.

When something behaves inexplicably, check this list before debugging your own code.

## Environment baseline

The framework targets **modern browsers only** — an explicit design decision:

- `Float16Array` is referenced unguarded in `Helpers.equals` / `isTypedArray` — engines without it
  (pre-Chrome 135, pre-Firefox 129, pre-Safari 18, Node < 22.3) throw `ReferenceError` on **every
  deep-equality comparison of an object**, which is the core of input delivery and `@Detector`.
- Mutable `adoptedStyleSheets` is required (Chrome 99+, Safari 16.4+).
- The package is compiled for `ESNext` with no downleveling and no polyfill story.
- **No SSR, no bare-Node import.** Importing the package runs DOM initializers immediately. For unit
  tests, keep framework-free logic in modules that never import `nubond`, and test entities under
  jsdom (which has no `structuredClone` — polyfill it, or every non-primitive `nb-in` value fails to
  clone and arrives as `undefined`).

## Configuration timing

**The global shadow-root config must be set before any component is decorated.** It is set with
`$GlobalShadowRootConfig` (not an `IGlobalConfig` key), and `@Component` captures it when its decorator
runs. Entity modules are imported (and decorated) before any statement in the body of `index.ts`
executes — imports are hoisted — so a call placed there, or next to `@AppRoot`, reaches no component,
and nothing is logged. **Call `$GlobalShadowRootConfig({...})` in a module that `index.ts` imports
first.** Everything in `IGlobalConfig` — `showDebugInfo`, `complyWithW3C`, the CD strategy and the
sanitizers — is read later and works from `@AppRoot`.

**Config objects that fail the shape check are dropped silently** — an unknown key or a wrongly typed
value (`{ showDebugInfo: 'true' }`) and the app runs unconfigured.

## Data flow — the most consequential group

**`nb-in` and `nb-in-ref` detect change differently.** For `nb-in` the value is cloned on every pass
and deep-compared with the previous clone, so a replaced object *and* an in-place mutation are both
delivered; a new object with identical contents is not. For `nb-in-ref` the baseline is the shared
live object, so a mutation compares equal: the child's data is already right, but no input update
fires and its DOM stays stale until something else triggers its pass.

```typescript
this.cfg.x = 2;                     // nb-in: delivered next pass · nb-in-ref: child DOM stays stale
this.cfg = { ...this.cfg, x: 2 };   // delivered by both
```

A mutation is only *noticed* when the parent runs a pass — `this.cfg.x = 2` in a timer still needs
`detect()`.

**The child must treat `nb-in` values as read-only.** The object handed to the child is the same
object the framework keeps as its comparison baseline. If the child edits it, the parent's unchanged
value compares unequal on the parent's next pass and is delivered again — silently reverting the
child's edit. Copy the input before modifying it.

**Every non-primitive `nb-in` value is cloned on every parent pass**, changed or not. Keep `nb-in`
payloads small plain data, and hand large or rich objects over with `nb-in-ref`.

**A value that cannot be cloned is not delivered — and that includes functions.** `nb-in` promises the
child an isolated copy; when `structuredClone` fails (a function, a DOM node, an object carrying
either) the child's property is set to **`undefined`** — overwriting its own default — and
`<name> input set error, object cannot be cloned, try to use nb-in-ref…` is logged on **every** pass
while the value stays uncloneable. A bare callback (`nb-in:on-pick="this.pick"`) takes this path too.
A class instance does *not* fail: it clones into a plain object without its prototype, so its methods
are missing and nothing is logged. Use `nb-in-ref` for all of these.

**`Set`s of objects and `Map`s with object keys re-deliver on every pass.** Deep equality compares
`Set` members and `Map` keys by identity, so such a value never equals its own clone: the input is
re-assigned and `onInputsRefreshDone` fires each pass, and in pessimistic mode every trigger burns the
full cycle cap. Pass arrays/plain objects, or use `nb-in-ref`.

**A cyclic object is reported equal.** `Helpers.equals` logs `deep equality comparison detected a
circular reference` and returns `true`, so changes are dropped. Pass a flat projection, or use
`nb-in-ref` plus a manual `detect()`.

**`nb-in:x` and `nb-in-ref:x` on the same element collide** — they share one key space; the `nb-in`
one wins and the other is rejected with `multiple handlers for one in (x) are not supported`.

**`nb-in:*` on an element with no `nb-container` and no component tag is silently ignored** — the
attributes make the element tracked, but nothing consumes them. Likewise `nb-prop:x` on a component
tag sets a property on the *host element*, not on the component context.

**`nb-in:<name>` that matches an existing method silently shadows it**, and `nb-in:__proto__` replaces
the context's prototype. Never let input names collide with methods.

## Change detection

**An expression that keeps writing a `@Detector()` property disables that detector.** A detector write
from inside a pass schedules another pass, which runs the same expression again
(`nb-exec="this.counter = this.counter + 1"`, or any value that never settles: `Date.now()`,
`Math.random()`, accumulating arrays). After roughly 20 consecutive passes the framework logs
`<prop> property value can't stabilize in 10 change detection cycles, detector is disabled.` and the
detector stops requesting detection **for the life of that context** — later writes are stored, but
only some other trigger renders them. Deep-equal-stable derived state
(`this.filtered = this.items.filter(…)`) is absorbed by the setter's equality gate and is safe in
principle, but a fast stream of external triggers (input, pointer, scroll handlers) that each
recompute a detector from inside a pass can trip the same guard. **Keep bound expressions free of
detector writes** — compute derived state in the handler that changed the source.

**Entities on hidden elements are lazy — by design.** A container/component whose own element is
hidden by nuBond is not constructed until first shown, and once built it is *kept* while hidden with
change detection off. Design consequences:

- Its constructor has not run yet: an instance that has never been shown misses service events fired
  before its first show (including the very request that reveals it). Hand such state over through an
  input, or read it from the service on construction.
- The build cost is paid when the tab/dialog/case is first opened.
- A hidden `nb-container` does not react to its name: swapping, emptying or a `%slot` route change is
  applied when it is shown again (no `onDispose`, no `onContainerDetached` until then). "Empty the
  name to reset the dialog" only works while the element is still visible — otherwise the same
  instance comes back with its old state; reset it yourself.
- Only nuBond-driven hiding counts. Content hidden by CSS, a closed `popover`/`<dialog>` or a
  collapsed third-party control is still built eagerly — put heavy content under an `nb-if` bound to
  the open state.

**Disabling detection is not a hard fence** — a pass already scheduled when the element is hidden
still runs once over the now-hidden tree. (Requests made *while* hidden are remembered and run on
reshow.)

**An app root must be attached before it is bound.** `@AppRoot` on an element that is not connected
to the document logs `Root element is not connected to DOM, application cannot be created.` and binds
nothing; appending the element later does not revive it. A root that is detached *after* binding is
disposed on its next detection request — out-of-band DOM surgery is the developer's responsibility.

**A pending debounced subscription survives disposal** — a debounced `ElementSubscriptions` callback
(or `nb-event:x:ms`) captured just before its element was disposed still runs once afterwards. Guard
callbacks that touch disposed state.

## Templates and rendering

**`nb-repeat` over a huge number hangs the page.** The clone chain runs synchronously inside one pass
with no cap. `Infinity` and `NaN` are treated as "nothing to repeat", but a large finite count
(`1e9`) still freezes the tab — clamp numeric sources.

**`nb-template` cycles are only caught when direct.** A template that references itself logs
`Invalid template '<name>': html templates cannot reference themselves.` and renders empty (the
message itself under `showDebugInfo`). A cycle through another template (`a → b → a`) still overflows
the stack at tree-build time with no diagnostic — on the app-root path that kills bootstrap. A
container that includes itself instead grows the DOM one level per macrotask, unbounded.

**Projected content binds against the *child's* context, not where it was authored.** Projection
clones the nodes into the container/component subtree before that entity's binder builds the tree, so
`nb-*` expressions inside `nb-projection` evaluate against the child. This differs from web-component
slots and from most frameworks' content projection — expect `this` to mean the child.

**Unmatched projection slots keep their own content** (useful as fallback), and duplicate *named*
projections silently let the last one win (only the duplicate-unnamed case errors).

**Container fallback content is static.** Host children without `nb-projection` are shown whenever
the container's name is empty — from the first pass when it starts empty, and restored as raw clones
when it empties later. Their `nb-*` bindings are inert, and elements among them that carry
`nb-if`/`nb-repeat`/`nb-container`/… stay hidden by the anti-flicker stylesheet. Plain markup and
`href="#/…"` links are fine (e.g. a crawlable landing page inside a route slot with no default); for
dynamic "nothing selected" UI use a sibling under `nb-if`.

**A dynamic container name that is not registered logs every pass.** `nb-container="this.view"`
resolving to an unknown name re-logs `Container with name '…' not found` on each pass of the parent.

**A component host's light DOM can flash before its first bind.** A component with `nb-in` inputs
binds in a later task, and its host carries no marker until then — so projection source children can
paint for a moment. Keep projected content light, or hide the host until it is ready.

## Expressions and constants

**The `@` prefix is a coercion grammar, not a literal.** Anything `Number()` accepts is passed through
as raw source, and the author's text is never rewritten:

| Written | Result |
|---|---|
| `@true` / `@false` | boolean |
| `@5`, `@0x10` | number (`16` for the hex) |
| `@Infinity` | number `Infinity` |
| `@NaN` | **string** `"NaN"` |
| `@null`, `@undefined` | **strings** `"null"` / `"undefined"` |
| `@{a: 1}` | **string** `"{a: 1}"` |
| `@007`, `@08` | **`SyntaxError`** — strict-mode octal / leading-zero decimal; the binding dies |

Zero-padded ids, codes and phone prefixes must not use `@`. Use a context property or `#'007'`.
Because `@5` is a *number*, it does not match a string `'5'` in `nb-case` — write `nb-case="'5'"`.

**Registering a transformer after apps are bound kills every expression in scopes already using that
name** — transformer names are appended to every compiled expression's parameter list with no dedup,
so a late registration that collides with an existing `nb-var` or repeat prefix produces a duplicate
strict-mode formal parameter → `SyntaxError`, and every binding in that subtree freezes. Register all
transformers up front.

**`nb-case` expressions can't see the case element's own `nb-var`s** — cases are evaluated by the
parent switch with the switch's scope.

## Registration timing

**Late registration is inert.** Components, aspects and templates are resolved at
**tree-construction time**, when an element is first walked. A module that registers after a tree was
built leaves existing elements permanently inert — there is no re-scan, no `MutationObserver`, no
`customElements.whenDefined`. Only newly built subtrees (repeat clones, container swaps) pick it up.
Listing an entity in a decorator's dependency args is what guarantees it registers first — **import
every entity eagerly from the app root; lazy-loading entity modules does not work.**

## Dependency injection

**Interface-, `any`-, `unknown`-, union- or generic-typed constructor parameters are not injected.**
TypeScript emits `Object` for those, and `Object` is never matched against the per-entity services:
the parameter arrives `undefined` and `Injection 'Object' cannot be resolve.` is logged (the consuming
class is the first console argument). **Always type injected parameters with a concrete class.**

**Inherited constructors resolve nothing.** The built-in `Reflect` polyfill doesn't walk the prototype
chain, so a decorated subclass that inherits its constructor from a base class finds no
`design:paramtypes` and is constructed with **zero arguments** — the base's expected injections are all
`undefined`. **Declare an explicit constructor on every decorated class** that needs injections.
Behavior differs if something else in the dependency graph loads the real `reflect-metadata`.

**`@Detector()` / `@Eventer()` are context-class-only by design** — not inherited from base classes,
and a decorated class accessor is silently shadowed (see `entities-and-di.md`).

## Runtime element API

**`element.attributes.set('class' | 'style', …)` is silently destroyed.** The generic attributes API
writes straight into the attribute model while the class/style models keep their own bookkeeping; the
next model-driven commit overwrites it. Use **`element.classes.add/remove/toggle` and
`element.styles.set/remove`**, which route through the owning handlers. The same applies to direct
DOM writes: `nb-class` assigns `className` wholesale, and `nb-style` doesn't know about direct
`element.style` writes.

**The imperative attribute API is unguarded** — `element.attributes.set('onclick', …)` is not checked
at all.

**Aspects have no dispose lifecycle** — an aspect that takes a timer or a global listener in its
constructor can never release it. Aspects are also constructed for elements that never become visible
(unlike components and containers, they are *not* lazy). Keep aspects free of external resources.

**`attributes.getAll()` includes the framework's `nb-*-ready` markers**, and unknown `nb-*` attributes
are not in the model at all.

## Styles and classes

**`nb-style` property names must be kebab-case** — they go to `setProperty` verbatim, so
`nb-style="backgroundColor: 'red'"` is a silent no-op. Write `background-color:`.

**`!important` is recognized only as a plain suffix.** `'red !important'` (any case, space optional)
is applied with priority; `'red ! important'` — whitespace inside the flag — is not, and the
declaration is dropped. An `!important` authored in the element's inline `style` attribute is not
cleared by a binding that yields the same value without it.

**Classes written in the markup are owned by the markup.** `nb-class` never removes a class that is in
the element's `class` attribute: the simple and array forms skip it silently, and a conditional key
naming one is rejected (`conditional class expression can't mutate static (<name>) class.`) and left
unbound — so `class="active" nb-class="{active: this.on}"` leaves `active` permanently on. Toggle
only classes that are *not* authored. (`element.classes.remove()` can still remove one.)

**Unknown adopted-style names are silently ignored** — a typo in `['shared-componets']` just means
missing styles, no error.

**Simple-form `nb-class` treats a multi-class result as one token** — `"foo bar"` is stored as a single
entry, so `has('foo')` is false and bookkeeping operates on the compound token. Use the array form.

## Routing

**Path-mode routing must be served at the origin root.** Without `#` the router owns the whole path:
it reads slot values from `location.pathname` and writes root-absolute URLs, so an app under `/app/`
reads `app` as its first slot and `go('users')` writes `/users`. Query parameters that are not slot
names are dropped on the first write — read `location.search` in the first-imported module if you need
them. (Hash mode keeps the document path and query.)

**The hash router's document path is a snapshot.** It is recorded when the router is constructed; if
other code later changes the query with `replaceState`, the next router write restores the original.

**The first `@AppRoot` fixes routing for good** — without a route template it registers an
unconfigured `Router`, and a later `$Route('/…')` hits "Router is already initialized". An unconfigured
router's methods throw (by design) — check `isConfigured` if routing is optional.

**A prevented navigation cannot take the URL back.** When `onBeforeStateChange` blocks a Back/Forward
or a hash link, the state stays but the address bar keeps the entry the browser already moved to.

**History bookkeeping is by content.** Two identical states in the history (`a → b → a`) are
indistinguishable, so Back/Forward onto the second can desync `goBack`/`goForward`;
`go(…, removeHistory = true)` collapses the router's own history list while the browser keeps its
entries. Prefer plain `go()` and browser navigation over long `goBack()` chains.

**A failed container-slot validation aborts mid-transaction** — other slots of the same `go()` were
already mutated, with no rollback. An `onBeforeStateChange` callback that itself calls `router.go()`
re-enters unguarded. `router.state` is the router's live object — never mutate it.

## Events

**A rejected promise from an `nb-event` handler is logged, not thrown** —
`<event> event promise error: …`, and the detection pass still runs. A `#` (one-time) handler whose
promise rejects stays subscribed — one-time means one *successful* completion — and a `#` async
handler can run several times if events arrive before the first promise settles.

**A mistyped debounce is silent.** The debounce is the last `:` segment *only if it is numeric*;
otherwise the whole thing is the event name. `nb-event:click:abc` and `nb-event:click:` subscribe to
events literally named `click:abc` and `click:` — no diagnostic at any `showDebugInfo` setting, and
the handler never fires.

**Manual `dispatch('myEvent')` can never be caught by `nb-event:myEvent`** — HTML lowercases the
attribute to `myevent`. Use lowercase or kebab-case event names in `EventDispatcher.dispatch`.
(`@Eventer` is safe: it kebab-cases names on registration.)

**A new-but-deep-equal `item` keeps the old event closure** — `nb-event:click="this.remove(item)"` can
pass an object that is `!==` every element of the current array, so `indexOf` returns −1. Compare by
id, not identity.

**A pending debounced event is dropped on re-subscription** (which happens whenever execution params
change) — so debounced handlers inside a repeat whose row objects are rebuilt every refresh never fire.

## Security

**Sanitizers cover runtime content only.** `nb-html` writes raw `innerHTML` unless an `htmlSanitizer`
is configured (globally or per context). A configured sanitizer is applied to `nb-html` values and to
templates/styles loaded by **URL or provider** — and deliberately *not* to inline templates and
styles, which are authored source code (a sanitizer tuned for hostile input would strip `nb-*`
attributes and custom elements). So never build an inline template string from untrusted data.

**`nb-attr` and `nb-prop` bypass sanitization entirely.** `javascript:` values in
`nb-attr:href`/`src`, `nb-attr:srcdoc` / `nb-prop:srcdoc` and `nb-attr:on*` all bind; the only
guard is a `showDebugInfo`-only warning for attribute names starting with `on`. **Sanitize or
validate untrusted values yourself before binding them.**

## Template/style source paths

**Only root-relative paths are treated as URLs.** A source string is fetched when it starts with `/`
and contains no newline, `{` or `<`. `@Container('https://cdn.example.com/tpl.html')`, `'./tpl.html'`
and `'templates/tpl.html'` are all classified as inline content and rendered as **literal text**, with
no diagnostic — external sources are unsupported by design; use an `ITemplateProvider` that fetches.
The rule cuts the other way too: any single-line string starting with `/` is fetched, including
`'/ some text'` and a protocol-relative `'//host/tpl.html'` (which leaves your origin).

**Fetch success-callback exceptions are swallowed** — a throwing sanitizer leaves the entity
not-ready forever with no log, and after three failed attempts the error says the container was "not
found" rather than that the fetch failed.

## Things that are *not* problems (verified clean)

Don't waste time chasing these:

- **In-place array mutation *is* picked up by `nb-repeat`** — clones read the collection live.
  `this.items.push(x)` + `detect()` renders.
- **Visibility handlers can share an element** — `nb-if` + `nb-repeat`, `nb-if` + `nb-switch`,
  `nb-repeat` + `nb-switch`. The hidden class is held per handler; the element shows only when all
  agree.
- **Work done while hidden is not lost** — a detection request made while a container/component is
  hidden runs when it is shown again.
- **`#` inputs survive a container swap** — the new context receives them again.
- **An empty `nb-container` name is stable** — one cleanup, then nothing per pass.
- **Adopted stylesheets land in declared order**, whatever order they finish loading in.
- **`nb-repeat` on a top-level element of a component template works**, and the anti-flicker
  stylesheet covers top-level elements of a component template.
- **A component's `@Eventer` reaches the host's `nb-event`** even though custom events don't bubble:
  the dispatch lands on the host element carrying the listener (target phase).
- **`ElementSubscriptions` listeners don't leak** — the framework disposes a component/aspect only
  when its element leaves the page, and the listener goes with the element.
- **Children of `nb-value`/`nb-html` elements are never tree-built**, so there is no zombie processing
  of clobbered subtrees.
- **`ElementSubscriptions.subscribe(name, cb, 250)`** correctly routes the bare number to the debounce
  slot, not to `addEventListener` options.
- **Elements hidden via `nb-case` flush staged attribute/style state when reshown.**
- **W3C mode reads prefixes dynamically and consistently**; mode flips are blocked once an app is bound.
