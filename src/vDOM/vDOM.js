//# Virtual DOM
var vDOMUtils = require('./vDOMUtils.js');


module.exports = Object.assign({
    newDOM: null,
    oldDOM: null,
    clone: function(node) {
        return vDOMUtils.clone(node);
    }
}, 
require('./nodeTypes.js'),
require('./createVDOM.js'),
require('./events.js'),
require('./class.js'),
require('./addChild.js'),
require('./removeChild.js'),
require('./html.js'),
require('./styles.js'),
require('./attributes.js'));
