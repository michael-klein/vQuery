var selectorUtils = require('./selectorUtils.js');
function checkPseudos(rules, node) {
    if (typeof rules.pseudos === "undefined")
        return true;
    var pseudos = rules.pseudos;
    for (var i=0; i<pseudos.length; i++) {
        var pseudo = pseudos[i];
        switch(pseudo.name) {
            case "first-child":
            case "last-child":
            case "only-child":
            case "nth-child":
            case "nth-last-child":
                var children = node.parentNode.children;
                if (typeof rules.tagName !== "undefined")
                    children = children.filter(function(child) {
                        return child.name === rules.tagName;
                    });
                switch(pseudo.name) {
                    case "first-child":
                        return children.indexOf(node) === 0;
                    case "last-child":
                        return children.indexOf(node) === children.length - 1;
                    case "nth-child":
                        return children.indexOf(node) + 1 === parseInt(pseudo.value);
                    case "nth-last-child":
                        return children.reverse().indexOf(node) + 1 === parseInt(pseudo.value);
                    case "only-child":
                        return children.length === 1;
                }
            case "has":
                var selectedNodes = [],
                nextRules = selectorUtils.getNextRules(pseudo.value);
                for (var i = 0; i < node.children.length; i++) {
                    selectorUtils.traverseVDOM(nextRules, node.children[i], selectedNodes, nextRules.nestingOperator === ">", true);
                }
                return selectedNodes.length > 0;
            case "not":
                var selectedNodes = [],
                nextRules = selectorUtils.getNextRules(pseudo.value);
                selectorUtils.traverseVDOM(nextRules, node, selectedNodes, nextRules.nestingOperator === ">", true);
                return selectedNodes.length === 0;
        }
    }
    return false;    
}

module.exports = {
    checkPseudos:checkPseudos
}