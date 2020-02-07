const fs = require('fs');
const path = require('path');
const { CUSTOM_COMPONENTS_FOLDER_NAME } = require('./constants/backendConstants');
const isForm = require('./util/isForm');

class WorkspaceService {
    constructor() {

    }

    setCurrentWorkspace(workspace) {
        this.currentWorkspace = workspace;
    }

    _getFormPathByName(name) {
        return this._getPathByBaseName(name + '.json')
    }

    _getPathByBaseName(baseName) {
        return path.resolve(this.currentWorkspace, baseName);
    }

    get pathToCustomComponentsFolder() {
        return path.resolve(this.currentWorkspace, CUSTOM_COMPONENTS_FOLDER_NAME);
    }

    getCustomComponentsDetails() {
        try {
            const files = fs.readdirSync(this.pathToCustomComponentsFolder);
            const componentsInfo = files
                .filter(paths => path.extname(paths) === '.js')
                .map(fileBasename => {
                    const name = fileBasename.slice(0, -path.extname(fileBasename).length);
                    return {
                        name,
                        path: path.resolve(this.pathToCustomComponentsFolder, fileBasename)
                    }
                })
            this.customComponentsInfo = componentsInfo;
            return this.customComponentsInfo;
        } catch (err) {
            this.throwError(err);
        }
    }

    formExists(fileName) {
        return fs.existsSync(this._getPathByBaseName(fileName));
    }

    saveForm(form) {
        const formBaseName = form.path;
        try {
            form = JSON.stringify(form);
            fs.writeFileSync(this._getFormPathByName(formBaseName), form);
        } catch (err) {
            console.error(err);
            return false;
        }
        return true;
    }

    async getForm(formPath) {
        const promise = new Promise((res, rej) => {
            fs.readFile(formPath, { encoding: 'utf8' }, (err, data) => {
                if (err) {
                    rej(err);
                } else {
                    res(data);
                }
            });
        })
        let form = await promise;
        try {
            form = JSON.parse(form);
            if (!isForm(form)) {
                throw new Error('File is not valid form');
            }
        } catch (err) {
            console.error(err);
            return;
        }
        return form;
    }

    getForms() {
        const fileBaseNames = fs.readdirSync(this.currentWorkspace);
        if (!Array.isArray(fileBaseNames)) return [];
        const formBaseNames = fileBaseNames.filter(fileBaseName => path.extname(fileBaseName) === '.json');
        try {
            const forms = formBaseNames.map(fileBaseName => {
                const filePath = this._getPathByBaseName(fileBaseName);
                let file = fs.readFileSync(filePath, { encoding: 'utf8' });
                file = JSON.parse(file);
                return file;
            })
            return forms.filter(isForm);
        } catch (err) {
            this.throwError(err);
        }
    }

    throwError(message) {
        throw new Error(message);
    }
}

module.exports = WorkspaceService;