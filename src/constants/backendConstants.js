const { app } = require('electron');
const path = require('path');

exports.BASE_TITLE = 'FormBuilder';
exports.PATH_TO_WORKSPACES_INFO = path.resolve(app.getAppPath(), './src/recentWorkspaces.txt');
exports.PATH_TO_START_PAGE = path.resolve(app.getAppPath(), './src/pages/startPage/start.html');
exports.PATH_TO_FORM_EDITOR_PAGE = path.resolve(app.getAppPath(), './src/pages/formEditorPage/formEditor.html');
exports.SAVED = 'saved';
exports.NOT_SAVED = 'NOT_SAVED';
exports.MAX_RECENT_WORKSPACES = 5;
exports.CONFIRM_CONSTANTS = {
    YES: 'YES',
    NO: 'NO',
    CANCEL: 'CANCEL',
    NOT_SAVE: 'NOT_SAVE',
    SAVE: 'SAVE'
}
exports.FORM_TYPE = 'form';
exports.CUSTOM_COMPONENTS_FOLDER_NAME = '.customComponents';
exports.NOT_VALID_FORM = 'Not valid form';
exports.BASE_TITLE = 'FormBuilder'