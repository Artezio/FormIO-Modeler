const { ipcRenderer } = require('electron');
const uuid = require('uuid/v1');
const { Formio } = require('formiojs');
const $ = require('jquery');
require('bootstrap');

let form = {};
let formStatus;
const EDIT = 'EDIT';
const CREATE = 'CREATE';
const NO_DATA_SUBMITTED = 'No data submitted';
const formElement = document.forms.formDetails;
const pathElement = document.getElementById('formPath');
const titleElement = document.getElementById('formTitle');
const mainContentWrapper = document.getElementById('mainContentWrapper');
const submissionContainer = document.getElementById('viewData');
const viewDataTabElement = document.getElementById('view-data-tab');
const builderContainer = document.getElementById('builder');
const previewContainer = document.getElementById('preview');

let formioBuilder;
let unsubscribeBuilderRender;
let formioRenderer;
let unsubscribeRendererSubmit;

const formRendererOptions = {
    noAlerts: true
}

function run() {
    overrideFormioRequest();
    const unsubscribe = prepareHandlers();
    formElement.addEventListener('input', handleFormChange);
    formElement.onsubmit = e => e.preventDefault();
    document.addEventListener('unload', () => {
        unsubscribe()
    })
}

function setFormDetails(details = {}) {
    const controls = [].filter.call(formElement.elements, el => !!el.name);
    controls.forEach(control => {
        control.value = details[control.name] === undefined ? '' : details[control.name];
    })
}

function getFormDetails() {
    return [].map.call(formElement.elements, el => ({ name: el.name, value: el.value })).filter(element => !!element.name);
}

function handleFormChange() {
    const formDetails = getFormDetails().reduce((result, detail) => {
        result[detail.name] = detail.value;
        return result;
    }, {});
    updateForm(formDetails);
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
                if (formStatus === EDIT) {
                    return subForms.filter(subForm => subForm.path !== form.path);
                }
                return subForms;
            }
            return fn.apply(this, args);
        }
    }
    Formio.setBaseUrl(baseUrl);
    Formio.makeRequest = _overrideFormioRequest(Formio.makeRequest);
}

function updateForm(newForm = {}) {
    form = {
        ...form,
        created: form.created ? form.created : new Date().toISOString(),
        modified: new Date().toISOString(),
        _id: form._id ? form._id : uuid(),
        type: 'form',
        ...newForm
    };
    sendFormWasChanged();
}

function sendFormWasChanged() {
    ipcRenderer.send('formWasChanged', form);
}

function setFormStatusCreate() {
    formStatus = CREATE;
}

function setFormStatusEdit() {
    formStatus = EDIT;
}

function attachFormio(schema = {}) {
    attachFormBuilder(schema);
    attachFormioRenderer(schema);
}

function attachFormBuilder(schema) {
    unsubscribeBuilderRender && unsubscribeBuilderRender();
    Formio.builder(builderContainer, schema).then(builderInstance => {
        formioBuilder = builderInstance;
        subscribeBuilderRender();
    })
}

function attachFormioRenderer(schema) {
    unsubscribeRendererSubmit && unsubscribeRendererSubmit();
    Formio.createForm(previewContainer, schema, formRendererOptions).then(rendererInstance => {
        formioRenderer = rendererInstance;
        formioRenderer.nosubmit = true;
        subscribeRendererSubmit();
    })
}

function subscribeRendererSubmit() {
    if (formioRenderer) {
        formioRenderer.on('submit', formioSubmissionHandler);
        unsubscribeRendererSubmit = function () {
            formioRenderer.removeEventListener('submit', formioSubmissionHandler);
            unsubscribeRendererSubmit = null;
        }
    }
}
function formioSubmissionHandler(submission) {
    formioRenderer && formioRenderer.emit('submitDone', submission);
    showSubmission(submission);
}

function subscribeBuilderRender() {
    formioBuilder && formioBuilder.on('render', onRenderHandler);
    unsubscribeBuilderRender = function () {
        formioBuilder && formioBuilder.removeEventListener('render', onRenderHandler);
        unsubscribeBuilderRender = null;
    }
}

function onRenderHandler() {
    if (formioBuilder) {
        const schema = formioBuilder.schema;
        updateForm(schema);
        formioRenderer && formioRenderer.setForm(schema);
        hideSubmission();
        formioRenderer && formioRenderer.reset();
    }
}

function showSubmission(submission) {
    $(viewDataTabElement).tab('show');
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

function resetFormDetails() {
    typeof formElement.reset === 'function' && formElement.reset();
}

function formWasSavedHandler(event, arg) {
    const notification = document.createElement('div');
    notification.className = 'alert alert-success saved-notification';
    notification.textContent = 'Saved successfully!';
    document.body.append(notification);
    notification.addEventListener('click', () => {
        if (timerId) {
            clearTimeout(timerId);
            notification.remove();
        }
    })
    const timerId = setTimeout(() => {
        notification.remove();
    }, 3000);
    setFormStatusEdit();
}

function createNewFormHandler(event, arg) {
    showMainContent();
    resetFormDetails();
    attachFormio();
    setFormStatusCreate();
}

function openFormHandler(event, form) {
    showMainContent();
    setFormDetails(form);
    attachFormio(form);
    setFormStatusEdit();
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