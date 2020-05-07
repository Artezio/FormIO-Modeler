const { shell } = require('electron');
const path = require('path');
const $ = require('jquery');
const initJQueryNotify = require('../../../libs/notify');
const FormioFacade = require('./formioFacade');
const JsonViewerFacade = require('./jsonViewerFacade');
const getLoader = require('../../util/getLoader');
const BackendChanel = require('../../channels/backendChanel');
const TabBar = require('./tabBar');

require('bootstrap');
initJQueryNotify();

const welcomeTab = document.getElementById('welcome-tab');
const welcomeTabButtons = {
    createNewForm: document.getElementById('welcome-tab__create-new-form'),
    openForm: document.getElementById('welcome-tab__open-form'),
}
const detailsForm = document.forms.formDetails;
const tabBarContainer = document.getElementById('tab-bar');
const $viewDataTabLink = $(document.getElementById('view-data-tab'));
const $viewBuilderTabLink = $(document.getElementById('edit-form-tab'))
const jsonContainer = document.getElementById('viewData');
const builderContainer = document.getElementById('builder');
const formContainer = document.getElementById('preview');
const toolBar = document.getElementById('toolbar');
const labelArtezioLink = document.getElementById('label-artezio-link');
const advertizingModalWrapper = document.getElementById('advertizing-modal');
const advertizingModal = document.getElementById('modal');
const toolBarButtons = {
    saveActiveTab: toolBar.children['saveCurrentForm'],
    openNewForm: toolBar.children['openNewForm'],
    openForm: toolBar.children['openForm'],
    changeCurrentWorkspace: toolBar.children['changeCurrentWorkspace'],
    registerCustomComponents: toolBar.children['registerCustomComponents']
}
const loader = getLoader();

const tabBar = new TabBar(tabBarContainer);
const backendChanel = new BackendChanel();

let modalRemoverTimerId;

const formioFacade = new FormioFacade(builderContainer, formContainer, {
    getForms: getForms,
    getFormById: getFormById,
    onSubmit: submitHandler,
    onSchemaChanged: schemaChangedHandler,
    getActiveFormPath: getActiveFormPath
});
const jsonViewerFacade = new JsonViewerFacade(jsonContainer);

$(document).on('click', 'a[href^="http"]', function(event) {
    event.preventDefault();
    shell.openExternal(this.href);
});

function run() {
    const unsubscribe = subscribeOnEvents();
    detailsForm.addEventListener('input', changeFormDetailsHandler);
    detailsForm.onsubmit = e => e.preventDefault();
    toolBarButtons.openNewForm.addEventListener('click', openNewForm);
    toolBarButtons.openForm.addEventListener('click', openForm);
    toolBarButtons.saveActiveTab.addEventListener('click', saveActiveTab);
    toolBarButtons.changeCurrentWorkspace.addEventListener('click', changeCurrentWorkspace);
    toolBarButtons.registerCustomComponents.addEventListener('click', registerCustomComponents);
    labelArtezioLink.addEventListener('click', attachAdvertisingModal);
    welcomeTabButtons.createNewForm.addEventListener('click', openNewForm);
    welcomeTabButtons.openForm.addEventListener('click', openForm);
    document.addEventListener('unload', () => {
        unsubscribe();
        formioFacade.unsubscribe();
        detailsForm.removeEventListener('input', changeFormDetailsHandler);
        toolBarButtons.openNewForm.removeEventListener('click', openNewForm);
        toolBarButtons.openForm.removeEventListener('click', openForm);
        toolBarButtons.saveActiveTab.removeEventListener('click', saveActiveTab);
        toolBarButtons.changeCurrentWorkspace.removeEventListener('click', changeCurrentWorkspace);
        toolBarButtons.registerCustomComponents.removeEventListener('click', registerCustomComponents);
        labelArtezioLink.removeEventListener('click', attachAdvertisingModal);
        welcomeTabButtons.createNewForm.removeEventListener('click', openNewForm);
        welcomeTabButtons.openForm.removeEventListener('click', openForm);
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
    backendChanel.send('openNewForm');
}

function openForm() {
    backendChanel.send('openForm');
}

function saveActiveTab() {
    backendChanel.send('saveActiveTab');
}

function changeCurrentWorkspace() {
    backendChanel.send('changeCurrentWorkspace');
}

function registerCustomComponents() {
    backendChanel.send('registerCustomComponents');
}

function changeFormDetailsHandler() {
    adjustForm();
}

function getCurrentWorkspace() {
    backendChanel.send('getCurrentWorkspace');
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
        backendChanel.send('getFormById', id);
        backendChanel.once('getFormById', (event, response) => {
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
        backendChanel.send('getForms');
        backendChanel.once('getForms', (event, response) => {
            if (response.error) {
                rej(response.error);
            } else {
                res(response.payload);
            }
        });
    })
}

function clarifySaveButtonDisable(tab) {
    if (!tab || tab._formSaved) {
        disableSaveButton();
    } else {
        enableSaveButton();
    }
}

function adjustForm(schema = {}) {
    const form = { ...schema, ...getFormDetails() };
    backendChanel.send('adjustForm', form);
    enableSaveButton();
    tabBar.setActiveTabUnsaved();
}

function enableSaveButton() {
    toolBarButtons.saveActiveTab.disabled = false;
    toolBarButtons.saveActiveTab.classList.remove('disabled');
}

function disableSaveButton() {
    toolBarButtons.saveActiveTab.disabled = true;
    toolBarButtons.saveActiveTab.classList.add('disabled');
}

function getCustomComponentsDetails() {
    backendChanel.send('getCustomComponentsDetails');
}

function getCurrentForm() {
    backendChanel.send('getCurrentForm');
}

function getTabs() {
    backendChanel.send('getTabs');
}

function showBuilder() {
    $viewBuilderTabLink.tab('show');
}

function showData() {
    $viewDataTabLink.tab('show');
}

function hideWelcomeTab() {
    welcomeTab.style.display = 'none';
}

function showWelcomeTab() {
    welcomeTab.style.display = '';
}

function schemaChangedHandler(schema = {}) {
    jsonViewerFacade.hide();
    formioFacade.detachForm();
    formioFacade.attachForm(schema, { noAlerts: true });
    adjustForm(schema);
}

function submitHandler(submission = {}) {
    jsonViewerFacade.show(submission.data);
    showData();
}

function getCustomComponentsDetailsHandler(event, response = {}) {
    if (!response.error) {
        const customComponentsDetails = response.payload;
        if (Array.isArray(customComponentsDetails)) {
            formioFacade.registerComponents(customComponentsDetails);
        }
    }
    getTabs();
}

function getTabsHandler(event, response = {}) {
    if (response.error) return;
    const tabs = response.payload;
    tabBar.setTabs(tabs);
    const activeTab = tabs.find(tab => tab.isActive);
    clarifySaveButtonDisable(activeTab);
    if (tabs.length) {
        hideWelcomeTab();
        getCurrentForm();
    } else {
        showWelcomeTab();
    }
}

function switchTabHandler() {
    getCurrentForm();
}

function getCurrentFormHandler(event, response = {}) {
    if (response.error) return;
    const form = response.payload;
    setFormDetails(form);
    formioFacade.attachBuilder(form);
    formioFacade.attachForm(form);
    showBuilder();
}

function setFormDetails(form = {}) {
    const controls = [].filter.call(detailsForm.elements, el => !!el.name);
    controls.forEach(control => {
        control.value = form[control.name] === undefined ? '' : form[control.name];
    })
}

function saveActiveTabHandler(event, result = {}) {
    if (result.error) return;
    getTabs();
}

function focusFieldByNameHandler(event, result = {}) {
    const name = result.payload;
    const field = detailsForm.elements[name];
    field && field.focus();
}

function attachLoaderHandler() {
    document.body.append(loader);
}

function detachLoaderHandler() {
    document.body.removeChild(loader);
}

function getCurrentWorkspaceHandler(event, result = {}) {
    if (!result.error) {
        const workspace = result.payload;
        const base = document.createElement('base');
        base.href = workspace + path.sep;
        document.head.append(base);
    }

    getCustomComponentsDetails();
}

function refreshContent(event, response = {}) {
    if (response.error) return;
    getTabs();
}

function closeTabHandler() {
    getTabs();
}

function subscribeOnEvents() {
    backendChanel.on('getCustomComponentsDetails', getCustomComponentsDetailsHandler);
    backendChanel.on('getCurrentForm', getCurrentFormHandler);
    backendChanel.on('saveActiveTab', saveActiveTabHandler);
    backendChanel.on('focusFieldByName', focusFieldByNameHandler);
    backendChanel.on('attachLoader', attachLoaderHandler);
    backendChanel.on('detachLoader', detachLoaderHandler);
    backendChanel.on('getCurrentWorkspace', getCurrentWorkspaceHandler);
    backendChanel.on('getTabs', getTabsHandler);
    backendChanel.on('switchTab', switchTabHandler);
    backendChanel.on('openNewForm', refreshContent);
    backendChanel.on('setActiveTab', refreshContent);
    backendChanel.on('openForm', refreshContent);
    backendChanel.on('closeTab', closeTabHandler);

    return function () {
        backendChanel.off('getCustomComponentsDetails', getCustomComponentsDetailsHandler);
        backendChanel.off('getCurrentForm', getCurrentFormHandler);
        backendChanel.off('saveActiveTab', saveActiveTabHandler);
        backendChanel.off('focusFieldByName', focusFieldByNameHandler);
        backendChanel.off('attachLoader', attachLoaderHandler);
        backendChanel.off('detachLoader', detachLoaderHandler);
        backendChanel.off('getCurrentWorkspace', getCurrentWorkspaceHandler);
        backendChanel.off('getTabs', getTabsHandler);
        backendChanel.off('switchTab', switchTabHandler);
        backendChanel.off('openNewForm', refreshContent);
        backendChanel.off('setActiveTab', refreshContent);
        backendChanel.off('openForm', refreshContent);
        backendChanel.off('closeTab', closeTabHandler);
    }
}

run();