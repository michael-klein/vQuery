var decodeEntities = (function() {
    // this prevents any overhead from creating the object each time
    var element = document.createElement('div');

    function decodeHTMLEntities (str) {
        if(str && typeof str === 'string') {
            // strip script/html tags
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
function createNode(data, vDOM) {
    var node = document.createElement(data.name);
    for (var i in data.attributes) {
        node.setAttribute(i, data.attributes[i]);
    }
    if (typeof data.childNodes !== "undefined")
        for (var i=0; i<data.childNodes.length; i++) {
            var child =createNode(data.childNodes[i], vDOM);
            if (typeof child !== "undefined")
                node.appendChild(child);
        }
    if (data instanceof vDOM.virtualTextNode)
        return document.createTextNode(decodeEntities(data.value));
    return node;
}
module.exports = {
    decodeEntities: decodeEntities,
    createNode: createNode
}