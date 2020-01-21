module.exports = function isForm(form) {
    return Boolean(form && form.title && form.path && form.type === 'form');
}