var cloneObject = require("clone");
function clone(nodes) {
    var newNodes = [];
    for (var i=0; i<nodes.length; i++) {
        var clone = cloneObject(nodes[i]);
        if (clone.hasListeners)
            for (var event in clone.listeners) {
                for (var i = 0; i < clone.listeners[event].length; i++) {
                    var listener = clone.listeners[event][i];
                    listener._isAttached = false;
                }
            }
        newNodes.push(clone);
    } 
    newNodes.prototype = nodes.prototype;
    return newNodes;
}
function setChanged(node) {
    while (node.parentNode) {
        node = node.parentNode;
    }
    node.changed = true;
}
function expandShorthandCSS(str) {
    if (str.indexOf('-') > 0)
        return str;
    var result = str.replace(/([A-Z]+)/g, ",$1").replace(/^,/, "");
    return result.split(",").join("-").toLowerCase();
}
function validateCSS(property, value) {
    var element = document.createElement('div');
    element.style[property] = value;
    return element.style[property] === value;
}
function styleToObject(style) {
    if (style[style.length-1] === ";")
        style = style.slice(0,style.length-1); 
    style = style.replace(/ /g, "").split(";");
    var res = {};
    for (var i=0; i<style.length; i++) {
        var s = style[i];
        if (s!=="") {
            var ss = s.split(":");
            res[ss[0]] = ss[1];
        }
    }
    return res;
}
function objectToStyle(o) {
    var res = [];
    for (var i in o) {
        res.push(i + ": " + o[i]);
    }
    return res.join(";");
}
module.exports = {
    clone: clone,
    setChanged: setChanged,
    expandShorthandCSS: expandShorthandCSS,
    validateCSS: validateCSS,
    styleToObject: styleToObject,
    objectToStyle: objectToStyle
}