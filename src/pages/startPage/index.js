const clearNode = require('../../util/clearNode');
const getLoader = require('../../util/getLoader');
const BackendChanel = require('../../channels/backendChanel');

const backendChanel = new BackendChanel();
const title = document.getElementById('title');
const contentContainer = document.getElementById('content');
const loader = getLoader();

let currentWorkspace;

function run() {
    const unsubscribe = subscribeOnMainStreamEvents();
    document.addEventListener('unload', unsubscribe);
    getCurrentWorkspace();
}

function createList(list) {
    const div = document.createElement('div');
    div.classList.add('list-group', 'list-group-flush');
    list.forEach(({ title, callback }) => {
        const a = document.createElement('a');
        a.classList.add('text-primary');
        a.href = 'javascript:void(0)';
        a.onclick = callback;
        a.textContent = title;
        div.append(a);
    })
    return div;
}

function getCurrentWorkspace() {
    backendChanel.send('getCurrentWorkspace');
}

function setCurrentWorkspace(path) {
    backendChanel.send('setCurrentWorkspace', path);
}

function openNewWorkspace() {
    backendChanel.send('changeCurrentWorkspace');
}

function getRecentWorkspaces() {
    backendChanel.send('getRecentWorkspaces');
}

function loadForm(form) {
    backendChanel.send('setCurrentForm', form);
}

function getForms() {
    backendChanel.send('getForms');
}

function openNewForm() {
    backendChanel.send('openNewForm');
}

function getCurrentWorkspaceHandler(event, result = {}) {
    if (!result.error) {
        currentWorkspace = result.payload;
        if (currentWorkspace) {
            getForms();
        } else {
            getRecentWorkspaces();
        }
    } else {
        getRecentWorkspaces();
    }
}

function createColumn(className, title, list) {
    const div = document.createElement('div');
    div.className = className;
    const label = document.createElement('label');
    label.className = 'h4';
    label.textContent = title;
    div.append(label);
    div.append(list);
    return div;
}

function getRecentWorkspacesHandler(event, result = {}) {
    if (!result.error) {
        const recentWorkspaces = result.payload;
        clearNode(contentContainer);
        if (recentWorkspaces.length) {
            const workspacesList = createList(recentWorkspaces.map(workspace => ({
                title: workspace,
                callback: () => setCurrentWorkspace(workspace)
            })))
            contentContainer.append(createColumn('col-auto', 'Recent', workspacesList));
        }
        const commandsList = createList([{
            title: 'Open new',
            callback: () => openNewWorkspace()
        }])
        contentContainer.append(createColumn('col', 'Start', commandsList));
    }
}

function setCurrentWorkspaceHandler(event, result) {
    currentWorkspace = result.payload;
    getForms();
}

function getFormsHandler(event, result = {}) {
    let forms;
    if (!result.error) {
        forms = result.payload;
    } else {
        forms = [];
    }
    title.textContent = currentWorkspace;
    clearNode(contentContainer);
    if (forms.length) {
        const formsList = createList(forms.map(form => {
            const title = `${form.path} (${form.title})`;
            return {
                title,
                callback: () => loadForm(form)
            }
        }));
        contentContainer.append(createColumn('col-auto', 'Forms', formsList));
    }
    const commandsList = createList([{
        title: 'Create new form',
        callback: () => openNewForm()
    }])
    contentContainer.append(createColumn('col', 'Start', commandsList));
}

function attachLoaderHandler() {
    document.body.append(loader);
}

function detachLoaderHandler() {
    document.body.removeChild(loader);
}

function subscribeOnMainStreamEvents() {
    backendChanel.on('getRecentWorkspaces', getRecentWorkspacesHandler);
    backendChanel.on('setCurrentWorkspace', setCurrentWorkspaceHandler);
    backendChanel.on('getForms', getFormsHandler);
    backendChanel.on('getCurrentWorkspace', getCurrentWorkspaceHandler);
    backendChanel.on('attachLoader', attachLoaderHandler);
    backendChanel.on('detachLoader', detachLoaderHandler);

    return function () {
        backendChanel.off('getRecentWorkspaces', getRecentWorkspacesHandler);
        backendChanel.off('setCurrentWorkspace', setCurrentWorkspaceHandler);
        backendChanel.off('getForms', getFormsHandler);
        backendChanel.off('getCurrentWorkspace', getCurrentWorkspaceHandler);
        backendChanel.off('attachLoader', attachLoaderHandler);
        backendChanel.off('detachLoader', detachLoaderHandler);
    }
}

run();