
var isReady = false,
    domready = require('domready'),
    vDOM = require('./vDOM.js'),
    diff = require('./diff.js'),
    render = require('./render.js'),
    virtualQuery = require('./virtualQuery.js'),
    selectorEngine = require('./selectorEngine.js'),
    isHTML = require('is-html'),
    cloneObject = require("clone");



domready(function () {
        isReady = true;
});

function renderTimer() {
    if (vDOM.newDOM.changed) {
        window.requestAnimationFrame(function() {
            var d = diff(vDOM.oldDOM, vDOM.newDOM, "html");
            if (d.length > 0)
                render.render(d, document.querySelector("html"));
            vDOM.oldDOM = cloneObject(vDOM.newDOM);
            vDOM.newDOM.changed = false;
            window.setTimeout(renderTimer, 1);
        });
    } else 
        window.setTimeout(renderTimer,1);
}

vQuery = function(arg) {
    switch (typeof arg) {
        case "function":
            if (isReady) {
                vDOM.prepareDOMs();
                window.setTimeout(renderTimer,1);
                arg();
            }
            else
                domready(function() {                    
                    vDOM.prepareDOMs();
                    window.setTimeout(renderTimer,1);
                    arg();
                });
            break;
        case "string":
                var nodes = selectorEngine.query(vDOM.newDOM,arg);
                if (nodes.length > 0) {
                    return new virtualQuery(nodes);
                } else return nodes;
            if (isHTML(arg)) {
                return new virtualQuery(vDOM.createVDOM(arg, true).children);
            } else {
                var nodes = selectorEngine.query(vDOM.newDOM,arg);
                if (nodes.length > 0) {
                    return new virtualQuery(nodes);
                } else return nodes;
            }  
        case "object":
            if (arg instanceof vDOM.virtualNode) {
                return new virtualQuery(arg);
            }        
    }
}
vQuery.getDOM = function() {
    return [vDOM.oldDOM, vDOM.newDOM];
}
