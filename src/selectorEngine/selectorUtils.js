var vDOM = require('../vDOM/vDOM.js');
function hasMoreRules(rules) {
    return typeof rules.rule !== "undefined" || typeof rules.ruleSet !== "undefined"|| typeof rules.selectors !== "undefined";
}

function getNextRules(rules) {
    if (typeof rules.ruleSet !== "undefined")
        return rules.ruleSet.rule;
    if (typeof rules.selectors !== "undefined")
        return rules.selectors.map(function(item) {
            return item.rule
        });
    else return rules.rule;
}

function traverseVDOM(rules, currentVDOM, selectedNodes, exact, pseudoMode) {
    if (Object.keys(rules).length === 1 && rules.type)
        return null;
    if (typeof rules.length === "undefined")
        var iterator = [rules];
    else
        var iterator = rules;
    for (var r=0; r<iterator.length; r++) {
        var rule = iterator[r];
        if (rule.id && !pseudoMode) {
            var idNode = vDOM.idNodes[rule.id];
            if (typeof idNode !== "undefined" && idNode.length !== []) {
                delete rule.id;
                currentVDOM = idNode;
            }
        }
        if (checkHits(rule, currentVDOM)) {
            if (!hasMoreRules(rule)) {
                if (selectedNodes.indexOf(currentVDOM) === -1)
                    selectedNodes.push(currentVDOM);
                if (!exact && currentVDOM.children.length > 0)
                    for (var i = 0; i < currentVDOM.children.length; i++) {
                        traverseVDOM(rule, currentVDOM.children[i], selectedNodes, exact, pseudoMode);
                    }
            }
            else {
                var nextRules = getNextRules(rule);
                if (typeof nextRules.nestingOperator !== "undefined" && nextRules.nestingOperator && nextRules.nestingOperator !== ">") {
                    nextRules.prevRule = rule;
                    traverseVDOM(nextRules, currentVDOM, selectedNodes, exact, pseudoMode);
                } else
                    if (nextRules)
                        for (var i = 0; i < currentVDOM.children.length; i++) {
                            traverseVDOM(nextRules, currentVDOM.children[i], selectedNodes, nextRules.nestingOperator === ">", pseudoMode);
                        }
            }
        } else
            if (!exact && currentVDOM.children.length > 0)
                for (var i = 0; i < currentVDOM.children.length; i++)
                    traverseVDOM(rules, currentVDOM.children[i], selectedNodes, exact, pseudoMode);
    }
}

module.exports = {
    hasMoreRules:hasMoreRules,
    getNextRules:getNextRules,
    traverseVDOM:traverseVDOM
}