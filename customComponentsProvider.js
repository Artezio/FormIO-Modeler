const fs = require('fs');
const path = require('path');

const CUSTOM_COMPONENTS_FOLDER_NAME = './.customComponents';
const FILE_EXTENSION = '.js';

class CustomComponentsProvider {
    constructor(workspace) {
        this.workspace = workspace;
    }

    get pathToCustomComponentsFolder() {
        return path.resolve(this.workspace, CUSTOM_COMPONENTS_FOLDER_NAME);
    }

    setWorkspace(workspace) {
        this.workspace = workspace;
    }

    async getCustomComponentsInfo() {
        try {
            let files = fs.readdirSync(this.pathToCustomComponentsFolder);
            files = files
                .filter(fileName => path.extname(fileName) === FILE_EXTENSION)
                .map(fileName => {
                    const name = fileName.slice(0, -path.extname(fileName).length);
                    return {
                        name,
                        path: path.resolve(this.pathToCustomComponentsFolder, fileName)
                    }
                })
            return files;
        } catch (err) {
            console.error(err);
            return [];
        }
    }

    getComponent() {

    }

    getComponents() {

    }
}

module.exports = CustomComponentsProvider;