class ProcessesConnector {
    constructor(on, once, send) {
        this._on = on;
        this._once = once;
        this._send = send;
    }

    _toStart(eventName) {
        return eventName + '.start';
    }

    _toEnd(eventName) {
        return eventName + '.end';
    }

    async request(eventName, arg) {
        this._send(this._toStart(eventName), arg);
        const promise = new Promise((resolve, reject) => {
            this._once(this._toEnd(eventName), (event, arg) => {
                resolve(arg);
            })
        })
        const response = await promise;
        return response;
    }

    respond(eventName, asyncCallback) {
        this._on(this._toStart(eventName), async (event, arg) => {
            const response = await asyncCallback(arg);
            this._send(this._toEnd(eventName), response)
        })
    }
}

module.exports = ProcessesConnector;