var vDOMUtils = require('./vDOMUtils.js');
module.exports = {
    //Get the value of an attribute for the first element in the set of matched elements
    getAttribute(nodes, attribute) {
        var node = nodes[0];
        if (typeof node.attributes[attribute.toLowerCase()] !== "undefined")
            return node.attributes[attribute.toLowerCase()];
        return undefined;
    },
    //Set the value of an attribute for each element
    setAttribute(nodes, attribute, value) {
        for (var i=0; i<nodes.length; i++) {
            var node = nodes[i];
            node.attributes[attribute.toLowerCase()] = value;
        }
        vDOMUtils.setChanged(nodes[0]);
    }
}