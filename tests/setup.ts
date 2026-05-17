// Global test setup
// Polyfill CSSStyleSheet.replaceSync for jsdom
if (typeof CSSStyleSheet !== 'undefined' && !CSSStyleSheet.prototype.replaceSync) {
    CSSStyleSheet.prototype.replaceSync = function (_text: string) {};
}
