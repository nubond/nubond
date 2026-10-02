# Project setup and build pipeline

## Scaffolding a new app

```bash
npm create nubond blank my-app       # minimal starter
npm create nubond native my-app      # starter with Fluent web components, fonts, services
npm create nubond showcase my-app    # full feature demo — the living documentation
cd my-app
npm install
npm start
```

Templates available: `blank`, `native`, `showcase` (`npm create nubond` with no arguments lists them).
The starters bootstrap with `@AppRoot({ showDebugInfo: true }, '/#[page=main]', Main)` and
`<main nb-container="%page">` in `index.html`.

Adding nuBond to an existing TypeScript project:
```bash
npm install nubond
```
Requires `experimentalDecorators` and `emitDecoratorMetadata`.

## Standard file layout

```
src/
  index.html                 entry HTML — Parcel `source`, hosts the app root element
  index.scss                 entry stylesheet (bundled, NOT importable as a string)
  index.ts                   @AppRoot
  pages/
    main/
      main.ts  main.html                       @Container
      components/
        hello-world/
          hello-world.ts  .html  .scss         @Component
  shared/
    aspects/     tooltip/tooltip.ts  tooltip.scss
    components/  fluent-icon/…
    services/    settings/…  localization/…    @Injectable
    transformers/ localize.ts                  @Transformer
    interfaces/  models/  types/
  styles/
    colors.scss  fonts.scss  sizes.scss
    shared/components.scss                     registered via $AdoptedStyle
assets/
```

One folder per entity, files named after the entity in kebab-case. Containers get `.ts` + `.html`;
components add `.scss`. Aspects/transformers/injectables are single `.ts` files.

## `package.json`

```json
{
  "name": "my-app",
  "source": "./src/index.html",
  "nubond": { "languageService": true },
  "alias": {},
  "staticFiles": [{ "staticPath": "./assets/favicon.ico" }],
  "scripts": {
    "prestart": "node package-cli.js %ROOT_CWD% remove-directory dist",
    "start": "parcel",
    "prebuild": "node package-cli.js %ROOT_CWD% remove-directory dist",
    "build": "parcel build",
    "add-component": "node package-cli.js %INIT_CWD% add-component scss",
    "acomp": "node package-cli.js %INIT_CWD% add-component scss",
    "add-container": "node package-cli.js %INIT_CWD% add-container",
    "acont": "node package-cli.js %INIT_CWD% add-container",
    "add-aspect": "node package-cli.js %INIT_CWD% add-aspect",
    "aasp": "node package-cli.js %INIT_CWD% add-aspect",
    "add-transformer": "node package-cli.js %INIT_CWD% add-transformer",
    "atran": "node package-cli.js %INIT_CWD% add-transformer",
    "add-injectable": "node package-cli.js %INIT_CWD% add-injectable",
    "ainj": "node package-cli.js %INIT_CWD% add-injectable"
  },
  "devDependencies": {
    "@nubond/posthtml-value-interpolation": "^1.0.3",
    "@parcel/transformer-inline-string": "^2.16.1",
    "@parcel/transformer-sass": "^2.16.1",
    "@parcel/transformer-typescript-tsc": "^2.16.1",
    "@types/node": "^25.5.2",
    "parcel": "^2.16.1",
    "parcel-reporter-static-files-copy": "^1.5.3",
    "posthtml": "^0.16.7"
  },
  "dependencies": { "nubond": "^1.0.8" }
}
```

`prestart`/`prebuild` wipe `dist` only. If Parcel serves stale output after changing `.parcelrc`,
`tsconfig` or a dependency, delete `.parcel-cache` too.

`nubond.languageService: true` opts the workspace into the VS Code extension's cross-file
template ↔ class navigation. It must sit in the **workspace-folder-root** `package.json`.

### The scaffolding CLI

Run from the directory where the entity should be created — the script uses `%INIT_CWD%`:

| Command | Alias | Creates |
|---|---|---|
| `npm run add-container <name>` | `acont` | `<name>/` with `<name>.ts` + `<name>.html` |
| `npm run add-component <name>` | `acomp` | `<name>/` with `<name>.ts` + `.html` + `.scss` |
| `npm run add-aspect <name>` | `aasp` | `<name>.ts` |
| `npm run add-transformer <name>` | `atran` | `<name>.ts` |
| `npm run add-injectable <name>` | `ainj` | `<name>.ts` |

Pass the name after `--` (`npm run acomp -- ItemCard`). Names are kebab-cased for files and
Pascal-cased for the class. Omit the name and the script prompts. `index` and `app` are rejected as
entity names. Matching `remove-*` commands exist in `package-cli.js` (no npm scripts for them).

Known problems in the `create-nubond` 1.0.11 templates:

- **`add-container` / `acont` is broken** in the `blank` and `native` templates — `package-cli.js`
  calls the misspelled `addDirectoryWitFiles`. Fix the typo to `addDirectoryWithFiles` in the
  generated project, or copy an existing container folder.
- **The scripts assume Windows.** `%INIT_CWD%` / `%ROOT_CWD%` are cmd.exe syntax; under a POSIX
  script-shell (macOS, Linux, or npm configured with bash) `%INIT_CWD%` is passed through literally.
  There, run the CLI directly: `node package-cli.js "$PWD" add-component scss MyCard` — the target
  directory is the first argument.

## `tsconfig.json`

```jsonc
{
  "compilerOptions": {
    "target": "ESNext",
    "lib": ["dom", "ESNext"],
    "experimentalDecorators": true,     // REQUIRED
    "emitDecoratorMetadata": true,      // REQUIRED — DI reads design:paramtypes
    "module": "commonjs",
    "rootDir": "./src",
    "paths": { "~*": ["./*"], "@shared/*": ["./src/shared/*"] },
    "types": ["node"],
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["**/*.ts"],
  "exclude": ["node_modules", "**/*.spec.ts"]
}
```

`@shared/*` is the established alias for cross-cutting code. Check the project's actual `paths` before
writing imports.

## Parcel wiring

`.parcelrc` routes files so that **arbitrary** `.html` / `.scss` / `.css` files compile to **inline
strings** (importable into decorators), while **entry** files go through the normal bundling pipeline.

```jsonc
{
  "extends": "@parcel/config-default",
  "transformers": {
    "ref:*.{htm,html,xhtml}":        ["@parcel/transformer-posthtml", "@parcel/transformer-html"],
    "{index,app}.{htm,html,xhtml}":  ["@parcel/transformer-posthtml", "@parcel/transformer-html"],
    "*.{htm,html,xhtml}":            ["@parcel/transformer-posthtml", "@parcel/transformer-html",
                                      "@parcel/transformer-inline-string"],

    "ref:*.{sass,scss}":             ["@parcel/transformer-sass"],
    "{index,app}.{sass,scss}":       ["@parcel/transformer-sass"],
    "*.{sass,scss}":                 ["...", "@parcel/transformer-inline-string"],

    // …same three-line pattern for styl/stylus, less, css/pcss, sss…

    "*.{ts,tsx}":                    ["@parcel/transformer-typescript-tsc"],
    "*.png":                         ["@parcel/transformer-raw"]
  },
  "reporters": ["...", "parcel-reporter-static-files-copy"]
}
```

Every build prints `@parcel/optimizer-css: CSS modules cannot be tree shaken` for the entry — expected,
since style files are deliberately imported as strings.

`.posthtmlrc` enables mustache interpolation:
```json
{ "plugins": { "@nubond/posthtml-value-interpolation": {} } }
```

Dev dependencies: `parcel`, `@parcel/transformer-inline-string`, `@parcel/transformer-sass`,
`@parcel/transformer-typescript-tsc`, `parcel-reporter-static-files-copy` (copies `staticFiles`),
`posthtml`, `@nubond/posthtml-value-interpolation`.

Parcel's TypeScript transformer does not type-check. Run `npx tsc --noEmit` (and in CI) — and remember
that template expressions are strings no checker sees.

### Reserved file names

Any file whose basename is `index` or `app` with an HTML or style extension is routed as an **entry /
linked asset**, not an inline string:

- HTML: `index.htm`, `index.html`, `index.xhtml`, `app.htm`, `app.html`, `app.xhtml`
- Stylus: `index.styl`, `index.stylus`, `app.styl`, `app.stylus`
- Sass/SCSS: `index.sass`, `index.scss`, `app.sass`, `app.scss`
- Less: `index.less`, `app.less`
- CSS/PostCSS: `index.css`, `index.pcss`, `app.css`, `app.pcss`
- SugarSS: `index.sss`, `app.sss`

`parcel.d.ts` types these as `default: undefined` so importing one as a template string is a type
error. **Never name a component `index` or `app`.**

### Named pipelines

- `ref:` forces Parcel to reference an asset rather than inline it:
  `<link rel="stylesheet" href="ref:animate.min.css">`
- Combine with `npm:` for `node_modules` assets:
  `<link rel="stylesheet" href="ref:npm:@picocss/pico/css/pico.min.css">`

### `parcel.d.ts`

Declares module types so `import html from './x.html'` and `import css from './x.scss'` are typed as
`string` (and reserved names as `undefined`). Copy it from a template when setting up manually.

## `index.html`

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <base href="/">
    <title>My App</title>
    <link rel="stylesheet" href="./index.scss" />
    <script type="module" src="./index.ts"></script>
  </head>
  <body>
    <main nb-container="%page"></main>
  </body>
</html>
```

The app root binds to `document.body` by default, so `nb-*` attributes work anywhere inside `<body>` —
including route slot containers declared directly in `index.html`.

## Development workflow

1. `npm start` — Parcel dev server with HMR.
2. Keep `showDebugInfo: true` while developing: it surfaces minification warnings, low-performance
   repeat warnings, multi-statement expression warnings, and makes expression errors **throw**.
3. Watch the browser console — nuBond prefixes every message with `nuBond: `.
4. `npm run build` for production. Configure the minifier to **preserve class names**: container,
   component, aspect and transformer names are derived from them.

## Ecosystem packages

| Package | Purpose |
|---|---|
| `nubond` (1.0.8) | The framework. |
| `create-nubond` (1.0.11) | Scaffolder — `npm create nubond <template> <name>`. |
| `@nubond/posthtml-value-interpolation` (1.0.3) | `{{ expr }}` → `<span nb-value="expr">` at build time. |
| nuBond Language Service (VS Code) | Hover, completion, go-to-definition, rename, references, diagnostics, CodeLens across templates and classes. |
