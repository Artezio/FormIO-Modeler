const { ipcRenderer } = require('electron');
const clearNode = require('../../util/clearNode');
const path = require('path');

const title = document.getElementById('title');
const contentContainer = document.getElementById('content');

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
    ipcRenderer.send('getCurrentWorkspace.start');
}

function setCurrentWorkspace(path) {
    ipcRenderer.send('setCurrentWorkspace.start', { payload: path });
}

function openNewWorkspace() {
    ipcRenderer.send('changeCurrentWorkspace.start');
}

function getRecentWorkspaces() {
    ipcRenderer.send('getRecentWorkspaces.start');
}

function loadForm(form) {
    ipcRenderer.send('setCurrentForm.start', { payload: form });
}

function getForms() {
    ipcRenderer.send('getForms.start');
}

function openNewForm() {
    ipcRenderer.send('openNewForm.start');
}

function getCurrentWorkspaceEndHandler(event, result = {}) {
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

function getRecentWorkspacesEndHandler(event, result = {}) {
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

function setCurrentWorkspaceEndHandler(event, result) {
    currentWorkspace = result.payload;
    getForms();
}

function getFormsEndHandler(event, result = {}) {
    if (!result.error) {
        title.textContent = currentWorkspace;
        const forms = result.payload;
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
}

function subscribeOnMainStreamEvents() {
    ipcRenderer.on('getRecentWorkspaces.end', getRecentWorkspacesEndHandler);
    ipcRenderer.on('setCurrentWorkspace.end', setCurrentWorkspaceEndHandler);
    ipcRenderer.on('getForms.end', getFormsEndHandler);
    ipcRenderer.on('getCurrentWorkspace.end', getCurrentWorkspaceEndHandler);

    return function () {
        ipcRenderer.removeListener('getRecentWorkspaces.end', getRecentWorkspacesEndHandler);
        ipcRenderer.removeListener('setCurrentWorkspace.end', setCurrentWorkspaceEndHandler);
        ipcRenderer.removeListener('getForms.end', getFormsEndHandler);
        ipcRenderer.removeListener('getCurrentWorkspace.end', getCurrentWorkspaceEndHandler);
    }
}

run();