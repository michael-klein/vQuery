var vDOMUtils = require('./vDOMUtils.js');

module.exports = {
    //Set the value of a style for each element
    setStyle(nodes, property, value) {
        property = vDOMUtils.expandShorthandCSS(property);
        if (vDOMUtils.validateCSS(property, value)) {
            for (var i=0; i<nodes.length; i++) {
                var node = nodes[i];
                if (typeof node.attributes.style === "undefined")
                    node.attributes.style = "";
                var styles = vDOMUtils.styleToObject(node.attributes.style);  
                styles[property] = value;
                node.attributes.style = vDOMUtils.objectToStyle(styles);
            }
            vDOMUtils.setChanged(nodes[0]);
        }
    },
    //get the value of a style for the first element
    getStyle(nodes, property) {
        property = vDOMUtils.expandShorthandCSS(property);
        var node = nodes[0],
            styles = vDOMUtils.styleToObject(node.attributes.style);
        return styles[property];
    }
}