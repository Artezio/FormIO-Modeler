const WorkspaceService = require('./workspaceService');
const AppState = require('./appState');
const { CONFIRM_CONSTANTS } = require('./constants/backendConstants');

class Backend {
    constructor(dialog) {
        this.dialog = dialog;
        this.workspaceService = new WorkspaceService();
        this.appState = new AppState();
    }

    throwError(message) {
        throw new Error(message);
    }

    setCurrentForm(form) {
        if (this.appState.formSaved) {
            this.appState.setForm(form);
        } else {
            const answer = this.dialog.confirmOpenNewForm();
            switch (answer) {
                case CONFIRM_CONSTANTS.CANCEL: {
                    this.throwError('Action canceled');
                    break;
                }
                case CONFIRM_CONSTANTS.NOT_SAVE: {
                    this.appState.setForm(form);
                    break;
                }
                case CONFIRM_CONSTANTS.SAVE: {
                    this.saveCurrentForm();
                    break;
                }
                default: {
                    this.throwError('Action canceled');
                    break;
                }
            }
        }
    }

    openForm() {
        if (this.appState.formSaved) {
            const formPath = this.dialog.selectJsonFile();
            if (!formPath) {
                this.throwError('Action canceled');
            }
            const form = this.workspaceService.getForm(formPath);
            this.appState.setForm(form);
        } else {
            const answer = this.dialog.confirmOpenNewForm();
            switch (answer) {
                case CONFIRM_CONSTANTS.CANCEL: {
                    this.throwError('Action canceled');
                    break;
                }
                case CONFIRM_CONSTANTS.NOT_SAVE: {
                    const formPath = this.dialog.selectJsonFile();
                    if (!formPath) {
                        this.throwError('Action canceled');
                    }
                    const form = this.workspaceService.getForm(formPath);
                    this.appState.setForm(form);
                    break;
                }
                case CONFIRM_CONSTANTS.SAVE: {
                    this.saveCurrentForm();
                    break;
                }
                default: {
                    this.throwError('Action canceled');
                    break;
                }
            }
        }
    }

    openNewForm() {
        if (this.appState.formSaved) {
            this.appState.setForm({});
        } else {
            const answer = this.dialog.confirmOpenNewForm();
            switch (answer) {
                case CONFIRM_CONSTANTS.CANCEL: {
                    this.throwError('Action canceled');
                    break;
                }
                case CONFIRM_CONSTANTS.NOT_SAVE: {
                    this.appState.setForm({});
                    break;
                }
                case CONFIRM_CONSTANTS.SAVE: {
                    this.saveCurrentForm();
                    break;
                }
                default: {
                    this.throwError('Action canceled');
                    break;
                }
            }
        }
    }

    getCurrentForm() {
        return this.appState.form;
    }

    setCurrentWorkspace(workspace) {
        if (this.appState.formSaved) {
            this.workspaceService.setCurrentWorkspace(workspace);
        } else {
            const answer = this.dialog.confirmChangeWorkspace();
            switch (answer) {
                case CONFIRM_CONSTANTS.CANCEL: {
                    this.throwError('Action canceled');
                    break;
                }
                case CONFIRM_CONSTANTS.NOT_SAVE: {
                    this.workspaceService.setCurrentWorkspace(workspace);
                    break;
                }
                case CONFIRM_CONSTANTS.SAVE: {
                    this.saveCurrentForm();
                    break;
                }
                default: {
                    this.throwError('Action canceled');
                    break;
                }
            }
        }
    }

    changeCurrentWorkspace() {
        if (this.appState.formSaved) {
            const workspace = this.dialog.selectDirectory();
            if (!workspace) {
                this.throwError('Directory not selected');
            }
            this.workspaceService.setCurrentWorkspace(workspace);
        } else {
            const answer = this.dialog.confirmChangeWorkspace();
            switch (answer) {
                case CONFIRM_CONSTANTS.CANCEL: {
                    this.throwError('Action canceled');
                    break;
                }
                case CONFIRM_CONSTANTS.NOT_SAVE: {
                    const workspace = this.dialog.selectDirectory();
                    if (!workspace) {
                        this.throwError('Directory not selected');
                    }
                    this.workspaceService.setCurrentWorkspace(workspace);
                    break;
                }
                case CONFIRM_CONSTANTS.SAVE: {
                    this.saveCurrentForm();
                    break;
                }
                default: {
                    this.throwError('Action canceled');
                    break;
                }
            }
        }
    }

    saveCurrentForm() {
        if (this.appState.formSaved) return;
        const form = this.appState.form;
        if (!isForm(form)) {
            this.throwError('Not valid form');
        }
        const formExists = this.workspaceService.formExists(form.path);
        if (formExists) {
            const canReplace = this.dialog.confirmReplaceFile();
            if (canReplace) {
                this.workspaceService.saveForm(form);
                this.appState.formSaved = true;
            } else {
                this.throwError('Action canceled');
            }
        } else {
            this.workspaceService.saveForm(form);
            this.appState.formSaved = true;
        }
    }

    getFormById(id) {
        const forms = this.workspaceService.getForms;
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
        this.appState.adjustForm(formUpdates);
    }

    getCustomComponentsDetails() {
        return this.workspaceService.getCustomComponentsDetails();
    }

    getRecentWorkspaces() {
        return this.appState.recentWorkspaces;
    }

    getCurrentWorkspace() {
        return this.workspaceService.currentWorkspace;
    }
}

module.exports = Backend;