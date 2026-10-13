import { ContextedBase, ContextInExpressionDetails, ContextBaseBindings } from '../../../../src/nElement/handlers/base/ContextedBase';
import { Attributes } from '../../../../src/nElement/handlers/Attributes';
import { IContextBinder } from '../../../../src/ContextBinder';
import { ExecutionParams } from '../../../../src/expression/ExpressionExecParamsHelper';
import { ExpressionDetails } from '../../../../src/expression/ExpressionDetails';
import { Constants } from '../../../../src/Constants';
import { Helpers } from '../../../../src/Helpers';

// ExecutionParams is built incrementally (add / addOrReplace); this keeps the specs terse.
function createParams(names: Array<string>, values: Array<any>): ExecutionParams {
    const params = new ExecutionParams();
    names.forEach((name, index) => params.add(name, values[index]));
    return params;
}

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
        changeDetectionEnabled: true,
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
    const attrs = new Attributes(el, () => false);
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
    const attrs = new Attributes(el, () => false);
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
            const attrs = new Attributes(el, () => false);
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

        it('keeps the in-entry and logs an error when in-ref targets the same name (first wins)', () => {
            const handler = createHandlerWithIn('this.data', { 'my-prop': 'this.value' }, { 'my-prop': 'this.refValue' });
            const inMap = handler.nExpression!.nInExpression!;
            expect(inMap.size).toBe(1);
            expect(inMap.get('myProp')!.ref).toBe(false);
            expect(inMap.get('myProp')!.nExpression.expression).toBe('this.value');
            expect(consoleSpy).toHaveBeenCalledWith('nuBond: ', expect.anything(),
                                                    'multiple handlers for one in (myProp) are not supported');
        });

        it('lets in win over in-ref on a name collision even when in-ref is declared first', () => {
            const attrMap: Record<string, string> = {
                [`${PREFIX}container`]: 'this.data',
                [`${PREFIX}${Constants.IN_REF_HANDLER_ATTRIBUTE_NAME}${Constants.META_VALUE_SEPARATOR}my-prop`]: 'this.refValue',
                [`${PREFIX}${Constants.IN_HANDLER_ATTRIBUTE_NAME}${Constants.META_VALUE_SEPARATOR}my-prop`]: 'this.value',
            };
            const el = createElement(attrMap);
            const attrs = new Attributes(el, () => false);
            const handler = new TestContextedBase('this.data', el, attrs, () => true);
            const inMap = handler.nExpression!.nInExpression!;
            expect(inMap.size).toBe(1);
            expect(inMap.get('myProp')!.ref).toBe(false);
            expect(consoleSpy).toHaveBeenCalledWith('nuBond: ', expect.anything(),
                                                    'multiple handlers for one in (myProp) are not supported');
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
            const attrs = new Attributes(el, () => false);
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
            const attrs = new Attributes(el, () => false);
            const handler = new TestContextedBase(undefined, el, attrs, () => true);
            const params = createParams([], []);
            const result = handler.bind(params, jest.fn());
            expect(result).toBe(params);
        });

        it('sets isVisible from isElementVisible and calls onBind', () => {
            let visible = false;
            const el = createElement({ [`${PREFIX}container`]: 'this.data' });
            const attrs = new Attributes(el, () => false);
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
            const params = createParams([], []);
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
            const attrs = new Attributes(el, () => false);
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
            const attrs = new Attributes(el, () => false);
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

    // --- commit while the element is hidden ---

    // the entity block is skipped while the element is hidden and the entity dirty flag is kept,
    // so the request stays owed and is paid by the first commit that finds the element visible
    describe('commit while the element is hidden', () => {
        it('does not call onCommit and keeps the entity request owed', () => {
            const handler = createHandlerSimple('this.data');
            const onCommit = jest.spyOn(handler as any, 'onCommit');
            handler.exposedIsEntityDataDirty = true;
            handler.exposedIsVisible = false;

            // first hidden commit reports the visibility flip only
            expect(handler.commit()).toBe(true);
            // nothing left to report: a hidden tree is stable although the request is still owed
            expect(handler.commit()).toBe(false);

            expect(onCommit).not.toHaveBeenCalled();
            expect(handler.exposedContextBinder).toBeUndefined();
            expect(handler.exposedCurrentEntityData).toBeUndefined();
            expect(handler.exposedIsEntityDataDirty).toBe(true);
            expect(handler.isDirty).toBe(true);
        });

        it('pays the owed request on the first visible commit', () => {
            const attached = jest.fn();
            const el = createElement({ [`${PREFIX}container`]: 'this.data' });
            const attrs = new Attributes(el, () => false);
            const handler = new TestContextedBase('this.data', el, attrs, () => true, attached);
            const onCommit = jest.spyOn(handler as any, 'onCommit');
            const ctx = { someProp: 'test' };
            const mockBinder = createMockContextBinder(ctx);
            handler.entityChangeReturnValue = mockBinder;
            handler.exposedIsEntityDataDirty = true;

            handler.exposedIsVisible = false;
            handler.commit();
            handler.commit();
            expect(attached).not.toHaveBeenCalled();

            handler.exposedIsVisible = true;
            expect(handler.commit()).toBe(true);

            expect(onCommit).toHaveBeenCalledTimes(1);
            expect(handler.exposedContextBinder).toBe(mockBinder);
            expect(handler.exposedPreviousEntityData).toBe('entity-1');
            expect(attached).toHaveBeenCalledWith(ctx);
            expect(handler.exposedIsEntityDataDirty).toBe(false);
            expect(handler.isDirty).toBe(false);
        });

        it('keeps a request raised by a direct commit() owed (async template path)', () => {
            const handler = createHandlerSimple('this.data');
            const onCommit = jest.spyOn(handler as any, 'onCommit');
            handler.exposedIsVisible = false;
            handler.commit();

            // what the tryPrepare callbacks of Container / Component do
            handler.exposedIsEntityDataDirty = true;
            expect(handler.commit()).toBe(false);

            expect(onCommit).not.toHaveBeenCalled();
            expect(handler.exposedIsEntityDataDirty).toBe(true);
        });

        it('defers a change of entity data of an existing entity until it is visible again', () => {
            const handler = createHandlerSimple('this.data');
            const mockBinder1 = createMockContextBinder();
            const mockBinder2 = createMockContextBinder();

            handler.entityChangeReturnValue = mockBinder1;
            handler.commitReturnValue = 'entity-1';
            handler.exposedIsEntityDataDirty = true;
            handler.commit();

            handler.exposedIsVisible = false;
            handler.entityChangeReturnValue = mockBinder2;
            handler.commitReturnValue = 'entity-2';
            handler.exposedIsEntityDataDirty = true;
            handler.commit();

            expect(mockBinder1.disableChangeDetection).toHaveBeenCalledTimes(1);
            expect(mockBinder1.dispose).not.toHaveBeenCalled();
            expect(handler.exposedContextBinder).toBe(mockBinder1);
            expect(handler.exposedPreviousEntityData).toBe('entity-1');

            handler.exposedIsVisible = true;
            handler.commit();

            expect(mockBinder1.dispose).toHaveBeenCalledTimes(1);
            expect(handler.exposedContextBinder).toBe(mockBinder2);
            expect(handler.exposedPreviousEntityData).toBe('entity-2');
        });

        it('defers a disposal (onCommit returning undefined) of an existing entity until it is visible again', () => {
            const detached = jest.fn();
            const el = createElement({ [`${PREFIX}container`]: 'this.data' });
            const attrs = new Attributes(el, () => false);
            const handler = new TestContextedBase('this.data', el, attrs, () => true, undefined, detached);
            const ctx = { someProp: 'test' };
            const mockBinder = createMockContextBinder(ctx);

            handler.entityChangeReturnValue = mockBinder;
            handler.commitReturnValue = 'entity-1';
            handler.exposedIsEntityDataDirty = true;
            handler.commit();

            handler.exposedIsVisible = false;
            handler.commitReturnValue = undefined;
            handler.exposedIsEntityDataDirty = true;
            handler.commit();

            expect(mockBinder.dispose).not.toHaveBeenCalled();
            expect(detached).not.toHaveBeenCalled();
            expect(handler.exposedContextBinder).toBe(mockBinder);

            handler.exposedIsVisible = true;
            handler.commit();

            expect(mockBinder.dispose).toHaveBeenCalledTimes(1);
            expect(detached).toHaveBeenCalledWith(ctx);
            expect(handler.exposedContextBinder).toBeUndefined();
        });

        it('still disposes a hidden entity through dispose()', () => {
            const handler = createHandlerSimple('this.data');
            const mockBinder = createMockContextBinder();
            handler.entityChangeReturnValue = mockBinder;
            handler.exposedIsEntityDataDirty = true;
            handler.commit();

            handler.exposedIsVisible = false;
            handler.exposedIsEntityDataDirty = true;
            handler.commit();
            handler.dispose();

            expect(mockBinder.dispose).toHaveBeenCalledTimes(1);
            expect(handler.exposedContextBinder).toBeUndefined();
        });

        it('does not evaluate in-expressions while hidden and delivers the values of the pass that builds the entity', () => {
            let visible = false;
            const el = createElement({
                [`${PREFIX}container`]: 'this.data',
                [`${PREFIX}${Constants.IN_HANDLER_ATTRIBUTE_NAME}${Constants.META_VALUE_SEPARATOR}my-prop`]: 'this.value'
            });
            const attrs = new Attributes(el, () => false);
            const handler = new TestContextedBase('this.data', el, attrs, () => visible);
            const ctx: Record<string, any> = { myProp: 'initial' };
            handler.entityChangeReturnValue = createMockContextBinder(ctx);
            handler.exposedIsEntityDataDirty = true;

            const execExpr = jest.fn().mockReturnValue('first');
            handler.bind(undefined, execExpr);
            handler.commit();

            execExpr.mockReturnValue('second');
            handler.bind(undefined, execExpr);
            handler.commit();

            expect(execExpr).not.toHaveBeenCalled();
            expect(handler.exposedContextBinder).toBeUndefined();

            visible = true;
            handler.bind(undefined, execExpr);
            handler.commit();

            expect(ctx['myProp']).toBe('second');
        });
    });

    // --- dispose ---

    describe('dispose', () => {
        it('does nothing when hasNExpression is false', () => {
            const el = createElement();
            const attrs = new Attributes(el, () => false);
            const handler = new TestContextedBase(undefined, el, attrs, () => true);
            // Should not throw
            handler.dispose();
        });

        it('disposes contextBinder and calls notifyContextDetached', () => {
            const detached = jest.fn();
            const el = createElement({ [`${PREFIX}container`]: 'this.data' });
            const attrs = new Attributes(el, () => false);
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
            const params = createParams(['a'], [1]);
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

        // R7-1 (fixed): setInputValue stores a structuredClone of the incoming value for non-ref
        // inputs, so the cached baseline is a snapshot instead of the parent's LIVE reference —
        // an in-place mutation now compares deep-unequal and is delivered. The 'deep-equal new
        // object is not delivered' half below is by design and still holds.
        it('delivers an in-place mutation of the same object reference (R7-1)', () => {
            const shared = { x: 1 };
            const handler = createHandlerWithIn('this.data', { 'my-prop': 'this.value' });
            const mockBinder = createMockContextBinder({ myProp: undefined });
            handler.entityChangeReturnValue = mockBinder;
            handler.commitReturnValue = 'entity-1';
            handler.exposedIsEntityDataDirty = true;

            const execExpr = jest.fn().mockReturnValue(shared);
            handler.bind(undefined, execExpr);
            handler.commit();

            const delivered = (mockBinder.context as any).myProp;
            expect(delivered).toEqual({ x: 1 });
            expect(delivered).not.toBe(shared);      // nb-in delivers a structuredClone snapshot

            shared.x = 2;                            // in-place mutation of the SAME reference
            handler.bind(undefined, execExpr);
            expect(handler.exposedContextInputsWithChangedValue!.has('myProp')).toBe(true);
            handler.commit();

            expect((mockBinder.context as any).myProp.x).toBe(2);
            expect((mockBinder.context as any).myProp).not.toBe(shared);
            expect(shared.x).toBe(2);
        });

        // Trade-off of the R7-1 fix: the stored clone is both the comparison baseline and the
        // object handed to the child, so a child-side edit makes the baseline disagree with the
        // (unchanged) parent value and the next cycle re-delivers it, reverting that edit.
        it('hands the child the cached comparison baseline, so a child-side edit is reverted (R7-1)', () => {
            const parentValue = { x: 1 };
            const handler = createHandlerWithIn('this.data', { 'my-prop': 'this.value' });
            const mockBinder = createMockContextBinder({ myProp: undefined });
            handler.entityChangeReturnValue = mockBinder;
            handler.commitReturnValue = 'entity-1';
            handler.exposedIsEntityDataDirty = true;

            const execExpr = jest.fn().mockReturnValue(parentValue);
            handler.bind(undefined, execExpr);
            handler.commit();

            const delivered = (mockBinder.context as any).myProp;
            expect(handler.exposedContextInputValues!.get('myProp')).toBe(delivered);

            delivered.x = 99;                        // the child edits its own copy
            handler.bind(undefined, execExpr);       // parent value itself did not change
            expect(handler.exposedContextInputsWithChangedValue!.has('myProp')).toBe(true);
            handler.commit();

            expect((mockBinder.context as any).myProp.x).toBe(1);
        });

        // Clone failures are now detected in setInputValue instead of commit: the diagnostic
        // repeats every cycle (so a later, cloneable value would still be delivered — R7-4) and
        // undefined is delivered, replacing whatever the child held.
        // R9-2: an expression that mints a fresh Invalid Date per evaluation used to re-deliver the input on
        // every cycle (Invalid Date never deep-equalled Invalid Date). The file-level JSON polyfill turns a
        // Date into a string, so this test installs a same-realm clone that keeps Date instances.
        describe('fresh Invalid Date inputs (R9-2)', () => {
            const sameRealmClone = (value: any): any => {
                if (value instanceof Date) {
                    return new Date(value.getTime());
                }
                if (Array.isArray(value)) {
                    return value.map(sameRealmClone);
                }
                if ((value !== null) && (typeof value === 'object')) {
                    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sameRealmClone(item)]));
                }
                return value;
            };

            let original: any;

            beforeEach(() => {
                original = globalThis.structuredClone;
                (globalThis as any).structuredClone = sameRealmClone;
            });

            afterEach(() => {
                (globalThis as any).structuredClone = original;
            });

            function createDateInputHandler(evaluate: () => any) {
                const handler = createHandlerWithIn('this.data', { 'my-prop': 'this.value' });
                const mockBinder = createMockContextBinder({ myProp: undefined });
                handler.entityChangeReturnValue = mockBinder;
                handler.commitReturnValue = 'entity-1';
                handler.exposedIsEntityDataDirty = true;

                const execExpr = jest.fn(evaluate);
                handler.bind(undefined, execExpr);
                handler.commit();

                return { handler, mockBinder, execExpr };
            }

            it('does not re-deliver a freshly minted Invalid Date that is still invalid', () => {
                const { handler, mockBinder, execExpr } = createDateInputHandler(() => ({ d: new Date('invalid') }));
                const firstDelivery = (mockBinder.context as any).myProp;
                expect(isNaN(firstDelivery.d.getTime())).toBe(true);

                for (let cycle = 0; cycle < 3; cycle++) {
                    handler.bind(undefined, execExpr);
                    expect(handler.exposedContextInputsWithChangedValue!.size).toBe(0);
                    handler.commit();
                }

                expect((mockBinder.context as any).myProp).toBe(firstDelivery);
                expect(mockBinder.inputsRefreshIsDone).toHaveBeenCalledTimes(1);
            });

            it('delivers once the Invalid Date becomes a valid one', () => {
                let timestamp = NaN;
                const { handler, mockBinder, execExpr } = createDateInputHandler(() => ({ d: new Date(timestamp) }));

                timestamp = 0;
                handler.bind(undefined, execExpr);
                expect(handler.exposedContextInputsWithChangedValue!.has('myProp')).toBe(true);
                handler.commit();

                expect((mockBinder.context as any).myProp.d.getTime()).toBe(0);
            });
        });

        it('logs every cycle and clears the child value when the input cannot be cloned (R7-1/R7-4)', () => {
            const original = globalThis.structuredClone;
            (globalThis as any).structuredClone = (value: any) => {
                if ((value !== null) && (typeof value === 'object') && ('v' in value)) {
                    throw new Error('could not be cloned');
                }
                return JSON.parse(JSON.stringify(value));
            };

            try {
                const handler = createHandlerWithIn('this.data', { 'my-prop': 'this.value' });
                const mockBinder = createMockContextBinder({ myProp: { keepMe: 1 } });
                handler.entityChangeReturnValue = mockBinder;
                handler.commitReturnValue = 'entity-1';
                handler.exposedIsEntityDataDirty = true;

                const execExpr = jest.fn().mockReturnValue({ v: 5 });
                handler.bind(undefined, execExpr);
                handler.commit();

                // the child's own initial value is replaced by undefined, not left alone
                expect((mockBinder.context as any).myProp).toBeUndefined();
                const errorsAfterFirstBind = consoleSpy.mock.calls.length;
                expect(errorsAfterFirstBind).toBeGreaterThan(0);
                expect(String(consoleSpy.mock.calls[errorsAfterFirstBind - 1]))
                    .toContain('object cannot be cloned');

                handler.bind(undefined, execExpr);
                expect(consoleSpy.mock.calls.length).toBeGreaterThan(errorsAfterFirstBind);
            } finally {
                (globalThis as any).structuredClone = original;
            }
        });

        // The clone condition is !Helpers.isPrimitive(value): every non-primitive is cloned, including
        // functions (which cannot be cloned) and null-prototype objects (which Helpers.isObject
        // covered too, but an instanceof-based check would have let through by reference).
        describe('clone condition: every non-primitive nb-in value is cloned', () => {
            it('does not deliver a function through nb-in and points to nb-in-ref', () => {
                const callback = () => 1;
                const handler = createHandlerWithIn('this.data', { 'my-prop': 'this.value' });
                const mockBinder = createMockContextBinder({ myProp: undefined });
                handler.entityChangeReturnValue = mockBinder;
                handler.commitReturnValue = 'entity-1';
                handler.exposedIsEntityDataDirty = true;

                handler.bind(undefined, jest.fn().mockReturnValue(callback));
                handler.commit();

                expect((mockBinder.context as any).myProp).toBeUndefined();
                expect(consoleSpy.mock.calls.some(call => String(call).includes('object cannot be cloned, try to use nb-in-ref'))).toBe(true);
            });

            it('delivers a function through nb-in-ref by reference', () => {
                const callback = () => 1;
                const handler = createHandlerWithIn('this.data', {}, { 'my-ref': 'this.refValue' });
                const mockBinder = createMockContextBinder({ myRef: undefined });
                handler.entityChangeReturnValue = mockBinder;
                handler.commitReturnValue = 'entity-1';
                handler.exposedIsEntityDataDirty = true;

                handler.bind(undefined, jest.fn().mockReturnValue(callback));
                handler.commit();

                expect((mockBinder.context as any).myRef).toBe(callback);
                expect(consoleSpy).not.toHaveBeenCalled();
            });

            it('clones a null-prototype object instead of passing it by reference', () => {
                const dictionary = Object.assign(Object.create(null), { a: 1 });
                const handler = createHandlerWithIn('this.data', { 'my-prop': 'this.value' });
                const mockBinder = createMockContextBinder({ myProp: undefined });
                handler.entityChangeReturnValue = mockBinder;
                handler.commitReturnValue = 'entity-1';
                handler.exposedIsEntityDataDirty = true;

                const execExpr = jest.fn().mockReturnValue(dictionary);
                handler.bind(undefined, execExpr);
                handler.commit();

                const delivered = (mockBinder.context as any).myProp;
                expect(delivered).not.toBe(dictionary);
                expect(delivered.a).toBe(1);

                // the baseline is a snapshot, so an in-place mutation is delivered (R7-1 semantics)
                dictionary.a = 2;
                handler.bind(undefined, execExpr);
                handler.commit();

                expect((mockBinder.context as any).myProp.a).toBe(2);
                expect((mockBinder.context as any).myProp).not.toBe(dictionary);
            });
        });

        it('delivers a new, deep-unequal object (the only way to push an input) (R7-1)', () => {
            const handler = createHandlerWithIn('this.data', { 'my-prop': 'this.value' });
            const mockBinder = createMockContextBinder({ myProp: undefined });
            handler.entityChangeReturnValue = mockBinder;
            handler.commitReturnValue = 'entity-1';
            handler.exposedIsEntityDataDirty = true;

            const execExpr = jest.fn().mockReturnValue({ x: 1 });
            handler.bind(undefined, execExpr);
            handler.commit();
            expect((mockBinder.context as any).myProp.x).toBe(1);

            execExpr.mockReturnValue({ x: 3 });      // new reference, deep-unequal
            handler.bind(undefined, execExpr);
            handler.commit();
            expect((mockBinder.context as any).myProp.x).toBe(3);
        });

        it('known gap: a new object with identical contents is NOT delivered (R7-1, documented half)', () => {
            const handler = createHandlerWithIn('this.data', { 'my-prop': 'this.value' });
            const mockBinder = createMockContextBinder({ myProp: undefined });
            handler.entityChangeReturnValue = mockBinder;
            handler.commitReturnValue = 'entity-1';
            handler.exposedIsEntityDataDirty = true;

            const execExpr = jest.fn().mockReturnValue({ x: 1 });
            handler.bind(undefined, execExpr);
            handler.commit();
            const firstDelivered = (mockBinder.context as any).myProp;

            execExpr.mockReturnValue({ x: 1 });      // different reference, deep-EQUAL
            handler.bind(undefined, execExpr);
            expect(handler.exposedContextInputsWithChangedValue!.has('myProp')).toBe(false);
            handler.commit();
            expect((mockBinder.context as any).myProp).toBe(firstDelivered);
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

        // setInputValue compares the LIVE value against the stored clone first and clones only when
        // that reports a difference; the clone is then compared again, because some values never equal
        // their own clone (a class instance loses its prototype) and a failed clone yields undefined.
        // The file-level JSON polyfill drops prototypes and throws for a function, like structuredClone.
        describe('compare before clone: an unchanged nb-in value is not cloned again', () => {
            class Model {
                public x = 1;
                public describe(): string { return `x=${this.x}`; }
            }

            let cloneSpy: jest.SpyInstance;

            beforeEach(() => {
                cloneSpy = jest.spyOn(globalThis as any, 'structuredClone');
            });

            afterEach(() => {
                cloneSpy.mockRestore();
            });

            function createInputHandler(evaluate: () => any, childInitialValue?: any) {
                const handler = createHandlerWithIn('this.data', { 'my-prop': 'this.value' });
                const mockBinder = createMockContextBinder({ myProp: childInitialValue });
                handler.entityChangeReturnValue = mockBinder;
                handler.commitReturnValue = 'entity-1';
                handler.exposedIsEntityDataDirty = true;

                const execExpr = jest.fn(evaluate);
                const cycle = () => {
                    handler.bind(undefined, execExpr);
                    return handler.commit();
                };

                return { handler, mockBinder, cycle };
            }

            it('clones a plain object once and never again while it stays unchanged', () => {
                const value = { a: 1, nested: { list: [1, 2] } };
                const { mockBinder, cycle } = createInputHandler(() => value);

                expect(cycle()).toBe(true);
                expect(cloneSpy).toHaveBeenCalledTimes(1);

                for (let index = 0; index < 3; index++) {
                    expect(cycle()).toBe(false);
                }

                expect(cloneSpy).toHaveBeenCalledTimes(1);
                expect(mockBinder.inputsRefreshIsDone).toHaveBeenCalledTimes(1);
            });

            it('does not clone a fresh object that is deep-equal to the stored one', () => {
                const { mockBinder, cycle } = createInputHandler(() => ({ a: 1 }));

                cycle();
                const firstDelivered = (mockBinder.context as any).myProp;

                for (let index = 0; index < 3; index++) {
                    expect(cycle()).toBe(false);
                }

                expect(cloneSpy).toHaveBeenCalledTimes(1);
                expect((mockBinder.context as any).myProp).toBe(firstDelivered);
            });

            it('clones and delivers again once the object changes', () => {
                const value = { a: 1 };
                const { mockBinder, cycle } = createInputHandler(() => value);

                cycle();
                cycle();
                value.a = 2;
                expect(cycle()).toBe(true);

                expect(cloneSpy).toHaveBeenCalledTimes(2);
                expect((mockBinder.context as any).myProp).toEqual({ a: 2 });
                expect((mockBinder.context as any).myProp).not.toBe(value);
            });

            it('delivers an unchanged class instance once, although it never equals its own clone', () => {
                const model = new Model();
                const { mockBinder, cycle } = createInputHandler(() => model);

                expect(cycle()).toBe(true);

                for (let index = 0; index < 3; index++) {
                    expect(cycle()).toBe(false);
                }

                expect(mockBinder.inputsRefreshIsDone).toHaveBeenCalledTimes(1);
                expect((mockBinder.context as any).myProp).toEqual({ x: 1 });
            });

            it('delivers an in-place mutation of a class instance', () => {
                const model = new Model();
                const { mockBinder, cycle } = createInputHandler(() => model);

                cycle();
                model.x = 2;
                expect(cycle()).toBe(true);

                expect((mockBinder.context as any).myProp).toEqual({ x: 2 });
                expect(mockBinder.inputsRefreshIsDone).toHaveBeenCalledTimes(2);
            });

            it('never delivers an uncloneable value to a child that holds nothing', () => {
                const callback = () => 1;
                const { handler, mockBinder, cycle } = createInputHandler(() => callback);

                cycle();    // builds the entity, which is a change on its own
                expect(handler.exposedContextInputsWithChangedValue!.size).toBe(0);

                for (let index = 0; index < 3; index++) {
                    expect(cycle()).toBe(false);
                    expect(handler.exposedContextInputsWithChangedValue!.size).toBe(0);
                }

                expect(mockBinder.inputsRefreshIsDone).not.toHaveBeenCalled();
                expect((mockBinder.context as any).myProp).toBeUndefined();
                expect(consoleSpy.mock.calls.filter(call => String(call).includes('object cannot be cloned')).length).toBe(4);
            });

            it('clears the child value once, not on every cycle, when the value cannot be cloned', () => {
                const callback = () => 1;
                const { mockBinder, cycle } = createInputHandler(() => callback, { keepMe: 1 });

                expect(cycle()).toBe(true);
                expect((mockBinder.context as any).myProp).toBeUndefined();

                for (let index = 0; index < 3; index++) {
                    expect(cycle()).toBe(false);
                }

                expect(mockBinder.inputsRefreshIsDone).toHaveBeenCalledTimes(1);
            });

            it('delivers a cloneable value that follows an uncloneable one', () => {
                let value: any = () => 1;
                const { mockBinder, cycle } = createInputHandler(() => value);

                cycle();
                cycle();
                value = { a: 1 };
                expect(cycle()).toBe(true);

                expect((mockBinder.context as any).myProp).toEqual({ a: 1 });
            });

            // bugs.md L-50: Helpers.equals(Object.create(null), null) is true, so the first compare
            // reports "unchanged". Flip this test when Helpers.equals is fixed.
            it('known gap: null followed by an empty null-prototype object is not delivered (L-50)', () => {
                let value: any = null;
                const { mockBinder, cycle } = createInputHandler(() => value, 'initial');

                cycle();
                expect((mockBinder.context as any).myProp).toBeNull();

                value = Object.create(null);
                expect(cycle()).toBe(false);

                expect((mockBinder.context as any).myProp).toBeNull();
                expect(cloneSpy).not.toHaveBeenCalled();
            });
        });
    });

    // --- disposeProtected (partial=false via second commit) ---

    describe('disposeProtected partial (full=false)', () => {
        it('preserves previousEntityData/currentEntityData on partial dispose', () => {
            const detached = jest.fn();
            const el = createElement({ [`${PREFIX}container`]: 'this.data' });
            const attrs = new Attributes(el, () => false);
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

    // --- R6-2: single-bind (#) inputs and context re-instantiation ---

    describe('single-bind inputs across context re-instantiation (R6-2)', () => {
        it('delivers a #-bound input to every re-instantiated context', () => {
            const handler = createHandlerWithIn('this.view', { cfg: '#this.cfg' });
            const ctxA: Record<string, any> = {};
            const ctxB: Record<string, any> = {};
            const ctxA2: Record<string, any> = {};
            const execExpr = jest.fn().mockReturnValue({ x: 1 });

            handler.entityChangeReturnValue = createMockContextBinder(ctxA);
            handler.commitReturnValue = 'entity-a';
            handler.bind(undefined, execExpr);
            handler.exposedIsEntityDataDirty = true;
            handler.commit();

            expect(ctxA['cfg']).toEqual({ x: 1 });

            // container name changed: the old context is disposed and a new one instantiated
            handler.entityChangeReturnValue = createMockContextBinder(ctxB);
            handler.commitReturnValue = 'entity-b';
            handler.bind(undefined, execExpr);
            handler.exposedIsEntityDataDirty = true;
            handler.commit();

            // before the fix the # expression key was still cached on the handler,
            // so the new context never received the input
            expect(ctxB['cfg']).toEqual({ x: 1 });

            // and back again (a -> b -> a)
            handler.entityChangeReturnValue = createMockContextBinder(ctxA2);
            handler.commitReturnValue = 'entity-a';
            handler.bind(undefined, execExpr);
            handler.exposedIsEntityDataDirty = true;
            handler.commit();

            expect(ctxA2['cfg']).toEqual({ x: 1 });
        });

        it('evaluates a #-bound input only once while the context stays the same', () => {
            const handler = createHandlerWithIn('this.view', { cfg: '#this.cfg' });
            const ctx: Record<string, any> = {};
            const execExpr = jest.fn().mockReturnValue({ x: 1 });

            handler.entityChangeReturnValue = createMockContextBinder(ctx);
            handler.commitReturnValue = 'entity-a';
            handler.bind(undefined, execExpr);
            handler.exposedIsEntityDataDirty = true;
            handler.commit();

            expect(ctx['cfg']).toEqual({ x: 1 });
            expect(execExpr).toHaveBeenCalledTimes(1);

            // same context: the # input stays frozen, no matter what the expression would yield now
            execExpr.mockReturnValue({ x: 99 });
            handler.bind(undefined, execExpr);
            handler.commit();
            handler.bind(undefined, execExpr);
            handler.commit();

            expect(ctx['cfg']).toEqual({ x: 1 });
            expect(execExpr).toHaveBeenCalledTimes(1);
        });

        it('retries a #-bound input that is undefined when the context is re-instantiated', () => {
            const handler = createHandlerWithIn('this.view', { cfg: '#this.cfg' });
            const ctxA: Record<string, any> = {};
            const ctxB: Record<string, any> = {};
            const execExpr = jest.fn().mockReturnValue({ x: 1 });

            handler.entityChangeReturnValue = createMockContextBinder(ctxA);
            handler.commitReturnValue = 'entity-a';
            handler.bind(undefined, execExpr);
            handler.exposedIsEntityDataDirty = true;
            handler.commit();

            expect(ctxA['cfg']).toEqual({ x: 1 });

            // the new context is created while the expression still yields undefined
            execExpr.mockReturnValue(undefined);
            handler.entityChangeReturnValue = createMockContextBinder(ctxB);
            handler.commitReturnValue = 'entity-b';
            handler.bind(undefined, execExpr);
            handler.exposedIsEntityDataDirty = true;
            handler.commit();

            expect(ctxB['cfg']).toBeUndefined();

            // # freezes on the first non-undefined result, so the value must still land later
            execExpr.mockReturnValue({ x: 7 });
            handler.bind(undefined, execExpr);
            handler.commit();

            expect(ctxB['cfg']).toEqual({ x: 7 });

            // ...and stay frozen from then on
            execExpr.mockReturnValue({ x: 8 });
            handler.bind(undefined, execExpr);
            handler.commit();

            expect(ctxB['cfg']).toEqual({ x: 7 });
        });
    });
});
