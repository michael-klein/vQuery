
var vDOM = require('./vDOM/vDOM.js'),
    utils = require('./utils.js'),
    diff = require('./diff.js'),
    cloneObject = require("clone"),
    rendering = false;

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


module.exports = {
    isRendering: function() {
        return rendering;
    },
    afterRenderCallbacks: [],
    update: function() {
        var d = diff(vDOM.oldDOM, vDOM.newDOM, "html");
        if (d.length > 0)
            this.render(d, document.querySelector("html"));
        for (var i = 0; i < this.afterRenderCallbacks.length; i++)
            this.afterRenderCallbacks[i]();
        vDOM.oldDOM = cloneObject(vDOM.newDOM);
        vDOM.newDOM.changed = false;
    },
    render: function(ops,node) {
        var t = new Date().getTime();
        console.log("rendering start", t, ops);
        rendering = true;
        var root = node ? node : document;
        for (var i = 0; i < ops.length; i++) {
            var op = ops[i];
            switch (op.t) {
                case "remove":
                    var node = root.querySelector(op.p),
                        parent = node.parentNode ? node.parentNode : root;
                    parent.removeChild(node);
                    if (op.hl)
                        handleListeners(node, op.l);
                    break;
                case "addNode":
                    var newNode = utils.createNode(op.n,vDOM),
                        parent = op.p.length > 0 ? root.querySelector(op.p) : root;
                    parent.appendChild(newNode);
                    if (op.hl)
                        handleListeners(newNode, op.l);
                    break;
                case "replace":
                    var newNode = utils.createNode(op.n,vDOM),
                        node = root.querySelector(op.p),
                        parent = node.parentNode ? node.parentNode : root;
                    parent.replaceChild(newNode, node);
                    if (op.hl)
                        handleListeners(newNode, op.l);
                    break;
                case "attrChanged":
                    root.querySelector(op.n).setAttribute(op.a, op.v);
                    break;
            }
        }
        console.log("rendering stop", (new Date().getTime() - t) / 1000);
        rendering = false;
    }
}