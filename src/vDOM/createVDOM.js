/**
 * 
 * lifted and modified from: https://github.com/ashi009/node-fast-html-parser
 * 
 */

var kMarkupPattern = /<!--[^]*?(?=-->)-->|<(\/?)([a-z][a-z0-9]*)\s*([^>]*?)(\/?)>/ig;
var kAttributePattern = /\b([A-z]*)\s*=\s*("([^"]+)"|'([^']+)'|(\S+))/ig;
var kSelfClosingElements = {
    meta: true,
    img: true,
    link: true,
    input: true,
    area: true,
    br: true,
    hr: true
};
var kElementsClosedByOpening = {
    li: { li: true },
    p: { p: true, div: true },
    td: { td: true, th: true },
    th: { td: true, th: true }
};
var kElementsClosedByClosing = {
    li: { ul: true, ol: true },
    a: { div: true },
    b: { div: true },
    i: { div: true },
    p: { div: true },
    td: { tr: true, table: true },
    th: { tr: true, table: true }
};
var kBlockTextElements = {
    script: true,
    noscript: true,
    style: true,
    pre: true
};

var nodeTypes = require('./nodeTypes.js');

module.exports = {
    idNodes: [],
    createVDOM: function (data, init) {
        data = data.replace(/\r?\n|\r/g, "");
        var root = new nodeTypes.virtualNode("root", null);
        var currentParent = root;
        var stack = [root];
        var lastTextPos = -1;

        for (var match, text; match = kMarkupPattern.exec(data);) {
            if (lastTextPos > -1) {
                if (lastTextPos + match[0].length < kMarkupPattern.lastIndex) {
                    // if has content
                    text = data.substring(lastTextPos, kMarkupPattern.lastIndex - match[0].length);
                    if (text.replace(/ /g, "").length > 0)
                        currentParent.childNodes.push(new nodeTypes.virtualTextNode(text, currentParent));
                }
            }
            lastTextPos = kMarkupPattern.lastIndex;
            if (match[0][1] == '!') {
                // this is a comment
                continue;
            }
            match[2] = match[2].toLowerCase();
            if (!match[1]) {
                // not </ tags
                var attrs = {};
                for (var attMatch; attMatch = kAttributePattern.exec(match[3]);)
                    attrs[attMatch[1]] = attMatch[3] || attMatch[4] || attMatch[5];
                // console.log(attrs);
                if (!match[4] && kElementsClosedByOpening[currentParent.name]) {
                    if (kElementsClosedByOpening[currentParent.name][match[2]]) {
                        stack.pop();
                        currentParent = stack[stack.length - 1];
                    }
                }
                var node = new nodeTypes.virtualNode(match[2], currentParent);
                currentParent.children.push(node);
                currentParent.childNodes.push(node);
                currentParent = node;
                for (var aName in attrs) {
                    var value = attrs[aName];
                    if (aName === "id") {
                        if (init)
                            this.idNodes[value] = currentParent;
                        currentParent.id = value;
                    }
                    if (aName === "class")
                        currentParent.classNames = value.split(" ");
                    currentParent.attributes[aName] = value;
                }
                stack.push(currentParent);
                if (kBlockTextElements[match[2]]) {
                    // a little test to find next </script> or </style> ...
                    var closeMarkup = '</' + match[2] + '>';
                    var index = data.indexOf(closeMarkup, kMarkupPattern.lastIndex);
                    if (index == -1) {
                        lastTextPos = kMarkupPattern.lastIndex = data.length + 1;
                    } else {
                        lastTextPos = kMarkupPattern.lastIndex = index + closeMarkup.length;
                        match[1] = true;
                    }
                }
            }
            if (match[1] || match[4] ||
                kSelfClosingElements[match[2]]) {
                // </ or /> or <br> etc.
                while (true) {
                    if (currentParent.name == match[2]) {
                        stack.pop();
                        currentParent = stack[stack.length - 1];
                        break;
                    } else {
                        // Trying to close current tag, and move on
                        if (kElementsClosedByClosing[currentParent.name]) {
                            if (kElementsClosedByClosing[currentParent.name][match[2]]) {
                                stack.pop();
                                currentParent = stack[stack.length - 1];
                                continue;
                            }
                        }
                        // Use aggressive strategy to handle unmatching markups.
                        break;
                    }
                }
            }
        }
        return root;
    },
    load: function(html) {
        this.oldDOM = this.createVDOM(html, true);
        this.newDOM = this.createVDOM(html, true);
        this.newDOM.changed = false;
    }
};