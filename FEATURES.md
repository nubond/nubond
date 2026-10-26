# Documentation & Feature Reference

## Table of Contents

1. [Decorators](#1-decorators)
2. [Template Binding Syntax](#2-template-binding-syntax)
3. [Expression System](#3-expression-system)
4. [Containers](#4-containers)
5. [Components](#5-components)
6. [Aspects](#6-aspects)
7. [Transformers](#7-transformers)
8. [Templates](#8-templates)
9. [Content Projection](#9-content-projection)
10. [Dependency Injection](#10-dependency-injection)
11. [Change Detection](#11-change-detection)
12. [Routing](#12-routing)
13. [Adopted Styles](#13-adopted-styles)
14. [W3C Compliance Mode](#14-w3c-compliance-mode)
15. [Parcel Integration & Text Interpolation Plugin](#15-parcel-integration--text-interpolation-plugin)
16. [Lifecycle Hooks](#16-lifecycle-hooks)
17. [Injectable Services](#17-injectable-services)
18. [Utility Helpers](#18-utility-helpers)
19. [Sanitization & Trusted Content](#19-sanitization--trusted-content)

---

## 1. Decorators

### Class-Level Decorators

| Decorator | Purpose |
|-----------|---------|
| `@AppRoot(...metadata)` | Bootstraps the application. Accepts (in any order) an element selector string or `Element` (defaults to `document.body` when omitted), a route template string starting with `/`, an `IGlobalConfig`, `$Template`/`$AdoptedStyle` registration arrays, and any Container/Component/Aspect/Transformer/Injectable dependencies used by the app. Unlike the soft-failing entity decorators, `@AppRoot` **throws** on conflicting metadata (multiple selectors, route templates, or global configs). |
| `@Container(templateOrTuple, ...metadata)` | Registers a container — a context-bound HTML template region without Shadow DOM isolation. `templateOrTuple` is either an HTML template / `ITemplateProvider`, or a `[name, templateOrProvider]` tuple. Additional metadata can include `IContextConfig`, `$Template`/`$AdoptedStyle` arrays, and entity dependencies. |
| `@Component(templateOrTuple, ...metadata)` | Registers a web component with Shadow DOM. `templateOrTuple` is the HTML template (string / `ITemplateProvider`) or a `[name, templateOrProvider]` tuple. Additional metadata can include a style template, a `CustomElementConstructor`, an `IComponentContextConfig`, an `Array<string>` of adopted-style names, and entity dependencies. |
| `@Aspect(styleOrTuple?, ...metadata)` | Registers an aspect — a reusable, element-level behavior/mixin attached via `nb-aspect`. Optional first argument is a style template (string / `ITemplateProvider`) or a `[name, styleOrProvider]` tuple. Additional metadata can include an `Array<string>` of adopted-style names and a `(style: string) => string` sanitizer (applied to URL-/provider-resolved CSS only — inline CSS is trusted; [§19](#19-sanitization--trusted-content)). |
| `@Transformer(name?)` | Registers a global function transformer callable from any template expression. |
| `@Injectable(singleton?)` | Registers a class in the DI container. Default is **transient** (`singleton = false`); pass `true` for a singleton. |

### Property-Level Decorators

| Decorator | Purpose |
|-----------|---------|
| `@Detector()` | Marks a property for automatic change detection — **assigning** a new value triggers a change detection cycle (gated by deep-equal comparison; in-place mutation of a nested object is not detected). |
| `@Eventer(eventName?)` | Marks a property as a custom event emitter — assignments dispatch a `CustomEvent` with the value in `event.detail`. The event name defaults to the kebab-cased property name. A non-`undefined` initial value also fires the event once after the first change-detection cycle. |

Both are implemented via `Object.defineProperty` and can only be applied to simple, configurable properties — properties with an existing getter/setter (or non-configurable ones) are rejected with a logged error.

### Pseudo-Decorators (Function-Based Registration)

| Function | Purpose |
|----------|---------|
| `$Template(name, html \| provider, sanitizer?)` | Registers a global reusable HTML template by name. The optional sanitizer applies to URL-/provider-resolved content only — inline HTML is trusted ([§19](#19-sanitization--trusted-content)). |
| `$AdoptedStyle(name, css \| provider, sanitizer?)` | Registers a global adopted stylesheet by name. The optional sanitizer applies to URL-/provider-resolved content only — inline CSS is trusted ([§19](#19-sanitization--trusted-content)). |
| `$Injectable(target, singleton?, ...dependencies)` | Programmatic injectable registration. Also accepts an existing object instance — `$Injectable(instance)` registers it as a singleton under its constructor. |
| `$Config(globalConfig)` | Applies global framework configuration. |
| `$GlobalShadowRootConfig(shadowRootConfig)` | Sets the default `IShadowRootConfig` for components that have no per-component `shadowRootConfig`. Each `@Component` captures it when its decorator runs, so call it in a module evaluated **before** any component module — see [§5](#shadow-dom-configuration). |
| `$Route(routeConfig)` | Configures routing programmatically. |

---

## 2. Template Binding Syntax

All binding attributes use the `nb-` prefix by default (or `data-nb-` in W3C compliance mode).

### Value & HTML Bindings

| Attribute | Description | Example |
|-----------|-------------|---------|
| `nb-value` | Binds an expression result to the element's `textContent`. | `<p nb-value="this.name"></p>` |
| `nb-html` | Binds an expression result to the element's `innerHTML`. Sanitization is **opt-in**: by default the value is written raw (an XSS sink for untrusted content) — register an `htmlSanitizer` in the global config or context config to sanitize. See [§19](#19-sanitization--trusted-content). | `<p nb-html="this.richContent"></p>` |

### CSS Bindings

| Attribute | Description | Example |
|-----------|-------------|---------|
| `nb-class` | Dynamic class binding. Supports three formats: simple string, array, and conditional object. Entries in array/object form are separated by `;`. | `<p nb-class="{active: this.isActive; hidden: this.isHidden}">` |
| `nb-style` | Dynamic inline style binding. Multiple properties separated by `;`. | `<p nb-style="opacity: this.fade; color: this.textColor">` |

A literal `;` inside an `nb-class` (array/object form) or `nb-style` entry can be escaped as `\;` — e.g. `nb-style="background: url('a\;b.png')"`.

An `nb-style` value ending in `!important` is applied as a CSS priority (`style.setProperty(prop, value, 'important')`), matched case-insensitively — e.g. `nb-style="color: this.warnColor + ' !important'"`. The flag must be a contiguous token and must not be the whole value: `! important` and a bare `!important` are passed through as plain values and dropped by the CSS parser.

**`nb-class` Formats:**

```html
<!-- Simple: expression returns a class name string -->
<p nb-class="this.className"></p>

<!-- Array: multiple class name expressions -->
<p nb-class="[this.class1; this.class2]"></p>

<!-- Conditional object: class names as keys, boolean expressions as values -->
<p nb-class="{highlight: this.isHighlighted; 'text-muted': this.isMuted}"></p>
```

- **Authored classes are never removed by `nb-class`.** Classes present in the markup when the element is bound stay in place in every form: a simple or array value moving away from `x` does not remove an authored `x`. In the conditional form a key that names an authored class is a template error — `class="highlight" nb-class="{highlight: this.on}"` logs `conditional class expression can't mutate static (highlight) class.` and that key is not bound. Leave a class out of the markup if a binding should be able to switch it off. (The imperative `element.classes.remove()` / `toggle()` can still remove it.)
- **Array entries share classes.** When two entries yield the same class, it stays as long as at least one of them still yields it — including a one-time (`#`) entry, whose frozen class counts every cycle.
- **Conditional keys must be unique.** A repeated class name (`{on: a; on: b}`, compared after trimming, case-sensitive) keeps the first entry and logs `duplicated class name (on) found.`.
- Array entries are separated by `;` — `[this.a, this.b]` is a **single** entry (the comma operator yields `this.b`).

### Attribute & Property Bindings

| Attribute | Description | Example |
|-----------|-------------|---------|
| `nb-attr:name` | Binds to an HTML attribute. Setting to `null` removes the attribute. | `<input nb-attr:disabled="this.isDisabled" />` |
| `nb-prop:name` | Binds to a DOM property. | `<input nb-prop:checked="this.isChecked" />` |

Multiple attribute/property bindings can be applied to the same element:

```html
<input nb-attr:disabled="this.isDisabled" nb-attr:required="this.isRequired" />
```

- `nb-prop` names are converted from kebab-case to camelCase: `nb-prop:read-only` → `readOnly`.
- Guard rails: `nb-attr:class` / `nb-attr:style` and `nb-prop:className` / `nb-prop:classList` / `nb-prop:style` / `nb-prop:textContent` / `nb-prop:innerText` / `nb-prop:innerHTML` are rejected with an error pointing to the dedicated handler (`nb-class`, `nb-style`, `nb-value`, `nb-html`).

### Conditional Rendering

| Attribute | Description | Example |
|-----------|-------------|---------|
| `nb-if` | Shows/hides an element based on a boolean expression. | `<p nb-if="this.isVisible">Shown</p>` |
| `nb-switch` | Evaluates an expression and shows matching `nb-case` children. | `<div nb-switch="this.status">` |
| `nb-case` | Matches against the parent `nb-switch` value. | `<span nb-case="@active">Active</span>` |
| `nb-default` | Fallback case when no `nb-case` matches. | `<span nb-default>Unknown</span>` |

```html
<div nb-switch="this.status">
    <span nb-case="@active">Active</span>
    <span nb-case="@inactive">Inactive</span>
    <span nb-default>Unknown</span>
</div>
```

**How `nb-case` matches** — the switch value and each case value are compared with strict equality (`===`) after one normalization step:

- **Primitives** (`string`, `number`, `boolean`, `bigint`, `symbol`, `null`, `undefined`) are compared as-is, so the **type matters**: `5` does not match `'5'`, `true` does not match `'true'`, and an `undefined`/`null` switch value does not match an empty-string case — it falls through to `nb-default`.
- **Objects, arrays and functions** — and `NaN` — are compared by their stringified text (JSON for objects and arrays, `''` for functions, `'NaN'` for `NaN`). Two deep-equal objects therefore match, and so does a string case holding the same text (`{a: 1}` matches `'{"a":1}'`, a function matches `''`).
- `@` constants are typed: `nb-case="@5"` is the **number** `5` and `@true` the boolean `true`. When the switch value is a string — router state, an `<input>` value, a URL parameter — match it with a string literal: `nb-case="'5'"`.

> **Note:** `nb-if` (and `nb-switch`/`nb-case`/`nb-default`) hide elements by toggling the `nb-hidden` CSS class (`data-nb-hidden` in W3C mode; `display: none !important`) — the element is **not** removed from the DOM.

### Iteration

| Attribute | Description | Example |
|-----------|-------------|---------|
| `nb-repeat` | Repeats the element for each item in a collection. Supports arrays (including typed arrays), iterable collections, strings, objects (iterates over enumerable property names), and numbers (repeat N times). | `<li nb-repeat="this.items" nb-value="item"></li>` |
| `nb-repeat:prefix` | Named repeat for nested loops. Parameters become prefixed (e.g., `outerItem`). | `<div nb-repeat:outer="this.outerList">` |

**Available loop parameters:**

| Parameter | Description |
|-----------|-------------|
| `item` | Current iteration item |
| `index` | Current iteration index (0-based) |
| `count` | Total number of items |

**`item` semantics per data type:** for arrays/typed arrays/strings/`Set`, `item` is the element; for `Map`, `item` is a `[key, value]` pair; for objects, iteration goes over enumerable property names and `item` is the property **value**; for a number `N`, the element repeats `⌊N⌋` times with `item` = `index + 1` (1-based) while `index` stays 0-based.

With a named prefix (e.g., `nb-repeat:outer`), parameters become `outerItem`, `outerIndex`, `outerCount`. A prefix whose generated parameter names (`outerItem`, `outerIndex`, `outerCount`) collide with a registered transformer name is rejected with an error.

```html
<!-- Nested repeat -->
<div nb-repeat:outer="this.groups">
    <span nb-repeat="this.items"
          nb-value="`Group ${outerIndex}: Item ${index} = ${item}`">
    </span>
</div>
```

### Event Handling

| Attribute | Description | Example |
|-----------|-------------|---------|
| `nb-event:eventName` | Subscribes to a DOM event. | `<button nb-event:click="this.onClick()">` |
| `nb-event:eventName:debounce` | Event subscription with debounce in milliseconds. | `<input nb-event:input:300="this.search(event)">` |

**Event expression parameters:**

| Parameter | Description |
|-----------|-------------|
| `nativeElement` | The underlying DOM `Element` |
| `element` | `ElementManipulations` facade for the current element |
| `event` | Native DOM `Event` object |
| `data` | Custom event detail payload (`event.detail`) |
| `unSubscribe` | Function to manually unsubscribe from the event |
| `router` | `Router` instance (only injected when the router is configured) |

```html
<!-- Inline element manipulation -->
<button nb-event:mouseover="element.styles.set('color', '#D9269D')"
        nb-event:mouseout="element.styles.set('color', null)">
    Hover me
</button>

<!-- One-time event (auto-unsubscribes after first trigger) -->
<button nb-event:click="#this.handleOnce()">Click once</button>

<!-- Event with debounce -->
<input nb-event:input:300="this.search(event)" />
```

### Variables

| Attribute | Description | Example |
|-----------|-------------|---------|
| `nb-var:name` | Defines a local variable available in child element expressions. | `<div nb-var:label="this.getLabel()">` |

- Kebab-case names are converted to camelCase in expressions: `nb-var:my-label` → `myLabel`.
- Names that match a reserved context name (see [Transformers](#7-transformers)) or collide case-insensitively with a registered transformer are rejected with an error.
- Multiple `nb-var`s on the same element resolve **left-to-right** — each subsequent variable expression can reference the ones declared before it.

### Execution

| Attribute | Description | Example |
|-----------|-------------|---------|
| `nb-exec` | Executes an expression on every change detection cycle (no DOM output). | `<span nb-exec="this.counter++"></span>` |
| `nb-bound` | Executes once when the element is first bound. Exposes `element` (ElementManipulations) and `nativeElement` parameters. | `<div nb-bound="this.ref = nativeElement"></div>` |

### Context Bindings

| Attribute | Description | Example |
|-----------|-------------|---------|
| `nb-container` | Renders a registered container by name. Prefix with `%` for route slot binding. | `<div nb-container="@MyContainer">` |
| `nb-in:name` | Passes input data to a child container or component. Objects are **deep-cloned** via `structuredClone` before assignment. | `<div nb-container="@Child" nb-in:data="this.value">` |
| `nb-in-ref:name` | Passes input data by reference (no clone — use for non-cloneable objects such as class instances with methods, DOM nodes, functions). | `<div nb-container="@Child" nb-in-ref:items="this.list">` |
| Component tag | Components render via their registered custom element tag name. | `<my-component nb-in:title="this.title">` |
| `nb-aspect:name` | Attaches an aspect to an element, optionally with data. | `<div nb-aspect:tooltip="this.tooltipConfig">` |
| `nb-template` | Injects a registered global template by name. | `<span nb-template="@info-icon"></span>` |
| `nb-projection` | Marks content for projection into a container or component slot. | `<em nb-projection="@header">Title</em>` |

**`nb-in` / `nb-in-ref` notes:**
- Kebab-case input names map to camelCase properties on the child: `nb-in:some-name` sets `someName`.
- Input updates are gated by **deep-equal comparison** (`Helpers.equals`) of the bound value — a new object with identical contents will **not** trigger an update (or `onInputsRefreshDone`).
- An **in-place mutation** of the bound object *is* delivered for `nb-in`: the comparison baseline is a clone snapshot of the previous value, not the parent's live reference, so the mutated object compares deep-unequal. It is **not** delivered for `nb-in-ref`, where the child shares the parent's object — the child's data is already correct, but no input update is detected, so its change detection is not triggered and its DOM stays stale until some other trigger.
- If an `nb-in` value cannot be `structuredClone`d, an error is logged suggesting `nb-in-ref` instead, and the value is **not delivered** — `nb-in` never falls back to handing over the live reference. This includes **functions**: every non-primitive goes through the clone, so callbacks must be passed with `nb-in-ref`.

---

## 3. Expression System

Expressions are JavaScript/TypeScript code snippets evaluated against the current context (`this`).

### Expression Prefixes

| Prefix | Name | Behavior |
|--------|------|----------|
| *(none)* | Continuous binding | Re-evaluated on every change detection cycle. |
| `#` | Single/one-time binding | Re-evaluated each cycle **until the first non-`undefined` result**, then frozen. (An expression that initially returns `undefined` — e.g. data still loading — keeps evaluating until it produces a value.) |
| `@` | Constant binding | Treated as a literal constant value (no evaluation). |
| `%` | Route slot | Binds a container to a named route slot. |

```html
<!-- Continuous binding — updates on every cycle -->
<p nb-value="this.dynamicText"></p>

<!-- One-time binding — frozen after first non-undefined result -->
<p nb-value="#this.initialText"></p>

<!-- Constant — literal string 'Hello' -->
<p nb-value="@Hello"></p>

<!-- Route slot container -->
<div nb-container="%page"></div>
```

### Expression Capabilities

- Full JavaScript expressions including template literals, ternary operators, method calls.
- Access to `this` (current context), loop variables, event parameters, and transformer functions.
- Multi-statement expressions separated by commas.
- Dynamic function compilation with per-expression caching for performance.

```html
<!-- Template literal -->
<p nb-value="`Hello, ${this.name}! You have ${this.count} items.`"></p>

<!-- Ternary -->
<p nb-class="{active: this.tab === 'home'}"></p>

<!-- Multi-statement in event -->
<a nb-event:click="router.go('home'), document.scrollingElement.scroll(0, 0)">Home</a>

<!-- Transformer call -->
<p nb-value="dateFormat({date: this.createdAt, format: 'DateString'})"></p>
```

---

## 4. Containers

Containers are context-bound HTML template regions rendered inline (no Shadow DOM). They are the primary building block for page sections and views.

### Template Sources

```typescript
// From imported HTML file
import html from './my-container.html';
@Container(html)
export class MyContainer { }

// From inline string
@Container('<div>Hello</div>')
export class InlineContainer { }

// From a template provider function
@Container({ get: () => '<div>Dynamic</div>' })
export class FunctionContainer { }

// From an async provider (Promise)
@Container({ get: () => fetch('/template.html').then(r => r.text()) })
export class AsyncContainer { }

// From a URL — a string that looks like a root-relative path
// (starts with '/' and contains no newline, '{' or '<') is fetched
// at runtime instead of being treated as inline HTML
@Container('/templates/my-container.html')
export class RemoteContainer { }
```

The same string/provider/URL sources apply to `@Component` templates and styles, `@Aspect` styles, `$Template`, and `$AdoptedStyle`.

The inline vs. URL/provider distinction is also the **trust boundary** for sanitization: inline content is treated as authored code and stored as-is, while URL- and provider-resolved content passes through the configured sanitizer. See [§19](#19-sanitization--trusted-content).

### Input / Output

Containers accept inputs via `nb-in` and emit outputs via custom events:

```html
<!-- Parent template -->
<div nb-container="@ChildContainer"
     nb-in:data="this.parentData"
     nb-event:output="this.result = data">
</div>
```

```typescript
// Child container
@Container(html)
export class ChildContainer {
    public data: any; // Receives input

    constructor(private eventDispatcher: EventDispatcher) { }

    emitResult() {
        this.eventDispatcher.dispatch('output', this.data);
    }
}
```

### Sub-Container Registration

Containers used within a parent must be passed as dependencies:

```typescript
@Container(html, ChildA, ChildB)
export class ParentContainer { }
```

---

## 5. Components

Components are Web Components with Shadow DOM isolation, scoped styles, and their own lifecycle.

### Definition

```typescript
// HTML + CSS from files
import html from './my-component.html';
import css from './my-component.scss';

@Component(html, css)
export class MyComponent { }

// HTML + CSS from strings
@Component('<div>Content</div>', ':host { display: block; }')
export class InlineComponent { }

// Async templates
@Component(
    { get: () => Promise.resolve('<div>Loaded</div>') },
    { get: () => Promise.resolve(':host { color: red; }') }
)
export class AsyncComponent { }
```

### Usage in Templates

Components are used via their tag name (converted from PascalCase to kebab-case):

```html
<my-component nb-in:title="this.pageTitle"
              nb-event:save="this.onSave(data)">
</my-component>
```

The registered name must be a valid custom element name — it must contain a hyphen. A single-word class name (e.g. `Button` → `button`) fails registration with a logged error; provide an explicit name via the `['my-button', html]` tuple instead. Names that already contain `-` are registered verbatim.

### Shadow DOM Configuration

Metadata args (style, adopted-styles array, context config, custom element class) are resolved by **type**, not position — pass only what you need:

```typescript
@Component(html, css, {
    shadowRootConfig: { mode: 'open', delegatesFocus: true }
})
export class ConfiguredComponent { }
```

The shadow root mode defaults to **`closed`** (unless overridden by a per-component `shadowRootConfig` or the global one set with `$GlobalShadowRootConfig`).

#### Global default — `$GlobalShadowRootConfig`

The app-wide default is set with the `$GlobalShadowRootConfig` pseudo-decorator — it is **not** an `IGlobalConfig` key, so neither `$Config` nor `@AppRoot` accepts it:

```typescript
// shadow-root-config.ts — imported first in index.ts, before any component module
import { $GlobalShadowRootConfig } from 'nubond';

$GlobalShadowRootConfig({ mode: 'open', delegatesFocus: true });
```

- **Captured at registration.** Each `@Component` reads the global value when its decorator runs and keeps it, so the call must happen before the component modules are evaluated. Imports are hoisted, so a call placed in `index.ts` *after* its imports — or next to `@AppRoot` — runs too late; put it in its own module imported first. A later call affects only components registered after it (no error is logged — there is no runtime guard as there is for `$Config`), and the last call wins.
- **Replaced, not merged.** A per-component `shadowRootConfig` replaces the global one as a whole — e.g. a global `delegatesFocus: true` is not inherited by a component that sets only `{ mode: 'closed' }`.
- **Stored as a clone** (`structuredClone`) — mutating the passed object afterwards has no effect; an uncloneable value logs `Can't setup shadowRootConfig` and keeps the previous setting. At attach time the fields are validated individually: `mode` other than `'open'`/`'closed'` falls back to `closed`, non-boolean `delegatesFocus`/`serializable` are ignored.
- **Migration:** a `shadowRootConfig` key left in a global config object is not applied. Passed to `@AppRoot`, the object then no longer matches the `IGlobalConfig` shape and is dropped **as a whole**, silently — the other settings in it (`showDebugInfo`, sanitizers, …) are lost too.

---

## 6. Aspects

Aspects are reusable, element-level behaviors (mixins) that attach to any element without creating a new DOM scope.

### Definition

```typescript
@Aspect()
export class Tooltip {
    constructor(private elementManipulations: ElementManipulations) { }

    public set data(value: { text: string, placement?: string } | string) {
        if (typeof value === 'object') {
            this.elementManipulations.attributes.set('data-tooltip', value.text);
            this.elementManipulations.attributes.set('data-placement', value.placement || 'bottom');
        } else {
            this.elementManipulations.attributes.set('data-tooltip', value);
        }
    }
}
```

### Usage

```html
<!-- String data -->
<button nb-aspect:tooltip="@Click to submit">Submit</button>

<!-- Object data -->
<button nb-aspect:tooltip="{text: 'Help', placement: 'top'}">?</button>

<!-- Dynamic expression -->
<button nb-aspect:tooltip="this.tooltipConfig">Action</button>
```

Aspects can optionally include styles (CSS) and adopted stylesheets. The `data` setter is called whenever the bound expression value changes.

---

## 7. Transformers

Transformers are globally registered pure functions available in any template expression by name.

### Definition

```typescript
@Transformer()
export class DateFormat {
    transform(data: { date: Date, format: string }): string {
        return data.format === 'ISOString'
            ? data.date.toISOString()
            : data.date.toDateString();
    }
}
```

### Usage

The class name (camelCase) becomes the function name in expressions:

```html
<p nb-value="dateFormat({date: this.createdAt, format: 'DateString'})"></p>
```

Transformers are singletons. `transform()` calls are wrapped in try/catch — an exception is logged as `Transformer '<name>' failed with exception: …` and the call returns `undefined`; exceptions never propagate to the calling expression.

Reserved names — compared case-insensitively — cannot be used as transformer names: `item`, `index`, `count`, `element`, `nativeElement`, `event`, `data`, `unSubscribe`, `router`. The same reserved list also applies to `nb-var` names and to `nb-repeat` prefix-generated names, since all of them become expression parameters.

---

## 8. Templates

Named, reusable HTML fragments registered globally and injected by reference.

### Registration

```typescript
import iconHtml from './icon.html';

// Register by name
$Template('info-icon', iconHtml);

// From a provider
$Template('dynamic-template', { get: () => '<em>Dynamic</em>' });
```

### Usage

```html
<span nb-template="@info-icon"></span>
<div nb-template="@page-header"></div>
```

Templates are looked up case-insensitively. Inline string templates are compiled into a `<template>` element at registration time; URL- and provider-based templates are fetched/resolved lazily on first use.

The optional third argument of `$Template` is an HTML sanitizer, applied to URL- and provider-resolved content only — inline content is trusted and stored verbatim. See [§19](#19-sanitization--trusted-content).

---

## 9. Content Projection

Content projection allows parent templates to inject content into named slots of child containers, components and templates.

### Defining Slots (in container/component template)

```html
<!-- Slot that receives projected content as children -->
<h2 nb-project-to="@header"></h2>

<!-- Slot that is replaced entirely by projected content -->
<p nb-project-instead="@description"></p>
```

### Projecting Content (in parent template)

```html
<!-- Default (unnamed) projection -->
<div nb-container="@Card">
    <em nb-projection>Default slot content</em>
</div>

<!-- Named projection into specific slots -->
<div nb-container="@Card">
    <h3 nb-projection="@header">Card Title</h3>
    <p nb-projection="@description">Card description text</p>
</div>
```

**Projection Modes:**
- `nb-project-to="@name"` — Projected content becomes *children* of the slot element.
- `nb-project-instead="@name"` — Projected content *replaces* the slot element.

Containers, components and templates support projections with the same syntax.

**Projected content binds against the *receiving* context, not the one that authored it.** The marked nodes are cloned into the child's template before it is bound, so every expression inside them — `this`, `nb-event` handlers, `{{ }}` — is evaluated by the child's binder: in `<div nb-container="@Card"><p nb-projection>{{ this.title }}</p></div>`, `this` is the `Card` instance. This differs from Web Component slots and from content projection in other frameworks. Hand parent data to the child through `nb-in` / `nb-in-ref`, and handle projected events in the child (or re-dispatch them).

```html
<!-- parent: `this` inside the projected button is the Card, not the parent -->
<div nb-container="@Card" nb-in:title="this.title">
    <button nb-projection="@footer" nb-event:click="this.like()">Like</button>
</div>
```

**Projection rules:**
- Slot names are plain strings matched verbatim between `nb-projection` and `nb-project-to` / `nb-project-instead` — the leading `@` is a convention, not the constant prefix, so write the same text on both sides.
- Only one element may use the unnamed (default) slot per host; a second one logs `Projection without name can't be used when there are multiple projections.` and is ignored. Wrap several elements in one. A repeated *named* projection replaces the earlier one (last wins).
- A slot that receives no projection keeps its own markup, so content inside an `nb-project-to` / `nb-project-instead` element is its fallback.
- Projected nodes are cloned, so one projection fills every slot with that name.
- Host children without `nb-projection` are kept aside and restored when the container is emptied (its name becomes empty or names no registered container).

---

## 10. Dependency Injection

nuBond provides a hierarchical DI container with constructor injection.

### Registering Injectables

```typescript
// Transient (default) — a new instance is created on each injection
@Injectable()
export class TransientService { }

// Singleton — a single shared instance for the lifetime of the app
@Injectable(true)
export class ApiService { }

// Programmatic registration (singleton = true)
$Injectable(ApiService, true);

// Register an existing instance (always a singleton) — useful for
// pre-configured objects or classes from external libraries
$Injectable(new ExternalClient({ baseUrl: '/api' }));
```

### Injecting Dependencies

Dependencies are injected via constructor parameters. The framework also provides built-in injectable services (see [Injectable Services](#17-injectable-services)).

```typescript
@Container(html)
export class MyContainer {
    constructor(
        private changeDetector: ChangeDetector,
        private apiService: ApiService
    ) { }
}
```

Each parameter is resolved by its **declared class**: the injectables registry is consulted first (your `@Injectable`s and `Router`), and only if the type is not registered there is it matched by `instanceof` against the built-in instances for that entity.

**Parameters must be typed with a class.** Resolution relies on the `design:paramtypes` metadata TypeScript emits, and for a parameter typed as an interface, `any`, `unknown`, a union or a generic type parameter, TypeScript emits `Object` — it has no class to resolve. Such a parameter is **not** injected: it receives `undefined` and the framework logs `Injection 'Object' cannot be resolve.`

```typescript
interface IMyConfig { apiUrl: string; }

@Container(html)
export class MyContainer {
    // ✗ not injectable — the emitted paramtype is Object;
    //   `config` arrives as undefined and an error is logged
    constructor(private config: IMyConfig) { }
}

@Injectable(true)
export class MyConfig implements IMyConfig {
    public apiUrl = '/api';
}

@Container(html)
export class MyContainer {
    // ✓ injectable — a registered class, so it resolves
    constructor(private config: MyConfig) { }
}
```

### Recursive Resolution

Dependencies can have their own dependencies, resolved recursively by the DI container.

---

## 11. Change Detection

nuBond uses a poll-based change detection system with configurable strategies.

### Strategies

| Strategy | Behavior |
|----------|----------|
| **Optimistic** (default) | A change-detection pass runs once per trigger (event is dispatched for `nb-event:xxx`, an `@Detector()` property change, an `@Eventer()` event, or a manual `ChangeDetector.detect()` call). Side effects produced *during* the pass — e.g. a bound expression that mutates state read by another binding — are not picked up until the next external trigger. Faster. |
| **Pessimistic** | Uses the same triggers as Optimistic, but after each pass the tree is checked for stability. If any handler committed a change during the pass (the tree is not yet stable), the pass is re-run; this repeats until the tree stabilizes or the cycle cap is hit. Catches cascading updates inside a single trigger at the cost of extra work. |

### Configuration

```typescript
// Global
@AppRoot({ pessimisticChangeDetectionStrategy: true }, ...)
export class App { }

// Per-container/component
@Container(html, { pessimisticChangeDetectionStrategy: true })
export class SafeContainer { }
```

### Manual Change Detection

```typescript
@Container(html)
export class MyContainer {
    constructor(private _changeDetector: ChangeDetector) { }

    onExternalUpdate() {
        this._changeDetector.detect(); // Trigger cycle manually
    }
}
```

### `@Detector()` Decorator

```typescript
@Container(html)
export class MyContainer {
    @Detector()
    public importantData: any; // Assignments trigger change detection
}
```

Assignments are gated by deep-equal comparison (`Helpers.equals`) — assigning an equal value does not trigger a cycle, and in-place mutation of a nested object is not detected (reassign or call `detect()` manually).

### Cycle Limits

Only the Pessimistic strategy can re-run a pass within a single trigger. Its stabilization loop is capped at 10 consecutive re-runs — if the tree still has not stabilized at that point, the framework logs an error and stops, preventing an infinite update loop.

### Scheduling

Change-detection passes are **debounced and asynchronous**: each trigger schedules the pass via `setTimeout`, and multiple triggers within the same task coalesce into a single pass. The DOM is therefore not updated synchronously after mutating state — `ChangeDetector.detect()` is safe to call repeatedly in a row.

Root contexts whose bound element (other than `document.body`) has been detached from the DOM are automatically disposed on the next change-detection request.

Child containers/components hidden via `nb-if` / `nb-switch` have their change detection **disabled** while hidden and re-enabled when they become visible again.

---

## 12. Routing

Hash-based or path-based routing with state management, history navigation, and container slot binding.

### Route Configuration Syntax

```
'/#[SLOT_NAME=DEFAULT_VALUE]/{VARIABLE=DEFAULT_VALUE}/CONSTANT'

/ — mandatory route prefix
# — hash-based routing (optional; without it, uses path/search)
[NAME=DEFAULT] — container slot (binds to nb-container="%NAME")
{NAME=DEFAULT} — variable slot (accessible via router.state.NAME)
CONSTANT — static path segment
```

### Setup

```typescript
@AppRoot(
    { showDebugInfo: true },
    '/#[tab=basics]',        // Hash-based, one container slot with default
    Basics, Containers, ...  // Page containers
)
export class App {
    constructor(public router: Router) { }
}
```

### Template Integration

```html
<!-- Bind container to route slot -->
<div nb-container="%tab"></div>

<!-- Navigate via event -->
<a nb-event:click="router.go('settings')">Settings</a>

<!-- Dynamic class based on route state -->
<a nb-class="{active: this.router.state.tab === 'home'}">Home</a>
```

### Router API

| Member | Description |
|--------|-------------|
| `router.state` | Current route state object with all slot values. |
| `router.path` | Current path string. |
| `router.hashBased` | Whether routing is hash-based. |
| `router.isConfigured` | Whether the router has been set up. |
| `router.go(stateOrSlotValue, partialState?, removeHistory?)` | Navigate to a new state. Pass a slot-value string (only allowed when the route template has exactly **one** named slot — otherwise a logged error) or a `{slotName: value}` state object. `partialState` (default `true`) merges with the current state; `removeHistory` (default `false`) replaces the current history entry instead of pushing a new one. |
| `router.goBack()` | Navigate back in history. |
| `router.goForward()` | Navigate forward in history. |
| `router.goTo(offset)` | Navigate to a specific history offset. |
| `router.onBeforeStateChange(callback)` | Hook before navigation. Callback receives `(preventChange, oldState, newState, oldPath, newPath)`; call `preventChange()` to cancel. Returns an unsubscribe function. |
| `router.onAfterStateChange(callback)` | Hook after navigation. Callback receives `(oldState, newState, oldPath, newPath)`. Returns an unsubscribe function. |

### Behavior Notes

- **All Router methods throw** an `Error` when the router is not configured (no route template provided) — unlike the rest of the framework, which soft-fails via `Console.error`. Check `router.isConfigured` before use when routing is optional.
- Setting a **container slot** (`[NAME]`) to a name that does not match a registered container is rejected with a logged error; the slot keeps its previous value.
- When an earlier slot in the route template has no value, subsequent slot values are serialized as **query parameters** (`/?name=value`) instead of path segments. On startup, query parameters are matched to slot names case-insensitively.

---

## 13. Adopted Styles

Adopted stylesheets allow sharing CSS across components via the `CSSStyleSheet` API.

### Registration

```typescript
$AdoptedStyle('shared-theme', themeCss);
$AdoptedStyle('shared-theme', { get: () => fetch('/theme.css').then(r => r.text()) });
```

### Usage in Components

```typescript
@Component(html, css, ['shared-theme'])
export class ThemedComponent { }
```

### Usage in Aspects

Aspects can also pull in registered adopted stylesheets — pass an `Array<string>` of names alongside the aspect's own style (the order of metadata arguments doesn't matter; they are resolved by type).

```typescript
// Aspect with only adopted styles (no own style)
@Aspect(undefined, ['shared-theme'])
export class ThemedHighlight {
    constructor(private elementManipulations: ElementManipulations) { }

    public set data(value: boolean) {
        this.elementManipulations.classes.toggle('highlight', value);
    }
}

// Aspect with both an inline style and adopted styles
@Aspect(':host { outline: 1px dashed currentColor; }', ['shared-theme', 'tooltip-theme'])
export class DebugOutline { }
```

Because aspects attach to existing elements (no Shadow DOM scope of their own), the referenced stylesheets are applied to whichever root the host element lives in — `document.adoptedStyleSheets` for elements in the light DOM, or the enclosing shadow root's `adoptedStyleSheets` when the aspect is attached inside a component.

Adopted styles are applied via `document.adoptedStyleSheets` or shadow root `adoptedStyleSheets`, and reference-counted for lifecycle management.

The optional third argument of `$AdoptedStyle` is a style sanitizer, applied to URL- and provider-resolved CSS only — inline CSS is trusted and stored verbatim. See [§19](#19-sanitization--trusted-content).

---

## 14. W3C Compliance Mode

By default, nuBond uses `nb-` prefixed attributes. Enabling W3C compliance mode switches to `data-nb-` prefixed attributes to conform to the HTML specification.

```typescript
@AppRoot({ complyWithW3C: true }, ...)
export class App { }
```

| Default | W3C Compliant |
|---------|---------------|
| `nb-value` | `data-nb-value` |
| `nb-event:click` | `data-nb-event--click` |
| `nb-attr:disabled` | `data-nb-attr--disabled` |

Meta-value separator changes from `:` to `--` in W3C mode.

`complyWithW3C` only changes what the runtime looks for. The `{{ }}` interpolation plugin runs at build time and cannot see it, so W3C apps that use `{{ }}` also set the plugin's `compliantWithW3CInterpolation` flag — see [§15](#w3c-compliant-output).

---

## 15. Parcel Integration & Text Interpolation Plugin

nuBond includes a PostHTML plugin (`posthtml-value-interpolation`) for Parcel that enables mustache-style text interpolation in HTML templates.

### What It Does

Transforms `{{expression}}` in text nodes into `<span nb-value="expression"></span>` elements during the Parcel build step.

### Example

```html
<!-- Source (authored) -->
<p>Welcome, {{this.userName}}! You have {{this.messageCount}} messages.</p>

<!-- Compiled output -->
<p>Welcome, <span nb-value="this.userName"></span>! You have <span nb-value="this.messageCount"></span> messages.</p>
```

### W3C-compliant output

An app in W3C compliance mode ([§14](#14-w3c-compliance-mode)) ignores `nb-value`, so `{{ }}` would render nothing. Set `compliantWithW3CInterpolation` in the `nubond` section of the project's root `package.json`, and the plugin emits `data-nb-value` instead:

```json
{
  "nubond": {
    "compliantWithW3CInterpolation": true
  }
}
```

```html
<!-- Compiled output in W3C-compliant mode -->
<p>Welcome, <span data-nb-value="this.userName"></span>!</p>
```

- The flag comes from the nearest `package.json`, searched upwards from the current working directory (the project root when Parcel runs). With no flag, the plugin emits `nb-value`.
- A non-boolean value or an unreadable `package.json` logs an error, and the plugin falls back to `nb-value`.
- The same key can be passed as a plugin option in `.posthtmlrc` (`{ "plugins": { "@nubond/posthtml-value-interpolation": { "compliantWithW3CInterpolation": true } } }`), and the option wins over `package.json`. The `root` option changes the directory the search starts from.
- `package.json` is reported to Parcel as a dependency of each template, so after you change the flag, Parcel rebuilds the templates without clearing `.parcel-cache`.
- The flag must match `complyWithW3C` in `@AppRoot`. The plugin does not read the app's config.

### Parcel Features

- **Named pipe references:** `href="ref:animate.min.css"` forces Parcel to reference (not inline) an asset.
- **Reserved file names:** any file whose basename matches `{index,app}.{htm,html,xhtml,styl,stylus,sass,scss,less,css,pcss,sss}` is routed through Parcel's bundling pipeline as an *entry / linked* asset (HTML transformer + html packager for HTML, the matching CSS/Sass/Less/etc. transformer for styles). The starter template's `parcel.d.ts` types these imports' default export as `undefined`, so they cannot be `import`-ed as inline strings the way arbitrary `*.html` / `*.scss` files can. The full reserved set is:
    - **HTML:** `index.htm`, `index.html`, `index.xhtml`, `app.htm`, `app.html`, `app.xhtml`
    - **Stylus:** `index.styl`, `index.stylus`, `app.styl`, `app.stylus`
    - **Sass / SCSS:** `index.sass`, `index.scss`, `app.sass`, `app.scss`
    - **Less:** `index.less`, `app.less`
    - **CSS / PostCSS:** `index.css`, `index.pcss`, `app.css`, `app.pcss`
    - **SugarSS:** `index.sss`, `app.sss`
- **Dual output format:** Plugin builds to both CommonJS and ESM.

---

## 16. Lifecycle Hooks

Contexts (containers and components) can implement lifecycle callback methods:

| Hook | When Called |
|------|-----------|
| `onContainerAttached(context)` | After a **child container** declared in *this* context's own template is attached and its bindings are initialized. `context` is that child container's context — not this one. |
| `onContainerDetached(context)` | When such a child container is detached. `context` is the detached child container's context. |
| `onInputsRefreshDone()` | After all `nb-in` input bindings have been updated. |
| `onDetectChangesDone()` | After a change detection cycle completes. |
| `onDispose()` | During cleanup/teardown. |

> **`onContainerAttached` / `onContainerDetached` are about containers only — by design.** They are notifications a context receives *about the `nb-container`s inside its own template*, which is what their names say. Two consequences worth knowing:
>
> - **A context is never told about its own attachment.** Implementing `onContainerAttached` on a container does not fire when *that* container attaches — it fires when a container nested in its template does. For "my own bindings are live" work, use the constructor (bindings run immediately after) or `onDetectChangesDone()`.
> - **Components do not participate at all.** A `<my-component>` attaching inside a template does **not** notify the host context, and a component's own context is never notified of its attachment. Only `nb-container` attachments raise these hooks; the hooks themselves are still available on a component context, where — as above — they report on child containers inside *its* template.
>
> Use `onDispose()` for teardown in both containers and components; it is the hook that fires for the context itself.

```typescript
@Container(html)
export class MyContainer implements IContext {
    // Fires for containers nested inside MyContainer's template,
    // NOT when MyContainer itself attaches.
    onContainerAttached(context: IContext) {
        console.log('A child container attached:', context);
    }

    onDispose() {
        console.log('Cleanup');
    }
}
```

---

## 17. Injectable Services

Built-in services available for constructor injection:

| Service | Description |
|---------|-------------|
| `ChangeDetector` | Triggers manual change detection via `detect()`. |
| `EventDispatcher` | Dispatches events on the entity's root element: `dispatch(name, data?)` creates a `CustomEvent` with `data` as `detail`; `dispatch(event)` dispatches a pre-built `Event`. Returns `boolean` (`false` if a handler called `preventDefault()`). |
| `ElementManipulations` | Facade for element DOM manipulation: properties (`get`/`set`), attributes (`has`/`get`/`getAll`/`set`/`remove`), styles (`has`/`get`/`getAll`/`set`/`remove`), classes (`has`/`getAll`/`add`/`remove`/`toggle`). |
| `ElementSubscriptions` | Manages event subscriptions with `subscribe(eventName, callback, options?, debounce?)`. Each call registers its own listener and returns the unsubscribe function for that subscription only. |
| `Router` | Route navigation and state management (see [Routing](#12-routing)). |

### Availability per Entity Type

Built-in services are **not** universally injectable — each entity type receives only the services that make sense for it. Requesting an unavailable service logs an injection error and yields `undefined`:

| Service | AppRoot | Container | Component | Aspect |
|---------|:-------:|:---------:|:---------:|:------:|
| `ChangeDetector` | ✓ | ✓ | ✓ | ✓ |
| `EventDispatcher` | ✓ | ✓ | ✓ | ✓ |
| `ElementManipulations` | — | — | ✓ | ✓ |
| `ElementSubscriptions` | — | — | ✓ | ✓ |
| `Router` | ✓ | ✓ | ✓ | ✓ |

`ElementManipulations` and `ElementSubscriptions` operate on the entity's root element and are only provided to components and aspects. `Router` is registered as a global injectable and resolves anywhere (its methods throw on use if routing is not configured — see [Routing](#12-routing)). User-defined `@Injectable` classes resolve in every entity type, including transformers.

---

## 18. Utility Helpers

The `Helpers` module provides type checking and conversion utilities:

| Helper | Purpose |
|--------|---------|
| `isUndefined(value)` | Undefined type check |
| `isString(value)` | String type check |
| `isNotEmptyString(value)` | String with `length > 0` (**no trim** — whitespace-only strings pass) |
| `isNumber(value)` | Number type check |
| `isBoolean(value)` | Boolean type check |
| `isObject(value)` | Object type check (non-null) |
| `isArray(value)` | Array type check |
| `isIterableCollection(value)` | `Map` or `Set` instance check (strictly these two — not a general iterable check) |
| `isTypedArray(value)` | Typed-array (`Int8Array`, `Uint8Array`, …) check |
| `isFunction(value)` | Function type check |
| `isSymbol(value)` | Symbol type check |
| `isBigInt(value)` | BigInt type check |
| `isValidElementName(value)` | Checks for valid HTML element name |
| `isValidCustomElementName(value)` | Checks for valid custom element name (must contain a hyphen) |
| `stringify(value)` | Safe string conversion |
| `equals(a, b)` | Deep equality comparison |
| `fromKebabToCamelCase(value)` | `my-name` → `myName` |
| `fromCamelToKebabCase(value)` | `myName` → `my-name` |
| `toCamelCase(value)` | Lowercases the **first character** only (`MyName` → `myName`; does not handle separators) |
| `toPascalCase(value)` | Uppercases the **first character** only (`myName` → `MyName`; does not handle separators) |
| `format(template, ...args)` | `{0}/{1}`-style string interpolation (`null` → empty string, `undefined` leaves the placeholder) |
| `split(value, separatorChar, escapeChar)` | Splits by a separator that can be escaped (e.g. `\;`); entries are trimmed and empty entries dropped — used by `nb-class`/`nb-style` parsing |

The package also exports `CallBackEvent<T>` — a typed callback-list event with `subscribe(callBack)` (returns an unsubscribe function; duplicate callbacks are ignored) and `raise(...data)` (invokes every callback; if any throw, the rest still run and a combined `Error` is thrown afterwards).

---

## 19. Sanitization & Trusted Content

nuBond accepts both an `htmlSanitizer` and a `styleSanitizer`, and applies them **only to content that arrives at runtime from outside the bundle**. Inline templates and inline styles are treated as *trusted authored code* and are stored verbatim — by design, not as an oversight.

### Trusted vs. sanitized sources

| Content source | Sanitizer applied? |
|----------------|--------------------|
| **Inline** HTML/CSS string passed to `@Container`, `@Component`, `@Aspect`, `$Template`, `$AdoptedStyle` — including a bundler-imported `.html`/`.css` file, which is an inline string by the time the decorator runs | **No** — trusted, stored as-is |
| **URL** template/style (a root-relative path string, fetched with `fetch` at runtime) | **Yes** |
| **`ITemplateProvider`** result — `get()` returning a string or a `Promise<string>` | **Yes** |
| `nb-html` binding value | **Yes, if one is registered** — otherwise the value is written raw (opt-in; see [§2](#value--html-bindings)) |
| `nb-attr:*` / `nb-prop:*` values | **No** — these are raw DOM escape hatches and bypass sanitization entirely (`nb-prop:srcdoc`, `nb-attr:href="javascript:…"` etc. are the developer's responsibility) |

### Why inline content is trusted

- An inline template is **source code**, authored and bundled alongside the TypeScript that binds to it. It carries no more risk than the class itself, and running untrusted-content sanitization over it is a liability rather than a safeguard: a sanitizer tuned for hostile input will typically strip the very markup the framework needs — unknown attributes (`nb-value`, `nb-repeat`, `nb-event:*`), custom-element tags, `<template>` elements — leaving a silently broken template with no diagnostic.
- Inline content is also consumed at **decorator-import time**, which necessarily runs *before* `@AppRoot`'s `Environment.config({ htmlSanitizer })` — the root module imports its dependencies first. A global sanitizer registered there could never have reached inline content in any case.
- URL- and provider-resolved content is the real boundary: it is fetched or computed *after* configuration, can come from a server or a CMS, and is therefore where the sanitizer runs.

A sanitizer registered globally or per context is consequently **not** a blanket "sanitize everything" switch. It covers the runtime-content paths above; anything inline is the author's responsibility, which is the correct split — the author wrote it.

### Where each sanitizer comes from

Sanitizers are resolved lazily, at the moment the content is stored, and the most specific registration wins:

| Target | Resolution order |
|--------|------------------|
| `@Container` template | `IContextConfig.htmlSanitizer` → global `htmlSanitizer` → none |
| `@Component` template | `IComponentContextConfig.htmlSanitizer` → global `htmlSanitizer` → none |
| `@Component` style | `IComponentContextConfig.styleSanitizer` → global `styleSanitizer` → none |
| `@Aspect` style | sanitizer in the `@Aspect` metadata → global `styleSanitizer` → none |
| `$Template` | the `sanitizer?` argument → global `htmlSanitizer` → none |
| `$AdoptedStyle` | the `sanitizer?` argument → global `styleSanitizer` → none |
| `nb-html` | the enclosing context's config `htmlSanitizer` → global `htmlSanitizer` → none (raw). The app root takes no context config, so bindings in the root element's own markup use the global sanitizer. |

```typescript
@AppRoot('#app',
    {
        // Covers nb-html bindings and every URL/provider-resolved
        // template and style in the app. Inline templates and styles
        // are trusted and bypass it.
        htmlSanitizer: (html) => DOMPurify.sanitize(html),
        styleSanitizer: (css) => css.replace(/@import[^;]*;/gi, '')
    },
    MyContainer)
export class App { }
```

```typescript
// Per-context override — wins over the global sanitizer for this
// component's nb-html bindings. Its own template and style are
// inline here, so they bypass the sanitizer either way; the override
// would also cover them had they been given as a URL or provider.
@Component(html, css, { htmlSanitizer: (html) => myStricterSanitizer(html) })
export class RichTextComponent { }
```

---

## Architecture Summary

```
@AppRoot
├── Router (hash or path-based navigation)
├── Environment (singleton global state)
│   ├── Containers registry
│   ├── Components registry
│   ├── Aspects registry
│   ├── Transformers registry
│   ├── Injectables (DI container)
│   ├── Templates registry
│   ├── AdoptedStyles registry
│   ├── Detectors registry
│   └── Eventers registry
├── TreeBuilder (DOM → NElement tree)
│   └── NElement (bound DOM element wrapper)
│       ├── Value handler
│       ├── Html handler
│       ├── Class handler
│       ├── Style handler
│       ├── Attribute handler
│       ├── Property handler
│       ├── If handler
│       ├── Repeat handler
│       ├── Switch/Case/Default handlers
│       ├── Event handler
│       ├── Exec handler
│       ├── Bound handler
│       ├── Variable handler
│       ├── Container handler
│       ├── Component handler
│       ├── Aspect handler
│       └── Template handler
├── ContextBinder (change detection engine)
│   ├── Bind → Execute → Commit pipeline
│   ├── Optimistic / Pessimistic strategies
│   └── Cycle limit (max 10)
└── ExpressionExecutor (cached dynamic evaluation)
    └── ExecutionParams (context, transformers, loop vars, event params)
```
