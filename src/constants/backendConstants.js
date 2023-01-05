const { app } = require('electron');
const path = require('path');

const { NEW_FORM_NAME } = require('./mutual');

exports.BASE_TITLE = 'FormIO Modeler';
exports.PATH_TO_WORKSPACES_INFO = path.resolve(app.getPath('userData'), './recentWorkspaces.txt');
exports.PATH_TO_START_PAGE = path.resolve(app.getAppPath(), './pages/startPage/start.html');
exports.PATH_TO_FORM_EDITOR_PAGE = path.resolve(app.getAppPath(), './pages/formEditorPage/formEditor.html');
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
exports.CUSTOM_COMPONENTS_FOLDER_NAME = 'custom-components';
exports.TABS_INFO_FILE_NAME = 'openedTabs.json';
exports.NOT_VALID_FORM = 'Not valid form';
exports.NEW_FORM_NAME = NEW_FORM_NAME;