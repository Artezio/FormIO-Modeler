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
        // fs.writeFile(pathToWorkspaceInfoFile, this.workspacePath, (err) => {
        //     if (err) {
        //         console.error(err)
        //     } else {

        //     }
        // });
    }

    checkFileExist(path) {
        try {
            return fs.existsSync(path);
        } catch (err) {
            console.error(err);
            return true;
        }
    }

    async saveFile(data, path) {
        try {
            return fs.writeFileSync(path, data);
        } catch (err) {
            console.error(err);
        }
    }

    async readDir(dirPath) {
        return fs.readdirSync(dirPath);
    }

    readFile(path, callback) {
        fs.readFile(path, 'utf8', callback);
    }
}

module.exports = FileSystem;