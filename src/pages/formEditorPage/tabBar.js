const clearNode = require('../../util/clearNode');

class TabBar {
    constructor(container) {
        this.container = container;
        this._newTab = { title: '+' };
        this.tabs = [this._newTab];
    }

    _createTabLink(title, isActive, tabCreator) {
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
        clearNode(this.container);
        const tabLinks = tabs.map(tab => this._createTabLink(tab));
        this.container.append(...tabLinks, );
    }
}

module.exports = TabBar;