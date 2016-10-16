module.exports = {
    virtualNode: function (name, parentNode) {
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
    },
    virtualTextNode: function (value, parentNode) {
        Object.assign(this, {
            parentNode: parentNode,
            value: value
        });
    }
}