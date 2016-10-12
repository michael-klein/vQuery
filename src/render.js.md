```js
var vDOM = require('./vDOM.js');
var rendering = false;
var decodeEntities = (function() {
```
this prevents any overhead from creating the object each time
```js
    var element = document.createElement('div');

    function decodeHTMLEntities (str) {
        if(str && typeof str === 'string') {
```
strip script/html tags
```js
            str = str.replace(/<script[^>]*>([\S\s]*?)<\/script>/gmi, '');
            str = str.replace(/<\/?\w(?:[^"'>]|"[^"]*"|'[^']*')*>/gmi, '');
            element.innerHTML = str;
            str = element.textContent;
            element.textContent = '';
        }

        return str;
    }

    return decodeHTMLEntities;
})();
function createNode(data) {
    var node = document.createElement(data.name);
    for (var i in data.attributes) {
        node.setAttribute(i, data.attributes[i]);
    }
    if (typeof data.childNodes !== "undefined")
        for (var i=0; i<data.childNodes.length; i++) {
            var child =createNode(data.childNodes[i]);
            if (typeof child !== "undefined")
                node.appendChild(child);
        }
    if (data instanceof vDOM.virtualTextNode)
        node.appendChild(document.createTextNode(decodeEntities(data.value)));
    return node;
}


module.exports = {
    isRendering: function() {
        return rendering;
    },
    render: function(ops,node) {
        var t = new Date().getTime();
        console.log("rendering start", t, ops);
        rendering = true;
        var root = node ? node : document;
        for (var i = 0; i < ops.length; i++) {
            var op = ops[i];
            switch (op.t) {
                case "remove":
                    var node = root.querySelector(op.p),
                        parent = node.parentNode ? node.parentNode : root;
                    parent.removeChild(node);
                    break;
                case "addNode":
                    var newNode = createNode(op.n),
                        parent = op.p.length > 0 ? root.querySelector(op.p) : root;
                    parent.appendChild(newNode);
                    break;
                case "replace":
                    var newNode = createNode(op.n),
                        node = root.querySelector(op.p),
                        parent = node.parentNode ? node.parentNode : root;
                    parent.replaceChild(newNode, node);
                    break;
                case "attrChanged":
                    root.querySelector(op.n).setAttribute(op.a, op.v);
                    break;
            }
        }
        console.log("rendering stop", (new Date().getTime() - t) / 1000);
        rendering = false;
    }
}
```
------------------------
Generated _Thu Sep 22 2016 17:19:53 GMT+0200 (CEST)_ from [&#x24C8; render.js](render.js "View in source")

