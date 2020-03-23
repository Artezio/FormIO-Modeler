const clearNode = require('../../util/clearNode');
const BackendChanel = require('../../channels/backendChanel');
const { NEW_FORM_NAME } = require('../../constants/clientConstants');
const path = require('path');

const backendChanel = new BackendChanel();

function addNewTab() {
    backendChanel.send('openNewForm');
}

function setActiveTab(tab) {
    backendChanel.send('setActiveTab', tab);
}

function closeTab(tab) {
    backendChanel.send('closeTab', tab);
}

function createNewTabLink() {
    const newTabLink = document.createElement('a');
    newTabLink.classList.add('nav-item', 'nav-link', 'new-tab-link');
    newTabLink.textContent = '+';
    newTabLink.title = "Create new form";
    newTabLink.href = 'javascript:void(0)';
    newTabLink.onclick = addNewTab;
    return newTabLink;
}

function createCross(tab) {
    const cross = document.createElement('span');
    cross.innerHTML = '&#215;'
    cross.classList.add('close-tab-cross');
    cross.onclick = e => {
        e.stopPropagation();
        closeTab(tab)
    };
    return cross;
}

function createUnsavedMark() {
    const unsavedMark = document.createElement('span');
    unsavedMark.classList.add('unsaved-mark');
    unsavedMark.innerHTML = '&#959;';
    return unsavedMark;
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
            this.activeTab = tabLink;
        }
        const title = tab.savedFormPath ? path.basename(tab.savedFormPath + '.json') : NEW_FORM_NAME;
        tabLink.href = 'javascript:void(0)';
        if (!tab._formSaved) {
            tabLink.classList.add('unsaved');
        }
        tabLink.title = title;
        tabLink.onclick = () => {
            if (!$(tabLink).hasClass('active')) {
                setActiveTab(tab)
            }
        };
        const span = document.createElement('span');
        span.textContent = title;
        tabLink.append(span);
        const cross = createCross(tab);
        const unsavedMark = createUnsavedMark();
        tabLink.append(unsavedMark, cross);
        return tabLink;
    }

    setActiveTabUnsaved() {
        if (this.activeTab) {
            if (!this.activeTab.classList.contains('unsaved')) {
                this.activeTab.classList.add('unsaved');
            }
        }
    }

    setTabs(tabs) {
        clearNode(this.container);
        const tabLinks = tabs.map(tab => this._createTabLink(tab));
        this.container.append(...tabLinks, createNewTabLink());
    }
}

module.exports = TabBar;