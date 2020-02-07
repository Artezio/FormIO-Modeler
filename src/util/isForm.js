module.exports = function isForm(form) {
    return Boolean(form && form._id && form.name && form.title && form.path && form.type === 'form');
}