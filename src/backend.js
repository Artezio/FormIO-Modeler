const WorkspaceService = require('./workspaceService');
const AppState = require('./appState');
const { CONFIRM_CONSTANTS } = require('./constants/backendConstants');

class Backend {
    constructor(dialog, clientChanel) {
        this.dialog = dialog;
        this.clientChanel = clientChanel;
        this.workspaceService = new WorkspaceService();
        this.appState = new AppState();
    }

    throwError(message) {
        throw new Error(message);
    }

    closeCurrentForm() {
        if (this.formSaved) return;
        this.saveCurrentForm()
    }

    setCurrentForm() {

    }

    openForm() {

    }

    openNewForm() {

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
                    this.closeCurrentForm();
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

    }

    saveCurrentForm() {

    }

    getFormById() {

    }

    getForms() {

    }

    adjustForm() {

    }

    getCustomComponentsDetails() {

    }

    setCurrentWorkspace() {

    }

    getRecentWorkspaces() {
        return this.appState.recentWorkspaces;
    }
}

module.exports = Backend;