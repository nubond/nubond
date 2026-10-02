---
name: fluent-web-components
description: Build UI with Microsoft Fluent UI Web Components v3 (@fluentui/web-components) — the framework-agnostic `<fluent-*>` custom elements styled with Fluent 2 design tokens. Use whenever a project depends on `@fluentui/web-components` or `@fluentui/tokens`, whenever HTML/JSX contains `fluent-*` tags, and whenever asked to add, theme, compose, or debug Fluent buttons, dialogs, drawers, menus, dropdowns/comboboxes, fields, tabs, trees, or other Fluent controls in plain HTML, React, Angular, Vue, or Svelte.
---

# Fluent UI Web Components v3

`@fluentui/web-components` v3 ships **42 standards-based custom elements** built on `@microsoft/fast-element`.
They are real HTML elements — no framework, no component model of its own. Styling comes entirely from
**design tokens exposed as CSS custom properties**, injected by `setTheme()`.

This skill was verified against **3.1.3** (the public API is unchanged since 3.0.3). Check the
installed version with `npm ls @fluentui/web-components`. A `3.0.0-rc.*` build differs in places,
listed at the top of `references/pitfalls.md`.

Three things are true of every component and drive most correct usage:

1. **Content goes into named slots**, not props. `start` / `end` / `label` / `action` etc. are `slot="…"` attributes on light-DOM children.
2. **Enumerated attributes are kebab-case strings**; boolean attributes are presence-based (`disabled`, not `disabled="false"`).
3. **Nothing renders correctly until a theme is set.** Without `setTheme()` the token variables are undefined and components appear unstyled/invisible.

## Setup — the three required steps

```sh
npm install @fluentui/web-components @fluentui/tokens
```

```js
// 1. Set a theme ONCE at app root, before/near first paint
import { setTheme } from '@fluentui/web-components';
import { webLightTheme } from '@fluentui/tokens';
setTheme(webLightTheme);

// 2. Register the elements you use (side-effectful import defines the custom element)
import '@fluentui/web-components/button.js';
import '@fluentui/web-components/text-input.js';
```

```html
<!-- 3. Use them as ordinary HTML -->
<fluent-button appearance="primary">Save</fluent-button>
```

`import '@fluentui/web-components/web-components.js'` registers everything at once — fine for prototypes,
but prefer per-component imports in production for tree-shaking. Full detail, including
CDN usage, framework integration, and `define-async`/SSR: **`references/setup.md`**.

## The 42 elements

Layout/content: `fluent-text` `fluent-label` `fluent-link` `fluent-image` `fluent-divider` `fluent-avatar`
`fluent-badge` `fluent-counter-badge` `fluent-rating-display` `fluent-spinner` `fluent-progress-bar`

Actions: `fluent-button` `fluent-anchor-button` `fluent-compound-button` `fluent-toggle-button`
`fluent-menu-button`

Forms: `fluent-field` `fluent-text-input` `fluent-textarea` `fluent-checkbox` `fluent-radio`
`fluent-radio-group` `fluent-switch` `fluent-slider` `fluent-dropdown` `fluent-listbox` `fluent-option`

Surfaces/navigation: `fluent-dialog` `fluent-dialog-body` `fluent-drawer` `fluent-drawer-body`
`fluent-menu` `fluent-menu-list` `fluent-menu-item` `fluent-tooltip` `fluent-message-bar`
`fluent-accordion` `fluent-accordion-item` `fluent-tablist` `fluent-tab` `fluent-tree` `fluent-tree-item`

**Combobox and Split Button are not elements** — they are documented compositions:
`<fluent-dropdown type="combobox">` and `<fluent-menu split>`. See `references/patterns.md`.

Every attribute, its allowed values, every slot, event, and CSS part for all 42 elements:
**`references/components.md`**. Read it before writing markup for a component you haven't used here yet —
the allowed enum values are not guessable (e.g. `fluent-text` sizes are `100`–`1000`, not `small`/`large`).

## Composing correctly

The elements that people get wrong are the composite ones. Each has a required parent/child/slot shape:

- **Dialog** = `<fluent-dialog>` wrapping `<fluent-dialog-body>`; opened imperatively via `.show()`.
- **Drawer** = `<fluent-drawer>` wrapping `<fluent-drawer-body>`; also `.show()` / `.hide()`.
- **Menu** = `<fluent-menu>` with a `slot="trigger"` button + `<fluent-menu-list>` of `<fluent-menu-item>`.
  A submenu is a `<fluent-menu-list slot="submenu">` inside the item, **not** a nested `<fluent-menu>`.
- **Tooltip** = a sibling `<fluent-tooltip anchor="<id>">`. `positioning` takes `above`/`below-start`/`after`…,
  not CSS values like `block-end`.
- **Dropdown** = `<fluent-dropdown>` wrapping a `<fluent-listbox>` of `<fluent-option>`. The listbox is required.
- **Field** = `<fluent-field>` with `slot="label"`, `slot="input"`, `slot="message"` — **except** text input and textarea, which carry their own label (see below).
- **Tablist** = `<fluent-tablist>` of `<fluent-tab>`; there is no `fluent-tab-panel`, but the tablist shows/hides *your* panels if each tab has `aria-controls`.

Copy-paste-ready recipes for all of these, plus forms/validation, tooltips, and trees:
**`references/patterns.md`**.

## Theming and tokens

`setTheme(theme, node?)` writes ~459 token custom properties. Called with no node it themes the document;
pass an element to scope a different theme to a subtree (e.g. a dark panel inside a light app).
Themes from `@fluentui/tokens`: `webLightTheme`, `webDarkTheme`, `teamsLightTheme`, `teamsDarkTheme`.

In your own CSS, reference tokens through the exported `tokens` object rather than hardcoding
`var(--colorNeutralForeground1)` — the variable names are explicitly internal and may change:

```js
import { tokens } from '@fluentui/tokens';
element.style.color = tokens.colorNeutralForeground1;
```

Token groups, scoped theming, and high-contrast guidance: **`references/setup.md`**.

## Before you finish

Check the work against **`references/pitfalls.md`**. It covers the mistakes that produce silently broken
UI: unstyled components from a missing `setTheme`, wrong tag names shipped in the package's own manifest
(`fluent-textarea` and `fluent-option` are the real tags), `size` vs `control-size` on text input,
boolean attribute binding in React/Vue, forgetting to register a child element like `fluent-tab`,
and popover/anchor-positioning polyfills for older browsers.

If controls are **bound to state** (any framework, or a controlled component), also read entries 20–33,
which cover behaviour no attribute list shows:

- `fluent-slider` emits `change` on every programmatic write, so guard handlers or every render echoes back.
- Set a slider's `min`/`max`/`step` before its `value`.
- Clicking markup *inside* a `fluent-option` doesn't select it.
- A dropdown can't take a `value` in the tick it is created.
- `fluent-tablist` emits `change` when tabs are added or removed.
- `fluent-toggle-button` flips itself on click.
- `fluent-textarea` reads its children as its value, and `spellcheck="false"` turns spell checking on.
- `fluent-text-input` drops `min`/`max`/`step`.
- Some fixed sizes (the dropdown's 160px floor) can only be changed by re-registering the element
  with extra styles.
