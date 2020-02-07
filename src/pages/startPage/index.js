const { ipcRenderer } = require('electron');
const clearNode = require('../../util/clearNode');

const listContainer = document.getElementById('list-wrapper');
const commandsContainer = document.getElementById('commands-wrapper');
const title = document.getElementById('title');
const listTitle = document.getElementById('list-wrapper-label');

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
        a.classList.add('list-group-item', 'text-primary');
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
        const currentWorkspace = result.payload;
        if (currentWorkspace) {
            getForms();
        } else {
            getRecentWorkspaces();
        }
    } else {
        getRecentWorkspaces();
    }
}

function getRecentWorkspacesEndHandler(event, result = {}) {
    if (!result.error) {
        const recentWorkspaces = result.payload;
        clearNode(listContainer, commandsContainer);
        const workspacesList = recentWorkspaces.map(workspace => ({
            title: workspace,
            callback: () => setCurrentWorkspace(workspace)
        }))
        listContainer.append(createList(workspacesList));
        commandsContainer.append(createList([{
            title: 'Open new',
            callback: () => openNewWorkspace()
        }]))
    }
}

function setCurrentWorkspaceEndHandler() {
    getForms();
}

function getFormsEndHandler(event, result = {}) {
    if (!result.error) {
        const forms = result.payload;
        clearNode(listContainer, commandsContainer, title);
        title.textContent = "Select form";
        listTitle.textContent = "Forms";
        const formsList = forms.map(form => ({
            title: form.title,
            callback: () => loadForm(form)
        }))
        listContainer.append(createList(formsList));
        commandsContainer.append(createList([{
            title: 'Create new',
            callback: () => openNewForm()
        }]))
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