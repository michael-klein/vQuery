
var isReady = false,
    domready = require('domready'),
    vDOM = require('./vDOM.js'),
    diff = require('./diff.js'),
    render = require('./render.js'),
    virtualQuery = require('./virtualQuery.js'),
    selectorEngine = require('./selectorEngine.js'),
    isHTML = require('is-html'),
    cloneObject = require("clone"),
    oldDOM,
    newDOM;

function prepareDOMs() {
    if (!oldDOM) {
        oldDOM = vDOM.createVDOM(document.querySelector('html').outerHTML);
        newDOM = vDOM.createVDOM(document.querySelector('html').outerHTML);
        newDOM.changed = false;
        console.log(oldDOM, newDOM, oldDOM === newDOM);
    }
}
domready(function () {
        isReady = true;
});

function renderTimer() {
    if (newDOM.changed) {
        window.requestAnimationFrame(function() {
            var d = diff(oldDOM, newDOM, "html");
            if (d.length > 0)
                render.render(d, document.querySelector("html"));
            oldDOM = cloneObject(newDOM);
            newDOM.changed = false;
            window.setTimeout(renderTimer, 1);
        });
    } else 
        window.setTimeout(renderTimer,1);
}

vQuery = function(arg) {
    switch (typeof arg) {
        case "function":
            if (isReady) {
                prepareDOMs();
                window.setTimeout(renderTimer,1);
                arg();
            }
            else
                domready(function() {                    
                    prepareDOMs();
                    window.setTimeout(renderTimer,1);
                    arg();
                });
            break;
        case "string":
            prepareDOMs();
            if (isHTML(arg)) {
                return new virtualQuery(vDOM.createVDOM(arg).children);
            } else {
                var nodes = selectorEngine.query(newDOM,arg);
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
//dev helper
vQuery.getDOM = function() {
    return [oldDOM, newDOM];
}
