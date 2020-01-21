const fs = require('fs');

const pathToWorkspaceInfoFile = './data/recentWorkspaces.txt';

let instance;
class FileSystem {
    constructor() {
        if (instance) {
            return instance;
        }
        this.recentWorkspacePaths = [];
        this.maxRecentWorkspaces = 5;
        this._initializeRecentWorkspaces();
        instance = this;
    }
    static getInstance() {
        if (instance) {
            return instance;
        }
        return new FileSystem();
    }

    addRecentWorkspacePath(path) {
        this.recentWorkspacePaths.unshift(path);
        if (this.recentWorkspacePaths.length > this.maxRecentWorkspaces) {
            this.recentWorkspacePaths.pop();
        }
    }

    _initializeRecentWorkspaces() {
        try {
            const recentWorkspacesJson = fs.readFileSync(pathToWorkspaceInfoFile, { encoding: 'utf8' });
            if (!recentWorkspacesJson) return;
            let recentWorkspacePaths = JSON.stringify(recentWorkspacePaths);
            if (!Array.isArray(recentWorkspacePaths)) return;
            recentWorkspacePaths = recentWorkspacePaths.filter(recentWorkspacePath => fs.existsSync(recentWorkspacePath));
            recentWorkspacePaths.forEach(recentWorkspacePath => {
                this.addRecentWorkspacePath(recentWorkspacePath);
            })
        } catch (err) {
            console.error(err);
        }
    }

    setCurrentWorkspace(path) {
        this.currentWorkspacePath = path;
        this.addRecentWorkspacePath(path);
    }

    checkFileExist(path) {
        return fs.existsSync(path);
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
        fs.readFile(path, { encoding: 'utf8' }, callback);
    }

    readFileSync(path) {
        return fs.readFileSync(path, { encoding: 'utf8' });
    }
}

module.exports = FileSystem;