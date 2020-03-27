const clearNode = require('../../util/clearNode');
const BackendChanel = require('../../channels/backendChanel');
const { NEW_FORM_NAME } = require('../../constants/clientConstants');
const path = require('path');

const backendChanel = new BackendChanel();
const tabLinksContainer = document.getElementById('tab-links');
const leftScroll = document.getElementById('left-scroll');
const rightScroll = document.getElementById('right-scroll');

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
        this.scrollDelay = 500;
        this.scrollSpeed = 100;
        this._initDomEventHandlers();
    }

    scrollToLeft(x) {
        this.container.scrollLeft -= x;
    }

    scrollToRight(x) {
        this.container.scrollLeft += x;
    }

    _initDomEventHandlers() {
        window.onresize = this.handleResize.bind(this);
        let leftScrollIntervalId;
        let leftScrollTimeoutId;
        let rightScrollIntervalId;
        let rightScrollTimeoutId;
        rightScroll.onmousedown = () => {
            this.scrollToRight(10);
            rightScrollTimeoutId = setTimeout(() => {
                rightScrollIntervalId = setInterval(() => this.scrollToRight(10), this.scrollSpeed);
            }, this.scrollDelay);
        }
        rightScroll.onmouseup = () => {
            clearTimeout(rightScrollTimeoutId);
            clearInterval(rightScrollIntervalId);
        }
        leftScroll.onmousedown = () => {
            this.scrollToLeft(10);
            leftScrollTimeoutId = setTimeout(() => {
                leftScrollIntervalId = setInterval(() => this.scrollToLeft(10), this.scrollSpeed);
            }, this.scrollDelay);
        }
        leftScroll.onmouseup = () => {
            clearTimeout(leftScrollTimeoutId);
            clearInterval(leftScrollIntervalId);
        }
        this.container.onwheel = e => {
            if (e.deltaY > 0) {
                this.scrollToRight(50);
            } else {
                this.scrollToLeft(50);
            }
        }
    }

    _createTabLink(tab = {}) {
        const { form, isActive } = tab;
        const tabLink = document.createElement('a');
        tabLink.classList.add('nav-item', 'nav-link');
        if (isActive) {
            tabLink.classList.add('active');
            this.activeTab = tabLink;
        }
        const title = tab.savedFormPath ? path.basename(tab.savedFormPath) : NEW_FORM_NAME;
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

    setTabs(tabs = []) {
        clearNode(this.container);
        const tabLinks = tabs.map(tab => this._createTabLink(tab));
        this.container.append(...tabLinks, createNewTabLink());
        this.handleResize();
        this.scrollToActiveTab();
    }

    scrollToActiveTab() {
        this.activeTab.scrollIntoView();
        const containerWeight = this.container.getBoundingClientRect().width;
        const activeTabLeftPosition = this.activeTab.getBoundingClientRect().x;
        const activeTabWeight = this.activeTab.getBoundingClientRect().width;
        if (activeTabLeftPosition < 0) {
            this.container.scroll(0, 0);
            return;
        }
        const diff = Math.ceil(activeTabWeight - (containerWeight - activeTabLeftPosition));
        if (diff > 0) {
            this.container.scroll(diff, 0);
        }
    }

    showScrollButtons() {
        leftScroll.style.display = '';
        rightScroll.style.display = '';
    }

    hideScrollButtons() {
        leftScroll.style.display = 'none';
        rightScroll.style.display = 'none';
    }

    handleResize(e) {
        const visibleWidth = this.container.offsetWidth;
        const realWidth = this.container.scrollWidth;
        if (realWidth > visibleWidth) {
            this.showScrollButtons();
        } else {
            this.hideScrollButtons();
        }
    }
}

module.exports = TabBar;