
var CssSelectorParser = require('css-selector-parser').CssSelectorParser,
    sparser = new CssSelectorParser(),
    selectorUtils = require('./selectorUtils.js'),
    attributes = require('./attributes.js'),
    identifiers = require('./identifiers.js'),
    nesting = require('./nesting.js'),
    pseudos = require('./pseudos.js');

sparser.registerSelectorPseudos('has', 'not');
sparser.registerNestingOperators('>', '+', '~');
sparser.registerAttrEqualityMods('^', '$', '*', '~', '|');
sparser.enableSubstitutes();

var checks = [
    identifiers.checkTagName,
    identifiers.checkID,
    identifiers.checkClasses,
    attributes.checkAttr,
    nesting.checkNesting,
    pseudos.checkPseudos
]
checkHits = function(rules, currentVDOM) {
    var res = true;
    for (var i=0; i<checks.length; i++) {
        if (!checks[i](rules, currentVDOM))
            return false;
    }
    return true;
}

module.exports.query = function(virtualNode, selector) {
    var parsedSelector = sparser.parse(selector),
        selectedNodes = [],
        nextRules = selectorUtils.getNextRules(parsedSelector);
    //console.log(parsedSelector)
    if (selectorUtils.hasMoreRules(parsedSelector))
        selectorUtils.traverseVDOM(nextRules, virtualNode.children[0], selectedNodes, nextRules.nestingOperator === ">", false, null);
    return selectedNodes;
}