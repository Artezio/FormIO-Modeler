const { ipcMain } = require('electron');

class ClientChanel {
    constructor(mainWindow) {
        this.mainWindow = mainWindow;
    }

    _toStart(event) {
        return event + '.start';
    }

    _toEnd(event) {
        return event + '.end';
    }

    on(event, handler) {
        ipcMain.on(this._toStart(event), handler);
    }

    off(event, handler) {
        ipcMain.removeListener(this._toStart(event), handler);
    }

    send(event, data) {
        this.mainWindow.webContents.send(this._toEnd(event), { payload: data });
    }

    sendError(event, err) {
        this.mainWindow.webContents.send(this._toEnd(event), { error: err || true });
    }
}

module.exports = ClientChanel;