const { CONFIRM_CONSTANTS } = require('./constants/backendConstants');

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
            title: 'Save File',
            buttons: ['Yes', 'No']
        })
        return answer === 0 ? CONFIRM_CONSTANTS.YES : CONFIRM_CONSTANTS.NO;
    }

    confirmChangeWorkspace() {
        const answer = this.dialog.showMessageBoxSync(this.window, {
            message: 'Save changes before changing workspace?',
            type: 'question',
            title: 'Change Workspace',
            cancelId: 0,
            defaultId: 0,
            noLink: true,
            buttons: ['Cancel', 'Save', 'Don\' Save']
        })
        switch (answer) {
            case 0: return CONFIRM_CONSTANTS.CANCEL;
            case 1: return CONFIRM_CONSTANTS.SAVE;
            case 2: return CONFIRM_CONSTANTS.DONT_SAVE;
            default: return CONFIRM_CONSTANTS.CANCEL;
        }
    }

    confirmCloseMainWindow() {
        const answer = this.dialog.showMessageBoxSync(this.window, {
            message: 'Save changes before closing?',
            type: 'question',
            title: 'Close File',
            cancelId: 0,
            defaultId: 0,
            noLink: true,
            buttons: ['Cancel', 'Save', 'Don\' Save']
        })
        switch (answer) {
            case 0: return CONFIRM_CONSTANTS.CANCEL;
            case 1: return CONFIRM_CONSTANTS.SAVE;
            case 2: return CONFIRM_CONSTANTS.DONT_SAVE;
            default: return CONFIRM_CONSTANTS.CANCEL;
        }
    }

    alert(message) {
        this.dialog.showMessageBoxSync(this.window, {
            message
        })
    }

    selectDirectory(title) {
        const paths = this.dialog.showOpenDialogSync(this.window, {
            properties: ['openDirectory'],
            title
        })
        return paths && paths[0];
    }

    selectJsonFile() {
        const filePaths = this.dialog.showOpenDialogSync(this.window, {
            filters: [
                { name: 'formio', extensions: ['json'] },
            ],
            properties: ['openFile']
        });
        return filePaths && filePaths[0];
    }
}

module.exports = ElectronDialog;