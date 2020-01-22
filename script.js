const { ipcRenderer } = require('electron');
const uuid = require('uuid/v1');
const { Formio } = require('formiojs');
const $ = require('jquery');
require('bootstrap');

const jsonViewer = new JSONViewer();

let form = {};
let formStatus;
let savedStatus;
const SAVED = 'saved';
const NOT_SAVED = 'NOT_SAVED';
const EDIT = 'EDIT';
const CREATE = 'CREATE';
const NO_DATA_SUBMITTED = 'No data submitted';
const formElement = document.forms.formDetails;
const pathElement = document.getElementById('formPath');
const titleElement = document.getElementById('formTitle');
const mainContentWrapper = document.getElementById('mainContentWrapper');
const viewDataContainerElement = document.getElementById('viewData');
const viewDataTabElement = document.getElementById('view-data-tab');
const jsonViewerContainer = jsonViewer.getContainer();

function run() {
    overrideFormioRequest();
    const unsubscribe = prepareHandlers();
    formElement.addEventListener('change', handleFormChange);
    formElement.onsubmit = e => e.preventDefault();
    document.addEventListener('unload', () => {
        unsubscribe()
    })
    appendNoDataSubmittedMessage();
}

function setSaved() {
    savedStatus = SAVED;
}

function setUnsaved() {
    savedStatus = NOT_SAVED;
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
                const subForms = await new Promise((res, rej) => {
                    ipcRenderer.send('getSubForms.start');
                    ipcRenderer.once('getSubForms.end', (event, subForms) => {
                        res(subForms);
                    });
                })
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
    setUnsaved();
}

function setFormStatusCreate() {
    formStatus = CREATE;
}

function setFormStatusEdit() {
    formStatus = EDIT;
}

function attachFormio(schema = {}) {
    Formio.builder(document.getElementById('builder'), schema).then(builder => {
        const previewElement = document.getElementById('preview');
        let formInstance;
        Formio.createForm(previewElement, schema, {
            noAlerts: true
        }).then(instance => {
            formInstance = instance;
            instance.nosubmit = true;
            instance.on('submit', submission => {
                instance.emit('submitDone', submission);
            })
            instance.on('submitDone', fomrioSubmitDoneHandler);
        })
        builder.on('change', schema => {
            updateForm(schema);
            if (formInstance) {
                formInstance.setForm(schema);
            }
            appendNoDataSubmittedMessage();
        });
    })
}

function fomrioSubmitDoneHandler(submission) {
    $(viewDataTabElement).tab('show');
    jsonViewer.showJSON(submission && submission.data);
    appendJsonViewer();
}

function appendNoDataSubmittedMessage() {
    viewDataContainerElement.innerHTML = NO_DATA_SUBMITTED;
}

function appendJsonViewer() {
    viewDataContainerElement.innerHTML = "";
    viewDataContainerElement.append(jsonViewerContainer);
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
    setSaved();
}

function getFormHandler(event, arg) {
    handleFormChange();/// to replace!
    ipcRenderer.send('getForm.end', form);
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
    setSaved();
}

function showMainContent() {
    mainContentWrapper.style.display = "";
}

function focusPathHandler(event, arg) {
    pathElement && pathElement.focus();
}

function focusTitleHandler() {
    titleElement && titleElement.focus();
}

function isFormSavedStartHandler() {
    ipcRenderer.send('isFormSaved.end', formStatus === SAVED);
}

function prepareHandlers() {
    ipcRenderer.on('getForm.start', getFormHandler);
    ipcRenderer.on('formWasSaved', formWasSavedHandler);
    ipcRenderer.on('createNewForm', createNewFormHandler);
    ipcRenderer.on('openForm', openFormHandler);
    ipcRenderer.on('focusPath', focusPathHandler);
    ipcRenderer.on('focusTitle', focusTitleHandler);
    ipcRenderer.on('isFormSaved.start', isFormSavedStartHandler);

    return function () {
        ipcRenderer.removeListener('getForm.start', getFormHandler);
        ipcRenderer.removeListener('formWasSaved', formWasSavedHandler);
        ipcRenderer.removeListener('createNewForm', createNewFormHandler);
        ipcRenderer.removeListener('openForm', openFormHandler);
        ipcRenderer.removeListener('focusPath', focusPathHandler);
        ipcRenderer.removeListener('focusTitle', focusTitleHandler);
        ipcRenderer.removeListener('isFormSaved.start', isFormSavedStartHandler);
    }
}

run();