const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const { format } = require('url');
const FileSystem = require('./fileSystem');

// const fileSystem = FileSystem.getInstance();
const fileSystem = new FileSystem();

const pathToMainPage = path.resolve(__dirname, './mainPage.html');

let mainWindow;

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
        typeof usSubscribe === 'function' && usSubscribe();
    })
    const usSubscribe = prepareHandlers();
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
    showMainPage();
})

function showMainPage() {
    mainWindow.loadURL(format({
        pathname: pathToMainPage,
        protocol: 'file',
        slashes: true
    }))
}

function setUpMenu() {
    let template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'Create new',
                    accelerator: 'CmdOrCtrl+N',
                    click() {
                        createNewForm()
                    }
                },
                {
                    label: 'Open',
                    accelerator: 'CmdOrCtrl+O',
                    click() {
                        openForm()
                    }
                },
                {
                    label: 'Save',
                    accelerator: 'CmdOrCtrl+S',
                    click() {
                        startFormSaving();
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

function startFormSaving() {
    mainWindow.webContents.send('getForm.start');
}

function isForm(form) {
    if (typeof form !== 'object' || Array.isArray(form) || form === null || !form.title || !form.path) {
        return false;
    }
    return true;
}

function getSubFormsStartHandler() {
    if (!fileSystem.workspacePath) return [];
    fileSystem.readDir(fileSystem.workspacePath).then(fileNames => {
        if (!Array.isArray(fileNames)) {
            mainWindow.webContents.send('getSubForms.end', []);
            return;
        }
        Promise.all(fileNames.map(fileName => new Promise((res, rej) => {
            const path = fileSystem.workspacePath + '\\' + fileName;
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
    if (form) {
        if (!form.path) {
            dialog.showMessageBoxSync(mainWindow, {
                message: 'Enter path to save form.'
            })
            mainWindow.webContents.send('focusPath');
            return;
        }
        const fileName = form.path + '.json';
        const path = fileSystem.workspacePath + '/' + fileName;
        const fileAlreadyExist = fileSystem.checkFileExist(path);
        if (fileAlreadyExist) {
            const canSave = dialog.showMessageBoxSync(mainWindow, {
                message: `${fileName} already exists.\nDo you want to replace it?`,
                buttons: ['Yes', 'No']
            })
            if (canSave === 0) {
                saveForm(form, path);
            }
        } else {
            saveForm(form, path);
        }
    }
}

function openForm(event, arg) {
    const formPaths = dialog.showOpenDialogSync(mainWindow,
        {
            filters: [
                { name: 'formio', extensions: ['json'] },
            ],

            properties: ['openFile']
        });
    if (!formPaths) return;
    const formPath = formPaths[0];
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

function saveForm(form, path) {
    fileSystem.saveFile(JSON.stringify(form), path).then(err => {
        if (err) {
            console.error(err);
        } else {
            mainWindow.webContents.send('formWasSaved');
        }
    })
}