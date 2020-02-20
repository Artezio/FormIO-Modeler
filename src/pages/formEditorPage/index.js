const { ipcRenderer, shell } = require('electron');
const path = require('path');
const $ = require('jquery');
const initJQueryNotify = require('../../../libs/notify');
const FormioFacade = require('./formioFacade');
const JsonViewerFacade = require('./jsonViewerFacade');
const { SAVED_MESSAGE } = require('../../constants/clientConstants')
const getLoader = require('../../util/getLoader');

require('bootstrap');
initJQueryNotify();

const detailsForm = document.forms.formDetails;
const $viewDataTabLink = $(document.getElementById('view-data-tab'));
const jsonContainer = document.getElementById('viewData');
const builderContainer = document.getElementById('builder');
const formContainer = document.getElementById('preview');
const toolBar = document.getElementById('toolbar');
const labelArtezioLink = document.getElementById('label-artezio-link');
const advertizingModalWrapper = document.getElementById('advertizing-modal');
const advertizingModal = document.getElementById('modal');
const toolBarButtons = {
    saveCurrentForm: toolBar.children['saveCurrentForm'],
    openNewForm: toolBar.children['openNewForm'],
    openForm: toolBar.children['openForm'],
    changeCurrentWorkspace: toolBar.children['changeCurrentWorkspace'],
    registerCustomComponents: toolBar.children['registerCustomComponents']
}
const loader = getLoader();

let modalRemoverTimerId;

const formioFacade = new FormioFacade(builderContainer, formContainer, {
    getForms: getForms,
    getFormById: getFormById,
    onSubmit: submitHandler,
    onSchemaChanged: schemaChangedHandler,
    getActiveFormPath: getActiveFormPath
});
const jsonViewerFacade = new JsonViewerFacade(jsonContainer);

$('body').on('click', 'a', (event) => {
    event.preventDefault();
    let link = event.target.href;
    shell.openExternal(link);
});

function run() {
    const unsubscribe = subscribeOnEvents();
    detailsForm.addEventListener('input', changeFormDetailsHandler);
    toolBarButtons.openNewForm.addEventListener('click', openNewForm);
    toolBarButtons.openForm.addEventListener('click', openForm);
    toolBarButtons.saveCurrentForm.addEventListener('click', saveCurrentForm);
    toolBarButtons.changeCurrentWorkspace.addEventListener('click', changeCurrentWorkspace);
    toolBarButtons.registerCustomComponents.addEventListener('click', registerCustomComponents);
    labelArtezioLink.addEventListener('click', attachAdvertisingModal);
    detailsForm.onsubmit = e => e.preventDefault();
    document.addEventListener('unload', () => {
        unsubscribe();
        formioFacade.unsubscribe();
        detailsForm.removeEventListener('input', changeFormDetailsHandler);
        toolBarButtons.openNewForm.removeEventListener('click', openNewForm);
        toolBarButtons.openForm.removeEventListener('click', openForm);
        toolBarButtons.saveCurrentForm.removeEventListener('click', saveCurrentForm);
        toolBarButtons.changeCurrentWorkspace.removeEventListener('click', changeCurrentWorkspace);
        toolBarButtons.registerCustomComponents.removeEventListener('click', registerCustomComponents);
        labelArtezioLink.removeEventListener('click', attachAdvertisingModal);
    });

    getCurrentWorkspace();
}

function attachAdvertisingModal() {
    advertizingModalWrapper.style.display = '';
    advertizingModal.addEventListener('click', preventDetachAdvertizingModal, true)
    setTimeout(() => {
        document.addEventListener('click', detachAdvertizingModal, true);
    });
}

function preventDetachAdvertizingModal() {
    if (modalRemoverTimerId) {
        clearTimeout(modalRemoverTimerId);
        modalRemoverTimerId = null;
    }
}

function detachAdvertizingModal(e) {
    modalRemoverTimerId = setTimeout(() => {
        advertizingModalWrapper.style.display = 'none';
        document.removeEventListener('click', detachAdvertizingModal, true);
        advertizingModal.removeEventListener('click', preventDetachAdvertizingModal, true)
    })
}

function openNewForm() {
    ipcRenderer.send('openNewForm.start');
}

function openForm() {
    ipcRenderer.send('openForm.start');
}

function saveCurrentForm() {
    ipcRenderer.send('saveCurrentForm.start');
}

function changeCurrentWorkspace() {
    ipcRenderer.send('changeCurrentWorkspace.start');
}

function registerCustomComponents() {
    ipcRenderer.send('registerCustomComponents.start');
}

function changeFormDetailsHandler() {
    adjustForm();
}

function getCurrentWorkspace() {
    ipcRenderer.send('getCurrentWorkspace.start');
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
    enableSaveButton();
}

function enableSaveButton() {
    toolBarButtons.saveCurrentForm.disabled = false;
}

function disableSaveButton() {
    toolBarButtons.saveCurrentForm.disabled = true;
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
        if (Array.isArray(customComponentsDetails)) {
            formioFacade.registerComponents(customComponentsDetails);
        }
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

function saveCurrentFormEndHandler(event, result = {}) {
    if (!result.error) {
        $.notify(SAVED_MESSAGE, 'success');
        disableSaveButton();
    }
}

function focusFieldByNameEndHandler(event, result = {}) {
    const name = result.payload;
    const field = detailsForm.elements[name];
    field && field.focus();
}

function attachLoaderEndHandler() {
    document.body.append(loader);
}

function detachLoaderEndHandler() {
    document.body.removeChild(loader);
}

function getCurrentWorkspaceEndHandler(event, result = {}) {
    if (!result.error) {
        const workspace = result.payload;
        const base = document.createElement('base');
        base.href = workspace + path.sep;
        document.head.append(base);
    }

    loadCustomComponentsDetails();
}

function subscribeOnEvents() {
    ipcRenderer.on('getCustomComponentsDetails.end', getCustomComponentsDetailsEndHandler);
    ipcRenderer.on('getCurrentForm.end', getCurrentFormEndHandler);
    ipcRenderer.on('saveCurrentForm.end', saveCurrentFormEndHandler);
    ipcRenderer.on('focusFieldByName.end', focusFieldByNameEndHandler);
    ipcRenderer.on('attachLoader.end', attachLoaderEndHandler);
    ipcRenderer.on('detachLoader.end', detachLoaderEndHandler);
    ipcRenderer.on('getCurrentWorkspace.end', getCurrentWorkspaceEndHandler);

    return function () {
        ipcRenderer.off('getCustomComponentsDetails.end', getCustomComponentsDetailsEndHandler);
        ipcRenderer.off('getCurrentForm.end', getCurrentFormEndHandler);
        ipcRenderer.off('saveCurrentForm.end', saveCurrentFormEndHandler);
        ipcRenderer.off('focusFieldByName.end', focusFieldByNameEndHandler);
        ipcRenderer.off('attachLoader.end', attachLoaderEndHandler);
        ipcRenderer.off('detachLoader.end', detachLoaderEndHandler);
        ipcRenderer.off('getCurrentWorkspace.end', getCurrentWorkspaceEndHandler);
    }
}

run();