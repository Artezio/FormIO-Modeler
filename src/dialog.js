const { CONFIRM_CONSTANTS } = require('./constants/backendConstants');
const fs = require('fs');

class ElectronDialog {
    constructor(dialog, window) {
        this.dialog = dialog;
        this.window = window;
    }

    confirmReplaceFile(fileName) {
        const answer = this.dialog.showMessageBoxSync(this.window, {
            message: `${fileName} already exists.\nDo you want to replace it?`,
            cancelId: 1,
            defaultId: 1,
            title: 'Saving file',
            buttons: ['Yes', 'No']
        })
        return answer === 0;
    }

    confirmOpenNewForm() {
        const answer = this.dialog.showMessageBoxSync(this.window, {
            message: 'Save form before opening new one?',
            type: 'question',
            title: 'Opening new form',
            cancelId: 0,
            defaultId: 0,
            noLink: true,
            buttons: ['Cancel', 'Save', 'Don\' Save']
        })
        switch (answer) {
            case 0: return CONFIRM_CONSTANTS.CANCEL;
            case 1: return CONFIRM_CONSTANTS.SAVE;
            case 2: return CONFIRM_CONSTANTS.NOT_SAVE;
            default: return CONFIRM_CONSTANTS.CANCEL;
        }
    }

    confirmChangeWorkspace() {
        const answer = this.dialog.showMessageBoxSync(this.window, {
            message: 'Save changes before changing workspace?',
            type: 'question',
            title: 'Changing workspace',
            cancelId: 0,
            defaultId: 0,
            noLink: true,
            buttons: ['Cancel', 'Save', 'Don\' Save']
        })
        switch (answer) {
            case 0: return CONFIRM_CONSTANTS.CANCEL;
            case 1: return CONFIRM_CONSTANTS.SAVE;
            case 2: return CONFIRM_CONSTANTS.NOT_SAVE;
            default: return CONFIRM_CONSTANTS.CANCEL;
        }
    }

    confirmCloseUnsavedTab(title) {
        const answer = this.dialog.showMessageBoxSync(this.window, {
            message: `Save changes in ${title} before closing?`,
            type: 'question',
            title: 'Closing form',
            cancelId: 0,
            defaultId: 0,
            noLink: true,
            buttons: ['Cancel', 'Save', 'Don\' Save']
        })
        switch (answer) {
            case 0: return CONFIRM_CONSTANTS.CANCEL;
            case 1: return CONFIRM_CONSTANTS.SAVE;
            case 2: return CONFIRM_CONSTANTS.NOT_SAVE;
            default: return CONFIRM_CONSTANTS.CANCEL;
        }
    }

    confirmCloseMainWindow() {
        const answer = this.dialog.showMessageBoxSync(this.window, {
            message: 'Save changes before closing?',
            type: 'question',
            title: 'Closing form',
            cancelId: 0,
            defaultId: 0,
            noLink: true,
            buttons: ['Cancel', 'Save', 'Don\' Save']
        })
        switch (answer) {
            case 0: return CONFIRM_CONSTANTS.CANCEL;
            case 1: return CONFIRM_CONSTANTS.SAVE;
            case 2: return CONFIRM_CONSTANTS.NOT_SAVE;
            default: return CONFIRM_CONSTANTS.CANCEL;
        }
    }

    alert(message) {
        this.dialog.showMessageBoxSync(this.window, {
            message
        })
    }

    selectDirectory() {
        const paths = this.dialog.showOpenDialogSync(this.window, {
            properties: ['openDirectory'],
            title: 'Select current workspace',
            buttonLabel: 'Select workspace'
        })
        const aimPath = paths && paths[0];
        if (!aimPath) return;
        if (!fs.existsSync(aimPath)) {
            this.alert(`the path "${aimPath}" does not seem to exist anymore on disk`);
            return;
        }
        return aimPath;
    }

    selectJsonFile() {
        const filePaths = this.dialog.showOpenDialogSync(this.window, {
            filters: [
                { name: 'formio', extensions: ['json'] },
            ],
            properties: ['openFile'],
            title: 'Open form',
            buttonLabel: 'Open form'
        });
        const aimPath = filePaths && filePaths[0];
        if (aimPath) {
            return aimPath;
        }
    }

    selectJsFiles() {
        const filePaths = this.dialog.showOpenDialogSync(this.window, {
            filters: [
                { name: 'custom component', extensions: ['js'] },
            ],
            properties: ['openFile', 'multiSelections'],
            title: 'Select custom components',
            buttonLabel: 'Select custom components'
        });
        return filePaths && [...filePaths];
    }
}

module.exports = ElectronDialog;