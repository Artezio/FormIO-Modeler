const { ipcRenderer } = require('electron');
const Chanel = require('./chanel');

class BackendChanel extends Chanel {

    on(event, handler) {
        ipcRenderer.on(this._toEnd(event), handler);
    }

    once(event, handler) {
        ipcRenderer.once(this._toEnd(event), handler);
    }

    off(event, handler) {
        ipcRenderer.off(this._toEnd(event), handler);
    }

    send(event, data) {
        ipcRenderer.send(this._toStart(event), { payload: data });
    }
}

module.exports = BackendChanel;