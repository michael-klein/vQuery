
var CssSelectorParser = require('css-selector-parser').CssSelectorParser,
    sparser = new CssSelectorParser();

sparser.registerSelectorPseudos('has');
sparser.registerNestingOperators('>', '+', '~');
sparser.registerAttrEqualityMods('^', '$', '*', '~');
sparser.enableSubstitutes();

function hasMoreRules(rules) {
    return typeof rules.rule !== "undefined" || typeof rules.ruleSet !== "undefined";
}

function getNextRules(rules) {
    if (typeof rules.ruleSet !== "undefined")
        return rules.ruleSet;
    else  return rules.rule;
};

function checkClasses(rules, node) {
    if (typeof rules.class === "undefined")
        return true;
    for (var i=0; i<rules.class.length; i++) {
        if (node.classNames.indexOf(rules.class[i]) === -1)
            return false;
    }
    return true;
}

function checkTagName(rules, node) {
    if (typeof rules.tagName === "undefined")
        return true;
    if (rules.tagName === node.name)
        return true;
    return false;    
}

function checkID(rules, node) {
    if (typeof rules.id === "undefined")
        return true;
    if (rules.id === node.id)
        return true;
    return false;    
}

function traverseVDOM(rules, currentVDOM, selectedNodes, exact) {
    var hits = {
        tagName: checkTagName(rules, currentVDOM),
        classNames: checkClasses(rules, currentVDOM),
        id: checkID(rules, currentVDOM)
    }
    if (hits.tagName && hits.classNames && hits.id) {
        if (!hasMoreRules(rules)) {
            if (selectedNodes.indexOf(currentVDOM) === -1)
                selectedNodes.push(currentVDOM);
        }
        else
            for (var i = 0; i < currentVDOM.children.length; i++) {
                var nextRules = getNextRules(rules);
                traverseVDOM(nextRules, currentVDOM.children[i], selectedNodes, nextRules.nestingOperator === ">");
            }
    } else
        if (!exact && currentVDOM.children.length > 0) 
            for (var i=0; i < currentVDOM.children.length; i++)
                traverseVDOM(rules, currentVDOM.children[i], selectedNodes);
}

module.exports.query = function(vDOM, selector) {
    var parsedSelector = sparser.parse(selector),
        selectedNodes = [];
    if (hasMoreRules(parsedSelector))
        traverseVDOM(getNextRules(parsedSelector), vDOM.children[0], selectedNodes);
    return selectedNodes;
}