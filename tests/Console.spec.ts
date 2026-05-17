import { Console } from '../src/Console';
import { Constants } from '../src/Constants';

describe('Console', () => {
    describe('error', () => {
        it(`should call console.error with "${Constants.DISPLAY_NAME}: " prefix`, () => {
            const spy = jest.spyOn(console, 'error').mockImplementation();
            Console.error('test message');
            expect(spy).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `, 'test message');
            spy.mockRestore();
        });

        it('should pass multiple arguments', () => {
            const spy = jest.spyOn(console, 'error').mockImplementation();
            Console.error('msg', 42, { key: 'val' });
            expect(spy).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `, 'msg', 42, { key: 'val' });
            spy.mockRestore();
        });
    });

    describe('warn', () => {
        it(`should call console.warn with "${Constants.DISPLAY_NAME}: " prefix`, () => {
            const spy = jest.spyOn(console, 'warn').mockImplementation();
            Console.warn('warning message');
            expect(spy).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `, 'warning message');
            spy.mockRestore();
        });

        it('should be gated by isWarnAvailable', () => {
            const original = Console.isWarnAvailable;
            try {
                Object.defineProperty(Console, 'isWarnAvailable', { value: false, configurable: true });
                const spy = jest.spyOn(console, 'warn').mockImplementation();
                Console.warn('test');
                expect(spy).not.toHaveBeenCalled();
                spy.mockRestore();
            } finally {
                Object.defineProperty(Console, 'isWarnAvailable', { value: original, configurable: true });
            }
        });
    });

    describe('error gating', () => {
        it('should be gated by isErrorAvailable', () => {
            const original = Console.isErrorAvailable;
            try {
                Object.defineProperty(Console, 'isErrorAvailable', { value: false, configurable: true });
                const spy = jest.spyOn(console, 'error').mockImplementation();
                Console.error('test');
                expect(spy).not.toHaveBeenCalled();
                spy.mockRestore();
            } finally {
                Object.defineProperty(Console, 'isErrorAvailable', { value: original, configurable: true });
            }
        });
    });

    describe('info', () => {
        it(`should call console.info with "${Constants.DISPLAY_NAME}: " prefix`, () => {
            const spy = jest.spyOn(console, 'info').mockImplementation();
            Console.info('info message');
            expect(spy).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `, 'info message');
            spy.mockRestore();
        });

        it('should be gated by isInfoAvailable', () => {
            // Console.info checks isInfoAvailable independently of isErrorAvailable.
            // Force isInfoAvailable to false and verify info() short-circuits without
            // calling console.info, even if console.info is otherwise present.
            const original = Console.isInfoAvailable;
            try {
                Object.defineProperty(Console, 'isInfoAvailable', { value: false, configurable: true });
                const spy = jest.spyOn(console, 'info').mockImplementation();
                Console.info('test');
                expect(spy).not.toHaveBeenCalled();
                spy.mockRestore();
            } finally {
                Object.defineProperty(Console, 'isInfoAvailable', { value: original, configurable: true });
            }
        });

        it('should not be gated by isErrorAvailable', () => {
            // Disable error and confirm info() still runs.
            const original = Console.isErrorAvailable;
            try {
                Object.defineProperty(Console, 'isErrorAvailable', { value: false, configurable: true });
                const spy = jest.spyOn(console, 'info').mockImplementation();
                Console.info('test');
                expect(spy).toHaveBeenCalledWith(`${Constants.DISPLAY_NAME}: `, 'test');
                spy.mockRestore();
            } finally {
                Object.defineProperty(Console, 'isErrorAvailable', { value: original, configurable: true });
            }
        });
    });

    describe('isAvailable flags', () => {
        it('should report console as available', () => {
            expect(Console.isAvailable).toBe(true);
        });

        it('should report error as available', () => {
            expect(Console.isErrorAvailable).toBe(true);
        });

        it('should report warn as available', () => {
            expect(Console.isWarnAvailable).toBe(true);
        });

        it('should report info as available', () => {
            expect(Console.isInfoAvailable).toBe(true);
        });
    });
});
