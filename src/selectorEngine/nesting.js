var selectorUtils = require('./selectorUtils.js');
function checkNesting(rules, node) {
    if (typeof rules.nestingOperator === "undefined" || !rules.nestingOperator || rules.nestingOperator === ">")
        return true;
    var nextRules = selectorUtils.getNextRules(rules);
    if (typeof nextRules !== "undefined" && typeof nextRules.nestingOperator !== "undefined" && nextRules.nestingOperator) {
        return true;
    }
    var prevSibling = node;
    while (typeof rules !== "undefined") {
        switch (rules.nestingOperator) {
            case "+":
            case "~":
                var siblings = node.parentNode.children,
                    sibling;
                switch (rules.nestingOperator) {
                    case "+":
                        var index = siblings.indexOf(prevSibling);
                        if (index === 0)
                            return false;
                        sibling = siblings[index - 1];
                        prevSibling = sibling;
                        if (!checkTagName(rules.prevRule, sibling))
                            return false;
                        break;
                    case "~":
                        var index = siblings.indexOf(prevSibling);
                        if (index === 0)
                            return false;
                        while (index>0) {
                            index--;
                            sibling = siblings[index];
                            if (checkTagName(rules.prevRule, sibling)) {
                                prevSibling = sibling;
                                break;
                            }
                            return false;
                        }
                        break;
                }
        }
        rules = rules.prevRule;
    }
    return true;
}
module.exports = {
    checkNesting:checkNesting
}