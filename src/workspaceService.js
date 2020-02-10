const fs = require('fs');
const path = require('path');
const { CUSTOM_COMPONENTS_FOLDER_NAME } = require('./constants/backendConstants');
const isForm = require('./util/isForm');

class WorkspaceService {
    constructor(workspace) {
        this.currentWorkspace = workspace;
    }

    setCurrentWorkspace(workspace) {
        this.currentWorkspace = workspace;
    }

    _getFormPathByPathField(name) {
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

    formExistsByPathField(pathField) {
        return fs.existsSync(this._getFormPathByPathField(pathField));
    }

    addCustomComponent(filePath) {
        const name = path.basename(filePath);
        const folderExists = fs.existsSync(this.pathToCustomComponentsFolder);
        try {
            if (!folderExists) {
                fs.mkdirSync(this.pathToCustomComponentsFolder);
            }
        } catch (err) {
            this.throwError(err);
        }
        try {
            const newCustomComponentInsides = fs.readFileSync(filePath, { encoding: 'utf8' });
            fs.writeFileSync(path.resolve(this.pathToCustomComponentsFolder, name), newCustomComponentInsides, { encoding: 'utf8' });
        } catch (err) {
            this.throwError(err);
        }
    }

    saveForm(form) {
        try {
            if (path.basename(form.path) !== form.path) {
                fs.mkdirSync(this._getPathByBaseName(path.dirname(form.path)), { recursive: true });
            }
            fs.writeFileSync(this._getFormPathByPathField(form.path), JSON.stringify(form));
        } catch (err) {
            this.throwError(err);
        }
    }

    getForm(formPath) {
        try {
            let form = fs.readFileSync(formPath, { encoding: 'utf8' });
            form = JSON.parse(form);
            if (!isForm(form)) {
                this.throwError('Not valid form');
            }
            return form;
        } catch (err) {
            this.throwError(err);
        }
    }

    getForms() {
        const forms = [];
        try {
            this._pullOutFormsFromByPath(this.currentWorkspace, forms);
        } catch (err) {
            this.throwError(err);
        }
        return forms.filter(isForm);
    }

    _pullOutFormsFromByPath(dirPath, forms) {
        const fileBaseNames = fs.readdirSync(dirPath);
        fileBaseNames.forEach(fileBaseName => {
            if (path.extname(fileBaseName) === '.json') {
                try {
                    let form = fs.readFileSync(path.resolve(dirPath, fileBaseName), { encoding: 'utf8' });
                    form = JSON.parse(form);
                    forms.push(form);
                } catch (err) {
                    console.info(err);
                }
            } else if (path.extname(fileBaseName) === '') {
                this._pullOutFormsFromByPath(path.resolve(dirPath, fileBaseName), forms);
            }
        })
    }

    throwError(message) {
        throw new Error(message);
    }
}

module.exports = WorkspaceService;