const fs = require('fs');

class WorkspaceService {
    constructor() {

    }

    setCurrentWorkspace(workspace) {
        this.currentWorkspace = workspace;
    }
}

module.exports = WorkspaceService;