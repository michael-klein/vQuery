var nodeTypes = require('./nodeTypes.js'),
    vDOMUtils = require('./vDOMUtils.js'),
    HTMLParser = require('htmlparser2'),
    htmlParser = (function() {
        var cNode,
            init=false,
            self,
            parser = new HTMLParser.Parser({
            onopentag: function (name, attribs) {
                var node = new nodeTypes.virtualNode(name, cNode);
                cNode.children.push(node);
                cNode.childNodes.push(node);
                cNode = node;
                for (var aName in attribs) {
                    var value = attribs[aName];
                    if (aName === "id")
                        cNode.id = value;
                    if (aName === "class")
                        cNode.classNames = value.split(" ");
                    cNode.attributes[aName] = value;
                }
            },
            ontext: function (value) {
                if (value.trim().length === 0) return;
                cNode.childNodes.push(new nodeTypes.virtualTextNode(value, cNode));
            },
            onclosetag: function (name) {
                if (cNode.name === name) {
                    if (init && cNode.id)
                        self.idNodes[cNode.id] = cNode;
                    cNode = cNode.parentNode;
                }
            }
        }, {decodeEntities: true});

        return function(html, initIn, cNodeIn, selfIn) {
            if (typeof initIn === "undefined")
                init = false;
            else init = initIn;
            self = selfIn;
            cNode = cNodeIn;
            parser.parseComplete(html);
        }
    }
    )();

module.exports = {
    idNodes: {},
    createVDOM: function (html, init) {
        cNode = new nodeTypes.virtualNode("root", null);
        htmlParser(html.replace(/\r?\n|\r/g, ""), init, cNode, this);
        return cNode;
    }
}
