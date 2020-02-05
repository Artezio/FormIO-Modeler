module.exports = function clearNode(...node) {
    node.forEach(node => node.innerHTML = "");
}