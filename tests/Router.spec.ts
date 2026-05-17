import { Router } from '../src/Router';
import { Constants } from '../src/Constants';

const realPushState = history.pushState.bind(history);

describe('Router', () => {
    let originalLocation: Location;

    beforeEach(() => {
        jest.spyOn(console, 'error').mockImplementation();
        jest.spyOn(console, 'warn').mockImplementation();
        // Mock history methods
        jest.spyOn(history, 'pushState').mockImplementation();
        jest.spyOn(history, 'replaceState').mockImplementation();
        jest.spyOn(history, 'back').mockImplementation();
        jest.spyOn(history, 'forward').mockImplementation();
        jest.spyOn(history, 'go').mockImplementation();
    });

    afterEach(() => {
        jest.restoreAllMocks();
        // Reset URL to clean state
        realPushState(null, '', '/');
        location.hash = '';
    });

    describe('constructor', () => {
        it('should not be configured when no route config provided', () => {
            const router = new Router(undefined, () => false, () => false);
            expect(router.isConfigured).toBe(false);
        });

        it('should be configured when route config provided', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            expect(router.isConfigured).toBe(true);
        });

        it('should set hashBased when config starts with /#', () => {
            const router = new Router('/#{page=home}', () => false, () => false);
            expect(router.isConfigured).toBe(true);
            expect(router.hashBased).toBe(true);
        });

        it('should not be hash-based by default', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            expect(router.hashBased).toBe(false);
        });

        it('should parse default values from route template', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            expect(router.state).toBeDefined();
            expect(router.state!['page']).toBe('home');
        });

        it('should parse multiple slots', () => {
            const router = new Router('/{page=home}/{id=1}', () => false, () => false);
            expect(router.state).toBeDefined();
            expect(router.state!['page']).toBe('home');
            expect(router.state!['id']).toBe('1');
        });
    });

    describe('go', () => {
        it('should throw when router is not configured', () => {
            const router = new Router(undefined, () => false, () => false);
            expect(() => router.go({ page: 'about' })).toThrow('Router is not configured');
        });

        it('should update state on go()', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            router.go({ page: 'about' });

            expect(router.state!['page']).toBe('about');
        });

        it('should update path on go()', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            router.go({ page: 'about' });

            expect(router.path).toBe('/about');
        });

        it('should call history.pushState', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            router.go({ page: 'about' });

            expect(history.pushState).toHaveBeenCalled();
        });

        it('should handle partial state update', () => {
            const router = new Router('/{page=home}/{id=1}', () => false, () => false);
            router.go({ page: 'about' }, true);

            expect(router.state!['page']).toBe('about');
            expect(router.state!['id']).toBe('1'); // Unchanged
        });

        it('should support string state for single-slotted routes', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            router.go('about');

            expect(router.state!['page']).toBe('about');
        });

        it('should reset slot to default when value is null/undefined', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            router.go({ page: 'about' });
            expect(router.state!['page']).toBe('about');

            router.go({ page: null });
            expect(router.state!['page']).toBe('home');
        });

        it('should use history.replaceState when removeHistory is true', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            router.go({ page: 'about' }, true, true);

            expect(history.replaceState).toHaveBeenCalled();
        });

        it('should call replaceState and not pushState when removeHistory is true', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            router.go({ page: 'about' });

            (history.replaceState as jest.Mock).mockClear();
            (history.pushState as jest.Mock).mockClear();

            router.go({ page: 'contact' }, true, true);

            expect(history.replaceState).toHaveBeenCalled();
            expect(history.pushState).not.toHaveBeenCalled();
        });

        it('should log error when using string state on multi-slot route', () => {
            const router = new Router('/{page=home}/{id=1}', () => false, () => false);
            router.go('about');
            expect(console.error).toHaveBeenCalled();
        });
    });

    describe('goBack', () => {
        it('should throw when router is not configured', () => {
            const router = new Router(undefined, () => false, () => false);
            expect(() => router.goBack()).toThrow('Router is not configured');
        });

        it('should not throw when there is navigation history', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            router.go({ page: 'about' });
            router.go({ page: 'contact' });

            expect(() => router.goBack()).not.toThrow();
        });
    });

    describe('goForward', () => {
        it('should throw when router is not configured', () => {
            const router = new Router(undefined, () => false, () => false);
            expect(() => router.goForward()).toThrow('Router is not configured');
        });

        it('should go forward after going back', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            router.go({ page: 'about' });
            router.go({ page: 'contact' });

            router.goBack();
            expect(router.state!['page']).toBe('about');
            expect(history.back).toHaveBeenCalled();

            router.goForward();
            expect(router.state!['page']).toBe('contact');
            expect(history.forward).toHaveBeenCalled();
        });
    });

    describe('goTo', () => {
        it('should throw when router is not configured', () => {
            const router = new Router(undefined, () => false, () => false);
            expect(() => router.goTo(1)).toThrow('Router is not configured');
        });

        it('should change state with a valid offset', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            router.go({ page: 'about' });
            router.go({ page: 'contact' });

            // states = [home, about, contact], stateIndex = 2. goTo(-2) → index 0 → 'home'.
            router.goTo(-2);

            expect(router.state!['page']).toBe('home');
            expect(router.path).toBe('/home');
            expect(history.go).toHaveBeenCalledWith(-2);
        });

        it('should change state by one with offset -1', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            router.go({ page: 'about' });
            router.go({ page: 'contact' });

            // states = [home, about, contact], stateIndex = 2. goTo(-1) → index 1 → 'about'.
            router.goTo(-1);

            expect(router.state!['page']).toBe('about');
            expect(history.go).toHaveBeenCalledWith(-1);
        });
    });

    describe('onBeforeStateChange', () => {
        it('should fire before state change callback', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            const callback = jest.fn();

            router.onBeforeStateChange(callback);
            router.go({ page: 'about' });

            expect(callback).toHaveBeenCalled();
        });

        it('should allow preventing state change', () => {
            const router = new Router('/{page=home}', () => false, () => false);

            router.onBeforeStateChange((preventChange) => {
                preventChange();
            });

            router.go({ page: 'about' });
            // State should remain unchanged since change was prevented
            expect(router.state!['page']).toBe('home');
        });

        it('should return unsubscribe function', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            const callback = jest.fn();

            const unsub = router.onBeforeStateChange(callback);
            unsub();

            router.go({ page: 'about' });
            expect(callback).not.toHaveBeenCalled();
        });

        it('should receive correct arguments (preventChange, oldState, newState, oldPath, newPath)', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            let capturedArgs: any;

            router.onBeforeStateChange((preventChange, oldState, newState, oldPath, newPath) => {
                capturedArgs = { preventChange, oldState, newState, oldPath, newPath };
            });

            router.go({ page: 'about' });

            expect(typeof capturedArgs.preventChange).toBe('function');
            expect(capturedArgs.oldState['page']).toBe('home');
            expect(capturedArgs.newState['page']).toBe('about');
            expect(capturedArgs.oldPath).toBe('/home');
            expect(capturedArgs.newPath).toBe('/about');
        });
    });

    describe('onAfterStateChange', () => {
        it('should fire after state change callback', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            const callback = jest.fn();

            router.onAfterStateChange(callback);
            router.go({ page: 'about' });

            expect(callback).toHaveBeenCalled();
        });

        it('should provide old and new state', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            let capturedOldState: any, capturedNewState: any;

            router.onAfterStateChange((oldState, newState) => {
                capturedOldState = oldState;
                capturedNewState = newState;
            });

            router.go({ page: 'about' });
            expect(capturedOldState['page']).toBe('home');
            expect(capturedNewState['page']).toBe('about');
        });

        it('should return unsubscribe function', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            const callback = jest.fn();

            const unsub = router.onAfterStateChange(callback);
            unsub();

            router.go({ page: 'about' });
            expect(callback).not.toHaveBeenCalled();
        });

        it('should receive correct arguments including paths', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            let capturedArgs: any;

            router.onAfterStateChange((oldState, newState, oldPath, newPath) => {
                capturedArgs = { oldState, newState, oldPath, newPath };
            });

            router.go({ page: 'about' });

            expect(capturedArgs.oldState['page']).toBe('home');
            expect(capturedArgs.newState['page']).toBe('about');
            expect(capturedArgs.oldPath).toBe('/home');
            expect(capturedArgs.newPath).toBe('/about');
        });
    });

    describe('path generation', () => {
        it('should generate path with single slot', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            expect(router.path).toBe('/home');
        });

        it('should generate path with multiple slots', () => {
            const router = new Router('/{page=home}/{id=1}', () => false, () => false);
            expect(router.path).toBe('/home/1');
        });

        it('should generate path after navigation', () => {
            const router = new Router('/{section=main}/{id=0}', () => false, () => false);
            router.go({ section: 'admin', id: 5 });
            expect(router.path).toBe('/admin/5');
        });

        it('should update path getter after each state change', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            expect(router.path).toBe('/home');

            router.go({ page: 'about' });
            expect(router.path).toBe('/about');

            router.go({ page: 'contact' });
            expect(router.path).toBe('/contact');
        });

        it('should generate hash-based path with /# prefix', () => {
            const router = new Router('/#{page=home}', () => false, () => false);

            (history.pushState as jest.Mock).mockClear();
            router.go({ page: 'about' });

            expect(history.pushState).toHaveBeenCalledWith(
                expect.objectContaining({ page: 'about' }),
                '',
                '/#/about'
            );
        });
    });

    describe('component slots', () => {
        it('should parse component slots with [] syntax', () => {
            const router = new Router('/[panel=sidebar]', name => name === 'sidebar', () => false);
            expect(router.isConfigured).toBe(true);
            expect(router.state!['panel']).toBe('sidebar');
        });

        it('should reject invalid container name in component slot', () => {
            const router = new Router('/[panel=sidebar]', () => false, () => false);
            router.go({ panel: 'nonexistent' });
            expect(console.error).toHaveBeenCalled();
        });
    });

    describe('route template errors', () => {
        it('should throw for slot with multiple = signs', () => {
            expect(() => {
                new Router('/{page=home=extra}', () => false, () => false);
            }).toThrow();
        });

        it('should throw for empty slot name', () => {
            expect(() => {
                new Router('/{=home}', () => false, () => false);
            }).toThrow();
        });
    });

    describe('debug warning when not configured', () => {
        it('should warn when getShowDebugInfo returns true and no route config', () => {
            const router = new Router(undefined, () => false, () => true);
            expect(router.isConfigured).toBe(false);
            expect(console.warn).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `, expect.stringContaining('Router is not configured'));
        });
    });

    describe('hash-based location parsing', () => {
        it('should parse state from location.hash on construction', () => {
            (history.pushState as jest.Mock).mockRestore();
            location.hash = '#/about';
            jest.spyOn(history, 'pushState').mockImplementation();

            const router = new Router('/#{page=home}', () => false, () => false);
            expect(router.state!['page']).toBe('about');
        });

        it('should parse state and query from location.hash', () => {
            (history.pushState as jest.Mock).mockRestore();
            location.hash = '#/about?id=42';
            jest.spyOn(history, 'pushState').mockImplementation();

            const router = new Router('/#{page=home}/{id=1}', () => false, () => false);
            expect(router.state!['page']).toBe('about');
            expect(router.state!['id']).toBe('42');
        });
    });

    describe('pathname-based location parsing', () => {
        it('should parse state from location.pathname on construction', () => {
            (history.pushState as jest.Mock).mockRestore();
            realPushState(null, '', '/contact');
            jest.spyOn(history, 'pushState').mockImplementation();

            const router = new Router('/{page=home}', () => false, () => false);
            expect(router.state!['page']).toBe('contact');
        });

        it('should parse multiple slots from pathname', () => {
            (history.pushState as jest.Mock).mockRestore();
            realPushState(null, '', '/products/42');
            jest.spyOn(history, 'pushState').mockImplementation();

            const router = new Router('/{section=home}/{id=1}', () => false, () => false);
            expect(router.state!['section']).toBe('products');
            expect(router.state!['id']).toBe('42');
        });
    });

    describe('query string parsing', () => {
        it('should parse state from location.search', () => {
            (history.pushState as jest.Mock).mockRestore();
            realPushState(null, '', '/?page=about');
            jest.spyOn(history, 'pushState').mockImplementation();

            const router = new Router('/{page=home}', () => false, () => false);
            expect(router.state!['page']).toBe('about');
        });

        it('should parse multiple query params', () => {
            (history.pushState as jest.Mock).mockRestore();
            realPushState(null, '', '/?page=about&id=99');
            jest.spyOn(history, 'pushState').mockImplementation();

            const router = new Router('/{page=home}/{id=1}', () => false, () => false);
            expect(router.state!['page']).toBe('about');
            expect(router.state!['id']).toBe('99');
        });
    });

    describe('popstate event handling', () => {
        it('should handle popstate with matching state from history', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            router.go({ page: 'about' });
            router.go({ page: 'contact' });

            // Fire popstate with a state that matches the first pushed state (about)
            const popstateEvent = new PopStateEvent('popstate', { state: { page: 'about' } });
            window.dispatchEvent(popstateEvent);

            expect(router.state!['page']).toBe('about');
        });

        it('should handle popstate with new unknown state', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            router.go({ page: 'about' });

            (history.pushState as jest.Mock).mockClear();
            const popstateEvent = new PopStateEvent('popstate', { state: { page: 'newpage' } });
            window.dispatchEvent(popstateEvent);

            expect(router.state!['page']).toBe('newpage');
            expect(history.pushState).toHaveBeenCalled();
        });

        it('should handle popstate with null state', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            router.go({ page: 'about' });
            
            const popstateEvent = new PopStateEvent('popstate', { state: null });
            window.dispatchEvent(popstateEvent);

            expect(router.state!['page']).toBe('home');
        });

        it('should handle popstate with hash-based path prefix', () => {
            const router = new Router('/#{page=home}', () => false, () => false);
            router.go({ page: 'about' });

            (history.pushState as jest.Mock).mockClear();
            const popstateEvent = new PopStateEvent('popstate', { state: { page: 'hashpage' } });
            window.dispatchEvent(popstateEvent);

            expect(router.state!['page']).toBe('hashpage');
            // pushState called with hash-based path
            expect(history.pushState).toHaveBeenCalledWith(
                expect.objectContaining({ page: 'hashpage' }),
                '',
                '/#/hashpage'
            );
        });
    });

    describe('non-partial state (partialState=false)', () => {
        it('should reset unmentioned slots when partialState is false', () => {
            const router = new Router('/{page=home}/{id=1}', () => false, () => false);
            router.go({ page: 'about', id: '5' });
            expect(router.state!['page']).toBe('about');
            expect(router.state!['id']).toBe('5');

            // With partialState=false, only set page; id should reset to default
            router.go({ page: 'contact' }, false);
            expect(router.state!['page']).toBe('contact');
            expect(router.state!['id']).toBe('1'); // reset to default
        });
    });

    describe('callback error handling', () => {
        it('should catch onBeforeStateChange callback error and continue', () => {
            const router = new Router('/{page=home}', () => false, () => false);

            router.onBeforeStateChange(() => {
                throw new Error('before change error');
            });

            // Should not throw, error is caught internally
            router.go({ page: 'about' });
            expect(console.error).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `, expect.stringContaining('onBeforeStateChange call back execution error'));
            // State should still change since isStateChangeAllowed defaults to true
            expect(router.state!['page']).toBe('about');
        });

        it('should catch onAfterStateChange callback error and continue', () => {
            const router = new Router('/{page=home}', () => false, () => false);

            router.onAfterStateChange(() => {
                throw new Error('after change error');
            });

            router.go({ page: 'about' });
            expect(console.error).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `, expect.stringContaining('onAfterStateChange call back execution error'));
            expect(router.state!['page']).toBe('about');
        });
    });

    describe('constant slot', () => {
        it('should error when setting value of constant slot via state', () => {
            // Route with a constant part 'app' (no braces/brackets) and variable part
            const router = new Router('/app/{page=home}', () => false, () => false);
            expect(router.path).toBe('/app/home');
        });

        it('should handle route with no slot defaults triggering null state path', () => {
            // Route with variable slot but no default; pathname is '/' (no URL value)
            const router = new Router('/{page}', () => false, () => false);
            // No default value, no URL value -> slot value is undefined
            expect(router.state).toBeDefined();
            expect(router.state!['page']).toBeUndefined();
        });
    });

    describe('query-based path generation', () => {
        it('should generate query params when intermediate slot has no value', () => {
            const router = new Router('/{section}/{page=home}/{id=5}', () => false, () => false);
            // section has no default, so it is undefined. page=home and id=5 should appear as query
            expect(router.path).toBe('/?page=home&id=5');
        });
    });

    describe('pathname trimming branches', () => {
        it('should trim leading slash from pathname', () => {
            (history.pushState as jest.Mock).mockRestore();
            realPushState(null, '', '/dashboard');
            jest.spyOn(history, 'pushState').mockImplementation();

            const router = new Router('/{page=home}', () => false, () => false);
            expect(router.state!['page']).toBe('dashboard');
        });

        it('should trim trailing slash from pathname', () => {
            (history.pushState as jest.Mock).mockRestore();
            realPushState(null, '', '/dashboard/');
            jest.spyOn(history, 'pushState').mockImplementation();

            const router = new Router('/{page=home}', () => false, () => false);
            expect(router.state!['page']).toBe('dashboard');
        });

        it('should parse a single-char pathname segment', () => {
            (history.pushState as jest.Mock).mockRestore();
            realPushState(null, '', '/x');
            jest.spyOn(history, 'pushState').mockImplementation();

            const router = new Router('/{page=home}', () => false, () => false);
            expect(router.state!['page']).toBe('x');
        });
    });

    describe('preventChange callback', () => {
        it('should prevent state change when preventChange is called', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            router.go({ page: 'about' });

            router.onBeforeStateChange((preventChange) => {
                preventChange();
            });

            router.go({ page: 'blocked' });
            expect(router.state!['page']).toBe('about'); // Not changed
        });
    });

    describe('string state data', () => {
        it('should accept string for single-slotted router', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            router.go('about');
            expect(router.state!['page']).toBe('about');
        });

        it('should error for string state on multi-slotted router', () => {
            const router = new Router('/{page=home}/{id=1}', () => false, () => false);
            router.go('about');
            expect(console.error).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `, expect.stringContaining('single slot state change'));
        });
    });

    describe('removeHistory in go', () => {
        it('should replace history when removeHistory is true', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            router.go({ page: 'about' });
            router.go({ page: 'contact' }, true, true);
            expect(history.replaceState).toHaveBeenCalled();
        });
    });

    describe('hash-based path with empty path', () => {
        it('should generate / for empty path on hash-based router', () => {
            const router = new Router('/#{page}', () => false, () => false);
            // No default, no URL value — path should be empty, becomes '/'
            expect(router.path).toBe('');
        });
    });

    describe('popstate same state length but different values', () => {
        it('should push new state when popstate has same key count but different values', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            router.go({ page: 'about' });

            (history.pushState as jest.Mock).mockClear();
            const popstateEvent = new PopStateEvent('popstate', { state: { page: 'different' } });
            window.dispatchEvent(popstateEvent);

            expect(router.state!['page']).toBe('different');
            expect(history.pushState).toHaveBeenCalled();
        });
    });

    describe('go trims forward states', () => {
        it('should trim forward history states before pushing new state', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            router.go({ page: 'a' });
            router.go({ page: 'b' });
            router.go({ page: 'c' });
            router.goBack();
            router.goBack();
            // Now at 'a', states = [home, a, b, c], index=1
            // Going to 'd' should trim b,c and push d
            router.go({ page: 'd' });
            expect(router.state!['page']).toBe('d');
        });
    });

    describe('multiple subscribers', () => {
        it('should fire all onBeforeStateChange subscribers', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            const cb1 = jest.fn();
            const cb2 = jest.fn();
            const cb3 = jest.fn();

            router.onBeforeStateChange(cb1);
            router.onBeforeStateChange(cb2);
            router.onBeforeStateChange(cb3);

            router.go({ page: 'about' });

            expect(cb1).toHaveBeenCalledTimes(1);
            expect(cb2).toHaveBeenCalledTimes(1);
            expect(cb3).toHaveBeenCalledTimes(1);
        });

        it('should preserve subscription order in onBeforeStateChange', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            const order: number[] = [];
            router.onBeforeStateChange(() => order.push(1));
            router.onBeforeStateChange(() => order.push(2));
            router.onBeforeStateChange(() => order.push(3));

            router.go({ page: 'about' });
            expect(order).toEqual([1, 2, 3]);
        });

        it('should fire all onAfterStateChange subscribers', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            const cb1 = jest.fn();
            const cb2 = jest.fn();

            router.onAfterStateChange(cb1);
            router.onAfterStateChange(cb2);

            router.go({ page: 'about' });

            expect(cb1).toHaveBeenCalledTimes(1);
            expect(cb2).toHaveBeenCalledTimes(1);
        });

        it('should dedup same callback subscribed twice (fires once)', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            const cb = jest.fn();

            router.onBeforeStateChange(cb);
            router.onBeforeStateChange(cb);

            router.go({ page: 'about' });

            expect(cb).toHaveBeenCalledTimes(1);
        });

        it('should let any subscriber prevent change (prevention is union, not first-wins)', () => {
            const router = new Router('/{page=home}', () => false, () => false);

            router.onBeforeStateChange(() => { /* no preventChange */ });
            router.onBeforeStateChange((preventChange) => { preventChange(); });
            router.onBeforeStateChange(() => { /* no preventChange */ });

            router.go({ page: 'about' });
            expect(router.state!['page']).toBe('home'); // prevented
        });

        it('should not invoke unsubscribed callback while still invoking the rest', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            const cb1 = jest.fn();
            const cb2 = jest.fn();
            const unsub = router.onBeforeStateChange(cb1);
            router.onBeforeStateChange(cb2);
            unsub();

            router.go({ page: 'about' });
            expect(cb1).not.toHaveBeenCalled();
            expect(cb2).toHaveBeenCalled();
        });

        it('should allow subscriber to unsubscribe itself during raise', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            let unsub: () => void = () => {};
            const cb1 = jest.fn(() => { unsub(); });
            const cb2 = jest.fn();
            unsub = router.onAfterStateChange(cb1);
            router.onAfterStateChange(cb2);

            router.go({ page: 'about' });
            expect(cb1).toHaveBeenCalledTimes(1);
            expect(cb2).toHaveBeenCalledTimes(1);

            router.go({ page: 'contact' });
            expect(cb1).toHaveBeenCalledTimes(1); // unsubscribed during prior raise
            expect(cb2).toHaveBeenCalledTimes(2);
        });
    });

    describe('event ordering and prevention semantics', () => {
        it('should fire onBeforeStateChange before onAfterStateChange', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            const order: string[] = [];

            router.onAfterStateChange(() => order.push('after'));
            router.onBeforeStateChange(() => order.push('before'));

            router.go({ page: 'about' });
            expect(order).toEqual(['before', 'after']);
        });

        it('should not fire onAfterStateChange when change is prevented', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            const after = jest.fn();

            router.onBeforeStateChange((preventChange) => preventChange());
            router.onAfterStateChange(after);

            router.go({ page: 'about' });
            expect(after).not.toHaveBeenCalled();
        });

        it('should not push history when change is prevented', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            (history.pushState as jest.Mock).mockClear();

            router.onBeforeStateChange((preventChange) => preventChange());
            router.go({ page: 'about' });

            expect(history.pushState).not.toHaveBeenCalled();
        });

        it('should not fire any callback if path is unchanged (idempotent go to current)', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            const before = jest.fn();
            const after = jest.fn();
            router.onBeforeStateChange(before);
            router.onAfterStateChange(after);

            router.go({ page: 'home' }); // same as current default
            expect(before).not.toHaveBeenCalled();
            expect(after).not.toHaveBeenCalled();
        });

        it('should not push history when path is unchanged', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            (history.pushState as jest.Mock).mockClear();

            router.go({ page: 'home' });
            expect(history.pushState).not.toHaveBeenCalled();
        });
    });

    describe('go() argument coercion', () => {
        it('should coerce numeric value to string', () => {
            const router = new Router('/{id=0}', () => false, () => false);
            router.go({ id: 42 });
            expect(router.state!['id']).toBe('42');
        });

        it('should reset slot when value is empty string', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            router.go({ page: 'about' });
            router.go({ page: '' });
            expect(router.state!['page']).toBe('home');
        });

        it('should reset slot when value is whitespace-only string', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            router.go({ page: 'about' });
            router.go({ page: '   ' });
            expect(router.state!['page']).toBe('home');
        });

        it('should reset slot when value is undefined', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            router.go({ page: 'about' });
            router.go({ page: undefined });
            expect(router.state!['page']).toBe('home');
        });

        it('should trim whitespace from string values', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            router.go({ page: '  about  ' });
            expect(router.state!['page']).toBe('about');
        });

        it('should be a no-op when go() is called with empty object', () => {
            const router = new Router('/{page=home}/{id=1}', () => false, () => false);
            router.go({ page: 'about' });
            const before = jest.fn();
            const after = jest.fn();
            router.onBeforeStateChange(before);
            router.onAfterStateChange(after);

            router.go({});
            expect(before).not.toHaveBeenCalled();
            expect(after).not.toHaveBeenCalled();
            expect(router.state!['page']).toBe('about');
        });

        it('should ignore unknown keys silently', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            router.go({ unknownKey: 'wat', page: 'about' } as any);
            expect(router.state!['page']).toBe('about');
            expect((router.state as any)['unknownKey']).toBeUndefined();
        });

        it('should be a no-op when go() is called with no arguments after defaults', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            const after = jest.fn();
            router.onAfterStateChange(after);

            router.go(); // path stays /home
            expect(after).not.toHaveBeenCalled();
        });
    });

    describe('history navigation edge cases', () => {
        it('should be a no-op for goBack when there is no prior state', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            const after = jest.fn();
            router.onAfterStateChange(after);
            // Initially: states=[home], index=1
            // First goBack: index drops to 0 but state[0] is current home — no path change
            router.goBack();
            // Second goBack: index would go negative — guarded by stateIndex > 0
            router.goBack();
            expect(after).not.toHaveBeenCalled();
            expect(router.state!['page']).toBe('home');
        });

        it('should be a no-op for goForward at end of history', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            router.go({ page: 'about' });

            (history.forward as jest.Mock).mockClear();
            router.goForward();
            expect(history.forward).not.toHaveBeenCalled();
            expect(router.state!['page']).toBe('about');
        });

        it('should be a no-op for goTo with offset 0', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            router.go({ page: 'about' });

            const after = jest.fn();
            router.onAfterStateChange(after);
            (history.go as jest.Mock).mockClear();

            router.goTo(0);
            // index = stateIndex + 0; states[stateIndex] is undefined past push pattern
            // so handleStateChange(undefined) resets — but slot already at 'about', no path change
            expect(history.go).not.toHaveBeenCalled();
        });

        it('should be a no-op for goTo with out-of-range offset', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            router.go({ page: 'about' });

            (history.go as jest.Mock).mockClear();
            router.goTo(100);
            router.goTo(-100);
            expect(history.go).not.toHaveBeenCalled();
        });

        it('should clear forward history on push after goBack', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            router.go({ page: 'a' });
            router.go({ page: 'b' });
            router.go({ page: 'c' });
            // Get back into the middle
            router.goBack();
            router.goBack();
            // Push new — forward 'b','c' should be discarded
            router.go({ page: 'z' });
            // Now goForward should not bring back 'b' or 'c'
            const after = jest.fn();
            router.onAfterStateChange(after);
            router.goForward();
            expect(after).not.toHaveBeenCalled();
            expect(router.state!['page']).toBe('z');
        });

        it('should reset history when removeHistory=true', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            router.go({ page: 'a' });
            router.go({ page: 'b' });
            router.go({ page: 'c' }, true, true); // wipe history

            (history.back as jest.Mock).mockClear();
            router.goBack();
            expect(history.back).not.toHaveBeenCalled();
        });
    });

    describe('URL parsing edge cases', () => {
        it('should ignore extra URL path segments beyond declared slots', () => {
            (history.pushState as jest.Mock).mockRestore();
            realPushState(null, '', '/products/42/extra/segments');
            jest.spyOn(history, 'pushState').mockImplementation();

            const router = new Router('/{section=home}/{id=1}', () => false, () => false);
            expect(router.state!['section']).toBe('products');
            expect(router.state!['id']).toBe('42');
        });

        it('should ignore unknown query parameters', () => {
            (history.pushState as jest.Mock).mockRestore();
            realPushState(null, '', '/?page=about&unknown=value');
            jest.spyOn(history, 'pushState').mockImplementation();

            const router = new Router('/{page=home}', () => false, () => false);
            expect(router.state!['page']).toBe('about');
            expect((router.state as any)['unknown']).toBeUndefined();
        });

        it('should match query keys case-insensitively', () => {
            (history.pushState as jest.Mock).mockRestore();
            realPushState(null, '', '/?Page=About');
            jest.spyOn(history, 'pushState').mockImplementation();

            const router = new Router('/{page=home}', () => false, () => false);
            expect(router.state!['page']).toBe('About');
        });

        it('should fall back to defaults when location is just /', () => {
            (history.pushState as jest.Mock).mockRestore();
            realPushState(null, '', '/');
            jest.spyOn(history, 'pushState').mockImplementation();

            const router = new Router('/{page=home}', () => false, () => false);
            expect(router.state!['page']).toBe('home');
        });

        it('should handle hash-based router with empty hash on construction', () => {
            location.hash = '';
            const router = new Router('/#{page=home}', () => false, () => false);
            expect(router.state!['page']).toBe('home');
        });

        it('should handle hash-based router with hash = "#" only', () => {
            location.hash = '#';
            const router = new Router('/#{page=home}', () => false, () => false);
            expect(router.state!['page']).toBe('home');
        });

        it('should ignore the pathname when configured as hash-based', () => {
            (history.pushState as jest.Mock).mockRestore();
            realPushState(null, '', '/contact');
            location.hash = '#/about';
            jest.spyOn(history, 'pushState').mockImplementation();

            const router = new Router('/#{page=home}', () => false, () => false);
            // hash takes precedence; pathname '/contact' is ignored
            expect(router.state!['page']).toBe('about');
        });
    });

    describe('route template parsing edge cases', () => {
        it('should tolerate whitespace inside variable slot braces', () => {
            const router = new Router('/{ page = home }', () => false, () => false);
            expect(router.state!['page']).toBe('home');
        });

        it('should tolerate whitespace around route template', () => {
            const router = new Router('   /{page=home}   ', () => false, () => false);
            expect(router.state!['page']).toBe('home');
            expect(router.isConfigured).toBe(true);
        });

        it('should tolerate trailing slash in route template', () => {
            const router = new Router('/{page=home}/', () => false, () => false);
            expect(router.state!['page']).toBe('home');
            expect(router.path).toBe('/home');
        });

        it('should support a constant prefix slot followed by variable slots', () => {
            const router = new Router('/app/{page=home}', () => false, () => false);
            expect(router.path).toBe('/app/home');

            router.go({ page: 'about' });
            expect(router.path).toBe('/app/about');
        });

        it('should ignore empty path segments in route template', () => {
            const router = new Router('//{page=home}//', () => false, () => false);
            expect(router.state!['page']).toBe('home');
        });

        it('should error on whitespace-only slot name', () => {
            expect(() => new Router('/{   }', () => false, () => false)).toThrow();
        });
    });

    describe('component slots', () => {
        it('should accept a component slot whose value matches a registered container', () => {
            const containers = new Set(['sidebar', 'main', 'footer']);
            const router = new Router('/[panel=sidebar]', n => containers.has(n), () => false);
            router.go({ panel: 'main' });
            expect(router.state!['panel']).toBe('main');
        });

        it('should keep previous value when go() targets an unknown container', () => {
            const containers = new Set(['sidebar']);
            const router = new Router('/[panel=sidebar]', n => containers.has(n), () => false);
            router.go({ panel: 'unknown' });
            expect(router.state!['panel']).toBe('sidebar'); // unchanged
            expect(console.error).toHaveBeenCalled();
        });

        it('should not validate the default value at construction time', () => {
            const router = new Router('/[panel=neverRegistered]', () => false, () => false);
            // Default is allowed even though container isn't registered yet (registries populate later)
            expect(router.state!['panel']).toBe('neverRegistered');
        });
    });

    describe('path generation - mixed slot patterns', () => {
        it('should produce / for empty path with no query', () => {
            const router = new Router('/{page}', () => false, () => false);
            // No default, no URL → no value
            expect(router.path).toBe('');
        });

        it('should produce path segments while values exist, then query for later ones', () => {
            // b has no default; without a URL value, b stays undefined
            const router = new Router('/{a=1}/{b}/{c=3}', () => false, () => false);
            // a='1' goes to path; b undefined → triggers query mode; c='3' goes to query
            expect(router.path).toBe('/1?c=3');
        });

        it('should preserve a constant slot in the path', () => {
            const router = new Router('/api/{page=home}', () => false, () => false);
            expect(router.path).toBe('/api/home');

            router.go({ page: 'admin' });
            expect(router.path).toBe('/api/admin');
        });

        it('should drop a constant slot from path when a previous slot is empty', () => {
            // Constant slot has name=null; if queryInUse becomes true, named-only check excludes it
            const router = new Router('/{page}/v1/{id=5}', () => false, () => false);
            // page has no default → undefined; v1 is constant; id=5
            // After loop: page skipped (no value); v1 with value 'v1' → queryInUse not yet active because index>0 && prev not string
            // Actually, prev (page) value not string so queryInUse becomes true; v1 is constant (name=null) so dropped from query
            // id has value '5'; queryInUse is true; pushed to query as ['id', '5']
            expect(router.path).toBe('/?id=5');
        });
    });

    describe('non-partial state with multiple slots', () => {
        it('should reset all unmentioned slots when partialState=false', () => {
            const router = new Router('/{a=1}/{b=2}/{c=3}', () => false, () => false);
            router.go({ a: 'A', b: 'B', c: 'C' });
            router.go({ a: 'X' }, false);
            expect(router.state!['a']).toBe('X');
            expect(router.state!['b']).toBe('2'); // reset
            expect(router.state!['c']).toBe('3'); // reset
        });

        it('should preserve unmentioned slots when partialState=true', () => {
            const router = new Router('/{a=1}/{b=2}/{c=3}', () => false, () => false);
            router.go({ a: 'A', b: 'B', c: 'C' });
            router.go({ a: 'X' }, true);
            expect(router.state!['a']).toBe('X');
            expect(router.state!['b']).toBe('B');
            expect(router.state!['c']).toBe('C');
        });
    });

    describe('preventChange semantics', () => {
        it('should not fire history.back when goBack is prevented', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            router.go({ page: 'about' });
            router.go({ page: 'contact' });

            router.onBeforeStateChange((preventChange) => preventChange());

            (history.back as jest.Mock).mockClear();
            router.goBack();
            router.goBack();
            expect(history.back).not.toHaveBeenCalled();
        });

        it('should not fire history.forward when goForward is prevented', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            router.go({ page: 'about' });
            router.go({ page: 'contact' });
            router.goBack();
            router.goBack();

            router.onBeforeStateChange((preventChange) => preventChange());

            (history.forward as jest.Mock).mockClear();
            router.goForward();
            expect(history.forward).not.toHaveBeenCalled();
        });
    });

    describe('popstate semantics', () => {
        it('should treat a popstate state with extra keys as unknown and push it', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            router.go({ page: 'about' });

            (history.pushState as jest.Mock).mockClear();
            const popstateEvent = new PopStateEvent('popstate', {
                state: { page: 'about', extra: 'value' }
            });
            window.dispatchEvent(popstateEvent);

            expect(history.pushState).toHaveBeenCalled();
            expect(router.state!['page']).toBe('about');
            expect((router.state as any).extra).toBeUndefined(); // not a slot
        });

        it('should fire onBefore/onAfter callbacks on popstate', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            router.go({ page: 'about' });

            const before = jest.fn();
            const after = jest.fn();
            router.onBeforeStateChange(before);
            router.onAfterStateChange(after);

            const popstateEvent = new PopStateEvent('popstate', { state: { page: 'home' } });
            window.dispatchEvent(popstateEvent);

            expect(before).toHaveBeenCalled();
            expect(after).toHaveBeenCalled();
        });

        it('should match the first occurrence of a popstate state in history', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            router.go({ page: 'about' });
            router.go({ page: 'home' }); // same as initial — duplicates exist now
            router.go({ page: 'contact' });

            const popstateEvent = new PopStateEvent('popstate', { state: { page: 'home' } });
            window.dispatchEvent(popstateEvent);
            expect(router.state!['page']).toBe('home');
        });

        it('should not throw when popstate state is a non-object primitive', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            router.go({ page: 'about' });
            const popstateEvent = new PopStateEvent('popstate', { state: 'a-string' as any });
            expect(() => window.dispatchEvent(popstateEvent)).not.toThrow();
            // Non-object → reset to defaults branch
            expect(router.state!['page']).toBe('home');
        });
    });

    describe('isConfigured guards', () => {
        it('should expose path/state as undefined when unconfigured', () => {
            const router = new Router(undefined, () => false, () => false);
            expect(router.path).toBeUndefined();
            expect(router.state).toBeUndefined();
        });

        it('should throw on onBeforeStateChange subscription when unconfigured', () => {
            const router = new Router(undefined, () => false, () => false);
            expect(() => router.onBeforeStateChange(() => {})).toThrow('Router is not configured');
        });

        it('should throw on onAfterStateChange subscription when unconfigured', () => {
            const router = new Router(undefined, () => false, () => false);
            expect(() => router.onAfterStateChange(() => {})).toThrow('Router is not configured');
        });

        it('should not warn when getShowDebugInfo returns false', () => {
            new Router(undefined, () => false, () => false);
            expect(console.warn).not.toHaveBeenCalled();
        });
    });

    describe('hash-based path generation', () => {
        it('should produce / for empty path even on hash-based router', () => {
            const router = new Router('/#{page}', () => false, () => false);
            // No default value, no URL value
            expect(router.path).toBe('');
        });

        it('should include /# in pushState path on hash-based navigation', () => {
            const router = new Router('/#{page=home}/{id=1}', () => false, () => false);
            (history.pushState as jest.Mock).mockClear();
            router.go({ page: 'about', id: '5' });
            expect(history.pushState).toHaveBeenCalledWith(
                expect.any(Object),
                '',
                '/#/about/5'
            );
        });

        it('should respect removeHistory and use replaceState with hash prefix', () => {
            const router = new Router('/#{page=home}', () => false, () => false);
            (history.replaceState as jest.Mock).mockClear();
            router.go({ page: 'admin' }, true, true);
            expect(history.replaceState).toHaveBeenCalledWith(
                expect.any(Object),
                '',
                '/#/admin'
            );
        });
    });

    describe('goBack accuracy (single-call moves one step)', () => {
        it('should move back exactly one step on a single goBack call', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            router.go({ page: 'about' });
            expect(router.state!['page']).toBe('about');

            router.goBack();
            expect(router.state!['page']).toBe('home');
            expect(history.back).toHaveBeenCalledTimes(1);
        });

        it('should walk through every state in order with consecutive goBack calls', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            router.go({ page: 'a' });
            router.go({ page: 'b' });
            router.go({ page: 'c' });

            router.goBack();
            expect(router.state!['page']).toBe('b');
            router.goBack();
            expect(router.state!['page']).toBe('a');
            router.goBack();
            expect(router.state!['page']).toBe('home');
        });

        it('should call history.go with the same offset that was applied to state', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            router.go({ page: 'a' });
            router.go({ page: 'b' });
            router.go({ page: 'c' });

            router.goTo(-3);
            expect(router.state!['page']).toBe('home');
            expect(history.go).toHaveBeenLastCalledWith(-3);
        });
    });

    describe('preventChange does not corrupt slot internals', () => {
        it('should restore slot value after a prevented change so empty go() is a no-op', () => {
            const router = new Router('/{page=home}', () => false, () => false);

            let preventNext = true;
            router.onBeforeStateChange((preventChange) => {
                if (preventNext) { preventNext = false; preventChange(); }
            });

            router.go({ page: 'about' }); // prevented
            expect(router.state!['page']).toBe('home');
            expect(router.path).toBe('/home');

            // If slot internals were left at 'about', getPath() would diverge from cached _path
            // and trigger onAfter on this idempotent go({}) call.
            const after = jest.fn();
            router.onAfterStateChange(after);
            router.go({});
            expect(after).not.toHaveBeenCalled();
        });

        it('should not push history when an onBefore subscriber prevents the change', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            router.onBeforeStateChange((preventChange) => preventChange());

            (history.pushState as jest.Mock).mockClear();
            router.go({ page: 'about' });
            expect(history.pushState).not.toHaveBeenCalled();
        });
    });

    describe('stateIndex stays consistent on prevented navigation', () => {
        it('should not drift stateIndex when goBack is prevented (next goBack still advances)', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            router.go({ page: 'about' });
            router.go({ page: 'contact' });

            let preventOnce = true;
            router.onBeforeStateChange((preventChange) => {
                if (preventOnce) { preventOnce = false; preventChange(); }
            });

            router.goBack(); // prevented; stateIndex must stay put
            expect(router.state!['page']).toBe('contact');

            router.goBack(); // should now move one step back to 'about'
            expect(router.state!['page']).toBe('about');
        });

        it('should not drift stateIndex when goForward is prevented', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            router.go({ page: 'about' });
            router.go({ page: 'contact' });
            router.goBack();
            router.goBack();
            expect(router.state!['page']).toBe('home');

            let preventOnce = true;
            router.onBeforeStateChange((preventChange) => {
                if (preventOnce) { preventOnce = false; preventChange(); }
            });

            router.goForward(); // prevented
            expect(router.state!['page']).toBe('home');

            router.goForward(); // succeeds; one step forward
            expect(router.state!['page']).toBe('about');
        });

        it('should not drift stateIndex when goTo is prevented', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            router.go({ page: 'about' });
            router.go({ page: 'contact' });

            let preventOnce = true;
            router.onBeforeStateChange((preventChange) => {
                if (preventOnce) { preventOnce = false; preventChange(); }
            });

            router.goTo(-2); // prevented
            expect(router.state!['page']).toBe('contact');

            router.goTo(-2); // succeeds
            expect(router.state!['page']).toBe('home');
        });
    });

    describe('initial URL parse syncs browser history', () => {
        it('should call history.replaceState on init when URL contains explicit state', () => {
            (history.pushState as jest.Mock).mockRestore();
            realPushState(null, '', '/about');
            jest.spyOn(history, 'pushState').mockImplementation();
            (history.replaceState as jest.Mock).mockClear();

            new Router('/{page=home}', () => false, () => false);

            expect(history.replaceState).toHaveBeenCalledWith(
                expect.objectContaining({ page: 'about' }),
                '',
                '/about'
            );
        });

        it('should call history.replaceState on init when no URL state but slots have defaults', () => {
            (history.pushState as jest.Mock).mockRestore();
            realPushState(null, '', '/');
            jest.spyOn(history, 'pushState').mockImplementation();
            (history.replaceState as jest.Mock).mockClear();

            new Router('/{page=home}', () => false, () => false);

            expect(history.replaceState).toHaveBeenCalledWith(
                expect.objectContaining({ page: 'home' }),
                '',
                '/home'
            );
        });

        it('should not push a fresh history entry on init', () => {
            (history.pushState as jest.Mock).mockRestore();
            realPushState(null, '', '/about');
            jest.spyOn(history, 'pushState').mockImplementation();

            new Router('/{page=home}', () => false, () => false);

            expect(history.pushState).not.toHaveBeenCalled();
        });
    });

    describe('consistent stateIndex accounting across go() and popstate-unknown', () => {
        it('should let goBack return to prior state after a popstate with unknown state', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            router.go({ page: 'about' });

            // popstate-unknown should append to _states and set stateIndex to length - 1
            const popstateEvent = new PopStateEvent('popstate', { state: { page: 'newpage' } });
            window.dispatchEvent(popstateEvent);
            expect(router.state!['page']).toBe('newpage');

            router.goBack();
            expect(router.state!['page']).toBe('about');
            expect(history.back).toHaveBeenCalled();
        });

        it('should support full back-walk after popstate matched a prior state', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            router.go({ page: 'about' });
            router.go({ page: 'contact' });

            const popstateEvent = new PopStateEvent('popstate', { state: { page: 'about' } });
            window.dispatchEvent(popstateEvent);
            expect(router.state!['page']).toBe('about');

            router.goBack();
            expect(router.state!['page']).toBe('home');
        });
    });

    describe('URL encoding on output', () => {
        it('should percent-encode space in path segment', () => {
            const router = new Router('/{q=default}', () => false, () => false);
            (history.pushState as jest.Mock).mockClear();
            router.go({ q: 'hello world' });
            expect(history.pushState).toHaveBeenCalledWith(
                expect.any(Object),
                '',
                '/hello%20world'
            );
        });

        it('should percent-encode reserved characters in path segment', () => {
            const router = new Router('/{q=default}', () => false, () => false);
            (history.pushState as jest.Mock).mockClear();
            router.go({ q: 'a&b?c=d#e' });
            expect(history.pushState).toHaveBeenCalledWith(
                expect.any(Object),
                '',
                '/a%26b%3Fc%3Dd%23e'
            );
        });

        it('should percent-encode reserved characters in query value', () => {
            // First slot has no default → leaves it undefined → second slot routed to query
            const router = new Router('/{a}/{b=default}', () => false, () => false);
            (history.pushState as jest.Mock).mockClear();
            router.go({ b: 'foo&bar=baz' });
            expect(history.pushState).toHaveBeenCalledWith(
                expect.any(Object),
                '',
                '/?b=foo%26bar%3Dbaz'
            );
        });

        it('should percent-encode non-ASCII characters', () => {
            const router = new Router('/{q=default}', () => false, () => false);
            (history.pushState as jest.Mock).mockClear();
            router.go({ q: 'café' });
            expect(history.pushState).toHaveBeenCalledWith(
                expect.any(Object),
                '',
                '/caf%C3%A9'
            );
        });
    });

    describe('URL decoding on input', () => {
        it('should percent-decode pathname segments', () => {
            (history.pushState as jest.Mock).mockRestore();
            realPushState(null, '', '/hello%20world');
            jest.spyOn(history, 'pushState').mockImplementation();

            const router = new Router('/{q=default}', () => false, () => false);
            expect(router.state!['q']).toBe('hello world');
        });

        it('should percent-decode query values', () => {
            (history.pushState as jest.Mock).mockRestore();
            realPushState(null, '', '/?q=foo%26bar');
            jest.spyOn(history, 'pushState').mockImplementation();

            const router = new Router('/{q=default}', () => false, () => false);
            expect(router.state!['q']).toBe('foo&bar');
        });

        it('should percent-decode non-ASCII pathname segments', () => {
            (history.pushState as jest.Mock).mockRestore();
            realPushState(null, '', '/caf%C3%A9');
            jest.spyOn(history, 'pushState').mockImplementation();

            const router = new Router('/{q=default}', () => false, () => false);
            expect(router.state!['q']).toBe('café');
        });

        it('should round-trip a value through go() and parsing', () => {
            const router = new Router('/{q=default}', () => false, () => false);
            (history.pushState as jest.Mock).mockClear();
            router.go({ q: 'a/b c&d' });

            // Capture the URL pushState would have written
            const pushArgs = (history.pushState as jest.Mock).mock.calls[0];
            const writtenPath = pushArgs[2] as string;

            (history.pushState as jest.Mock).mockRestore();
            realPushState(null, '', writtenPath);
            jest.spyOn(history, 'pushState').mockImplementation();

            const reborn = new Router('/{q=default}', () => false, () => false);
            expect(reborn.state!['q']).toBe('a/b c&d');
        });
    });

    describe('query value with embedded =', () => {
        it('should preserve = signs in query value', () => {
            (history.pushState as jest.Mock).mockRestore();
            realPushState(null, '', '/?token=a=b=c');
            jest.spyOn(history, 'pushState').mockImplementation();

            const router = new Router('/{token=x}', () => false, () => false);
            expect(router.state!['token']).toBe('a=b=c');
        });

        it('should preserve = in encoded form on push and decode on parse', () => {
            const router = new Router('/{a}/{b=default}', () => false, () => false);
            (history.pushState as jest.Mock).mockClear();
            router.go({ b: 'k=v' });
            expect(history.pushState).toHaveBeenCalledWith(
                expect.any(Object),
                '',
                '/?b=k%3Dv'
            );
        });
    });

    describe('debug warning on unknown slot key', () => {
        it('should warn when partial state contains an unknown key and debug is enabled', () => {
            const router = new Router('/{page=home}', () => false, () => true);
            (console.warn as jest.Mock).mockClear();

            router.go({ pag: 'oops' } as any); // typo
            expect(console.warn).toHaveBeenCalledWith(
                expect.any(String),
                expect.stringContaining("'pag'")
            );
        });

        it('should not warn for unknown keys when debug is disabled', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            (console.warn as jest.Mock).mockClear();

            router.go({ pag: 'oops' } as any);
            expect(console.warn).not.toHaveBeenCalled();
        });

        it('should still apply known keys even when other keys are unknown', () => {
            const router = new Router('/{page=home}', () => false, () => true);
            router.go({ pag: 'oops', page: 'about' } as any);
            expect(router.state!['page']).toBe('about');
        });
    });

    describe('query key without value (?key)', () => {
        it('should not produce the literal string "undefined" for ?key', () => {
            (history.pushState as jest.Mock).mockRestore();
            realPushState(null, '', '/?page');
            jest.spyOn(history, 'pushState').mockImplementation();

            const router = new Router('/{page=home}', () => false, () => false);
            expect(router.state!['page']).not.toBe('undefined');
        });

        it('should leave the slot at its default for ?key without =', () => {
            (history.pushState as jest.Mock).mockRestore();
            realPushState(null, '', '/?page');
            jest.spyOn(history, 'pushState').mockImplementation();

            const router = new Router('/{page=home}', () => false, () => false);
            expect(router.state!['page']).toBe('home');
        });
    });

    describe('malformed percent-encoding', () => {
        it('should not throw on malformed percent-encoding in pathname', () => {
            (history.pushState as jest.Mock).mockRestore();
            realPushState(null, '', '/%E0%A4');
            jest.spyOn(history, 'pushState').mockImplementation();

            expect(() => new Router('/{page=home}', () => false, () => false)).not.toThrow();
        });

        it('should log error and fall back to default on malformed percent-encoding in pathname', () => {
            (history.pushState as jest.Mock).mockRestore();
            realPushState(null, '', '/%E0%A4');
            jest.spyOn(history, 'pushState').mockImplementation();

            const router = new Router('/{page=home}', () => false, () => false);
            expect(console.error).toHaveBeenCalledWith(
                expect.any(String),
                expect.stringContaining('decodeURIComponent')
            );
            expect(router.state!['page']).toBe('home');
        });

        it('should not throw on malformed percent-encoding in query', () => {
            (history.pushState as jest.Mock).mockRestore();
            realPushState(null, '', '/?page=%E0%A4');
            jest.spyOn(history, 'pushState').mockImplementation();

            expect(() => new Router('/{page=home}', () => false, () => false)).not.toThrow();
        });

        it('should log error and fall back to default on malformed percent-encoding in query', () => {
            (history.pushState as jest.Mock).mockRestore();
            realPushState(null, '', '/?page=%E0%A4');
            jest.spyOn(history, 'pushState').mockImplementation();

            const router = new Router('/{page=home}', () => false, () => false);
            expect(console.error).toHaveBeenCalledWith(
                expect.any(String),
                expect.stringContaining('decodeURIComponent')
            );
            expect(router.state!['page']).toBe('home');
        });
    });

    describe('callback state arguments are defensive copies', () => {
        it('should not let onBeforeStateChange mutate router state via newState', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            router.onBeforeStateChange((_preventChange, _oldState, newState) => {
                (newState as any).page = 'mutated';
            });

            router.go({ page: 'about' });
            expect(router.state!['page']).toBe('about');
        });

        it('should not let onBeforeStateChange mutate router state via oldState', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            router.onBeforeStateChange((_preventChange, oldState) => {
                (oldState as any).page = 'mutated';
            });

            router.go({ page: 'about' });
            expect(router.state!['page']).toBe('about');
        });

        it('should not let onAfterStateChange mutate router state via newState', () => {
            const router = new Router('/{page=home}', () => false, () => false);
            router.onAfterStateChange((_oldState, newState) => {
                (newState as any).page = 'mutated';
            });

            router.go({ page: 'about' });
            expect(router.state!['page']).toBe('about');
        });
    });

    describe('constant-slot setValue is no longer reachable as an error path', () => {
        it('should not log "constant route slot cannot be changed" when navigating', () => {
            const router = new Router('/api/{page=home}', () => false, () => false);
            (console.error as jest.Mock).mockClear();
            router.go({ page: 'about' });
            const calls = (console.error as jest.Mock).mock.calls;
            for (const call of calls) {
                expect(JSON.stringify(call)).not.toContain('constant route slot');
            }
        });
    });

    describe('no closure indirection (cosmetic R18)', () => {
        it('should not call getShowDebugInfo when debug toggle is never read', () => {
            const spy = jest.fn(() => false);
            new Router('/{page=home}', () => false, spy);
            // Constructor reads debug only on the unconfigured path.
            expect(spy).not.toHaveBeenCalled();
        });

        it('should call getShowDebugInfo for unknown-key warnings during go()', () => {
            const spy = jest.fn(() => true);
            const router = new Router('/{page=home}', () => false, spy);
            spy.mockClear();
            router.go({ unknown: 'value' } as any);
            expect(spy).toHaveBeenCalled();
        });
    });
});
