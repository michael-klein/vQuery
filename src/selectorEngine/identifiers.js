function checkClasses(rules, node) {
    if (typeof rules.classNames === "undefined")
        return true;
    for (var i=0; i<rules.classNames.length; i++) {
        if (node.classNames.indexOf(rules.classNames[i]) === -1)
            return false;
    }
    return true;
}

function checkID(rules, node) {
    if (typeof rules.id === "undefined")
        return true;
    if (rules.id === node.id)
        return true;
    return false;    
}

function checkTagName(rules, node) {
    if (typeof rules.tagName === "undefined" || rules.tagName === "*")
        return true;
    if (rules.tagName === node.name)
        return true;
    return false;    
}

module.exports = {
    checkClasses:checkClasses,
    checkID:checkID,
    checkTagName:checkTagName
}