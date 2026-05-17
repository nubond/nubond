import { ContextedBase, ContextInExpressionDetails, ContextBaseBindings } from '../../../../src/nElement/handlers/base/ContextedBase';
import { Attributes } from '../../../../src/nElement/handlers/Attributes';
import { IContextBinder } from '../../../../src/ContextBinder';
import { ExecutionParams } from '../../../../src/expression/ExpressionExecParamsHelper';
import { ExpressionDetails } from '../../../../src/expression/ExpressionDetails';
import { Constants } from '../../../../src/Constants';
import { Helpers } from '../../../../src/Helpers';

// polyfill structuredClone for jsdom
if (typeof globalThis.structuredClone !== 'function') {
    (globalThis as any).structuredClone = (obj: any) => JSON.parse(JSON.stringify(obj));
}

// --- Concrete test subclass --------------------------------------------------

class TestContextedBase extends ContextedBase<string> {
    public commitReturnValue: string | null | undefined = 'entity-1';
    public entityChangeReturnValue: IContextBinder = createMockContextBinder();

    // Expose protected members for testing
    public get exposedPreviousEntityData() { return this.previousEntityData; }
    public get exposedCurrentEntityData() { return this.currentEntityData; }
    public get exposedIsVisible() { return this.isVisible; }
    public set exposedIsVisible(v: boolean) { this.isVisible = v; }
    public get exposedIsEntityDataDirty() { return this.isEntityDataDirty; }
    public set exposedIsEntityDataDirty(v: boolean) { this.isEntityDataDirty = v; }
    public get exposedContextBinder() { return this.contextBinder; }
    public get exposedContextInputValues() { return this.contextInputValues; }
    public get exposedContextInputsWithChangedValue() { return this.contextInputsWithChangedValue; }

    protected onCommit(_entityData: string | null | undefined): string | null | undefined {
        return this.commitReturnValue;
    }

    protected onEntityDataChange(_entityData: string): IContextBinder {
        return this.entityChangeReturnValue;
    }
}

// --- Helpers -----------------------------------------------------------------

function createMockContextBinder(contextObj?: Record<string, any>): IContextBinder {
    return {
        context: contextObj ?? { someProp: 'test' },
        dispose: jest.fn(),
        detectChanges: jest.fn(),
        enableChangeDetection: jest.fn(),
        disableChangeDetection: jest.fn(),
        inputsRefreshIsDone: jest.fn(),
        isChangeDetectionEnabled: true,
        onDispose: jest.fn().mockReturnValue(() => {}),
    } as unknown as IContextBinder;
}

function createElement(attrs?: Record<string, string>): Element {
    const el = document.createElement('div');
    if (attrs) {
        for (const [name, value] of Object.entries(attrs)) {
            el.setAttribute(name, value);
        }
    }
    return el;
}

const PREFIX = Constants.DEFAULT_PREFIX + Constants.DEFAULT_SEPARATOR; // "nb-"

function createHandlerSimple(expression?: string) {
    const el = createElement();
    if (expression !== undefined) {
        el.setAttribute(`${PREFIX}container`, expression);
    }
    const attrs = new Attributes(el);
    return new TestContextedBase(expression, el, attrs, () => true);
}

function createHandlerWithIn(expression: string, inAttrs: Record<string, string>, inRefAttrs?: Record<string, string>) {
    const attrMap: Record<string, string> = { [`${PREFIX}container`]: expression };
    for (const [prop, val] of Object.entries(inAttrs)) {
        attrMap[`${PREFIX}${Constants.IN_HANDLER_ATTRIBUTE_NAME}${Constants.META_VALUE_SEPARATOR}${prop}`] = val;
    }
    if (inRefAttrs) {
        for (const [prop, val] of Object.entries(inRefAttrs)) {
            attrMap[`${PREFIX}${Constants.IN_REF_HANDLER_ATTRIBUTE_NAME}${Constants.META_VALUE_SEPARATOR}${prop}`] = val;
        }
    }
    const el = createElement(attrMap);
    const attrs = new Attributes(el);
    return new TestContextedBase(expression, el, attrs, () => true);
}

// --- Tests -------------------------------------------------------------------

describe('ContextInExpressionDetails', () => {
    it('stores nExpression and ref=false', () => {
        const expr = new ExpressionDetails('this.value');
        const detail = new ContextInExpressionDetails(expr, false);
        expect(detail.nExpression).toBe(expr);
        expect(detail.ref).toBe(false);
    });

    it('stores nExpression and ref=true', () => {
        const expr = new ExpressionDetails('this.value');
        const detail = new ContextInExpressionDetails(expr, true);
        expect(detail.ref).toBe(true);
    });
});

describe('ContextBaseBindings', () => {
    it('sets hasNInExpression to true when map supplied', () => {
        const expr = new ExpressionDetails('this.x');
        const map = new Map();
        const bindings = new ContextBaseBindings(expr, map);
        expect(bindings.hasNInExpression).toBe(true);
        expect(bindings.nInExpression).toBe(map);
    });

    it('sets hasNInExpression to false when map omitted', () => {
        const expr = new ExpressionDetails('this.x');
        const bindings = new ContextBaseBindings(expr);
        expect(bindings.hasNInExpression).toBe(false);
        expect(bindings.nInExpression).toBeUndefined();
    });
});

describe('ContextedBase', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
        consoleSpy.mockRestore();
    });

    // --- Constructor ---

    describe('constructor', () => {
        it('sets hasNExpression=false when expression is undefined', () => {
            const el = createElement();
            const attrs = new Attributes(el);
            const handler = new TestContextedBase(undefined, el, attrs, () => true);
            expect(handler.hasNExpression).toBe(false);
            expect(handler.nExpression).toBeUndefined();
        });

        it('parses simple expression without in-attributes', () => {
            const handler = createHandlerSimple('this.data');
            expect(handler.hasNExpression).toBe(true);
            expect(handler.nExpression).toBeDefined();
            expect(handler.nExpression!.nExpression.expression).toBe('this.data');
            expect(handler.nExpression!.hasNInExpression).toBe(false);
        });

        it('parses in-attributes and creates nInExpression map', () => {
            const handler = createHandlerWithIn('this.data', { 'my-prop': 'this.value' });
            expect(handler.nExpression!.hasNInExpression).toBe(true);
            const inMap = handler.nExpression!.nInExpression!;
            expect(inMap.has('myProp')).toBe(true);
            expect(inMap.get('myProp')!.ref).toBe(false);
            expect(inMap.get('myProp')!.nExpression.expression).toBe('this.value');
        });

        it('parses in-ref attributes with ref=true', () => {
            const handler = createHandlerWithIn('this.data', {}, { 'my-ref': 'this.refValue' });
            const inMap = handler.nExpression!.nInExpression!;
            expect(inMap.has('myRef')).toBe(true);
            expect(inMap.get('myRef')!.ref).toBe(true);
        });

        it('parses both in and in-ref attributes together', () => {
            const handler = createHandlerWithIn('this.data', { 'prop-a': 'this.a' }, { 'prop-b': 'this.b' });
            const inMap = handler.nExpression!.nInExpression!;
            expect(inMap.has('propA')).toBe(true);
            expect(inMap.get('propA')!.ref).toBe(false);
            expect(inMap.has('propB')).toBe(true);
            expect(inMap.get('propB')!.ref).toBe(true);
        });

        it('logs error when in-handler value is empty (undefined)', () => {
            // An attribute present but with no value — Attributes stores it as undefined
            // We need a system attribute key with no value. Let's manually build an element
            // where the attribute has an empty value, which Attributes would store as the raw value.
            // Actually, getAll returns key-value from the system attributes map.
            // An attribute like nb-in: (no property name after :) triggers "name can't be empty".
            const el = createElement({
                [`${PREFIX}container`]: 'this.data',
                [`${PREFIX}${Constants.IN_HANDLER_ATTRIBUTE_NAME}${Constants.META_VALUE_SEPARATOR}`]: 'this.x',
            });
            const attrs = new Attributes(el);
            const handler = new TestContextedBase('this.data', el, attrs, () => true);
            // The property name after "in:" is empty → Console.error
            expect(consoleSpy).toHaveBeenCalled();
        });
    });

    // --- Getters / Setters ---

    describe('getters and setters', () => {
        it('previousEntityData and currentEntityData are undefined initially', () => {
            const handler = createHandlerSimple('this.data');
            expect(handler.exposedPreviousEntityData).toBeUndefined();
            expect(handler.exposedCurrentEntityData).toBeUndefined();
        });

        it('isVisible defaults to true', () => {
            const handler = createHandlerSimple('this.data');
            expect(handler.exposedIsVisible).toBe(true);
        });

        it('isVisible setter marks visibility dirty', () => {
            const handler = createHandlerSimple('this.data');
            handler.exposedIsVisible = false;
            expect(handler.isDirty).toBe(true);
        });

        it('isEntityDataDirty setter works', () => {
            const handler = createHandlerSimple('this.data');
            handler.exposedIsEntityDataDirty = true;
            expect(handler.exposedIsEntityDataDirty).toBe(true);
            expect(handler.isDirty).toBe(true);
        });
    });

    // --- isDirty ---

    describe('isDirty', () => {
        it('returns false by default', () => {
            const handler = createHandlerSimple('this.data');
            expect(handler.isDirty).toBe(false);
        });
    });

    // --- bind ---

    describe('bind', () => {
        it('returns executionParams unchanged when hasNExpression is false', () => {
            const el = createElement();
            const attrs = new Attributes(el);
            const handler = new TestContextedBase(undefined, el, attrs, () => true);
            const params = new ExecutionParams([], []);
            const result = handler.bind(params, jest.fn());
            expect(result).toBe(params);
        });

        it('sets isVisible from isElementVisible and calls onBind', () => {
            let visible = false;
            const el = createElement({ [`${PREFIX}container`]: 'this.data' });
            const attrs = new Attributes(el);
            const handler = new TestContextedBase('this.data', el, attrs, () => visible);
            const execExpr = jest.fn();
            handler.bind(undefined, execExpr);
            expect(handler.exposedIsVisible).toBe(false);
        });

        it('does not call bindInputs when hasNInExpression is false', () => {
            const handler = createHandlerSimple('this.data');
            const execExpr = jest.fn();
            handler.bind(undefined, execExpr);
            // No in-expressions, so executeExpression should not be called for inputs
            expect(execExpr).not.toHaveBeenCalled();
        });

        it('stores executionParams and executeExpression when hasNInExpression', () => {
            const handler = createHandlerWithIn('this.data', { 'my-prop': 'this.value' });
            const execExpr = jest.fn();
            const params = new ExecutionParams([], []);
            // No contextBinder yet, so bindInputs won't fire
            handler.bind(params, execExpr);
            expect(execExpr).not.toHaveBeenCalled(); // no contextBinder
        });

        it('calls bindInputs when contextBinder exists and element is visible', () => {
            const handler = createHandlerWithIn('this.data', { 'my-prop': 'this.value' });
            const mockBinder = createMockContextBinder({ myProp: 'old' });
            handler.entityChangeReturnValue = mockBinder;

            // First: bind to store _executionParams/_executeExpression, then commit to create contextBinder
            const setupExpr = jest.fn().mockReturnValue('old');
            handler.bind(undefined, setupExpr);
            handler.exposedIsEntityDataDirty = true;
            handler.commitReturnValue = 'entity-1';
            handler.commit();

            // Now bind — contextBinder exists, visible=true
            const execExpr = jest.fn().mockReturnValue('newVal');
            handler.bind(undefined, execExpr);
            expect(execExpr).toHaveBeenCalled();
        });

        it('does not call bindInputs when contextBinder exists but not visible', () => {
            let visible = true;
            const el = createElement({
                [`${PREFIX}container`]: 'this.data',
                [`${PREFIX}${Constants.IN_HANDLER_ATTRIBUTE_NAME}${Constants.META_VALUE_SEPARATOR}my-prop`]: 'this.value',
            });
            const attrs = new Attributes(el);
            const handler = new TestContextedBase('this.data', el, attrs, () => visible);
            const mockBinder = createMockContextBinder({ myProp: 'old' });
            handler.entityChangeReturnValue = mockBinder;

            // bind first to store _executeExpression, then commit
            const setupExpr = jest.fn().mockReturnValue('old');
            handler.bind(undefined, setupExpr);
            handler.exposedIsEntityDataDirty = true;
            handler.commitReturnValue = 'entity-1';
            handler.commit();

            // Now make not visible and bind — should NOT call bindInputs
            visible = false;
            const execExpr = jest.fn().mockReturnValue('newVal');
            handler.bind(undefined, execExpr);
            expect(execExpr).not.toHaveBeenCalled();
        });
    });

    // --- commit ---

    describe('commit', () => {
        it('returns false when not dirty', () => {
            const handler = createHandlerSimple('this.data');
            expect(handler.commit()).toBe(false);
        });

        it('first commit: creates contextBinder and sets previousEntityData', () => {
            const handler = createHandlerSimple('this.data');
            const mockBinder = createMockContextBinder();
            handler.entityChangeReturnValue = mockBinder;
            handler.commitReturnValue = 'entity-1';
            handler.exposedIsEntityDataDirty = true;

            const result = handler.commit();
            expect(result).toBe(true);
            expect(handler.exposedPreviousEntityData).toBe('entity-1');
            expect(handler.exposedCurrentEntityData).toBe('entity-1');
            expect(handler.exposedContextBinder).toBe(mockBinder);
        });

        it('second commit with different entity data disposes old and creates new', () => {
            const handler = createHandlerSimple('this.data');
            const mockBinder1 = createMockContextBinder();
            const mockBinder2 = createMockContextBinder();

            // First commit
            handler.entityChangeReturnValue = mockBinder1;
            handler.commitReturnValue = 'entity-1';
            handler.exposedIsEntityDataDirty = true;
            handler.commit();

            // Second commit with different data
            handler.entityChangeReturnValue = mockBinder2;
            handler.commitReturnValue = 'entity-2';
            handler.exposedIsEntityDataDirty = true;
            handler.commit();

            expect(mockBinder1.dispose).toHaveBeenCalled();
            expect(handler.exposedContextBinder).toBe(mockBinder2);
            expect(handler.exposedPreviousEntityData).toBe('entity-2');
        });

        it('calls notifyContextAttached when provided', () => {
            const attached = jest.fn();
            const el = createElement({ [`${PREFIX}container`]: 'this.data' });
            const attrs = new Attributes(el);
            const handler = new TestContextedBase('this.data', el, attrs, () => true, attached);
            const ctx = { someProp: 'test' };
            const mockBinder = createMockContextBinder(ctx);
            handler.entityChangeReturnValue = mockBinder;
            handler.commitReturnValue = 'entity-1';
            handler.exposedIsEntityDataDirty = true;
            handler.commit();

            expect(attached).toHaveBeenCalledWith(ctx);
        });

        it('disposes when onCommit returns undefined', () => {
            const handler = createHandlerSimple('this.data');
            const mockBinder = createMockContextBinder();
            handler.entityChangeReturnValue = mockBinder;

            // First commit to establish contextBinder
            handler.commitReturnValue = 'entity-1';
            handler.exposedIsEntityDataDirty = true;
            handler.commit();

            // Second commit returns undefined
            handler.commitReturnValue = undefined;
            handler.exposedIsEntityDataDirty = true;
            handler.commit();

            expect(mockBinder.dispose).toHaveBeenCalled();
            expect(handler.exposedContextBinder).toBeUndefined();
        });

        it('does nothing when same entity data is committed', () => {
            const handler = createHandlerSimple('this.data');
            const mockBinder = createMockContextBinder();
            handler.entityChangeReturnValue = mockBinder;
            handler.commitReturnValue = 'entity-1';

            handler.exposedIsEntityDataDirty = true;
            handler.commit();

            // Commit same entity again
            handler.exposedIsEntityDataDirty = true;
            handler.commit();

            // previousEntityData === currentEntityData → no change
            expect(handler.exposedPreviousEntityData).toBe('entity-1');
        });

        it('does not create contextBinder when currentEntityData is null', () => {
            const handler = createHandlerSimple('this.data');
            handler.commitReturnValue = null;
            handler.exposedIsEntityDataDirty = true;
            handler.commit();
            // null !== undefined so isUndefined check passes, and null != null is false → no onEntityDataChange
            expect(handler.exposedContextBinder).toBeUndefined();
        });

        // --- Visibility dirty ---

        it('enables change detection when becoming visible', () => {
            const handler = createHandlerSimple('this.data');
            const mockBinder = createMockContextBinder();
            handler.entityChangeReturnValue = mockBinder;
            handler.commitReturnValue = 'entity-1';
            handler.exposedIsEntityDataDirty = true;
            handler.commit();

            // Make not visible then commit
            handler.exposedIsVisible = false;
            handler.commit();
            expect(mockBinder.disableChangeDetection).toHaveBeenCalled();

            // Make visible again
            handler.exposedIsVisible = true;
            handler.commit();
            expect(mockBinder.enableChangeDetection).toHaveBeenCalled();
        });

        it('does not toggle change detection when visibility stays the same', () => {
            const handler = createHandlerSimple('this.data');
            const mockBinder = createMockContextBinder();
            handler.entityChangeReturnValue = mockBinder;
            handler.commitReturnValue = 'entity-1';
            handler.exposedIsEntityDataDirty = true;
            handler.commit();

            // Set visible to true (same as previous) via setter to mark dirty
            handler.exposedIsVisible = true;
            handler.commit();
            expect(mockBinder.enableChangeDetection).not.toHaveBeenCalled();
            expect(mockBinder.disableChangeDetection).not.toHaveBeenCalled();
        });

        it('handles visibility dirty without contextBinder', () => {
            const handler = createHandlerSimple('this.data');
            handler.exposedIsVisible = false;
            handler.commit(); // no contextBinder, just clears dirty flag
            expect(handler.isDirty).toBe(false);
        });

        // --- Inputs dirty ---

        it('processes input changes with contextBinder (non-ref = structuredClone)', () => {
            const handler = createHandlerWithIn('this.data', { 'my-prop': 'this.value' });
            const ctx: Record<string, any> = { myProp: 'old' };
            const mockBinder = createMockContextBinder(ctx);
            handler.entityChangeReturnValue = mockBinder;
            handler.commitReturnValue = 'entity-1';

            // First commit to establish contextBinder
            handler.exposedIsEntityDataDirty = true;
            const execExpr = jest.fn().mockReturnValue({ nested: 'val' });
            handler.bind(undefined, execExpr);
            handler.commit();

            // Now bind again with a new object value to trigger input change
            execExpr.mockReturnValue({ nested: 'new' });
            handler.bind(undefined, execExpr);
            handler.commit();

            // non-ref: structuredClone should be used. Check context got the value.
            expect(ctx['myProp']).toEqual({ nested: 'new' });
            expect(mockBinder.inputsRefreshIsDone).toHaveBeenCalled();
            expect(mockBinder.detectChanges).toHaveBeenCalled();
        });

        it('processes input changes with in-ref (no structuredClone, same reference)', () => {
            const handler = createHandlerWithIn('this.data', {}, { 'my-ref': 'this.refValue' });
            const ctx: Record<string, any> = { myRef: 'old' };
            const mockBinder = createMockContextBinder(ctx);
            handler.entityChangeReturnValue = mockBinder;
            handler.commitReturnValue = 'entity-1';

            handler.exposedIsEntityDataDirty = true;
            const refObj = { nested: 'val' };
            const execExpr = jest.fn().mockReturnValue(refObj);
            handler.bind(undefined, execExpr);
            handler.commit();

            // Now bind again with different value
            const refObj2 = { nested: 'new' };
            execExpr.mockReturnValue(refObj2);
            handler.bind(undefined, execExpr);
            handler.commit();

            // ref: should be the exact same reference (no clone)
            expect(ctx['myRef']).toBe(refObj2);
        });

        it('clears changed inputs without contextBinder', () => {
            const handler = createHandlerWithIn('this.data', { 'my-prop': 'this.value' });
            const mockBinder = createMockContextBinder({ myProp: 'old' });
            handler.entityChangeReturnValue = mockBinder;
            handler.commitReturnValue = 'entity-1';

            // Establish contextBinder
            handler.exposedIsEntityDataDirty = true;
            const execExpr = jest.fn().mockReturnValue('newVal');
            handler.bind(undefined, execExpr);
            handler.commit();

            // Trigger input change
            execExpr.mockReturnValue('anotherVal');
            handler.bind(undefined, execExpr);

            // Now dispose contextBinder before commit
            handler.dispose();

            // Create fresh handler where inputs dirty but no contextBinder
            const handler2 = createHandlerWithIn('this.data', { 'my-prop': 'this.value' });
            const mockBinder2 = createMockContextBinder({ myProp: 'old' });
            handler2.entityChangeReturnValue = mockBinder2;
            handler2.commitReturnValue = 'entity-1';

            handler2.exposedIsEntityDataDirty = true;
            const execExpr2 = jest.fn().mockReturnValue('val1');
            handler2.bind(undefined, execExpr2);
            handler2.commit();

            // Now trigger input dirty
            execExpr2.mockReturnValue('val2');
            handler2.bind(undefined, execExpr2);

            // Simulate disposing contextBinder then committing with inputs dirty
            // We need to delete contextBinder to trigger the else branch on line 240
            (handler2 as any).contextBinder = undefined;
            handler2.commit();
            // The contextInputsWithChangedValue should have been cleared
            expect(handler2.exposedContextInputsWithChangedValue!.size).toBe(0);
        });

        it('commits with in-expressions: initializes contextInputValues on entity data change', () => {
            const handler = createHandlerWithIn('this.data', { 'my-prop': 'this.value' });
            const mockBinder = createMockContextBinder({ myProp: 'initial' });
            handler.entityChangeReturnValue = mockBinder;
            handler.commitReturnValue = 'entity-1';

            // bind first so _executionParams and _executeExpression are stored
            const execExpr = jest.fn().mockReturnValue('inputVal');
            handler.bind(undefined, execExpr);

            // Now commit — should create contextInputValues, contextInputsWithChangedValue, and call bindInputs
            handler.exposedIsEntityDataDirty = true;
            handler.commit();

            expect(handler.exposedContextInputValues).toBeInstanceOf(Map);
            expect(handler.exposedContextInputsWithChangedValue).toBeInstanceOf(Set);
        });
    });

    // --- dispose ---

    describe('dispose', () => {
        it('does nothing when hasNExpression is false', () => {
            const el = createElement();
            const attrs = new Attributes(el);
            const handler = new TestContextedBase(undefined, el, attrs, () => true);
            // Should not throw
            handler.dispose();
        });

        it('disposes contextBinder and calls notifyContextDetached', () => {
            const detached = jest.fn();
            const el = createElement({ [`${PREFIX}container`]: 'this.data' });
            const attrs = new Attributes(el);
            const handler = new TestContextedBase('this.data', el, attrs, () => true, undefined, detached);
            const ctx = { someProp: 'test' };
            const mockBinder = createMockContextBinder(ctx);
            handler.entityChangeReturnValue = mockBinder;
            handler.commitReturnValue = 'entity-1';
            handler.exposedIsEntityDataDirty = true;
            handler.commit();

            handler.dispose();

            expect(detached).toHaveBeenCalledWith(ctx);
            expect(mockBinder.dispose).toHaveBeenCalled();
            expect(handler.exposedContextBinder).toBeUndefined();
            expect(handler.exposedPreviousEntityData).toBeUndefined();
            expect(handler.exposedCurrentEntityData).toBeUndefined();
        });

        it('disposes without notifyContextDetached when callback not provided', () => {
            const handler = createHandlerSimple('this.data');
            const mockBinder = createMockContextBinder();
            handler.entityChangeReturnValue = mockBinder;
            handler.commitReturnValue = 'entity-1';
            handler.exposedIsEntityDataDirty = true;
            handler.commit();

            handler.dispose();
            expect(mockBinder.dispose).toHaveBeenCalled();
        });

        it('handles dispose when contextBinder was never created', () => {
            const handler = createHandlerSimple('this.data');
            handler.dispose();
            // Should not throw
        });
    });

    // --- onBind (default) ---

    describe('onBind', () => {
        it('returns executionParams by default', () => {
            const handler = createHandlerSimple('this.data');
            const params = new ExecutionParams(['a'], [1]);
            const result = handler.onBind(params, jest.fn());
            expect(result).toBe(params);
        });
    });

    // --- setInputValue ---

    describe('setInputValue', () => {
        it('does not mark dirty when value is equal to existing', () => {
            const handler = createHandlerWithIn('this.data', { 'my-prop': 'this.value' });
            const mockBinder = createMockContextBinder({ myProp: 'same' });
            handler.entityChangeReturnValue = mockBinder;
            handler.commitReturnValue = 'entity-1';

            // bind first to store _executeExpression, then commit
            const execExpr = jest.fn().mockReturnValue('same');
            handler.bind(undefined, execExpr);
            handler.exposedIsEntityDataDirty = true;
            handler.commit(); // clears visibility dirty + creates contextBinder

            // Bind again with same value
            handler.bind(undefined, execExpr);
            // commit to clear visibility dirty from second bind
            handler.commit();
            // Now isDirty should be false since input value hasn't changed
            expect(handler.isDirty).toBe(false);
        });

        it('marks dirty when value differs from contextInputValues entry', () => {
            const handler = createHandlerWithIn('this.data', { 'my-prop': 'this.value' });
            const mockBinder = createMockContextBinder({ myProp: 'initial' });
            handler.entityChangeReturnValue = mockBinder;
            handler.commitReturnValue = 'entity-1';

            handler.exposedIsEntityDataDirty = true;
            const execExpr = jest.fn().mockReturnValue('first');
            handler.bind(undefined, execExpr);
            handler.commit();

            // Now bind with a different value
            execExpr.mockReturnValue('second');
            handler.bind(undefined, execExpr);
            expect(handler.isDirty).toBe(true);
        });
    });

    // --- disposeProtected (partial=false via second commit) ---

    describe('disposeProtected partial (full=false)', () => {
        it('preserves previousEntityData/currentEntityData on partial dispose', () => {
            const detached = jest.fn();
            const el = createElement({ [`${PREFIX}container`]: 'this.data' });
            const attrs = new Attributes(el);
            const handler = new TestContextedBase('this.data', el, attrs, () => true, undefined, detached);
            const ctx1 = { prop: 'v1' };
            const mockBinder1 = createMockContextBinder(ctx1);
            const ctx2 = { prop: 'v2' };
            const mockBinder2 = createMockContextBinder(ctx2);

            // First commit
            handler.entityChangeReturnValue = mockBinder1;
            handler.commitReturnValue = 'entity-1';
            handler.exposedIsEntityDataDirty = true;
            handler.commit();

            // Second commit with different data → partial dispose (full=false)
            handler.entityChangeReturnValue = mockBinder2;
            handler.commitReturnValue = 'entity-2';
            handler.exposedIsEntityDataDirty = true;
            handler.commit();

            // Old binder disposed, detached called with old context
            expect(mockBinder1.dispose).toHaveBeenCalled();
            expect(detached).toHaveBeenCalledWith(ctx1);
            // New contextBinder established
            expect(handler.exposedContextBinder).toBe(mockBinder2);
            // Previous entity data is updated to new
            expect(handler.exposedPreviousEntityData).toBe('entity-2');
        });
    });

    // --- Edge case: commit with null entityData ---

    describe('commit edge cases', () => {
        it('handles onCommit returning null (not undefined) — skips onEntityDataChange', () => {
            const handler = createHandlerSimple('this.data');
            handler.commitReturnValue = null;
            handler.exposedIsEntityDataDirty = true;
            handler.commit();

            // null is not undefined, so isUndefined returns false.
            // But null != null is false, so onEntityDataChange is not called.
            expect(handler.exposedContextBinder).toBeUndefined();
            expect(handler.exposedCurrentEntityData).toBeNull();
        });

        it('handles commit with in-expressions: bindInputs called during entity data change', () => {
            const handler = createHandlerWithIn('this.data', { 'my-prop': 'this.value' });
            const ctx: Record<string, any> = { myProp: 'old' };
            const mockBinder = createMockContextBinder(ctx);
            handler.entityChangeReturnValue = mockBinder;
            handler.commitReturnValue = 'entity-1';

            // bind first to store _executionParams and _executeExpression
            const execExpr = jest.fn().mockReturnValue('inputVal');
            handler.bind(undefined, execExpr);

            handler.exposedIsEntityDataDirty = true;
            handler.commit();

            // bindInputs was called during commit because hasNInExpression
            expect(execExpr).toHaveBeenCalled();
        });

        it('primitive input value uses direct assignment (not structuredClone)', () => {
            const handler = createHandlerWithIn('this.data', { 'my-prop': 'this.value' });
            const ctx: Record<string, any> = { myProp: 'old' };
            const mockBinder = createMockContextBinder(ctx);
            handler.entityChangeReturnValue = mockBinder;
            handler.commitReturnValue = 'entity-1';

            handler.exposedIsEntityDataDirty = true;
            const execExpr = jest.fn().mockReturnValue(42);
            handler.bind(undefined, execExpr);
            handler.commit();

            // Now change input and commit
            execExpr.mockReturnValue(99);
            handler.bind(undefined, execExpr);
            handler.commit();

            expect(ctx['myProp']).toBe(99);
        });
    });
});
