const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const { format } = require('url');
const FileSystem = require('./fileSystem');
const isForm = require('./util/isForm');
const ElectronDialog = require('./dialog');
const fs = require('fs');
const FormProvider = require('./formProvider');

// const fileSystem = FileSystem.getInstance();
const fileSystem = new FileSystem();
const formProvider = new FormProvider();

const PATH_TO_WORKSPACES_INFO = path.resolve(__dirname, './data/recentWorkspaces.txt');
const PATH_TO_MAIN_PAGE = path.resolve(__dirname, './mainPage.html');
const PATH_TO_START_PAGE = path.resolve(__dirname, './startPage.html');
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

let form;
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
    form = newForm;
}

function addRecentWorkspacePath(path) {
    recentWorkspacePaths.unshift(path);
    if (recentWorkspacePaths.length > MAX_RECENT_WORKSPACES) {
        recentWorkspacePaths.pop();
    }
}

function setCurrentWorkspace(path) {
    currentWorkspacePath = path;
    addRecentWorkspacePath(path);
    formProvider.setWorkspacePath(path);
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
    electronDialog = new ElectronDialog(dialog, mainWindow, CONFIRM_CONSTANTS);
}

function initWorkspace() {
    try {
        let workspacePaths = fs.readFileSync(PATH_TO_WORKSPACES_INFO, { encoding: 'utf8' });
        workspacePaths = JSON.parse(workspacePaths);
        if (Array.isArray(workspacePaths)) {
            throw new Error();
        }
        recentWorkspacePaths.push(...workspacePaths);
    } catch (err) {
        console.error(err);
    }
}

function startApplication() {
    initWorkspace();
    if (!recentWorkspacePaths.length) {
        const workspacePath = electronDialog.selectDirectory('Select workspace');
        if (!workspacePath) {
            mainWindow.close();
            return;
        }
        setCurrentWorkspace(workspacePath);
        showMainPage();
    } else {
        showStartPage();
    }
}

function createMainWindow() {
    const unsubscribe = prepareHandlers();

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
    startFormSaving();
    mainWindow.destroy();
}

function showPage(path) {
    mainWindow.loadURL(format({
        pathname: path,
        protocol: 'file',
        slashes: true
    }))
}

function showStartPage() {
    showPage(PATH_TO_START_PAGE);
}
function showMainPage() {
    showPage(PATH_TO_MAIN_PAGE);
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

function setUpMenu() {
    if (process.platform === 'darwin') {
        menuTemplate.unshift({});
    }
    if (process.env.NODE_ENV === 'production') {
        menuTemplate.pop();
    }
    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);
}

function toggleDevTools(item, focusedWindow) {
    if (focusedWindow) {
        focusedWindow.toggleDevTools()
    }
}

function startFormSaving() {
    // mainWindow.webContents.send('getForm.start');
    if (!isForm(form)) {
        form = form || {};
        if (!form.title) {
            electronDialog.alert('Enter title to save form.');
            mainWindow.webContents.send('focusTitle');
            return;
        }
        if (!form.path) {
            electronDialog.alert('Enter path to save form.');
            mainWindow.webContents.send('focusPath');
            return;
        }
        return;
    }
    saveForm(form);
}

// function getSubFormsStartHandler() {
//     if (!fileSystem.currentWorkspacePath) return [];
//     fileSystem.readDir(fileSystem.currentWorkspacePath).then(fileNames => {
//         if (!Array.isArray(fileNames)) {
//             mainWindow.webContents.send('getSubForms.end', []);
//             return;
//         }
//         Promise.all(fileNames.map(fileName => new Promise((res, rej) => {
//             const path = fileSystem.currentWorkspacePath + '\\' + fileName;
//             fileSystem.readFile(path, (err, data) => {
//                 if (err) {
//                     rej(err);
//                 } else {
//                     res(JSON.parse(data))
//                 }
//             })
//         })))
//             .then(forms => forms.filter(isForm))
//             .then(forms => {
//                 mainWindow.webContents.send('getSubForms.end', forms);
//             })
//     })
// }

function getSubFormsStartHandler() {
    formProvider.getForms().then(forms => {
        mainWindow.webContents.send('getSubForms.end', forms);
    })
}

// function getFormEndHandler(event, form) {
//     if (!isForm(form)) {
//         form = form || {};
//         if (!form.title) {
//             electronDialog.alert('Enter title to save form.');
//             mainWindow.webContents.send('focusTitle');
//             return;
//         }
//         if (!form.path) {
//             electronDialog.alert('Enter path to save form.');
//             mainWindow.webContents.send('focusPath');
//             return;
//         }
//         return;
//     }
//     saveForm(form);
// }

function openForm(event, arg) {
    const formPath = electronDialog.selectJsonFile();
    if (!formPath) return;
    // const form = JSON.parse(fileSystem.readFileSync(formPath));
    formProvider.getForm(formPath).then(form => {
        if (!isForm(form)) {
            electronDialog.alert('Not valid form');//change message!
            return;
        }
        mainWindow.webContents.send('openForm', form);
        setForm(form);
        setSaved();
    })
}

function createNewForm() {
    mainWindow.webContents.send('createNewForm');
}

function prepareHandlers() {
    // ipcMain.on('getForm.end', getFormEndHandler);
    ipcMain.on('getSubForms.start', getSubFormsStartHandler);
    ipcMain.on('formWasChanged', formWasChangedHandler);

    return function () {
        // ipcMain.removeListener('getForm.end', getFormEndHandler);
        ipcMain.removeListener('getSubForms.start', getSubFormsStartHandler);
        ipcMain.removeListener('formWasChanged', formWasChangedHandler);
    }
}

function saveForm(form) {
    const fileName = form.path + '.json';
    // const path = currentWorkspacePath + '/' + fileName;
    // const fileAlreadyExist = fileSystem.checkFileExist(path);
    const fileAlreadyExist = formProvider.exists(form.path);
    if (fileAlreadyExist) {
        const canSave = electronDialog.confirmReplaceFile(fileName);
        if (canSave !== CONFIRM_CONSTANTS.YES) return;
    }
    if (formProvider.saveForm(form)) {
        mainWindow.webContents.send('formWasSaved');
        setSaved();
    }
}

prepareApp();