const { Formio } = require('formiojs');
const clearNode = require('../../util/clearNode');

class FormioFacade {
    constructor(builderContainer, formContainer, options = {}) {
        debugger;
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

    registerComponent(componentDetails = {}) {
        const { name, path } = componentDetails;
        try {
            if (!name) throw new Error('No name for custom component provided');
            const customComponent = require(path);
            Formio.registerComponent(name, customComponent);
            this.customComponentNames.add(name);
        } catch (err) {
            console.error(err);
        }
    }

    registerComponents(componentsDetails) {
        if (Array.isArray(componentsDetails)) {
            componentsDetails.forEach(componentDetails => this.registerComponent(componentDetails));
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

    attachForm(schema, options = {}) {
        Formio.createForm(this.formContainer, schema, options).then(rendererInstance => {
            this.form = rendererInstance;
            this.form.nosubmit = true;
            if (this.onSubmit) {
                this.form.on('submit', this.onSubmit);
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