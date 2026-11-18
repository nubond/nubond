// A custom router (any object implementing IRouter) handed to Environment.setupRouter — via @AppRoot(…, router)
// or $Route(router) — replaces the built-in Router: it is what Environment.router returns, what nb-container="%slot"
// follows, what an nb-event expression gets as `router`, and what a Router-typed constructor parameter receives.
import type { IRouter } from '../src/Router';

// polyfill CSSStyleSheet.replaceSync for jsdom
if (typeof CSSStyleSheet.prototype.replaceSync !== 'function') {
    CSSStyleSheet.prototype.replaceSync = function (text: string) {};
}

// Environment is a static singleton: every test gets a fresh one (and the matching Router / Constants classes)
let Environment: typeof import('../src/Environment').Environment;
let Router: typeof import('../src/Router').Router;
let Constants: typeof import('../src/Constants').Constants;

beforeEach(() => {
    jest.resetModules();
    Environment = (jest.requireActual('../src/Environment') as typeof import('../src/Environment')).Environment;
    Router = (jest.requireActual('../src/Router') as typeof import('../src/Router')).Router;
    Constants = (jest.requireActual('../src/Constants') as typeof import('../src/Constants')).Constants;
    (console.error as jest.Mock).mockClear();
});

beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterAll(() => {
    (console.error as jest.Mock).mockRestore();
});

function errorLogged(text: string): boolean {
    return (console.error as jest.Mock).mock.calls.some(call => call.some((part: any) => String(part).includes(text)));
}

type State = {[key: string]: string | undefined};

// An in-memory router: no history, no URL — state changes only through go()
class MemoryRouter implements IRouter {
    private _state: State;
    private readonly _beforeCallBacks = new Set<(preventChange: () => void, oldState: State, newState: State, oldPath: string, newPath: string) => void>();
    private readonly _afterCallBacks = new Set<(oldState: State, newState: State, oldPath: string, newPath: string) => void>();

    public readonly goCalls: Array<[any, boolean | undefined, boolean | undefined]> = [];

    constructor(initialState: State, private readonly _isConfigured: boolean = true) {
        this._state = { ...initialState };
    }

    public get isConfigured(): boolean { return this._isConfigured; }
    public get hashBased(): boolean { return false; }
    public get path(): string | undefined { return '/' + Object.values(this._state).join('/'); }
    public get state(): Readonly<State> | undefined { return this._state; }

    public go(state?: {[key: string]: string | number | null | undefined} | string, partialState?: boolean, removeHistory?: boolean): void {
        this.goCalls.push([state, partialState, removeHistory]);

        const oldState = this._state;
        const oldPath = this.path!;
        const delta: State = {};
        for (const [key, value] of Object.entries(<object>state ?? {})) {
            delta[key] = value === null || value === undefined ? undefined : String(value);
        }
        const newState = partialState === false ? delta : { ...oldState, ...delta };

        let prevented = false;
        for (const callBack of this._beforeCallBacks) {
            callBack(() => prevented = true, oldState, newState, oldPath, '/' + Object.values(newState).join('/'));
        }

        if (!prevented) {
            this._state = newState;
            for (const callBack of this._afterCallBacks) {
                callBack(oldState, newState, oldPath, this.path!);
            }
        }
    }

    public goBack(): void {}
    public goTo(offset: number): void {}
    public goForward(): void {}

    public onBeforeStateChange(callBack: (preventChange: () => void, oldState: State, newState: State, oldPath: string, newPath: string) => void): () => void {
        this._beforeCallBacks.add(callBack);
        return () => this._beforeCallBacks.delete(callBack);
    }

    public onAfterStateChange(callBack: (oldState: State, newState: State, oldPath: string, newPath: string) => void): () => void {
        this._afterCallBacks.add(callBack);
        return () => this._afterCallBacks.delete(callBack);
    }

    public get afterSubscriptionCount(): number {
        return this._afterCallBacks.size;
    }
}

function createLiteralRouter(): IRouter {
    return {
        isConfigured: true,
        hashBased: false,
        path: undefined,
        state: undefined,
        go: () => {},
        goBack: () => {},
        goTo: () => {},
        goForward: () => {},
        onBeforeStateChange: () => () => {},
        onAfterStateChange: () => () => {},
    };
}

describe('Environment.setupRouter with a custom router', () => {
    it('should use the custom router as is (not wrapped in a Router)', () => {
        const router = new MemoryRouter({ page: 'home' });

        Environment.setupRouter(router);

        expect(Environment.router).toBe(router);
        expect(Environment.router).not.toBeInstanceOf(Router);
    });

    it('should accept an object literal router', () => {
        const router = createLiteralRouter();

        Environment.setupRouter(router);

        expect(Environment.router).toBe(router);
    });

    it('should keep the first custom router and log when another router is set up', () => {
        const first = new MemoryRouter({ page: 'home' });
        Environment.setupRouter(first);

        expect(() => Environment.setupRouter(new MemoryRouter({ page: 'other' }))).not.toThrow();

        expect(Environment.router).toBe(first);
        expect(errorLogged('Router is already initialized')).toBe(true);
    });

    it('should keep the custom router and log when a route template is set up after it', () => {
        const router = new MemoryRouter({ page: 'home' });
        Environment.setupRouter(router);

        Environment.setupRouter('/[page=home]');

        expect(Environment.router).toBe(router);
        expect(errorLogged('Router is already initialized')).toBe(true);
    });

    it('should log and keep the built-in router when a custom router comes after it', () => {
        Environment.setupRouter(undefined);   //what the first @AppRoot without a route does
        const builtIn = Environment.router;

        Environment.setupRouter(new MemoryRouter({ page: 'home' }));

        expect(Environment.router).toBe(builtIn);
        expect(Environment.router).toBeInstanceOf(Router);
        expect(errorLogged('Router is already initialized')).toBe(true);
    });

    it('should stay silent on a later setupRouter(undefined) (a second @AppRoot without a route)', () => {
        const router = new MemoryRouter({ page: 'home' });
        Environment.setupRouter(router);

        Environment.setupRouter(undefined);

        expect(Environment.router).toBe(router);
        expect(errorLogged('Router is already initialized')).toBe(false);
    });
});

// A custom router is injected by its own class only (by design): it is registered under its constructor,
// so a Router-typed parameter is not resolved once a custom router is in place.
describe('dependency injection of a custom router', () => {
    it('should not inject a custom router into a Router-typed parameter (by design: inject it by its own class)', () => {
        const router = new MemoryRouter({ page: 'home' });
        Environment.setupRouter(router);

        class UsesRouter { constructor(public readonly router: any) {} }
        Environment.registerInjectable(UsesRouter as any, [Router as any], false);

        const instance = <UsesRouter>Environment.injectables.resolve(UsesRouter as any);

        expect(instance.router).toBeUndefined();
        expect(errorLogged("Injection 'Router' cannot be resolved")).toBe(true);
    });

    it('should inject the custom router into a parameter typed with its own class', () => {
        const router = new MemoryRouter({ page: 'home' });
        Environment.setupRouter(router);

        class UsesMemoryRouter { constructor(public readonly router: any) {} }
        Environment.registerInjectable(UsesMemoryRouter as any, [MemoryRouter as any], false);

        const instance = <UsesMemoryRouter>Environment.injectables.resolve(UsesMemoryRouter as any);

        expect(instance.router).toBe(router);
    });

    // OPEN: an object literal router is registered under its constructor, which is Object — the key TypeScript emits
    // for every interface- / any-typed parameter — so such a parameter anywhere in the app silently receives the
    // router instead of the documented Console.error + undefined. Pinned with it.failing until decided.
    it.failing('should not hand an object literal router to an interface- / any-typed (Object) parameter', () => {
        const router = createLiteralRouter();
        Environment.setupRouter(router);

        class UsesInterface { constructor(public readonly dependency: any) {} }
        Environment.registerInjectable(UsesInterface as any, [Object as any], false);

        const instance = <UsesInterface>Environment.injectables.resolve(UsesInterface as any);

        expect(instance.dependency).toBeUndefined();
        expect(errorLogged("Injection 'Object' cannot be resolved")).toBe(true);
    });

    it('should still inject the built-in router into a Router-typed parameter', () => {
        Environment.setupRouter('/[page=home]');

        class UsesBuiltInRouter { constructor(public readonly router: any) {} }
        Environment.registerInjectable(UsesBuiltInRouter as any, [Router as any], false);

        const instance = <UsesBuiltInRouter>Environment.injectables.resolve(UsesBuiltInRouter as any);

        expect(instance.router).toBe(Environment.router);
        expect(instance.router).toBeInstanceOf(Router);
    });
});

describe('an app driven by a custom router', () => {
    let roots: Array<HTMLElement> = [];

    beforeEach(() => jest.useFakeTimers());

    afterEach(() => {
        for (const root of roots) {
            root.remove();
        }
        roots = [];
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
    });

    function startApp(html: string, context: any = class {}): HTMLElement {
        const root = document.createElement('div');
        root.innerHTML = html;
        document.body.appendChild(root);
        roots.push(root);

        Environment.addApp(root, context, []);
        jest.runAllTimers();

        return root;
    }

    function slotText(root: HTMLElement): string {
        return Array.from(root.querySelectorAll('[data-page]')).map(el => el.textContent).join(',');
    }

    it('should render the container named by the custom router state in nb-container="%slot"', () => {
        Environment.addContainer('customRouterPageA', class {} as any, [], '<span data-page>A</span>', undefined);
        Environment.addContainer('customRouterPageB', class {} as any, [], '<span data-page>B</span>', undefined);
        const router = new MemoryRouter({ main: 'customRouterPageA' });
        Environment.setupRouter(router);

        const root = startApp('<div nb-container="%main"></div>');

        expect(slotText(root)).toBe('A');
    });

    it('should switch the container when the custom router changes state', () => {
        Environment.addContainer('customRouterSwitchA', class {} as any, [], '<span data-page>A</span>', undefined);
        Environment.addContainer('customRouterSwitchB', class {} as any, [], '<span data-page>B</span>', undefined);
        const router = new MemoryRouter({ main: 'customRouterSwitchA' });
        Environment.setupRouter(router);
        const root = startApp('<div nb-container="%main"></div>');

        router.go({ main: 'customRouterSwitchB' });
        jest.runAllTimers();

        expect(slotText(root)).toBe('B');
    });

    it('should empty the slot when the custom router state no longer names it', () => {
        Environment.addContainer('customRouterEmptyA', class {} as any, [], '<span data-page>A</span>', undefined);
        const router = new MemoryRouter({ main: 'customRouterEmptyA' });
        Environment.setupRouter(router);
        const root = startApp('<div nb-container="%main"></div>');

        router.go({ main: undefined });
        jest.runAllTimers();

        expect(slotText(root)).toBe('');
    });

    it('should unsubscribe the slot from the custom router when the app is removed', () => {
        Environment.addContainer('customRouterDisposeA', class {} as any, [], '<span data-page>A</span>', undefined);
        const router = new MemoryRouter({ main: 'customRouterDisposeA' });
        Environment.setupRouter(router);
        const root = startApp('<div nb-container="%main"></div>');
        expect(router.afterSubscriptionCount).toBe(1);

        root.remove();
        router.go({ main: 'customRouterDisposeA' });   //any detection pass notices the detached root and disposes it
        jest.runAllTimers();

        expect(router.afterSubscriptionCount).toBe(0);
    });

    it('should expose the custom router as `router` in nb-event expressions', () => {
        let context: any;
        class EventCtx {
            public received: any;
            constructor() { context = this; }
        }
        const router = new MemoryRouter({ main: 'x' });
        Environment.setupRouter(router);
        const root = startApp('<button nb-event:click="this.received = router"></button>', EventCtx);

        root.querySelector('button')!.click();

        expect(context.received).toBe(router);
    });

    it('should let an nb-event expression navigate through the custom router', () => {
        const router = new MemoryRouter({ main: 'x' });
        Environment.setupRouter(router);
        const root = startApp(`<button nb-event:click="router.go({ main: 'y' })"></button>`);

        root.querySelector('button')!.click();

        expect(router.goCalls).toEqual([[{ main: 'y' }, undefined, undefined]]);
        expect(router.state).toEqual({ main: 'y' });
    });

    it('should not expose an unconfigured custom router to nb-event expressions', () => {
        let context: any;
        class UnconfiguredEventCtx {
            public received: any = 'untouched';
            constructor() { context = this; }
        }
        Environment.setupRouter(new MemoryRouter({ main: 'x' }, false));
        const root = startApp('<button nb-event:click="this.received = typeof router"></button>', UnconfiguredEventCtx);

        root.querySelector('button')!.click();

        expect(context.received).toBe('undefined');
    });

    it('should report a route slot bound to an unconfigured custom router', () => {
        Environment.setupRouter(new MemoryRouter({ main: 'x' }, false));

        startApp('<div nb-container="%main"></div>');

        expect(errorLogged('container is mapped to route, that is not configured')).toBe(true);
    });
});
