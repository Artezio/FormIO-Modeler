const { ipcRenderer } = require('electron');
const clearNode = require('../../util/clearNode');

const listContainer = document.getElementById('list-wrapper');
const commandsContainer = document.getElementById('commands-wrapper');
const title = document.getElementById('title');
const listTitle = document.getElementById('list-wrapper-label');

function run() {
    const unsubscribe = subscribeOnMainStreamEvents();
    document.addEventListener('unload', unsubscribe);

    getRecentWorkspaces();
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

function setWorkspace(path) {
    ipcRenderer.send('setWorkspace.start', { payload: path });
}

function getRecentWorkspaces() {
    ipcRenderer.send('getRecentWorkspaces.start');
}

function loadForm(path) {
    ipcRenderer.send('loadForm', { payload: path });
}

function getForms() {
    ipcRenderer.send('getForms.start');
}

function getRecentWorkspacesEndHandler(event, response = {}) {
    if (!response.error) {
        const recentWorkspaces = response.payload;
        clearNode(listContainer, commandsContainer);
        const workspacesList = recentWorkspaces.map(workspace => ({
            title: workspace,
            callback: () => setWorkspace(workspace)
        }))
        listContainer.append(createList(workspacesList));
        commandsContainer.append(createList([{
            title: 'Open new',
            callback: () => setWorkspace()
        }]))
    }
}

function setWorkspaceEndHandler() {
    getForms();
}

function getFormsEndHandler(event, response = {}) {
    if (!response.error) {
        const forms = response.payload;
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
            callback: () => loadForm()
        }]))
    }
}

function subscribeOnMainStreamEvents() {
    ipcRenderer.on('getRecentWorkspaces.end', getRecentWorkspacesEndHandler);
    ipcRenderer.on('setWorkspace.end', setWorkspaceEndHandler);
    ipcRenderer.on('getForms.end', getFormsEndHandler);

    return function () {
        ipcRenderer.removeListener('getRecentWorkspaces.end', getRecentWorkspacesEndHandler);
        ipcRenderer.removeListener('setWorkspace.end', setWorkspaceEndHandler);
        ipcRenderer.removeListener('getForms.end', getFormsEndHandler);
    }
}

run();