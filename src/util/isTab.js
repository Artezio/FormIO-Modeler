module.exports = function isTab(tab) {
    if (typeof tab !== 'object' || !tab.id) return false;
    return true;
}