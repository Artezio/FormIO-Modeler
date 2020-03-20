const clearNode = require('../../util/clearNode');
const BackendChanel = require('../../channels/backendChanel');
const { NEW_FORM_NAME } = require('../../constants/clientConstants');
const path = require('path');

const backendChanel = new BackendChanel();

const newTabLink = document.createElement('a');
newTabLink.classList.add('nav-item', 'nav-link', 'new-tab-link');
newTabLink.textContent = '+';
newTabLink.title = "Create new form";
newTabLink.href = 'javascript:void(0)';
newTabLink.onclick = addNewTab;

function addNewTab() {
    backendChanel.send('openNewForm');
}

function setActiveTab(tab) {
    backendChanel.send('setActiveTab', tab);
}

function closeTab(tab) {
    backendChanel.send('closeTab', tab);
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
        const title = tab.savedFormPath ? path.basename(tab.savedFormPath + '.json') : NEW_FORM_NAME;
        tabLink.href = 'javascript:void(0)';
        tabLink.textContent = title;
        tabLink.title = title;
        tabLink.onclick = () => {
            if (!$(tabLink).hasClass('active')) {
                setActiveTab(tab)
            }
        };
        const cross = document.createElement('span');
        cross.innerHTML = '&#215;'
        cross.classList.add('ml-2', 'close-tab-cross');
        cross.onclick = e => {
            e.stopPropagation();
            closeTab(tab)
        };
        tabLink.append(cross);
        return tabLink;
    }

    setTabs(tabs) {
        clearNode(this.container);
        const tabLinks = tabs.map(tab => this._createTabLink(tab));
        this.container.append(...tabLinks, newTabLink);
    }
}

module.exports = TabBar;