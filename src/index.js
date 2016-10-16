require("./arrayFunctions.js");
var isReady = false,
    domready = require('domready'),
    vDOM = require('./vDOM.js'),
    utils = require('./utils.js'),
    render = require('./render.js'),
    virtualQuery = require('./virtualQuery.js'),
    selectorEngine = require('./selectorEngine.js'),
    options = {
        autoUpdate: true,
        updateInterval: 1
    };



function prepareDOMs() {
    if (!vDOM.oldDOM) {
        vDOM.oldDOM = vDOM.createVDOM(document.querySelector('html').outerHTML, true);
        vDOM.newDOM = vDOM.createVDOM(document.querySelector('html').outerHTML, true);
        vDOM.newDOM.changed = false;
    }
}

domready(function () {
        isReady = true;
});

function renderTimer() {
    if (vDOM.newDOM.changed) {
        window.requestAnimationFrame(function() {
            render.update();
            window.setTimeout(renderTimer, 1);
        });
    } else 
        window.setTimeout(renderTimer,1);
}

function ready(cb) {
    prepareDOMs();
    if (options.autoUpdate)
        window.setTimeout(renderTimer, options.updateInterval);
    cb();
}
vQuery = function(arg, optionsIn) {
    switch (typeof arg) {
        case "function":
            if (typeof optionsIn === "object")
                options = Object.assign(options, optionsIn);
            if (isReady) {
                ready(arg);
            }
            else
                domready(function() {     
                    ready(arg);
                });
            break;
        case "string":
            prepareDOMs();
            if (utils.isHTML(arg)) {
                return new virtualQuery(vDOM.createVDOM(arg, true).children);
            } else {
                var nodes = selectorEngine.query(vDOM.newDOM,arg);
                if (nodes.length > 0) {
                    return new virtualQuery(nodes);
                } else return nodes;
            }  
        case "object":
            prepareDOMs();
            if (arg instanceof vDOM.virtualNode) {
                return new virtualQuery(arg);
            }        
    }
}

vQuery.afterRender = function(cb) {
    render.afterRenderCallbacks.push(cb);
};

vQuery.update = function () {
    render.update();
    return this;
}

vQuery.getDOM = function() {
    return [vDOM.oldDOM, vDOM.newDOM];
}
