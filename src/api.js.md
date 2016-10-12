```js
var vDOM = require('./vDOM.js');
function virtualQuery(nodes) {
    return Object.assign(nodes, {
        append: function(arg) {
            switch (typeof arg) {
                case "string":
                        vDOM.addChildFromHtml(this, arg, "end");
                        return this;
                case "object":
                        if (arg instanceof vDOM.virtualNode) {
                            vDOM.addChildFromVNodes(this, [arg], "end");
                    }
                    return this;
            }
        },
        prepend: function (arg) {
            switch (typeof arg) {
                case "string":
                    vDOM.addChildFromHtml(this, arg, "start");
                    return this;
            }
        },
        remove: function () {
            vDOM.removeNodes(this);
            return this;
        },
        addClass: function (classes) {
            vDOM.addClasses(this, classes);
            return this;
        },
        html: function (html) {
            vDOM.setHTML(this, html);
            return this;
        }
    });
};
module.exports = virtualQuery;
```
------------------------
Generated _Thu Sep 15 2016 13:19:43 GMT+0200 (CEST)_ from [&#x24C8; api.js](api.js "View in source")

