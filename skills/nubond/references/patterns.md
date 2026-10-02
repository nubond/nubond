# Proven patterns

Distilled from production nuBond apps — from small utilities to a large desktop-class editor with
thousands of bindings — and the `create-nubond` showcase.

## Config-first module

Settings that entities capture when their decorators run (`shadowRootConfig`, sanitizers for inline
templates) must be applied before any entity module is imported. Make it the first import of
`index.ts`; it is also the last moment the original query string exists (the router drops it).

```typescript
// src/config-first.ts
import { $Config } from 'nubond';

if (process.env.NODE_ENV !== 'production') {
    $Config({ shadowRootConfig: { mode: 'open' } });   // e.g. so a test harness can reach in
}

export const INITIAL_SEARCH = typeof window === 'undefined' ? '' : window.location.search;
```
```typescript
// src/index.ts
import './config-first';            // must stay first
import { AppRoot } from 'nubond';
// …entity imports…
```

## Singleton service with change notification

The standard way to share mutable state. Services are plain `@Injectable(true)` classes that expose a
`CallBackEvent`; consumers subscribe and call `ChangeDetector.detect()`.

```typescript
// shared/services/settings/base.ts
import { CallBackEvent, Helpers } from 'nubond';

export abstract class Base<T> {
    protected readonly changeCallBackEvent = new CallBackEvent<() => void>();
    protected readonly storageKey: string;

    constructor(storageKey: string) { this.storageKey = storageKey; }

    protected get(): T | undefined {
        const raw = localStorage.getItem(this.storageKey);
        if (Helpers.isNotEmptyString(raw)) {
            try { return JSON.parse(raw!); }
            catch (ex) { localStorage.removeItem(this.storageKey); console.error(ex); }
        }
    }

    protected set(settings: T): void {
        try { localStorage.setItem(this.storageKey, JSON.stringify(settings)); }
        catch (ex) { console.error(ex); }
    }

    public onChange(callBack: (propertyName?: string) => void): () => void {
        return this.changeCallBackEvent.subscribe(callBack);
    }

    protected raiseOnChange(propertyName?: string): void { this.changeCallBackEvent.raise(propertyName); }
}
```

```typescript
@Injectable(true)
export class UserSettings extends Base<IUserSettings> { /* typed getters/setters calling raiseOnChange */ }
```

Consuming it:
```typescript
constructor(public userSettings: UserSettings, changeDetector: ChangeDetector) {
    userSettings.onChange(propertyName => {
        if (propertyName === 'languages') { this.refresh(); changeDetector.detect(); }
    });
}
```

Expose the service as a **public** field so templates can bind and write to it directly:
```html
<fluent-menu-item nb-event:click="this.userSettings.showTimezone = !this.userSettings.showTimezone"
                  nb-attr:checked="this.userSettings.showTimezone ? '' : null">Show timezone</fluent-menu-item>
```

## Localization via a transformer

A singleton service holds the dictionaries; a transformer exposes it to every template.

```typescript
@Injectable(true)
export class Localization {
    private readonly DEFAULT_LOCALE = 'en';
    private readonly _currentLocale: string;
    private readonly _localizations = new Map<string, Map<string, string>>();

    constructor(userSettings: UserSettings) {
        this._localizations.set(en[0], new Map(Object.entries(en[1])));
        // …other langs…
        const userLocale = navigator.language.split('-')[0].toLocaleLowerCase();
        this._currentLocale = userSettings.useENLocalization
            ? this.DEFAULT_LOCALE
            : (this._localizations.has(userLocale) ? userLocale : this.DEFAULT_LOCALE);
    }

    public get(key: string, ...args: Array<any>): string {
        const value = this._localizations.get(this._currentLocale)!.get(key);
        if (Helpers.isUndefined(value)) { console.error(`No localized value found for '${key}'`); }
        return args.length > 0 ? Helpers.format(value!, ...args) : value!;
    }
}

@Transformer()
export class Localize {
    constructor(private _localization: Localization) { }
    public transform(key: string, ...args: Array<any>): string { return this._localization.get(key, ...args); }
}
```

Language files export a `[locale, dictionary]` tuple: `export const LOCALE: [string, {[k: string]: string}] = ['en', { … }];`

Usage — prefer the `#` prefix, since translations never change at runtime:
```html
<span nb-value="#localize('rateApp_body_text')"></span>
<fluent-button>{{#localize('rateApp_link_text')}}</fluent-button>
<div nb-aspect:tooltip="#{text: localize('settings_tooltip'), placement: 'left'}"></div>
```

`Localize` must be listed in `@AppRoot`'s dependencies — it is never referenced from TypeScript.

## Shared styles via adopted stylesheets

Register once, adopt per component. `$AdoptedStyle` returns the name, so registration and reference
collapse into one expression.

```typescript
// index.ts — register globally
@AppRoot({ showDebugInfo: true },
    [$AdoptedStyle('shared-components', sharedComponentsStyle),
     $AdoptedStyle('video-controls', videoControlsStyle)],
    LandingPage, FluentIcon, Tooltip, Localize)
export class App { }
```

```typescript
// consume by name
@Component(html, css, ['shared-components'], TimezoneScheduler)
export class TimezoneSchedulers { }
```

```typescript
// register-and-adopt in one place (icon sets)
@Component('', css, [$AdoptedStyle('icons-filled', filled), $AdoptedStyle('icons-regular', regular)])
export class FluentIcon { }
```

A component with no markup of its own (`@Component('', css, …)`) is the idiomatic pure-styling
element — `<fluent-icon type="regular" icon="settings_24">` is just CSS keyed off attributes.

## Injecting a global theme with raw CSSStyleSheet

For document-level variables that must exist before any component renders, push stylesheets directly
in the `@AppRoot` constructor:

```typescript
@AppRoot({ showDebugInfo: true }, '/#[page=main]', Main, FluentIcon, Tooltip, Localize)
export class App {
    constructor() {
        this.addAdoptedStylesheets(`html {
            ${this.getStyleVars(webLightTheme)}
            @media (prefers-color-scheme: dark) { ${this.getStyleVars(webDarkTheme)} }
        }`);
        ButtonDefinition.define(FluentDesignSystem.registry);   // register third-party elements
        TextInputDefinition.define(FluentDesignSystem.registry);
    }

    private getStyleVars(theme: Theme & {[key: string]: number | string}): string {
        return Object.getOwnPropertyNames(theme).map(el => `--${el}: ${theme[el]};`).join(' ');
    }

    private addAdoptedStylesheets(...data: Array<string>): void {
        for (const el of data) {
            const sheet = new CSSStyleSheet();
            sheet.replaceSync(el);
            document.adoptedStyleSheets.push(sheet);
        }
    }
}
```

## Integrating third-party web components

Third-party custom elements are ordinary DOM elements to nuBond — bind them with `nb-attr`, `nb-prop`,
`nb-event` and capture instances with `nb-bound`.

```html
<fluent-text-input nb-event:input:100="event.stopPropagation()"
                   nb-event:click="this.togglePopover(true)"
                   nb-attr:placeholder="this.placeholder"
                   nb-attr:control-size="#this.size"
                   nb-bound="this.textInput = nativeElement"
                   autocomplete="off" appearance="underline">
    <fluent-icon slot="end" type="regular" icon="chevron_down_20"></fluent-icon>
</fluent-text-input>
```

```typescript
private _textInput: TextInput | undefined;
public get textInput(): TextInput | undefined { return this._textInput; }
public set textInput(value: TextInput | undefined) {   // setter runs once, on bind
    this._textInput = value;
    this.updateInputState();
}
```

Define the third-party elements in the `@AppRoot` constructor so they exist before templates render.
Static attributes (`slot`, `role`, `appearance`) stay as plain HTML attributes.

## Input via getter/setter pair

A property setter is the hook for reacting to `nb-in` updates without a lifecycle hook:

```typescript
@Component(html, css)
export class FluentCombobox {
    private _data: Array<IDataItem> | undefined;
    public get data(): Array<IDataItem> | undefined { return this._data?.filter(/* live filtering */); }
    public set data(value: Array<IDataItem> | undefined) {
        this._data = value?.map(el => new DataItem(el.key, el.display, el.selection, el.checked));
        if (!this.popupIsOpen) { this.updateInputState(); }
    }
}
```

A getter that computes on read is fine — it is evaluated on every change-detection pass, so keep it
cheap. Never put `@Detector()`/`@Eventer()` on a getter/setter pair — it is not rejected, it silently
replaces your accessor.

## Parent ↔ child communication

Down — inputs; up — events:

```html
<div nb-repeat="this.schedulerSettings.schedulers">
    <timezone-scheduler nb-if="this.activeIndex == index"
                        nb-in-ref:scheduler="item"
                        nb-in:time="this.time"
                        nb-event:save="this.onSave(data)">
    </timezone-scheduler>
</div>
```

`nb-in-ref` for `item` because it is a class instance with methods (`beginEdit()`, `endEdit()`);
`nb-in` for `time`, a plain cloneable value object. The `nb-if` sits on a child of the repeated
element — never put two visibility handlers (`nb-repeat`, `nb-if`, `nb-switch`) on one element.

```typescript
constructor(private _eventDispatcher: EventDispatcher) { }
public save(): void { this._eventDispatcher.dispatch('save', this.payload); }
```

The parent receives the payload as `data` in the event expression.

## Combining `nb-repeat` with `nb-switch` / `nb-if`

`nb-repeat`, `nb-if` and `nb-switch` all drive the same hidden class, so give each its own element —
the switch (or condition) goes on a child of the repeated row:

```html
<fluent-tab nb-repeat="this.schedulers"
            nb-event:click="this.activeIndex = index">
    <div nb-switch="index">
        <div nb-case="@0">Home tab</div>
        <div nb-default>
            <div nb-switch="!!item?.isDraft">
                <div nb-case="@true"><!-- editor --></div>
                <span nb-case="@false">{{ item?.name }}</span>
            </div>
        </div>
    </div>
</fluent-tab>
```

Use `item?.` on and inside repeated elements — an empty repeat still evaluates its element with `item`
undefined. When the list is large, filter in TypeScript instead of hiding rows with `nb-if`.

## Global templates for repeated markup

Icons and layout tiles that appear across pages are registered once as global templates and injected
with `nb-template`, using projection slots for content:

```typescript
export class TemplatesProvider {
    public static defineTemplates(): void {
        $Template('info-icon', infoIconHtml);
        $Template('left-right-tile', leftRightTileHtml);
    }
}
// index.ts, before @AppRoot is evaluated:
TemplatesProvider.defineTemplates();
```

```html
<!-- left-right-tile.html -->
<div class="d-flex align-items-baseline">
    <h2 nb-project-to="@header"></h2>
    <h4 nb-project-to="@sub-header"></h4>
    <span nb-project-to="@icons"></span>
</div>
<hr />
<div class="row">
    <div class="col" nb-project-to="@content:left"></div>
    <div class="col" nb-project-to="@content:right"></div>
</div>
```

```html
<!-- usage -->
<div class="col" nb-template="@left-right-tile">
    <span nb-projection="@header">Title</span>
    <span nb-projection="@sub-header">Subtitle</span>
    <div nb-projection="@content:left">…</div>
    <div nb-projection="@content:right">…</div>
</div>
```

## Shared base class for containers

Containers may extend a plain (undecorated) base class for shared behavior. Only the leaf class
carries the decorator, and the base's constructor params must be forwarded explicitly.

```typescript
export class BaseTabContainer {
    constructor(private _changeDetector: ChangeDetector, tick: () => void) { }
    public detectChanges(): void { this._changeDetector.detect(); }
}

@Container(html)
export class Basics extends BaseTabContainer {
    constructor(changeDetector: ChangeDetector) {
        super(changeDetector, () => { this.refresh(); this.detectChanges(); });
    }
}
```

DI reads `design:paramtypes` from the **decorated** class, so the derived constructor must declare
every injected type it needs. `@Detector()`/`@Eventer()` on the base class have no effect —
redeclare them on the concrete container.

## Tracking the active child context

`onContainerAttached` fires on the parent with the child's context, which is how a shell drives the
currently routed page:

```typescript
private _currentContainerContext: BaseTabContainer | undefined;

public onContainerAttached(context: IContext): void { this._currentContainerContext = <BaseTabContainer>context; }
public onContainerDetached(context: IContext): void { /* cleanup */ }

public refresh(): void { this._currentContainerContext!.detectChanges(); }
```

These hooks fire for **`nb-container` children only** — never for components. To track a component,
capture it with `nb-bound` on the tag, or have the component announce itself through
`EventDispatcher`.

## High-frequency interaction without change detection

The single most important performance pattern in the production apps. A pointer-drag selection updates
at pointer-move rate; running a change-detection pass per move would be ruinous. Instead:

1. Subscribe with `ElementSubscriptions` — it is a bare `addEventListener` and **never** schedules a
   pass.
2. Reflect state through `ElementInternals.states`, which CSS reacts to via `:host(:state(x))` — no
   attributes written, no bindings re-evaluated.
3. Dispatch a custom event upward only when a *meaningful* state transition happened.

```typescript
import { CustomStateSetMethods } from '@shared/interfaces/CustomStateSetMethods';

@Component(html, css, TimeCell)
export class TimeLine {
    private _internals: ElementInternals;
    private get _internalsStates(): CustomStateSet & CustomStateSetMethods {
        return <CustomStateSet & CustomStateSetMethods>this._internals.states;
    }

    constructor(nativeElement: HTMLElement,          // the host element is injectable
                elementSubscriptions: ElementSubscriptions,
                private _eventDispatcher: EventDispatcher) {
        this._internals = nativeElement.attachInternals();

        elementSubscriptions.subscribe('pointermove', event => {
            const changed = this.tryUpdateSelectionStartOffsetState(this.getMinuteFromOffset(event.offsetX));
            if (changed) { this._eventDispatcher.dispatch('selection-changed', this.selectionData); }
        });
    }

    private tryUpdateSelectionStartOffsetState(minutes: number): boolean {
        if (this.selectionData.startMinutesOffset === minutes) { return false; }

        this._internalsStates.delete(`selection-start-offset-${this.selectionData.startMinutesOffset}`);
        this._internalsStates.add(`selection-start-offset-${minutes}`);
        this.selectionData.startMinutesOffset = minutes;
        return true;
    }
}
```

```scss
:host(:state(selection-started)) { /* … */ }
@for $i from 0 through 23 {
    :host(:state(selection-start-offset-#{$i * 60})) { --start: #{$i}; }
}
```

TypeScript's `CustomStateSet` lib type is incomplete, hence the local helper interface:

```typescript
export interface CustomStateSetMethods {
    add(value: string): void;
    clear(): void;
    delete(value: string): boolean;
    entries(): SetIterator<[string, string]>;
    has(value: string): boolean;
    keys(): SetIterator<string>;
    values(): SetIterator<string>;
}
```

Use `:state()` — not classes — for any visual state that changes faster than user-visible steps, or
that belongs to the component rather than its data.

## Always unsubscribe in `onDispose()`

Any subscription taken in a constructor outlives the context unless you release it. Every production
component that subscribes to a service does this:

```typescript
export class TimeCell {
    private _unSubscribeFromOnSettingsChange: () => void;
    private _unSubscribeFromOnFormatsChange: () => void;

    constructor(userSettings: UserSettings, formatSettings: FormatSettings,
                nativeElement: HTMLElement, changeDetector: ChangeDetector) {
        let highlightWeekends = userSettings.highlightWeekends;

        this._unSubscribeFromOnSettingsChange = userSettings.onChange(() => {
            if (highlightWeekends !== userSettings.highlightWeekends) {   // filter to what you care about
                highlightWeekends = userSettings.highlightWeekends;
                changeDetector.detect();
            }
        });
        this._unSubscribeFromOnFormatsChange = formatSettings.onChange(() => changeDetector.detect());
    }

    public onDispose(): void {
        this._unSubscribeFromOnSettingsChange();
        this._unSubscribeFromOnFormatsChange();
    }
}
```

Note the local-snapshot guard: the service fires for *every* setting, so the callback compares against
a captured value and only calls `detect()` when a relevant field changed. In a list of hundreds of
cells this is the difference between one pass and hundreds.

## Composing child inputs as object literals

`nb-in` deep-clones and deep-compares, so building a fresh object per pass is cheap and idiomatic —
the equality gate absorbs the churn:

```html
<time-cell nb-repeat="this.hoursToShow"
           nb-in:meta-data="{...this.metaData, isFirstCell: (index == 0), isLastCell: (index == count - 1)}"
           nb-in:data="{...this.data, offset: index,
                                      todayDaylightSavingOffset: this.todayDaylightSavingOffset}"
           nb-in:time="this.time">
</time-cell>
```

`nb-repeat="this.hoursToShow"` repeats over a **number** (24 cells). `nb-repeat="@2"` with
`nb-switch="index"` / `nb-case="@0"` / `nb-case="@1"` is the idiom for a fixed set of differing
siblings.

## Memoized getter with explicit invalidation

For derived values that are expensive but change rarely, cache in a private field and clear it from the
input setter — cheaper than recomputing in a getter that is read on every pass:

```typescript
private _todayDaylightSavingOffset: number | undefined;
public get todayDaylightSavingOffset(): number | undefined {
    if (Helpers.isUndefined(this._todayDaylightSavingOffset) && this.data && this.hoursToShow) {
        this._todayDaylightSavingOffset = /* … expensive computation … */;
    }
    return this._todayDaylightSavingOffset;
}

public set data(value: Data | undefined) {
    if (this._data?.timezone?.timezone !== value?.timezone?.timezone) {
        this._todayDaylightSavingOffset = undefined;    // invalidate
    }
    this._data = value;
}
```

Inside a template, prefer `nb-var` for the same job when the value is only needed by one subtree.

## Re-dispatching events across levels

`EventDispatcher` events do not bubble, so a grandchild's event must be relayed at each level. Do it
inline in the template:

```html
<time-line nb-in:data="this.data"
           nb-event:selection-changed="this.eventDispatcher.dispatch('selection-changed', data)">
</time-line>
```

Expose the dispatcher as a public field (`constructor(public eventDispatcher: EventDispatcher)`) to
make this one-liner possible.

## List slicing via transformers

Small pure transformers keep pagination and windowing out of the context class:

```typescript
@Transformer()
export class Take {
    transform(data: Array<any> | undefined, count: number): Array<any> | undefined { return data?.slice(0, count); }
}
```
```html
<item-row nb-repeat="take(this.items, 20)" nb-in-ref:item="item"></item-row>
```

## Values arriving from outside the framework

When data arrives through a callback nuBond does not know about — a host-provided object injected
later, a WebSocket, a third-party SDK — assign it to a `@Detector()` property so no explicit
`detect()` is needed:

```typescript
@Detector()
public isBannerVisible = false;

constructor(externalBridge: ExternalBridge) {
    externalBridge.onReady(api => {
        this.isBannerVisible = api.isBannerVisible;   // assignment → change detection
    });
}
```

## Controlling binding cost in a large app

Every unprefixed binding re-runs on every pass of its binder, so in a big UI the expression count per
pass *is* the performance budget. Measure it, and keep it under a number you guard.

- **Prefix whatever cannot change.** `#` for values resolved once (`#localize('key')`, tables built in
  a constructor and never replaced, all-literal aspect data `nb-aspect:numeric="#{min: 0, max: 100}"`),
  `@` for literals (`nb-aspect:tooltip="@Delete item"`). This routinely halves the count.
- **But not inside rows that change.** `#` freezes per row *position*; lists whose shape changes
  (user-reorderable tabs, dynamic form fields) stay continuous. Where that costs too much, hoist the
  constant out of the template instead: build each row's display object (localized title, tooltip
  object) once in TypeScript and bind to that stable reference.
- **Don't put `#` on `nb-repeat` itself** — it saves one expression and stops the row count updating.
- **Empty what nobody can see.** A popover/menu that lives in the DOM permanently (not under an
  `nb-if`) binds every pass even while closed — assign its rows when it opens and clear them when it
  closes.

## Render every variant, show one

Because hidden children are not evaluated (and not even built until first shown), keeping every
variant in the DOM behind `nb-switch`/`nb-if` is cheap and preserves each variant's controls and
state between visits:

```html
<div nb-switch="this.activePane">
    <section nb-case="@general">…</section>
    <section nb-case="@appearance">…</section>
    <section nb-case="@advanced">…</section>
</div>
```

The alternative — one `nb-repeat` whose array is swapped per pane — makes the repeat reuse its rows
by index, rewriting every control on screen into a control of some other kind (thousands of DOM
mutations, lost focus). Two consequences of the switch approach to design for: a pane's controls exist
once per pane that has been visited (query the *visible* one — `checkVisibility()`), and a component
in several cases is several live instances whose service subscriptions all fire — have off-screen
instances bail out early.

## Drag and other continuous gestures

`dragover`/`pointermove` fire continuously and every `nb-event` firing schedules a pass of the whole
binder. Wire gestures with **one delegated set of listeners** on the container root
(`ElementSubscriptions.subscribe` on a component, or `addEventListener` in `nb-bound`), and during the
gesture touch only the DOM:

- Move things with direct `element.style` writes, and mark drop targets with a **`data-*` attribute**
  (a class written by hand on an `nb-class` element is wiped on the next commit).
- Commit to the model once, on release, then call `detect()`.
- If the gesture ends without a model change, write the model's value back to the styles you touched
  — `nb-style` never saw the direct writes and won't restore them.

## Stable row objects

`nb-repeat` deep-compares each row's `item` every pass, re-subscribes a row's events when its item
stops being deep-equal (cancelling pending debounces), and reuses rows by index. So:

- Keep row objects **small plain data** (not rich domain models with back-references or functions).
- **Keep row objects between refreshes** when rows debounce events; rebuilding them every `sync()`
  means a debounced `nb-event` in the row never fires.
- **Assign a new array when the view changes** (tab switch, filter change) instead of filtering inside
  the template, which would rebuild the repeat every pass.
- Selection state that the row's DOM shows is easiest as an attribute (`aria-checked`,
  `aria-selected`) bound with `nb-attr`.
