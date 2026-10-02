# Setup, entry points, theming

## Install

```sh
npm install @fluentui/web-components @fluentui/tokens
```

`@fluentui/tokens` supplies the theme objects. It is a runtime dependency of the components package
(`^1.0.0-alpha.24` as of 3.1.3), but you install it explicitly because you import theme objects from
it yourself.

Peer dependencies: `@microsoft/fast-element@^3`, `@microsoft/focusgroup-polyfill@^1.5`. npm 7+ installs
peers automatically. With pnpm or Yarn, add them yourself if your package manager doesn't.

### From a CDN, no build step

The bare package URL resolves to `dist/web-components.min.js` (the package's `unpkg` field): a
self-contained bundle that registers every element and exposes `setTheme` as the global
`Fluent.setTheme`, with **no** ES exports. The theme objects come from `@fluentui/tokens`, whose ESM
build loads directly in a browser:

```html
<script type="module">
  import 'https://unpkg.com/@fluentui/web-components@3.1.3';
  import { webLightTheme } from 'https://unpkg.com/@fluentui/tokens@1.0.0-alpha.24/lib/index.js';
  Fluent.setTheme(webLightTheme);
</script>

<fluent-button appearance="primary">Hello</fluent-button>
```

Pin versions for anything you deploy. The bare specifier tracks latest.

## Registering elements — four entry points

The package export map gives four granularities. Pick by how much control you need.

```js
// 1. Register one element (side effect). Both spellings resolve to the same define module.
import '@fluentui/web-components/button.js';
import '@fluentui/web-components/button/define.js';

// 2. Register everything, no public exports. Exposes a global `Fluent.setTheme()`.
import '@fluentui/web-components/web-components.js';

// 3. Register everything AND get the public exports from one entry point.
import { Button, ButtonAppearance } from '@fluentui/web-components/web-components-all.js';

// 4. Import the pieces and define the element yourself, when you need to control timing
//    or register under a different tag name.
import { Button } from '@fluentui/web-components/button/class.js';
import { definition as buttonDefinition } from '@fluentui/web-components/button/definition.js';
Button.define(buttonDefinition);
```

Per-component subpaths available for every component (`<name>` = the element's directory, e.g. `button`,
`text-input`, `textarea`, `option`):

| Subpath | Contents |
| --- | --- |
| `@fluentui/web-components/<name>.js` | side-effect define |
| `@fluentui/web-components/<name>/define.js` | same, explicit |
| `@fluentui/web-components/<name>/define-async.js` | define for declarative/SSR templates |
| `@fluentui/web-components/<name>/class.js` | the Fluent class (e.g. `Button`) |
| `@fluentui/web-components/<name>/base.js` | the un-styled base class (e.g. `BaseButton`) — not all components have one |
| `@fluentui/web-components/<name>/definition.js` | the element definition |
| `@fluentui/web-components/<name>/definition-async.js` | the definition used by `define-async.js` |
| `@fluentui/web-components/<name>/options.js` | enums + `tagName` constant |
| `@fluentui/web-components/<name>/template.js` / `.html` | template (JS / declarative shadow DOM) |
| `@fluentui/web-components/<name>/styles.js` / `.css` | styles (JS / extracted CSS) |
| `@fluentui/web-components/<name>/index.js` | everything the component exports |

Non-component entry points: `@fluentui/web-components/utilities.js` (the `utils` barrel),
`@fluentui/web-components/utils/*.js`, `@fluentui/web-components/utils/behaviors/*.js`, and
`@fluentui/web-components/theme/*.js`. The all-in-one bundles also ship minified as
`web-components.min.js` and `web-components-all.min.js`.

Only **19** components ship a `base.js`: `accordion-item` `anchor-button` `avatar` `button` `checkbox`
`counter-badge` `divider` `dropdown` `field` `menu-list` `progress-bar` `radio-group` `rating-display`
`spinner` `tablist` `text-input` `textarea` `tree` `tree-item`. For the rest, `class.js` is the
extension point.

Everything public is also re-exported from the package root: `import { Button, ButtonAppearance } from '@fluentui/web-components'`.

**Child elements need their own registration.** Importing `tablist.js` does not define `fluent-tab`;
importing `menu.js` does not define `fluent-menu-list` or `fluent-menu-item`. Register every tag you write.

## Theming

Tokens resolve to CSS custom properties. `setTheme` writes them and updates them when the theme changes;
component styles never change, only the variable values.

```js
import { setTheme } from '@fluentui/web-components';
import { webLightTheme, webDarkTheme } from '@fluentui/tokens';

setTheme(webLightTheme);              // themes the document
setTheme(webDarkTheme, someElement);  // scopes a theme to one subtree
```

Signature: `setTheme(theme: Theme | null, node: Document | HTMLElement = document)`.
`Theme` is `Record<string, string | number>` — a plain object of token name → value.

Implementation notes that matter in practice:

- Targeting `document`, `documentElement`, or `body` sets a **global** stylesheet; any other element gets a
  **scoped/local** theme (via `adoptedStyleSheets` + `CSSScopeRule`, falling back to inline `style`
  properties on browsers without them, and marking the element with `data-fluent-theme`).
  An element with a shadow root gets the variables on its `:host`, inside that shadow root.
- An element outside `<body>` (detached, or in `<head>`) is ignored, with no error.
- Passing `null` clears the theme.
- Since 3.1.2, values containing `;`, `{`, `}`, `url(`, `@import`, `expression(` or `javascript:`, and
  token names that aren't plain identifiers, are dropped without warning.
- Call it once at the root. Repeated global calls just swap variable values, which is how you implement a
  light/dark toggle.

### Available themes

`webLightTheme`, `webDarkTheme`, `teamsLightTheme`, `teamsDarkTheme` (also `teamsLightV21Theme`,
`teamsDarkV21Theme`, `teamsHighContrastTheme`).

**Do not use the hardcoded high-contrast theme.** All components support Windows High Contrast mode
automatically under any theme; the HC theme object is legacy, for apps that explicitly require it.

### Custom themes

`@fluentui/tokens` exports factories: `createLightTheme`, `createDarkTheme`, `createHighContrastTheme`,
`createTeamsDarkTheme`, plus `themeToTokensObject` and `typographyStyles`.

```js
import { createLightTheme, setTheme } from '…';
setTheme(createLightTheme(myBrandRamp));
```

### Using tokens in your own CSS

**Never write `var(--colorNeutralForeground1)` directly.** The CSS variable layer is documented as internal
and the names may be hashed or removed. Go through the `tokens` object:

```js
import { tokens } from '@fluentui/tokens';
el.style.color = tokens.colorNeutralForeground1;   // -> 'var(--colorNeutralForeground1)'
```

459 tokens in these groups:

| Group | Count | Examples |
| --- | --- | --- |
| `color*` | 366 | `colorNeutralForeground1`, `colorBrandBackgroundHover`, `colorStatusDangerBorder1` |
| `spacing*` | 22 | `spacingHorizontalS`, `spacingVerticalXXL` |
| `font*` | 17 | `fontFamilyBase`, `fontSizeBase300`, `fontWeightSemibold` |
| `border*` | 11 | `borderRadiusMedium`, `borderRadiusCircular` |
| `shadow*` | 12 | `shadow2`, `shadow16`, `shadow64Brand` |
| `line*` | 10 | `lineHeightBase300` |
| `curve*` | 9 | `curveEasyEase`, `curveAccelerateMax` |
| `duration*` | 8 | `durationFast`, `durationSlower` |
| `stroke*` | 4 | `strokeWidthThin`, `strokeWidthThick` |

Colors follow `color<Palette><Usage><Variant?><State?>` — e.g. `colorNeutralBackground1Hover`,
`colorBrandForegroundLink`, `colorPaletteRedBackground2`.

## Framework integration

The components are plain custom elements, so standard custom-element interop rules apply.

**React 19+** — full custom element support: string/boolean attributes and `on*` event props work directly.

**React 18 and earlier** — attributes work, but non-primitive props and custom events do not. Use a ref:

```jsx
const ref = useRef(null);
useEffect(() => {
  const el = ref.current;
  const onChange = e => setValue(e.target.value);
  el.addEventListener('change', onChange);
  return () => el.removeEventListener('change', onChange);
}, []);
return <fluent-dropdown ref={ref} appearance="outline" />;
```

**Angular** — add `CUSTOM_ELEMENTS_SCHEMA` to the module/component so unknown tags aren't errors.
Use `[attr.appearance]="…"` for attributes and `(change)="…"` for events.

**Vue** — mark the tags as custom elements so Vue doesn't try to resolve them as components:

```js
// vite.config.js
vue({ template: { compilerOptions: { isCustomElement: tag => tag.startsWith('fluent-') } } });
```

Vue binds booleans correctly with `:disabled="isDisabled"` only if you want the attribute removed when
false — prefer `:disabled="isDisabled || null"` if you see a stray `disabled="false"`.

**Svelte / plain HTML** — no configuration needed.

## Server-side rendering / declarative shadow DOM

Each component ships a declarative-shadow-DOM template (`<name>/template.html`) and an extracted
stylesheet (`<name>/styles.css`) alongside the JS. Register with the async define so the element hydrates
an already-rendered shadow root instead of re-rendering:

```js
import '@fluentui/web-components/button/define-async.js';
```

Include the matching `f-template` on the page. For a full pipeline, use the
[WebUI Framework](https://microsoft.github.io/webui/) integration and see the
[FAST hydration docs](https://fast.design/docs/3.x/declarative-templates/server-rendering/).

## Polyfills

The library takes a bring-your-own-polyfill approach. Features degrade gracefully where possible.

| Feature | Chrome/Edge | Firefox | Safari |
| --- | --- | --- | --- |
| HTML `popover` attribute | 114 | 125 | 17 |
| CSS anchor positioning | 125 | 147 | 26 |

**Popover** is used by menu (and submenus), tooltip, and the dropdown's listbox. Dialog and drawer are
built on the native `<dialog>` element and don't need it.

```sh
npm install @oddbird/popover-polyfill
```

```js
// after setTheme()
(async () => {
  if (!('popover' in HTMLElement.prototype)) {
    await import('@oddbird/popover-polyfill');
  }
})();
```

```css
/* fixes a positioning side effect of the polyfill with light-DOM children */
[popover].\:popover-open {
  inset: unset;
  border: 1px solid transparent;
}
```

**CSS anchor positioning**: submenus have a small JS fallback, and the dropdown/combobox listbox falls
back to absolute positioning below its control. The **tooltip** is the component that reads the
`window.CSS_ANCHOR_POLYFILL` hook, and without it tooltips are mispositioned. Set the hook **before
Fluent UI loads** (the upstream recommendation; strictly, before the first tooltip shows):

```js
if (!CSS.supports('anchor-name: --a')) {
  const { default: applyPolyfill } = await import('@oddbird/css-anchor-positioning/fn');
  window.CSS_ANCHOR_POLYFILL = applyPolyfill;
}
```

**Focusgroup** — `MenuList`/`MenuItem`, `RadioGroup`/`Radio`, `Tablist`/`Tab`, and `Tree`/`TreeItem` use the
proposed [HTML focusgroup](https://open-ui.org/components/scoped-focusgroup.explainer/) for arrow-key
navigation. `@microsoft/focusgroup-polyfill` is applied **automatically** on connect. To opt out, extend the
base class instead:

```js
import { BaseTablist } from '@fluentui/web-components/tablist/base.js';
export class MyTablist extends BaseTablist {}
```

## Custom elements manifest

The package ships a CEM at its root:

```js
import CEM from '@fluentui/web-components/custom-elements.json' with { type: 'json' };
```

Useful for editor tooling — but see `pitfalls.md`: as of 3.1.3 it still contains two stale tag names.
