const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
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
            backend.closeCurrentForm();
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
                    click: openNewFormHandler
                },
                {
                    label: 'Open',
                    accelerator: 'CmdOrCtrl+O',
                    click: openFormHandler
                },
                {
                    label: 'Save',
                    accelerator: 'CmdOrCtrl+S',
                    click: saveCurrentFormHandler
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

function toggleDevTools() {

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

}

function openFormHandler() {

}

function openNewFormHandler() {

}

function getRecentWorkspacesHandler() {
    try {
        const recentWorkspaces = backend.getRecentWorkspaces();
        clientChanel.send('getRecentWorkspaces', recentWorkspaces);
    } catch (err) {
        clientChanel.sendError('getRecentWorkspaces', recentWorkspaces);
    }
}

function setCurrentWorkspaceHandler(event, result) {
    const workspace = result.payload;
    try {
        backend.setCurrentWorkspace(workspace);
        clientChanel.send('setCurrentWorkspace');
        showStartPage();
    } catch (err) {
        clientChanel.sendError('setCurrentWorkspace', err);
    }
}

function setCurrentFormHandler(event, result) {
    const form = result.payload;
    try {
        backend.setCurrentForm(form);
        showFormEditorPage();
    } catch (err) {
        clientChanel.sendError('setCurrentForm', err);
    }
}

function subscribe() {
    clientChanel.on('getRecentWorkspaces', getRecentWorkspacesHandler);
    clientChanel.on('setCurrentWorkspace', setCurrentWorkspaceHandler);
    clientChanel.on('setCurrentForm', setCurrentFormHandler);

    return function () {
        clientChanel.off('getRecentWorkspaces', getRecentWorkspacesHandler);
        clientChanel.off('setCurrentWorkspace', setCurrentWorkspaceHandler);
        clientChanel.off('setCurrentForm', setCurrentFormHandler);
    }
}

prepareApp();