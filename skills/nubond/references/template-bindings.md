# Template bindings reference

All attributes use the `nb-` prefix. In W3C compliance mode (`complyWithW3C: true`) the prefix becomes
`data-nb-` and the meta separator `:` becomes `--` (`nb-event:click` → `data-nb-event--click`).

## Attribute-name casing (read this first)

The HTML parser **ASCII-lowercases every attribute name**. nuBond reads names off the parsed DOM, so
whatever you type in camelCase arrives lowercased. Every handler that takes a name therefore expects
**kebab-case** and converts it to camelCase itself:

| Written | Reaches nuBond | Resolves to |
|---|---|---|
| `nb-in:meta-data` | `nb-in:meta-data` | property `metaData` ✅ |
| `nb-in:metaData` | `nb-in:metadata` | property `metadata` ❌ |
| `nb-var:date-time` | `nb-var:date-time` | variable `dateTime` ✅ |
| `nb-prop:read-only` | `nb-prop:read-only` | property `readOnly` ✅ |

This applies to `nb-in:`, `nb-in-ref:`, `nb-prop:`, `nb-var:`. It does **not** apply to
`nb-attr:` (HTML attributes are lowercase anyway), `nb-event:` (DOM event names are lowercase), or
`nb-aspect:` (aspect names are already kebab-cased class names). `nb-repeat:` prefixes are used
verbatim with no conversion — `nb-repeat:userRole` defines `userroleItem`, and every expression
naming `userRoleItem` silently reads `undefined`. Keep prefixes one lowercase word.

Values are unaffected: expressions inside the attribute keep their case, so `nb-in:meta-data="this.metaData"`
is correct on both sides.

## Expression prefixes

| Prefix | Name | Behavior |
|---|---|---|
| *(none)* | continuous | Re-evaluated on every change-detection cycle. |
| `#` | single / one-time | Re-evaluated each cycle **until the first non-`undefined` result**, then frozen. An expression that starts out `undefined` (data still loading) keeps evaluating until it produces a value. |
| `@` | constant | A coercion grammar, not a literal — see below. |
| `%` | route slot | `nb-container` only — binds the container to a named route slot. |

### `@` is a coercion grammar

The remainder is inspected: `true`/`false` become booleans, anything `Number()` accepts is emitted as
**raw source**, and everything else is emitted as an escaped double-quoted string.

| Written | Result |
|---|---|
| `@active` | string `"active"` |
| `@true` / `@false` | boolean |
| `@5` / `@0x10` | number (`5` / `16`) |
| `@Infinity` | number `Infinity` |
| `@NaN` | string `"NaN"` |
| `@null` / `@undefined` | strings `"null"` / `"undefined"` |
| `@{min: 0}` | string `"{min: 0}"` — `@` cannot express objects; use `#{min: 0}` |
| `@007`, `@08` | **`SyntaxError`** — strict-mode octal / leading-zero decimal; the binding dies |

Never use `@` for zero-padded identifiers, codes or phone prefixes (use `#'007'`). Backslashes and
control characters in string constants are escaped correctly.

### `#` has two ways to freeze the wrong value

`#` stops evaluating at the first non-`undefined` result, so:

- **In a repeat, it freezes per row *position*.** Each row keeps its own one-time cache and rows are
  reused by index, so a `#` binding in a list whose item at a given index can change keeps the first
  value it ever saw. Only use `#` inside repeats over lists that are immutable or rebuilt to the same
  shape.
- **A wrapper can turn "not yet" into a real value.** An empty `nb-repeat` still evaluates its
  element's expressions with `item` undefined. `{{ #item?.unit }}` answers `undefined` and waits;
  `{{ #unitLabel(item?.unit) }}` answers `''` if the transformer maps `undefined` to `''`, freezing the
  row empty forever. A transformer used under `#` must return `undefined` wherever its input is.

```html
<p nb-value="this.dynamic"></p>     <!-- every cycle -->
<p nb-value="#this.initial"></p>    <!-- frozen after first real value -->
<p nb-value="@Hello"></p>           <!-- literal string "Hello" -->
<div nb-container="%page"></div>    <!-- route slot -->
```

## Expression semantics

Expressions are compiled with `new Function(...paramNames, 'return (<expr>);')` and invoked with the
context as `this`. Compiled functions are cached per expression + param-name set.

- Full JS expression grammar: template literals, ternaries, optional chaining, method calls, `??`.
- `this` is the entity instance. Loop vars, event params, `nb-var` names and transformer functions are
  injected as function parameters.
- **Multiple statements: use the comma operator `,`.** If compilation as `return (expr)` fails, nuBond
  retries as a multi-statement body — which *always returns `undefined`*. A `;` inside an expression
  silently produces that. With `showDebugInfo: true` a warning is logged.
  ```html
  <a nb-event:click="router.go('home'), document.scrollingElement.scroll(0, 0)">Home</a>
  ```
- With `showDebugInfo: true`, compile/execution errors **throw** (out of the binding pass, where nuBond
  logs them as `bind error`); otherwise they are logged as `expression "…" compilation error` /
  `execution error` and the expression yields `undefined`. Either way nothing propagates to your
  code, and nothing type-checks expressions at build time.

## Value & HTML

| Attribute | Description |
|---|---|
| `nb-value` | Binds the result to `textContent`. |
| `nb-html` | Binds the result to `innerHTML`. **Sanitization is opt-in** — by default the value is written raw (XSS sink for untrusted content). Register an `htmlSanitizer` in the global config or a context config; it is applied to every `nb-html` write. |

Both replace the element's children. With `showDebugInfo: true` a warning is logged if the element had
meaningful original children.

> **Caveat:** the "previously written" sentinel starts as `''`, so a **first** value that stringifies to
> `''` is considered already-written and the DOM write is skipped — the element's original children stay
> visible. `<span nb-value="this.name">Loading…</span>` with `name` still `undefined` renders
> `Loading…` as if it were data. Leave these elements empty.

Both run the result through `Helpers.stringify`:

| Value | Rendered |
|---|---|
| `string` | as-is |
| `number` / `boolean` / `bigint` | `` `${value}` `` |
| `null`, `undefined`, symbol, function | `''` (empty — **not** `"null"`) |
| object / array | `JSON.stringify(value)` |

So `nb-value="this.missing"` renders nothing rather than `undefined`. Use `?? 'fallback'` when you
want a placeholder.

### Mustache interpolation — the preferred form

**Bind text with `{{ expr }}`; treat `nb-value` as the fallback.** The `@nubond/posthtml-value-interpolation`
Parcel/PostHTML plugin rewrites `{{ expr }}` in **text nodes** into `<span nb-value="expr"></span>` at
build time, so the two are the same at runtime — but interpolation keeps text in the markup where it
reads naturally, and it is the only form that can mix literal and bound text in one element:

```html
<span>Page {{ this.page }} of {{ this.total }}</span>   <!-- impossible with nb-value -->
<li nb-repeat="this.items">{{ index + 1 }}. {{ item.title }}</li>
```

Keep `nb-value` for the cases where a child `<span>` is wrong — `<option>`, `<title>`, `<textarea>`,
and custom elements that treat their children as content or click targets (`fluent-option`). Never
put `nb-value` on a component tag: value and component are both *content* handlers and conflict.

- Attributes are never touched: `<div class="{{ x }}">` stays literal.
- `<script>` and `<style>` content is skipped.
- HTML comments are skipped.
- Braces are counted, so balanced object literals work: `{{ this.f({a: 1}) }}`. Unbalanced braces
  leave the text untouched and log `[posthtml-value-interpolation] … contains invalid interpolation`
  at build time.
- **Double quotes inside `{{ }}` are rewritten to single quotes** (the expression lands in a
  double-quoted attribute), so a string literal containing an apostrophe breaks — use a context
  property or `nb-value` for such text.
- The full expression grammar works, including `#` and `@` prefixes: `{{#this.title}}`.

## Classes & styles

`nb-class` supports three forms; entries in array/object form are separated by `;`.

```html
<p nb-class="this.className"></p>                                  <!-- simple string -->
<p nb-class="[this.classA; this.classB]"></p>                      <!-- array -->
<p nb-class="{active: this.isOpen; text-muted: this.isMuted}"></p> <!-- conditional object -->
```

In the **simple** and **array** forms the expression result is stringified and applied as a class name,
and the handler remembers what it applied last — when the value changes, the previous class is removed
and the new one added. The **conditional** form adds/removes each key by the truthiness of its value.

The conditional form is **not a JS object literal**:
- **Keys are taken literally, quotes included** — `{'text-muted': x}` toggles a class named
  `'text-muted'` *with the quotes*. Write hyphenated keys bare: `{text-muted: x}`.
- **Entries are separated by `;`** — `{a: x, b: y}` is a syntax error on every pass, and since the
  whole binding fails, *neither* class is applied.

Static `class="..."` markup is read at bind time and preserved; nuBond merges its own classes into that
list. SVG elements are handled via `getAttribute`/`setAttribute('class')`. On commit the handler
assigns `className` **wholesale** from its own list, so a class added to a bound element by hand
(`classList.add`) is wiped by the next commit — use `element.classes.add()` from an injected
`ElementManipulations`, or mark the element with a `data-*` attribute instead.

```html
<p nb-style="opacity: this.fade; color: this.theme.text"></p>
```

`nb-style` values are stringified. Setting a property to `undefined`, `null`, **or an empty string**
removes it — which is why `element.styles.set('color', null)` resets a style.

**Property names must be kebab-case** — they are passed to `setProperty` verbatim, so
`nb-style="backgroundColor: 'red'"` is a silent no-op. Write `background-color:`. `!important` in a
value is also silently ignored (no priority argument is passed).

A literal `;` inside an entry is escaped as `\;` — e.g. `nb-style="background: url('a\;b.png')"`.
Each entry carries its own prefix: `nb-class="[this.a; #this.b]"` is legal.

`nb-style` keeps a cache of what it last wrote. If code writes `element.style` directly (e.g. during a
drag, to stay out of change detection), the binding does not know — when the drag ends without
changing the model value, nothing is re-committed and the hand-written value stays. Write the model
value back yourself in that case.

## Attributes & properties

| Attribute | Description |
|---|---|
| `nb-attr:name` | Sets an HTML attribute. `undefined` or `null` **removes** it. Every other value is run through `Helpers.stringify`. |
| `nb-prop:name` | Sets a DOM property **raw** — no stringification. Kebab → camel: `nb-prop:read-only` → `readOnly`. Staged only when the expression's value changes (`!==` the last staged value), then committed only when not deep-equal to the live property value. |

**`nb-prop` is one-way and fires on change only.** A control that holds its own state (a checkbox the
user ticked, a toggle button that flips itself on click, a reused dialog row) drifts from the model
whenever the model *rejects* or *ignores* the edit — the expression value didn't change, so nothing is
re-assigned. Two-way sync is the app's job: pair `nb-prop` with an `nb-event` that writes back, and
force a new value (or re-render) when the model refuses a change.

**`attr` stringifies, `prop` passes the value through.** This matters for booleans: `nb-attr:disabled="false"`
writes `disabled="false"`, and an HTML boolean attribute is "on" whenever it is *present*. The correct
idiom for boolean attributes is:

```html
<input nb-attr:disabled="this.locked ? '' : null" />   <!-- '' = present, null = removed -->
<input nb-prop:disabled="this.locked" />               <!-- or drive the property directly -->
```

Multiple of each per element are allowed. Two bindings resolving to the same name (including
kebab/camel spellings of one property) keep the **first** and log
`multiple handlers for one attribute/property (…) are not supported`.

**Guard rails** (rejected with an error pointing at the dedicated handler): `nb-attr:class`,
`nb-attr:style`, `nb-attr:` targeting a framework `nb-*` attribute, `nb-prop:className`,
`nb-prop:classList`, `nb-prop:style`, `nb-prop:textContent`, `nb-prop:innerText`,
`nb-prop:innerHTML`, `nb-prop:outerHTML`. Event-handler attributes are **not** guarded:
`nb-attr:onclick` binds silently — use `nb-event:` instead.

**A component's inputs are not properties of its host element.** Feed a component with
`nb-in:value`, not `nb-prop:value` — the latter sets a property on the custom element, which the
component context never sees.

## Conditional rendering

| Attribute | Description |
|---|---|
| `nb-if` | Shows/hides based on a boolean expression. |
| `nb-switch` | Evaluates an expression; matching `nb-case` children are shown. |
| `nb-case` | Matched against the parent `nb-switch` value. Must be a **direct child** of the switch element. |
| `nb-default` | Fallback when no case matches. One per switch, direct child, takes no value. |

```html
<div nb-switch="this.status">
    <span nb-case="@active">Active</span>
    <span nb-case="@inactive">Inactive</span>
    <span nb-default>Unknown</span>
</div>
```

**Hidden ≠ removed.** `nb-if`/`nb-switch` toggle the `nb-hidden` class (`display: none !important`);
the element stays in the DOM. Child containers/components hidden this way have their change detection
**disabled** while hidden and re-enabled when shown, and their `nb-in` inputs are **not refreshed**
while hidden.

**Hidden is cheap.** A hidden element still runs its own handlers (something has to decide to show
it again), but its **children are not evaluated at all** — and are not even tree-built until the first
time it is shown. An `nb-case` the switch did not pick runs only a reduced sequence (its container /
component bookkeeping). So "render every variant and switch between them" costs about one expression
per hidden branch, and each branch keeps its own DOM and state between visits. The flip side:
`nb-switch` really does render every case it has shown, so a component placed in several cases (or in
a repeat of switches) exists as **several live instances** — `querySelector` can find a hidden copy,
and service subscriptions fire on every copy. Take the visible one, and have off-screen instances
skip expensive work.

`nb-if` coerces with `!!`, so any truthy value shows the element.

Third-party components that count or index their children (menus, tab lists, listboxes) still see
hidden elements. Where that matters, drive membership with a filtered array in TypeScript instead.

### Switch matching is stringified string equality

Both the switch value and each case value go through `Helpers.stringify`, then are compared with
`===`. That is why constant cases work naturally across types:

```html
<div nb-switch="this.index">    <span nb-case="@0">…</span>      <!-- "0" === "0" -->
<div nb-switch="item.isDraft">  <span nb-case="@true">…</span>   <!-- "true" === "true" -->
<div nb-switch="this.status">   <span nb-case="@active">…</span> <!-- "active" === "active" -->
```

Objects compare by their `JSON.stringify` output — avoid switching on objects.

**A switch with no matching case and no `nb-default` hides the switch element itself.** Add an
`nb-default` if the container must stay visible.

### Switch as if/else

Because matching is stringified, switching on a boolean is the idiomatic two-branch construct — and
**`!!` matters**, since `undefined` stringifies to `''` and would match neither branch:

```html
<div nb-switch="!!this.selectionData?.selectionStarted">
    <div nb-case="@true">…selection UI…</div>
    <date-and-time nb-case="@false" nb-in-ref:date-time="dateTime"></date-and-time>
</div>
```

Switches nest freely, including a switch inside a case.

## Iteration

`nb-repeat` clones the element per item. `nb-repeat:prefix` names the loop for nesting.

Supported sources and what `item` is:

| Source | `item` | `count` |
|---|---|---|
| Array / typed array / string | the element | `.length` |
| `Set` | the element | `.size` |
| `Map` | `[key, value]` pair | `.size` |
| Object | the property **value** (iterates enumerable names) | number of props |
| Number `N` | `index + 1` (1-based), repeats `⌊N⌋` times | `⌊N⌋` |
| `null` / `undefined` / number `< 1` | `undefined` (element hidden) | `-1` |

`index` is always 0-based. Iterating a plain object logs a low-performance warning when
`showDebugInfo` is on.

> **Guard numeric sources.** `Infinity` (e.g. `total / size` with `size = 0`) or a huge number makes
> the clone loop run synchronously without end and freezes the tab. Clamp before repeating a number.

> **An empty repeat still evaluates its element.** With nothing to show, the original element is
> hidden, but its *own* bindings (`nb-attr`, `nb-class`, `nb-event` subscriptions, …) still run once
> per pass with `item` undefined. Every expression on a repeated element must tolerate that:
> `item?.label`, not `item.label`, or the console fills with execution errors.

```html
<li nb-repeat="this.items" nb-value="`${index + 1}/${count}: ${item.title}`"></li>

<div nb-repeat:outer="this.groups">
    <span nb-repeat="this.items" nb-value="`${outerIndex}:${index} = ${item}`"></span>
</div>
```

A prefix whose generated names (`outerItem`, `outerIndex`, `outerCount`) collide with a registered
transformer is rejected with an error. The prefix is used **verbatim** (already lowercased by the HTML
parser) with a PascalCased suffix and gets no kebab→camel conversion or identifier validation:
`nb-repeat:outer-list` yields the parameter `outer-listItem`, which is not a valid identifier and
breaks **every expression in that subtree**. Keep it a single lowercase word (`nb-repeat:outer`).

### How repeat actually works — index-positional, not keyed

The repeated element is a clone chain. The authored element is clone #0 and keeps a pristine copy of
its original markup; each clone holds `repeatIndex = previous + 1` and reads the collection from
clone #0. Per pass, clone *N* shows item *N*, and asks for one more clone while `count > N + 1`.
Clones beyond the collection length remove themselves from the DOM and dispose.

Consequences that matter at scale:

- **There is no keyed diff.** DOM node *N* is always bound to item *N*. Reordering or inserting at the
  front re-binds every row rather than moving nodes, and any state living in the DOM — focus, scroll
  position, uncommitted input value, a child component's internal state or `ElementInternals` states —
  **stays with the position, not with the item**.
- **Clone #0 is never removed**; when the collection is empty it is hidden with the hide class.
- **Don't put `nb-bound` on a repeated element** (or inside its row) unless the list never changes:
  it fires once per row element, ever — for clone #0 possibly while the collection is still empty
  (`item` undefined) — and is never re-run as rows are reused for other items. Anything a row needs
  must come through a continuously evaluated binding.
- **Rebuilt row objects re-subscribe events.** Each row's `nb-event` subscriptions are torn down and
  re-created whenever its execution params (`item`, …) stop being deep-equal — and the teardown
  cancels a pending *debounced* event. A list whose row objects are rebuilt on every refresh therefore
  never delivers a debounced handler like `nb-event:input:300`. Keep row objects stable between
  refreshes, or don't debounce inside such lists.
- Growth cascades inside a single pass — newly created clones are visited before the pass ends.
- Repeating a plain object is slow (and warns under `showDebugInfo`); prefer arrays.
- The repeated item is deep-compared every pass; keep row objects small plain data, and assign a new
  array when the view changes rather than filtering inside the template.

For large or frequently reordered collections, do the filtering/slicing/sorting in TypeScript and hand
the template a ready array. Don't filter with `nb-if` on the repeated element itself — two visibility
handlers on one element desync; put the `nb-if` on a child of the row if you must.

## Events

| Attribute | Description |
|---|---|
| `nb-event:name` | Subscribes to a DOM event. |
| `nb-event:name:ms` | Same, with a debounce in milliseconds. |

Injected params: `nativeElement`, `element` (`ElementManipulations`), `event`, `data` (`event.detail`
for `CustomEvent`, else `undefined`), `unSubscribe`, and `router` when routing is configured.

```html
<button nb-event:click="this.onClick(event)">Click</button>
<input nb-event:input:300="this.search(event)" />
<button nb-event:click="this.count++, unSubscribe()">Once (manual)</button>
<button nb-event:click="#this.count++">Once (auto — `#` unsubscribes after first fire)</button>
<button nb-event:mouseover="element.styles.set('color', '#D9269D')"
        nb-event:mouseout="element.styles.set('color', null)">Hover</button>
```

**Every `nb-event` dispatch triggers a change-detection pass** of the owning binder once the handler
returns — which is why high-frequency events (`pointermove`, `dragover`, `scroll`, `wheel`) should not
be bound with `nb-event`; use `ElementSubscriptions` or a delegated listener and request detection
yourself when something meaningful changed. If the expression evaluates to a `Promise`, the pass is
deferred until it settles (and only then) — so `return this.load().then(...)` updates the UI without a
manual `detect()`. A `#`-prefixed handler unsubscribes only after its promise **fulfils**.

> **Catch inside async handlers.** A rejected promise returned from an `nb-event` expression is not
> handled by nuBond — it surfaces as a global `unhandledrejection`, and a `#` handler whose promise
> rejects stays subscribed.

The debounce suffix is everything after the **first** `:` in the event segment, parsed with
`parseInt`; a non-numeric suffix logs `'<name>' event has wrong debounce data` (under
`showDebugInfo` only) and the event is subscribed without debouncing. Consequently **an event name
cannot itself contain `:`** — `nb-event:plugin:ready` subscribes to `plugin`. Re-dispatch such events
under a colon-free name.

Subscriptions are re-created whenever the surrounding execution params change (e.g. loop variables in
an `nb-repeat`), so a handler always closes over the current `item`/`index` — but see the repeat note
above about debounced handlers being cancelled by that re-subscription.

## Variables

`nb-var:name` defines a local available to the element's own expressions **and to every descendant's**
— execution params flow down the tree. Kebab → camel (`nb-var:my-label` → `myLabel`). Multiple vars on
one element resolve **left-to-right**, so a later one may reference an earlier one. Names must be valid
identifiers, must not be reserved, and must not collide case-insensitively with a transformer. A
descendant may shadow an ancestor's variable by redeclaring the same name.

```html
<div nb-var:user="this.findUser(item.id)" nb-var:label="user.displayName">{{ label }}</div>
```

**This is the primary memoization tool.** A `nb-var` expression is evaluated once per pass; every
descendant that references it reuses the value instead of re-running the underlying getter. Real
templates lean on it heavily:

```html
<div nb-var:date-time="this.dateTime"
     nb-var:default-date-time="this.defaultDateTime"
     nb-var:offset="this.offset">
    <small>{{offset > 0 ? '+' : ''}}{{offset}}</small>
    <span nb-if="dateTime?.offset > 0">[{{dateTime?.offsetNameShort}}]</span>
    <date-and-time nb-in-ref:date-time="dateTime"
                   nb-in:highlighted="defaultDateTime?.day != dateTime?.day"></date-and-time>
</div>
```

Without the vars, `this.dateTime` — a getter doing timezone math — would run once per binding, per
pass, per row.

## Execution

| Attribute | Description |
|---|---|
| `nb-exec` | Runs the expression on every cycle and discards the result. With `#` it runs until the first non-`undefined` result, then stops. |
| `nb-bound` | Runs **exactly once**, on the element's first bind. Params: `element`, `nativeElement`. |

`nb-bound` is implicitly single-bound — the framework prefixes the expression with `#` if you didn't —
and it runs exactly once even if the result is `undefined` (no retry). Do not write `nb-bound="@…"`:
the forced `#` turns it into `#@…`, which never compiles. It is the idiomatic way to capture a
DOM/custom-element reference:
```html
<fluent-text-input nb-bound="this.textInput = nativeElement"></fluent-text-input>
```
Pair it with a property setter when you need to react to the capture (see `patterns.md`).

## Contexts: containers, components, aspects, templates

| Attribute | Description |
|---|---|
| `nb-container="@Name"` | Renders a registered container (case-insensitive). `%slot` binds to a route slot. The expression's result is stringified and used as the name, so it can be dynamic. |
| `<my-component>` | Components render via their custom element tag. |
| `nb-in:name` | Input to a child container/component. Objects are **deep-cloned** (`structuredClone`). |
| `nb-in-ref:name` | Input **by reference** — for class instances, functions, DOM nodes, anything not cloneable. |
| `nb-aspect:name` | Attaches an aspect, optionally with data. |
| `nb-template="@name"` | Injects a globally registered template. The value is a static `@name`, not an expression — it cannot be dynamic. |

`nb-in`/`nb-in-ref` notes:
- Kebab → camel: `nb-in:some-name` sets `someName` on the child.
- Updates are gated by **deep equality** — a new object with identical contents does not trigger an
  update or `onInputsRefreshDone()`.
- **In-place mutation is never delivered** — the comparison keeps the parent's object reference, so a
  mutated object is compared against itself. Push a new, deep-unequal object.
- A non-cloneable `nb-in` value logs `input set error … try to use nb-in-ref` **once** and that
  object is never retried — the child keeps its own value. Use `nb-in-ref` for anything carrying functions,
  DOM nodes or class instances you need intact (`structuredClone` drops prototypes).
- `nb-in:x` and `nb-in-ref:x` on one element share a key space: the `nb-in` one wins and the other is
  rejected with `multiple handlers for one in (x) are not supported`.
- An input update triggers change detection on the child. A container/component that declares
  inputs defers its *first* pass to a later task (so the first render already sees them) — for that
  moment after it enters the DOM, its own bindings, including its `nb-event`s, are not live yet.
  Don't drive it synchronously right after it appears.

Setting a container expression to an empty/unknown name disposes the current child context.

## Content projection

Slots are declared in the child's template; content is supplied from the parent.

```html
<!-- child (container / component / global template) -->
<h2 nb-project-to="@header"></h2>        <!-- projected content becomes children of this element -->
<p  nb-project-instead="@body"></p>      <!-- projected content REPLACES this element -->

<!-- parent -->
<div nb-container="@Card">
    <h3 nb-projection="@header">Title</h3>
    <p  nb-projection="@body">Body text</p>
</div>

<!-- default (unnamed) slot -->
<div nb-container="@Card"><em nb-projection>Default content</em></div>
```

> **Projected content binds against the *child's* context, not the parent's.** The nodes are cloned into
> the container/component subtree before that entity's binder builds the tree, so `this` inside a
> `nb-projection` element means the child. This differs from web-component slots and from other
> frameworks' content projection — pass parent data in through `nb-in` instead of expecting it in scope.

- Slot names are plain strings matched **verbatim** between `nb-projection` and
  `nb-project-to`/`nb-project-instead` — the leading `@` is a naming convention, not the constant
  prefix, so use it on both sides or on neither. Names may contain `:` — `@content:left`,
  `@content:right` are used heavily in real templates.
- An unnamed `nb-projection` cannot be mixed with multiple projections on the same host (error).
- Duplicate *named* projections silently let the last one win.
- **A slot with no matching projection keeps its own markup**, so whatever you put inside a
  `nb-project-to` element serves as fallback content.
- Projected nodes are cloned, so the same source can feed several slots.
- Host children *without* `nb-projection` are kept aside as fallback content and restored if the
  container is disposed or its name resolves to nothing.
- For components, projection moves light-DOM children into the shadow root's slots.

## Sub-tree ownership and which elements are tracked

Elements carrying `nb-template`, `nb-container`, a component tag, `nb-value`, or `nb-html` **own their
sub-tree**: nuBond does not bind their original children as part of the parent tree. Children of such
elements are treated as projection content (or replaced outright, for value/html).

Only elements that actually carry a known `nb-*` attribute — or are a registered component tag — become
tracked nodes. Plain markup is walked through and costs nothing at change-detection time.

Once a handler has produced its content, nuBond stamps a readiness attribute on the element
(`nb-container-ready`, `nb-if-ready`, `nb-repeat-ready`, `nb-switch-ready`, `nb-template-ready`; a
component host gets the `nb-component` marker plus `nb-component-ready`). Two stylesheets injected
into `document.adoptedStyleSheets` at import time (and adopted into every component shadow root) use
these to hide not-yet-resolved regions and to implement `nb-hidden` — which is why there is usually no
flash of unbound markup. Do not set or remove these attributes yourself; system attributes throw if
mutated at runtime through `ElementManipulations`.

`nb-*` attributes stay in the DOM after binding, so tests and tooling can find the element wired to an
event (`[nb-event\:contextmenu]`) or read a debounce off it.
