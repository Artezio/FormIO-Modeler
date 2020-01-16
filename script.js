const { ipcRenderer } = require('electron');
const ProcessesConnector = require('./util/processesConnector');
const uuid = require('uuid/v1');

const processesConnector = new ProcessesConnector(ipcRenderer.on.bind(ipcRenderer), ipcRenderer.once.bind(ipcRenderer), ipcRenderer.send.bind(ipcRenderer));
let formioBuilder;
const formTitle = document.getElementById('formTitle');
const formName = document.getElementById('formName');
const formPath = document.getElementById('formPath');

async function getFormHandler() {
    return {
        _id: uuid(),
        name: formName.value,
        path: formPath.value || 'newForm',
        title: formTitle.value,
        type: 'form',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        ...formioBuilder.schema,
    }
}

async function confirmFormReplaceHandler(arg = {}) {
    const { message } = arg;
    return confirm(message);
}

function prepareResponders() {
    processesConnector.respond('getForm', getFormHandler);
    processesConnector.respond('confirmFormReplace', confirmFormReplaceHandler);
    return function () {
        ipcRenderer.removeListener('getForm', getFormHandler);
        ipcRenderer.removeListener('confirmFormReplace', confirmFormReplaceHandler);
    }
}

function overrideFormioRequest() {
    forms = [{ _id: '12345', title: 'bla' }]
    const baseUrl = 'http://123';
    const regExp = new RegExp('^' + baseUrl);
    function _overrideFormioRequest(fn) {
        return async function (...args) {
            const _baseUrl = args[2];
            if (typeof _baseUrl === 'string' && regExp.test(_baseUrl)) {
                const subForms = await processesConnector.request('getSubForms');
                return subForms.map(subForm => ({
                    _id: subForm._id,
                    title: subForm.title
                }));
            }
            return fn.apply(this, args);
        }
    }
    Formio.setBaseUrl(baseUrl);
    Formio.makeRequest = _overrideFormioRequest(Formio.makeRequest);
}

overrideFormioRequest();
const unSubscribe = prepareResponders();
ipcRenderer.on('form.saved', () => {
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
})

document.addEventListener('unload', () => {
    typeof unSubscribe === 'function' && unSubscribe()
})

Formio.builder(document.getElementById('builder'), {}).then(builder => {
    formioBuilder = builder;
})
