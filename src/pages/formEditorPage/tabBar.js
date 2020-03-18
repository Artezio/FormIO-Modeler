const clearNode = require('../../util/clearNode');
const BackendChanel = require('../../channels/backendChanel');

const backendChanel = new BackendChanel();

const newTabLink = document.createElement('a');
newTabLink.classList.add('nav-item', 'nav-link');
newTabLink.textContent = '+';
newTabLink.onclick = addNewTab;

function addNewTab() {
    backendChanel.send('openNewForm');
}

function setActiveTab(tab) {
    backendChanel.send('setActiveTab', tab);
}

class TabBar {
    constructor(container) {
        this.container = container;
        this._newTab = { title: '+' };
        this.tabs = [this._newTab];
    }

    _createTabLink(tab = {}) {
        const { form, isActive } = tab;
        const tabLink = document.createElement('a');
        tabLink.classList.add('nav-item', 'nav-link');
        if (isActive) {
            tabLink.classList.add('active');
        }
        const title = form.path ? form.path + '.json' : 'untitled';
        tabLink.textContent = title;
        tabLink.onclick = () => setActiveTab(tab);
        return tabLink;
    }

    setTabs(tabs) {
        clearNode(this.container);
        const tabLinks = tabs.map(tab => this._createTabLink(tab));
        this.container.append(...tabLinks, newTabLink);
    }
}

module.exports = TabBar;