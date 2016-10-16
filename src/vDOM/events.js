var vDOMUtils = require('./vDOMUtils.js');
module.exports = {
    on: function(nodes, event, callback) {
        for (var i=0; i<nodes.length; i++) {
            var node = nodes[i];
            var listener = (function(node, callback) {
                var newListener = function (event) {
                    callback.call(node, event);
                }
                newListener._originalCallback = callback;
                newListener._detach = false;
                newListener._isAttached = false;
                return newListener
            })(node, callback);
            if (typeof node.listeners[event] === "undefined")
                node.listeners[event] = [listener];
            else
                node.listeners[event].push(listener);
            node.hasListeners = true;
        }
        vDOMUtils.setChanged(nodes[0]);
    },
    off: function(nodes, event, callback) {
        for (var i=0; i<nodes.length; i++) {
            var node = nodes[i];
            if (typeof node.listeners[event] !== "undefined")
                for (var i=0; i<node.listeners[event].length; i++) {
                    var listener = node.listeners[event][i];
                    if (listener._originalCallback === callback && listener._isAttached)
                        listener._detach = true;
                }
            node.hasListeners = true;
        }
        vDOMUtils.setChanged(nodes[0]);
    }
}