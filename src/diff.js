var vDOM = require('./vDOM.js');
if (!Array.prototype.filter) {
    Array.prototype.filter = function (fun/*, thisArg*/) {
        'use strict';

        if (this === void 0 || this === null) {
            throw new TypeError();
        }

        var t = Object(this);
        var len = t.length >>> 0;
        if (typeof fun !== 'function') {
            throw new TypeError();
        }

        var res = [];
        var thisArg = arguments.length >= 2 ? arguments[1] : void 0;
        for (var i = 0; i < len; i++) {
            if (i in t) {
                var val = t[i];

                // NOTE: Technically this should Object.defineProperty at
                //       the next index, as push can be affected by
                //       properties on Object.prototype and Array.prototype.
                //       But that method's new, and collisions should be
                //       rare, so use the more-compatible alternative.
                if (fun.call(thisArg, val, i, t)) {
                    res.push(val);
                }
            }
        }

        return res;
    };
}
Array.prototype.diff = function (a) {
    return this.filter(function (i) { return a.indexOf(i) < 0; });
};
Array.prototype.unique = function () {
    var seen = {}
    return this.filter(function (x) {
        if (seen[x])
            return
        seen[x] = true
        return x
    })
};

/**
 * Returns the CSS patch to a given DOM node.
 * @memberof server#diff
 * @inner
 * @param {element} node DOM node.
 * @param {immutableList} path Current path in the tree.
 * @returns {string} CSS path
 */
function getPath(node, path) {
    var p = path.join(">").replace(/ /g, "");
    if (p.charAt(0) === ">")
        p = p.substring(1);
    return p;
}

function getParentPath(node, path) {
    var p = node.parentNode,
        newPath = path.slice(0);
    newPath.pop();
    var p = newPath.join(">").replace(/ /g, "");
    if (p.charAt(0) === ">")
        p = p.substring(1);
    return p;
}

function addToPath(path, val) {
    var newPath = path.slice(0);
    newPath.push(val);
    return newPath;
}
/**
 * Diff algorithm. Generates a DOM patch.
 * @param {document} oldDoc Old document.
 * @param {document} doc New document.
 * @fires diff.done
 * @returns {Array} DOM patch to be send to the client.
 */
module.exports = function (DOM1, DOM2, entry) {
    var ops = [],
        removals = [];

    /**
     * Helper function that iterates through both trees and compares nodes.
     * @memberof server#diff
     * @inner
     * @param {element} oldNode Current node in oldDoc
     * @param {element} newNode Current node in newDoc
     * @param {immutableList} path Current path in the trees
     * @param {integer} index The index of the nodes in the current tree level.
     */
    function helper(oldNode, newNode, path, index, childNodesIndex) {
        //check if there is the same kind of node in this position
        if (!(oldNode.name !== newNode.name)) {
            var oldKeys = Object.keys(oldNode.attributes),
                newKeys = Object.keys(newNode.attributes),
                removed = oldKeys.diff(newKeys),
                added = newKeys.diff(oldKeys),
                toCompare = newKeys.concat(oldKeys).diff(removed).diff(added).unique();

            for (var i = 0; i < toCompare.length; i++) {
                if (newNode.attributes[toCompare[i]] !== oldNode.attributes[toCompare[i]]) {
                    ops.push({
                        t: "attrChanged",
                        n: getPath(newNode, path),
                        a: toCompare[i],
                        v: newNode.attributes[toCompare[i]]
                    });
                }
            }
            for (var i = 0; i < added.length; i++) {
                ops.push({
                    t: "attrChanged",
                    n: getPath(newNode, path),
                    a: added[i],
                    v: newNode.attributes[added[i]]
                });
            }
            for (var i = 0; i < removed.length; i++) {
                ops.push({
                    t: "attrRemoved",
                    n: getPath(newNode, path),
                    a: removed[i]
                });
            }
            var newChildren = typeof newNode.childNodes !== "undefined" ? [].concat(newNode.childNodes) : [],
                oldChildren = typeof oldNode.childNodes !== "undefined" ? [].concat(oldNode.childNodes) : [],
                discrepancy = oldNode.childNodes.length - oldNode.children.length,
                max = Math.max(newChildren.length, oldChildren.length);
            for (var i = 0; i < max; i++) {
                var oldChild = oldChildren[i],
                    newChild = newChildren[i],
                    newIndex = i - discrepancy;
                //check if new Node is not in old doc -> insert
                if (typeof oldChild === "undefined") {
                    if (newChild instanceof vDOM.virtualTextNode) {
                        ops.push({
                            t: "textAdd",
                            v: newNode.value,
                            p: getPath(newNode, path)
                        });
                        newChildren.splice(i, 1);
                        i--;
                        if (newChildren.length > oldChildren.length) {
                            max--;
                        }
                    } else {
                        var newPath = newChild.name === "html" ? path : addToPath(path, newChild.name + ":nth-child(" + (newIndex + 1) + ")");
                        ops.push({
                            t: "addNode",
                            p: getParentPath(newNode, newPath),
                            n: newChild,
                            l: newChild.listeners,
                            hl: newChild.hasListeners
                        });
                    }
                } else {
                    if (oldChild instanceof vDOM.virtualTextNode && newChild instanceof vDOM.virtualTextNode) {
                        if (oldChild.value !== newChild.value)
                            ops.push({
                                t: "textChange",
                                v: newChild.value,
                                p: getPath(oldNode, path),
                                i: childNodesIndex
                            });
                    } else
                        if (typeof newChild === "undefined") {
                            if (oldChild instanceof vDOM.virtualTextNode) {
                                ops.push({
                                    t: "textRemove",
                                    i: childNodesIndex,
                                    p: getPath(oldNode, path)
                                });
                            } else {
                                var newPath = oldChild.name === "html" ? path : addToPath(path, oldChild.name + ":nth-child(" + (newIndex + 1) + ")");
                                removals.unshift({
                                    t: "remove",
                                    p: getPath(oldChild, newPath),
                                    i: newIndex
                                });
                            }
                        } else {
                            if (oldChild instanceof vDOM.virtualTextNode && !(newChild instanceof vDOM.virtualTextNode)) {
                                ops.push({
                                    t: "textRemove",
                                    i: childNodesIndex,
                                    p: getPath(oldNode, path)
                                });
                                oldChildren.splice(i, 1);
                                i--;
                                if (newChildren.length < oldChildren.length) {
                                    max--;
                                }
                            } else
                                if (!(oldChild instanceof vDOM.virtualTextNode) && newChild instanceof vDOM.virtualTextNode) {
                                    ops.push({
                                        t: "textAdd",
                                        v: newNode.value,
                                        p: getPath(newNode, path)
                                    });
                                    newChildren.splice(i, 1);
                                    i--;
                                    if (newChildren.length > oldChildren.length) {
                                        max--;
                                    }
                                } else {
                                    if (typeof oldChild.name === "undefined")
                                        console.log("dan")
                                    var newPath = oldChild.name === "html" ? path : addToPath(path, oldChild.name + ":nth-child(" + (newIndex + 1) + ")");
                                    if (newChild.hasListeners) {
                                        var domNode = document.querySelector(getPath(oldChild, newPath));
                                        for (var event in newChild.listeners) {
                                            for (var i=0; i<newChild.listeners[event].length; i++) {
                                                var listener = newChild.listeners[event][i];
                                                if (!listener._isAttached) {
                                                    listener._isAttached = true;
                                                    domNode.addEventListener(event, listener);
                                                }
                                            }
                                        }
                                    }
                                    helper(oldChild, newChild, newPath, newIndex, i);
                                }
                        }
                }
            }
        } else {
            ops.push({
                t: "replace",
                p: getPath(newNode, path),
                n: newNode,
                i: index,
                l: newChild.listeners,
                hl: newChild.hasListeners
            });
        }
    }
    console.log(DOM1, DOM2)
    helper(DOM1, DOM2, [entry], 1);
    return ops.concat(removals);
}