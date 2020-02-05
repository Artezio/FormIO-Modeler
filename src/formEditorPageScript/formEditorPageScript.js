const { ipcRenderer } = require('electron');
const $ = require('jquery');
const initJQueryNotify = require('../libs/notify');
const FormioFacade = require('./formioFacade');
const JsonViewerFacade = require('./jsonViewerFacade');

require('bootstrap');
initJQueryNotify();

const detailsForm = document.forms.formDetails;
const $viewDataTabLink = $(document.getElementById('view-data-tab'));
const jsonContainer = document.getElementById('viewData');
const builderContainer = document.getElementById('builder');
const formContainer = document.getElementById('preview');

const formioFacade = new FormioFacade(builderContainer, formContainer, {
    getForms: getForms,
    getFormById: getFormById,
    onSubmit: submitHandler,
    onSchemaChanged: schemaChangedHandler,
    getActiveFormPath: getActiveFormPath
});
const jsonViewerFacade = new JsonViewerFacade(jsonContainer);

function run() {
    const unsubscribe = subscribeOnEvents();
    formDetailsElement.addEventListener('input', changeFormDetailsHandler);
    formDetailsElement.onsubmit = e => e.preventDefault();
    document.addEventListener('unload', () => {
        unsubscribe();
        formioFacade.unsubscribe();
        formDetailsElement.removeEventListener('input', changeFormDetailsHandler);
    });
    loadCustomComponentsDetails();
}

function changeFormDetailsHandler() {
    sendFormUpdates();
}

function getActiveFormPath() {
    const { path } = getFormDetails();
    return path;
}

function getFormDetails() {
    return [].map.call(detailsForm.elements, el => ({ name: el.name, value: el.value }))
        .filter(element => !!element.name)
        .reduce((result, detail) => {
            result[detail.name] = detail.value;
            return result;
        }, {});
}

function getFormById(id) {
    return new Promise((res, rej) => {
        ipcRenderer.send('getFormById.start', id);
        ipcRenderer.once('getFormById.end', (event, response) => {
            if (response.error) {
                rej(response.error);
            } else {
                res(response.payload);
            }
        });
    })
}

function getForms() {
    return new Promise((res, rej) => {
        ipcRenderer.send('getForms.start', id);
        ipcRenderer.once('getForms.end', (event, response) => {
            if (response.error) {
                rej(response.error);
            } else {
                res(response.payload);
            }
        });
    })
}

function sendFormUpdates(schema = {}) {
    const form = { ...schema, ...getFormDetails() };
    ipcRenderer.send('sendFormUpdates', form);
}

function loadCustomComponentsDetails() {
    ipcRenderer.send('loadCustomComponentsInfo.start');
}

function loadForm() {
    ipcRenderer.send('loadForm.start');
}

function schemaChangedHandler(schema = {}) {
    jsonViewerFacade.hide();
    formioFacade.detachForm();
    formioFacade.attachForm(schema, { noAlerts: true });
    sendFormUpdates(schema);
}

function submitHandler(submission = {}) {
    jsonViewerFacade.show(submission.data);
    $viewDataTabLink.tab('show');
}

function loadCustomComponentsDetailsEndHandler(event, response) {
    if (!response.error) {
        const customComponentsDetails = response.payload;
        formioFacade.registerComponents(customComponentsDetails);
    }
    loadForm();
}

function loadFormEndHandler(event, response) {
    if (!response.error) {
        const schema = response.payload;
        formioFacade.attachBuilder(schema);
    }
}

function focusDetailsFormFieldByNameHandler(event, name) {
    const element = detailsForm.elements[name];
    element && element.focus();
}

function formWasSavedHandler() {
    $.notify(SAVED_MESSAGE, 'success');
}

function subscribeOnEvents() {
    ipcRenderer.on('loadCustomComponents.end', loadCustomComponentsDetailsEndHandler);
    ipcRenderer.on('loadForm.end', loadFormEndHandler);
    ipcRenderer.on('focusDetailsFormFieldByName', focusDetailsFormFieldByNameHandler);
    ipcRenderer.on('formWasSaved', formWasSavedHandler);

    return function () {
        ipcRenderer.removeListener('loadCustomComponents.end', loadCustomComponentsDetailsEndHandler);
        ipcRenderer.removeListener('loadForm.end', loadFormEndHandler);
        ipcRenderer.removeListener('focusDetailsFormFieldByName', focusDetailsFormFieldByNameHandler);
        ipcRenderer.removeListener('formWasSaved', formWasSavedHandler);
    }
}

run();