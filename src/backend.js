const WorkspaceService = require('./workspaceService');
const AppState = require('./appState');
const path = require('path');
const { CONFIRM_CONSTANTS, NOT_VALID_FORM } = require('./constants/backendConstants');
const isForm = require('./util/isForm');
const isComponent = require('./util/isComponent');
const Tab = require('./tab');

class Backend {
    constructor(dialog, clientChanel) {
        this.dialog = dialog;
        this.clientChanel = clientChanel;
        this.workspaceService = new WorkspaceService();
        this.appState = new AppState(this.workspaceService);
    }

    throwError(message) {
        throw new Error(message);
    }

    openFirstForm(form) {
        const tab = new Tab({ form });
        this.appState.addTab(tab);
    }

    openForm(form) {
        const formAbsolutePath = this.dialog.selectJsonFile();
        if (!formAbsolutePath) {
            this.throwError('Action canceled');
        }
        const appropriateTab = this.appState.tabs.find(tab => tab.id === formAbsolutePath);
        if (appropriateTab) {
            this.appState.setActiveTab(appropriateTab);
            return;
        }
        try {
            const form = this.workspaceService.getFormByAbsolutePath(formAbsolutePath);
            this.appState.addTab({ form, id: formAbsolutePath });
        } catch (err) {
            const formName = path.basename(formAbsolutePath);
            this.dialog.alert(`${formName} is not valid form.`)
            this.throwError(err);
        }
    }

    openNewForm() {
        const tab = new Tab();
        this.appState.addTab(tab);
    }

    getCurrentForm() {
        const form = this.appState.getCurrentForm();
        return form;
    }

    getTabs() {
        return this.appState.tabs;
    }

    setCurrentWorkspace(workspace) {
        this.closeCurrentTab(() => this.dialog.confirmChangeWorkspace());
        this.appState.setCurrentWorkspace(workspace);
    }

    changeCurrentWorkspace() {
        this.closeCurrentTab(() => this.dialog.confirmChangeWorkspace());
        const workspace = this.dialog.selectDirectory();
        if (!workspace) {
            this.throwError('Directory not selected');
        }
        this.appState.setCurrentWorkspace(workspace);
    }

    _saveTab(tab) {
        if (tab.formSaved) return;
        const form = tab.form;
        if (!isForm(form)) {
            this.alertInvalidField(form);
            this.throwError(NOT_VALID_FORM);
        }
        const formExists = this.workspaceService.formExistsByPathField(form.path);
        const save = () => {
            form.created = form.created || new Date().toISOString();
            form.modified = new Date().toISOString();
            this.workspaceService.saveForm(form);
            tab.formSaved = true;
            this.clientChanel.send('saveCurrentForm');
        }
        if (formExists && tab.needReplaceForm) {
            const canReplace = this.dialog.confirmReplaceFile(form.path + '.json');
            if (canReplace) {
                save()
            } else {
                this.throwError('Action canceled');
            }
        } else {
            save()
        }
    }

    saveCurrentTab() {
        this.appState.currentTab && this._saveTab(this.appState.currentTab);
    }

    alertInvalidField(form) {
        if (!form.title) {
            this.dialog.alert('Enter title to save form.');
            this.clientChanel.send('focusFieldByName', 'title');
            return;
        }
        if (!form.name) {
            this.dialog.alert('Enter name to save form.');
            this.clientChanel.send('focusFieldByName', 'name');
            return;
        }
        if (!form.path) {
            this.dialog.alert('Enter path to save form.');
            this.clientChanel.send('focusFieldByName', 'path');
            return;
        }
    }

    closeApp() {
        this.closeCurrentTab(() => this.dialog.confirmCloseMainWindow())
    }

    _closeTab(tab, confirm) {
        const appropriateTab = this.appState.tabs.find(t => t.id === tab.id);
        if (!appropriateTab) this.throwError('Client and Backend tabs don\'t match');
        const answer = confirm();
        switch (answer) {
            case CONFIRM_CONSTANTS.CANCEL: {
                this.throwError('Action canceled');
                break;
            }
            case CONFIRM_CONSTANTS.NOT_SAVE: {
                return;
            }
            case CONFIRM_CONSTANTS.SAVE: {
                this._saveTab(tab);
                break;
            }
            default: {
                this.throwError('Action canceled');
                break;
            }
        }
    }

    closeAllTabs(confirm) {
        this.appState.tabs.forEach(tab => this._closeTab(tab));
    }

    closeCurrentTab(confirm) {
        this.appState.currentTab && this._closeTab(this.appState.currentTab);
    }

    registerCustomComponents() {
        const componentPaths = this.dialog.selectJsFiles();
        if (!componentPaths) this.throwError('Action canceled');
        let currentCustomComponentsDetails;
        try {
            currentCustomComponentsDetails = this.workspaceService.getCustomComponentsDetails();
        } catch (err) {
            currentCustomComponentsDetails = [];
        }
        const tryRegisterComponent = (componentPath) => {
            try {
                const Component = require(componentPath);
                if (!isComponent(Component, path.parse(componentPath).name)) {
                    throw new Error(`${path.basename(componentPath)} is not valid!`);
                }
                this.workspaceService.addCustomComponent(componentPath);
                return true;
            } catch (err) {
                this.dialog.alert(err.toString());
                return false;
            }
        }
        const isDuplicatedFiles = currentCustomComponentsDetails.some(componentDetails => {
            return componentPaths.some(componentPath => path.basename(componentDetails.path) === path.basename(componentPath));
        })
        if (isDuplicatedFiles) {
            const replacedComponents = componentPaths.filter(componentPath => {
                const isDuplicated = currentCustomComponentsDetails.some(componentDetails => path.basename(componentDetails.path) === path.basename(componentPath));
                if (isDuplicated) {
                    const canReplace = this.dialog.confirmReplaceFile(path.basename(componentPath));
                    if (!canReplace) return false;
                }
                return tryRegisterComponent(componentPath);
            })
            if (!replacedComponents.length) {
                this.throwError('Action canceled');
            }
        } else {
            const replacedComponents = componentPaths.filter(componentPath => tryRegisterComponent(componentPath));
            if (!replacedComponents.length) {
                this.throwError('Action canceled');
            }
        }
        this.dialog.alert('Registered successfully!');
    }

    getFormById(id) {
        const forms = this.workspaceService.getForms();
        const form = forms.find(form => form._id === id);
        if (!form) {
            this.throwError(`Form with id: ${id} not found`);
        }
        return form;
    }

    getForms() {
        return this.workspaceService.getForms();
    }

    adjustForm(formUpdates) {
        this.appState.adjustCurrentForm(formUpdates);
    }

    getCustomComponentsDetails() {
        return this.workspaceService.getCustomComponentsDetails();
    }

    getRecentWorkspaces() {
        return this.appState.recentWorkspaces;
    }

    getCurrentWorkspace() {
        return this.appState.currentWorkspace;
    }
}

module.exports = Backend;