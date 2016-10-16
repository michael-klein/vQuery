var vDOMUtils = require('./vDOMUtils.js');
module.exports = {
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
        vDOMUtils.setChanged(nodes[0]);
    },
    addChildFromVNodes: function(nodes, vNodes, position) {
        this.removeNodes(vNodes, true);
        var clones = [],
            self = this;
        switch (typeof position) {
            case "string":
                    if (position === "start") {
                        for (var i=0; i<nodes.length; i++) {
                            var newDOM = vDOMUtils.clone(vNodes);
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
                            var newDOM = vDOMUtils.clone(vNodes);
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
                            var newDOM = vDOMUtils.clone(vNodes);
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
        vDOMUtils.setChanged(nodes[0]);
        return clones;
    }
}