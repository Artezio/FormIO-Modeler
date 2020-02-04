const { ipcRenderer } = require('electron');
const { Formio } = require('formiojs');
const $ = require('jquery');
const JSONViewer = require('./json-viewer');
const initJQueryNotify = require('./notify');
// const debounce = require('debounce');

require('bootstrap');
initJQueryNotify();

const NO_DATA_SUBMITTED = 'No data submitted';
const formDetailsElement = document.forms.formDetails;
const pathElement = document.getElementById('formPath');
const titleElement = document.getElementById('formTitle');
const nameElement = document.getElementById('formName');
const mainContentWrapper = document.getElementById('mainContentWrapper');
const submissionContainer = document.getElementById('viewData');
const viewDataTabLink = document.getElementById('view-data-tab');
const builderContainer = document.getElementById('builder');
const formContainer = document.getElementById('preview');

let builder;
let form;
let formBuilderExtension = {};

function setCustomComponents(names) {
    if (!names.length) {
        formBuilderExtension = {};
        return;
    };
    const components = names.reduce((components, name) => {
        components[name] = true;
        return components;
    }, {})
    formBuilderExtension = {
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

function run() {
    overrideFormioRequest();
    const unsubscribe = prepareHandlers();
    formDetailsElement.addEventListener('input', emitFormChanged);
    formDetailsElement.onsubmit = e => e.preventDefault();
    document.addEventListener('unload', () => {
        unsubscribe()
    })
}

function setFormDetails(details = {}) {
    const controls = [].filter.call(formDetailsElement.elements, el => !!el.name);
    controls.forEach(control => {
        control.value = details[control.name] === undefined ? '' : details[control.name];
    })
}

function getFormDetails() {
    return [].map.call(formDetailsElement.elements, el => ({ name: el.name, value: el.value }))
        .filter(element => !!element.name)
        .reduce((result, detail) => {
            result[detail.name] = detail.value;
            return result;
        }, {});
}

function overrideFormioRequest() {
    const baseUrl = 'http://localhost';
    const regExp = new RegExp('^' + baseUrl + '/form');
    const regExp2 = new RegExp('^' + baseUrl + '/form/(.*)[/\?$]');
    function _overrideFormioRequest(fn) {
        return async function (...args) {
            const _baseUrl = args[2];
            if (regExp2.test(_baseUrl)) {
                const id = _baseUrl.match(regExp2)[1];
                const promise = new Promise((res, rej) => {
                    ipcRenderer.send('getSubFormById.start', id);
                    ipcRenderer.once('getSubFormById.end', (event, subForm) => {
                        res(subForm);
                    });
                })
                const form = await promise;
                return form;
            }
            if (regExp.test(_baseUrl)) {
                const promise = new Promise((res, rej) => {
                    ipcRenderer.send('getSubForms.start');
                    ipcRenderer.once('getSubForms.end', (event, subForms) => {
                        res(subForms);
                    });
                })
                const subForms = await promise;
                const { path } = getFormDetails();
                return subForms.filter(subForm => subForm.path !== path);
            }
            return fn.apply(this, args);
        }
    }
    Formio.setBaseUrl(baseUrl);
    Formio.makeRequest = _overrideFormioRequest(Formio.makeRequest);
}

function emitFormChanged() {
    const form = { ...(builder && builder.schema), ...getFormDetails() };
    ipcRenderer.send('formWasChanged', form);
}

function detachFormio() {
    builderContainer.innerHTML = "";
    builder && builder.off('render');
    builder = null;
    detachForm();
}

function attachFormio(schema = {}) {
    Formio.builder(builderContainer, schema, formBuilderExtension).then(builderInstance => {
        builder = builderInstance;
        builder.on('render', schemaChangedHandler);
    })
    attachForm(schema);
}

function attachForm(schema = {}) {
    Formio.createForm(formContainer, schema, {
        noAlerts: true
    }).then(rendererInstance => {
        form = rendererInstance;
        form.nosubmit = true;
        form.on('submit', onSubmitHandler);
    })
}

function detachForm() {
    formContainer.innerHTML = "";
    form && form.off('submit');
    form = null;
}

function onSubmitHandler(submission) {
    form && form.emit('submitDone', submission);
    showSubmission(submission);
}

function schemaChangedHandler() {
    const schema = builder.schema;
    hideSubmission();
    detachForm();
    attachForm(schema);
    emitFormChanged();
}

function showSubmission(submission) {
    $(viewDataTabLink).tab('show');
    const jsonViewer = new JSONViewer()
    clearNode(submissionContainer)
    submissionContainer.append(jsonViewer.getContainer())
    jsonViewer.showJSON(submission && submission.data);
}

function clearNode(node) {
    node.innerHTML = '';
}

function hideSubmission() {
    clearNode(submissionContainer);
    const p = document.createElement('p');
    p.textContent = NO_DATA_SUBMITTED;
    submissionContainer.append(p);
}

function formWasSavedHandler() {
    $.notify('Saved successfully!', 'success');
}

function createNewFormHandler() {
    showMainContent();
    formDetailsElement.reset();
    detachFormio();
    attachFormio();
}

function openFormHandler(event, form) {
    showMainContent();
    setFormDetails(form);
    detachFormio();
    attachFormio(form);
}

function registerCustomComponentsHandler(event, customComponentsDetails) {
    if (!Array.isArray(customComponentsDetails)) return;
    const needReattachFormio = Boolean(form && builder);
    let schema;
    if (needReattachFormio) {
        schema = builder.schema;
        detachFormio();
    }
    const names = [];
    customComponentsDetails.forEach(({ name, path }) => {
        try {
            const customComponent = require(path);
            Formio.registerComponent(name, customComponent);
            names.push(name);
        } catch (err) {
            console.error(err);
        }
    })
    setCustomComponents(names);
    if (needReattachFormio) {
        attachFormio(schema);
    }
}

function showMainContent() {
    mainContentWrapper.style.display = "";
}

function focusPathHandler() {
    pathElement && pathElement.focus();
}

function focusTitleHandler() {
    titleElement && titleElement.focus();
}

function focusNameHandler() {
    nameElement && nameElement.focus();
}

function prepareHandlers() {
    ipcRenderer.on('formWasSaved', formWasSavedHandler);
    ipcRenderer.on('createNewForm', createNewFormHandler);
    ipcRenderer.on('openForm', openFormHandler);
    ipcRenderer.on('focusPath', focusPathHandler);
    ipcRenderer.on('focusTitle', focusTitleHandler);
    ipcRenderer.on('focusName', focusNameHandler);
    ipcRenderer.on('registerCustomComponents', registerCustomComponentsHandler);

    return function () {
        ipcRenderer.removeListener('formWasSaved', formWasSavedHandler);
        ipcRenderer.removeListener('createNewForm', createNewFormHandler);
        ipcRenderer.removeListener('openForm', openFormHandler);
        ipcRenderer.removeListener('focusPath', focusPathHandler);
        ipcRenderer.removeListener('focusTitle', focusTitleHandler);
        ipcRenderer.removeListener('focusName', focusNameHandler);
        ipcRenderer.removeListener('registerCustomComponents', registerCustomComponentsHandler);
    }
}

run();