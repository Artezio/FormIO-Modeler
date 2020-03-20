const WorkspaceService = require('./workspaceService');
const AppState = require('./appState');
const path = require('path');
const { CONFIRM_CONSTANTS, NOT_VALID_FORM, NEW_FORM_NAME } = require('./constants/backendConstants');
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

    setActiveTab(tab) {
        this.appState.setActiveTab(tab);
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
        try {
            const form = this.workspaceService.getFormByAbsolutePath(formAbsolutePath);
            let tab = this.appState.tabs.find(tab => tab.form.path === form.path);
            if (!tab) {
                tab = new Tab({ form, id: formAbsolutePath })
                this.appState.addTab(tab);
            }
            this.appState.setActiveTab(tab);
        } catch (err) {
            const formName = path.basename(formAbsolutePath);
            this.dialog.alert(`${formName} is not valid form.`)
            this.throwError(err);
        }
    }

    openNewForm() {
        const tab = new Tab();
        this.appState.addTab(tab);
        this.appState.setActiveTab(tab);
    }

    getCurrentForm() {
        const form = this.appState.getCurrentForm();
        return form;
    }

    getTabs() {
        return this.appState.tabs;
    }

    setCurrentWorkspace(workspace) {
        this.appState.setCurrentWorkspace(workspace);
    }

    changeCurrentWorkspace() {
        this.closeAllTabs();
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
            this.clientChanel.send('saveActiveTab');
        }
        if (formExists && tab.needReplaceForm) {
            const canReplace = this.dialog.confirmReplaceFile(form.path + '.json');
            if (canReplace) {
                save();
            } else {
                this.throwError('Action canceled');
            }
        } else {
            save()
        }
    }

    saveActiveTab() {
        this.appState.activeTab && this._saveTab(this.appState.activeTab);
    }

    alertInvalidField(form) {
        const invalidFields = [];
        if (!form.title) {
            invalidFields.push('title');
        }
        if (!form.name) {
            invalidFields.push('name');
        }
        if (!form.path) {
            invalidFields.push('path');
        }
        if (!invalidFields.length) return;
        this.dialog.alert(`Enter ${invalidFields.join(', ')} to save form.`);
        this.clientChanel.send('focusFieldByName', invalidFields[0]);
    }

    closeApp() {
        this.closeAllTabs();
    }

    _closeTab(tab, confirmSave) {
        const appropriateTab = this.appState.tabs.find(t => t.id === tab.id);
        if (!appropriateTab) this.throwError('Client and Backend tabs don\'t match');
        if (!tab.formSaved) {
            const answer = confirmSave();
            switch (answer) {
                case CONFIRM_CONSTANTS.CANCEL: {
                    this.throwError('Action canceled');
                    break;
                }
                case CONFIRM_CONSTANTS.NOT_SAVE: {
                    break;
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
        this.appState.removeTab(tab);
    }

    closeTab(tab) {
        const activeTab = this.appState.activeTab;
        this.appState.setActiveTab(tab);
        const tabs = this.appState.tabs.slice();
        try {
            this._closeTab(tab, () => this.dialog.confirmCloseUnsavedTab(tab.form.path ? tab.form.path + 'json' : NEW_FORM_NAME));
            const activeTabIndex = tabs.findIndex(tab => tab.id === activeTab.id);
            if (tab.id === activeTab.id) {
                if (activeTabIndex > 0) {
                    this.appState.setActiveTab(tabs[activeTabIndex - 1]);
                } else {
                    this.appState.setActiveTab(tabs[0]);
                }
            } else {
                this.appState.setActiveTab(activeTab);
            }
            this.clientChanel.send('closeTab');
        } catch (err) {
            this.throwError(err);
        }
    }

    closeAllTabs() {
        const tabs = this.appState.tabs.slice();
        const closedTabs = tabs.filter(tab => {
            try {
                this.closeTab(tab)
                return true;
            } catch (err) {
                return false;
            }
        });
        if (closedTabs.length !== tabs.length) {
            this.throwError('Unsuccessful!');
        }
    }

    closeCurrentTab() {
        this.appState.currentTab && this.closeTab(this.appState.currentTab);
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

    adjustCurrentForm(formUpdates) {
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