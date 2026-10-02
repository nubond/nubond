# Known limitations and behavioral traps

Confirmed behavior of the **`nubond` 1.0.8** release, each verified against its source and most
reproduced by execution. Some are open bugs, some are deliberate design positions — either way they
change how you must design a non-trivial app. Later releases may lift some of them; if the project
depends on a newer `nubond`, re-check before working around something that may be fixed.

When something behaves inexplicably, check this list before debugging your own code.

## Environment baseline

The framework targets **modern browsers only** — an explicit design decision:

- `Float16Array` is referenced unguarded in `Helpers.equals` / `isTypedArray` — engines without it
  (pre-Chrome 135, pre-Firefox 129, pre-Safari 18, Node < 22.3) throw `ReferenceError` on **every
  deep-equality comparison of an object**, which is the core of input delivery and `@Detector`.
- Mutable `adoptedStyleSheets` is required (Chrome 99+, Safari 16.4+).
- The FOUC guard stylesheet uses native CSS Nesting (Chrome 112+, Safari 16.5+, Firefox 117+); on
  older engines the anti-flicker guard silently does not exist.
- The package is compiled for `ESNext` with no downleveling and no polyfill story.
- **No SSR, no bare-Node import.** Importing the package runs DOM initializers immediately. For unit
  tests, keep framework-free logic in modules that never import `nubond`, and test entities under
  jsdom (which has no `structuredClone` — polyfill it, or every object `nb-in` fails to clone).

## Configuration timing

**Component-facing global config passed to `@AppRoot` is too late.** `@Component` resolves the global
`shadowRootConfig` when its decorator runs, and inline templates/styles of every entity are sanitized
at that same moment. Entity modules are imported (and decorated) before the `App` class at the bottom
of `index.ts` is, so `@AppRoot({ shadowRootConfig, htmlSanitizer, styleSanitizer })` reaches none of
them. **Call `$Config({...})` in a module that `index.ts` imports first.** (`showDebugInfo`,
`complyWithW3C` and the CD strategy are read later and work from `@AppRoot`.)

**Config objects that fail the shape check are dropped silently** — an unknown key or a wrongly typed
value (`{ showDebugInfo: 'true' }`) and the app runs unconfigured.

## Data flow — the most consequential group

**In-place mutation of an `nb-in` value is *never* delivered.** The input cache stores the same
object reference the parent expression returned, so every later cycle compares that object against
itself and short-circuits as unchanged. With `nb-in` (clone mode) the child keeps a snapshot of the
*first* state and diverges permanently and silently. With `nb-in-ref` the child shares the object, so
its data is right — but no input update fires, so its DOM stays stale until something else triggers
its pass. **The only way to push an input is to assign a new, deep-unequal object.**

```typescript
this.cfg.x = 2;                     // ❌ child never sees it
this.cfg = { ...this.cfg, x: 2 };   // ✅
```

**A `structuredClone` failure drops the input.** The value is cached before the clone is attempted,
so after the single `input set error … try to use nb-in-ref` log the same object is never retried —
the child keeps its own value. Anything carrying a function, DOM node, or non-cloneable class state
must use `nb-in-ref` from the start. (Cloning also drops prototypes: a class instance arrives as a
plain object without its methods.)

**`nb-in:x` and `nb-in-ref:x` on the same element collide** — they share one key space; the `nb-in`
one wins and the other is rejected with `multiple handlers for one in (x) are not supported`.

**`nb-in:*` on an element with no `nb-container` and no component tag is silently ignored** — the
attributes make the element tracked, but nothing consumes them. Likewise `nb-prop:x` on a component
tag sets a property on the *host element*, not on the component context.

**Single-bind (`#`) inputs are lost on container swap.** The one-time cache lives on the *handler*, not
the context, so when `nb-container` switches to another container the new context never receives any
`#`-bound input. Components are unaffected in practice (their tag never changes).

**`nb-in:<name>` that matches an existing method silently shadows it**, and `nb-in:__proto__` replaces
the context's prototype. Never let input names collide with methods.

**Freshly minted Invalid Dates re-deliver every cycle.** `equals` compares Dates by `getTime()`, and
`NaN === NaN` is false — so `nb-in:cfg="{ d: new Date(this.badTs) }"` stages a change on every pass.
A stable Invalid-Date *instance* is fine (identity short-circuits).

## Change detection

**An expression that writes a `@Detector()` property loops forever, silently.** A detector write from
inside a pass schedules another pass, which runs the same expression again. The 10-cycle cap does not
apply — it only bounds pessimistic re-runs *within* one pass. `nb-exec="this.counter = this.counter + 1"`
runs pass after pass with zero external triggers, and in the default optimistic mode there is **no
diagnostic at all** — it profiles as "the framework is slow". Any assignment whose value is never
deep-equal-stable does this: counters, `Date.now()`, `Math.random()`, accumulating arrays, fresh
Invalid Dates. Deep-equal-stable derived state (`this.filtered = this.items.filter(…)`) is absorbed by
the setter's equality gate and is safe — but keep expressions free of detector writes anyway.

**Updates made while hidden are lost on reshow.** While a container/component sits in a false
`nb-if`/`nb-case`, its binder drops every detection request (no queue, no pending flag), and when it
becomes visible again detection is re-enabled *without* a pass. The old DOM is shown until some
unrelated future trigger. If a hidden branch keeps working (timers, promises, service callbacks), call
`detect()` when it becomes visible.

**Disabling detection is not a hard fence** — a pass already scheduled still runs over the now-hidden
tree.

**An app root bound to a detached element self-destructs.** Preparing an app offscreen
(`createElement` → bind → … → `appendChild`) works for the first render, but *any* detection trigger
before attachment disposes the binder — silently. Attach the element before triggering anything.

**A pending debounced subscription survives disposal** — a debounced `ElementSubscriptions` callback
(or `nb-event:x:ms`) captured just before its element was disposed still runs once afterwards. Guard
callbacks that touch disposed state.

## Templates and rendering

**Two visibility handlers on one element desync.** `nb-if`, `nb-repeat`, `nb-switch`, `nb-case` and
`nb-default` all toggle the *same* hidden class with no refcounting, and validation only blocks the
case/default/repeat and case/default/if combinations. So `nb-if` + `nb-repeat`, `nb-if` + `nb-switch`
and `nb-repeat` + `nb-switch` compile, but e.g. `if→false` hides, an emptied repeat's hide is a no-op,
then `if→true` **shows the element although the repeat is empty** — and since its internal visibility
is still false its children aren't updated, so it displays stale content. **Never combine them; put
the second condition on a child or wrapper element.**

**An empty first value leaves the placeholder visible.** `nb-value`/`nb-html` remember the last
written value starting from `''`, so a first bound value that stringifies to `''` is treated as
already written and the element's original children stay. Since `stringify` returns `''` for
`undefined`, `null`, functions, symbols and un-JSON-able objects, `<span nb-value="this.x">Loading…</span>`
shows `Loading…` as though it were data. **Don't put placeholder content inside `nb-value`/`nb-html`
elements.**

**`nb-repeat` over `Infinity` or a huge number hangs the page.** The clone chain runs synchronously
inside one pass with no cap. `nb-repeat="this.total / this.size"` with `size = 0` freezes the tab.

**An invalid `nb-repeat:` prefix breaks the whole subtree.** The prefix is not validated as an
identifier: `nb-repeat:my-list` defines `my-listItem`, which cannot be a function parameter, so every
expression under the repeat fails to compile. Use one lowercase word.

**A `#`-bound `nb-repeat` nested inside another repeat or `nb-var` scope propagates stale outer
values** — on the skip path it hands its subtree the execution params captured when it last
evaluated. Don't put `#` on a nested `nb-repeat`.

**Self-referencing `nb-template` overflows the stack at tree-build time** — inline templates resolve
synchronously with no cycle guard. On the app-root path this throws out of `@AppRoot` and kills
bootstrap. A container that includes itself instead grows the DOM one level per macrotask, unbounded.

**Projected content binds against the *child's* context, not where it was authored.** Projection
clones the nodes into the container/component subtree before that entity's binder builds the tree, so
`nb-*` expressions inside `nb-projection` evaluate against the child. This differs from web-component
slots and from most frameworks' content projection — expect `this` to mean the child.

**Unmatched projection slots keep their own content** (useful as fallback), and duplicate *named*
projections silently let the last one win (only the duplicate-unnamed case errors).

**Container fallback content is never tree-built** — restored fallback nodes are raw clones whose
`nb-*` bindings are inert, and the processing-hide CSS keeps such elements permanently hidden.

**An empty container name churns every cycle.** `nb-container="this.view"` with `view` empty — the
normal "nothing selected" state — re-clones fallback content on every pass (destroying focus,
selection, scroll and element identity inside it), and in pessimistic mode spins the full 10-cycle cap
and logs `tree can't stabilize` on every trigger. Route-slot (`%slot`) containers escape this. Prefer
`nb-if` around the container over an empty name.

**The FOUC guard doesn't cover top-level component-template elements** — the nested `* { … }` selector
needs an element ancestor in the same tree, which a direct ShadowRoot child doesn't have. A component
with inputs binds in a later task, so top-level `nb-if`/`nb-repeat`/`nb-container`/`nb-switch`
elements in its template can flash unbound. Wrap them in a plain element.

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

**A compile error logs a second, bogus "execution error"** — one bad expression produces two messages;
the second is noise.

**Registering a transformer after apps are bound kills every expression in scopes already using that
name** — transformer names are appended to every compiled expression's parameter list with no dedup,
so a late registration that collides with an existing `nb-var` or repeat prefix produces a duplicate
strict-mode formal parameter → `SyntaxError`, and every binding in that subtree freezes. Register all
transformers up front.

**`nb-bound="@constant"` can never compile** — the handler prepends `#`, yielding `#@…`.

**`nb-case` expressions can't see the case element's own `nb-var`s** — cases are evaluated by the
parent switch with the switch's scope.

## Registration timing

**Late registration is inert.** Components, aspects and templates are resolved at
**tree-construction time**, when an element is first walked. A module that registers after a tree was
built leaves existing elements permanently inert — there is no re-scan, no `MutationObserver`, no
`customElements.whenDefined`. Only newly built subtrees (repeat clones, container swaps) pick it up.
**Import every entity eagerly from the app root; lazy-loading entity modules does not work.**

## Dependency injection

**Interface-typed or `any`-typed constructor parameters silently receive the wrong object.**
TypeScript emits `Object` for interfaces, unions and `any`; `Object` is never registered, so resolution
falls through to "first context injection that is `instanceof` it" — and everything is `instanceof
Object`. A container declaring `constructor(private cfg: IMyConfig)` silently gets a `ChangeDetector`;
a component gets its host **DOM element**. No error, no `undefined`. **Always inject concrete classes.**

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
constructor can never release it. Aspects are also constructed for elements that never become visible.
Keep aspects free of external resources.

**`attributes.getAll()` includes the framework's `nb-*-ready` markers**, and unknown `nb-*` attributes
are not in the model at all.

## Styles

**`nb-style` property names must be kebab-case** — they go to `setProperty` verbatim, so
`nb-style="backgroundColor: 'red'"` is a silent no-op. Write `background-color:`.

**`!important` in an `nb-style` value is silently ignored** — `setProperty` rejects a value containing
it, and no priority argument is passed. Put `!important` rules in a stylesheet instead.

**Async adopted-stylesheet order is nondeterministic** — sheets are appended from their own
fetch-completion callbacks, and `adoptedStyleSheets` order *is* cascade order, so which of two
competing rules wins can vary between page loads. Avoid relying on cross-sheet precedence for
URL-based styles.

**Unknown adopted-style names are silently ignored** — a typo in `['shared-componets']` just means
missing styles, no error.

**Simple-form `nb-class` treats a multi-class result as one token** — `"foo bar"` is stored as a single
entry, so `has('foo')` is false and hide/show bookkeeping operates on the compound token.

**`nb-class` array form can lose a shared class** — with `[this.a; this.b]` both yielding `'x'`, a
change in `b` removes `'x'` even though `a` still yields it. Self-heals next pass in pessimistic mode;
in optimistic mode it can stay missing until the next trigger.

## Routing

**Hash routing rewrites the URL to the origin root.** History URLs are built root-absolute with no
notion of a base path. With the document at `/app/page.html`, merely constructing the router rewrites
`location.pathname` to `/`, and `go('home')` produces `/#/home` at path `/` — a reload or shared link
then fetches the wrong document. **Any app not served at the origin root is affected**, path mode
included. The same rewrite **drops the query string** at bootstrap — capture `location.search` in the
first-imported module if you need it.

**Real hash navigation is ignored** — `<a href="#/settings">` links and manual address-bar hash edits
reset state to defaults instead of routing. Navigate through `router.go(...)` only.

**The first `@AppRoot` fixes routing for good** — without a route template it registers an
unconfigured `Router`, and a later `$Route('/…')` hits "Router is already initialized". An unconfigured
router's methods throw (by design) — check `isConfigured` if routing is optional.

**A prevented `popstate` leaves the address bar on the popped-to entry**, and duplicate identical
history states desync `goBack`/`goForward`.

**A failed container-slot validation aborts mid-transaction** — other slots of the same `go()` were
already mutated, with no rollback. An `onBeforeStateChange` callback that itself calls `router.go()`
re-enters unguarded.

## Events

**Rejected promises from `nb-event` handlers become unhandled rejections** — there is no rejection
handler. A rejected `#` handler never unsubscribes, and a `#` async handler can execute several times
if events arrive before the promise resolves. Catch inside your handler.

**Manual `dispatch('myEvent')` can never be caught by `nb-event:myEvent`** — HTML lowercases the
attribute to `myevent`. Use lowercase or kebab-case event names in `EventDispatcher.dispatch`.
(`@Eventer` is safe: it kebab-cases names on registration.)

**Event names containing `:` cannot be subscribed** — everything after the first `:` is parsed as a
debounce value.

**`@Eventer` auto-trigger can dispatch the stale initial value last** — with `nb-in` into an
`@Eventer` property, the subscriber receives `['fromParent', 'init']`, newest first. Don't combine
`nb-in` and `@Eventer` on one property.

**A new-but-deep-equal `item` keeps the old event closure** — `nb-event:click="this.remove(item)"` can
pass an object that is `!==` every element of the current array, so `indexOf` returns −1. Compare by
id, not identity.

**A pending debounced event is dropped on re-subscription** (which happens whenever execution params
change) — so debounced handlers inside a repeat whose row objects are rebuilt every refresh never fire.

## Security

**`nb-html` is not sanitized by default, and the global sanitizer is only partly effective.** A
configured `htmlSanitizer` is applied to `nb-html` values. But inline templates are sanitized at
*decorator-import* time, before `@AppRoot`'s config — so inline container/component/`$Template`
content is stored unsanitized unless the sanitizer was set via a first-imported `$Config`, while
URL/provider templates are sanitized. **Sanitize your own untrusted values before binding them.**

**`nb-attr` permits `on*` handlers and URL attributes** — `nb-attr:onclick="this.userValue"` is direct
script injection, as are `javascript:` values in `nb-attr:href`/`src` and `nb-attr:srcdoc`. All
attribute and property bindings bypass any configured sanitizer.

## Template/style source paths

**Only root-relative paths are treated as URLs.** A source string must start with `/` and contain no
space, `{` or `<` to be fetched. `@Container('https://cdn.example.com/tpl.html')`, `'./tpl.html'` and
`'templates/tpl.html'` are all classified as inline content and rendered as **literal text**, with no
diagnostic. Use a leading `/`, or an `ITemplateProvider` that fetches.

**Fetch success-callback exceptions are swallowed** — a throwing sanitizer leaves the entity
not-ready forever with no log, and after three failed attempts the error says the container was "not
found" rather than that the fetch failed.

## Things that are *not* problems (verified clean)

Don't waste time chasing these:

- **In-place array mutation *is* picked up by `nb-repeat`** — clones read the collection live.
  `this.items.push(x)` + `detect()` renders. (This is the opposite of `nb-in`, which caches.)
- **`nb-repeat` on a top-level element of a component template works** (fixed in 1.0.8).
- **A component's `@Eventer` reaches the host's `nb-event`** even though custom events don't bubble:
  the dispatch lands on the host element carrying the listener (target phase).
- **`ElementSubscriptions` listeners don't leak** — the framework disposes a component/aspect only
  when its element leaves the page, and the listener goes with the element.
- **Children of `nb-value`/`nb-html` elements are never tree-built**, so there is no zombie processing
  of clobbered subtrees.
- **`ElementSubscriptions.subscribe(name, cb, 250)`** correctly routes the bare number to the debounce
  slot, not to `addEventListener` options.
- **Elements hidden via `nb-case` flush staged attribute/style state when reshown** — eventual
  consistency holds there (the hidden-update loss above is about *dropped detection requests*).
- **W3C mode reads prefixes dynamically and consistently**; mode flips are blocked once an app is bound.
