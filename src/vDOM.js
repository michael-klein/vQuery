
//# Virtual DOM
var HTMLParser = require('htmlparser2'),
    htmlParser = (function() {
        var cNode,
            init=false,
            self,
            parser = new HTMLParser.Parser({
            onopentag: function (name, attribs) {
                var node = new virtualNode(name, cNode);
                cNode.children.push(node);
                cNode.childNodes.push(node);
                cNode = node;
                for (var aName in attribs) {
                    var value = attribs[aName];
                    if (aName === "id")
                        cNode.id = value;
                    if (aName === "class")
                        cNode.classNames.push(value.split(" "));
                    cNode.attributes[aName] = value;
                }
            },
            ontext: function (value) {
                if (value.trim().length === 0) return;
                cNode.childNodes.push(new virtualTextNode(value, cNode));
            },
            onclosetag: function (name) {
                if (cNode.name === name) {
                    cNode = cNode.parentNode;
                    if (init && cNode.id)
                        self.idNodes[cNode.id] = cNode;
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
    )(),
    utils = require('./utils.js'),
    cloneObject = require("clone");
//## sets the root node to "changed"

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
function virtualNode(name, parentNode) {
    Object.assign(this, {
            name: name,
            parentNode: parentNode,
            attributes: {},
            classNames: [],
            path: "",
            children: [],
            childNodes: [],
            id: null,
            listeners: {},
            hasListeners: false,
            removeListeners: []
    });
};
function virtualTextNode(value, parentNode) {
    Object.assign(this, {
            parentNode: parentNode,
            value: value
    });
};
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
    //### creates a virtual DOM from passed HTML
    virtualNode: virtualNode,
    virtualTextNode: virtualTextNode,
    newDOM: null,
    oldDOM: null,
    idNodes: {},
    createVDOM: function (html, init) {
        cNode = new virtualNode("root", null);
        htmlParser(html.replace(/\r?\n|\r/g, ""), init, cNode, this);
        return cNode;
    },
    //creates a new vitual node from passed html and appends it to all virtual nodes
    addChildFromHtml: function(nodes, html, position) {
        var self = this;
        switch (typeof position) {
            case "string":
                    if (position === "start") {
                        for (var i=0; i<nodes.length; i++) {
                            var newDOM = this.createVDOM(html);
                            for (var j=0; j<newDOM.children.length; j++) {
                                newDOM.children[j].parentNode = nodes[i];
                                nodes[i].children.unshift(newDOM.children[j]);
                                nodes[i].childNodes.unshift(newDOM.childNodes[j]);
                                if (newDOM.childNodes[j].id)
                                    self.idNodes[newDOM.childNodes[j].id] = newDOM.childNodes[j];
                            }
                        }
                    } if (position === "end") {
                        for (var i=0; i<nodes.length; i++) {
                            var newDOM = this.createVDOM(html);
                            for (var j=0; j<newDOM.children.length; j++) {
                                newDOM.children[j].parentNode = nodes[i];
                                nodes[i].children.push(newDOM.children[j]);
                                nodes[i].childNodes.push(newDOM.childNodes[j]);
                                if (newDOM.childNodes[j].id)
                                    self.idNodes[newDOM.childNodes[j].id] = newDOM.childNodes[j];
                            }
                        }
                    }
                break;
            case "number":
                    for (var i=0; i<nodes.length; i++) {
                        var newDOM = this.createVDOM(html);
                        for (var j=0; j<newDOM.children.length; j++) {
                            newDOM.children[j].parentNode = nodes[i];
                            nodes[i].childNodes.splice(position, nodes[i].childNodes.indexOf(nodes[i].children[position]), newDOM);
                            nodes[i].children.splice(position, 0, newDOM.children[j]);
                            if (newDOM.childNodes[j].id)
                                self.idNodes[newDOM.childNodes[j].id] = newDOM.childNodes[j];
                        }
                    }
                break;
        }
        setChanged(nodes[0]);
    },
    addChildFromVNodes: function(nodes, vNodes, position) {
        this.removeNodes(vNodes, true);
        var clones = [],
            self = this;
        switch (typeof position) {
            case "string":
                    if (position === "start") {
                        for (var i=0; i<nodes.length; i++) {
                            var newDOM = clone(vNodes);
                            clones = clones.concat(newDOM);
                            nodes[i].children = newDOM.concat(nodes[i].children);
                            nodes[i].childNodes = newDOM.concat(nodes[i].childNodes);
                            for (var k=0; k<newDOM.length; k++) {
                                newDOM[k].parentNode = nodes[i];
                                if (newDOM[k].id)
                                    self.idNodes[newDOM[k].id] = newDOM[k];
                            }
                        }
                    } if (position === "end") {
                        for (var i=0; i<nodes.length; i++) {
                            var newDOM = clone(vNodes);
                            clones = clones.concat(newDOM);
                            nodes[i].children = nodes[i].children.concat(newDOM);
                            nodes[i].childNodes = nodes[i].childNodes.concat(newDOM);
                            for (var k=0; k<newDOM.length; k++) {
                                newDOM[k].parentNode = nodes[i];
                                if (newDOM[k].id)
                                    self.idNodes[newDOM[k].id] = newDOM[k];
                            }
                        }
                    }
                break;
            case "number":
                    for (var i=0; i<nodes.length; i++) {
                        var newDOM = this.createVDOM(html);
                        for (var j=0; j<newDOM.children.length; j++) {
                            var newDOM = clone(vNodes);
                            clones = clones.concat(newDOM);
                            nodes[i].childNodes.splice(position, nodes[i].childNodes.indexOf(nodes[i].children[position]), newDOM);
                            nodes[i].children.splice(position, 0, newDOM);
                            for (var k=0; k<newDOM.length; k++) {
                                newDOM[k].parentNode = nodes[i];
                                if (newDOM[k].id)
                                    self.idNodes[newDOM[k].id] = newDOM[k];
                            }
                        }
                    }
                break;
        }
        setChanged(nodes[0]);
        return clones;
    },
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
        setChanged(nodes[0]);
    },
    //checks all nodes if they have the supplied classes
    hasClass: function(nodes, classIn) {
        for (var i=0; i<nodes.length; i++) {
            var node = nodes[i];
            if (node.classNames.indexOf(classIn.toLowerCase()) > -1)
                return true;
        }
        return false;
    },
    //removes classes from all virtual nodes
    removeClasses: function(nodes, classes) {
        classes = classes.split(' ');
        for (var i=0; i<nodes.length; i++) {
            var node = nodes[i];
                for (var j=0; j<classes.length; j++) {
                    if (typeof classes[j] === "undefined") continue;
                    var index = node.classNames.indexOf(classes[j].toLowerCase());
                    if (index > -1) {
                        node.classNames.splice(index,1);
                    }
                }
            node.attributes.class = node.classNames.join(' ');
        }
        setChanged(nodes[0]);
    },
    //adds classs to all virtual nodes
    addClasses: function(nodes, classes) {
        classes = classes.split(' ');
        for (var i=0; i<nodes.length; i++) {
            var node = nodes[i];
                for (var j=0; j<classes.length; j++) {
                    if (typeof classes[j] === "undefined") continue;
                    if (node.classNames.indexOf(classes[j].toLowerCase()) === -1) {
                        node.classNames.push(classes[j].toLowerCase());
                    }
                }
            node.attributes.class = node.classNames.join(' ');
        }
        setChanged(nodes[0]);
    },
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
        setChanged(nodes[0]);
    },
    //return innerHTML for a node
    getHTML: function(nodes, html) {
        return utils.createNode(nodes[0], this).innerHTML;
    },
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
        setChanged(nodes[0]);
    },
    //Set the value of a style for each element
    setStyle(nodes, property, value) {
        property = expandShorthandCSS(property);
        if (validateCSS(property, value)) {
            for (var i=0; i<nodes.length; i++) {
                var node = nodes[i];
                if (typeof node.attributes.style === "undefined")
                    node.attributes.style = "";
                var styles = styleToObject(node.attributes.style);  
                styles[property] = value;
                node.attributes.style = objectToStyle(styles);
            }
            setChanged(nodes[0]);
        }
    },
    //get the value of a style for the first element
    getStyle(nodes, property) {
        property = expandShorthandCSS(property);
        var node = nodes[0],
            styles = styleToObject(node.attributes.style);
        return styles[property];
    },
    clone: function(node) {
        return clone(node);
    },
    on: function(nodes, event, callback) {
        for (var i=0; i<nodes.length; i++) {
            var node = nodes[i];
            var listener = (function(node, callback) {
                var newListener = function (event) {
                    callback.call(node, event);
                }
                newListener._originalCallback = callback;
                newListener._detach = false;
                newListener._isAttached = false;
                return newListener
            })(node, callback);
            if (typeof node.listeners[event] === "undefined")
                node.listeners[event] = [listener];
            else
                node.listeners[event].push(listener);
            node.hasListeners = true;
        }
        setChanged(nodes[0]);
    },
    off: function(nodes, event, callback) {
        for (var i=0; i<nodes.length; i++) {
            var node = nodes[i];
            if (typeof node.listeners[event] !== "undefined")
                for (var i=0; i<node.listeners[event].length; i++) {
                    var listener = node.listeners[event][i];
                    if (listener._originalCallback === callback && listener._isAttached)
                        listener._detach = true;
                }
            node.hasListeners = true;
        }
        setChanged(nodes[0]);
    }
}
