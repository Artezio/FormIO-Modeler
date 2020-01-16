const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const { format } = require('url');
const FileSystem = require('./fileSystem');
const ProcessesConnector = require('./util/processesConnector');


// const fileSystem = FileSystem.getInstance();
const fileSystem = new FileSystem();

const pathToMainWindow = path.resolve(__dirname, './mainWindow.html');

let mainWindow;
let processesConnector;

app.on('ready', () => {
    mainWindow = new BrowserWindow({
        height: 800,
        width: 1200,
        title: 'Formio',
        webPreferences: {
            nodeIntegration: true
        }
    }).on('closed', () => {
        app.quit();
        mainWindow = null;
        processesConnector = null;
        typeof usSubscribe === 'function' && usSubscribe();
    })
    processesConnector = new ProcessesConnector(ipcMain.on.bind(ipcMain), ipcMain.once.bind(ipcMain), mainWindow.webContents.send.bind(mainWindow.webContents));
    const usSubscribe = prepareResponders();
    setUpMenu();

    if (!fileSystem.workspacePath) {
        const workspacePath = dialog.showOpenDialogSync(mainWindow, {
            properties: ['openDirectory']
        })
        if (!workspacePath) {
            mainWindow.close();
            return;
        }
        fileSystem.setWorkingSpace(workspacePath[0]);
    }
    showMainWindow();
})

function showMainWindow() {
    mainWindow.loadURL(format({
        pathname: pathToMainWindow,
        protocol: 'file',
        slashes: true
    }))
}

function setUpMenu() {
    let template = [
        {
            label: 'Save',
            submenu: [
                {
                    label: 'Save',
                    accelerator: 'CmdOrCtrl+S',
                    click() {
                        handleSaveForm();
                    }
                }
            ]
        },
        {
            label: 'Development',
            submenu: [{
                label: 'Toggle Developer Tools',
                accelerator: 'F12',
                click: (item, focusedWindow) => {
                    if (focusedWindow) {
                        focusedWindow.toggleDevTools()
                    }
                }
            }]
        }
    ]
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

function handleSaveForm() {
    if (!processesConnector) return;
    processesConnector.request('getForm').then(form => {
        if (form && form.path) {
            const fileName = form.path + '.json';
            const path = fileSystem.workspacePath + '/' + fileName;
            const fileAlreadyExist = fileSystem.checkFileExist(path);
            if (fileAlreadyExist) {
                processesConnector.request('confirmFormReplace', {
                    message: `${fileName} already exists.\nDo you want to replace it?`
                }).then(canReplace => {
                    if (canReplace) {
                        saveForm(form, path);
                    }
                })
            } else {
                saveForm(form, path);
            }
        }
    })
}

function filterForms(form) {
    if (typeof form !== 'object' || Array.isArray(form) || form === null || !form.title || !form.path) {
        return false;
    }
    return true;
}

function prepareResponders() {
    if (!processesConnector) return;
    async function getSubFormsHandler() {
        if (!fileSystem.workspacePath) return [];
        const fileNames = await fileSystem.readDir(fileSystem.workspacePath);
        if (!Array.isArray(fileNames)) {
            return [];
        }
        const jsonData = await Promise.all(fileNames.map(fileName => new Promise((res, rej) => {
            const path = fileSystem.workspacePath + '\\' + fileName;
            fileSystem.readFile(path, (err, data) => {
                if (err) {
                    rej(err);
                } else {
                    res(JSON.parse(data))
                }
            })
        })))
        const forms = jsonData.filter(filterForms);
        return forms;
    }
    processesConnector.respond('getSubForms', getSubFormsHandler);
    return function () {
        ipcMain.removeListener('getSubForms', getSubFormsHandler);
    }
}

function saveForm(form, path) {
    fileSystem.saveFile(JSON.stringify(form), path).then(err => {
        if (err) {
            console.error(err);
        } else {
            mainWindow.webContents.send('form.saved');
        }
    })
}