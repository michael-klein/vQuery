
var isReady = false,
    domready = require('domready'),
    vDOM = require('./vDOM.js'),
    diff = require('./diff.js'),
    render = require('./render.js'),
    virtualQuery = require('./virtualQuery.js'),
    selectorEngine = require('./selectorEngine.js'),
    cloneObject = require("clone"),
    rquickExpr = /^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]+))$/;


function isHTML(str) {
    //taken from the jQuery source: https://github.com/jquery/jquery/blob/master/src/core/init.js
    if (str[0] === "<" && str[str.length - 1] === ">" && str.length >= 3) {
            return true;
    } else {
        var match = rquickExpr.exec(str);
        return match !== null && match[1];
    }
}

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
vQuery.getDOM = function() {
    return [vDOM.oldDOM, vDOM.newDOM];
}
