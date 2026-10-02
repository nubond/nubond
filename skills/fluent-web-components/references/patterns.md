# Composition patterns

Working markup for the components whose shape isn't obvious from their attribute list. All snippets are
plain HTML — adapt attribute binding syntax to your framework.

---

## Dialog

`<fluent-dialog>` is the surface; `<fluent-dialog-body>` is the layout. Open it imperatively.

```html
<fluent-button id="open">Open dialog</fluent-button>

<fluent-dialog id="dlg" type="modal" aria-label="Confirm changes">
  <fluent-dialog-body>
    <span slot="title">Confirm changes</span>

    <fluent-button slot="close" appearance="transparent" icon-only aria-label="Close">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="…"/></svg>
    </fluent-button>

    <p>Your changes will be applied immediately.</p>

    <fluent-button slot="action" appearance="primary" id="confirm">Confirm</fluent-button>
    <fluent-button slot="action" id="cancel">Cancel</fluent-button>
  </fluent-dialog-body>
</fluent-dialog>
```

```js
import '@fluentui/web-components/dialog.js';
import '@fluentui/web-components/dialog-body.js';
import '@fluentui/web-components/button.js';

const dlg = document.getElementById('dlg');
document.getElementById('open').addEventListener('click', () => dlg.show());
document.getElementById('cancel').addEventListener('click', () => dlg.hide());

dlg.addEventListener('toggle', e => console.log('dialog is now', e.newState)); // 'open' | 'closed'
```

- `type="modal"` (default) opens with `showModal()` and dims the page; `non-modal` uses `show()`;
  `alert` is modal, gets `role="alertdialog"`, and ignores backdrop clicks. Escape still closes all
  three (native `<dialog>` behaviour) — intercept `cancel` on the inner `<dialog>` to prevent it.
- Buttons in `slot="action"` land in the footer; `slot="close"` is the corner X; `slot="title-action"`
  is for extra controls beside the title. The footer buttons **stack vertically** until a container
  query gives the body 480px. On a narrower dialog, force a row with `fluent-dialog-body::part(actions)`.
- `beforetoggle` fires before the state change and is where you'd veto or animate.
- Put `autofocus` on the child that should receive focus — `show()` explicitly focuses it, working around
  inconsistent native `<dialog>` autofocus behaviour.

## Drawer

Same shape, plus position and size. The internal `<dialog>` is exposed as `.dialog`, which is how you
read the open state.

```html
<fluent-button id="toggle" appearance="primary">Toggle drawer</fluent-button>

<fluent-drawer id="drawer" type="modal" position="end" size="medium" style="--drawer-width: 380px">
  <fluent-drawer-body>
    <h2 slot="title">Settings</h2>
    <fluent-button slot="close" appearance="transparent" icon-only aria-label="Close">
      <svg …></svg>
    </fluent-button>

    <fluent-text>Panel content.</fluent-text>

    <fluent-button slot="footer" appearance="primary">Apply</fluent-button>
  </fluent-drawer-body>
</fluent-drawer>
```

```js
const drawer = document.getElementById('drawer');
document.getElementById('toggle').addEventListener('click', () => {
  drawer.dialog.open ? drawer.hide() : drawer.show();
});
```

`type="inline"` renders the drawer in flow rather than over the page — useful for persistent side panels.

## Menu

`<fluent-menu>` owns positioning and open state. The trigger goes in `slot="trigger"`, the items in a
`<fluent-menu-list>` in the default slot.

```html
<fluent-menu>
  <fluent-menu-button slot="trigger" appearance="primary">Actions</fluent-menu-button>
  <fluent-menu-list>
    <fluent-menu-item>Open</fluent-menu-item>
    <fluent-menu-item>Rename</fluent-menu-item>
    <fluent-menu-item disabled>Delete</fluent-menu-item>
  </fluent-menu-list>
</fluent-menu>
```

Register all four tags: `menu.js`, `menu-button.js`, `menu-list.js`, `menu-item.js`.

**Checkbox / radio items** — set `role` and drive `checked` from the `change` event:

```html
<fluent-menu-item role="menuitemcheckbox" checked>Show gridlines</fluent-menu-item>
<fluent-menu-item role="menuitemradio" checked>Compact</fluent-menu-item>
<fluent-menu-item role="menuitemradio">Comfortable</fluent-menu-item>
```

**Submenus**: put a `<fluent-menu-list>` straight into the parent item's `submenu` slot.

```html
<fluent-menu-item>
  Export
  <fluent-menu-list slot="submenu">
    <fluent-menu-item>PDF</fluent-menu-item>
    <fluent-menu-item>CSV</fluent-menu-item>
  </fluent-menu-list>
</fluent-menu-item>
```

Slot the list, **not** a wrapping `<fluent-menu>`. The item turns whatever element is in that slot into
the popover. A `fluent-menu-list` styles over the browser's `[popover]` defaults. A `fluent-menu` has
no styles of its own, so it opens with the UA's 3px black border, white background and padding, and
ArrowRight no longer moves focus into it.

**Behaviour flags**: `open-on-hover`, `open-on-context` (right-click), `close-on-scroll`,
`persist-on-item-click` (keep open after selecting). Cap the height with `--menu-max-height`.

## Split Button — a Menu, not an element

There is no `<fluent-split-button>`. A split button is `<fluent-menu split>` with a primary action button
and an icon-only trigger:

```html
<fluent-menu split>
  <fluent-button slot="primary-action" appearance="primary">Save</fluent-button>
  <fluent-menu-button slot="trigger" appearance="primary" icon-only aria-label="More save options">
  </fluent-menu-button>
  <fluent-menu-list>
    <fluent-menu-item>Save as…</fluent-menu-item>
    <fluent-menu-item>Save a copy</fluent-menu-item>
  </fluent-menu-list>
</fluent-menu>
```

Keep `appearance`, `shape`, and `size` identical on both buttons or the halves won't align.

## Dropdown, Select, and Combobox

One element, three `type` values. The `<fluent-listbox>` wrapper is **required** in all three.

```html
<!-- Dropdown (default): click to open, no typing -->
<fluent-dropdown placeholder="Pick a fruit">
  <fluent-listbox>
    <fluent-option value="apple">Apple</fluent-option>
    <fluent-option value="pear">Pear</fluent-option>
  </fluent-listbox>
</fluent-dropdown>

<!-- Combobox: editable input that filters options -->
<fluent-dropdown type="combobox" placeholder="Search fruit">
  <fluent-listbox>
    <fluent-option value="apple">Apple</fluent-option>
    <fluent-option value="pear">Pear</fluent-option>
  </fluent-listbox>
</fluent-dropdown>

<!-- Select: native-like select semantics -->
<fluent-dropdown type="select">…</fluent-dropdown>
```

- **Multi-select**: add `multiple` to the dropdown.
- **Freeform combobox** (accept values not in the list): add `freeform` to the options that should sync
  with typed text.
- Options carry rich content via `slot="start"` and `slot="description"`. But **a click that lands on
  any child element of an option does not select it**: the dropdown only accepts the option itself as
  the click target. When options contain markup, add this:

  ```css
  fluent-option > * { pointer-events: none; }
  ```

- Listen for `change` and read `event.target.value`. It fires for user selection only, not when code
  assigns `value`.
- Don't assign `value` in the same task that creates the dropdown (it throws). Mark the option
  `selected` in markup, or assign after a frame.
- Combobox and dropdown rely on CSS anchor positioning — see the polyfill note in `setup.md`.

## Field, labels, and validation

`<fluent-field>` positions a label, a control, and a message. **Two different labelling rules:**

**Most controls** — label goes in the field's `label` slot, control in `input`:

```html
<fluent-field label-position="after">
  <label slot="label" for="tos">I accept the terms</label>
  <fluent-checkbox slot="input" id="tos" required></fluent-checkbox>
</fluent-field>
```

**Text input** — the label is a **child of the input itself**, because the element renders it inside its
own `<label for="control">`. Using the field's label slot here breaks zoom text and screen reader
behaviour:

```html
<fluent-field>
  <fluent-text-input slot="input" required>Email address</fluent-text-input>
</fluent-field>
```

**Textarea** — the label goes in the *textarea's* `label` slot (not the field's):

```html
<fluent-field>
  <fluent-textarea slot="input">
    <fluent-label slot="label">Notes</fluent-label>
  </fluent-textarea>
</fluent-field>
```

**Helper and validation messages** go in the field's `message` slot; wire them up with `aria-describedby`:

```html
<fluent-field>
  <fluent-text-input slot="input" aria-describedby="hint" required>Username</fluent-text-input>
  <fluent-text slot="message" size="200" id="hint">3–20 characters, letters and digits only.</fluent-text>
</fluent-field>
```

Fields understand validity states named after `ValidityState` flags: `bad-input`, `custom-error`,
`pattern-mismatch`, `range-overflow`, `range-underflow`, `step-mismatch`, `too-long`, `too-short`,
`type-mismatch`, `value-missing`, `valid`.

**Forms** — every form control is form-associated, so it participates in native submission and validation:

```html
<form id="signup">
  <fluent-field>
    <fluent-text-input slot="input" name="email" type="email" required>Email</fluent-text-input>
  </fluent-field>
  <fluent-button type="submit" appearance="primary">Sign up</fluent-button>
</form>
```

```js
document.getElementById('signup').addEventListener('submit', e => {
  e.preventDefault();
  const data = new FormData(e.target); // includes fluent control values by `name`
});
```

Each control also exposes `checkValidity()`, `reportValidity()`, and `setCustomValidity()`.

## Radio group

```html
<fluent-field>
  <label slot="label">Delivery speed</label>
  <fluent-radio-group slot="input" name="speed" orientation="vertical" value="standard">
    <fluent-field label-position="after">
      <label slot="label" for="std">Standard</label>
      <fluent-radio slot="input" id="std" value="standard"></fluent-radio>
    </fluent-field>
    <fluent-field label-position="after">
      <label slot="label" for="exp">Express</label>
      <fluent-radio slot="input" id="exp" value="express"></fluent-radio>
    </fluent-field>
  </fluent-radio-group>
</fluent-field>
```

`name` belongs on the group. Arrow-key navigation comes from focusgroup automatically.

## Tablist and panels

There is no `fluent-tab-panel` element — panels are ordinary elements of yours. But the tablist **will
wire them up automatically** if each tab points at its panel with `aria-controls`. The panel must live in
the same root node (same document or same shadow root).

```html
<fluent-tablist appearance="subtle" size="medium" activeid="tab-general">
  <fluent-tab id="tab-general" aria-controls="panel-general">General</fluent-tab>
  <fluent-tab id="tab-advanced" aria-controls="panel-advanced">
    <span slot="start"><svg …></svg></span>
    Advanced
  </fluent-tab>
  <fluent-tab id="tab-about" aria-controls="panel-about" disabled>About</fluent-tab>
</fluent-tablist>

<div id="panel-general" aria-labelledby="tab-general">…</div>
<div id="panel-advanced" aria-labelledby="tab-advanced">…</div>
<div id="panel-about" aria-labelledby="tab-about">…</div>
```

The tablist sets `role="tabpanel"` on each referenced panel, hides all but the active one, and swaps
`hidden` as the active tab changes. It also assigns generated ids to tabs that lack one and sets
`aria-selected` — but `aria-controls` has to be yours, so give every tab an explicit `id`.

Without `aria-controls`, drive the panels yourself from the `change` event:

```js
document.querySelector('fluent-tablist').addEventListener('change', e => {
  const activeId = e.target.activetab.id;   // `change` also carries the tab as its detail
  document.querySelectorAll('[role="tabpanel"]').forEach(p => {
    p.hidden = p.getAttribute('aria-labelledby') !== activeId;
  });
});
```

Set the initial tab with `activeid`; if you omit it, the first enabled tab is selected.
Use `orientation="vertical"` for a rail, with the panels beside it in a flex row.

## Tree

Nest `<fluent-tree-item>` elements directly inside one another. `size` and `appearance` are set once on
the tree and pushed down.

```html
<fluent-tree size="medium" appearance="subtle">
  <fluent-tree-item expanded>
    Documents
    <fluent-tree-item>
      <span slot="start"><svg …></svg></span>
      Report.pdf
    </fluent-tree-item>
    <fluent-tree-item>
      Notes.txt
      <span slot="aside"><fluent-badge size="small">new</fluent-badge></span>
    </fluent-tree-item>
  </fluent-tree-item>
  <fluent-tree-item empty>Trash</fluent-tree-item>
</fluent-tree>
```

Listen for `toggle` (expand/collapse) and `change` (selection). Mark leaves with `empty` so no chevron renders.

## Tooltip

The tooltip is a sibling that points at its anchor's `id` — it is not a wrapper.

```html
<fluent-button id="save-btn" icon-only aria-label="Save"><svg …></svg></fluent-button>
<fluent-tooltip anchor="save-btn" positioning="below" delay="250">Save your changes</fluent-tooltip>
```

- `positioning` is a side with an optional alignment: `above`, `below-start`, `after-top`, `before-bottom`
  and so on (full list in `components.md`). Writing the underlying CSS value (`block-end`) silently
  falls back to `above`.
- The anchor must be in the DOM, in the same document or shadow root, **when the tooltip connects**.
  A tooltip added before its anchor never binds to it. Render the anchor first, or re-insert the tooltip.
- The anchor id must be a valid CSS identifier (no `.`, `:` or leading digit). Otherwise the tooltip
  shows at the top-left of the page.
- Tooltips need CSS anchor positioning. Polyfill it for older browsers (see `setup.md`).

## Message bar

```html
<fluent-message-bar intent="error" layout="multiline" shape="rounded" aria-live="assertive">
  <svg slot="icon" …></svg>
  Upload failed. Check your connection and try again.
  <fluent-button slot="actions" size="small">Retry</fluent-button>
  <fluent-button slot="dismiss" appearance="transparent" icon-only aria-label="Dismiss">
    <svg …></svg>
  </fluent-button>
</fluent-message-bar>
```

```js
bar.addEventListener('dismiss', () => bar.remove());
```

The `dismiss` event only notifies you — removing the bar is your job.

## Icons

No icon component ships with the package. Inline SVG into `start` / `end` / `icon` slots, sized in `em`
so it tracks the control, with `fill="currentColor"` so it picks up token colors, and `aria-hidden="true"`
since the surrounding control carries the label.

```html
<fluent-button appearance="subtle">
  <svg slot="start" width="1em" height="1em" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path d="…" />
  </svg>
  Download
</fluent-button>
```

`@fluentui/svg-icons` is the matching Fluent icon set if you want the official glyphs.
Always give `icon-only` buttons an `aria-label`.
