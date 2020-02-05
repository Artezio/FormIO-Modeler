const path = require('path');
const fs = require('fs');
const isForm = require('../util/isForm');

const FORM_EXTENSION = '.json';

class FormProvider {
    constructor(workspacePath) {
        this.workspacePath = workspacePath;
    }

    _getFilePath(fileName) {
        return path.resolve(this.workspacePath, fileName + FORM_EXTENSION);
    }

    setWorkspacePath(workspacePath) {
        this.workspacePath = workspacePath;
    }

    exists(fileName) {
        return fs.existsSync(this._getFilePath(fileName));
    }

    saveForm(form) {
        const path = form.path;
        try {
            form = JSON.stringify(form);
            fs.writeFileSync(this._getFilePath(path), form);
        } catch (err) {
            console.error(err);
            return false;
        }
        return true;
    }

    async getForm(path) {
        const promise = new Promise((res, rej) => {
            fs.readFile(path, { encoding: 'utf8' }, (err, data) => {
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

    async getForms() {
        const fileNames = fs.readdirSync(this.workspacePath);
        if (!Array.isArray(fileNames)) return [];
        const promise = Promise.all(fileNames.map(fileName => new Promise((res, rej) => {
            const path = this.workspacePath + '\\' + fileName;
            fs.readFile(path, { encoding: 'utf8' }, (err, data) => {
                if (err) {
                    rej(err);
                } else {
                    try {
                        res(JSON.parse(data))
                    } catch (err) {
                        rej(err);
                    }
                }
            })
        })))
        const forms = await promise;
        if (!Array.isArray(forms)) return [];
        return forms.filter(isForm);
    }

}

module.exports = FormProvider;