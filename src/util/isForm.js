module.exports = function isForm(form) {
    return Boolean(form && form.id && form.name && form.title && form.path && form.type === 'form');
}