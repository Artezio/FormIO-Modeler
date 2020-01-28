const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const { format } = require('url');
const isForm = require('./util/isForm');
const ElectronDialog = require('./dialog');
const fs = require('fs');
const FormProvider = require('./formProvider');
const fileNameFromPath = require('./util/fileNameFromPath');
const uuid = require('uuid/v1');

const formProvider = new FormProvider();

const PATH_TO_WORKSPACES_INFO = path.resolve(app.getAppPath(), '../recentWorkspaces.txt');
const PATH_TO_MAIN_PAGE = path.resolve(app.getAppPath(), './mainPage.html');
const PATH_TO_START_PAGE = path.resolve(app.getAppPath(), './startPage.html');
const SAVED = 'saved';
const NOT_SAVED = 'NOT_SAVED';
const MAX_RECENT_WORKSPACES = 5;
const CONFIRM_CONSTANTS = {
    YES: 'YES',
    NO: 'NO',
    CANCEL: 'CANCEL',
    DANT_SAVE: 'DANT_SAVE',
    SAVE: 'SAVE'
}

let form = {};
let savedStatus = SAVED;
const recentWorkspacePaths = [];
let currentWorkspacePath;
let mainWindow;
let electronDialog;

function setSaved() {
    savedStatus = SAVED;
}

function setUnsaved() {
    savedStatus = NOT_SAVED;
}

function formWasChangedHandler(event, form) {
    setForm(form)
    setUnsaved();
}

function setForm(newForm) {
    if (!newForm) {
        form = {
            type: 'form',
            _id: uuid()
        }
    }
    form = {
        _id: form._id ? form._id : uuid(),
        ...newForm,
        type: 'form'
    };
}

function addRecentWorkspacePath(path) {
    const existedPathIndex = recentWorkspacePaths.indexOf(path);
    if (existedPathIndex !== -1) {
        recentWorkspacePaths.splice(existedPathIndex, 1);
    }
    recentWorkspacePaths.unshift(path);
    if (recentWorkspacePaths.length > MAX_RECENT_WORKSPACES) {
        recentWorkspacePaths.pop();
    }
}

function setCurrentWorkspace(path) {
    currentWorkspacePath = path;
    addRecentWorkspacePath(path);
    formProvider.setWorkspacePath(path);
    saveRecentWorkspaces();
    setUpMenu();
    setSaved();
}

function saveRecentWorkspaces() {
    const data = JSON.stringify(recentWorkspacePaths);
    try {
        fs.writeFileSync(PATH_TO_WORKSPACES_INFO, data, { encoding: 'utf8' });
    } catch (err) {
        console.error(err);
    }
}

function prepareApp() {
    app.on('ready', () => {
        setUpMenu();
        createMainWindow();
        initDialog();
        startApplication();
    })
    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            app.quit()
        }
    })
    app.on('activate', () => {
        if (mainWindow === null) {
            createMainWindow()
        }
    });
}

function initDialog() {
    electronDialog = new ElectronDialog(dialog, mainWindow);
}

function initWorkspace() {
    try {
        if (fs.existsSync(PATH_TO_WORKSPACES_INFO)) {
            let workspacePaths = fs.readFileSync(PATH_TO_WORKSPACES_INFO, { encoding: 'utf8' });
            workspacePaths = JSON.parse(workspacePaths);
            if (!Array.isArray(workspacePaths)) {
                throw new Error('Workspaces are not valid');
            }
            recentWorkspacePaths.push(...workspacePaths);
        } else {
            throw new Error('Workspaces not found');
        }
    } catch (err) {
        console.error(err);
    }
}

function startApplication() {
    initWorkspace();
    if (!recentWorkspacePaths.length) {
        selectNewWorkspace();
    } else {
        showStartPage().then(() => {
            showRecentWorkspaces();
        })
    }
}

function selectNewWorkspace() {
    const workspacePath = electronDialog.selectDirectory('Select workspace');
    if (!workspacePath) {
        return;
    }
    setCurrentWorkspace(workspacePath);
    showMainPage();
}

function showRecentWorkspaces() {
    mainWindow.webContents.send('showRecentWorkspaces', recentWorkspacePaths);
}

function createMainWindow() {
    const unsubscribe = subscribeOnEvents();

    mainWindow = new BrowserWindow({
        height: 800,
        width: 1200,
        title: 'Formio',
        webPreferences: {
            nodeIntegration: true
        }
    }).on('closed', () => {
        mainWindow = null;
        unsubscribe();
    }).on('close', e => {
        if (savedStatus !== SAVED) {
            const answer = electronDialog.confirmCloseMainWindow();
            switch (answer) {
                case CONFIRM_CONSTANTS.CANCEL: {
                    e.preventDefault();
                    break;
                }
                case CONFIRM_CONSTANTS.SAVE: {
                    e.preventDefault();
                    saveFormAndQuit();
                    break;
                }
                case CONFIRM_CONSTANTS.DONT_SAVE: {
                    break;
                }
                default: {
                    e.preventDefault();
                }
            }
        }
    })
}

function saveFormAndQuit() {
    const savedSuccess = startFormSaving();
    if (savedSuccess) {
        mainWindow.destroy();
    }
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
function showMainPage() {
    return showPage(PATH_TO_MAIN_PAGE);
}

const menuTemplate = [
    {
        label: 'File',
        submenu: [
            {
                label: 'Create new',
                accelerator: 'CmdOrCtrl+N',
                click: createNewForm
            },
            {
                label: 'Open',
                accelerator: 'CmdOrCtrl+O',
                click: openForm
            },
            {
                label: 'Save',
                accelerator: 'CmdOrCtrl+S',
                click: startFormSaving
            },
            {
                label: 'Change workspace',
                click: reselectWorkspace
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

function reselectWorkspace() {
    if (savedStatus !== SAVED) {
        const answer = electronDialog.confirmChangeWorkspace();
        switch (answer) {
            case CONFIRM_CONSTANTS.CANCEL: {
                return;
            }
            case CONFIRM_CONSTANTS.SAVE: {
                saveFormAndChangeWorkspace();
                return;
            }
            case CONFIRM_CONSTANTS.DONT_SAVE: {
                break;
            }
            default: {
                return;
            }
        }
    }
    selectNewWorkspace();
}

function saveFormAndChangeWorkspace() {
    startFormSaving();
    if (savedStatus === SAVED) {
        selectNewWorkspace();
    }
}

function setUpMenu() {
    if (process.platform === 'darwin') {
        menuTemplate.unshift({});
    }
    if (process.env.NODE_ENV === 'production') {
        menuTemplate.pop();
    }
    ///лютый пиздец, убрать эту хуйню первым делом!
    for (let i = 0; i < 3; i++) {
        menuTemplate[0].submenu[i].enabled = Boolean(currentWorkspacePath);
    }
    ///
    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);
}

function toggleDevTools(item, focusedWindow) {
    if (focusedWindow) {
        focusedWindow.toggleDevTools()
    }
}

function startFormSaving() {
    if (savedStatus === SAVED) return true;
    if (!isForm(form)) {
        form = form || {};
        if (!form.title) {
            electronDialog.alert('Enter title to save form.');
            mainWindow.webContents.send('focusTitle');
            return false;
        }
        if (!form.name) {
            electronDialog.alert('Enter name to save form.');
            mainWindow.webContents.send('focusName');
            return false;
        }
        if (!form.path) {
            electronDialog.alert('Enter path to save form.');
            mainWindow.webContents.send('focusPath');
            return false;
        }
        return false;
    }
    return saveForm(form);
}

function getSubFormsStartHandler() {
    formProvider.getForms().then(forms => {
        mainWindow.webContents.send('getSubForms.end', forms);
    })
}

function openForm(event, arg) {
    if (savedStatus !== SAVED) {
        const answer = electronDialog.confirmOpenNewFormWithout();
        switch (answer) {
            case CONFIRM_CONSTANTS.CANCEL: {
                return;
            }
            case CONFIRM_CONSTANTS.SAVE: {
                const saved = startFormSaving();
                if (!saved) return;
                break;
            }
            case CONFIRM_CONSTANTS.DONT_SAVE: {
                break;
            }
            default: {
                return;
            }
        }
    }
    const formPath = electronDialog.selectJsonFile();
    if (!formPath) return;
    formProvider.getForm(formPath).then(form => {
        if (!isForm(form)) {
            electronDialog.alert(`${fileNameFromPath(formPath)} is not valid form`);
            return;
        }
        mainWindow.webContents.send('openForm', form);
        setForm(form);
        setSaved();
    })
}

function createNewForm() {
    if (savedStatus !== SAVED) {
        const answer = electronDialog.confirmOpenNewFormWithout();
        switch (answer) {
            case CONFIRM_CONSTANTS.CANCEL: {
                return;
            }
            case CONFIRM_CONSTANTS.SAVE: {
                const saved = startFormSaving();
                if (!saved) return;
                break;
            }
            case CONFIRM_CONSTANTS.DONT_SAVE: {
                break;
            }
            default: {
                return;
            }
        }
    }
    mainWindow.webContents.send('createNewForm');
    setForm();
    setUnsaved();
}

function setWorkspaceHandler(event, workspacePath) {
    setCurrentWorkspace(workspacePath);
    showMainPage();
}

function openNewWorkspaceHandler() {
    selectNewWorkspace();
}

function getSubFormByIdStartHandler(event, id) {
    formProvider.getForms().then(forms => {
        const form = forms.find(form => form._id === id);
        mainWindow.webContents.send('getSubFormById.end', form);
    })
}

function subscribeOnEvents() {
    ipcMain.on('getSubForms.start', getSubFormsStartHandler);
    ipcMain.on('formWasChanged', formWasChangedHandler);
    ipcMain.on('setWorkspace', setWorkspaceHandler);
    ipcMain.on('openNewWorkspace', openNewWorkspaceHandler);
    ipcMain.on('getSubFormById.start', getSubFormByIdStartHandler);

    return function () {
        ipcMain.removeListener('getSubForms.start', getSubFormsStartHandler);
        ipcMain.removeListener('formWasChanged', formWasChangedHandler);
        ipcMain.removeListener('setWorkspace', setWorkspaceHandler);
        ipcMain.removeListener('openNewWorkspace', openNewWorkspaceHandler);
        ipcMain.removeListener('getSubFormById.start', getSubFormByIdStartHandler);
    }
}

function saveForm(form) {
    const fileName = form.path + '.json';
    const fileAlreadyExist = formProvider.exists(form.path);
    if (fileAlreadyExist) {
        const canSave = electronDialog.confirmReplaceFile(fileName);
        if (canSave !== CONFIRM_CONSTANTS.YES) return false;
    }
    if (formProvider.saveForm(form)) {
        mainWindow.webContents.send('formWasSaved');
        setSaved();
        return true;
    }
    return false;
}

prepareApp();