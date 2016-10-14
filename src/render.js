
var vDOM = require('./vDOM.js'),
    docFrag = document.createDocumentFragment(),
    rendering = false;
var decodeEntities = (function() {
    // this prevents any overhead from creating the object each time
    var element = document.createElement('div');

    function decodeHTMLEntities (str) {
        if(str && typeof str === 'string') {
            // strip script/html tags
            str = str.replace(/<script[^>]*>([\S\s]*?)<\/script>/gmi, '');
            str = str.replace(/<\/?\w(?:[^"'>]|"[^"]*"|'[^']*')*>/gmi, '');
            element.innerHTML = str;
            str = element.textContent;
            element.textContent = '';
        }

        return str;
    }

    return decodeHTMLEntities;
})();
function createNode(data) {
    var node = document.createElement(data.name);
    for (var i in data.attributes) {
        node.setAttribute(i, data.attributes[i]);
    }
    if (typeof data.childNodes !== "undefined")
        for (var i=0; i<data.childNodes.length; i++) {
            var child =createNode(data.childNodes[i]);
            if (typeof child !== "undefined")
                node.appendChild(child);
        }
    if (data instanceof vDOM.virtualTextNode)
        node.appendChild(document.createTextNode(decodeEntities(data.value)));
    return node;
}
function handleListeners(domNode, listeners) {
    for (var event in listeners) {
            for (var i = 0; i < listeners[event].length; i++) {
                var listener = listeners[event][i];
                if (!listener._isAttached) {
                    listener._isAttached = true;
                    domNode.addEventListener(event, listener);
                }
        }
    }
}
function depth(node) {
    var d = 0;
    while (node = node.parentNode, node.localName !== "body") {
        d++;
    }
    return d;
}
function isDescendant(parent, child) {
    var node = child.parentNode;
    while (node != null) {
        if (node == parent) {
            return true;
        }
        node = node.parentNode;
    }
    return false;
}
var topDepth = Number.MAX_VALUE;
var topNodes = [];

function setTop(node, s) {
    for (i=0; i<topNodes.length; i++) {
        if (isDescendant(topNodes[i].n, node))
            return;
        if (isDescendant(node, topNodes[i].n)) {
            topNodes[i] = {
                s: s,
                n: node
            };
            return;
        }
        if (topNodes[i].s === s) {
            topNodes[i] = {
                s: s,
                n: node
            };
            return;
        }
    }

    topNodes.push({
        s: s,
        n: node
    });
}


module.exports = {
    isRendering: function() {
        return rendering;
    },
    render: function(ops,node) {
        var t = new Date().getTime();
        topNodes = []
        console.log("rendering start", t, ops);
        rendering = true;
        var root = node ? node : document.querySelector("html"),
            buffer = docFrag.appendChild(root.cloneNode(true));
        for (var i = 0; i < ops.length; i++) {
            var op = ops[i];
            switch (op.t) {
                case "remove":
                    var node = buffer.querySelector(op.p),
                        parent = node.parentNode ? node.parentNode : buffer;
                    setTop(parent, op.p);
                    parent.removeChild(node);
                    if (op.hl)
                        handleListeners(node, op.l);
                    break;
                case "addNode":
                    var newNode = createNode(op.n),
                        parent = op.p.length > 0 ? buffer.querySelector(op.p) : buffer;
                    parent.appendChild(newNode);
                    if (op.hl)
                        handleListeners(newNode, op.l);
                    setTop(parent, op.p);
                    break;
                case "replace":
                    var newNode = createNode(op.n),
                        node = buffer.querySelector(op.p),
                        parent = node.parentNode ? node.parentNode : buffer;
                    parent.replaceChild(newNode, node);
                    if (op.hl)
                        handleListeners(newNode, op.l);
                    setTop(parent, op.p);
                    break;
                case "attrChanged":
                    var n = buffer.querySelector(op.n);
                    n.setAttribute(op.a, op.v);
                    setTop(n, op.n)
                    break;
            }
        }
        for (i=0; i<topNodes.length; i++) {
            root.querySelector(topNodes[i].s).parentNode.replaceChild(topNodes[i].n, root.querySelector(topNodes[i].s));
        }
        docFrag.removeChild(buffer);
        console.log("rendering stop", (new Date().getTime() - t) / 1000, topNodes);
        rendering = false;
    }
}