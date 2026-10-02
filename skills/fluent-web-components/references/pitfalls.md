# Pitfalls and gotchas

Ordered roughly by how often they bite and how hard they are to diagnose. Every entry was verified
against **3.1.3**, by reading the shipped `dist/esm` source and, for behaviour, by running it in Chrome.

**Check the installed version first** (`npm ls @fluentui/web-components`). Projects pinned to a
`3.0.0-rc.*` build behave differently in places. In `3.0.0-rc.6`, for example, the tablist reassigns tab ids by index on
every update and logs `disabled …` to the console, a menu item's `end` slot renders *before* the label,
and the all-in-one bundle exposes no global `Fluent.setTheme`. Upgrade, or read that version's
`dist/esm/<name>/` source before trusting anything here.

## 1. Nothing is styled — you forgot `setTheme()`

All component styling reads CSS custom properties that only exist once a theme is applied. Without
`setTheme()`, components render as unstyled or invisible boxes with no error in the console.

```js
import { setTheme } from '@fluentui/web-components';
import { webLightTheme } from '@fluentui/tokens';
setTheme(webLightTheme);
```

Call it once, at app root, before or at first paint. If you used the all-in-one bundle
(`web-components.js`) there are no named exports — use the global instead: `Fluent.setTheme(theme)`.

## 2. Two tag names in the shipped manifest are wrong

The bundled `custom-elements.json` (still the case in **3.1.3**) disagrees with the actual dist for two elements.
The manifest is stale; the tags below are what the package really registers (verified against
`dist/esm/<name>/<name>.options.js` — the manifest even points at directories that 404 on the CDN):

| Manifest says | Real tag | Real import |
| --- | --- | --- |
| `fluent-text-area` | **`fluent-textarea`** | `@fluentui/web-components/textarea.js` |
| `fluent-dropdown-option` | **`fluent-option`** | `@fluentui/web-components/option.js` |

If you generated types or editor completions from the CEM, these two will be wrong. An unknown
`<fluent-text-area>` renders as an inert unstyled element — no error.

## 3. Combobox and Split Button are not elements

`<fluent-combobox>` and `<fluent-split-button>` do not exist and never get defined. The Storybook lists
them as their own pages, but they are compositions:

- Combobox → `<fluent-dropdown type="combobox">`
- Split Button → `<fluent-menu split>` with `slot="primary-action"` + `slot="trigger"`

## 4. `size` vs `control-size` on text input

`<fluent-text-input>` has **both**, and they mean different things:

- `control-size="small|medium|large"` — the visual size. This is almost always what you want.
- `size="20"` — the native HTML character-width attribute.

`size="large"` silently does nothing useful. Note this is text input only: `fluent-textarea` uses plain
`size`, as does nearly every other component.

## 5. Registering a parent does not register its children

Side-effect imports define exactly one element. These composites need every tag imported:

| Composite | Also register |
| --- | --- |
| `fluent-tablist` | `fluent-tab` |
| `fluent-menu` | `fluent-menu-list`, `fluent-menu-item`, and a trigger (`fluent-menu-button`) |
| `fluent-dropdown` | `fluent-listbox`, `fluent-option` |
| `fluent-dialog` | `fluent-dialog-body` |
| `fluent-drawer` | `fluent-drawer-body` |
| `fluent-tree` | `fluent-tree-item` |
| `fluent-accordion` | `fluent-accordion-item` |
| `fluent-radio-group` | `fluent-radio` |

An unregistered tag renders its children as unstyled light DOM. Symptom: the content is there, the
component chrome isn't.

## 6. The dropdown needs its listbox wrapper

Options must sit inside `<fluent-listbox>`, not directly in the dropdown:

```html
<!-- broken: renders the options inline, with no popup -->
<fluent-dropdown><fluent-option>A</fluent-option></fluent-dropdown>

<!-- right -->
<fluent-dropdown><fluent-listbox><fluent-option>A</fluent-option></fluent-listbox></fluent-dropdown>
```

The listbox **is** the popup surface: when the dropdown binds it, it sets `popover = 'manual'` and the
anchor-positioning styles on that element. The failure is confusing because the dropdown's `options` and
`enabledOptions` getters fall back to `querySelectorAll` over its descendants, so the options are still
found and selectable — there is simply no popover to open, and they sit visible in the page.

## 7. Label placement differs across the three text-ish controls

This is the most common accessibility bug in Fluent v3 forms:

| Control | Where the label goes |
| --- | --- |
| `fluent-text-input` | **default slot of the input itself** — it renders inside the element's own `<label for="control">` |
| `fluent-textarea` | the **textarea's** `slot="label"` |
| everything else (checkbox, radio, switch, slider, dropdown) | the **field's** `slot="label"` |

Using the field's label slot for a text input is specifically called out as breaking zoom text and
screen reader behaviour.

## 8. Boolean attributes in frameworks

HTML booleans are presence-based: `disabled="false"` is **truthy**. Frameworks that stringify bound
values will produce exactly that.

- **Vue**: `:disabled="isDisabled || null"` — `null` removes the attribute.
- **Angular**: `[attr.disabled]="isDisabled ? '' : null"`.
- **React 18 and earlier**: `disabled={isDisabled ? '' : undefined}`.
- **React 19+**: booleans are handled correctly on custom elements.

The one component where the polarity itself is inverted: `fluent-text` uses `nowrap` (Fluent React v9
calls it `wrap`), because an HTML boolean can't default to true.

## 9. Custom events don't cross React 18's synthetic event system

`onChange={…}` on a `<fluent-dropdown>` in React ≤18 never fires. Attach with `addEventListener` on a
ref, or upgrade to React 19. Angular `(change)` and Vue `@change` work because they bind native listeners.

## 10. Some state is property-only, with no attribute

Setting these as HTML attributes does nothing — assign the JS property:

- `checkbox.indeterminate = true` (`@observable`, not an attribute; there is an
  `indeterminate-indicator` slot but no `indeterminate` attribute)
- `listbox` has no attributes at all; the dropdown drives it
- `tablist.activetab` is read-only output — set `activeid` to control the active tab

## 11. Tab panels need `aria-controls`, or nothing happens

There is no `fluent-tab-panel` element, so it's easy to assume you must wire panels manually. You don't —
but only if each `<fluent-tab>` carries `aria-controls="<panel-id>"` referencing an element in the same
root node. The tablist then sets `role="tabpanel"` and toggles `hidden` as the active tab changes.

Omit `aria-controls` and you get a tab strip that changes `aria-selected` and emits `change` while every
panel stays visible. Either add it, or handle `change` yourself.

## 12. Popover and anchor positioning need polyfills on older browsers

Baseline: popover needs Chrome/Edge 114, Firefox 125, Safari 17. CSS anchor positioning needs
Chrome/Edge 125, Firefox 147, Safari 26 — much newer.

Without anchor positioning, components degrade unevenly:

- The **dropdown/combobox listbox** falls back to absolute positioning below the control, with a flip
  state. It works, but it is cruder.
- **Submenus** get a small JS fallback.
- The **tooltip** is the only component that calls the `window.CSS_ANCHOR_POLYFILL` hook. Without a
  polyfill, tooltips are positioned incorrectly.

Install `@oddbird/css-anchor-positioning` and set the hook before any tooltip is shown. Loading it
before Fluent UI, as the upstream docs say, is the simple way to guarantee that. See `setup.md`.

## 13. Don't use CSS variables directly

`var(--colorNeutralForeground1)` works today but the variable layer is explicitly documented as internal
and subject to renaming or hashing. Import the `tokens` object from `@fluentui/tokens` instead.

## 14. Don't hardcode a high-contrast theme

`teamsHighContrastTheme` is legacy. Every component supports Windows High Contrast mode automatically
under any theme; forcing the HC theme breaks users who rely on the OS setting.

## 15. `icon-only` buttons need an explicit label

`icon-only` removes the text but not the need for an accessible name:

```html
<fluent-button icon-only aria-label="Delete"><svg aria-hidden="true" …></svg></fluent-button>
```

Mark the SVG `aria-hidden="true"` so it isn't announced twice.

## 16. `disabled` vs `disabled-focusable` on buttons

A `disabled` button is removed from the tab order and is invisible to screen reader users navigating by
keyboard. `disabled-focusable` keeps it focusable and announced while still blocking activation — prefer
it in toolbars, menus, and anywhere the user needs to discover why an action is unavailable.

## 17. The `dismiss` event doesn't dismiss anything

`<fluent-message-bar>` emits `dismiss` as a notification. Removing or hiding the bar is your code's job.

## 18. Opting out of the focusgroup polyfill

`MenuList`/`MenuItem`, `RadioGroup`/`Radio`, `Tablist`/`Tab`, and `Tree`/`TreeItem` auto-apply
`@microsoft/focusgroup-polyfill` on connect. If it conflicts with your own key handling, extend the base
class instead of the Fluent class:

```js
import { BaseTablist } from '@fluentui/web-components/tablist/base.js';
export class MyTablist extends BaseTablist {}
```

## 19. Storybook documents `master`, npm ships the release

<https://storybooks.fluentui.dev/web-components/> is built from the repo's `master` branch, which can be
ahead of the published package. When a documented attribute doesn't exist at runtime, check the installed
version's `dist/esm/<component>/<component>.options.js` for the real `tagName` and enum values — that
file is the ground truth, ahead of both the Storybook and the bundled manifest.

Read an enum's **keys** as well as its values. For most enums the two are identical. The exception
is `TooltipPositioningOption`, where the attribute takes the key (`below`) and the value is the CSS
it produces (`block-end`). See #22.

---

The remaining entries are about **driving controls from code**: framework bindings, controlled
components, re-renders. Each one fails silently.

## 20. Programmatic writes echo `change`, so guard every handler

`fluent-slider` emits `change` on **every** `value` assignment: from code, with the value it already
has, and on connect when it gives itself a default (the midpoint). There is no `input` event. A
framework binding that writes the model into the slider and listens to `change` therefore feeds every
render back into the model. That means spurious undo entries, re-run previews, and a stale value
overwriting a newer one.

Guard handlers on **what the control was last given**, not on the current model:

```js
let lastWritten;
function render(v) { lastWritten = v; slider.value = String(v); }
slider.addEventListener('change', () => {
  const v = Number(slider.value);
  if (Math.abs(v - lastWritten) < step / 2) return;   // compare detents, not doubles
  model.set(v);
});
```

Compare within half a step. The slider snaps to `min + round((v - min) / step) * step`, so given 1.81
it reports `1.8099999999999996`, and `===` treats that as a change.

`fluent-dropdown` does **not** emit `change` when `value` is assigned (only on user selection), but the
same guard costs nothing there and protects against option lists being rebuilt under a bound value.

## 21. Order matters when setting a range

The slider clamps `value` to whatever `min`/`max` it has *at that moment* and writes the clamped
result back. `value = 500` followed by `max = 1000` leaves `100`. Bind `min`, `max` and `step` first,
then `value`. A value outside the range assigned **before** the element connects isn't clamped; it is
replaced by the midpoint.

## 22. Tooltip `positioning` takes the keys, not CSS values

`positioning="below"` works. `positioning="block-end"`, the CSS value it maps to, matches no selector
and the tooltip silently opens `above`. Two more silent failures:

- The anchor is resolved **once, on connect**. If the anchor is added after the tooltip, the tooltip
  never binds to it (no `aria-describedby`, no hover).
- The anchor id is interpolated raw into a generated CSS rule, so `save.btn`, `a:b` or `1st` pins
  the tooltip at the page's top-left corner. Use ids that are valid CSS identifiers.

## 23. Clicks on an option's children don't select it

The dropdown's click handler selects only when `event.target` *is* the `fluent-option`. Any element
inside the option takes the click instead: a `<span>` your framework wraps text in, a `slot="start"`
icon, a `slot="description"` line. The popup stays open and nothing is selected. Fix:

```css
fluent-option > * { pointer-events: none; }
```

Template interpolation that compiles to a wrapper element (common in template libraries) runs into
this even when the source looks like plain text. Also, the displayed label is read from the `text`
attribute, falling back to `textContent`, and `textContent` isn't observed. If labels change after
render, set `text`.

## 24. The dropdown cannot take a value in the tick it is created

`dropdown.value = 'x'` in the same task that inserts the element throws
`Cannot read properties of undefined (reading 'selectOption')`, because the listbox isn't bound yet.
Mark the option `selected` in markup, or assign after `requestAnimationFrame`. And with `multiple`,
the `value` setter is a no-op, so drive `selected` on the options.

## 25. `fluent-tablist` raises `change` nobody asked for

`change` fires (twice, naming the still-active tab) whenever tabs are added or removed, and when
`orientation` or `disabled` changes. For a tab strip whose tabs come and go, `change` can't tell those
events from a user's click. Take selection from `click`/`keyup` on the tablist instead, and write
`activeid` yourself.

Also, setting `tablist.disabled = false` re-enables **every** tab, including ones that were
individually `disabled`. Reapply per-tab `disabled` afterwards.

## 26. `fluent-toggle-button` flips itself

A click toggles `pressed` before your handler sees it, and `preventDefault()` doesn't stop that. In
a controlled component, assign `pressed` from the model after every click, or the button keeps a
state the model refused. For one-of-many choices, use plain `fluent-button`s with a bound `appearance`.

## 27. Submenus: slot a `fluent-menu-list`, not a `fluent-menu`

A menu item makes whatever element sits in its `submenu` slot the popover. A `fluent-menu-list`
styles over the UA's `[popover]` defaults. A wrapping `fluent-menu` has no styles of its own, so it
opens with a **3px black border, white `Canvas` background and padding**, and ArrowRight no longer
moves focus into it.

## 28. Two context menus can be open at once

A `fluent-menu` with `open-on-context` closes from a document `click` listener, and a right click
raises no `click`. Right-clicking a second context-menu trigger therefore leaves the first one open.
If you have several, close the others yourself from a capture-phase `contextmenu` listener.

## 29. An outside `display` on a popover defeats its hiding

The rules that hide a closed popover (the UA's `[popover]:not(:popover-open)` and Fluent's
`::slotted([popover]:not(:popover-open))`) lose to any normal declaration from an outer tree. A
`display: flex` you put on a `fluent-listbox` or submenu list renders it permanently, inside its parent.
Scope layout to `:popover-open`:

```css
fluent-menu-list[popover]:popover-open { display: flex; flex-direction: column; }
```

## 30. `fluent-textarea` reads its children as its value, and `spellcheck="false"` enables spelling

Default-slot content becomes the initial value on connect, so keep the element empty and set the
`value` property. `spellcheck` is a boolean attribute, so `spellcheck="false"` is still *present* and
switches checking **on**. Put `spellcheck="false"` on a light-DOM ancestor instead; the setting
inherits into the shadow root. There is no `rows`. Size it with `--min-block-size`.

## 31. `fluent-text-input` drops `min`, `max` and `step`

`type="number"` works (it is passed through to the inner `<input>`), but `min`, `max` and `step` aren't
declared or forwarded, so the control keeps step 1 and no bounds. Set them on
`el.shadowRoot.querySelector('input')`. Its `change` is a **composed** `CustomEvent`, so it escapes any
shadow root you nest it in and reaches the host's own `change` listeners.

## 32. Fixed sizes you can't override from outside

These live on elements inside the shadow root that no part exposes:

- `fluent-dropdown`'s control has `min-width: 160px`, so it overflows narrower containers.
- A `size="small"` dropdown is **26px** tall, next to a 24px small text input.
- `fluent-dialog-body` stacks its action buttons below a 480px container width.
  (`::part(actions)` *is* exposed, so this one can be fixed from outside.)

To fix the first two, register the element yourself with an extra stylesheet, *instead of*
importing `dropdown.js`:

```js
import { Dropdown, DropdownDefinition } from '@fluentui/web-components/dropdown/index.js';

Dropdown.define({
  ...DropdownDefinition,
  styles: [DropdownDefinition.styles, `
    .control { min-width: 0; }
    :host([size='small']) .control { height: 24px; padding-block: 0; align-items: center; }
  `],
});
```

The same pattern (`<Name>.define({ ...<Name>Definition, styles: [...] })`) works for any component
whose internals you need to reach. Import nothing that registers the tag first, because a custom
element can only be defined once.

## 33. `setTheme` silently drops some token values (3.1.2+)

Since 3.1.2 the theme writer drops any value containing `;`, `{`, `}`, comment markers, `@import`,
`url(`, `expression(` or `javascript:`, and any token name that isn't a plain identifier. A custom
theme whose token is a `url(...)` or a multi-declaration string loses that token without warning.
