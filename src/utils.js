function createNode(data, vDOM) {
    var node = document.createElement(data.name);
    for (var i in data.attributes) {
        node.setAttribute(i, data.attributes[i]);
    }
    if (typeof data.childNodes !== "undefined")
        for (var i=0; i<data.childNodes.length; i++) {
            var child =createNode(data.childNodes[i], vDOM);
            if (typeof child !== "undefined")
                node.appendChild(child);
        }
    if (data instanceof vDOM.virtualTextNode)
        return document.createTextNode(data.value);
    return node;
}
var rquickExpr = /^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]+))$/;
function isHTML(str) {
    if (str[0] === "<" && str[str.length - 1] === ">" && str.length >= 3) {
            return true;
    } else {
        var match = rquickExpr.exec(str);
        return match !== null && match[1];
    }
}
function isNode() {
    var res = false; 
    try {
        res = Object.prototype.toString.call(global.process) === '[object process]' 
    } catch(e) {}
    return res;
}
module.exports = {
    createNode: createNode,
    isHTML: isHTML,
    isNode: isNode
}