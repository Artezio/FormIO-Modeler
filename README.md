# FormBuilder

FormBuilder is standalone designer for forms in [FormIO](https://www.form.io/) format. Main features are: using [FormIO](https://www.form.io/) designer for creating forms and supporting custom components. FormioBuilder does not require any prerequisites installed on your computer.

![FormioBuilderPreview](./FormioBuilderPreview.png)

# Installation

1) Installers are in ["releases" section](https://github.com/Artezio/FormIO-editor/releases).

# Usage

FormBuilder works with workspaces(directories). To save form click appropriate button in toolbar or in menu, form will be saved in workspace. File name will be the same as "path" field, separators ("\\" or "/", according to OS) in path field will indicate on subfolders within workspace.

You can register custom components, written in accordance with [FormIO rules](https://github.com/formio/formio.js/wiki/Custom-Components-API), by appropriate button in toolbar/menu. Select one or multiple custom component(s) in dialog window. They will be instantly added to form designer and saved in workspace for future using. You can add them manually creating folder "custom-components" in workspace and putting custom components there. If you add them manually you have to restart application or reopen workspace to apply them. FormioBuilder tries to apply custom components every time you open form, if some files in custom-components folder are not valid, you will be informed by notification in the top right conner.

# Creating custom components

### Guide links

* https://github.com/formio/formio.js/wiki/Custom-Components-API
* https://formio.github.io/formio.js/app/examples/customcomponent.html

### Requirements

* You must use commonjs module style.
* File name must be the same as component type.
* If you use third party libraries, you must bundle them and your component in one file.
* You must not neither include formiojs in you bundle, nor remain imports of the library in the file. "Formio" global variable will be presented in working environment, so you must use it for inheritance purpose.

### Example of using base Component
```js
const Component = Formio.Components.components.base;

class CustomComponent extends Component {
    //...
}

module.exports = CustomComponent;
```