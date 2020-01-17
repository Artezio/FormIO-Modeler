const { ipcRenderer } = require('electron');
const uuid = require('uuid/v1');
const { Formio } = require('formiojs');

let form = {};
let formStatus;
const EDIT = 'EDIT',
    CREATE = 'CREATE';
const formElement = document.forms.formDetails;
const pathElement = document.getElementById('formPath');
run();

function run() {
    overrideFormioRequest();
    const unSubscribe = prepareHandlers();
    formElement.addEventListener('change', () => handleFormChange);
    // subscribeOnChange(formElement.elements);
    formElement.onsubmit = e => e.preventDefault();
    document.addEventListener('unload', () => {
        typeof unSubscribe === 'function' && unSubscribe()
    })
}

// function subscribeOnChange(elements) {
//     elements.forEach(element => element.addEventListener('change', () => handleFormChange()))
// }

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

function attachBuilder(schema = {}) {
    Formio.builder(document.getElementById('builder'), schema).then(builder => {
        builder.on('change', updateForm);
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
    formElement.style.display = "";
    resetFormDetails();
    attachBuilder();
    setFormStatusCreate();
}

function openFormHandler(event, form) {
    formElement.style.display = "";
    setFormDetails(form);
    attachBuilder(form);
    setFormStatusEdit();
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