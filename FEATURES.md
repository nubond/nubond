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

---

## 1. Decorators

### Class-Level Decorators

| Decorator | Purpose |
|-----------|---------|
| `@AppRoot(...metadata)` | Bootstraps the application. Accepts (in any order) an element selector string or `Element`, a route template string starting with `/`, an `IGlobalConfig`, an `IContextConfig`, `$Template`/`$AdoptedStyle` registration arrays, and any Container/Component/Aspect/Transformer/Injectable dependencies used by the app. |
| `@Container(templateOrTuple, ...metadata)` | Registers a container — a context-bound HTML template region without Shadow DOM isolation. `templateOrTuple` is either an HTML template / `ITemplateProvider`, or a `[name, templateOrProvider]` tuple. Additional metadata can include `IContextConfig`, `$Template`/`$AdoptedStyle` arrays, and entity dependencies. |
| `@Component(templateOrTuple, ...metadata)` | Registers a web component with Shadow DOM. `templateOrTuple` is the HTML template (string / `ITemplateProvider`) or a `[name, templateOrProvider]` tuple. Additional metadata can include a style template, a `CustomElementConstructor`, an `IComponentContextConfig`, an `Array<string>` of adopted-style names, and entity dependencies. |
| `@Aspect(styleOrTuple?, ...metadata)` | Registers an aspect — a reusable, element-level behavior/mixin attached via `nb-aspect`. Optional first argument is a style template (string / `ITemplateProvider`) or a `[name, styleOrProvider]` tuple. Additional metadata can include an `Array<string>` of adopted-style names and a `(style: string) => string` sanitizer. |
| `@Transformer(name?)` | Registers a global function transformer callable from any template expression. |
| `@Injectable(singleton?)` | Registers a class in the DI container. Default is **transient** (`singleton = false`); pass `true` for a singleton. |

### Property-Level Decorators

| Decorator | Purpose |
|-----------|---------|
| `@Detector()` | Marks a property for automatic change detection — any mutation triggers a change detection cycle. |
| `@Eventer(eventName?)` | Marks a property as a custom event emitter — changes dispatch a `CustomEvent`. |

### Pseudo-Decorators (Function-Based Registration)

| Function | Purpose |
|----------|---------|
| `$Template(name, html \| provider, sanitizer?)` | Registers a global reusable HTML template by name. |
| `$AdoptedStyle(name, css \| provider, sanitizer?)` | Registers a global adopted stylesheet by name. |
| `$Injectable(target, singleton?, ...dependencies)` | Programmatic injectable registration. |
| `$Config(globalConfig)` | Applies global framework configuration. |
| `$Route(routeConfig)` | Configures routing programmatically. |

---

## 2. Template Binding Syntax

All binding attributes use the `nb-` prefix by default (or `data-nb-` in W3C compliance mode).

### Value & HTML Bindings

| Attribute | Description | Example |
|-----------|-------------|---------|
| `nb-value` | Binds an expression result to the element's `textContent`. | `<p nb-value="this.name"></p>` |
| `nb-html` | Binds an expression result to the element's `innerHTML`. Supports sanitization. | `<p nb-html="this.richContent"></p>` |

### CSS Bindings

| Attribute | Description | Example |
|-----------|-------------|---------|
| `nb-class` | Dynamic class binding. Supports three formats: simple string, array, and conditional object. Entries in array/object form are separated by `;`. | `<p nb-class="{active: this.isActive; hidden: this.isHidden}">` |
| `nb-style` | Dynamic inline style binding. Multiple properties separated by `;`. | `<p nb-style="opacity: this.fade; color: this.textColor">` |

**`nb-class` Formats:**

```html
<!-- Simple: expression returns a class name string -->
<p nb-class="this.className"></p>

<!-- Array: multiple class name expressions -->
<p nb-class="[this.class1; this.class2]"></p>

<!-- Conditional object: class names as keys, boolean expressions as values -->
<p nb-class="{highlight: this.isHighlighted; 'text-muted': this.isMuted}"></p>
```

### Attribute & Property Bindings

| Attribute | Description | Example |
|-----------|-------------|---------|
| `nb-attr:name` | Binds to an HTML attribute. Setting to `null` removes the attribute. | `<input nb-attr:disabled="this.isDisabled" />` |
| `nb-prop:name` | Binds to a DOM property. | `<input nb-prop:checked="this.isChecked" />` |

Multiple attribute/property bindings can be applied to the same element:

```html
<input nb-attr:disabled="this.isDisabled" nb-attr:required="this.isRequired" />
```

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

With a named prefix (e.g., `nb-repeat:outer`), parameters become `outerItem`, `outerIndex`, `outerCount`.

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

### Execution

| Attribute | Description | Example |
|-----------|-------------|---------|
| `nb-exec` | Executes an expression on every change detection cycle (no DOM output). | `<span nb-exec="this.counter++"></span>` |
| `nb-bound` | Executes once when the element is first bound. Exposes `element` (ElementManipulations) and `nativeElement` parameters. | `<div nb-bound="this.ref = nativeElement"></div>` |

### Context Bindings

| Attribute | Description | Example |
|-----------|-------------|---------|
| `nb-container` | Renders a registered container by name. Prefix with `%` for route slot binding. | `<div nb-container="@MyContainer">` |
| `nb-in:name` | Passes input data to a child container or component. | `<div nb-container="@Child" nb-in:data="this.value">` |
| `nb-in-ref:name` | Passes input data by reference. | `<div nb-container="@Child" nb-in-ref:items="this.list">` |
| Component tag | Components render via their registered custom element tag name. | `<my-component nb-in:title="this.title">` |
| `nb-aspect:name` | Attaches an aspect to an element, optionally with data. | `<div nb-aspect:tooltip="this.tooltipConfig">` |
| `nb-template` | Injects a registered global template by name. | `<span nb-template="@info-icon"></span>` |
| `nb-projection` | Marks content for projection into a container or component slot. | `<em nb-projection="@header">Title</em>` |

---

## 3. Expression System

Expressions are JavaScript/TypeScript code snippets evaluated against the current context (`this`).

### Expression Prefixes

| Prefix | Name | Behavior |
|--------|------|----------|
| *(none)* | Continuous binding | Re-evaluated on every change detection cycle. |
| `#` | Single/one-time binding | Evaluated once, then frozen. |
| `@` | Constant binding | Treated as a literal constant value (no evaluation). |
| `%` | Route slot | Binds a container to a named route slot. |

```html
<!-- Continuous binding — updates on every cycle -->
<p nb-value="this.dynamicText"></p>

<!-- One-time binding — evaluated once -->
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
```

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

### Shadow DOM Configuration

Metadata args (style, adopted-styles array, context config, custom element class) are resolved by **type**, not position — pass only what you need:

```typescript
@Component(html, css, {
    shadowRootConfig: { mode: 'open', delegatesFocus: true }
})
export class ConfiguredComponent { }
```

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

Transformers are singletons. Reserved names — compared case-insensitively — cannot be used as transformer names: `item`, `index`, `count`, `element`, `nativeElement`, `event`, `data`, `unSubscribe`, `router`.

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

Templates are looked up case-insensitively and compiled into DOM nodes on first access.

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
    public importantData: any; // Mutations trigger change detection
}
```

### Cycle Limits

Only the Pessimistic strategy can re-run a pass within a single trigger. Its stabilization loop is capped at 10 consecutive re-runs — if the tree still has not stabilized at that point, the framework logs an error and stops, preventing an infinite update loop.

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
| `router.go(stateOrSlotValue, partialState?, removeHistory?)` | Navigate to a new state. Pass a slot-value string or a `{slotName: value}` state object. `partialState` (default `true`) merges with the current state; `removeHistory` (default `false`) replaces the current history entry instead of pushing a new one. |
| `router.goBack()` | Navigate back in history. |
| `router.goForward()` | Navigate forward in history. |
| `router.goTo(offset)` | Navigate to a specific history offset. |
| `router.onBeforeStateChange(callback)` | Hook before navigation. Callback receives `(preventChange, oldState, newState, oldPath, newPath)`; call `preventChange()` to cancel. Returns an unsubscribe function. |
| `router.onAfterStateChange(callback)` | Hook after navigation. Callback receives `(oldState, newState, oldPath, newPath)`. Returns an unsubscribe function. |

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
| `onContainerAttached(context)` | After the container/component is attached to the DOM and bindings are initialized. |
| `onContainerDetached(context)` | When the container/component is removed from the DOM. |
| `onInputsRefreshDone()` | After all `nb-in` input bindings have been updated. |
| `onDetectChangesDone()` | After a change detection cycle completes. |
| `onDispose()` | During cleanup/teardown. |

```typescript
@Container(html)
export class MyContainer implements IContext {
    onContainerAttached() {
        console.log('Container attached');
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
| `EventDispatcher` | Dispatches custom DOM events via `dispatch(name, data?)`. Returns `boolean`. |
| `ElementManipulations` | Facade for element DOM manipulation: properties (`get`/`set`), attributes (`has`/`get`/`getAll`/`set`/`remove`), styles (`has`/`get`/`getAll`/`set`/`remove`), classes (`has`/`getAll`/`add`/`remove`/`toggle`). |
| `ElementSubscriptions` | Manages event subscriptions with `subscribe(eventName, callback, options?, debounce?)`. Supports `isSubscribed()`/`isUnSubscribed()` checks. |
| `Router` | Route navigation and state management (see [Routing](#12-routing)). |

---

## 18. Utility Helpers

The `Helpers` module provides type checking and conversion utilities:

| Helper | Purpose |
|--------|---------|
| `isUndefined(value)` | Undefined type check |
| `isString(value)` | String type check |
| `isNotEmptyString(value)` | String that is non-empty after trim |
| `isNumber(value)` | Number type check |
| `isBoolean(value)` | Boolean type check |
| `isObject(value)` | Object type check (non-null) |
| `isArray(value)` | Array type check |
| `isIterableCollection(value)` | Iterable collection (e.g. `Map`, `Set`) check |
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
| `toCamelCase(value)` | Normalizes a name to `camelCase` |
| `toPascalCase(value)` | Normalizes a name to `PascalCase` |
| `format(template, ...args)` | `{0}/{1}`-style string interpolation |

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
