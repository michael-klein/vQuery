checkAttr = function (rules, node) {
    if (typeof rules.attrs === "undefined")
        return true;
    var attributeKeys = Object.keys(node.attributes);
    if (rules.attrs.length > attributeKeys.length)
        return false;
    for (var i=0; i<rules.attrs.length; i++) {
        var attr = rules.attrs[i],
            nodeAttr = node.attributes[attr.name.toLowerCase()];
        if (typeof nodeAttr === "undefined")
            return false;
        if (typeof attr.operator !== "undefined") {
            switch (attr.operator) {
                case "=":
                    if (nodeAttr !== attr.value) return false;
                case "~=":
                case "*=":
                    if (nodeAttr.indexOf(attr.value) !== -1) return false;
                case "|=":
                case "^=":
                    if (nodeAttr.indexOf(attr.value) === 0) return false;
                case "$=":
                    if (nodeAttr.indexOf(attr.value, nodeAttr.length - attr.value.length) !== -1) return false;
            }
        }
    }
    return true;
}
module.exports = {
    checkAttr:checkAttr
}