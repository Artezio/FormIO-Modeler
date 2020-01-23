module.exports = function fileNameFromPath(path) {
    const index = path.lastIndexOf('\\');
    return path.slice(index + 1);
}