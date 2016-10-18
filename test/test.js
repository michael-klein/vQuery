/**
 * Check if it works in the node environment
 */

var $ = require('../src/index.js');

$.load('<body><div id="test" class="test"><div><h1><p class="hello"></p><p>asd</p></h1></div></div><div id="append">trollol</div><div id="attr" align="left"></div></body>');

console.log($('body').html())