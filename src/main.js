const { app, BrowserWindow, Menu, dialog } = require('electron');
const contextMenu = require('electron-context-menu');
const { format } = require('url');
const ElectronDialog = require('./dialog');
const Backend = require('./backend');
const ClientChanel = require('./channels/clientChanel');
const { BASE_TITLE, PATH_TO_START_PAGE, PATH_TO_FORM_EDITOR_PAGE } = require('./constants/backendConstants');

let clientChanel;
let electronDialog;
let backend = new Backend();
let mainWindow;
let unsubscribe;

let formBuilderPageOpened = false;

contextMenu({
    shouldShowMenu: (e, params) => params.isEditable,
    showLookUpSelection: false,
    showSearchWithGoogle: false,
    showInspectElement: false,
    prepend: () => []
});

function prepareApp() {
    app.name = 'FormIO Modeler';
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
        if (BrowserWindow.getAllWindows().length === 0) {
            run();
        }
    });
}

function run() {
    createMainWindow();
    electronDialog = new ElectronDialog(dialog, mainWindow);
    clientChanel = new ClientChanel(mainWindow);
    backend = new Backend(electronDialog, clientChanel);
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
            backend.saveState();
            backend.closeApp();
        } catch (err) {
            e.preventDefault();
        }
    });
}

function showPage(path) {
    return mainWindow.loadURL(format({
        pathname: path,
        protocol: 'file',
        slashes: true
    }))
}

function showStartPage() {
    clientChanel.send('attachLoader');
    formBuilderPageOpened = false;
    return showPage(PATH_TO_START_PAGE);
}

function showFormEditorPage() {
    clientChanel.send('attachLoader');
    formBuilderPageOpened = true;
    return showPage(PATH_TO_FORM_EDITOR_PAGE);
}

function setMenu() {
    const menuTemplate = getMenuTemplate();
    if (process.platform === 'darwin') {
        menuTemplate.unshift({
            label: app.name,
            submenu: [
                { role: 'about' },
                { type: 'separator' },
                { role: 'services' },
                { type: 'separator' },
                { role: 'hide' },
                { role: 'hideothers' },
                { role: 'unhide' },
                { type: 'separator' },
                { role: 'quit' }
            ]
        });
    }
    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);
}

function getMenuTemplate() {
    const isMac = process.platform === 'darwin'
    return [
        {
            label: 'File',
            submenu: [
                {
                    label: 'Create new form',
                    accelerator: 'CmdOrCtrl+N',
                    click: openNewFormHandler,
                    enabled: Boolean(backend && backend.getCurrentWorkspace())
                },
                {
                    label: 'Open form',
                    accelerator: 'CmdOrCtrl+O',
                    click: openFormHandler,
                    enabled: Boolean(backend && backend.getCurrentWorkspace())
                },
                {
                    label: 'Save',
                    accelerator: 'CmdOrCtrl+S',
                    click: saveActiveTabHandler,
                    enabled: Boolean(backend && backend.getCurrentWorkspace())
                },
                {
                    label: 'Change workspace',
                    click: changeCurrentWorkspaceHandler
                }
            ]
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                ...(isMac ? [
                    { role: 'selectAll' },
                    { type: 'separator' },
                    {
                        label: 'Speech',
                        submenu: [
                            { role: 'startspeaking' },
                            { role: 'stopspeaking' }
                        ]
                    }
                ] : [
                        { type: 'separator' },
                        { role: 'selectAll' }
                    ])
            ]
        },
        {
            label: 'Components',
            submenu: [
                {
                    label: 'Register custom component',
                    click: registerCustomComponentsHandler,
                    enabled: Boolean(backend && backend.getCurrentWorkspace())
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

function setAppTitle(currentWorkspace) {
    if (currentWorkspace) {
        mainWindow.setTitle(`${BASE_TITLE} - [${currentWorkspace}]`);
    } else {
        mainWindow.setTitle(BASE_TITLE);
    }
}

function setCurrentWorkspace() {
    const currentWorkspace = backend.getCurrentWorkspace();
    setMenu();
    setAppTitle(currentWorkspace);
    showFormEditorPage();
}

function registerCustomComponentsHandler() {
    try {
        backend.registerCustomComponents();
        if (formBuilderPageOpened) {
            showFormEditorPage();
        }
    } catch (err) {
        clientChanel.sendError('registerCustomComponents', err);
    }
}

function changeCurrentWorkspaceHandler() {
    try {
        backend.changeCurrentWorkspace();
        setCurrentWorkspace();
    } catch (err) {
        clientChanel.sendError('changeCurrentWorkspace', err);
        console.error(err);
    }
}

function setCurrentWorkspaceHandler(event, result = {}) {
    const workspace = result.payload;
    try {
        backend.setCurrentWorkspace(workspace);
        setCurrentWorkspace();
    } catch (err) {
        clientChanel.sendError('setCurrentWorkspace', err);
    }
}

function saveActiveTabHandler() {
    try {
        backend.saveActiveTab();
    } catch (err) {
        console.error(err);
    }
}

function openFormHandler(event, response) {
    const form = response.payload;
    try {
        backend.openForm(form);
        clientChanel.send('openForm');
    } catch (err) {
        clientChanel.sendError('openForm');
        console.info(err);
    }
}

function openNewFormHandler() {
    try {
        backend.openNewForm();
        clientChanel.send('openNewForm');
    } catch (err) {
        clientChanel.sendError('openNewForm');
        console.info(err);
    }
}

function openFirstFormHandler(event, response) {
    if (response.error) return;
    const form = response.payload;
    try {
        backend.openFirstForm(form);
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
        backend.adjustCurrentForm(changes);
    } catch (err) {
        console.error(err);
    }
}

function getFormByIdHandler(event, result = {}) {
    const id = result.payload;
    try {
        const form = backend.getFormById(id);
        clientChanel.send('getFormById', form);
    } catch (err) {
        clientChanel.sendError('getFormById', err);
    }
}

function getTabsHandler() {
    try {
        const tabs = backend.getTabs();
        clientChanel.send('getTabs', tabs);
    } catch (err) {
        clientChanel.sendError('getTabs');
    }
}

function setActiveTabHandler(event, response) {
    let tab = response.payload;
    tab = backend.appState.tabs.find(t => t.id === tab.id);
    try {
        if (!tab) throw new Error('Backend and Client tabs don\'t match!');
        backend.setActiveTab(tab);
        clientChanel.send('setActiveTab');
    } catch (err) {
        clientChanel.sendError('setActiveTab');
    }
}

function closeTabHandler(event, response) {
    let tab = response.payload;
    tab = backend.appState.tabs.find(t => t.id === tab.id);
    try {
        if (!tab) throw new Error('Backend and Client tabs don\'t match!');
        backend.closeTab(tab);
        clientChanel.send('closeTab');
    } catch (err) {
        clientChanel.sendError('closeTab', err);
    }
}

function subscribe() {
    clientChanel.on('getRecentWorkspaces', getRecentWorkspacesHandler);
    clientChanel.on('setCurrentWorkspace', setCurrentWorkspaceHandler);
    clientChanel.on('getCurrentWorkspace', getCurrentWorkspaceHandler);
    clientChanel.on('changeCurrentWorkspace', changeCurrentWorkspaceHandler);
    clientChanel.on('getCurrentForm', getCurrentFormHandler);
    clientChanel.on('getForms', getFormsHandler);
    clientChanel.on('getCustomComponentsDetails', getCustomComponentsDetailsHandler);
    clientChanel.on('adjustForm', adjustFormHandler);
    clientChanel.on('getFormById', getFormByIdHandler);
    clientChanel.on('registerCustomComponents', registerCustomComponentsHandler);
    clientChanel.on('openNewForm', openNewFormHandler);
    clientChanel.on('openForm', openFormHandler);
    clientChanel.on('saveActiveTab', saveActiveTabHandler);
    clientChanel.on('getTabs', getTabsHandler);
    clientChanel.on('openFirstForm', openFirstFormHandler);
    clientChanel.on('setActiveTab', setActiveTabHandler);
    clientChanel.on('closeTab', closeTabHandler);

    return function () {
        clientChanel.off('getRecentWorkspaces', getRecentWorkspacesHandler);
        clientChanel.off('setCurrentWorkspace', setCurrentWorkspaceHandler);
        clientChanel.off('getCurrentWorkspace', getCurrentWorkspaceHandler);
        clientChanel.off('changeCurrentWorkspace', changeCurrentWorkspaceHandler);
        clientChanel.off('getCurrentForm', getCurrentFormHandler);
        clientChanel.off('getForms', getFormsHandler);
        clientChanel.off('getCustomComponentsDetails', getCustomComponentsDetailsHandler);
        clientChanel.off('adjustForm', adjustFormHandler);
        clientChanel.off('getFormById', getFormByIdHandler);
        clientChanel.off('registerCustomComponents', registerCustomComponentsHandler);
        clientChanel.off('openNewForm', openNewFormHandler);
        clientChanel.on('openForm', openFormHandler);
        clientChanel.off('saveActiveTab', saveActiveTabHandler);
        clientChanel.off('getTabs', getTabsHandler);
        clientChanel.off('openFirstForm', openFirstFormHandler);
        clientChanel.on('setActiveTab', setActiveTabHandler);
        clientChanel.off('closeTab', closeTabHandler);
    }
}

prepareApp();