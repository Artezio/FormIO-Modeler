const { app, BrowserWindow, Menu, dialog } = require('electron');
const { format } = require('url');
const ElectronDialog = require('./dialog');
const Backend = require('./backend');
const ClientChanel = require('./clientChanel');
const { BASE_TITLE, PATH_TO_START_PAGE, PATH_TO_FORM_EDITOR_PAGE } = require('./constants/backendConstants');

let clientChanel;
let electronDialog;
let backend;
let mainWindow;
let unsubscribe;

function prepareApp() {
    app.on('ready', () => {
        run();
    })
    app.on('window-all-closed', () => {
        destroy();
        if (process.platform !== 'darwin') {
            app.quit()
        }
    })
    app.on('activate', () => {
        run();
    });
}

function run() {
    createMainWindow();
    electronDialog = new ElectronDialog(dialog, mainWindow);
    clientChanel = new ClientChanel(mainWindow);
    backend = new Backend(electronDialog);
    unsubscribe = subscribe();
    showStartPage();
    setMenu();
}

function destroy() {
    unsubscribe();
    mainWindow = null;
    electronDialog = null;
    clientChanel = null;
    backend = null;
}

function createMainWindow() {
    mainWindow = new BrowserWindow({
        height: 800,
        width: 1200,
        title: BASE_TITLE,
        webPreferences: {
            nodeIntegration: true
        }
    }).on('close', e => {
        try {
            backend.saveCurrentForm();
        } catch (err) {
            e.preventDefault();
        }
    })
}

function showPage(path) {
    return mainWindow.loadURL(format({
        pathname: path,
        protocol: 'file',
        slashes: true
    }))
}

function showStartPage() {
    return showPage(PATH_TO_START_PAGE);
}

function showFormEditorPage() {
    return showPage(PATH_TO_FORM_EDITOR_PAGE);
}

function setMenu() {
    const menuTemplate = getMenuTemplate();
    if (process.platform === 'darwin') {
        menuTemplate.unshift({});
    }
    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);
}

function getMenuTemplate() {
    return [
        {
            label: 'File',
            submenu: [
                {
                    label: 'Create new',
                    accelerator: 'CmdOrCtrl+N',
                    click: openNewFormHandler,
                    enabled: Boolean(this.backend.getCurrentWorkspace())
                },
                {
                    label: 'Open',
                    accelerator: 'CmdOrCtrl+O',
                    click: openFormHandler,
                    enabled: Boolean(this.backend.getCurrentWorkspace())
                },
                {
                    label: 'Save',
                    accelerator: 'CmdOrCtrl+S',
                    click: saveCurrentFormHandler,
                    enabled: Boolean(this.backend.getCurrentWorkspace())
                },
                {
                    label: 'Change workspace',
                    click: changeCurrentWorkspaceHandler
                }
            ]
        },
        {
            label: 'Components',
            submenu: [
                {
                    label: 'Register Custom Component',
                    click: registerCustomComponentHandler
                }
            ]
        },
        {
            label: 'Development',
            submenu: [{
                label: 'Toggle Developer Tools',
                accelerator: 'F12',
                click: toggleDevTools
            }]
        }
    ]
}

function toggleDevTools(item, focusedWindow) {
    if (focusedWindow) {
        focusedWindow.toggleDevTools()
    }
}

function registerCustomComponentHandler() {

}

function changeCurrentWorkspaceHandler() {
    try {
        backend.changeCurrentWorkspace();
        showStartPage();
    } catch (err) {
        console.error(err);
    }
}

function saveCurrentFormHandler() {
    try {
        backend.saveCurrentForm();
        clientChanel.send('saveCurrentForm');
    } catch (err) {
        clientChanel.sendError('saveCurrentForm', err);
    }
}

function openFormHandler() {
    try {
        backend.openForm();
        showFormEditorPage();
    } catch (err) {
        console.error(err);
    }
}

function openNewFormHandler() {
    try {
        backend.openNewForm();
        showFormEditorPage();
    } catch (err) {
        console.error(err);
    }
}

function getRecentWorkspacesHandler() {
    try {
        const recentWorkspaces = backend.getRecentWorkspaces();
        clientChanel.send('getRecentWorkspaces', recentWorkspaces);
    } catch (err) {
        clientChanel.sendError('getRecentWorkspaces', recentWorkspaces);
    }
}

function setCurrentWorkspaceHandler(event, result = {}) {
    const workspace = result.payload;
    try {
        backend.setCurrentWorkspace(workspace);
        clientChanel.send('setCurrentWorkspace');
    } catch (err) {
        clientChanel.sendError('setCurrentWorkspace', err);
    }
}

function setCurrentFormHandler(event, result = {}) {
    const form = result.payload;
    try {
        backend.setCurrentForm(form);
        showFormEditorPage();
    } catch (err) {
        clientChanel.sendError('setCurrentForm', err);
    }
}

function getCurrentWorkspaceHandler(event, result = {}) {
    try {
        const currentWorkspace = backend.getCurrentWorkspace();
        clientChanel.send('getCurrentWorkspace', currentWorkspace);
    } catch (err) {
        clientChanel.sendError('getCurrentWorkspace', err);
    }
}

function getCurrentFormHandler() {
    try {
        const currentForm = backend.getCurrentForm();
        clientChanel.send('getCurrentForm', currentForm);
    } catch (err) {
        clientChanel.sendError('getCurrentForm', err);
    }
}

function getFormsHandler() {
    try {
        const forms = backend.getForms();
        clientChanel.send('getForms', forms);
    } catch (err) {
        clientChanel.sendError('getForms', err);
    }
}

function getCustomComponentsDetailsHandler() {
    try {
        const details = backend.getCustomComponentsDetails();
        clientChanel.send('getCustomComponentsDetails', details);
    } catch (err) {
        clientChanel.sendError('getCustomComponentsDetails', err);
    }
}

function adjustFormHandler(event, result = {}) {
    const changes = result.payload;
    try {
        backend.adjustForm(changes);
    } catch (err) {
        console.error(err);
    }
}

function subscribe() {
    clientChanel.on('getRecentWorkspaces', getRecentWorkspacesHandler);
    clientChanel.on('setCurrentWorkspace', setCurrentWorkspaceHandler);
    clientChanel.on('setCurrentForm', setCurrentFormHandler);
    clientChanel.on('getCurrentWorkspace', getCurrentWorkspaceHandler);
    clientChanel.on('changeCurrentWorkspace', changeCurrentWorkspaceHandler);
    clientChanel.on('getCurrentForm', getCurrentFormHandler);
    clientChanel.on('getForms', getFormsHandler);
    clientChanel.on('getCustomComponentsDetails', getCustomComponentsDetailsHandler);
    clientChanel.on('openNewForm', openNewFormHandler);
    clientChanel.on('adjustForm', adjustFormHandler);

    return function () {
        clientChanel.off('getRecentWorkspaces', getRecentWorkspacesHandler);
        clientChanel.off('setCurrentWorkspace', setCurrentWorkspaceHandler);
        clientChanel.off('setCurrentForm', setCurrentFormHandler);
        clientChanel.off('getCurrentWorkspace', getCurrentWorkspaceHandler);
        clientChanel.off('changeCurrentWorkspace', changeCurrentWorkspaceHandler);
        clientChanel.off('getCurrentForm', getCurrentFormHandler);
        clientChanel.off('getForms', getFormsHandler);
        clientChanel.off('getCustomComponentsDetails', getCustomComponentsDetailsHandler);
        clientChanel.off('openNewForm', openNewFormHandler);
        clientChanel.off('adjustForm', adjustFormHandler);
    }
}

prepareApp();