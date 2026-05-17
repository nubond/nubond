import {
    ElementPropertiesManipulations,
    ElementAttributesManipulations,
    ElementStylesManipulations,
    ElementClassesManipulations,
    ElementManipulations
} from '../../src/models/injections/ElementManipulations';

describe('ElementManipulations', () => {
    describe('ElementPropertiesManipulations', () => {
        it('should get a property value', () => {
            const get = jest.fn().mockReturnValue('hello');
            const set = jest.fn();
            const props = new ElementPropertiesManipulations(get, set);

            expect(props.get('textContent')).toBe('hello');
            expect(get).toHaveBeenCalledWith('textContent');
        });

        it('should set a property value', () => {
            const get = jest.fn();
            const set = jest.fn();
            const props = new ElementPropertiesManipulations(get, set);

            props.set('textContent', 'world');
            expect(set).toHaveBeenCalledWith('textContent', 'world');
        });
    });

    describe('ElementAttributesManipulations', () => {
        let attrs: ElementAttributesManipulations;
        let has: jest.Mock, get: jest.Mock, getAll: jest.Mock, set: jest.Mock, remove: jest.Mock;

        beforeEach(() => {
            has = jest.fn();
            get = jest.fn();
            getAll = jest.fn();
            set = jest.fn();
            remove = jest.fn();
            attrs = new ElementAttributesManipulations(has, get, getAll, set, remove);
        });

        it('should check if attribute exists', () => {
            has.mockReturnValue(true);
            expect(attrs.has('id')).toBe(true);
            expect(has).toHaveBeenCalledWith('id');
        });

        it('should get attribute value', () => {
            get.mockReturnValue('my-id');
            expect(attrs.get('id')).toBe('my-id');
        });

        it('should get all attributes', () => {
            const allAttrs = new Map([['id', 'test'], ['class', 'foo']]);
            getAll.mockReturnValue(allAttrs);
            expect(attrs.getAll()).toBe(allAttrs);
        });

        it('should set attribute value', () => {
            attrs.set('id', 'new-id');
            expect(set).toHaveBeenCalledWith('id', 'new-id');
        });

        it('should remove attribute', () => {
            attrs.remove('id');
            expect(remove).toHaveBeenCalledWith('id');
        });
    });

    describe('ElementStylesManipulations', () => {
        let styles: ElementStylesManipulations;
        let has: jest.Mock, get: jest.Mock, getAll: jest.Mock, set: jest.Mock, remove: jest.Mock;

        beforeEach(() => {
            has = jest.fn();
            get = jest.fn();
            getAll = jest.fn();
            set = jest.fn();
            remove = jest.fn();
            styles = new ElementStylesManipulations(has, get, getAll, set, remove);
        });

        it('should check if style exists', () => {
            has.mockReturnValue(true);
            expect(styles.has('color')).toBe(true);
            expect(has).toHaveBeenCalledWith('color');
        });

        it('should get style value', () => {
            get.mockReturnValue('red');
            expect(styles.get('color')).toBe('red');
        });

        it('should get all styles', () => {
            const allStyles = new Map([['color', 'red'], ['display', 'block']]);
            getAll.mockReturnValue(allStyles);
            expect(styles.getAll()).toBe(allStyles);
        });

        it('should set style value', () => {
            styles.set('color', 'blue');
            expect(set).toHaveBeenCalledWith('color', 'blue');
        });

        it('should remove style', () => {
            styles.remove('color');
            expect(remove).toHaveBeenCalledWith('color');
        });
    });

    describe('ElementClassesManipulations', () => {
        let classes: ElementClassesManipulations;
        let has: jest.Mock, getAll: jest.Mock, add: jest.Mock, removeFn: jest.Mock, toggle: jest.Mock;

        beforeEach(() => {
            has = jest.fn();
            getAll = jest.fn();
            add = jest.fn();
            removeFn = jest.fn();
            toggle = jest.fn();
            classes = new ElementClassesManipulations(has, getAll, add, removeFn, toggle);
        });

        it('should check if class exists', () => {
            has.mockReturnValue(true);
            expect(classes.has('active')).toBe(true);
            expect(has).toHaveBeenCalledWith('active');
        });

        it('should get all classes', () => {
            getAll.mockReturnValue(['active', 'hidden']);
            expect(classes.getAll()).toEqual(['active', 'hidden']);
        });

        it('should add a class', () => {
            classes.add('active');
            expect(add).toHaveBeenCalledWith('active');
        });

        it('should remove a class', () => {
            classes.remove('active');
            expect(removeFn).toHaveBeenCalledWith('active');
        });

        it('should toggle a class', () => {
            classes.toggle('active');
            expect(toggle).toHaveBeenCalledWith('active');
        });
    });

    describe('ElementManipulations (composite)', () => {
        it('should compose all manipulation objects', () => {
            const props = new ElementPropertiesManipulations(jest.fn(), jest.fn());
            const attrs = new ElementAttributesManipulations(jest.fn(), jest.fn(), jest.fn(), jest.fn(), jest.fn());
            const styles = new ElementStylesManipulations(jest.fn(), jest.fn(), jest.fn(), jest.fn(), jest.fn());
            const classes = new ElementClassesManipulations(jest.fn(), jest.fn(), jest.fn(), jest.fn(), jest.fn());

            const manip = new ElementManipulations(props, attrs, styles, classes);

            expect(manip.properties).toBe(props);
            expect(manip.attributes).toBe(attrs);
            expect(manip.styles).toBe(styles);
            expect(manip.classes).toBe(classes);
        });
    });
});
