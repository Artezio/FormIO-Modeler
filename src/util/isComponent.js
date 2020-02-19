if (!global.window) {
    const initJsdomGlobal = require('jsdom-global');
    initJsdomGlobal(undefined, {
        url: "http://localhost:3000"
    });
    global.Option = global.window.Option;
    global.window.matchMedia = function (media) {
        return {
            matches: false,
            media
        }
    };
}
const Formio = require('formiojs');

const BaseComponent = Formio.Components.components.base;

module.exports = function isComponent(Component) {
    return !!Component && Component.prototype instanceof BaseComponent;
}