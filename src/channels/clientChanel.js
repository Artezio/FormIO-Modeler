const { ipcMain } = require('electron');
const Chanel = require('./chanel');

class ClientChanel extends Chanel {
    constructor(mainWindow) {
        super();
        this.mainWindow = mainWindow;
    }

    on(event, handler) {
        ipcMain.on(this._toStart(event), handler);
    }

    off(event, handler) {
        ipcMain.off(this._toStart(event), handler);
    }

    send(event, data) {
        this.mainWindow.webContents.send(this._toEnd(event), { payload: data });
    }

    sendError(event, err) {
        this.mainWindow.webContents.send(this._toEnd(event), { error: err || true });
    }
}

module.exports = ClientChanel;