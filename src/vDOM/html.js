var utils = require('../utils.js'),
    nodeTypes = require('./nodeTypes.js')
    vDOMUtils = require('./vDOMUtils.js'),
    selfClosing = ["area","base","br","col","command","embed","hr","img","input","keygen","link","meta","param","source","track","wbr"];

var generateHTML = function(node) {
    if (node instanceof nodeTypes.virtualNode) {
        var res = "<" + node.name;
        for (var name in node.attributes) {
            res += " " + name + "=\"" + node.attributes[name] + "\"";
        }
        if (selfClosing.indexOf(node.name) > -1) {
            res +="/>";
            return res;
        }
        res+=">";
        for (var i=0; i<node.childNodes.length; i++) {
            res += generateHTML(node.childNodes[i]);
        }
        res += "</" + node.name + ">";
        return res;
    } else {
        return node.value;
    }
}

module.exports = {
    //generated virtual DOM from passed html and replaces the children of the passed nodes with it
    setHTML: function(nodes, html) {
        var self = this;
        function removeHelper(node) {
            for (var i=0; i<node.children.length; i++)
                removeHelper(node.children[i]);
            self.removeNodes(node.children);
        }
        function addHelper(nodes) {
            for (var i=0; i<nodes.length; i++) {
                addHelper(nodes[i]);
                if (nodes[i].id)
                    self.idNodes = nodes[i];
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
    getHTML: function(nodes) {
        var res = "";
        for (var i=0; i<nodes.length; i++) {
            for (var k=0; k<nodes[i].children.length; k++) {
                res+= generateHTML(nodes[i].children[k]);
            }
        }
        return res;
    }
}