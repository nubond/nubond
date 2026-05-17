import { ChangeDetector } from '../../src/models/injections/ChangeDetector';

describe('ChangeDetector', () => {
    it('should call the detect callback', () => {
        const mockDetect = jest.fn();
        const detector = new ChangeDetector(mockDetect);

        detector.detect();
        expect(mockDetect).toHaveBeenCalledTimes(1);
    });

    it('should call detect callback multiple times', () => {
        const mockDetect = jest.fn();
        const detector = new ChangeDetector(mockDetect);

        detector.detect();
        detector.detect();
        detector.detect();
        expect(mockDetect).toHaveBeenCalledTimes(3);
    });
});
