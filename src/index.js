require("./arrayFunctions.js");
var isReady = false,
    vDOM = require('./vDOM/vDOM.js'),
    utils = require('./utils.js'),
    render = require('./render.js'),
    virtualQuery = require('./virtualQuery.js'),
    selectorEngine = require('./selectorEngine/selectorEngine.js'),
    domready = utils.isNode() ? null : require('domready'),
    options = require('./options.js');



function prepareDOMs() {
    if (!vDOM.oldDOM) {
        if (utils.isNode()) {
            vDOM.load("");
        } else {
            vDOM.load(document.querySelector('html').outerHTML);
        }
    }
}
if (domready)
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
    if (options.autoUpdate && !utils.isNode())
        window.setTimeout(renderTimer, options.updateInterval);
    cb();
}
var vQuery = function(arg, optionsIn) {
    switch (typeof arg) {
        case "function":
            if (typeof optionsIn === "object")
                options = Object.assign(options, optionsIn);
            if (isReady || utils.isNode()) {
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

vQuery.load = function(html) {
    return vDOM.load(html);
}
module.exports = vQuery;