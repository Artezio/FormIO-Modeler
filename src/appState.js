const fs = require('fs');
const path = require('path');
const uuid = require('uuid/v1');
const { PATH_TO_WORKSPACES_INFO, MAX_RECENT_WORKSPACES, FORM_TYPE } = require('./constants/backendConstants');

class AppState {
    constructor(workspaceService) {
        this.workspaceService = workspaceService;
        this.recentWorkspaces = [];
        this.form = {};
        this._formSaved = true;
        this._init();
    }

    get formSaved() {
        return this._formSaved;
    }

    set formSaved(formSaved) {
        if (formSaved) {
            this.currentFormPath = this.form.path;
        }
        this._formSaved = formSaved;
    }

    get needReplaceForm() {
        return !this.form.path || this.currentFormPath !== this.form.path;
    }

    addRecentWorkspace(workspace) {
        const existedPathIndex = this.recentWorkspaces.indexOf(workspace);
        if (existedPathIndex !== -1) {
            this.recentWorkspaces.splice(existedPathIndex, 1);
        }
        this.recentWorkspaces.unshift(workspace);
        if (this.recentWorkspaces.length > MAX_RECENT_WORKSPACES) {
            this.recentWorkspaces.pop();
        }
    }

    _init() {
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
        this.addRecentWorkspace(workspace);
        this.workspaceService.setCurrentWorkspace(workspace);
        this.saveRecentWorkspaces();
        this.formSaved = true;
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

    setForm(form = {}) {
        this.form = form;
        this.formSaved = true;
        this.currentFormPath = this.form.path;
    }

    adjustForm(changes = {}) {
        this.form = { ...this.form, ...changes };
        this.form.type = this.form.type || FORM_TYPE;
        this.form._id = this.form._id || uuid();
        this.formSaved = false;
    }
}

module.exports = AppState;