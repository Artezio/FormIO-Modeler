const fs = require('fs');
const path = require('path');

const CUSTOM_COMPONENTS_FOLDER_NAME = './.customComponents';
const FILE_EXTENSION = '.js';

class CustomComponentsProvider {
    constructor(workspace) {
        this.workspace = workspace;
        this.customComponentsInfo = [];
    }

    get pathToCustomComponentsFolder() {
        return path.resolve(this.workspace, CUSTOM_COMPONENTS_FOLDER_NAME);
    }

    setWorkspace(workspace) {
        this.workspace = workspace;
    }

    async getCustomComponentsInfo() {
        try {
            const files = fs.readdirSync(this.pathToCustomComponentsFolder);
            const componentsInfo = files
                .filter(fileName => path.extname(fileName) === FILE_EXTENSION)
                .map(fileName => {
                    const name = fileName.slice(0, -path.extname(fileName).length);
                    return {
                        name,
                        path: path.resolve(this.pathToCustomComponentsFolder, fileName)
                    }
                })
            this.customComponentsInfo = componentsInfo;
            return this.customComponentsInfo;
        } catch (err) {
            console.error(err);
            return [];
        }
    }

    componentExistsByPath(filePath) {
        const name = path.basename(filePath).slice(0,  path.basename(filePath).length - 3);
        return this.customComponentsInfo.findIndex(info => info.name === name) !== -1;
    }

    addCustomComponentByPath(filePath) {
        const name = path.basename(filePath).slice(0, filePath.length - 3);
        const folderExists = fs.existsSync(this.pathToCustomComponentsFolder);
        if (!folderExists) {
            fs.mkdirSync(this.pathToCustomComponentsFolder);
        }
        try {
            const newCustomComponentInsides = fs.readFileSync(filePath, { encoding: 'utf8' });
            fs.writeFileSync(path.resolve(this.pathToCustomComponentsFolder, name), newCustomComponentInsides, { encoding: 'utf8' });
        } catch (err) {
            console.error(err);
            return false;
        }
        return true;
    }
}

module.exports = CustomComponentsProvider;