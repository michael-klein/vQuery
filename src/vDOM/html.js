var utils = require('../utils.js'),
    vDOMUtils = require('./vDOMUtils.js');
module.exports = {
    //generated virtual DOM from passed html and replaces the children of the passed nodes with it
    setHTML: function(nodes, html) {
        var self = this;
        function removeHelper(nodes) {
            for (var i=0; i<node.children.length; i++)
                removeHelper(node.children[i]);
            self.removeNodes(node.children);
        }
        function addHelper(nodes) {
            for (var i=0; i<node.children.length; i++) {
                addHelper(node.children[i]);
                if (node.children[i].id)
                    self.idNodes = node.children[i];
            }
        }
        for (var i=0; i<nodes.length; i++) {
            var node = nodes[i];
            removeHelper(node);
            node.children = this.createVDOM(html).children;
            addHelper(node.children);
            node.childNodes = this.createVDOM(html).childNodes;    
        }
        vDOMUtils.setChanged(nodes[0]);
    },
    //return innerHTML for a node
    getHTML: function(nodes, html) {
        return utils.createNode(nodes[0], this).innerHTML;
    }
}