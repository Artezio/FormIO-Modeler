const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const { format } = require('url');
const FileSystem = require('./fileSystem');


// const fileSystem = FileSystem.getInstance();
const fileSystem = new FileSystem();

const pathToMainWindow = path.resolve(__dirname, './mainWindow.html');

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
    })

    setUpMenu();

    if (!fileSystem.workspacePath) {
        const workspacePath = dialog.showOpenDialogSync(mainWindow, {
            properties: ['openDirectory']
        })
        if (!workspacePath) {
            mainWindow.close();
            return;
        }
        fileSystem.setWorkingSpace(workspacePath);
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
                        saveFormAttempt();
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

function saveFormAttempt() {
    mainWindow.webContents.send('form.get.start');
    ipcMain.once('form.get.end', (event, form) => {
        form = JSON.parse(form);
        if (form && form.path) {
            const fileName = form.path + '.json';
            const path = fileSystem.workspacePath + '/' + fileName;
            const fileAlreadyExist = fileSystem.checkFileExist(path);
            if (fileAlreadyExist) {
                mainWindow.webContents.send('confirm.start', {
                    message: `${fileName} already exists.\nDo you want to replace it?`
                })
                ipcMain.once('confirm.end', (event, canSave) => {
                    if (canSave) {
                        saveForm(form, path);
                    }
                })
            } else {
                saveForm(form, path);
            }
        }
    });
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