module.exports = function getLoader() {
    const loaderImage = document.createElement('i');
    const loader = document.createElement('div');
    loaderImage.classList.add('loader', 'text-info');
    loader.classList.add('d-flex', 'justify-content-center', 'align-items-center', 'page-loader');
    loader.append(loaderImage);
    return loader;
}