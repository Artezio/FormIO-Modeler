const { ipcRenderer } = require('electron');


const ulElement = document.getElementById('workspacesList');

function run() {
    const unsubscribe = subscribeOnMainStreamEvents();
}

function subscribeOnMainStreamEvents() {
    ipcRenderer.on('showRecentWorkspaces', showRecentWorkspacesHandler);

    return function () {
        ipcRenderer.removeListener('showRecentWorkspaces', showRecentWorkspacesHandler);
    }
}

function showRecentWorkspacesHandler(event, recentWorkspacePaths) {
    appendWorkspacePathsList(ulElement, recentWorkspacePaths);
}

function appendWorkspacePathsList(node, workspacePaths) {
    const elements = workspacePaths.map(path => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = 'javascript:void(0)';
        a.textContent = path;
        a.onclick = e => {
            setWorkspace(path);
        }
        li.append(a);
        return li;
    })
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = 'javascript:void(0)';
    a.textContent = 'Open new workspace';
    a.onclick = e => {
        openNewWorkspace();
    }
    li.append(a);
    node.append(...elements, li);
}

function setWorkspace(path) {
    ipcRenderer.send('setWorkspace', path);
}

function openNewWorkspace() {
    ipcRenderer.send('openNewWorkspace');
}

run();