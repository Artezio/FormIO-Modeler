const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const { format } = require('url');
const FileSystem = require('./fileSystem');
const isForm = require('./util/isForm');
const ElectronDialog = require('./dialog');

// const fileSystem = FileSystem.getInstance();
const fileSystem = new FileSystem();

const pathToMainPage = path.resolve(__dirname, './mainPage.html');
const pathToStartPage = path.resolve(__dirname, './startPage.html');

let mainWindow;
let electronDialog;
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

function startApplication() {
    if (!fileSystem.recentWorkspacePaths.length) {
        const workspacePaths = electronDialog.selectDirectory('Select workspace');
        if (!workspacePaths) {
            mainWindow.close();
            return;
        }
        fileSystem.setCurrentWorkspace(workspacePaths[0]);
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
    })
}

function showPage(path) {
    mainWindow.loadURL(format({
        pathname: path,
        protocol: 'file',
        slashes: true
    }))
}

function showStartPage() {
    showPage(pathToStartPage);
}
function showMainPage() {
    showPage(pathToMainPage);
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
    mainWindow.webContents.send('getForm.start');
}

function getSubFormsStartHandler() {
    if (!fileSystem.currentWorkspacePath) return [];
    fileSystem.readDir(fileSystem.currentWorkspacePath).then(fileNames => {
        if (!Array.isArray(fileNames)) {
            mainWindow.webContents.send('getSubForms.end', []);
            return;
        }
        Promise.all(fileNames.map(fileName => new Promise((res, rej) => {
            const path = fileSystem.currentWorkspacePath + '\\' + fileName;
            fileSystem.readFile(path, (err, data) => {
                if (err) {
                    rej(err);
                } else {
                    res(JSON.parse(data))
                }
            })
        })))
            .then(forms => forms.filter(isForm))
            .then(forms => {
                mainWindow.webContents.send('getSubForms.end', forms);
            })
    })
}

function getFormEndHandler(event, form) {
    if (!isForm(form)) {
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
        saveForm(form);
    }
}

function openForm(event, arg) {
    const formPath = electronDialog.selectJsonFile();
    if (!formPath) return;
    try {
        const form = JSON.parse(fileSystem.readFileSync(formPath));
        if (!isForm(form)) {
            mainWindow.webContents.send('openForm', {});
            return;
        }
        mainWindow.webContents.send('openForm', form);
    } catch (err) {
        console.error(err);
    }
}

function createNewForm() {
    mainWindow.webContents.send('createNewForm');
}

function prepareHandlers() {
    ipcMain.on('getForm.end', getFormEndHandler);

    ipcMain.on('getSubForms.start', getSubFormsStartHandler);

    ipcMain.on('showMainPage', openForm);

    return function () {
        ipcMain.removeListener('getForm.end', getFormEndHandler);
        ipcMain.removeListener('getSubForms.start', getSubFormsStartHandler);
        ipcMain.removeListener('showMainPage', openForm);
    }
}

function saveForm(form) {
    const fileName = form.path + '.json';
    const path = fileSystem.currentWorkspacePath + '/' + fileName;
    const fileAlreadyExist = fileSystem.checkFileExist(path);
    if (fileAlreadyExist) {
        const canSave = electronDialog.confirm(`${fileName} already exists.\nDo you want to replace it?`);
        if (!canSave) return;
    }
    fileSystem.saveFile(JSON.stringify(form), path).then(err => {
        if (err) {
            console.error(err);
        } else {
            mainWindow.webContents.send('formWasSaved');
        }
    })
}

prepareApp();