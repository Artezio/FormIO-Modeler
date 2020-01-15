const { ipcRenderer } = require('electron');

ipcRenderer.on('form.get.start', (event, args) => {
    const formJson = JSON.stringify(getForm());
    event.sender.send('form.get.end', formJson);
})
ipcRenderer.on('confirm.start', (event, args = {}) => {
    const { message } = args;
    const result = confirm(message);
    event.sender.send('confirm.end', result);
})
ipcRenderer.on('form.saved', () => {
    const notification = document.createElement('div');
    notification.className = 'alert alert-success saved-notification';
    notification.textContent = 'Saved successfully!';
    document.body.append(notification);
    setTimeout(notification.remove.bind(notification), 3000);
})

let formioBuilder;
Formio.builder(document.getElementById('builder'), {}).then(builder => {
    formioBuilder = builder;
})
const formTitle = document.getElementById('formTitle');
const formName = document.getElementById('formName');
const formPath = document.getElementById('formPath');

function getForm() {
    return {
        ...formioBuilder.schema,
        name: formName.value,
        path: formPath.value || 'newForm',
        title: formTitle.value,
        type: 'form',
        modified: new Date().toISOString()
    }
}