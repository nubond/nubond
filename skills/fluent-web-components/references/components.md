# Component API reference — all 42 elements

Conventions used below:

- **Attributes** are the HTML attribute names (kebab-case). Enumerated values are listed exhaustively;
  anything not listed is invalid and will fall back to the default styling.
- Boolean attributes are presence-based: write `disabled`, not `disabled="true"`.
- **Slots** take light-DOM children with `slot="<name>"`. `(default)` means unnamed children.
- 19 components also ship an unstyled base class for extension
  (`@fluentui/web-components/<name>/base.js`). `setup.md` lists them. For the rest, extend `class.js`.
- Verified against **3.1.3**. The public API (tags, attributes, enums, slots, parts, events) is identical
  in 3.0.3 and 3.1.3. Pre-release `3.0.0-rc.*` builds differ in places (see `pitfalls.md`).

---

## Actions

### `<fluent-button>`

| Attribute | Values |
| --- | --- |
| `appearance` | `primary` `outline` `subtle` `transparent` |
| `shape` | `circular` `rounded` `square` |
| `size` | `small` `medium` `large` |
| `icon-only` | boolean |
| `disabled` | boolean |
| `disabled-focusable` | boolean — stays focusable and announced while disabled (prefer this over `disabled` for toolbar/menu items) |
| `type` | `submit` `reset` `button` |
| `name`, `value`, `form` | form association |
| `formaction`, `formenctype`, `formmethod`, `formnovalidate` | form submission overrides |
| `formtarget` | `_blank` `_self` `_parent` `_top` |

Slots: `(default)`, `start`, `end`. CSS parts: `content`. Methods: `press()`, `resetForm()`.

```html
<fluent-button appearance="primary">Save</fluent-button>
<fluent-button icon-only aria-label="Delete"><svg …></svg></fluent-button>
<fluent-button appearance="outline"><svg slot="start" …></svg>Download</fluent-button>
```

### `<fluent-anchor-button>`

A link styled as a button. Same `appearance` / `shape` / `size` / `icon-only` as Button, plus the anchor
attributes: `href`, `download`, `hreflang`, `ping`, `referrerpolicy`, `rel`, `type`, and
`target` (`_self` `_blank` `_parent` `_top`).

It is an anchor, not a button: it has **no `disabled`, `type`, `value`, `name`, or `form*` attributes** and
takes no part in form submission. To disable a navigation, remove `href` or use a real `fluent-button`.

Slots: `(default)`, `start`, `end`. CSS part: `content`.

```html
<fluent-anchor-button href="/docs" appearance="primary">Read the docs</fluent-anchor-button>
```

### `<fluent-compound-button>`

Button with a secondary description line. **Exactly** the Button attribute set (`appearance`, `shape`,
`size`, `icon-only`, `disabled`, `disabled-focusable`, `type`, `name`, `value`, `form`, `form*`).
Slots: `(default)`, **`description`**, `start`, `end`. CSS part: `content`.

```html
<fluent-compound-button appearance="primary">
  Create account
  <span slot="description">No credit card required</span>
</fluent-compound-button>
```

### `<fluent-toggle-button>`

The full Button attribute set, plus:

| Attribute | Values |
| --- | --- |
| `pressed` | boolean — the toggled state |
| `mixed` | boolean — indeterminate; **takes precedence over `pressed`** |

Slots: `(default)`, `start`, `end`. CSS part: `content`.

A click toggles `pressed` **by itself**, and `preventDefault()` doesn't stop that. In a controlled
component where the model may refuse the change, assign `pressed` back from the model after every
click. Otherwise the button stays showing a state the model never took.

```html
<fluent-toggle-button pressed appearance="subtle" icon-only aria-label="Bold">
  <svg …></svg>
</fluent-toggle-button>
```

### `<fluent-menu-button>`

A Button that renders a menu chevron. **Exactly** the Button attribute set, slots (`(default)`, `start`,
`end`), and CSS part (`content`). Intended for the `trigger` slot of `<fluent-menu>` — see `patterns.md`.

---

## Text and content

### `<fluent-text>`

| Attribute | Values |
| --- | --- |
| `size` | `100` `200` `300` `400` `500` `600` `700` `800` `900` `1000` |
| `weight` | `regular` `medium` `semibold` `bold` |
| `font` | `base` `numeric` `monospace` |
| `align` | `start` `end` `center` `justify` |
| `nowrap` `truncate` `italic` `underline` `strikethrough` `block` | boolean |

`nowrap` is inverted relative to Fluent React v9's `wrap` prop — HTML booleans can't default to true.

```html
<fluent-text size="500" weight="semibold" block>Section heading</fluent-text>
<fluent-text size="200"><p>Body copy inside a real paragraph element.</p></fluent-text>
```

Wrap semantic HTML in the default slot — `fluent-text` styles its children rather than replacing them.

### `<fluent-label>`

`size`: `small` `medium` `large` · `weight`: `regular` `semibold` · `disabled`, `required` (boolean).
CSS part: `asterisk`.

### `<fluent-link>`

`appearance`: `subtle` (only value) · `inline` (boolean) · plus all anchor attributes
(`href`, `target`, `rel`, `download`, `hreflang`, `ping`, `referrerpolicy`, `type`).
Slot: `(default)` only. There are no `start`/`end` slots and no CSS parts. For an icon link, put the SVG
in the default slot or use `fluent-anchor-button`.

Use `inline` when the link sits inside running text.

### `<fluent-image>`

`fit`: `none` `center` `contain` `cover` · `shape`: `circular` `rounded` `square` ·
`block`, `bordered`, `shadow` (boolean).

Default slot accepts an `<img>`, `<picture>`, `<video>`, or `<canvas>` — the element styles what you give it.

```html
<fluent-image shape="rounded" bordered fit="cover" style="width:200px;height:120px">
  <img src="…" alt="…" />
</fluent-image>
```

### `<fluent-divider>`

`orientation`: `horizontal` `vertical` · `appearance`: `strong` `brand` `subtle` ·
`align-content`: `center` `start` `end` · `inset` (boolean) · `role`: `separator` `presentation`.

Slot: `(default)` — optional label content shown inline with the rule. **Wrap it in an element**; bare
text nodes are not rendered.

```html
<fluent-divider align-content="center"><span>or</span></fluent-divider>
```

Use `role="presentation"` for purely decorative dividers.

### `<fluent-avatar>`

| Attribute | Values |
| --- | --- |
| `size` | `16` `20` `24` `28` `32` `36` `40` `48` `56` `64` `72` `96` `120` `128` |
| `shape` | `circular` `square` |
| `active` | `active` `inactive` |
| `appearance` | `ring` `shadow` `ring-shadow` — applies when `active="active"` |
| `color` | `neutral` `brand` `colorful` |
| `color-id` | one of 30 named colors, used with `color="colorful"` |
| `name` | drives generated initials and the accessible name |
| `initials` | override the generated initials |

`color-id` values: `dark-red` `cranberry` `red` `pumpkin` `peach` `marigold` `gold` `brass` `brown`
`forest` `seafoam` `dark-green` `light-teal` `teal` `steel` `blue` `royal-blue` `cornflower` `navy`
`lavender` `purple` `grape` `lilac` `pink` `magenta` `plum` `beige` `mink` `platinum` `anchor`.

Slots: `(default)` — an `<img>` (or other media) to display instead of initials; `badge` — typically a
`<fluent-badge>` presence indicator.

```html
<fluent-avatar name="Ada Lovelace" size="48" color="colorful"></fluent-avatar>
<fluent-avatar size="32"><img src="…" alt="Ada Lovelace" /></fluent-avatar>
```

### `<fluent-badge>`

`appearance`: `filled` `ghost` `outline` `tint` ·
`color`: `brand` `danger` `important` `informative` `severe` `subtle` `success` `warning` ·
`shape`: `circular` `rounded` `square` ·
`size`: `tiny` `extra-small` `small` `medium` `large` `extra-large`.
Slots: `(default)`, `start`, `end`.

### `<fluent-counter-badge>`

Same `color` set as Badge. `appearance`: `filled` `ghost` · `shape`: `circular` `rounded` ·
same `size` set as Badge, plus:

| Attribute | Meaning |
| --- | --- |
| `count` | number (default `0`) |
| `overflow-count` | number (default `99`) — renders `99+` past this |
| `show-zero` | boolean — otherwise hidden at 0 |
| `dot` | boolean — render as a dot, hiding the count |

Slots: `start`, `end` — **no default slot**. Unlike `fluent-badge`, the content is computed from `count`,
`overflow-count`, and `dot`; children placed in the default slot are dropped.

### `<fluent-rating-display>`

`color`: `neutral` `brand` `marigold` (default) · `size`: `small` `medium` (default) `large` ·
`value` (number) · `max` (whole number > 1, sets icon count) · `count` (number of ratings) ·
`compact` (boolean — one filled icon plus a label).
Slots: `icon` — an `<svg>` to use as the rating glyph; `value` and `count` — override the rendered value
and count labels (both default to `aria-hidden` spans).

`icon-view-box` is **deprecated** — put the `viewBox` attribute on your slotted `<svg>` directly.

Display only; there is no interactive rating input component.

### `<fluent-spinner>`

`size`: `tiny` `extra-small` `small` `medium` `large` `extra-large` `huge` ·
`appearance`: `primary` `inverted`. Slot: `indicator` — replace the default spinner glyph.

### `<fluent-progress-bar>`

`value`, `min`, `max` (numbers — omit `value` for indeterminate) ·
`thickness`: `medium` `large` · `shape`: `rounded` `square` ·
`validation-state`: `success` `warning` `error` (default `null`). CSS part: `indicator`.

---

## Forms

### `<fluent-field>`

The layout + accessibility wrapper for a labelled control.

`label-position`: `above` (default) `after` `before`.
Slots: `label`, `input`, `message`. CSS parts: `label`, `input`, `message`.

Use `label-position="after"` for checkbox/radio/switch rows. See `patterns.md` for the
text-input/textarea exception and for validation messages.

### `<fluent-text-input>`

| Attribute | Values |
| --- | --- |
| `appearance` | `outline` `underline` `filled-lighter` `filled-darker` |
| **`control-size`** | `small` `medium` `large` — **this is the visual size** |
| `size` | number — native character-width attribute, *not* the visual size |
| `type` | `text` `email` `password` `tel` `url` |
| `value`, `current-value` | initial / live value |
| `placeholder`, `name`, `form`, `list`, `pattern`, `dirname`, `autocomplete` | native semantics |
| `maxlength`, `minlength` | numbers |
| `disabled`, `readonly`, `required`, `multiple`, `spellcheck` | boolean |

Slots: `(default)` — **the label**, `start`, `end`. Events: `change`, `select`.
CSS parts: `label`, `root`, `control`. Methods: `select()`, `checkValidity()`, `reportValidity()`, `setCustomValidity()`.

The default slot is rendered inside the element's own `<label for="control">`, so put the label text there:

```html
<fluent-text-input appearance="outline" control-size="large" required>Email address</fluent-text-input>
```

- `type="number"` works at runtime (it is passed straight to the inner `<input>`), even though it is
  missing from `TextInputType`. **`min`, `max` and `step` are not forwarded**, though. Set them on the
  inner input yourself (`el.shadowRoot.querySelector('input')`).
- `change` is re-emitted as a **composed, bubbling `CustomEvent`**. It crosses shadow boundaries, so an
  outer component's own `change` listener on its host also receives it.
- Style the text through `::part(control)` (`text-align`, `font-size`, `font-family`) and the box
  through `::part(root)`. Rules on the host don't reach either. The smallest size is 24px tall.

### `<fluent-textarea>`

Tag is `fluent-textarea` (one word).

| Attribute | Values |
| --- | --- |
| `appearance` | `outline` `filled-lighter` `filled-darker` |
| `size` | `small` `medium` `large` |
| `resize` | `none` `both` `horizontal` `vertical` |
| `autocomplete` | `on` `off` |
| `auto-resize` | boolean — grow with content |
| `display-shadow` | boolean — only affects `filled-*` appearances |
| `block`, `disabled`, `readonly`, `required`, `spellcheck` | boolean |
| `maxlength`, `minlength` | numbers |
| `placeholder`, `name`, `form`, `dirname` | native semantics |

Slots: **`label`** (unlike text input), `(default)` = the value. Events: `change`, `select`.
CSS parts: `label`, `root`, `control`.

- **Default-slot text is read as the initial value** on connect. If a framework renders whitespace or
  children there, that becomes the value. Keep it empty and set the `value` property.
- There is no `rows`. Set the height with the `--min-block-size` custom property (default 52px, 40px
  at `size="small"`), and include the padding in that number.
- It is `inline-block` with an 18rem default width. Add `block` to make it fill its container.
- **`spellcheck="false"` turns spell checking *on*.** The attribute is a boolean, so it is either
  present or absent. To turn checking off, put `spellcheck="false"` on a light-DOM ancestor; the
  setting inherits across the shadow boundary. (`fluent-text-input` parses the string, so
  `spellcheck="false"` works there.)

```html
<fluent-textarea appearance="filled-darker" auto-resize resize="vertical">
  <fluent-label slot="label">Notes</fluent-label>
</fluent-textarea>
```

### `<fluent-checkbox>`

`shape`: `circular` `square` · `size`: `medium` `large` ·
`checked`, `disabled`, `required` (boolean) · `value` (default `'on'`) · `name`, `form`.
Slots: `checked-indicator`, `indeterminate-indicator`. Events: `change`, `input`.
Methods: `toggleChecked()`, `checkValidity()`, `reportValidity()`, `setCustomValidity()`.

Indeterminate is set via the `indeterminate` **property** in JS, not an attribute.

### `<fluent-radio>` / `<fluent-radio-group>`

`fluent-radio`: `checked`, `disabled`, `required` (boolean) · `value` · `name`, `form`.
Slot: `checked-indicator`. Events: `change`, `input`, and `disabled` (a bubbling `CustomEvent` fired when
the disabled state changes, which the group uses to recompute its focusable set).

`fluent-radio-group`: `orientation`: `horizontal` `vertical` · `name` · `value` (value of the checked
radio) · `disabled`, `required` (boolean). Event: `change`. Default slot holds the radios.

Set `name` on the group; arrow-key navigation is handled by focusgroup.

### `<fluent-switch>`

`checked`, `disabled`, `required` (boolean) · `value` (default `'on'`) · `name`, `form`.
Events: `change`, `input`. Slot: `switch` — replace the thumb glyph. CSS part: `checked-indicator`.
Label positioning is done with `<fluent-field label-position="after">`.

### `<fluent-slider>`

`size`: `small` `medium` · `orientation`: `horizontal` `vertical` · `mode`: `single-value` ·
`value`, `min`, `max`, `step` (strings) · `disabled` (boolean).
Slot: `thumb`. Event: `change`. CSS parts: `thumb-container`, `track-container`.
Methods: `increment()`, `decrement()`, `checkValidity()`, `reportValidity()`, `setCustomValidity()`.

There is no slider-label component in v3 — render tick labels yourself.

- **`change` fires on every `value` assignment**: from code, with an unchanged value, and on connect
  when the slider gives itself a default. There is no `input` event. See `pitfalls.md` for the guard.
- The value setter clamps to the *current* range. **Set `min`/`max`/`step` before `value`.**
  An out-of-range value assigned before connect is replaced by the **midpoint**, not clamped.
- With a `step` attribute, tick marks are painted over the filled track. When the step is fine relative
  to the width (0–100 by 1 in a narrow slot), they cover the fill completely. Hide them with
  `fluent-slider::part(track-container)::after { display: none }`.
- The thumb animates (`transition: all 0.2s`) whenever the value is *assigned*, so a bound slider
  visibly slides on every re-render. Turn that off with
  `fluent-slider::part(thumb-container), fluent-slider::part(track-container) { transition: none }`
  if that's unwanted. Dragging is never animated.

### `<fluent-dropdown>` + `<fluent-listbox>` + `<fluent-option>`

`fluent-dropdown`:

| Attribute | Values |
| --- | --- |
| `type` | `dropdown` (default) `combobox` `select` |
| `appearance` | `outline` `filled-lighter` `filled-darker` `transparent` |
| `size` | `small` `medium` `large` |
| `multiple`, `disabled`, `required` | boolean |
| `value`, `name`, `placeholder`, `aria-labelledby` | — |

Slots: `(default)` — **must contain a `<fluent-listbox>`**, `indicator`, `control` (auto-populated; don't fill it).
Event: `change` (user selection only; assigning `value` from code does not emit it). Methods:
`selectOption()`, `checkValidity()`, `reportValidity()`.

- Assigning `value` in the **same task** that inserts the dropdown throws
  (`Cannot read properties of undefined (reading 'selectOption')`), because the listbox isn't bound yet.
  Wait a frame, or mark the option `selected` in markup.
- With `multiple`, the `value` setter does nothing. Set `selected` on the options instead.
- The control has a **160px `min-width`** inside its shadow root, so it overflows narrower containers.
  At `size="small"` it is **26px** tall, while a small `fluent-text-input` is 24px, so the two don't line
  up in a row. Neither can be changed from outside. Register the dropdown with an extra
  stylesheet instead (recipe in `pitfalls.md` #32).

`fluent-listbox`: no attributes — a container the dropdown drives. Default slot holds options.

`fluent-option` (tag is `fluent-option`, **not** `fluent-dropdown-option`):
`selected`, `disabled`, `freeform` (boolean) · `value` · `text` (what shows in the control when selected) ·
`name`, `form`. Slots: `(default)`, `start`, `checked-indicator`, `description`.
CSS parts: `content`, `description`. Method: `toggleSelected()`.

`freeform` syncs the option value with typed combobox input.

- **Clicking an element inside an option does not select it.** The dropdown only selects when the click
  target *is* the option. A click on a child `<span>`, a `slot="start"` icon or a `slot="description"`
  line opens nothing and selects nothing. Keep option content to plain text, or add
  `fluent-option > * { pointer-events: none; }`.
- The displayed text is read from the `text` attribute, falling back to `textContent`. Changes to
  `textContent` are not observed, so set `text` when the label changes after render.

```html
<fluent-dropdown appearance="outline" placeholder="Pick a fruit">
  <fluent-listbox>
    <fluent-option value="apple">Apple</fluent-option>
    <fluent-option value="pear" selected>Pear</fluent-option>
    <fluent-option value="fig" disabled>Fig</fluent-option>
  </fluent-listbox>
</fluent-dropdown>
```

---

## Surfaces

### `<fluent-dialog>` + `<fluent-dialog-body>`

`fluent-dialog`: `type`: `modal` (default) `non-modal` `alert` · `aria-label`, `aria-labelledby`,
`aria-describedby`. Default slot should contain a `<fluent-dialog-body>`.
Events: `toggle`, `beforetoggle` (both `ToggleEvent`). Methods: `show()`, `hide()`.
CSS part: `dialog` (the inner native `<dialog>`).

`fluent-dialog-body`: no attributes. Slots: `title`, `title-action`, `close`, `action`, `(default)`.
CSS parts: `title`, `content`, `actions`. The `action` buttons **stack vertically** until a container
query gives the body 480px. On a narrower dialog, use `fluent-dialog-body::part(actions)` to force a row.

CSS custom properties on `fluent-dialog`: `--dialog-backdrop` (backdrop paint, defaults to
`--colorBackgroundOverlay`) and `--dialog-starting-scale` (open animation start scale, `0.85`).

`type="alert"` gives the dialog `role="alertdialog"` and disables light-dismiss (backdrop clicks are
ignored). It still opens with `showModal()`, so the browser's native Escape-to-close still applies —
handle the `cancel` event on the inner `<dialog>` if you need to block that too.

### `<fluent-drawer>` + `<fluent-drawer-body>`

`fluent-drawer`: `type`: `modal` `non-modal` `inline` · `position`: `start` `end` ·
`size`: `small` `medium` `large` `full` · `aria-labelledby`, `aria-describedby`.
Events: `toggle`, `beforetoggle`. Methods: `show()`, `hide()`.
CSS part: `dialog`. CSS custom properties: `--drawer-width` (default `592px`) and `--dialog-backdrop`.
The underlying `<dialog>` is exposed as the `.dialog` property — `drawer.dialog.open` tells you the state.

`fluent-drawer-body`: no attributes. Slots: `title`, `close`, `(default)`, `footer`.
CSS parts: `header`, `content`, `footer`.

### `<fluent-menu>` + `<fluent-menu-list>` + `<fluent-menu-item>`

`fluent-menu`: `open-on-hover`, `open-on-context` (right-click), `close-on-scroll`,
`persist-on-item-click`, `split` (all boolean).
Slots: `trigger`, `primary-action` (used when `split`), `(default)` = the menu list.
CSS custom property: `--menu-max-height`. Methods: `focusMenuList()`, `focusTrigger()`.

`fluent-menu-list`: no attributes; default slot holds the items. Method: `focus()`.

`fluent-menu-item`: `role`: `menuitem` `menuitemcheckbox` `menuitemradio` · `checked`, `disabled`, `hidden`.
Slots: `(default)`, `start`, `end`, `indicator`, `submenu-glyph`, `submenu` (for nesting: slot a
`<fluent-menu-list>`, not a `<fluent-menu>`; see `patterns.md`).
Event: `change`. CSS part: `content`.

### `<fluent-tooltip>`

`anchor` — **the `id` of the element it describes** (required) · `delay` (ms) ·
`positioning`: `above` (default) `above-start` `above-end` `below` `below-start` `below-end`
`before` `before-top` `before-bottom` `after` `after-top` `after-bottom`.

The `positioning` attribute takes those **keys**. `TooltipPositioningOption` maps each one to a CSS
`position-area` value (`below` → `block-end`), but writing the CSS value (`positioning="block-end"`)
matches none of the component's selectors and silently falls back to `above`.

```html
<fluent-button id="save-btn" icon-only aria-label="Save"><svg …></svg></fluent-button>
<fluent-tooltip anchor="save-btn" positioning="below">Save your changes</fluent-tooltip>
```

The anchor is looked up **once, on connect**, in the tooltip's own root node, and its id is written raw
into a generated CSS rule. So the anchor has to exist when the tooltip connects, and its id has to be
a valid CSS identifier: `save.btn` or `1st` leaves the tooltip pinned at the top-left corner.

### `<fluent-message-bar>`

`intent`: `info` `success` `warning` `error` · `layout`: `singleline` `multiline` ·
`shape`: `rounded` `square`.
Slots: `(default)`, `icon`, `actions`, `dismiss`. Event: `dismiss` (`CustomEvent`).

Set `aria-live` yourself to match urgency (`polite` for info/success, `assertive` for error).

### `<fluent-accordion>` + `<fluent-accordion-item>`

`fluent-accordion`: `expand-mode`: `single` `multi`. Event: `change`.

`fluent-accordion-item`: `size`: `small` `medium` `large` `extra-large` ·
`marker-position`: `start` `end` · `heading-level`: `1`–`6` (default `2`) ·
`expanded`, `disabled`, `block` (boolean).
Slots: `heading`, `(default)`, `start`, `marker-expanded`, `marker-collapsed`.
CSS parts: `heading`, `button`, `content`.

```html
<fluent-accordion expand-mode="single">
  <fluent-accordion-item heading-level="2">
    <span slot="heading">Shipping</span>
    Ships in 2–3 business days.
  </fluent-accordion-item>
</fluent-accordion>
```

### `<fluent-tablist>` + `<fluent-tab>`

`fluent-tablist`: `appearance`: `subtle` `transparent` · `size`: `small` `medium` `large` ·
`orientation`: `horizontal` `vertical` · `activeid` (id of the active tab) · `disabled` (boolean).
Event: `change` — read `event.target.activetab`.

`fluent-tab`: `disabled` only. Slots: `(default)`, `start`, `end`. Give each tab an `id`.

- `change` also fires **without user action**: whenever tabs are added or removed (twice, naming the
  tab that is still active), and when `orientation` or `disabled` changes. Don't treat it as a click.
- Setting the tablist's `disabled` back to `false` re-enables **every** tab, including tabs that were
  individually `disabled`.

There is **no tab-panel element**, but the tablist manages your own panels automatically when each tab
carries `aria-controls="<panel-id>"`. See `patterns.md`.

### `<fluent-tree>` + `<fluent-tree-item>`

`fluent-tree`: `size`: `small` `medium` · `appearance`: `subtle` `subtle-alpha` `transparent`.
Default slot holds the top-level tree items. The tree pushes `size`/`appearance` down to its items.

`fluent-tree-item`: same `size`/`appearance`, plus `expanded`, `selected`, `empty` (boolean).
Indentation follows nesting. The `data-indent` attribute of earlier builds was removed in 3.0.3.
Slots: `(default)` = label, `start`, `end`, `aside`, `chevron` (custom expand glyph), `item` (child tree
items — populated automatically by nesting).
Events: `toggle`, `change`. CSS parts: `positioning-region`, `content`, `chevron`, `aside`, `items`.
Method: `toggleExpansion()`.

Nest `<fluent-tree-item>` directly inside another to build the hierarchy.
