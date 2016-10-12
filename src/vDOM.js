//# Virtual DOM
var htmlParser = require('html-parser'),
    clone = require("clone");
//## sets the root node to "changed"
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
            hasListeners: false
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
    createVDOM: function (html) {
        var cNode = new virtualNode("root", null);
        htmlParser.parse(html.replace(/\r?\n|\r/g, ""), {
            openElement: function (name) {
                var node = new virtualNode(name, cNode);
                cNode.children.push(node);
                cNode.childNodes.push(node);
                cNode = node;
            },
            closeOpenedElement: function (name, token, unary) {
                if (unary && cNode.name === name)
                    cNode = cNode.parentNode;
            },
            closeElement: function (name) {
                if (cNode.name === name)
                    cNode = cNode.parentNode;
            },
            comment: function (value) {
            },
            cdata: function (value) {
            },
            attribute: function (name, value) {
                if (name === "id")
                    cNode.id = value;
                if (name === "class")
                    cNode.classNames.push(value.split(" "));
                cNode.attributes[name] = value;
            },
            docType: function (value) {
            },
            text: function (value) {
                if (value.trim().length===0) return;
                cNode.childNodes.push(new virtualTextNode(value, cNode));
            }
        });
        return cNode;
    },
    //creates a new vitual node from passed html and appends it to all virtual nodes
    addChildFromHtml: function(nodes, html, position) {
        switch (typeof position) {
            case "string":
                    if (position === "start") {
                        for (var i=0; i<nodes.length; i++) {
                            var newDOM = this.createVDOM(html);
                            for (var j=0; j<newDOM.children.length; j++) {
                                newDOM.children[j].parentNode = nodes[i];
                                nodes[i].children.unshift(newDOM.children[j]);
                                nodes[i].childNodes.unshift(newDOM.childNodes[j]);
                            }
                        }
                    } if (position === "end") {
                        for (var i=0; i<nodes.length; i++) {
                            var newDOM = this.createVDOM(html);
                            for (var j=0; j<newDOM.children.length; j++) {
                                newDOM.children[j].parentNode = nodes[i];
                                nodes[i].children.push(newDOM.children[j]);
                                nodes[i].childNodes.push(newDOM.childNodes[j]);
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
                        }
                    }
                break;
        }
        setChanged(nodes[0]);
    },
    addChildFromVNodes: function(nodes, vNodes, position) {
        this.removeNodes(vNodes, true);
        var clones = [];
        switch (typeof position) {
            case "string":
                    if (position === "start") {
                        for (var i=0; i<nodes.length; i++) {
                            var newDOM = clone(vNodes);
                            clones = clones.concat(newDOM);
                            nodes[i].children = newDOM.concat(nodes[i].children);
                            nodes[i].childNodes = newDOM.concat(nodes[i].childNodes);
                            for (var k=0; k<newDOM.length; k++)
                                newDOM[k].parentNode = nodes[i];
                        }
                    } if (position === "end") {
                        for (var i=0; i<nodes.length; i++) {
                            var newDOM = clone(vNodes);
                            clones = clones.concat(newDOM);
                            nodes[i].children = nodes[i].children.concat(newDOM);
                            nodes[i].childNodes = nodes[i].childNodes.concat(newDOM);
                            for (var k=0; k<newDOM.length; k++)
                                newDOM[k].parentNode = nodes[i];
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
                            for (var k=0; k<newDOM.length; k++)
                                newDOM[k].parentNode = nodes[i];
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
    //generated virtual DOM from apssed html and replaces the children of the passed nodes with it
    setHTML: function(nodes, html) {
        for (var i=0; i<nodes.length; i++) {
            var node = nodes[i];
            node.children = this.createVDOM(html).children;
            node.childNodes = this.createVDOM(html).childNodes;    
        }
        setChanged(nodes[0]);
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
            if (typeof node.listeners[event] === "undefined")
                node.listeners[event] = [callback];
            else
                node.listeners[event].push(callback);
            node.hasListeners = true;
        }
        setChanged(nodes[0]);
    }
}
