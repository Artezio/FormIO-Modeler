const { Formio } = require('formiojs');
const path = require('path');
const clearNode = require('../../util/clearNode');
const $ = require('jquery');
const initJQueryNotify = require('../../../libs/notify');
const isComponent = require('../../util/isComponent');

if (!$.notify) {
    initJQueryNotify();
}
class FormioFacade {
    constructor(builderContainer, formContainer, options = {}) {
        this.onSchemaChanged = options.onSchemaChanged;
        this.onSubmit = options.onSubmit;
        this.builderContainer = builderContainer;
        this.formContainer = formContainer;
        this.customComponentNames = new Set();
        if (options.getForms && options.getFormById && options.getActiveFormPath) {
            this._overrideMakeRequest(options.getForms, options.getFormById, options.getActiveFormPath);
        }
    }

    get builderOptions() {
        const customComponentNames = [...this.customComponentNames.values()];
        if (customComponentNames.length) {
            const components = customComponentNames.reduce((components, name) => {
                components[name] = true;
                return components;
            }, {})
            return {
                builder: {
                    custom: {
                        title: 'Custom Components',
                        default: false,
                        weight: 100,
                        components
                    }
                }
            }
        }
        return {};
    }

    _overrideMakeRequest(getForms, getFormById, getActiveFormPath) {
        const baseUrl = 'http://localhost';
        const regExp = new RegExp('^' + baseUrl + '/form');
        const regExp2 = new RegExp('^' + baseUrl + '/form/(.*)[/\?$]');
        function _overrideFormioRequest(fn) {
            return async function (...args) {
                const _baseUrl = args[2];
                if (regExp2.test(_baseUrl)) {
                    const id = _baseUrl.match(regExp2)[1];
                    const form = await getFormById(id);
                    return form;
                }
                if (regExp.test(_baseUrl)) {
                    const subForms = await getForms();
                    const path = getActiveFormPath();
                    return subForms.filter(subForm => subForm.path !== path);
                }
                return fn.apply(this, args);
            }
        }
        Formio.setBaseUrl(baseUrl);
        Formio.makeRequest = _overrideFormioRequest(Formio.makeRequest);
    }

    _registerComponent(componentDetails = {}) {
        const { name, path } = componentDetails;
        try {
            if (!name) throw new Error('No name for custom component provided');
            const CustomComponent = require(path);
            if (!isComponent(CustomComponent)) {
                throw new Error('Not valid custom component');
            }
            Formio.registerComponent(name, CustomComponent);
            this.customComponentNames.add(name);
            return true;
        } catch (err) {
            console.info(err);
            return false;
        }
    }

    registerComponents(componentsDetails) {
        const registeredComponents = componentsDetails.filter(componentDetails => this._registerComponent(componentDetails));
        if (registeredComponents.length !== componentsDetails.length) {
            componentsDetails.forEach(componentDetails => {
                if (!registeredComponents.some(component => component.path === componentDetails.path)) {
                    $.notify(`${path.basename(componentDetails.path)} is not valid!`);
                }
            })
        }
    }

    attachBuilder(schema, options = {}) {
        Formio.builder(this.builderContainer, schema, { ...this.builderOptions, ...options }).then(builderInstance => {
            this.builder = builderInstance;
            if (this.onSchemaChanged) {
                this.builder.on('render', () => {
                    this.onSchemaChanged(this.builder.schema);
                });
            }
        })
    }

    attachForm(schema = {}, options = {}) {
        Formio.createForm(this.formContainer, schema, options).then(rendererInstance => {
            this.form = rendererInstance;
            this.form.nosubmit = true;
            if (this.onSubmit) {
                this.form.on('submit', submission => {
                    this.onSubmit(submission);
                    this.form && this.form.emit('submitDone', submission);
                });
            }
        })
    }

    detachBuilder() {
        this._unsubscribeRender();
        clearNode(this.builderContainer);
    }

    detachForm() {
        this._unsubscribeSubmit();
        clearNode(this.formContainer);
    }

    unsubscribe() {
        this._unsubscribeRender();
        this._unsubscribeSubmit();
    }

    _unsubscribeRender() {
        this.builder && this.builder.off('render');
    }

    _unsubscribeSubmit() {
        this.form && this.form.off('submit');
    }
}

module.exports = FormioFacade;