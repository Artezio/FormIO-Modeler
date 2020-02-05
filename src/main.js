const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const { format } = require('url');
const isForm = require('../util/isForm');
const ElectronDialog = require('./dialog');
const fs = require('fs');
const FormProvider = require('./formProvider');


const formProvider = new FormProvider();

function run() {

}

function prepareApp() {
    app.on('ready', () => {
        run();
    })
    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            app.quit()
        }
    })
    app.on('activate', () => {
        run();
    });
}

function showPage(path) {
    return mainWindow.loadURL(format({
        pathname: path,
        protocol: 'file',
        slashes: true
    }))
}

function loadStartPage() {
    return showPage(PATH_TO_START_PAGE);
}
function loadMainPage() {
    return showPage(PATH_TO_MAIN_PAGE);
}