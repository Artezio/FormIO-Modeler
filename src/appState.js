const fs = require('fs');
const path = require('path');
const uuid = require('uuid/v1');
const isTab = require('./util/isTab');
const { PATH_TO_WORKSPACES_INFO, MAX_RECENT_WORKSPACES, FORM_TYPE, TABS_INFO_FILE_NAME } = require('./constants/backendConstants');
const Tab = require('./tab');

class AppState {
    constructor(workspaceService) {
        this.workspaceService = workspaceService;
        this.recentWorkspaces = [];
        this.form = {};
        this._formSaved = true;
        this.tabs = [];
        this._initRecentWorkspaces();
    }

    setActiveTab(tab) {
        if (!this.tabs.length) return;
        if (!tab || this.tabs.findIndex(t => t.id === tab.id) === -1) {
            tab = this.tabs[0];
        }
        this.tabs.forEach(t => {
            if (t.id === tab.id) {
                t.isActive = true;
                this.activeTab = t;
            } else {
                t.isActive = false;
            }
        })
    }

    addTab(...tabs) {
        tabs.forEach(tab => {
            if (this.tabs.find(t => t.id === tab.id)) return;
            this.tabs.push(tab);
        })
        this._clarifyActiveTab();
    }

    removeTab(tab) {
        const index = this.tabs.findIndex(t => t.id === tab.id);
        if (index === -1) return;
        this.tabs.splice(index, 1);
        this._clarifyActiveTab();
    }

    _clarifyActiveTab() {
        if (this.tabs.filter(tab => tab.active).length !== 1) {
            this.setActiveTab(this.tabs[0]);
        }
    }

    getCurrentForm() {
        return this.activeTab.form;
    }

    _addRecentWorkspace(workspace) {
        const existedPathIndex = this.recentWorkspaces.indexOf(workspace);
        if (existedPathIndex !== -1) {
            this.recentWorkspaces.splice(existedPathIndex, 1);
        }
        this.recentWorkspaces.unshift(workspace);
        if (this.recentWorkspaces.length > MAX_RECENT_WORKSPACES) {
            this.recentWorkspaces.pop();
        }
    }

    _initRecentWorkspaces() {
        try {
            if (fs.existsSync(PATH_TO_WORKSPACES_INFO)) {
                let workspaces = fs.readFileSync(PATH_TO_WORKSPACES_INFO, { encoding: 'utf8' });
                workspaces = JSON.parse(workspaces);
                if (!Array.isArray(workspaces)) {
                    throw new Error('Workspaces are not valid');
                }
                workspaces = workspaces.filter(workspace => fs.existsSync(workspace));
                workspaces.slice(0, MAX_RECENT_WORKSPACES).forEach(workspace => {
                    this.recentWorkspaces.push(workspace);
                })
            } else {
                throw new Error('Workspaces not found');
            }
        } catch (err) {
            console.error(err);
        }
    }

    _initTabs() {
        this.tabs = [];
        try {
            const tabs = fs.readFileSync(path.resolve(this.currentWorkspace, TABS_INFO_FILE_NAME), { encoding: 'utf8' });
            tabs = JSON.parse(tabs);
            tabs = tabs.filter(isTab);
            tabs = tabs.filter(tab => isTab(tab) && tab.form && fs.existsSync(path.resolve(this.currentWorkspace, tab.form.formPath)));
            tabs = tabs.map(tab => new Map(tab));
            this.addTab(tabs);
            this._clarifyActiveTab();
        } catch (err) {
            console.info(err);
        }
    }

    setCurrentWorkspace(workspace) {
        this.currentWorkspace = workspace;
        this._addRecentWorkspace(workspace);
        this.workspaceService.setCurrentWorkspace(workspace);
        this.saveRecentWorkspaces();
        this._initTabs();
        // this.currentFormSaved = true;
    }

    saveRecentWorkspaces() {
        const data = JSON.stringify(this.recentWorkspaces);
        try {
            if (!fs.existsSync(path.dirname(PATH_TO_WORKSPACES_INFO))) {
                fs.mkdirSync(path.dirname(PATH_TO_WORKSPACES_INFO), { recursive: true });
            }
            fs.writeFileSync(PATH_TO_WORKSPACES_INFO, data, { encoding: 'utf8' });
        } catch (err) {
            console.error(err);
        }
    }

    adjustCurrentForm(changes) {
        this.activeTab.adjustForm(changes);
    }
}

module.exports = AppState;