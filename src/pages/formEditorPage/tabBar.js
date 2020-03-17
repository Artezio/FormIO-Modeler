const uuid = require('uuid');

class TabBar {
    constructor(container) {
        this.container = container;
        this._newTab = { title: '+' };
        this.tabs = [this._newTab];
    }

    _createTabLink(tab = {}, isNewTab) {
        const { title, isActive } = tab;
        const tabLink = document.createElement('a');
        tabLink.classList.add('nav-item', 'nav-link');
        if (isActive) {
            tabLink.classList.add('active');
        }
        tabLink.textContent = title;
    }

    addTabLink(tab) {

    }

    setTabs(tabs) {

    }
}

module.exports = TabBar;