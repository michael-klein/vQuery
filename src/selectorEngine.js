
var CssSelectorParser = require('css-selector-parser').CssSelectorParser,
    sparser = new CssSelectorParser(),
    vDOM = require('./vDOM.js');

sparser.registerSelectorPseudos('has', 'not');
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
    if (typeof rules.classNames === "undefined")
        return true;
    for (var i=0; i<rules.classNames.length; i++) {
        if (node.classNames.indexOf(rules.classNames[i]) === -1)
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

function checkPseudos(rules, node) {
    if (typeof rules.pseudos === "undefined")
        return true;
    var pseudos = rules.pseudos;
    for (var i=0; i<pseudos.length; i++) {
        var pseudo = pseudos[i];
        switch(pseudo.name) {
            case "first-child":
            case "last-child":
            case "nth-child":
                var children = node.parentNode.children;
                if (typeof rules.tagName !== "undefined")
                    children = children.filter(function(child) {
                        return child.tagName === rules.tagName;
                    });
                switch(pseudo.name) {
                    case "first-child":
                        return children.indexOf(node) === 0;
                    case "last-child":
                        return children.indexOf(node) === children.length - 1;
                    case "nth-child":
                        return children.indexOf(node) === parseInt(pseudo.value);
                }
            case "has":
                var selectedNodes = [],
                nextRules = getNextRules(pseudo.value);
                for (var i = 0; i < node.children.length; i++) {
                    traverseVDOM(nextRules, node.children[i], selectedNodes, nextRules.nestingOperator === ">", true);
                }
                return selectedNodes.length > 0;
            case "not":
                var selectedNodes = [],
                nextRules = getNextRules(pseudo.value);
                traverseVDOM(nextRules, node, selectedNodes, nextRules.nestingOperator === ">", true);
                return selectedNodes.length === 0;
        }
    }
    return false;    
}
var checks = [
    checkTagName,
    checkClasses,
    checkID,
    checkPseudos
]
checkHits = function(rules, currentVDOM) {
    var res = true;
    for (var i=0; i<checks.length; i++) {
        if (!checks[i](rules, currentVDOM))
            return false;
    }
    return true;
}

function traverseVDOM(rules, currentVDOM, selectedNodes, exact, pseudoMode) {
    if (rules.id && !pseudoMode) {
        var idNode = vDOM.idNodes[rules.id];
        if (typeof idNode !== "undefined" && idNode.length > 0) {
            selectedNodes.push(idNode);
            if (!hasMoreRules(rules)) {
                if (selectedNodes.indexOf(idNode) === -1)
                    selectedNodes.push(idNode);
            }
            else {
                var nextRules = getNextRules(rules);
                for (var i = 0; i < idNode.children.length; i++) {
                    traverseVDOM(nextRules, idNode.children[i], selectedNodes, nextRules.nestingOperator === ">", pseudoMode);
                }
            }
            return;
        }
    }
    if (checkHits(rules, currentVDOM)) {
        if (!hasMoreRules(rules)) {
            if (selectedNodes.indexOf(currentVDOM) === -1)
                selectedNodes.push(currentVDOM);
        }
        else {
            var nextRules = getNextRules(rules);
            for (var i = 0; i < currentVDOM.children.length; i++) {
                traverseVDOM(nextRules, currentVDOM.children[i], selectedNodes, nextRules.nestingOperator === ">", pseudoMode);
            }
        }
    } else
        if (!exact && currentVDOM.children.length > 0) 
            for (var i=0; i < currentVDOM.children.length; i++)
                traverseVDOM(rules, currentVDOM.children[i], selectedNodes, pseudoMode);
}

module.exports.query = function(virtualNode, selector) {
    var parsedSelector = sparser.parse(selector),
        selectedNodes = [];
        console.log(parsedSelector)
    if (hasMoreRules(parsedSelector))
        traverseVDOM(getNextRules(parsedSelector), virtualNode.children[0], selectedNodes, false);
    return selectedNodes;
}