const WorkspaceService = require('./workspaceService');
const AppState = require('./appState');
const path = require('path');
const { CONFIRM_CONSTANTS, NOT_VALID_FORM } = require('./constants/backendConstants');
const isForm = require('./util/isForm');

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
                    this.appState.setForm(form);
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
                    const formPath = this.dialog.selectJsonFile();
                    if (!formPath) {
                        this.throwError('Action canceled');
                    }
                    const form = this.workspaceService.getForm(formPath);
                    this.appState.setForm(form);
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
                    this.appState.setForm({});
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
            this.appState.setCurrentWorkspace(workspace);
        } else {
            const answer = this.dialog.confirmChangeWorkspace();
            switch (answer) {
                case CONFIRM_CONSTANTS.CANCEL: {
                    this.throwError('Action canceled');
                    break;
                }
                case CONFIRM_CONSTANTS.NOT_SAVE: {
                    this.appState.setCurrentWorkspace(workspace);
                    break;
                }
                case CONFIRM_CONSTANTS.SAVE: {
                    this.saveCurrentForm();
                    this.appState.setCurrentWorkspace(workspace);
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
            this.appState.setCurrentWorkspace(workspace);
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
                    this.appState.setCurrentWorkspace(workspace);
                    break;
                }
                case CONFIRM_CONSTANTS.SAVE: {
                    this.saveCurrentForm();
                    const workspace = this.dialog.selectDirectory();
                    if (!workspace) {
                        this.throwError('Directory not selected');
                    }
                    this.appState.setCurrentWorkspace(workspace);
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
            this.alertInvalidField();
            this.throwError(NOT_VALID_FORM);
        }
        const formExists = this.workspaceService.formExistsByPathField(form.path);
        if (formExists) {
            const canReplace = this.dialog.confirmReplaceFile();
            if (canReplace) {
                this.workspaceService.saveForm(form);
                this.appState.formSaved = true;
                this.clientChanel.send('saveCurrentForm');
            } else {
                this.throwError('Action canceled');
            }
        } else {
            this.workspaceService.saveForm(form);
            this.appState.formSaved = true;
            this.clientChanel.send('saveCurrentForm');
        }
    }

    alertInvalidField() {
        if (!this.appState.form.title) {
            this.dialog.alert('Enter title to save form.');
            this.clientChanel.send('focusFieldByName', 'title');
            return;
        }
        if (!this.appState.form.name) {
            this.dialog.alert('Enter name to save form.');
            this.clientChanel.send('focusFieldByName', 'name');
            return;
        }
        if (!this.appState.form.path) {
            this.dialog.alert('Enter path to save form.');
            this.clientChanel.send('focusFieldByName', 'path');
            return;
        }
    }

    closeApp() {
        if (this.appState.formSaved) return;
        const answer = this.dialog.confirmCloseMainWindow();
        switch (answer) {
            case CONFIRM_CONSTANTS.CANCEL: {
                this.throwError('Action canceled');
                break;
            }
            case CONFIRM_CONSTANTS.NOT_SAVE: {
                return;
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

    // closeCurrentForm(confirm) {
    //     if (this.appState.formSaved) return;
    //     const answer = confirm();
    //     switch (answer) {
    //         case CONFIRM_CONSTANTS.CANCEL: {
    //             this.throwError('Action canceled');
    //             break;
    //         }
    //         case CONFIRM_CONSTANTS.NOT_SAVE: {
    //             return;
    //         }
    //         case CONFIRM_CONSTANTS.SAVE: {
    //             this.saveCurrentForm();
    //             break;
    //         }
    //         default: {
    //             this.throwError('Action canceled');
    //             break;
    //         }
    //     }
    // }

    registerCustomComponents() {
        const componentPaths = this.dialog.selectJsFiles();
        if (!componentPaths) this.throwError('Action canceled');
        try {
            let currentCustomComponentsDetails;
            try {
                currentCustomComponentsDetails = this.workspaceService.getCustomComponentsDetails();
            } catch (err) {
                currentCustomComponentsDetails = [];
            }
            const replacedComponents = componentPaths.filter(componentPath => {
                const componentName = path.basename(componentPath).slice(0, -path.extname(componentPath).length);
                if (currentCustomComponentsDetails.some(componentDetails => componentDetails.name === componentName)) {
                    const canReplace = this.dialog.confirmReplaceFile(componentName);
                    if (!canReplace) return false;
                }
                this.workspaceService.addCustomComponent(componentPath);
                return true;
            })
            if (!replacedComponents.length) this.throwError('Action canceled');
        } catch (err) {
            this.throwError(err);
        }
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
        this.appState.adjustForm(formUpdates);
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