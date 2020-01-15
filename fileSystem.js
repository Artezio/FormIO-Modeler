const fs = require('fs');
const pathToWorkspaceInfoFile = './data/lastWorkspace.txt';

let instance;
class FileSystem {
    constructor() {
        if (instance) {
            return instance;
        }
        this._initializeWorkingSpace();
        instance = this;
    }
    static getInstance() {
        if (instance) {
            return instance;
        }
        return new FileSystem();
    }

    _initializeWorkingSpace() {
        try {
            const currentWorkingSpace = fs.readFileSync(pathToWorkspaceInfoFile);
            ///toDo check regExp logic
            this.workspacePath = currentWorkingSpace;
        } catch {
            this.workspacePath = null;
        }
    }

    setWorkingSpace(path) {
        this.workspacePath = path;
        fs.writeFile(pathToWorkspaceInfoFile, this.workspacePath, (err) => {
            console.error(err)
        });
    }

    checkFileExist(path) {
        return fs.existsSync(path);
    }

    async saveFile(data, path) {
        return fs.writeFileSync(path, data);
    }
}

module.exports = FileSystem;