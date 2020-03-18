const uuid = require('uuid/v1');


class Tab {
    constructor(tab = {}) {
        this.id = tab.id || uuid();
        this.form = tab.form || {};
        this.formSaved = true;
    }

    adjustForm(changes = {}) {
        this.form = { ...this.form, ...changes };
        this.form.type = this.form.type || FORM_TYPE;
        this.form._id = this.form._id || uuid();
        this.formSaved = false;
    }
}

module.exports = Tab;