const fs = require('fs');
const isForm = require('./util/isForm');

class FormProvider {
    constructor(workspacePath) {
        this.workspacePath = workspacePath;
    }

    exists(path) {
        return fs.existsSync(this.workspacePath + '\\' + path + '.json');
    }

    saveForm(form) {
        const path = form.path;
        try {
            form = JSON.stringify(form);
        } catch (err) {
            return false;
        }
        try {
            fs.writeFileSync(this.workspacePath + '\\' + path + '.json', form);
            return true;
        } catch (err) {
            return false;
        }
    }

    async getForm(path) {
        
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
                    res(JSON.parse(data))
                }
            })
        })))
        const forms = await promise;
        return forms.filter(isForm);
    }

}