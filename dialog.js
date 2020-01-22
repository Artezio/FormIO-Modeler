class ElectronDialog {
    constructor(dialog, window) {
        this.dialog = dialog;
        this.window = window;
    }

    confirm(message) {
        const answer = this.dialog.showMessageBoxSync(this.window, {
            message,
            buttons: ['Yes', 'No']
        })
        return answer === 0;
    }

    alert(message) {
        this.dialog.showMessageBoxSync(this.window, {
            message
        })
    }

    selectDirectory(title) {
        return this.dialog.showOpenDialogSync(this.window, {
            properties: ['openDirectory'],
            title
        })
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