const fs = require('fs');
const path = require('path');
const { PATH_TO_WORKSPACES_INFO, MAX_RECENT_WORKSPACES, TABS_INFO_FILE_NAME } = require('./constants/backendConstants');
const Tab = require('./tab');
const isForm = require('./util/isForm');

class AppState {
    constructor(workspaceService) {
        this.workspaceService = workspaceService;
        this.recentWorkspaces = [];
        this.tabs = [];
        this.storedFormPathsByWorkspaceMap = new Map();
        // this._initRecentWorkspaces();
        this._init();
    }

    _init() {
        try {
            let appState = fs.readFileSync(PATH_TO_WORKSPACES_INFO, { encoding: 'utf8' });
            appState = JSON.parse(appState);
            let recentWorkspaces = appState.recentWorkspaces || [];
            recentWorkspaces = recentWorkspaces.filter(workspace => fs.existsSync(workspace));
            recentWorkspaces.slice(0, MAX_RECENT_WORKSPACES).forEach(workspace => {
                this.recentWorkspaces.push(workspace);
            })
            for (let workspace in appState.storedFormPathsByWorkspace) {
                this.storedFormPathsByWorkspaceMap.set(workspace, appState.storedFormPathsByWorkspace[workspace]);
            }
            this._initTabs();
        } catch (err) {
            console.error(err);
        }
    }

    _initTabs() {
        this.tabs = [];
        let formPaths = this.storedFormPathsByWorkspaceMap.get(this.currentWorkspace) || [];
        formPaths.forEach(formPath => {
            try {
                const form = this.workspaceService.getFormByAbsolutePath(path.resolve(this.currentWorkspace, formPath));
                if (!isForm(form)) throw new Error(`Form ${formPath}.json is Incorrect`);
                const tab = new Tab({ form });
                this.addTab(tab);
            } catch (err) {
                console.info(err);
            }
        })
        this._clarifyActiveTab();
    }

    saveState() {
        if (this.currentWorkspace) {
            const formPaths = this.tabs.map(tab => tab.form && tab.form.path && tab.form.path + '.json').filter(Boolean);
            this.storedFormPathsByWorkspaceMap.set(this.currentWorkspace, formPaths);
        }
        this._saveState();
    }

    _saveState() {
        try {
            let data = {
                recentWorkspaces: this.recentWorkspaces,
                storedFormPathsByWorkspace: {}
            }
            for (let x of this.storedFormPathsByWorkspaceMap.entries()) {
                data.storedFormPathsByWorkspace[x[0]] = x[1];
            }
            data = JSON.stringify(data);
            fs.writeFileSync(PATH_TO_WORKSPACES_INFO, data);

        } catch (err) {
            console.info(err);
        }
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

    setCurrentWorkspace(workspace) {
        this.currentWorkspace = workspace;
        this._addRecentWorkspace(workspace);
        this.workspaceService.setCurrentWorkspace(workspace);
        // this.saveRecentWorkspaces();
        this._initTabs();
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