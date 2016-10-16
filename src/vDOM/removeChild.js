var vDOMUtils = require('./vDOMUtils.js');
module.exports = {
    //removes a virtual node from its parent
    removeNodes: function(nodes, ignoreSetChanged) {
        for (var i=0; i<nodes.length; i++) {
            var node = nodes[i];
            if (!node.parentNode) continue;
            if (node.id)
                delete this.idNodes[node.id];
            node.parentNode.children.splice(node.parentNode.children.indexOf(node),1);
            node.parentNode.childNodes.splice(node.parentNode.childNodes.indexOf(node),1);
        }
        if (ignoreSetChanged) return;
        vDOMUtils.setChanged(nodes[0]);
    }
}