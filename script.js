const { ipcRenderer } = require('electron');
const uuid = require('uuid/v1');
const { Formio } = require('formiojs');
require('bootstrap');

let form = {};
let formStatus;
const EDIT = 'EDIT',
    CREATE = 'CREATE';
const formElement = document.forms.formDetails;
const pathElement = document.getElementById('formPath');
const mainContentWrapper = document.getElementById('mainContentWrapper');
run();

function run() {
    overrideFormioRequest();
    const unSubscribe = prepareHandlers();
    formElement.addEventListener('change', () => handleFormChange);
    formElement.onsubmit = e => e.preventDefault();
    document.addEventListener('unload', () => {
        typeof unSubscribe === 'function' && unSubscribe()
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
            instance.on('submitDone', (...args) => {
                console.log('submitDone', args);
            })
            instance.on('change', (...args) => {
                console.log('change', args)
            })
        })
        builder.on('change', schema => {
            updateForm(schema);
            if (formInstance) {
                formInstance.setForm(schema);
            }
        });
    })
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
}

function showMainContent() {
    mainContentWrapper.style.display = "";
}

function focusPathHandler(event, arg) {
    pathElement && pathElement.focus();
}

function prepareHandlers() {
    ipcRenderer.on('getForm.start', getFormHandler);
    ipcRenderer.on('formWasSaved', formWasSavedHandler);
    ipcRenderer.on('createNewForm', createNewFormHandler);
    ipcRenderer.on('openForm', openFormHandler);
    ipcRenderer.on('focusPath', focusPathHandler);

    return function () {
        ipcRenderer.removeListener('getForm.start', getFormHandler);
        ipcRenderer.removeListener('formWasSaved', formWasSavedHandler);
        ipcRenderer.removeListener('createNewForm', createNewFormHandler);
        ipcRenderer.removeListener('openForm', openFormHandler);
        ipcRenderer.removeListener('focusPath', focusPathHandler);
    }
}