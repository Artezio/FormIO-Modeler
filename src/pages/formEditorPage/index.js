const { ipcRenderer } = require('electron');
const $ = require('jquery');
const initJQueryNotify = require('../../libs/notify');
const FormioFacade = require('./formioFacade');
const JsonViewerFacade = require('./jsonViewerFacade');
const { SAVED_MESSAGE, NOT_VALID_FORM } = require('../../constants/clientConstants')

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
    detailsForm.addEventListener('input', changeFormDetailsHandler);
    detailsForm.onsubmit = e => e.preventDefault();
    document.addEventListener('unload', () => {
        unsubscribe();
        formioFacade.unsubscribe();
        detailsForm.removeEventListener('input', changeFormDetailsHandler);
    });
    loadCustomComponentsDetails();
}

function getErrorMessage(error) {
    return error.slice(7);
}

function changeFormDetailsHandler() {
    adjustForm();
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
        ipcRenderer.send('getFormById.start', { payload: id });
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
        ipcRenderer.send('getForms.start');
        ipcRenderer.once('getForms.end', (event, response) => {
            if (response.error) {
                rej(response.error);
            } else {
                res(response.payload);
            }
        });
    })
}

function adjustForm(schema = {}) {
    const form = { ...schema, ...getFormDetails() };
    ipcRenderer.send('adjustForm.start', { payload: form });
}

function loadCustomComponentsDetails() {
    ipcRenderer.send('getCustomComponentsDetails.start');
}

function loadForm() {
    ipcRenderer.send('getCurrentForm.start');
}

function schemaChangedHandler(schema = {}) {
    jsonViewerFacade.hide();
    formioFacade.detachForm();
    formioFacade.attachForm(schema, { noAlerts: true });
    adjustForm(schema);
}

function submitHandler(submission = {}) {
    jsonViewerFacade.show(submission.data);
    $viewDataTabLink.tab('show');
}

function getCustomComponentsDetailsEndHandler(event, response = {}) {
    if (!response.error) {
        const customComponentsDetails = response.payload;
        formioFacade.registerComponents(customComponentsDetails);
    }
    loadForm();
}

function getCurrentFormEndHandler(event, response = {}) {
    if (!response.error) {
        const form = response.payload;
        setFormDetails(form);
        formioFacade.attachBuilder(form);
        formioFacade.attachForm(form);
    }
}

function setFormDetails(form = {}) {
    const controls = [].filter.call(detailsForm.elements, el => !!el.name);
    controls.forEach(control => {
        control.value = form[control.name] === undefined ? '' : form[control.name];
    })
}

function focusFirstInvalidField() {

}

function saveCurrentFormEndHandler(event, result = {}) {
    if (!result.error) {
        $.notify(SAVED_MESSAGE, 'success');
    } else {
        focusFirstInvalidField();
    }
}

function subscribeOnEvents() {
    ipcRenderer.on('getCustomComponentsDetails.end', getCustomComponentsDetailsEndHandler);
    ipcRenderer.on('getCurrentForm.end', getCurrentFormEndHandler);
    ipcRenderer.on('saveCurrentForm.end', saveCurrentFormEndHandler);

    return function () {
        ipcRenderer.removeListener('getCustomComponentsDetails.end', getCustomComponentsDetailsEndHandler);
        ipcRenderer.removeListener('getCurrentForm.end', getCurrentFormEndHandler);
        ipcRenderer.removeListener('saveCurrentForm.end', saveCurrentFormEndHandler);
    }
}

run();