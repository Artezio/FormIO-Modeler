const { ipcRenderer } = require('electron');
const { Formio } = require('formiojs');
const $ = require('jquery');
require('bootstrap');
require('./notify')();

const NO_DATA_SUBMITTED = 'No data submitted';
const formDetailsElement = document.forms.formDetails;
const pathElement = document.getElementById('formPath');
const titleElement = document.getElementById('formTitle');
const mainContentWrapper = document.getElementById('mainContentWrapper');
const submissionContainer = document.getElementById('viewData');
const viewDataTabLink = document.getElementById('view-data-tab');
const builderContainer = document.getElementById('builder');
const formContainer = document.getElementById('preview');

let formBuilder;
let unsubscribeBuilderRender;
let form;
let unsubscribeRendererSubmit;

const formRendererOptions = {
    noAlerts: true
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
    const regExp = new RegExp('^' + baseUrl);
    function _overrideFormioRequest(fn) {
        return async function (...args) {
            const _baseUrl = args[2];
            if (typeof _baseUrl === 'string' && regExp.test(_baseUrl)) {
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
    const form = { ...getFormDetails(), ...(formBuilder && formBuilder.schema) };
    ipcRenderer.send('formWasChanged', form);
}

function attachFormio(schema = {}) {
    Formio.builder(builderContainer, schema).then(builderInstance => {
        formBuilder = builderInstance;
        formBuilder.off('render');
        formBuilder.on('render', schemaChangedHandler);
    })
    Formio.createForm(formContainer, schema, formRendererOptions).then(rendererInstance => {
        form = rendererInstance;
        form.nosubmit = true;
        form.off('submit');
        form.on('submit', onSubmitHandler);
    })
}

function onSubmitHandler(submission) {
    form && form.emit('submitDone', submission);
    showSubmission(submission);
}

function schemaChangedHandler() {
    const schema = formBuilder.schema;
    form && form.setForm(schema);
    hideSubmission();
    if (form) {
        form.submission = { data: {} };
    }
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
    attachFormio();
}

function openFormHandler(event, form) {
    showMainContent();
    setFormDetails(form);
    attachFormio(form);
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

function prepareHandlers() {
    ipcRenderer.on('formWasSaved', formWasSavedHandler);
    ipcRenderer.on('createNewForm', createNewFormHandler);
    ipcRenderer.on('openForm', openFormHandler);
    ipcRenderer.on('focusPath', focusPathHandler);
    ipcRenderer.on('focusTitle', focusTitleHandler);

    return function () {
        ipcRenderer.removeListener('formWasSaved', formWasSavedHandler);
        ipcRenderer.removeListener('createNewForm', createNewFormHandler);
        ipcRenderer.removeListener('openForm', openFormHandler);
        ipcRenderer.removeListener('focusPath', focusPathHandler);
        ipcRenderer.removeListener('focusTitle', focusTitleHandler);
    }
}

run();