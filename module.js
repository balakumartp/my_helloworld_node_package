import ResourceManager from 'resource-manager-js';
let Promise = require('es6-promise').Promise;
import waitForElementTransition from 'wait-for-element-transition';

/**
 * Bubbles up each parent node of the element, triggering the callback on each element until traversal
 * either runs out of parent nodes, reaches the document element, or if callback returns a falsy value
 * @param {Function} callback - A callback that fires which gets passed the current element
 * @param {HTMLElement} [startEl] - The element where traversal will begin (including the passed element), defaults to current el
 */
let traverseEachParent = function (callback, startEl) {
    let parentNode = startEl;
    let predicate = null;
    // check if the node has classname property, if not, we know we're at the #document element
    while (parentNode && typeof parentNode.className === 'string') {
        predicate = callback(parentNode);
        if (predicate !== undefined && !predicate) {
            break;
        }
        parentNode = parentNode.parentNode;
    }
};


/**
 * A function that fires when the module's load() method is called
 * @callback Module~onLoad
 * @return {*} May return a promise when done
 */


/**
 * A function that fires when the module's show() method is called
 * which can be overridden by subclass custom implementations.
 * @callback Module~onShow
 * @return {*} May return a promise when done
 */

/**
 * A function that fires when the module's hide() method is called
 * which can be overridden by subclass custom implementations.
 * @callback Module~onHide
 */

/**
 * A function that fires when the module's enable() method is called
 * @callback Module~onEnable
 */

/**
 * A function that fires when the module's disable() method is called
 * @callback Module~onDisable
 */

/**
 * A function that fires when the error() method is called
 * @callback Module~onError
 * @param {Object} [e] - The error object that was triggered
 */

/**
 * @class Module
 * @description Base class that represents all modules of an App.
 */
export default class Module {

    /**
     * Initialization.
     * @param {HTMLElement} el - The module element
     * @param {Object} [options] - An object of options
     * @param {string} [options.loadedClass] - The class that will be applied to the module element when it is loaded
     * @param {string} [options.activeClass] - The class that will be applied to the module element when it is shown
     * @param {string} [options.disabledClass] - The class that will be applied to the module element when disabled
     * @param {string} [options.errorClass] - The class that will be applied to the module element when it has a load error
     * @param {Array|string} [options.styles] - Array of stylesheet urls or single url
     * @param {string|HTMLTemplateElement|HTMLElement} [options.template] - The template to load (can be url to html file or html template, just an element, or an html string)
     * @param {Object|string} [options.data] - The data or url to the module's data
     * @param {Object} [options.requestOptions] - The request options to use when running the fetch method to get data
     * @param {Module~onLoad} [options.onLoad] - A function that fires when module's load() method is called
     * @param {Module~onShow} [options.onShow] - A function that fires when module is shown
     * @param {Module~onHide} [options.onHide] - A function that fires when module is hidden
     * @param {Module~onEnable} [options.onEnable] - A function that fires when module is enabled
     * @param {Module~onDisable} [options.onDisable] - A function that fires when module is disabled
     * @param {Module~onError} [options.onError] - A function that fires when module goes into error state
     */
    constructor (el, options) {

        options = options || {};

        if (!el) {
            console.error("Module error: No element was passed to constructor");
        }

        this.el = el;

        let defaultOptions = {
            loadedClass: 'module-loaded',
            activeClass: 'module-active',
            disabledClass: 'module-disabled',
            errorClass: 'module-error',
            styles: [],
            template: "",
            data: null,
            requestOptions: null,
            onLoad: function (){},
            onShow: function (){},
            onHide: function (){},
            onEnable: function (){},
            onDisable: function (){},
            onError: function (){},
        };

        // we are adding default options to passed custom options
        // to ensure all expected options exist when instantiating sub classes
        for (let name in defaultOptions) {
            if (defaultOptions.hasOwnProperty(name)) {
                if (!options[name]) {
                    options[name] = defaultOptions[name];
                }
            }
        }

        this.options = options;

        this._handleElementInitialState();

        this.subModules = {};
        this.active = false;
        this.loaded = false;
        this._elChildren = [];
        this.loadStatus = 'notLoaded';

    }

    /**
     * Loads the module's styles, template, and data and applies loaded css classes and state.
     * @return {Promise}
     */
    load () {
        if (!this.loaded) {
            this.loadStatus = 'loading';
            // load all subModules
            let loadPromises = [];
            for (let key in this.subModules) {
                if (this.subModules.hasOwnProperty(key)) {
                    let view = this.subModules[key];
                     loadPromises.push(view.load());
                }
            }
            return Promise.all(loadPromises)
                .then(() => {
                    return this.getStyles(this.options.styles).then(() => {
                            return this.fetchData(this.options.data, this.options.requestOptions).then((data) => {
                                return this.getTemplate(data).then((nodes) => {
                                    nodes = nodes || [];
                                    let frag = document.createDocumentFragment();
                                    // hold reference to children to remove them later
                                    while (nodes.length) {
                                        // order matters here so we always start from the first node
                                        let node = nodes[0];
                                        this._elChildren.push(node);
                                        // appending child changes length of nodes array
                                        frag.appendChild(node);
                                    }
                                    this.el.appendChild(frag);
                                    this.loaded = true;
                                    this.loadStatus = 'loaded';
                                    if (this.el) {
                                        this.el.classList.add(this.options.loadedClass);
                                    }
                                    this.options.onLoad();
                                });
                        });
                    });
                })
                .catch((e) => {
                    this.error(e);
                    // throw error to reject promise
                    throw e;
                });
        } else {
            return Promise.resolve();
        }
    }

    /**
     * Makes a request to get the data for the module.
     * @param {string|Object} url - The url to fetch data from or data object
     * @param [options] - fetch options
     * @returns {*}
     */
    fetchData (url, options) {
        if (typeof url !== 'string') {
            return Promise.resolve(url);
        }
        return ResourceManager.fetchData(url, options);
    }

    /**
     * Gets the css files for the module.
     * @param cssUrl
     * @return {Promise}
     */
    getStyles (cssUrl) {
        return ResourceManager.loadCss(cssUrl);
    }

    /**
     * Gets the html template for the module.
     * @returns {Promise} Returns a document fragment containing the contents of the template with the data injected
     */
    getTemplate () {
        let template = this.options.template || '';

        if (!template) {
            return Promise.resolve();
        }

        if (this._isHTMLTemplate(template)) {
            // template element
            // TODO: update to accommodate situations where the user wants to adoptNode instead of cloning it
            let tpl = document.importNode(template.content, true);
            return Promise.resolve(tpl.childNodes);
        } else if (template instanceof HTMLElement) {
            // already an html element
            let frag = document.createDocumentFragment();
            frag.appendChild(template);
            return Promise.resolve(frag.childNodes);
        } else {
            // html file
            let tempDiv = document.createElement('div');
            return ResourceManager.loadTemplate(template, tempDiv).then(() => {
                return tempDiv.childNodes;
            });
        }
    }

    /**
     * Checks if the provided template argument is indeed an html template element.
     * This is mainly for testing purposes where phantom is not aware of HTMLTemplateElement
     * @param template
     * @returns {boolean}
     * @private
     */
    _isHTMLTemplate (template) {
        return template instanceof HTMLTemplateElement;
    }

    /**
     * Triggers a load error on the module.
     * @param {Object} [err] - The error object to trigger
     * @return {Promise} Returns a promise when erroring operation is complete
     */
    error (err) {
        let e = err || new Error();

        this.el.classList.add(this.options.errorClass);

        this.errored = true;
        this.loaded = false;
        this.loadStatus = 'notLoaded';

        this.options.onError(e);
        return this.waitForTransition().then(() => {
            return e;
        });
    }

    /**
     * Enables the module.
     * @return {Promise}
     */
    enable () {
        let el = this.el;
        if (el) {
            el.classList.remove(this.options.disabledClass);
        }
        this.disabled = false;
        this.options.onEnable();
        return this.waitForTransition();
    }

    /**
     * Disables the module.
     * @return {Promise}
     */
    disable () {
        let el = this.el;
        if (el) {
            el.classList.add(this.options.disabledClass);
        }
        this.disabled = true;

        this.options.onDisable();
        return this.waitForTransition();
    }

    /**
     * Shows the module.
     * @return {Promise}
     */
    show () {
        let el = this.el;
        if (el) {
            el.classList.add(this.options.activeClass);
        }
        this.active = true;
        this.options.onShow();
        return this.waitForTransition();
    }

    /**
     * Hides the module.
     * @return {Promise}
     */
    hide () {
        let el = this.el;
        if (el) {
            el.classList.remove(this.options.activeClass);
        }
        this.active = false;
        this.options.onHide();
        return this.waitForTransition();
    }

    /**
     * Sets up element internally by evaluating its initial state.
     * @private
     */
    _handleElementInitialState () {
        let el = this.el;
        if (!el) {
            return;
        }
        if (el.classList.contains(this.options.disabledClass)) {
            this._origDisabled = true;
            this.disable();
        }

        if (el.classList.contains(this.options.errorClass)) {
            this._origError = true;
            this.error(new Error());
        }
    }

    /**
     * Restores the elements classes back to the way they were before instantiation.
     * @private
     */
    _resetElementInitialState () {
        let options = this.options,
            disabledClass = options.disabledClass,
            errorClass = options.errorClass;

        if (!this.el) {
            return;
        }
        if (this._origDisabled) {
            this.el.classList.add(disabledClass);
        } else {
            this.el.classList.remove(disabledClass);
        }

        if (!this._origError) {
            this.el.classList.remove(errorClass);
        } else {
            this.el.classList.add(errorClass);
        }
    }

    /**
     * Builds a transition promise that waits to resolve until the module el's CSS transition is completed (if applicable).
     * @returns {Promise} Returns a promise that resolves when the element has finished animating
     */
    waitForTransition () {
        return waitForElementTransition(this.el);
    }

    /**
     * Gets the closest ancestor element that has a css class.
     * @param {string} className - The class name that the ancestor must have to match
     * @param {Element} startTarget - The element the method should start from
     */
    getClosestAncestorElementByClassName (className, startTarget) {
        let result = null;
        traverseEachParent((parent) => {
            if (parent.classList.contains(className)) {
                result = parent;
                return false;
            }
        }, startTarget || this.el.parentNode || this.el);
        return result;
    }

    /**
     * Destroys all nested views and cleans up.
     */
    destroy () {
        let subModules = this.subModules;

        for (let key in subModules) {
            if (subModules.hasOwnProperty(key) && subModules[key]) {
                subModules[key].destroy();
            }
        }
        this.subModules = {};
        this.active = false;
        this.loaded = false;
        this.errored = false;
        this.loadStatus = 'notLoaded';

        this.el.classList.remove(this.options.loadedClass);
        this.el.classList.remove(this.options.activeClass);

        this._resetElementInitialState();

        this._elChildren.forEach((el) => {
            if (this.el.contains(el)) {
                this.el.removeChild(el);
            }
        });
        this._elChildren = [];
    }

}
