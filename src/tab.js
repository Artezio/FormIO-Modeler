const uuid = require('uuid/v1');
const { FORM_TYPE } = require('./constants/backendConstants');

class Tab {
    constructor(tab = {}) {
        this.id = tab.id || uuid();
        this.form = tab.form || {};
        this._formSaved = tab.formSaved !== undefined ? !!tab.formSaved : true;
        this.savedFormPath = this.form.path;
    }

    get formSaved() {
        return this._formSaved;
    }

    set formSaved(formSaved) {
        if (formSaved) {
            this.savedFormPath = this.form.path;
        }
        this._formSaved = formSaved;
    }

    get needReplaceForm() {
        return this.savedFormPath !== this.form.path;
    }

    adjustForm(changes = {}) {
        this.form = { ...this.form, ...changes };
        this.form.type = this.form.type || FORM_TYPE;
        this.form._id = this.form._id || uuid();
        this.formSaved = false;
    }
}

module.exports = Tab;