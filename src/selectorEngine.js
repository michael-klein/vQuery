

var sizzle = require('sizzle'),
    vDOM   = require('./vDOM.js');

module.exports.query = function(virtualNode, selector) {
    return sizzle(selector, virtualNode);
}