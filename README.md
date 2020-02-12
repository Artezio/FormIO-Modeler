# FormiBuilder

FormBuilder is standalone application which can be installed launched on on most popular Operation Systems (currently only on windows). FormioBuilder was designed for creating forms. It uses [FormIO](https://www.form.io/) which is very convenient by it's Drag-and-Drop implementation. The main achievement of FormBuilder is supporting custom components (written on javaScript). Second achievement - FormioBuilder does not require any prerequisites installed on your computer. Forms are stored in json formate.

# How does it look like

![FormioBuilderPreview](./FormioBuilderPreview.png)

# Installation

1) Open "releases" section, open latest release and unfold Assets section. 
2) Download latest installer by clicking on it. 
3) Reveal it in you file manager and launch.

Application will be installed automatically to default programs folder on your computer and then launched. Shortcut also will be added on you desktop.

# Usage

## General

FormBuilder works with workspaces(directories), so it's a first step to start working with it. On start page click "Open new workspace" and choose workspace. After select workspace click "Open new form" and begin designing you form. To save form click appropriate button in toolbar or in menu, form will be saved in workspace. File name will be the same as "path" field, separators ("\\" or "/") in path field will indicate on subfolders within workspace.

## Custom Components

You can register custom components (.js files) by appropriate button in toolbar/menu. Select one or multiple custom component(s) in dialog window. They will be instantly added to form designer and saved in workspace for future using, section with custom components will appear in the bottom of designer.

You can add them manually creating folder "custom-components" in workspace and putting custom components there. If you add them manually you will have to restart application or reopen workspace to apply them.

# Creating custom components

### List of resources

* https://github.com/formio/formio.js/wiki/Custom-Components-API
* https://formio.github.io/formio.js/app/examples/customcomponent.html

### Requirements

* You must use commonjs module style.
* When importing formiojs modules you must import them as default 
```js
const Component = require('formiojs/components/_classes/component/Component').default;
```
* If you use third party libraries you must bundle they and your component in 1 js file
* You must not include formiojs into you bundle

### Example of webpack-config for bundling third party libraries via webpack

```js
const path = require('path');

module.exports = {
    entry: './TextEditor.js',
    output: {
        path: path.resolve(__dirname, './testDist'),
        filename: 'texteditor.js',
        libraryTarget: 'umd',
        library: 'TextEditor',
    },
    externals: {
        formiojs: "formiojs"
    }
}
```