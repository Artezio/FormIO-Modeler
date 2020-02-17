const JSONViewer = require('../../../libs/json-viewer');
const { NO_DATA_SUBMITTED } = require('../../constants/clientConstants');
const clearNode = require('../../util/clearNode');

const jsonViewer = new JSONViewer();

class JsonViewerFacade {
    constructor(container) {
        this.container = container;
    }

    show(json) {
        clearNode(this.container);
        this.container.append(jsonViewer.getContainer());
        jsonViewer.showJSON(json);
    }

    hide() {
        clearNode(this.container);
        const p = document.createElement('p');
        p.textContent = NO_DATA_SUBMITTED;
        this.container.append(p);
    }
}

module.exports = JsonViewerFacade;