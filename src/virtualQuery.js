var vDOM = require('./vDOM.js');

function virtualQuery(array) {
  var arr = [];
  arr = arr.concat(array);
  arr.__proto__ = virtualQuery.prototype;
  return arr;
}
virtualQuery.prototype = new Array;

Object.assign(virtualQuery.prototype, {
    append: function (arg) {
        switch (typeof arg) {
            case "string":
                vDOM.addChildFromHtml(this, arg, "end");
                return this;
            case "object":
                if (arg instanceof vDOM.virtualNode) {
                    vDOM.addChildFromVNodes(this, [arg], "end");
                }
                if (arg instanceof virtualQuery) {
                    vDOM.addChildFromVNodes(this, arg, "end");
                }
                return this;
        }
    },
    appendTo: function (arg) {
        switch (typeof arg) {
            case "string":
                return new virtualQuery(vDOM.addChildFromVNodes([vDOM.createVDOM(arg)], this, "end"));
            case "object":
                if (arg instanceof vDOM.virtualNode) {
                    return new virtualQuery(vDOM.addChildFromVNodes([arg], this, "end"));
                }
                if (arg instanceof virtualQuery) {
                    return new virtualQuery(vDOM.addChildFromVNodes(arg, this, "end"));
                }
        }
    },
    prepend: function (arg) {
        switch (typeof arg) {
            case "string":
                vDOM.addChildFromHtml(this, arg, "start");
                return this;
            case "object":
                if (arg instanceof vDOM.virtualNode) {
                    vDOM.addChildFromVNodes(this, [arg], "start");
                }
                if (arg instanceof virtualQuery) {
                    vDOM.addChildFromVNodes(this, arg, "start");
                }
                return this;
        }
    },
    prependTo: function (arg) {
        switch (typeof arg) {
            case "string":
                return new virtualQuery(vDOM.addChildFromVNodes([vDOM.createVDOM(arg)], this, "start"));
            case "object":
                if (arg instanceof vDOM.virtualNode) {
                    return new virtualQuery(vDOM.addChildFromVNodes([arg], this, "start"));
                }
                if (arg instanceof virtualQuery) {
                    return new virtualQuery(vDOM.addChildFromVNodes(arg, this, "start"));
                }
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
    removeClass: function(classes) {
        vDOM.removeClasses(this, classes);
        return this;
    },
    hasClass: function(classIn) {
        return vDOM.hasClass(this, classIn);
    },
    html: function (html) {
        vDOM.setHTML(this, html);
        return this;
    },
    attr: function() {
        var args = [].slice.call(arguments);
        switch (args.length) {
            case 1:
                switch(typeof args[0]) {
                    case "string":
                        return vDOM.getAttribute(this, args[0]);
                    case "object":
                        for (var attrName in args[0])
                            vDOM.setAttribute(this, attrName, args[0][attrName]);
                        return this;
                }
            case 2:
                vDOM.setAttribute(this, args[0], args[1])
                return this;
        }
    },
    css: function() {
        var args = [].slice.call(arguments);
        switch (args.length) {
            case 1:
                switch(typeof args[0]) {
                    case "string":
                        return vDOM.getStyle(this, args[0]);
                    case "object":
                        for (var property in args[0])
                            vDOM.setStyle(this, property, args[0][property]);
                        return this;
                }
            case 2:
                vDOM.setStyle(this, args[0], args[1]);
                return this;
        }
    },
    clone: function() {
        return vDOM.clone(this);
    },
    on: function(event, callback) {
        vDOM.on(this, event, callback);
    },
    off: function(event, callback) {
        vDOM.off(this, event, callback);
    }
});
module.exports = virtualQuery;