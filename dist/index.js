(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.vQuery = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (Buffer){
var clone = (function() {
'use strict';

var nativeMap;
try {
  nativeMap = Map;
} catch(_) {
  // maybe a reference error because no `Map`. Give it a dummy value that no
  // value will ever be an instanceof.
  nativeMap = function() {};
}

var nativeSet;
try {
  nativeSet = Set;
} catch(_) {
  nativeSet = function() {};
}

var nativePromise;
try {
  nativePromise = Promise;
} catch(_) {
  nativePromise = function() {};
}

/**
 * Clones (copies) an Object using deep copying.
 *
 * This function supports circular references by default, but if you are certain
 * there are no circular references in your object, you can save some CPU time
 * by calling clone(obj, false).
 *
 * Caution: if `circular` is false and `parent` contains circular references,
 * your program may enter an infinite loop and crash.
 *
 * @param `parent` - the object to be cloned
 * @param `circular` - set to true if the object to be cloned may contain
 *    circular references. (optional - true by default)
 * @param `depth` - set to a number if the object is only to be cloned to
 *    a particular depth. (optional - defaults to Infinity)
 * @param `prototype` - sets the prototype to be used when cloning an object.
 *    (optional - defaults to parent prototype).
*/
function clone(parent, circular, depth, prototype) {
  var filter;
  if (typeof circular === 'object') {
    depth = circular.depth;
    prototype = circular.prototype;
    filter = circular.filter;
    circular = circular.circular;
  }
  // maintain two arrays for circular references, where corresponding parents
  // and children have the same index
  var allParents = [];
  var allChildren = [];

  var useBuffer = typeof Buffer != 'undefined';

  if (typeof circular == 'undefined')
    circular = true;

  if (typeof depth == 'undefined')
    depth = Infinity;

  // recurse this function so we don't reset allParents and allChildren
  function _clone(parent, depth) {
    // cloning null always returns null
    if (parent === null)
      return null;

    if (depth === 0)
      return parent;

    var child;
    var proto;
    if (typeof parent != 'object') {
      return parent;
    }

    if (parent instanceof nativeMap) {
      child = new nativeMap();
    } else if (parent instanceof nativeSet) {
      child = new nativeSet();
    } else if (parent instanceof nativePromise) {
      child = new nativePromise(function (resolve, reject) {
        parent.then(function(value) {
          resolve(_clone(value, depth - 1));
        }, function(err) {
          reject(_clone(err, depth - 1));
        });
      });
    } else if (clone.__isArray(parent)) {
      child = [];
    } else if (clone.__isRegExp(parent)) {
      child = new RegExp(parent.source, __getRegExpFlags(parent));
      if (parent.lastIndex) child.lastIndex = parent.lastIndex;
    } else if (clone.__isDate(parent)) {
      child = new Date(parent.getTime());
    } else if (useBuffer && Buffer.isBuffer(parent)) {
      child = new Buffer(parent.length);
      parent.copy(child);
      return child;
    } else {
      if (typeof prototype == 'undefined') {
        proto = Object.getPrototypeOf(parent);
        child = Object.create(proto);
      }
      else {
        child = Object.create(prototype);
        proto = prototype;
      }
    }

    if (circular) {
      var index = allParents.indexOf(parent);

      if (index != -1) {
        return allChildren[index];
      }
      allParents.push(parent);
      allChildren.push(child);
    }

    if (parent instanceof nativeMap) {
      var keyIterator = parent.keys();
      while(true) {
        var next = keyIterator.next();
        if (next.done) {
          break;
        }
        var keyChild = _clone(next.value, depth - 1);
        var valueChild = _clone(parent.get(next.value), depth - 1);
        child.set(keyChild, valueChild);
      }
    }
    if (parent instanceof nativeSet) {
      var iterator = parent.keys();
      while(true) {
        var next = iterator.next();
        if (next.done) {
          break;
        }
        var entryChild = _clone(next.value, depth - 1);
        child.add(entryChild);
      }
    }

    for (var i in parent) {
      var attrs;
      if (proto) {
        attrs = Object.getOwnPropertyDescriptor(proto, i);
      }

      if (attrs && attrs.set == null) {
        continue;
      }
      child[i] = _clone(parent[i], depth - 1);
    }

    if (Object.getOwnPropertySymbols) {
      var symbols = Object.getOwnPropertySymbols(parent);
      for (var i = 0; i < symbols.length; i++) {
        // Don't need to worry about cloning a symbol because it is a primitive,
        // like a number or string.
        var symbol = symbols[i];
        child[symbol] = _clone(parent[symbol], depth - 1);
      }
    }

    return child;
  }

  return _clone(parent, depth);
}

/**
 * Simple flat clone using prototype, accepts only objects, usefull for property
 * override on FLAT configuration object (no nested props).
 *
 * USE WITH CAUTION! This may not behave as you wish if you do not know how this
 * works.
 */
clone.clonePrototype = function clonePrototype(parent) {
  if (parent === null)
    return null;

  var c = function () {};
  c.prototype = parent;
  return new c();
};

// private utility functions

function __objToStr(o) {
  return Object.prototype.toString.call(o);
}
clone.__objToStr = __objToStr;

function __isDate(o) {
  return typeof o === 'object' && __objToStr(o) === '[object Date]';
}
clone.__isDate = __isDate;

function __isArray(o) {
  return typeof o === 'object' && __objToStr(o) === '[object Array]';
}
clone.__isArray = __isArray;

function __isRegExp(o) {
  return typeof o === 'object' && __objToStr(o) === '[object RegExp]';
}
clone.__isRegExp = __isRegExp;

function __getRegExpFlags(re) {
  var flags = '';
  if (re.global) flags += 'g';
  if (re.ignoreCase) flags += 'i';
  if (re.multiline) flags += 'm';
  return flags;
}
clone.__getRegExpFlags = __getRegExpFlags;

return clone;
})();

if (typeof module === 'object' && module.exports) {
  module.exports = clone;
}

}).call(this,require("buffer").Buffer)

},{"buffer":30}],2:[function(require,module,exports){
module.exports = {
  CssSelectorParser: require('./lib/css-selector-parser.js').CssSelectorParser
};
},{"./lib/css-selector-parser.js":3}],3:[function(require,module,exports){
function CssSelectorParser() {
  this.pseudos = {};
  this.attrEqualityMods = {};
  this.ruleNestingOperators = {};
  this.substitutesEnabled = false;
}

CssSelectorParser.prototype.registerSelectorPseudos = function(name) {
  for (var j = 0, len = arguments.length; j < len; j++) {
    name = arguments[j];
    this.pseudos[name] = 'selector';
  }
  return this;
};

CssSelectorParser.prototype.unregisterSelectorPseudos = function(name) {
  for (var j = 0, len = arguments.length; j < len; j++) {
    name = arguments[j];
    delete this.pseudos[name];
  }
  return this;
};

CssSelectorParser.prototype.registerNestingOperators = function(operator) {
  for (var j = 0, len = arguments.length; j < len; j++) {
    operator = arguments[j];
    this.ruleNestingOperators[operator] = true;
  }
  return this;
};

CssSelectorParser.prototype.unregisterNestingOperators = function(operator) {
  for (var j = 0, len = arguments.length; j < len; j++) {
    operator = arguments[j];
    delete this.ruleNestingOperators[operator];
  }
  return this;
};

CssSelectorParser.prototype.registerAttrEqualityMods = function(mod) {
  for (var j = 0, len = arguments.length; j < len; j++) {
    mod = arguments[j];
    this.attrEqualityMods[mod] = true;
  }
  return this;
};

CssSelectorParser.prototype.unregisterAttrEqualityMods = function(mod) {
  for (var j = 0, len = arguments.length; j < len; j++) {
    mod = arguments[j];
    delete this.attrEqualityMods[mod];
  }
  return this;
};

CssSelectorParser.prototype.enableSubstitutes = function() {
  this.substitutesEnabled = true;
  return this;
};

CssSelectorParser.prototype.disableSubstitutes = function() {
  this.substitutesEnabled = false;
  return this;
};

function isIdentStart(c) {
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c === '-') || (c === '_');
}

function isIdent(c) {
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c === '-' || c === '_';
}

function isHex(c) {
  return (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F') || (c >= '0' && c <= '9');
}

function isDecimal(c) {
  return c >= '0' && c <= '9';
}

function isAttrMatchOperator(chr) {
  return chr === '=' || chr === '^' || chr === '$' || chr === '*' || chr === '~';
}

var identSpecialChars = {
  '!': true,
  '"': true,
  '#': true,
  '$': true,
  '%': true,
  '&': true,
  '\'': true,
  '(': true,
  ')': true,
  '*': true,
  '+': true,
  ',': true,
  '.': true,
  '/': true,
  ';': true,
  '<': true,
  '=': true,
  '>': true,
  '?': true,
  '@': true,
  '[': true,
  '\\': true,
  ']': true,
  '^': true,
  '`': true,
  '{': true,
  '|': true,
  '}': true,
  '~': true
};

var strReplacementsRev = {
  '\n': '\\n',
  '\r': '\\r',
  '\t': '\\t',
  '\f': '\\f',
  '\v': '\\v'
};

var singleQuoteEscapeChars = {
  n: '\n',
  r: '\r',
  t: '\t',
  f: '\f',
  '\\': '\\',
  '\'': '\''
};

var doubleQuotesEscapeChars = {
  n: '\n',
  r: '\r',
  t: '\t',
  f: '\f',
  '\\': '\\',
  '"': '"'
};

function ParseContext(str, pos, pseudos, attrEqualityMods, ruleNestingOperators, substitutesEnabled) {
  var chr, getIdent, getStr, l, skipWhitespace;
  l = str.length;
  chr = null;
  getStr = function(quote, escapeTable) {
    var esc, hex, result;
    result = '';
    pos++;
    chr = str.charAt(pos);
    while (pos < l) {
      if (chr === quote) {
        pos++;
        return result;
      } else if (chr === '\\') {
        pos++;
        chr = str.charAt(pos);
        if (chr === quote) {
          result += quote;
        } else if (esc = escapeTable[chr]) {
          result += esc;
        } else if (isHex(chr)) {
          hex = chr;
          pos++;
          chr = str.charAt(pos);
          while (isHex(chr)) {
            hex += chr;
            pos++;
            chr = str.charAt(pos);
          }
          if (chr === ' ') {
            pos++;
            chr = str.charAt(pos);
          }
          result += String.fromCharCode(parseInt(hex, 16));
          continue;
        } else {
          result += chr;
        }
      } else {
        result += chr;
      }
      pos++;
      chr = str.charAt(pos);
    }
    return result;
  };
  getIdent = function() {
    var result = '';
    chr = str.charAt(pos);
    while (pos < l) {
      if (isIdent(chr)) {
        result += chr;
      } else if (chr === '\\') {
        pos++;
        if (pos >= l) {
          throw Error('Expected symbol but end of file reached.');
        }
        chr = str.charAt(pos);
        if (identSpecialChars[chr]) {
          result += chr;
        } else if (isHex(chr)) {
          var hex = chr;
          pos++;
          chr = str.charAt(pos);
          while (isHex(chr)) {
            hex += chr;
            pos++;
            chr = str.charAt(pos);
          }
          if (chr === ' ') {
            pos++;
            chr = str.charAt(pos);
          }
          result += String.fromCharCode(parseInt(hex, 16));
          continue;
        } else {
          result += chr;
        }
      } else {
        return result;
      }
      pos++;
      chr = str.charAt(pos);
    }
    return result;
  };
  skipWhitespace = function() {
    chr = str.charAt(pos);
    var result = false;
    while (chr === ' ' || chr === "\t" || chr === "\n" || chr === "\r" || chr === "\f") {
      result = true;
      pos++;
      chr = str.charAt(pos);
    }
    return result;
  };
  this.parse = function() {
    var res = this.parseSelector();
    if (pos < l) {
      throw Error('Rule expected but "' + str.charAt(pos) + '" found.');
    }
    return res;
  };
  this.parseSelector = function() {
    var res;
    var selector = res = this.parseSingleSelector();
    chr = str.charAt(pos);
    while (chr === ',') {
      pos++;
      skipWhitespace();
      if (res.type !== 'selectors') {
        res = {
          type: 'selectors',
          selectors: [selector]
        };
      }
      selector = this.parseSingleSelector();
      if (!selector) {
        throw Error('Rule expected after ",".');
      }
      res.selectors.push(selector);
    }
    return res;
  };

  this.parseSingleSelector = function() {
    skipWhitespace();
    var selector = {
      type: 'ruleSet'
    };
    var rule = this.parseRule();
    if (!rule) {
      return null;
    }
    var currentRule = selector;
    while (rule) {
      rule.type = 'rule';
      currentRule.rule = rule;
      currentRule = rule;
      skipWhitespace();
      chr = str.charAt(pos);
      if (pos >= l || chr === ',' || chr === ')') {
        break;
      }
      if (ruleNestingOperators[chr]) {
        var op = chr;
        pos++;
        skipWhitespace();
        rule = this.parseRule();
        if (!rule) {
          throw Error('Rule expected after "' + op + '".');
        }
        rule.nestingOperator = op;
      } else {
        rule = this.parseRule();
        if (rule) {
          rule.nestingOperator = null;
        }
      }
    }
    return selector;
  };

  this.parseRule = function() {
    var rule = null;
    while (pos < l) {
      chr = str.charAt(pos);
      if (chr === '*') {
        pos++;
        (rule = rule || {}).tagName = '*';
      } else if (isIdentStart(chr) || chr === '\\') {
        (rule = rule || {}).tagName = getIdent();
      } else if (chr === '.') {
        pos++;
        rule = rule || {};
        (rule.classNames = rule.classNames || []).push(getIdent());
      } else if (chr === '#') {
        pos++;
        (rule = rule || {}).id = getIdent();
      } else if (chr === '[') {
        pos++;
        skipWhitespace();
        var attr = {
          name: getIdent()
        };
        skipWhitespace();
        if (chr === ']') {
          pos++;
        } else {
          var operator = '';
          if (attrEqualityMods[chr]) {
            operator = chr;
            pos++;
            chr = str.charAt(pos);
          }
          if (pos >= l) {
            throw Error('Expected "=" but end of file reached.');
          }
          if (chr !== '=') {
            throw Error('Expected "=" but "' + chr + '" found.');
          }
          attr.operator = operator + '=';
          pos++;
          skipWhitespace();
          var attrValue = '';
          attr.valueType = 'string';
          if (chr === '"') {
            attrValue = getStr('"', doubleQuotesEscapeChars);
          } else if (chr === '\'') {
            attrValue = getStr('\'', singleQuoteEscapeChars);
          } else if (substitutesEnabled && chr === '$') {
            pos++;
            attrValue = getIdent();
            attr.valueType = 'substitute';
          } else {
            while (pos < l) {
              if (chr === ']') {
                break;
              }
              attrValue += chr;
              pos++;
              chr = str.charAt(pos);
            }
            attrValue = attrValue.trim();
          }
          skipWhitespace();
          if (pos >= l) {
            throw Error('Expected "]" but end of file reached.');
          }
          if (chr !== ']') {
            throw Error('Expected "]" but "' + chr + '" found.');
          }
          pos++;
          attr.value = attrValue;
        }
        rule = rule || {};
        (rule.attrs = rule.attrs || []).push(attr);
      } else if (chr === ':') {
        pos++;
        var pseudoName = getIdent();
        var pseudo = {
          name: pseudoName
        };
        if (chr === '(') {
          pos++;
          var value = '';
          skipWhitespace();
          if (pseudos[pseudoName] === 'selector') {
            pseudo.valueType = 'selector';
            value = this.parseSelector();
          } else {
            pseudo.valueType = 'string';
            if (chr === '"') {
              value = getStr('"', doubleQuotesEscapeChars);
            } else if (chr === '\'') {
              value = getStr('\'', singleQuoteEscapeChars);
            } else if (substitutesEnabled && chr === '$') {
              pos++;
              value = getIdent();
              pseudo.valueType = 'substitute';
            } else {
              while (pos < l) {
                if (chr === ')') {
                  break;
                }
                value += chr;
                pos++;
                chr = str.charAt(pos);
              }
              value = value.trim();
            }
            skipWhitespace();
          }
          if (pos >= l) {
            throw Error('Expected ")" but end of file reached.');
          }
          if (chr !== ')') {
            throw Error('Expected ")" but "' + chr + '" found.');
          }
          pos++;
          pseudo.value = value;
        }
        rule = rule || {};
        (rule.pseudos = rule.pseudos || []).push(pseudo);
      } else {
        break;
      }
    }
    return rule;
  };
  return this;
}

CssSelectorParser.prototype.parse = function(str) {
  var context = new ParseContext(
      str,
      0,
      this.pseudos,
      this.attrEqualityMods,
      this.ruleNestingOperators,
      this.substitutesEnabled
  );
  return context.parse();
};

CssSelectorParser.prototype.escapeIdentifier = function(s) {
  var result = '';
  var i = 0;
  var len = s.length;
  while (i < len) {
    var chr = s.charAt(i);
    if (identSpecialChars[chr]) {
      result += '\\' + chr;
    } else {
      if (
          !(
              chr === '_' || chr === '-' ||
              (chr >= 'A' && chr <= 'Z') ||
              (chr >= 'a' && chr <= 'z') ||
              (i !== 0 && chr >= '0' && chr <= '9')
          )
      ) {
        var charCode = chr.charCodeAt(0);
        if ((charCode & 0xF800) === 0xD800) {
          var extraCharCode = s.charCodeAt(i++);
          if ((charCode & 0xFC00) !== 0xD800 || (extraCharCode & 0xFC00) !== 0xDC00) {
            throw Error('UCS-2(decode): illegal sequence');
          }
          charCode = ((charCode & 0x3FF) << 10) + (extraCharCode & 0x3FF) + 0x10000;
        }
        result += '\\' + charCode.toString(16) + ' ';
      } else {
        result += chr;
      }
    }
    i++;
  }
  return result;
};

CssSelectorParser.prototype.escapeStr = function(s) {
  var result = '';
  var i = 0;
  var len = s.length;
  var chr, replacement;
  while (i < len) {
    chr = s.charAt(i);
    if (chr === '"') {
      chr = '\\"';
    } else if (chr === '\\') {
      chr = '\\\\';
    } else if (replacement = strReplacementsRev[chr]) {
      chr = replacement;
    }
    result += chr;
    i++;
  }
  return "\"" + result + "\"";
};

CssSelectorParser.prototype.render = function(path) {
  return this._renderEntity(path).trim();
};

CssSelectorParser.prototype._renderEntity = function(entity) {
  var currentEntity, parts, res;
  res = '';
  switch (entity.type) {
    case 'ruleSet':
      currentEntity = entity.rule;
      parts = [];
      while (currentEntity) {
        if (currentEntity.nestingOperator) {
          parts.push(currentEntity.nestingOperator);
        }
        parts.push(this._renderEntity(currentEntity));
        currentEntity = currentEntity.rule;
      }
      res = parts.join(' ');
      break;
    case 'selectors':
      res = entity.selectors.map(this._renderEntity, this).join(', ');
      break;
    case 'rule':
      if (entity.tagName) {
        if (entity.tagName === '*') {
          res = '*';
        } else {
          res = this.escapeIdentifier(entity.tagName);
        }
      }
      if (entity.id) {
        res += "#" + this.escapeIdentifier(entity.id);
      }
      if (entity.classNames) {
        res += entity.classNames.map(function(cn) {
          return "." + (this.escapeIdentifier(cn));
        }, this).join('');
      }
      if (entity.attrs) {
        res += entity.attrs.map(function(attr) {
          if (attr.operator) {
            if (attr.valueType === 'substitute') {
              return "[" + this.escapeIdentifier(attr.name) + attr.operator + "$" + attr.value + "]";
            } else {
              return "[" + this.escapeIdentifier(attr.name) + attr.operator + this.escapeStr(attr.value) + "]";
            }
          } else {
            return "[" + this.escapeIdentifier(attr.name) + "]";
          }
        }, this).join('');
      }
      if (entity.pseudos) {
        res += entity.pseudos.map(function(pseudo) {
          if (pseudo.valueType) {
            if (pseudo.valueType === 'selector') {
              return ":" + this.escapeIdentifier(pseudo.name) + "(" + this._renderEntity(pseudo.value) + ")";
            } else if (pseudo.valueType === 'substitute') {
              return ":" + this.escapeIdentifier(pseudo.name) + "($" + pseudo.value + ")";
            } else {
              return ":" + this.escapeIdentifier(pseudo.name) + "(" + this.escapeStr(pseudo.value) + ")";
            }
          } else {
            return ":" + this.escapeIdentifier(pseudo.name);
          }
        }, this).join('');
      }
      break;
    default:
      throw Error('Unknown entity type: "' + entity.type(+'".'));
  }
  return res;
};

exports.CssSelectorParser = CssSelectorParser;

},{}],4:[function(require,module,exports){
/*!
  * domready (c) Dustin Diaz 2014 - License MIT
  */
!function (name, definition) {

  if (typeof module != 'undefined') module.exports = definition()
  else if (typeof define == 'function' && typeof define.amd == 'object') define(definition)
  else this[name] = definition()

}('domready', function () {

  var fns = [], listener
    , doc = document
    , hack = doc.documentElement.doScroll
    , domContentLoaded = 'DOMContentLoaded'
    , loaded = (hack ? /^loaded|^c/ : /^loaded|^i|^c/).test(doc.readyState)


  if (!loaded)
  doc.addEventListener(domContentLoaded, listener = function () {
    doc.removeEventListener(domContentLoaded, listener)
    loaded = 1
    while (listener = fns.shift()) listener()
  })

  return function (fn) {
    loaded ? setTimeout(fn, 0) : fns.push(fn)
  }

});

},{}],5:[function(require,module,exports){
if (!Array.prototype.filter) {
    Array.prototype.filter = function (fun) {
        'use strict';

        if (this === void 0 || this === null) {
            throw new TypeError();
        }

        var t = Object(this);
        var len = t.length >>> 0;
        if (typeof fun !== 'function') {
            throw new TypeError();
        }

        var res = [];
        var thisArg = arguments.length >= 2 ? arguments[1] : void 0;
        for (var i = 0; i < len; i++) {
            if (i in t) {
                var val = t[i];
                if (fun.call(thisArg, val, i, t)) {
                    res.push(val);
                }
            }
        }

        return res;
    };
}
Array.prototype.diff = function (a) {
    return this.filter(function (i) { return a.indexOf(i) < 0; });
};
Array.prototype.unique = function () {
    var seen = {}
    return this.filter(function (x) {
        if (seen[x])
            return
        seen[x] = true
        return x
    })
};
},{}],6:[function(require,module,exports){

var vDOM = require('./vDOM/vDOM.js');


/**
 * Returns the CSS patch to a given DOM node.
 * @memberof server#diff
 * @inner
 * @param {element} node DOM node.
 * @param {immutableList} path Current path in the tree.
 * @returns {string} CSS path
 */
function getPath(node, path) {
    var p = path.join(">").replace(/ /g, "");
    if (p.charAt(0) === ">")
        p = p.substring(1);
    return p;
}

function getParentPath(node, path) {
    var p = node.parentNode,
        newPath = path.slice(0);
    newPath.pop();
    var p = newPath.join(">").replace(/ /g, "");
    if (p.charAt(0) === ">")
        p = p.substring(1);
    return p;
}

function addToPath(path, val) {
    var newPath = path.slice(0);
    newPath.push(val);
    return newPath;
}
/**
 * Diff algorithm. Generates a DOM patch.
 * @param {document} oldDoc Old document.
 * @param {document} doc New document.
 * @fires diff.done
 * @returns {Array} DOM patch to be send to the client.
 */
module.exports = function (DOM1, DOM2, entry) {
    var ops = [],
        removals = [];

    /**
     * Helper function that iterates through both trees and compares nodes.
     * @memberof server#diff
     * @inner
     * @param {element} oldNode Current node in oldDoc
     * @param {element} newNode Current node in newDoc
     * @param {immutableList} path Current path in the trees
     * @param {integer} index The index of the nodes in the current tree level.
     */
    function helper(oldNode, newNode, path, index, childNodesIndex) {
        //check if there is the same kind of node in this position
        if (!(oldNode.name !== newNode.name)) {
            var oldKeys = Object.keys(oldNode.attributes),
                newKeys = Object.keys(newNode.attributes),
                removed = oldKeys.diff(newKeys),
                added = newKeys.diff(oldKeys),
                toCompare = newKeys.concat(oldKeys).diff(removed).diff(added).unique();

            for (var i = 0; i < toCompare.length; i++) {
                if (newNode.attributes[toCompare[i]] !== oldNode.attributes[toCompare[i]]) {
                    ops.push({
                        t: "attrChanged",
                        n: getPath(newNode, path),
                        a: toCompare[i],
                        v: newNode.attributes[toCompare[i]]
                    });
                }
            }
            for (var i = 0; i < added.length; i++) {
                ops.push({
                    t: "attrChanged",
                    n: getPath(newNode, path),
                    a: added[i],
                    v: newNode.attributes[added[i]]
                });
            }
            for (var i = 0; i < removed.length; i++) {
                ops.push({
                    t: "attrRemoved",
                    n: getPath(newNode, path),
                    a: removed[i]
                });
            }
            var newChildren = typeof newNode.childNodes !== "undefined" ? [].concat(newNode.childNodes) : [],
                oldChildren = typeof oldNode.childNodes !== "undefined" ? [].concat(oldNode.childNodes) : [],
                discrepancy = oldNode.childNodes.length - oldNode.children.length,
                max = Math.max(newChildren.length, oldChildren.length);
            for (var i = 0; i < max; i++) {
                var oldChild = oldChildren[i],
                    newChild = newChildren[i],
                    newIndex = i - discrepancy;
                //check if new Node is not in old doc -> insert
                if (typeof oldChild === "undefined") {
                    if (newChild instanceof vDOM.virtualTextNode) {
                        ops.push({
                            t: "textAdd",
                            v: newNode.value,
                            p: getPath(newNode, path)
                        });
                        newChildren.splice(i, 1);
                        i--;
                        if (newChildren.length > oldChildren.length) {
                            max--;
                        }
                    } else {
                        var newPath = newChild.name === "html" ? path : addToPath(path, newChild.name + ":nth-child(" + (newIndex + 1) + ")");
                        ops.push({
                            t: "addNode",
                            p: getParentPath(newNode, newPath),
                            n: newChild,
                            l: newChild.listeners,
                            hl: newChild.hasListeners
                        });
                    }
                } else {
                    if (oldChild instanceof vDOM.virtualTextNode && newChild instanceof vDOM.virtualTextNode) {
                        if (oldChild.value !== newChild.value)
                            ops.push({
                                t: "textChange",
                                v: newChild.value,
                                p: getPath(oldNode, path),
                                i: childNodesIndex
                            });
                    } else
                        if (typeof newChild === "undefined") {
                            if (oldChild instanceof vDOM.virtualTextNode) {
                                ops.push({
                                    t: "textRemove",
                                    i: childNodesIndex,
                                    p: getPath(oldNode, path)
                                });
                            } else {
                                var newPath = oldChild.name === "html" ? path : addToPath(path, oldChild.name + ":nth-child(" + (newIndex + 1) + ")");
                                removals.unshift({
                                    t: "remove",
                                    p: getPath(oldChild, newPath),
                                    i: newIndex,
                                    l: oldChild.listeners,
                                    hl: oldChild.hasListeners
                                });
                            }
                        } else {
                            if (oldChild instanceof vDOM.virtualTextNode && !(newChild instanceof vDOM.virtualTextNode)) {
                                ops.push({
                                    t: "textRemove",
                                    i: childNodesIndex,
                                    p: getPath(oldNode, path)
                                });
                                oldChildren.splice(i, 1);
                                i--;
                                if (newChildren.length < oldChildren.length) {
                                    max--;
                                }
                            } else
                                if (!(oldChild instanceof vDOM.virtualTextNode) && newChild instanceof vDOM.virtualTextNode) {
                                    ops.push({
                                        t: "textAdd",
                                        v: newNode.value,
                                        p: getPath(newNode, path)
                                    });
                                    newChildren.splice(i, 1);
                                    i--;
                                    if (newChildren.length > oldChildren.length) {
                                        max--;
                                    }
                                } else {
                                    if (typeof oldChild.name === "undefined")
                                        console.log("dan")
                                    var newPath = oldChild.name === "html" ? path : addToPath(path, oldChild.name + ":nth-child(" + (newIndex + 1) + ")");
                                    if (newChild.hasListeners) {
                                        var domNode = document.querySelector(getPath(oldChild, newPath));
                                        for (var event in newChild.listeners) {
                                            for (var k=0; k<newChild.listeners[event].length; k++) {
                                                var listener = newChild.listeners[event][k];
                                                if (!listener._isAttached) {
                                                    listener._isAttached = true;
                                                    domNode.addEventListener(event, listener);
                                                } else if (listener._detach) {
                                                    domNode.removeEventListener(event, listener);
                                                    newChild.listeners[event].splice(k,1);
                                                    k--;
                                                }
                                            }
                                        }
                                    }
                                    helper(oldChild, newChild, newPath, newIndex, i);
                                }
                        }
                }
            }
        } else {
            ops.push({
                t: "replace",
                p: getPath(newNode, path),
                n: newNode,
                i: index,
                l: newNode.listeners,
                hl: newNode.hasListeners
            });
        }
    }
    helper(DOM1, DOM2, [entry], 1);
    return ops.concat(removals);
}
},{"./vDOM/vDOM.js":25}],7:[function(require,module,exports){
module.options = {
        autoUpdate: true,
        updateInterval: 1
}
},{}],8:[function(require,module,exports){

var vDOM = require('./vDOM/vDOM.js'),
    utils = require('./utils.js'),
    diff = require('./diff.js'),
    cloneObject = require("clone"),
    rendering = false;

function handleListeners(domNode, listeners) {
    for (var event in listeners) {
            for (var i = 0; i < listeners[event].length; i++) {
                var listener = listeners[event][i];
                if (!listener._isAttached) {
                    listener._isAttached = true;
                    domNode.addEventListener(event, listener);
                }
        }
    }
}


module.exports = {
    isRendering: function() {
        return rendering;
    },
    afterRenderCallbacks: [],
    update: function() {
        var d = diff(vDOM.oldDOM, vDOM.newDOM, "html");
        if (!utils.isNode()) {
            if (d.length > 0)
                this.render(d, document.querySelector("html"));
        }
        for (var i = 0; i < this.afterRenderCallbacks.length; i++)
            this.afterRenderCallbacks[i]();
        vDOM.oldDOM = cloneObject(vDOM.newDOM);
        vDOM.newDOM.changed = false;
        return diff;
    },
    render: function(ops,node) {
        var t = new Date().getTime();
        console.log("rendering start", t, ops);
        rendering = true;
        var root = node ? node : document;
        for (var i = 0; i < ops.length; i++) {
            var op = ops[i];
            switch (op.t) {
                case "remove":
                    var node = root.querySelector(op.p),
                        parent = node.parentNode ? node.parentNode : root;
                    parent.removeChild(node);
                    if (op.hl)
                        handleListeners(node, op.l);
                    break;
                case "addNode":
                    var newNode = utils.createNode(op.n,vDOM),
                        parent = op.p.length > 0 ? root.querySelector(op.p) : root;
                    parent.appendChild(newNode);
                    if (op.hl)
                        handleListeners(newNode, op.l);
                    break;
                case "replace":
                    var newNode = utils.createNode(op.n,vDOM),
                        node = root.querySelector(op.p),
                        parent = node.parentNode ? node.parentNode : root;
                    parent.replaceChild(newNode, node);
                    if (op.hl)
                        handleListeners(newNode, op.l);
                    break;
                case "attrChanged":
                    root.querySelector(op.n).setAttribute(op.a, op.v);
                    break;
            }
        }
        console.log("rendering stop", (new Date().getTime() - t) / 1000);
        rendering = false;
    }
}
},{"./diff.js":6,"./utils.js":15,"./vDOM/vDOM.js":25,"clone":1}],9:[function(require,module,exports){
checkAttr = function (rules, node) {
    if (typeof rules.attrs === "undefined")
        return true;
    var attributeKeys = Object.keys(node.attributes);
    if (rules.attrs.length > attributeKeys.length)
        return false;
    for (var i=0; i<rules.attrs.length; i++) {
        var attr = rules.attrs[i],
            nodeAttr = node.attributes[attr.name.toLowerCase()];
        if (typeof nodeAttr === "undefined")
            return false;
        if (typeof attr.operator !== "undefined") {
            switch (attr.operator) {
                case "=":
                    if (nodeAttr !== attr.value) return false;
                case "~=":
                case "*=":
                    if (nodeAttr.indexOf(attr.value) !== -1) return false;
                case "|=":
                case "^=":
                    if (nodeAttr.indexOf(attr.value) === 0) return false;
                case "$=":
                    if (nodeAttr.indexOf(attr.value, nodeAttr.length - attr.value.length) !== -1) return false;
            }
        }
    }
    return true;
}
module.exports = {
    checkAttr:checkAttr
}
},{}],10:[function(require,module,exports){
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
},{}],11:[function(require,module,exports){
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
},{"./selectorUtils.js":14}],12:[function(require,module,exports){
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
},{"./selectorUtils.js":14}],13:[function(require,module,exports){

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
},{"./attributes.js":9,"./identifiers.js":10,"./nesting.js":11,"./pseudos.js":12,"./selectorUtils.js":14,"css-selector-parser":2}],14:[function(require,module,exports){
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
},{"../vDOM/vDOM.js":25}],15:[function(require,module,exports){
(function (global){
function createNode(data, vDOM) {
    var node = document.createElement(data.name);
    for (var i in data.attributes) {
        node.setAttribute(i, data.attributes[i]);
    }
    if (typeof data.childNodes !== "undefined")
        for (var i=0; i<data.childNodes.length; i++) {
            var child =createNode(data.childNodes[i], vDOM);
            if (typeof child !== "undefined")
                node.appendChild(child);
        }
    if (data instanceof vDOM.virtualTextNode)
        return document.createTextNode(data.value);
    return node;
}
var rquickExpr = /^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]+))$/;
function isHTML(str) {
    if (str[0] === "<" && str[str.length - 1] === ">" && str.length >= 3) {
            return true;
    } else {
        var match = rquickExpr.exec(str);
        return match !== null && match[1];
    }
}
function isNode() {
    var res = false; 
    try {
        res = Object.prototype.toString.call(global.process) === '[object process]' 
    } catch(e) {}
    return res;
}
module.exports = {
    createNode: createNode,
    isHTML: isHTML,
    isNode: isNode
}
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],16:[function(require,module,exports){
var vDOMUtils = require('./vDOMUtils.js');
module.exports = {
    //creates a new vitual node from passed html and appends it to all virtual nodes
    addChildFromHtml: function(nodes, html, position) {
        var self = this;
        switch (typeof position) {
            case "string":
                    if (position === "start") {
                        for (var i=0; i<nodes.length; i++) {
                            var newDOM = this.createVDOM(html);
                            for (var j=0; j<newDOM.children.length; j++) {
                                newDOM.children[j].parentNode = nodes[i];
                                nodes[i].children.unshift(newDOM.children[j]);
                                nodes[i].childNodes.unshift(newDOM.childNodes[j]);
                                if (newDOM.childNodes[j].id)
                                    self.idNodes[newDOM.childNodes[j].id] = newDOM.childNodes[j];
                            }
                        }
                    } if (position === "end") {
                        for (var i=0; i<nodes.length; i++) {
                            var newDOM = this.createVDOM(html);
                            for (var j=0; j<newDOM.children.length; j++) {
                                newDOM.children[j].parentNode = nodes[i];
                                nodes[i].children.push(newDOM.children[j]);
                                nodes[i].childNodes.push(newDOM.childNodes[j]);
                                if (newDOM.childNodes[j].id)
                                    self.idNodes[newDOM.childNodes[j].id] = newDOM.childNodes[j];
                            }
                        }
                    }
                break;
            case "number":
                    for (var i=0; i<nodes.length; i++) {
                        var newDOM = this.createVDOM(html);
                        for (var j=0; j<newDOM.children.length; j++) {
                            newDOM.children[j].parentNode = nodes[i];
                            nodes[i].childNodes.splice(position, nodes[i].childNodes.indexOf(nodes[i].children[position]), newDOM);
                            nodes[i].children.splice(position, 0, newDOM.children[j]);
                            if (newDOM.childNodes[j].id)
                                self.idNodes[newDOM.childNodes[j].id] = newDOM.childNodes[j];
                        }
                    }
                break;
        }
        vDOMUtils.setChanged(nodes[0]);
    },
    addChildFromVNodes: function(nodes, vNodes, position) {
        this.removeNodes(vNodes, true);
        var clones = [],
            self = this;
        switch (typeof position) {
            case "string":
                    if (position === "start") {
                        for (var i=0; i<nodes.length; i++) {
                            var newDOM = vDOMUtils.clone(vNodes);
                            clones = clones.concat(newDOM);
                            nodes[i].children = newDOM.concat(nodes[i].children);
                            nodes[i].childNodes = newDOM.concat(nodes[i].childNodes);
                            for (var k=0; k<newDOM.length; k++) {
                                newDOM[k].parentNode = nodes[i];
                                if (newDOM[k].id)
                                    self.idNodes[newDOM[k].id] = newDOM[k];
                            }
                        }
                    } if (position === "end") {
                        for (var i=0; i<nodes.length; i++) {
                            var newDOM = vDOMUtils.clone(vNodes);
                            clones = clones.concat(newDOM);
                            nodes[i].children = nodes[i].children.concat(newDOM);
                            nodes[i].childNodes = nodes[i].childNodes.concat(newDOM);
                            for (var k=0; k<newDOM.length; k++) {
                                newDOM[k].parentNode = nodes[i];
                                if (newDOM[k].id)
                                    self.idNodes[newDOM[k].id] = newDOM[k];
                            }
                        }
                    }
                break;
            case "number":
                    for (var i=0; i<nodes.length; i++) {
                        var newDOM = this.createVDOM(html);
                        for (var j=0; j<newDOM.children.length; j++) {
                            var newDOM = vDOMUtils.clone(vNodes);
                            clones = clones.concat(newDOM);
                            nodes[i].childNodes.splice(position, nodes[i].childNodes.indexOf(nodes[i].children[position]), newDOM);
                            nodes[i].children.splice(position, 0, newDOM);
                            for (var k=0; k<newDOM.length; k++) {
                                newDOM[k].parentNode = nodes[i];
                                if (newDOM[k].id)
                                    self.idNodes[newDOM[k].id] = newDOM[k];
                            }
                        }
                    }
                break;
        }
        vDOMUtils.setChanged(nodes[0]);
        return clones;
    }
}
},{"./vDOMUtils.js":26}],17:[function(require,module,exports){
var vDOMUtils = require('./vDOMUtils.js');
module.exports = {
    //Get the value of an attribute for the first element in the set of matched elements
    getAttribute(nodes, attribute) {
        var node = nodes[0];
        if (typeof node.attributes[attribute.toLowerCase()] !== "undefined")
            return node.attributes[attribute.toLowerCase()];
        return undefined;
    },
    //Set the value of an attribute for each element
    setAttribute(nodes, attribute, value) {
        for (var i=0; i<nodes.length; i++) {
            var node = nodes[i];
            node.attributes[attribute.toLowerCase()] = value;
        }
        vDOMUtils.setChanged(nodes[0]);
    }
}
},{"./vDOMUtils.js":26}],18:[function(require,module,exports){
var vDOMUtils = require('./vDOMUtils.js');
module.exports = {
    //checks all nodes if they have the supplied classes
    hasClass: function(nodes, classIn) {
        for (var i=0; i<nodes.length; i++) {
            var node = nodes[i];
            if (node.classNames.indexOf(classIn.toLowerCase()) > -1)
                return true;
        }
        return false;
    },
    //removes classes from all virtual nodes
    removeClasses: function(nodes, classes) {
        classes = classes.split(' ');
        for (var i=0; i<nodes.length; i++) {
            var node = nodes[i];
                for (var j=0; j<classes.length; j++) {
                    if (typeof classes[j] === "undefined") continue;
                    var index = node.classNames.indexOf(classes[j].toLowerCase());
                    if (index > -1) {
                        node.classNames.splice(index,1);
                    }
                }
            node.attributes.class = node.classNames.join(' ');
        }
        vDOMUtils.setChanged(nodes[0]);
    },
    //adds classs to all virtual nodes
    addClasses: function(nodes, classes) {
        classes = classes.split(' ');
        for (var i=0; i<nodes.length; i++) {
            var node = nodes[i];
                for (var j=0; j<classes.length; j++) {
                    if (typeof classes[j] === "undefined") continue;
                    if (node.classNames.indexOf(classes[j].toLowerCase()) === -1) {
                        node.classNames.push(classes[j].toLowerCase());
                    }
                }
            node.attributes.class = node.classNames.join(' ');
        }
        vDOMUtils.setChanged(nodes[0]);
    }
}
},{"./vDOMUtils.js":26}],19:[function(require,module,exports){
/**
 * 
 * lifted and modified from: https://github.com/ashi009/node-fast-html-parser
 * 
 */

var kMarkupPattern = /<!--[^]*?(?=-->)-->|<(\/?)([a-z][a-z0-9]*)\s*([^>]*?)(\/?)>/ig;
var kAttributePattern = /\b([A-z]*)\s*=\s*("([^"]+)"|'([^']+)'|(\S+))/ig;
var kSelfClosingElements = {
    meta: true,
    img: true,
    link: true,
    input: true,
    area: true,
    br: true,
    hr: true
};
var kElementsClosedByOpening = {
    li: { li: true },
    p: { p: true, div: true },
    td: { td: true, th: true },
    th: { td: true, th: true }
};
var kElementsClosedByClosing = {
    li: { ul: true, ol: true },
    a: { div: true },
    b: { div: true },
    i: { div: true },
    p: { div: true },
    td: { tr: true, table: true },
    th: { tr: true, table: true }
};
var kBlockTextElements = {
    script: true,
    noscript: true,
    style: true,
    pre: true
};

var nodeTypes = require('./nodeTypes.js');

module.exports = {
    idNodes: [],
    createVDOM: function (data, init) {
        data = data.replace(/\r?\n|\r/g, "");
        var root = new nodeTypes.virtualNode("root", null);
        var currentParent = root;
        var stack = [root];
        var lastTextPos = -1;

        for (var match, text; match = kMarkupPattern.exec(data);) {
            if (lastTextPos > -1) {
                if (lastTextPos + match[0].length < kMarkupPattern.lastIndex) {
                    // if has content
                    text = data.substring(lastTextPos, kMarkupPattern.lastIndex - match[0].length);
                    if (text.replace(/ /g, "").length > 0)
                        currentParent.childNodes.push(new nodeTypes.virtualTextNode(text, currentParent));
                }
            }
            lastTextPos = kMarkupPattern.lastIndex;
            if (match[0][1] == '!') {
                // this is a comment
                continue;
            }
            match[2] = match[2].toLowerCase();
            if (!match[1]) {
                // not </ tags
                var attrs = {};
                for (var attMatch; attMatch = kAttributePattern.exec(match[3]);)
                    attrs[attMatch[1]] = attMatch[3] || attMatch[4] || attMatch[5];
                // console.log(attrs);
                if (!match[4] && kElementsClosedByOpening[currentParent.name]) {
                    if (kElementsClosedByOpening[currentParent.name][match[2]]) {
                        stack.pop();
                        currentParent = stack[stack.length - 1];
                    }
                }
                var node = new nodeTypes.virtualNode(match[2], currentParent);
                currentParent.children.push(node);
                currentParent.childNodes.push(node);
                currentParent = node;
                for (var aName in attrs) {
                    var value = attrs[aName];
                    if (aName === "id") {
                        if (init)
                            this.idNodes[value] = currentParent;
                        currentParent.id = value;
                    }
                    if (aName === "class")
                        currentParent.classNames = value.split(" ");
                    currentParent.attributes[aName] = value;
                }
                stack.push(currentParent);
                if (kBlockTextElements[match[2]]) {
                    // a little test to find next </script> or </style> ...
                    var closeMarkup = '</' + match[2] + '>';
                    var index = data.indexOf(closeMarkup, kMarkupPattern.lastIndex);
                    if (index == -1) {
                        lastTextPos = kMarkupPattern.lastIndex = data.length + 1;
                    } else {
                        lastTextPos = kMarkupPattern.lastIndex = index + closeMarkup.length;
                        match[1] = true;
                    }
                }
            }
            if (match[1] || match[4] ||
                kSelfClosingElements[match[2]]) {
                // </ or /> or <br> etc.
                while (true) {
                    if (currentParent.name == match[2]) {
                        stack.pop();
                        currentParent = stack[stack.length - 1];
                        break;
                    } else {
                        // Trying to close current tag, and move on
                        if (kElementsClosedByClosing[currentParent.name]) {
                            if (kElementsClosedByClosing[currentParent.name][match[2]]) {
                                stack.pop();
                                currentParent = stack[stack.length - 1];
                                continue;
                            }
                        }
                        // Use aggressive strategy to handle unmatching markups.
                        break;
                    }
                }
            }
        }
        return root;
    },
    load: function(html) {
        this.oldDOM = this.createVDOM(html, true);
        this.newDOM = this.createVDOM(html, true);
        this.newDOM.changed = false;
    }
};
},{"./nodeTypes.js":22}],20:[function(require,module,exports){
var vDOMUtils = require('./vDOMUtils.js');
module.exports = {
    on: function(nodes, event, callback) {
        for (var i=0; i<nodes.length; i++) {
            var node = nodes[i];
            var listener = (function(node, callback) {
                var newListener = function (event) {
                    callback.call(node, event);
                }
                newListener._originalCallback = callback;
                newListener._detach = false;
                newListener._isAttached = false;
                return newListener
            })(node, callback);
            if (typeof node.listeners[event] === "undefined")
                node.listeners[event] = [listener];
            else
                node.listeners[event].push(listener);
            node.hasListeners = true;
        }
        vDOMUtils.setChanged(nodes[0]);
    },
    off: function(nodes, event, callback) {
        for (var i=0; i<nodes.length; i++) {
            var node = nodes[i];
            if (typeof node.listeners[event] !== "undefined")
                for (var i=0; i<node.listeners[event].length; i++) {
                    var listener = node.listeners[event][i];
                    if (listener._originalCallback === callback && listener._isAttached)
                        listener._detach = true;
                }
            node.hasListeners = true;
        }
        vDOMUtils.setChanged(nodes[0]);
    }
}
},{"./vDOMUtils.js":26}],21:[function(require,module,exports){
var utils = require('../utils.js'),
    nodeTypes = require('./nodeTypes.js')
    vDOMUtils = require('./vDOMUtils.js'),
    selfClosing = ["area","base","br","col","command","embed","hr","img","input","keygen","link","meta","param","source","track","wbr"];

var generateHTML = function(node) {
    if (node instanceof nodeTypes.virtualNode) {
        var res = "<" + node.name;
        for (var name in node.attributes) {
            res += " " + name + "=\"" + node.attributes[name] + "\"";
        }
        if (selfClosing.indexOf(node.name) > -1) {
            res +="/>";
            return res;
        }
        res+=">";
        for (var i=0; i<node.childNodes.length; i++) {
            res += generateHTML(node.childNodes[i]);
        }
        res += "</" + node.name + ">";
        return res;
    } else {
        return node.value;
    }
}

module.exports = {
    //generated virtual DOM from passed html and replaces the children of the passed nodes with it
    setHTML: function(nodes, html) {
        var self = this;
        function removeHelper(nodes) {
            for (var i=0; i<node.children.length; i++)
                removeHelper(node.children[i]);
            self.removeNodes(node.children);
        }
        function addHelper(nodes) {
            for (var i=0; i<node.children.length; i++) {
                addHelper(node.children[i]);
                if (node.children[i].id)
                    self.idNodes = node.children[i];
            }
        }
        for (var i=0; i<nodes.length; i++) {
            var node = nodes[i];
            removeHelper(node);
            node.children = this.createVDOM(html).children;
            addHelper(node.children);
            node.childNodes = this.createVDOM(html).childNodes;    
        }
        vDOMUtils.setChanged(nodes[0]);
    },
    //return innerHTML for a node
    getHTML: function(nodes) {
        var res = "";
        for (var i=0; i<nodes.length; i++) {
            for (var k=0; k<nodes[i].children.length; k++) {
                res+= generateHTML(nodes[i].children[k]);
            }
        }
        return res;
    }
}
},{"../utils.js":15,"./nodeTypes.js":22,"./vDOMUtils.js":26}],22:[function(require,module,exports){
module.exports = {
    virtualNode: function (name, parentNode) {
        Object.assign(this, {
            name: name,
            parentNode: parentNode,
            attributes: {},
            classNames: [],
            path: "",
            children: [],
            childNodes: [],
            id: null,
            listeners: {},
            hasListeners: false, 
            removeListeners: []
        });
    },
    virtualTextNode: function (value, parentNode) {
        Object.assign(this, {
            parentNode: parentNode,
            value: value
        });
    }
}
},{}],23:[function(require,module,exports){
var vDOMUtils = require('./vDOMUtils.js');
module.exports = {
    //removes a virtual node from its parent
    removeNodes: function(nodes, ignoreSetChanged) {
        for (var i=0; i<nodes.length; i++) {
            var node = nodes[i];
            if (!node.parentNode) continue;
            if (node.id)
                delete this.idNodes[node.id];
            node.parentNode.children.splice(node.parentNode.children.indexOf(node),1);
            node.parentNode.childNodes.splice(node.parentNode.childNodes.indexOf(node),1);
        }
        if (ignoreSetChanged) return;
        vDOMUtils.setChanged(nodes[0]);
    }
}
},{"./vDOMUtils.js":26}],24:[function(require,module,exports){
var vDOMUtils = require('./vDOMUtils.js');

module.exports = {
    //Set the value of a style for each element
    setStyle(nodes, property, value) {
        property = vDOMUtils.expandShorthandCSS(property);
        if (vDOMUtils.validateCSS(property, value)) {
            for (var i=0; i<nodes.length; i++) {
                var node = nodes[i];
                if (typeof node.attributes.style === "undefined")
                    node.attributes.style = "";
                var styles = vDOMUtils.styleToObject(node.attributes.style);  
                styles[property] = value;
                node.attributes.style = vDOMUtils.objectToStyle(styles);
            }
            vDOMUtils.setChanged(nodes[0]);
        }
    },
    //get the value of a style for the first element
    getStyle(nodes, property) {
        property = vDOMUtils.expandShorthandCSS(property);
        var node = nodes[0],
            styles = vDOMUtils.styleToObject(node.attributes.style);
        return styles[property];
    }
}
},{"./vDOMUtils.js":26}],25:[function(require,module,exports){
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

},{"./addChild.js":16,"./attributes.js":17,"./class.js":18,"./createVDOM.js":19,"./events.js":20,"./html.js":21,"./nodeTypes.js":22,"./removeChild.js":23,"./styles.js":24,"./vDOMUtils.js":26}],26:[function(require,module,exports){
var cloneObject = require("clone");
function clone(nodes) {
    var newNodes = [];
    for (var i=0; i<nodes.length; i++) {
        var clone = cloneObject(nodes[i]);
        if (clone.hasListeners)
            for (var event in clone.listeners) {
                for (var i = 0; i < clone.listeners[event].length; i++) {
                    var listener = clone.listeners[event][i];
                    listener._isAttached = false;
                }
            }
        newNodes.push(clone);
    } 
    newNodes.prototype = nodes.prototype;
    return newNodes;
}
function setChanged(node) {
    while (node.parentNode) {
        node = node.parentNode;
    }
    node.changed = true;
}
function expandShorthandCSS(str) {
    if (str.indexOf('-') > 0)
        return str;
    var result = str.replace(/([A-Z]+)/g, ",$1").replace(/^,/, "");
    return result.split(",").join("-").toLowerCase();
}
function validateCSS(property, value) {
    var element = document.createElement('div');
    element.style[property] = value;
    return element.style[property] === value;
}
function styleToObject(style) {
    if (style[style.length-1] === ";")
        style = style.slice(0,style.length-1); 
    style = style.replace(/ /g, "").split(";");
    var res = {};
    for (var i=0; i<style.length; i++) {
        var s = style[i];
        if (s!=="") {
            var ss = s.split(":");
            res[ss[0]] = ss[1];
        }
    }
    return res;
}
function objectToStyle(o) {
    var res = [];
    for (var i in o) {
        res.push(i + ": " + o[i]);
    }
    return res.join(";");
}
module.exports = {
    clone: clone,
    setChanged: setChanged,
    expandShorthandCSS: expandShorthandCSS,
    validateCSS: validateCSS,
    styleToObject: styleToObject,
    objectToStyle: objectToStyle
}
},{"clone":1}],27:[function(require,module,exports){
var vDOM = require('./vDOM/vDOM.js'),
    render = require('./render.js'),
    options = require('./options.js');

function virtualQuery(array) {
  var arr = [];
  arr = arr.concat(array);
  arr.__proto__ = virtualQuery.prototype;
  return arr;
}
virtualQuery.prototype = new Array;

Object.assign(virtualQuery.prototype, {
    append: function (arg) {
        switch (typeof arg) {
            case "string":
                vDOM.addChildFromHtml(this, arg, "end");
                return this;
            case "object":
                if (arg instanceof vDOM.virtualNode) {
                    vDOM.addChildFromVNodes(this, [arg], "end");
                }
                if (arg instanceof virtualQuery) {
                    vDOM.addChildFromVNodes(this, arg, "end");
                }
                return this;
        }
    },
    appendTo: function (arg) {
        switch (typeof arg) {
            case "string":
                return new virtualQuery(vDOM.addChildFromVNodes([vDOM.createVDOM(arg)], this, "end"));
            case "object":
                if (arg instanceof vDOM.virtualNode) {
                    return new virtualQuery(vDOM.addChildFromVNodes([arg], this, "end"));
                }
                if (arg instanceof virtualQuery) {
                    return new virtualQuery(vDOM.addChildFromVNodes(arg, this, "end"));
                }
        }
    },
    prepend: function (arg) {
        switch (typeof arg) {
            case "string":
                vDOM.addChildFromHtml(this, arg, "start");
                return this;
            case "object":
                if (arg instanceof vDOM.virtualNode) {
                    vDOM.addChildFromVNodes(this, [arg], "start");
                }
                if (arg instanceof virtualQuery) {
                    vDOM.addChildFromVNodes(this, arg, "start");
                }
                return this;
        }
    },
    prependTo: function (arg) {
        switch (typeof arg) {
            case "string":
                return new virtualQuery(vDOM.addChildFromVNodes([vDOM.createVDOM(arg)], this, "start"));
            case "object":
                if (arg instanceof vDOM.virtualNode) {
                    return new virtualQuery(vDOM.addChildFromVNodes([arg], this, "start"));
                }
                if (arg instanceof virtualQuery) {
                    return new virtualQuery(vDOM.addChildFromVNodes(arg, this, "start"));
                }
        }
    },
    remove: function () {
        vDOM.removeNodes(this);
        return this;
    },
    addClass: function (classes) {
        vDOM.addClasses(this, classes);
        return this;
    },
    removeClass: function(classes) {
        vDOM.removeClasses(this, classes);
        return this;
    },
    hasClass: function(classIn) {
        return vDOM.hasClass(this, classIn);
    },
    html: function (html) {
        if (typeof html !== "undefined") {
            vDOM.setHTML(this, html);
            return this;
        } else {
            return vDOM.getHTML(this);
        }
    },
    attr: function() {
        var args = [].slice.call(arguments);
        switch (args.length) {
            case 1:
                switch(typeof args[0]) {
                    case "string":
                        return vDOM.getAttribute(this, args[0]);
                    case "object":
                        for (var attrName in args[0])
                            vDOM.setAttribute(this, attrName, args[0][attrName]);
                        return this;
                }
            case 2:
                vDOM.setAttribute(this, args[0], args[1])
                return this;
        }
    },
    css: function() {
        var args = [].slice.call(arguments);
        switch (args.length) {
            case 1:
                switch(typeof args[0]) {
                    case "string":
                        return vDOM.getStyle(this, args[0]);
                    case "object":
                        for (var property in args[0])
                            vDOM.setStyle(this, property, args[0][property]);
                        return this;
                }
            case 2:
                vDOM.setStyle(this, args[0], args[1]);
                return this;
        }
    },
    clone: function() {
        return vDOM.clone(this);
    },
    on: function(event, callback) {
        vDOM.on(this, event, callback);
        if (!options.autoUpdate)
            render.update();
    },
    off: function(event, callback) {
        vDOM.off(this, event, callback);
        if (!options.autoUpdate)
            render.update();
    }
});
module.exports = virtualQuery;
},{"./options.js":7,"./render.js":8,"./vDOM/vDOM.js":25}],28:[function(require,module,exports){
require("./arrayFunctions.js");
var isReady = false,
    vDOM = require('./vDOM/vDOM.js'),
    utils = require('./utils.js'),
    render = require('./render.js'),
    virtualQuery = require('./virtualQuery.js'),
    selectorEngine = require('./selectorEngine/selectorEngine.js'),
    domready = utils.isNode() ? null : require('domready'),
    options = require('./options.js');



function prepareDOMs() {
    if (!vDOM.oldDOM) {
        if (utils.isNode()) {
            vDOM.load("");
        } else {
            vDOM.load(document.querySelector('html').outerHTML);
        }
    }
}
if (domready)
    domready(function () {
            isReady = true;
    });

function renderTimer() {
    if (vDOM.newDOM.changed) {
        window.requestAnimationFrame(function() {
            render.update();
            window.setTimeout(renderTimer, 1);
        });
    } else 
        window.setTimeout(renderTimer,1);
}

function ready(cb) {
    prepareDOMs();
    if (options.autoUpdate && !utils.isNode())
        window.setTimeout(renderTimer, options.updateInterval);
    cb();
}
var vQuery = function(arg, optionsIn) {
    switch (typeof arg) {
        case "function":
            if (typeof optionsIn === "object")
                options = Object.assign(options, optionsIn);
            if (isReady || utils.isNode()) {
                ready(arg);
            }
            else
                domready(function() {     
                    ready(arg);
                });
            break;
        case "string":
            prepareDOMs();
            if (utils.isHTML(arg)) {
                return new virtualQuery(vDOM.createVDOM(arg, true).children);
            } else {
                var nodes = selectorEngine.query(vDOM.newDOM,arg);
                if (nodes.length > 0) {
                    return new virtualQuery(nodes);
                } else return nodes;
            }  
        case "object":
            prepareDOMs();
            if (arg instanceof vDOM.virtualNode) {
                return new virtualQuery(arg);
            }        
    }
}

vQuery.afterRender = function(cb) {
    render.afterRenderCallbacks.push(cb);
};

vQuery.update = function () {
    render.update();
    return this;
}

vQuery.getDOM = function() {
    return [vDOM.oldDOM, vDOM.newDOM];
}

vQuery.load = function(html) {
    return vDOM.load(html);
}
module.exports = vQuery;
},{"./arrayFunctions.js":5,"./options.js":7,"./render.js":8,"./selectorEngine/selectorEngine.js":13,"./utils.js":15,"./vDOM/vDOM.js":25,"./virtualQuery.js":27,"domready":4}],29:[function(require,module,exports){
'use strict'

exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

function init () {
  var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  for (var i = 0, len = code.length; i < len; ++i) {
    lookup[i] = code[i]
    revLookup[code.charCodeAt(i)] = i
  }

  revLookup['-'.charCodeAt(0)] = 62
  revLookup['_'.charCodeAt(0)] = 63
}

init()

function toByteArray (b64) {
  var i, j, l, tmp, placeHolders, arr
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // the number of equal signs (place holders)
  // if there are two placeholders, than the two characters before it
  // represent one byte
  // if there is only one, then the three characters before it represent 2 bytes
  // this is just a cheap hack to not do indexOf twice
  placeHolders = b64[len - 2] === '=' ? 2 : b64[len - 1] === '=' ? 1 : 0

  // base64 is 4/3 + up to two characters of the original data
  arr = new Arr(len * 3 / 4 - placeHolders)

  // if there are placeholders, only get up to the last complete 4 chars
  l = placeHolders > 0 ? len - 4 : len

  var L = 0

  for (i = 0, j = 0; i < l; i += 4, j += 3) {
    tmp = (revLookup[b64.charCodeAt(i)] << 18) | (revLookup[b64.charCodeAt(i + 1)] << 12) | (revLookup[b64.charCodeAt(i + 2)] << 6) | revLookup[b64.charCodeAt(i + 3)]
    arr[L++] = (tmp >> 16) & 0xFF
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  if (placeHolders === 2) {
    tmp = (revLookup[b64.charCodeAt(i)] << 2) | (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[L++] = tmp & 0xFF
  } else if (placeHolders === 1) {
    tmp = (revLookup[b64.charCodeAt(i)] << 10) | (revLookup[b64.charCodeAt(i + 1)] << 4) | (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var output = ''
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    output += lookup[tmp >> 2]
    output += lookup[(tmp << 4) & 0x3F]
    output += '=='
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + (uint8[len - 1])
    output += lookup[tmp >> 10]
    output += lookup[(tmp >> 4) & 0x3F]
    output += lookup[(tmp << 2) & 0x3F]
    output += '='
  }

  parts.push(output)

  return parts.join('')
}

},{}],30:[function(require,module,exports){
(function (global){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var isArray = require('isarray')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Due to various browser bugs, sometimes the Object implementation will be used even
 * when the browser supports typed arrays.
 *
 * Note:
 *
 *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
 *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *     incorrect length in some situations.

 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
 * get the Object implementation, which is slower but behaves correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = global.TYPED_ARRAY_SUPPORT !== undefined
  ? global.TYPED_ARRAY_SUPPORT
  : typedArraySupport()

/*
 * Export kMaxLength after typed array support is determined.
 */
exports.kMaxLength = kMaxLength()

function typedArraySupport () {
  try {
    var arr = new Uint8Array(1)
    arr.foo = function () { return 42 }
    return arr.foo() === 42 && // typed array instances can be augmented
        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
        arr.subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
  } catch (e) {
    return false
  }
}

function kMaxLength () {
  return Buffer.TYPED_ARRAY_SUPPORT
    ? 0x7fffffff
    : 0x3fffffff
}

function createBuffer (that, length) {
  if (kMaxLength() < length) {
    throw new RangeError('Invalid typed array length')
  }
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = new Uint8Array(length)
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    if (that === null) {
      that = new Buffer(length)
    }
    that.length = length
  }

  return that
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  if (!Buffer.TYPED_ARRAY_SUPPORT && !(this instanceof Buffer)) {
    return new Buffer(arg, encodingOrOffset, length)
  }

  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new Error(
        'If encoding is specified then the first argument must be a string'
      )
    }
    return allocUnsafe(this, arg)
  }
  return from(this, arg, encodingOrOffset, length)
}

Buffer.poolSize = 8192 // not used by this implementation

// TODO: Legacy, not needed anymore. Remove in next major version.
Buffer._augment = function (arr) {
  arr.__proto__ = Buffer.prototype
  return arr
}

function from (that, value, encodingOrOffset, length) {
  if (typeof value === 'number') {
    throw new TypeError('"value" argument must not be a number')
  }

  if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) {
    return fromArrayBuffer(that, value, encodingOrOffset, length)
  }

  if (typeof value === 'string') {
    return fromString(that, value, encodingOrOffset)
  }

  return fromObject(that, value)
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(null, value, encodingOrOffset, length)
}

if (Buffer.TYPED_ARRAY_SUPPORT) {
  Buffer.prototype.__proto__ = Uint8Array.prototype
  Buffer.__proto__ = Uint8Array
  if (typeof Symbol !== 'undefined' && Symbol.species &&
      Buffer[Symbol.species] === Buffer) {
    // Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
    Object.defineProperty(Buffer, Symbol.species, {
      value: null,
      configurable: true
    })
  }
}

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be a number')
  }
}

function alloc (that, size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(that, size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(that, size).fill(fill, encoding)
      : createBuffer(that, size).fill(fill)
  }
  return createBuffer(that, size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(null, size, fill, encoding)
}

function allocUnsafe (that, size) {
  assertSize(size)
  that = createBuffer(that, size < 0 ? 0 : checked(size) | 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < size; i++) {
      that[i] = 0
    }
  }
  return that
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(null, size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(null, size)
}

function fromString (that, string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('"encoding" must be a valid string encoding')
  }

  var length = byteLength(string, encoding) | 0
  that = createBuffer(that, length)

  that.write(string, encoding)
  return that
}

function fromArrayLike (that, array) {
  var length = checked(array.length) | 0
  that = createBuffer(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

function fromArrayBuffer (that, array, byteOffset, length) {
  array.byteLength // this throws if `array` is not a valid ArrayBuffer

  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('\'offset\' is out of bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('\'length\' is out of bounds')
  }

  if (length === undefined) {
    array = new Uint8Array(array, byteOffset)
  } else {
    array = new Uint8Array(array, byteOffset, length)
  }

  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = array
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    that = fromArrayLike(that, array)
  }
  return that
}

function fromObject (that, obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    that = createBuffer(that, len)

    if (that.length === 0) {
      return that
    }

    obj.copy(that, 0, 0, len)
    return that
  }

  if (obj) {
    if ((typeof ArrayBuffer !== 'undefined' &&
        obj.buffer instanceof ArrayBuffer) || 'length' in obj) {
      if (typeof obj.length !== 'number' || isnan(obj.length)) {
        return createBuffer(that, 0)
      }
      return fromArrayLike(that, obj)
    }

    if (obj.type === 'Buffer' && isArray(obj.data)) {
      return fromArrayLike(that, obj.data)
    }
  }

  throw new TypeError('First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.')
}

function checked (length) {
  // Note: cannot use `length < kMaxLength` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= kMaxLength()) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + kMaxLength().toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; i++) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var buf = list[i]
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (typeof ArrayBuffer !== 'undefined' && typeof ArrayBuffer.isView === 'function' &&
      (ArrayBuffer.isView(string) || string instanceof ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    string = '' + string
  }

  var len = string.length
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'binary':
      // Deprecated
      case 'raw':
      case 'raws':
        return len
      case 'utf8':
      case 'utf-8':
      case undefined:
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'binary':
        return binarySlice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// The property is used by `Buffer.isBuffer` and `is-buffer` (in Safari 5-7) to detect
// Buffer instances.
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length | 0
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (!Buffer.isBuffer(target)) {
    throw new TypeError('Argument must be a Buffer')
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

function arrayIndexOf (arr, val, byteOffset, encoding) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var foundIndex = -1
  for (var i = 0; byteOffset + i < arrLength; i++) {
    if (read(arr, byteOffset + i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
      if (foundIndex === -1) foundIndex = i
      if (i - foundIndex + 1 === valLength) return (byteOffset + foundIndex) * indexSize
    } else {
      if (foundIndex !== -1) i -= i - foundIndex
      foundIndex = -1
    }
  }
  return -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset >>= 0

  if (this.length === 0) return -1
  if (byteOffset >= this.length) return -1

  // Negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = Math.max(this.length + byteOffset, 0)

  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  if (Buffer.isBuffer(val)) {
    // special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(this, val, byteOffset, encoding)
  }
  if (typeof val === 'number') {
    if (Buffer.TYPED_ARRAY_SUPPORT && Uint8Array.prototype.indexOf === 'function') {
      return Uint8Array.prototype.indexOf.call(this, val, byteOffset)
    }
    return arrayIndexOf(this, [ val ], byteOffset, encoding)
  }

  throw new TypeError('val must be string, number or Buffer')
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new Error('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function binaryWrite (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset | 0
    if (isFinite(length)) {
      length = length | 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  // legacy write(string, encoding, offset, length) - remove in v0.13
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'binary':
        return binaryWrite(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
      : (firstByte > 0xBF) ? 2
      : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function binarySlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    newBuf = this.subarray(start, end)
    newBuf.__proto__ = Buffer.prototype
  } else {
    var sliceLen = end - start
    newBuf = new Buffer(sliceLen, undefined)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
  }

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  this[offset] = (value & 0xff)
  return offset + 1
}

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; i++) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; i++) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24)
    this[offset + 2] = (value >>> 16)
    this[offset + 1] = (value >>> 8)
    this[offset] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
    this[offset + 2] = (value >>> 16)
    this[offset + 3] = (value >>> 24)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start
  var i

  if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (i = len - 1; i >= 0; i--) {
      target[i + targetStart] = this[i + start]
    }
  } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    // ascending copy from start
    for (i = 0; i < len; i++) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, start + len),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if (code < 256) {
        val = code
      }
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; i++) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : utf8ToBytes(new Buffer(val, encoding).toString())
    var len = bytes.length
    for (i = 0; i < end - start; i++) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; i++) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

function isnan (val) {
  return val !== val // eslint-disable-line no-self-compare
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"base64-js":29,"ieee754":31,"isarray":32}],31:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],32:[function(require,module,exports){
var toString = {}.toString;

module.exports = Array.isArray || function (arr) {
  return toString.call(arr) == '[object Array]';
};

},{}]},{},[28])(28)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIm5vZGVfbW9kdWxlcy9jbG9uZS9jbG9uZS5qcyIsIm5vZGVfbW9kdWxlcy9jc3Mtc2VsZWN0b3ItcGFyc2VyL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2Nzcy1zZWxlY3Rvci1wYXJzZXIvbGliL2Nzcy1zZWxlY3Rvci1wYXJzZXIuanMiLCJub2RlX21vZHVsZXMvZG9tcmVhZHkvcmVhZHkuanMiLCJzcmMvYXJyYXlGdW5jdGlvbnMuanMiLCJzcmMvZGlmZi5qcyIsInNyYy9vcHRpb25zLmpzIiwic3JjL3JlbmRlci5qcyIsInNyYy9zZWxlY3RvckVuZ2luZS9hdHRyaWJ1dGVzLmpzIiwic3JjL3NlbGVjdG9yRW5naW5lL2lkZW50aWZpZXJzLmpzIiwic3JjL3NlbGVjdG9yRW5naW5lL25lc3RpbmcuanMiLCJzcmMvc2VsZWN0b3JFbmdpbmUvcHNldWRvcy5qcyIsInNyYy9zZWxlY3RvckVuZ2luZS9zZWxlY3RvckVuZ2luZS5qcyIsInNyYy9zZWxlY3RvckVuZ2luZS9zZWxlY3RvclV0aWxzLmpzIiwic3JjL3V0aWxzLmpzIiwic3JjL3ZET00vYWRkQ2hpbGQuanMiLCJzcmMvdkRPTS9hdHRyaWJ1dGVzLmpzIiwic3JjL3ZET00vY2xhc3MuanMiLCJzcmMvdkRPTS9jcmVhdGVWRE9NLmpzIiwic3JjL3ZET00vZXZlbnRzLmpzIiwic3JjL3ZET00vaHRtbC5qcyIsInNyYy92RE9NL25vZGVUeXBlcy5qcyIsInNyYy92RE9NL3JlbW92ZUNoaWxkLmpzIiwic3JjL3ZET00vc3R5bGVzLmpzIiwic3JjL3ZET00vdkRPTS5qcyIsInNyYy92RE9NL3ZET01VdGlscy5qcyIsInNyYy92aXJ0dWFsUXVlcnkuanMiLCIuLi8uLi8uLi8uLi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9iYXNlNjQtanMvbGliL2I2NC5qcyIsIi4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2J1ZmZlci9pbmRleC5qcyIsIi4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2llZWU3NTQvaW5kZXguanMiLCIuLi8uLi8uLi8uLi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9pc2FycmF5L2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNyT0E7QUFDQTtBQUNBOztBQ0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsa0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoTkE7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQzVEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUM1SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDN0dBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUMvcURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIGNsb25lID0gKGZ1bmN0aW9uKCkge1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgbmF0aXZlTWFwO1xudHJ5IHtcbiAgbmF0aXZlTWFwID0gTWFwO1xufSBjYXRjaChfKSB7XG4gIC8vIG1heWJlIGEgcmVmZXJlbmNlIGVycm9yIGJlY2F1c2Ugbm8gYE1hcGAuIEdpdmUgaXQgYSBkdW1teSB2YWx1ZSB0aGF0IG5vXG4gIC8vIHZhbHVlIHdpbGwgZXZlciBiZSBhbiBpbnN0YW5jZW9mLlxuICBuYXRpdmVNYXAgPSBmdW5jdGlvbigpIHt9O1xufVxuXG52YXIgbmF0aXZlU2V0O1xudHJ5IHtcbiAgbmF0aXZlU2V0ID0gU2V0O1xufSBjYXRjaChfKSB7XG4gIG5hdGl2ZVNldCA9IGZ1bmN0aW9uKCkge307XG59XG5cbnZhciBuYXRpdmVQcm9taXNlO1xudHJ5IHtcbiAgbmF0aXZlUHJvbWlzZSA9IFByb21pc2U7XG59IGNhdGNoKF8pIHtcbiAgbmF0aXZlUHJvbWlzZSA9IGZ1bmN0aW9uKCkge307XG59XG5cbi8qKlxuICogQ2xvbmVzIChjb3BpZXMpIGFuIE9iamVjdCB1c2luZyBkZWVwIGNvcHlpbmcuXG4gKlxuICogVGhpcyBmdW5jdGlvbiBzdXBwb3J0cyBjaXJjdWxhciByZWZlcmVuY2VzIGJ5IGRlZmF1bHQsIGJ1dCBpZiB5b3UgYXJlIGNlcnRhaW5cbiAqIHRoZXJlIGFyZSBubyBjaXJjdWxhciByZWZlcmVuY2VzIGluIHlvdXIgb2JqZWN0LCB5b3UgY2FuIHNhdmUgc29tZSBDUFUgdGltZVxuICogYnkgY2FsbGluZyBjbG9uZShvYmosIGZhbHNlKS5cbiAqXG4gKiBDYXV0aW9uOiBpZiBgY2lyY3VsYXJgIGlzIGZhbHNlIGFuZCBgcGFyZW50YCBjb250YWlucyBjaXJjdWxhciByZWZlcmVuY2VzLFxuICogeW91ciBwcm9ncmFtIG1heSBlbnRlciBhbiBpbmZpbml0ZSBsb29wIGFuZCBjcmFzaC5cbiAqXG4gKiBAcGFyYW0gYHBhcmVudGAgLSB0aGUgb2JqZWN0IHRvIGJlIGNsb25lZFxuICogQHBhcmFtIGBjaXJjdWxhcmAgLSBzZXQgdG8gdHJ1ZSBpZiB0aGUgb2JqZWN0IHRvIGJlIGNsb25lZCBtYXkgY29udGFpblxuICogICAgY2lyY3VsYXIgcmVmZXJlbmNlcy4gKG9wdGlvbmFsIC0gdHJ1ZSBieSBkZWZhdWx0KVxuICogQHBhcmFtIGBkZXB0aGAgLSBzZXQgdG8gYSBudW1iZXIgaWYgdGhlIG9iamVjdCBpcyBvbmx5IHRvIGJlIGNsb25lZCB0b1xuICogICAgYSBwYXJ0aWN1bGFyIGRlcHRoLiAob3B0aW9uYWwgLSBkZWZhdWx0cyB0byBJbmZpbml0eSlcbiAqIEBwYXJhbSBgcHJvdG90eXBlYCAtIHNldHMgdGhlIHByb3RvdHlwZSB0byBiZSB1c2VkIHdoZW4gY2xvbmluZyBhbiBvYmplY3QuXG4gKiAgICAob3B0aW9uYWwgLSBkZWZhdWx0cyB0byBwYXJlbnQgcHJvdG90eXBlKS5cbiovXG5mdW5jdGlvbiBjbG9uZShwYXJlbnQsIGNpcmN1bGFyLCBkZXB0aCwgcHJvdG90eXBlKSB7XG4gIHZhciBmaWx0ZXI7XG4gIGlmICh0eXBlb2YgY2lyY3VsYXIgPT09ICdvYmplY3QnKSB7XG4gICAgZGVwdGggPSBjaXJjdWxhci5kZXB0aDtcbiAgICBwcm90b3R5cGUgPSBjaXJjdWxhci5wcm90b3R5cGU7XG4gICAgZmlsdGVyID0gY2lyY3VsYXIuZmlsdGVyO1xuICAgIGNpcmN1bGFyID0gY2lyY3VsYXIuY2lyY3VsYXI7XG4gIH1cbiAgLy8gbWFpbnRhaW4gdHdvIGFycmF5cyBmb3IgY2lyY3VsYXIgcmVmZXJlbmNlcywgd2hlcmUgY29ycmVzcG9uZGluZyBwYXJlbnRzXG4gIC8vIGFuZCBjaGlsZHJlbiBoYXZlIHRoZSBzYW1lIGluZGV4XG4gIHZhciBhbGxQYXJlbnRzID0gW107XG4gIHZhciBhbGxDaGlsZHJlbiA9IFtdO1xuXG4gIHZhciB1c2VCdWZmZXIgPSB0eXBlb2YgQnVmZmVyICE9ICd1bmRlZmluZWQnO1xuXG4gIGlmICh0eXBlb2YgY2lyY3VsYXIgPT0gJ3VuZGVmaW5lZCcpXG4gICAgY2lyY3VsYXIgPSB0cnVlO1xuXG4gIGlmICh0eXBlb2YgZGVwdGggPT0gJ3VuZGVmaW5lZCcpXG4gICAgZGVwdGggPSBJbmZpbml0eTtcblxuICAvLyByZWN1cnNlIHRoaXMgZnVuY3Rpb24gc28gd2UgZG9uJ3QgcmVzZXQgYWxsUGFyZW50cyBhbmQgYWxsQ2hpbGRyZW5cbiAgZnVuY3Rpb24gX2Nsb25lKHBhcmVudCwgZGVwdGgpIHtcbiAgICAvLyBjbG9uaW5nIG51bGwgYWx3YXlzIHJldHVybnMgbnVsbFxuICAgIGlmIChwYXJlbnQgPT09IG51bGwpXG4gICAgICByZXR1cm4gbnVsbDtcblxuICAgIGlmIChkZXB0aCA9PT0gMClcbiAgICAgIHJldHVybiBwYXJlbnQ7XG5cbiAgICB2YXIgY2hpbGQ7XG4gICAgdmFyIHByb3RvO1xuICAgIGlmICh0eXBlb2YgcGFyZW50ICE9ICdvYmplY3QnKSB7XG4gICAgICByZXR1cm4gcGFyZW50O1xuICAgIH1cblxuICAgIGlmIChwYXJlbnQgaW5zdGFuY2VvZiBuYXRpdmVNYXApIHtcbiAgICAgIGNoaWxkID0gbmV3IG5hdGl2ZU1hcCgpO1xuICAgIH0gZWxzZSBpZiAocGFyZW50IGluc3RhbmNlb2YgbmF0aXZlU2V0KSB7XG4gICAgICBjaGlsZCA9IG5ldyBuYXRpdmVTZXQoKTtcbiAgICB9IGVsc2UgaWYgKHBhcmVudCBpbnN0YW5jZW9mIG5hdGl2ZVByb21pc2UpIHtcbiAgICAgIGNoaWxkID0gbmV3IG5hdGl2ZVByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICBwYXJlbnQudGhlbihmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgIHJlc29sdmUoX2Nsb25lKHZhbHVlLCBkZXB0aCAtIDEpKTtcbiAgICAgICAgfSwgZnVuY3Rpb24oZXJyKSB7XG4gICAgICAgICAgcmVqZWN0KF9jbG9uZShlcnIsIGRlcHRoIC0gMSkpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSBpZiAoY2xvbmUuX19pc0FycmF5KHBhcmVudCkpIHtcbiAgICAgIGNoaWxkID0gW107XG4gICAgfSBlbHNlIGlmIChjbG9uZS5fX2lzUmVnRXhwKHBhcmVudCkpIHtcbiAgICAgIGNoaWxkID0gbmV3IFJlZ0V4cChwYXJlbnQuc291cmNlLCBfX2dldFJlZ0V4cEZsYWdzKHBhcmVudCkpO1xuICAgICAgaWYgKHBhcmVudC5sYXN0SW5kZXgpIGNoaWxkLmxhc3RJbmRleCA9IHBhcmVudC5sYXN0SW5kZXg7XG4gICAgfSBlbHNlIGlmIChjbG9uZS5fX2lzRGF0ZShwYXJlbnQpKSB7XG4gICAgICBjaGlsZCA9IG5ldyBEYXRlKHBhcmVudC5nZXRUaW1lKCkpO1xuICAgIH0gZWxzZSBpZiAodXNlQnVmZmVyICYmIEJ1ZmZlci5pc0J1ZmZlcihwYXJlbnQpKSB7XG4gICAgICBjaGlsZCA9IG5ldyBCdWZmZXIocGFyZW50Lmxlbmd0aCk7XG4gICAgICBwYXJlbnQuY29weShjaGlsZCk7XG4gICAgICByZXR1cm4gY2hpbGQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICh0eXBlb2YgcHJvdG90eXBlID09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHByb3RvID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKHBhcmVudCk7XG4gICAgICAgIGNoaWxkID0gT2JqZWN0LmNyZWF0ZShwcm90byk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgY2hpbGQgPSBPYmplY3QuY3JlYXRlKHByb3RvdHlwZSk7XG4gICAgICAgIHByb3RvID0gcHJvdG90eXBlO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChjaXJjdWxhcikge1xuICAgICAgdmFyIGluZGV4ID0gYWxsUGFyZW50cy5pbmRleE9mKHBhcmVudCk7XG5cbiAgICAgIGlmIChpbmRleCAhPSAtMSkge1xuICAgICAgICByZXR1cm4gYWxsQ2hpbGRyZW5baW5kZXhdO1xuICAgICAgfVxuICAgICAgYWxsUGFyZW50cy5wdXNoKHBhcmVudCk7XG4gICAgICBhbGxDaGlsZHJlbi5wdXNoKGNoaWxkKTtcbiAgICB9XG5cbiAgICBpZiAocGFyZW50IGluc3RhbmNlb2YgbmF0aXZlTWFwKSB7XG4gICAgICB2YXIga2V5SXRlcmF0b3IgPSBwYXJlbnQua2V5cygpO1xuICAgICAgd2hpbGUodHJ1ZSkge1xuICAgICAgICB2YXIgbmV4dCA9IGtleUl0ZXJhdG9yLm5leHQoKTtcbiAgICAgICAgaWYgKG5leHQuZG9uZSkge1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIHZhciBrZXlDaGlsZCA9IF9jbG9uZShuZXh0LnZhbHVlLCBkZXB0aCAtIDEpO1xuICAgICAgICB2YXIgdmFsdWVDaGlsZCA9IF9jbG9uZShwYXJlbnQuZ2V0KG5leHQudmFsdWUpLCBkZXB0aCAtIDEpO1xuICAgICAgICBjaGlsZC5zZXQoa2V5Q2hpbGQsIHZhbHVlQ2hpbGQpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAocGFyZW50IGluc3RhbmNlb2YgbmF0aXZlU2V0KSB7XG4gICAgICB2YXIgaXRlcmF0b3IgPSBwYXJlbnQua2V5cygpO1xuICAgICAgd2hpbGUodHJ1ZSkge1xuICAgICAgICB2YXIgbmV4dCA9IGl0ZXJhdG9yLm5leHQoKTtcbiAgICAgICAgaWYgKG5leHQuZG9uZSkge1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIHZhciBlbnRyeUNoaWxkID0gX2Nsb25lKG5leHQudmFsdWUsIGRlcHRoIC0gMSk7XG4gICAgICAgIGNoaWxkLmFkZChlbnRyeUNoaWxkKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmb3IgKHZhciBpIGluIHBhcmVudCkge1xuICAgICAgdmFyIGF0dHJzO1xuICAgICAgaWYgKHByb3RvKSB7XG4gICAgICAgIGF0dHJzID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihwcm90bywgaSk7XG4gICAgICB9XG5cbiAgICAgIGlmIChhdHRycyAmJiBhdHRycy5zZXQgPT0gbnVsbCkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGNoaWxkW2ldID0gX2Nsb25lKHBhcmVudFtpXSwgZGVwdGggLSAxKTtcbiAgICB9XG5cbiAgICBpZiAoT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scykge1xuICAgICAgdmFyIHN5bWJvbHMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKHBhcmVudCk7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHN5bWJvbHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgLy8gRG9uJ3QgbmVlZCB0byB3b3JyeSBhYm91dCBjbG9uaW5nIGEgc3ltYm9sIGJlY2F1c2UgaXQgaXMgYSBwcmltaXRpdmUsXG4gICAgICAgIC8vIGxpa2UgYSBudW1iZXIgb3Igc3RyaW5nLlxuICAgICAgICB2YXIgc3ltYm9sID0gc3ltYm9sc1tpXTtcbiAgICAgICAgY2hpbGRbc3ltYm9sXSA9IF9jbG9uZShwYXJlbnRbc3ltYm9sXSwgZGVwdGggLSAxKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gY2hpbGQ7XG4gIH1cblxuICByZXR1cm4gX2Nsb25lKHBhcmVudCwgZGVwdGgpO1xufVxuXG4vKipcbiAqIFNpbXBsZSBmbGF0IGNsb25lIHVzaW5nIHByb3RvdHlwZSwgYWNjZXB0cyBvbmx5IG9iamVjdHMsIHVzZWZ1bGwgZm9yIHByb3BlcnR5XG4gKiBvdmVycmlkZSBvbiBGTEFUIGNvbmZpZ3VyYXRpb24gb2JqZWN0IChubyBuZXN0ZWQgcHJvcHMpLlxuICpcbiAqIFVTRSBXSVRIIENBVVRJT04hIFRoaXMgbWF5IG5vdCBiZWhhdmUgYXMgeW91IHdpc2ggaWYgeW91IGRvIG5vdCBrbm93IGhvdyB0aGlzXG4gKiB3b3Jrcy5cbiAqL1xuY2xvbmUuY2xvbmVQcm90b3R5cGUgPSBmdW5jdGlvbiBjbG9uZVByb3RvdHlwZShwYXJlbnQpIHtcbiAgaWYgKHBhcmVudCA9PT0gbnVsbClcbiAgICByZXR1cm4gbnVsbDtcblxuICB2YXIgYyA9IGZ1bmN0aW9uICgpIHt9O1xuICBjLnByb3RvdHlwZSA9IHBhcmVudDtcbiAgcmV0dXJuIG5ldyBjKCk7XG59O1xuXG4vLyBwcml2YXRlIHV0aWxpdHkgZnVuY3Rpb25zXG5cbmZ1bmN0aW9uIF9fb2JqVG9TdHIobykge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG8pO1xufVxuY2xvbmUuX19vYmpUb1N0ciA9IF9fb2JqVG9TdHI7XG5cbmZ1bmN0aW9uIF9faXNEYXRlKG8pIHtcbiAgcmV0dXJuIHR5cGVvZiBvID09PSAnb2JqZWN0JyAmJiBfX29ialRvU3RyKG8pID09PSAnW29iamVjdCBEYXRlXSc7XG59XG5jbG9uZS5fX2lzRGF0ZSA9IF9faXNEYXRlO1xuXG5mdW5jdGlvbiBfX2lzQXJyYXkobykge1xuICByZXR1cm4gdHlwZW9mIG8gPT09ICdvYmplY3QnICYmIF9fb2JqVG9TdHIobykgPT09ICdbb2JqZWN0IEFycmF5XSc7XG59XG5jbG9uZS5fX2lzQXJyYXkgPSBfX2lzQXJyYXk7XG5cbmZ1bmN0aW9uIF9faXNSZWdFeHAobykge1xuICByZXR1cm4gdHlwZW9mIG8gPT09ICdvYmplY3QnICYmIF9fb2JqVG9TdHIobykgPT09ICdbb2JqZWN0IFJlZ0V4cF0nO1xufVxuY2xvbmUuX19pc1JlZ0V4cCA9IF9faXNSZWdFeHA7XG5cbmZ1bmN0aW9uIF9fZ2V0UmVnRXhwRmxhZ3MocmUpIHtcbiAgdmFyIGZsYWdzID0gJyc7XG4gIGlmIChyZS5nbG9iYWwpIGZsYWdzICs9ICdnJztcbiAgaWYgKHJlLmlnbm9yZUNhc2UpIGZsYWdzICs9ICdpJztcbiAgaWYgKHJlLm11bHRpbGluZSkgZmxhZ3MgKz0gJ20nO1xuICByZXR1cm4gZmxhZ3M7XG59XG5jbG9uZS5fX2dldFJlZ0V4cEZsYWdzID0gX19nZXRSZWdFeHBGbGFncztcblxucmV0dXJuIGNsb25lO1xufSkoKTtcblxuaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gIG1vZHVsZS5leHBvcnRzID0gY2xvbmU7XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgQ3NzU2VsZWN0b3JQYXJzZXI6IHJlcXVpcmUoJy4vbGliL2Nzcy1zZWxlY3Rvci1wYXJzZXIuanMnKS5Dc3NTZWxlY3RvclBhcnNlclxufTsiLCJmdW5jdGlvbiBDc3NTZWxlY3RvclBhcnNlcigpIHtcbiAgdGhpcy5wc2V1ZG9zID0ge307XG4gIHRoaXMuYXR0ckVxdWFsaXR5TW9kcyA9IHt9O1xuICB0aGlzLnJ1bGVOZXN0aW5nT3BlcmF0b3JzID0ge307XG4gIHRoaXMuc3Vic3RpdHV0ZXNFbmFibGVkID0gZmFsc2U7XG59XG5cbkNzc1NlbGVjdG9yUGFyc2VyLnByb3RvdHlwZS5yZWdpc3RlclNlbGVjdG9yUHNldWRvcyA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgZm9yICh2YXIgaiA9IDAsIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7IGogPCBsZW47IGorKykge1xuICAgIG5hbWUgPSBhcmd1bWVudHNbal07XG4gICAgdGhpcy5wc2V1ZG9zW25hbWVdID0gJ3NlbGVjdG9yJztcbiAgfVxuICByZXR1cm4gdGhpcztcbn07XG5cbkNzc1NlbGVjdG9yUGFyc2VyLnByb3RvdHlwZS51bnJlZ2lzdGVyU2VsZWN0b3JQc2V1ZG9zID0gZnVuY3Rpb24obmFtZSkge1xuICBmb3IgKHZhciBqID0gMCwgbGVuID0gYXJndW1lbnRzLmxlbmd0aDsgaiA8IGxlbjsgaisrKSB7XG4gICAgbmFtZSA9IGFyZ3VtZW50c1tqXTtcbiAgICBkZWxldGUgdGhpcy5wc2V1ZG9zW25hbWVdO1xuICB9XG4gIHJldHVybiB0aGlzO1xufTtcblxuQ3NzU2VsZWN0b3JQYXJzZXIucHJvdG90eXBlLnJlZ2lzdGVyTmVzdGluZ09wZXJhdG9ycyA9IGZ1bmN0aW9uKG9wZXJhdG9yKSB7XG4gIGZvciAodmFyIGogPSAwLCBsZW4gPSBhcmd1bWVudHMubGVuZ3RoOyBqIDwgbGVuOyBqKyspIHtcbiAgICBvcGVyYXRvciA9IGFyZ3VtZW50c1tqXTtcbiAgICB0aGlzLnJ1bGVOZXN0aW5nT3BlcmF0b3JzW29wZXJhdG9yXSA9IHRydWU7XG4gIH1cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5Dc3NTZWxlY3RvclBhcnNlci5wcm90b3R5cGUudW5yZWdpc3Rlck5lc3RpbmdPcGVyYXRvcnMgPSBmdW5jdGlvbihvcGVyYXRvcikge1xuICBmb3IgKHZhciBqID0gMCwgbGVuID0gYXJndW1lbnRzLmxlbmd0aDsgaiA8IGxlbjsgaisrKSB7XG4gICAgb3BlcmF0b3IgPSBhcmd1bWVudHNbal07XG4gICAgZGVsZXRlIHRoaXMucnVsZU5lc3RpbmdPcGVyYXRvcnNbb3BlcmF0b3JdO1xuICB9XG4gIHJldHVybiB0aGlzO1xufTtcblxuQ3NzU2VsZWN0b3JQYXJzZXIucHJvdG90eXBlLnJlZ2lzdGVyQXR0ckVxdWFsaXR5TW9kcyA9IGZ1bmN0aW9uKG1vZCkge1xuICBmb3IgKHZhciBqID0gMCwgbGVuID0gYXJndW1lbnRzLmxlbmd0aDsgaiA8IGxlbjsgaisrKSB7XG4gICAgbW9kID0gYXJndW1lbnRzW2pdO1xuICAgIHRoaXMuYXR0ckVxdWFsaXR5TW9kc1ttb2RdID0gdHJ1ZTtcbiAgfVxuICByZXR1cm4gdGhpcztcbn07XG5cbkNzc1NlbGVjdG9yUGFyc2VyLnByb3RvdHlwZS51bnJlZ2lzdGVyQXR0ckVxdWFsaXR5TW9kcyA9IGZ1bmN0aW9uKG1vZCkge1xuICBmb3IgKHZhciBqID0gMCwgbGVuID0gYXJndW1lbnRzLmxlbmd0aDsgaiA8IGxlbjsgaisrKSB7XG4gICAgbW9kID0gYXJndW1lbnRzW2pdO1xuICAgIGRlbGV0ZSB0aGlzLmF0dHJFcXVhbGl0eU1vZHNbbW9kXTtcbiAgfVxuICByZXR1cm4gdGhpcztcbn07XG5cbkNzc1NlbGVjdG9yUGFyc2VyLnByb3RvdHlwZS5lbmFibGVTdWJzdGl0dXRlcyA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLnN1YnN0aXR1dGVzRW5hYmxlZCA9IHRydWU7XG4gIHJldHVybiB0aGlzO1xufTtcblxuQ3NzU2VsZWN0b3JQYXJzZXIucHJvdG90eXBlLmRpc2FibGVTdWJzdGl0dXRlcyA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLnN1YnN0aXR1dGVzRW5hYmxlZCA9IGZhbHNlO1xuICByZXR1cm4gdGhpcztcbn07XG5cbmZ1bmN0aW9uIGlzSWRlbnRTdGFydChjKSB7XG4gIHJldHVybiAoYyA+PSAnYScgJiYgYyA8PSAneicpIHx8IChjID49ICdBJyAmJiBjIDw9ICdaJykgfHwgKGMgPT09ICctJykgfHwgKGMgPT09ICdfJyk7XG59XG5cbmZ1bmN0aW9uIGlzSWRlbnQoYykge1xuICByZXR1cm4gKGMgPj0gJ2EnICYmIGMgPD0gJ3onKSB8fCAoYyA+PSAnQScgJiYgYyA8PSAnWicpIHx8IChjID49ICcwJyAmJiBjIDw9ICc5JykgfHwgYyA9PT0gJy0nIHx8IGMgPT09ICdfJztcbn1cblxuZnVuY3Rpb24gaXNIZXgoYykge1xuICByZXR1cm4gKGMgPj0gJ2EnICYmIGMgPD0gJ2YnKSB8fCAoYyA+PSAnQScgJiYgYyA8PSAnRicpIHx8IChjID49ICcwJyAmJiBjIDw9ICc5Jyk7XG59XG5cbmZ1bmN0aW9uIGlzRGVjaW1hbChjKSB7XG4gIHJldHVybiBjID49ICcwJyAmJiBjIDw9ICc5Jztcbn1cblxuZnVuY3Rpb24gaXNBdHRyTWF0Y2hPcGVyYXRvcihjaHIpIHtcbiAgcmV0dXJuIGNociA9PT0gJz0nIHx8IGNociA9PT0gJ14nIHx8IGNociA9PT0gJyQnIHx8IGNociA9PT0gJyonIHx8IGNociA9PT0gJ34nO1xufVxuXG52YXIgaWRlbnRTcGVjaWFsQ2hhcnMgPSB7XG4gICchJzogdHJ1ZSxcbiAgJ1wiJzogdHJ1ZSxcbiAgJyMnOiB0cnVlLFxuICAnJCc6IHRydWUsXG4gICclJzogdHJ1ZSxcbiAgJyYnOiB0cnVlLFxuICAnXFwnJzogdHJ1ZSxcbiAgJygnOiB0cnVlLFxuICAnKSc6IHRydWUsXG4gICcqJzogdHJ1ZSxcbiAgJysnOiB0cnVlLFxuICAnLCc6IHRydWUsXG4gICcuJzogdHJ1ZSxcbiAgJy8nOiB0cnVlLFxuICAnOyc6IHRydWUsXG4gICc8JzogdHJ1ZSxcbiAgJz0nOiB0cnVlLFxuICAnPic6IHRydWUsXG4gICc/JzogdHJ1ZSxcbiAgJ0AnOiB0cnVlLFxuICAnWyc6IHRydWUsXG4gICdcXFxcJzogdHJ1ZSxcbiAgJ10nOiB0cnVlLFxuICAnXic6IHRydWUsXG4gICdgJzogdHJ1ZSxcbiAgJ3snOiB0cnVlLFxuICAnfCc6IHRydWUsXG4gICd9JzogdHJ1ZSxcbiAgJ34nOiB0cnVlXG59O1xuXG52YXIgc3RyUmVwbGFjZW1lbnRzUmV2ID0ge1xuICAnXFxuJzogJ1xcXFxuJyxcbiAgJ1xccic6ICdcXFxccicsXG4gICdcXHQnOiAnXFxcXHQnLFxuICAnXFxmJzogJ1xcXFxmJyxcbiAgJ1xcdic6ICdcXFxcdidcbn07XG5cbnZhciBzaW5nbGVRdW90ZUVzY2FwZUNoYXJzID0ge1xuICBuOiAnXFxuJyxcbiAgcjogJ1xccicsXG4gIHQ6ICdcXHQnLFxuICBmOiAnXFxmJyxcbiAgJ1xcXFwnOiAnXFxcXCcsXG4gICdcXCcnOiAnXFwnJ1xufTtcblxudmFyIGRvdWJsZVF1b3Rlc0VzY2FwZUNoYXJzID0ge1xuICBuOiAnXFxuJyxcbiAgcjogJ1xccicsXG4gIHQ6ICdcXHQnLFxuICBmOiAnXFxmJyxcbiAgJ1xcXFwnOiAnXFxcXCcsXG4gICdcIic6ICdcIidcbn07XG5cbmZ1bmN0aW9uIFBhcnNlQ29udGV4dChzdHIsIHBvcywgcHNldWRvcywgYXR0ckVxdWFsaXR5TW9kcywgcnVsZU5lc3RpbmdPcGVyYXRvcnMsIHN1YnN0aXR1dGVzRW5hYmxlZCkge1xuICB2YXIgY2hyLCBnZXRJZGVudCwgZ2V0U3RyLCBsLCBza2lwV2hpdGVzcGFjZTtcbiAgbCA9IHN0ci5sZW5ndGg7XG4gIGNociA9IG51bGw7XG4gIGdldFN0ciA9IGZ1bmN0aW9uKHF1b3RlLCBlc2NhcGVUYWJsZSkge1xuICAgIHZhciBlc2MsIGhleCwgcmVzdWx0O1xuICAgIHJlc3VsdCA9ICcnO1xuICAgIHBvcysrO1xuICAgIGNociA9IHN0ci5jaGFyQXQocG9zKTtcbiAgICB3aGlsZSAocG9zIDwgbCkge1xuICAgICAgaWYgKGNociA9PT0gcXVvdGUpIHtcbiAgICAgICAgcG9zKys7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9IGVsc2UgaWYgKGNociA9PT0gJ1xcXFwnKSB7XG4gICAgICAgIHBvcysrO1xuICAgICAgICBjaHIgPSBzdHIuY2hhckF0KHBvcyk7XG4gICAgICAgIGlmIChjaHIgPT09IHF1b3RlKSB7XG4gICAgICAgICAgcmVzdWx0ICs9IHF1b3RlO1xuICAgICAgICB9IGVsc2UgaWYgKGVzYyA9IGVzY2FwZVRhYmxlW2Nocl0pIHtcbiAgICAgICAgICByZXN1bHQgKz0gZXNjO1xuICAgICAgICB9IGVsc2UgaWYgKGlzSGV4KGNocikpIHtcbiAgICAgICAgICBoZXggPSBjaHI7XG4gICAgICAgICAgcG9zKys7XG4gICAgICAgICAgY2hyID0gc3RyLmNoYXJBdChwb3MpO1xuICAgICAgICAgIHdoaWxlIChpc0hleChjaHIpKSB7XG4gICAgICAgICAgICBoZXggKz0gY2hyO1xuICAgICAgICAgICAgcG9zKys7XG4gICAgICAgICAgICBjaHIgPSBzdHIuY2hhckF0KHBvcyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChjaHIgPT09ICcgJykge1xuICAgICAgICAgICAgcG9zKys7XG4gICAgICAgICAgICBjaHIgPSBzdHIuY2hhckF0KHBvcyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJlc3VsdCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHBhcnNlSW50KGhleCwgMTYpKTtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXN1bHQgKz0gY2hyO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXN1bHQgKz0gY2hyO1xuICAgICAgfVxuICAgICAgcG9zKys7XG4gICAgICBjaHIgPSBzdHIuY2hhckF0KHBvcyk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG4gIGdldElkZW50ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHJlc3VsdCA9ICcnO1xuICAgIGNociA9IHN0ci5jaGFyQXQocG9zKTtcbiAgICB3aGlsZSAocG9zIDwgbCkge1xuICAgICAgaWYgKGlzSWRlbnQoY2hyKSkge1xuICAgICAgICByZXN1bHQgKz0gY2hyO1xuICAgICAgfSBlbHNlIGlmIChjaHIgPT09ICdcXFxcJykge1xuICAgICAgICBwb3MrKztcbiAgICAgICAgaWYgKHBvcyA+PSBsKSB7XG4gICAgICAgICAgdGhyb3cgRXJyb3IoJ0V4cGVjdGVkIHN5bWJvbCBidXQgZW5kIG9mIGZpbGUgcmVhY2hlZC4nKTtcbiAgICAgICAgfVxuICAgICAgICBjaHIgPSBzdHIuY2hhckF0KHBvcyk7XG4gICAgICAgIGlmIChpZGVudFNwZWNpYWxDaGFyc1tjaHJdKSB7XG4gICAgICAgICAgcmVzdWx0ICs9IGNocjtcbiAgICAgICAgfSBlbHNlIGlmIChpc0hleChjaHIpKSB7XG4gICAgICAgICAgdmFyIGhleCA9IGNocjtcbiAgICAgICAgICBwb3MrKztcbiAgICAgICAgICBjaHIgPSBzdHIuY2hhckF0KHBvcyk7XG4gICAgICAgICAgd2hpbGUgKGlzSGV4KGNocikpIHtcbiAgICAgICAgICAgIGhleCArPSBjaHI7XG4gICAgICAgICAgICBwb3MrKztcbiAgICAgICAgICAgIGNociA9IHN0ci5jaGFyQXQocG9zKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGNociA9PT0gJyAnKSB7XG4gICAgICAgICAgICBwb3MrKztcbiAgICAgICAgICAgIGNociA9IHN0ci5jaGFyQXQocG9zKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmVzdWx0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUocGFyc2VJbnQoaGV4LCAxNikpO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc3VsdCArPSBjaHI7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9XG4gICAgICBwb3MrKztcbiAgICAgIGNociA9IHN0ci5jaGFyQXQocG9zKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcbiAgc2tpcFdoaXRlc3BhY2UgPSBmdW5jdGlvbigpIHtcbiAgICBjaHIgPSBzdHIuY2hhckF0KHBvcyk7XG4gICAgdmFyIHJlc3VsdCA9IGZhbHNlO1xuICAgIHdoaWxlIChjaHIgPT09ICcgJyB8fCBjaHIgPT09IFwiXFx0XCIgfHwgY2hyID09PSBcIlxcblwiIHx8IGNociA9PT0gXCJcXHJcIiB8fCBjaHIgPT09IFwiXFxmXCIpIHtcbiAgICAgIHJlc3VsdCA9IHRydWU7XG4gICAgICBwb3MrKztcbiAgICAgIGNociA9IHN0ci5jaGFyQXQocG9zKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcbiAgdGhpcy5wYXJzZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciByZXMgPSB0aGlzLnBhcnNlU2VsZWN0b3IoKTtcbiAgICBpZiAocG9zIDwgbCkge1xuICAgICAgdGhyb3cgRXJyb3IoJ1J1bGUgZXhwZWN0ZWQgYnV0IFwiJyArIHN0ci5jaGFyQXQocG9zKSArICdcIiBmb3VuZC4nKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlcztcbiAgfTtcbiAgdGhpcy5wYXJzZVNlbGVjdG9yID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHJlcztcbiAgICB2YXIgc2VsZWN0b3IgPSByZXMgPSB0aGlzLnBhcnNlU2luZ2xlU2VsZWN0b3IoKTtcbiAgICBjaHIgPSBzdHIuY2hhckF0KHBvcyk7XG4gICAgd2hpbGUgKGNociA9PT0gJywnKSB7XG4gICAgICBwb3MrKztcbiAgICAgIHNraXBXaGl0ZXNwYWNlKCk7XG4gICAgICBpZiAocmVzLnR5cGUgIT09ICdzZWxlY3RvcnMnKSB7XG4gICAgICAgIHJlcyA9IHtcbiAgICAgICAgICB0eXBlOiAnc2VsZWN0b3JzJyxcbiAgICAgICAgICBzZWxlY3RvcnM6IFtzZWxlY3Rvcl1cbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICAgIHNlbGVjdG9yID0gdGhpcy5wYXJzZVNpbmdsZVNlbGVjdG9yKCk7XG4gICAgICBpZiAoIXNlbGVjdG9yKSB7XG4gICAgICAgIHRocm93IEVycm9yKCdSdWxlIGV4cGVjdGVkIGFmdGVyIFwiLFwiLicpO1xuICAgICAgfVxuICAgICAgcmVzLnNlbGVjdG9ycy5wdXNoKHNlbGVjdG9yKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlcztcbiAgfTtcblxuICB0aGlzLnBhcnNlU2luZ2xlU2VsZWN0b3IgPSBmdW5jdGlvbigpIHtcbiAgICBza2lwV2hpdGVzcGFjZSgpO1xuICAgIHZhciBzZWxlY3RvciA9IHtcbiAgICAgIHR5cGU6ICdydWxlU2V0J1xuICAgIH07XG4gICAgdmFyIHJ1bGUgPSB0aGlzLnBhcnNlUnVsZSgpO1xuICAgIGlmICghcnVsZSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHZhciBjdXJyZW50UnVsZSA9IHNlbGVjdG9yO1xuICAgIHdoaWxlIChydWxlKSB7XG4gICAgICBydWxlLnR5cGUgPSAncnVsZSc7XG4gICAgICBjdXJyZW50UnVsZS5ydWxlID0gcnVsZTtcbiAgICAgIGN1cnJlbnRSdWxlID0gcnVsZTtcbiAgICAgIHNraXBXaGl0ZXNwYWNlKCk7XG4gICAgICBjaHIgPSBzdHIuY2hhckF0KHBvcyk7XG4gICAgICBpZiAocG9zID49IGwgfHwgY2hyID09PSAnLCcgfHwgY2hyID09PSAnKScpIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICBpZiAocnVsZU5lc3RpbmdPcGVyYXRvcnNbY2hyXSkge1xuICAgICAgICB2YXIgb3AgPSBjaHI7XG4gICAgICAgIHBvcysrO1xuICAgICAgICBza2lwV2hpdGVzcGFjZSgpO1xuICAgICAgICBydWxlID0gdGhpcy5wYXJzZVJ1bGUoKTtcbiAgICAgICAgaWYgKCFydWxlKSB7XG4gICAgICAgICAgdGhyb3cgRXJyb3IoJ1J1bGUgZXhwZWN0ZWQgYWZ0ZXIgXCInICsgb3AgKyAnXCIuJyk7XG4gICAgICAgIH1cbiAgICAgICAgcnVsZS5uZXN0aW5nT3BlcmF0b3IgPSBvcDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJ1bGUgPSB0aGlzLnBhcnNlUnVsZSgpO1xuICAgICAgICBpZiAocnVsZSkge1xuICAgICAgICAgIHJ1bGUubmVzdGluZ09wZXJhdG9yID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gc2VsZWN0b3I7XG4gIH07XG5cbiAgdGhpcy5wYXJzZVJ1bGUgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgcnVsZSA9IG51bGw7XG4gICAgd2hpbGUgKHBvcyA8IGwpIHtcbiAgICAgIGNociA9IHN0ci5jaGFyQXQocG9zKTtcbiAgICAgIGlmIChjaHIgPT09ICcqJykge1xuICAgICAgICBwb3MrKztcbiAgICAgICAgKHJ1bGUgPSBydWxlIHx8IHt9KS50YWdOYW1lID0gJyonO1xuICAgICAgfSBlbHNlIGlmIChpc0lkZW50U3RhcnQoY2hyKSB8fCBjaHIgPT09ICdcXFxcJykge1xuICAgICAgICAocnVsZSA9IHJ1bGUgfHwge30pLnRhZ05hbWUgPSBnZXRJZGVudCgpO1xuICAgICAgfSBlbHNlIGlmIChjaHIgPT09ICcuJykge1xuICAgICAgICBwb3MrKztcbiAgICAgICAgcnVsZSA9IHJ1bGUgfHwge307XG4gICAgICAgIChydWxlLmNsYXNzTmFtZXMgPSBydWxlLmNsYXNzTmFtZXMgfHwgW10pLnB1c2goZ2V0SWRlbnQoKSk7XG4gICAgICB9IGVsc2UgaWYgKGNociA9PT0gJyMnKSB7XG4gICAgICAgIHBvcysrO1xuICAgICAgICAocnVsZSA9IHJ1bGUgfHwge30pLmlkID0gZ2V0SWRlbnQoKTtcbiAgICAgIH0gZWxzZSBpZiAoY2hyID09PSAnWycpIHtcbiAgICAgICAgcG9zKys7XG4gICAgICAgIHNraXBXaGl0ZXNwYWNlKCk7XG4gICAgICAgIHZhciBhdHRyID0ge1xuICAgICAgICAgIG5hbWU6IGdldElkZW50KClcbiAgICAgICAgfTtcbiAgICAgICAgc2tpcFdoaXRlc3BhY2UoKTtcbiAgICAgICAgaWYgKGNociA9PT0gJ10nKSB7XG4gICAgICAgICAgcG9zKys7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdmFyIG9wZXJhdG9yID0gJyc7XG4gICAgICAgICAgaWYgKGF0dHJFcXVhbGl0eU1vZHNbY2hyXSkge1xuICAgICAgICAgICAgb3BlcmF0b3IgPSBjaHI7XG4gICAgICAgICAgICBwb3MrKztcbiAgICAgICAgICAgIGNociA9IHN0ci5jaGFyQXQocG9zKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHBvcyA+PSBsKSB7XG4gICAgICAgICAgICB0aHJvdyBFcnJvcignRXhwZWN0ZWQgXCI9XCIgYnV0IGVuZCBvZiBmaWxlIHJlYWNoZWQuJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChjaHIgIT09ICc9Jykge1xuICAgICAgICAgICAgdGhyb3cgRXJyb3IoJ0V4cGVjdGVkIFwiPVwiIGJ1dCBcIicgKyBjaHIgKyAnXCIgZm91bmQuJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGF0dHIub3BlcmF0b3IgPSBvcGVyYXRvciArICc9JztcbiAgICAgICAgICBwb3MrKztcbiAgICAgICAgICBza2lwV2hpdGVzcGFjZSgpO1xuICAgICAgICAgIHZhciBhdHRyVmFsdWUgPSAnJztcbiAgICAgICAgICBhdHRyLnZhbHVlVHlwZSA9ICdzdHJpbmcnO1xuICAgICAgICAgIGlmIChjaHIgPT09ICdcIicpIHtcbiAgICAgICAgICAgIGF0dHJWYWx1ZSA9IGdldFN0cignXCInLCBkb3VibGVRdW90ZXNFc2NhcGVDaGFycyk7XG4gICAgICAgICAgfSBlbHNlIGlmIChjaHIgPT09ICdcXCcnKSB7XG4gICAgICAgICAgICBhdHRyVmFsdWUgPSBnZXRTdHIoJ1xcJycsIHNpbmdsZVF1b3RlRXNjYXBlQ2hhcnMpO1xuICAgICAgICAgIH0gZWxzZSBpZiAoc3Vic3RpdHV0ZXNFbmFibGVkICYmIGNociA9PT0gJyQnKSB7XG4gICAgICAgICAgICBwb3MrKztcbiAgICAgICAgICAgIGF0dHJWYWx1ZSA9IGdldElkZW50KCk7XG4gICAgICAgICAgICBhdHRyLnZhbHVlVHlwZSA9ICdzdWJzdGl0dXRlJztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgd2hpbGUgKHBvcyA8IGwpIHtcbiAgICAgICAgICAgICAgaWYgKGNociA9PT0gJ10nKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgYXR0clZhbHVlICs9IGNocjtcbiAgICAgICAgICAgICAgcG9zKys7XG4gICAgICAgICAgICAgIGNociA9IHN0ci5jaGFyQXQocG9zKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGF0dHJWYWx1ZSA9IGF0dHJWYWx1ZS50cmltKCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHNraXBXaGl0ZXNwYWNlKCk7XG4gICAgICAgICAgaWYgKHBvcyA+PSBsKSB7XG4gICAgICAgICAgICB0aHJvdyBFcnJvcignRXhwZWN0ZWQgXCJdXCIgYnV0IGVuZCBvZiBmaWxlIHJlYWNoZWQuJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChjaHIgIT09ICddJykge1xuICAgICAgICAgICAgdGhyb3cgRXJyb3IoJ0V4cGVjdGVkIFwiXVwiIGJ1dCBcIicgKyBjaHIgKyAnXCIgZm91bmQuJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHBvcysrO1xuICAgICAgICAgIGF0dHIudmFsdWUgPSBhdHRyVmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgcnVsZSA9IHJ1bGUgfHwge307XG4gICAgICAgIChydWxlLmF0dHJzID0gcnVsZS5hdHRycyB8fCBbXSkucHVzaChhdHRyKTtcbiAgICAgIH0gZWxzZSBpZiAoY2hyID09PSAnOicpIHtcbiAgICAgICAgcG9zKys7XG4gICAgICAgIHZhciBwc2V1ZG9OYW1lID0gZ2V0SWRlbnQoKTtcbiAgICAgICAgdmFyIHBzZXVkbyA9IHtcbiAgICAgICAgICBuYW1lOiBwc2V1ZG9OYW1lXG4gICAgICAgIH07XG4gICAgICAgIGlmIChjaHIgPT09ICcoJykge1xuICAgICAgICAgIHBvcysrO1xuICAgICAgICAgIHZhciB2YWx1ZSA9ICcnO1xuICAgICAgICAgIHNraXBXaGl0ZXNwYWNlKCk7XG4gICAgICAgICAgaWYgKHBzZXVkb3NbcHNldWRvTmFtZV0gPT09ICdzZWxlY3RvcicpIHtcbiAgICAgICAgICAgIHBzZXVkby52YWx1ZVR5cGUgPSAnc2VsZWN0b3InO1xuICAgICAgICAgICAgdmFsdWUgPSB0aGlzLnBhcnNlU2VsZWN0b3IoKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcHNldWRvLnZhbHVlVHlwZSA9ICdzdHJpbmcnO1xuICAgICAgICAgICAgaWYgKGNociA9PT0gJ1wiJykge1xuICAgICAgICAgICAgICB2YWx1ZSA9IGdldFN0cignXCInLCBkb3VibGVRdW90ZXNFc2NhcGVDaGFycyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGNociA9PT0gJ1xcJycpIHtcbiAgICAgICAgICAgICAgdmFsdWUgPSBnZXRTdHIoJ1xcJycsIHNpbmdsZVF1b3RlRXNjYXBlQ2hhcnMpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChzdWJzdGl0dXRlc0VuYWJsZWQgJiYgY2hyID09PSAnJCcpIHtcbiAgICAgICAgICAgICAgcG9zKys7XG4gICAgICAgICAgICAgIHZhbHVlID0gZ2V0SWRlbnQoKTtcbiAgICAgICAgICAgICAgcHNldWRvLnZhbHVlVHlwZSA9ICdzdWJzdGl0dXRlJztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHdoaWxlIChwb3MgPCBsKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNociA9PT0gJyknKSB7XG4gICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFsdWUgKz0gY2hyO1xuICAgICAgICAgICAgICAgIHBvcysrO1xuICAgICAgICAgICAgICAgIGNociA9IHN0ci5jaGFyQXQocG9zKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB2YWx1ZSA9IHZhbHVlLnRyaW0oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNraXBXaGl0ZXNwYWNlKCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChwb3MgPj0gbCkge1xuICAgICAgICAgICAgdGhyb3cgRXJyb3IoJ0V4cGVjdGVkIFwiKVwiIGJ1dCBlbmQgb2YgZmlsZSByZWFjaGVkLicpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoY2hyICE9PSAnKScpIHtcbiAgICAgICAgICAgIHRocm93IEVycm9yKCdFeHBlY3RlZCBcIilcIiBidXQgXCInICsgY2hyICsgJ1wiIGZvdW5kLicpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBwb3MrKztcbiAgICAgICAgICBwc2V1ZG8udmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgICBydWxlID0gcnVsZSB8fCB7fTtcbiAgICAgICAgKHJ1bGUucHNldWRvcyA9IHJ1bGUucHNldWRvcyB8fCBbXSkucHVzaChwc2V1ZG8pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBydWxlO1xuICB9O1xuICByZXR1cm4gdGhpcztcbn1cblxuQ3NzU2VsZWN0b3JQYXJzZXIucHJvdG90eXBlLnBhcnNlID0gZnVuY3Rpb24oc3RyKSB7XG4gIHZhciBjb250ZXh0ID0gbmV3IFBhcnNlQ29udGV4dChcbiAgICAgIHN0cixcbiAgICAgIDAsXG4gICAgICB0aGlzLnBzZXVkb3MsXG4gICAgICB0aGlzLmF0dHJFcXVhbGl0eU1vZHMsXG4gICAgICB0aGlzLnJ1bGVOZXN0aW5nT3BlcmF0b3JzLFxuICAgICAgdGhpcy5zdWJzdGl0dXRlc0VuYWJsZWRcbiAgKTtcbiAgcmV0dXJuIGNvbnRleHQucGFyc2UoKTtcbn07XG5cbkNzc1NlbGVjdG9yUGFyc2VyLnByb3RvdHlwZS5lc2NhcGVJZGVudGlmaWVyID0gZnVuY3Rpb24ocykge1xuICB2YXIgcmVzdWx0ID0gJyc7XG4gIHZhciBpID0gMDtcbiAgdmFyIGxlbiA9IHMubGVuZ3RoO1xuICB3aGlsZSAoaSA8IGxlbikge1xuICAgIHZhciBjaHIgPSBzLmNoYXJBdChpKTtcbiAgICBpZiAoaWRlbnRTcGVjaWFsQ2hhcnNbY2hyXSkge1xuICAgICAgcmVzdWx0ICs9ICdcXFxcJyArIGNocjtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKFxuICAgICAgICAgICEoXG4gICAgICAgICAgICAgIGNociA9PT0gJ18nIHx8IGNociA9PT0gJy0nIHx8XG4gICAgICAgICAgICAgIChjaHIgPj0gJ0EnICYmIGNociA8PSAnWicpIHx8XG4gICAgICAgICAgICAgIChjaHIgPj0gJ2EnICYmIGNociA8PSAneicpIHx8XG4gICAgICAgICAgICAgIChpICE9PSAwICYmIGNociA+PSAnMCcgJiYgY2hyIDw9ICc5JylcbiAgICAgICAgICApXG4gICAgICApIHtcbiAgICAgICAgdmFyIGNoYXJDb2RlID0gY2hyLmNoYXJDb2RlQXQoMCk7XG4gICAgICAgIGlmICgoY2hhckNvZGUgJiAweEY4MDApID09PSAweEQ4MDApIHtcbiAgICAgICAgICB2YXIgZXh0cmFDaGFyQ29kZSA9IHMuY2hhckNvZGVBdChpKyspO1xuICAgICAgICAgIGlmICgoY2hhckNvZGUgJiAweEZDMDApICE9PSAweEQ4MDAgfHwgKGV4dHJhQ2hhckNvZGUgJiAweEZDMDApICE9PSAweERDMDApIHtcbiAgICAgICAgICAgIHRocm93IEVycm9yKCdVQ1MtMihkZWNvZGUpOiBpbGxlZ2FsIHNlcXVlbmNlJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNoYXJDb2RlID0gKChjaGFyQ29kZSAmIDB4M0ZGKSA8PCAxMCkgKyAoZXh0cmFDaGFyQ29kZSAmIDB4M0ZGKSArIDB4MTAwMDA7XG4gICAgICAgIH1cbiAgICAgICAgcmVzdWx0ICs9ICdcXFxcJyArIGNoYXJDb2RlLnRvU3RyaW5nKDE2KSArICcgJztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc3VsdCArPSBjaHI7XG4gICAgICB9XG4gICAgfVxuICAgIGkrKztcbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufTtcblxuQ3NzU2VsZWN0b3JQYXJzZXIucHJvdG90eXBlLmVzY2FwZVN0ciA9IGZ1bmN0aW9uKHMpIHtcbiAgdmFyIHJlc3VsdCA9ICcnO1xuICB2YXIgaSA9IDA7XG4gIHZhciBsZW4gPSBzLmxlbmd0aDtcbiAgdmFyIGNociwgcmVwbGFjZW1lbnQ7XG4gIHdoaWxlIChpIDwgbGVuKSB7XG4gICAgY2hyID0gcy5jaGFyQXQoaSk7XG4gICAgaWYgKGNociA9PT0gJ1wiJykge1xuICAgICAgY2hyID0gJ1xcXFxcIic7XG4gICAgfSBlbHNlIGlmIChjaHIgPT09ICdcXFxcJykge1xuICAgICAgY2hyID0gJ1xcXFxcXFxcJztcbiAgICB9IGVsc2UgaWYgKHJlcGxhY2VtZW50ID0gc3RyUmVwbGFjZW1lbnRzUmV2W2Nocl0pIHtcbiAgICAgIGNociA9IHJlcGxhY2VtZW50O1xuICAgIH1cbiAgICByZXN1bHQgKz0gY2hyO1xuICAgIGkrKztcbiAgfVxuICByZXR1cm4gXCJcXFwiXCIgKyByZXN1bHQgKyBcIlxcXCJcIjtcbn07XG5cbkNzc1NlbGVjdG9yUGFyc2VyLnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbihwYXRoKSB7XG4gIHJldHVybiB0aGlzLl9yZW5kZXJFbnRpdHkocGF0aCkudHJpbSgpO1xufTtcblxuQ3NzU2VsZWN0b3JQYXJzZXIucHJvdG90eXBlLl9yZW5kZXJFbnRpdHkgPSBmdW5jdGlvbihlbnRpdHkpIHtcbiAgdmFyIGN1cnJlbnRFbnRpdHksIHBhcnRzLCByZXM7XG4gIHJlcyA9ICcnO1xuICBzd2l0Y2ggKGVudGl0eS50eXBlKSB7XG4gICAgY2FzZSAncnVsZVNldCc6XG4gICAgICBjdXJyZW50RW50aXR5ID0gZW50aXR5LnJ1bGU7XG4gICAgICBwYXJ0cyA9IFtdO1xuICAgICAgd2hpbGUgKGN1cnJlbnRFbnRpdHkpIHtcbiAgICAgICAgaWYgKGN1cnJlbnRFbnRpdHkubmVzdGluZ09wZXJhdG9yKSB7XG4gICAgICAgICAgcGFydHMucHVzaChjdXJyZW50RW50aXR5Lm5lc3RpbmdPcGVyYXRvcik7XG4gICAgICAgIH1cbiAgICAgICAgcGFydHMucHVzaCh0aGlzLl9yZW5kZXJFbnRpdHkoY3VycmVudEVudGl0eSkpO1xuICAgICAgICBjdXJyZW50RW50aXR5ID0gY3VycmVudEVudGl0eS5ydWxlO1xuICAgICAgfVxuICAgICAgcmVzID0gcGFydHMuam9pbignICcpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnc2VsZWN0b3JzJzpcbiAgICAgIHJlcyA9IGVudGl0eS5zZWxlY3RvcnMubWFwKHRoaXMuX3JlbmRlckVudGl0eSwgdGhpcykuam9pbignLCAnKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ3J1bGUnOlxuICAgICAgaWYgKGVudGl0eS50YWdOYW1lKSB7XG4gICAgICAgIGlmIChlbnRpdHkudGFnTmFtZSA9PT0gJyonKSB7XG4gICAgICAgICAgcmVzID0gJyonO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlcyA9IHRoaXMuZXNjYXBlSWRlbnRpZmllcihlbnRpdHkudGFnTmFtZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChlbnRpdHkuaWQpIHtcbiAgICAgICAgcmVzICs9IFwiI1wiICsgdGhpcy5lc2NhcGVJZGVudGlmaWVyKGVudGl0eS5pZCk7XG4gICAgICB9XG4gICAgICBpZiAoZW50aXR5LmNsYXNzTmFtZXMpIHtcbiAgICAgICAgcmVzICs9IGVudGl0eS5jbGFzc05hbWVzLm1hcChmdW5jdGlvbihjbikge1xuICAgICAgICAgIHJldHVybiBcIi5cIiArICh0aGlzLmVzY2FwZUlkZW50aWZpZXIoY24pKTtcbiAgICAgICAgfSwgdGhpcykuam9pbignJyk7XG4gICAgICB9XG4gICAgICBpZiAoZW50aXR5LmF0dHJzKSB7XG4gICAgICAgIHJlcyArPSBlbnRpdHkuYXR0cnMubWFwKGZ1bmN0aW9uKGF0dHIpIHtcbiAgICAgICAgICBpZiAoYXR0ci5vcGVyYXRvcikge1xuICAgICAgICAgICAgaWYgKGF0dHIudmFsdWVUeXBlID09PSAnc3Vic3RpdHV0ZScpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIFwiW1wiICsgdGhpcy5lc2NhcGVJZGVudGlmaWVyKGF0dHIubmFtZSkgKyBhdHRyLm9wZXJhdG9yICsgXCIkXCIgKyBhdHRyLnZhbHVlICsgXCJdXCI7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXR1cm4gXCJbXCIgKyB0aGlzLmVzY2FwZUlkZW50aWZpZXIoYXR0ci5uYW1lKSArIGF0dHIub3BlcmF0b3IgKyB0aGlzLmVzY2FwZVN0cihhdHRyLnZhbHVlKSArIFwiXVwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gXCJbXCIgKyB0aGlzLmVzY2FwZUlkZW50aWZpZXIoYXR0ci5uYW1lKSArIFwiXVwiO1xuICAgICAgICAgIH1cbiAgICAgICAgfSwgdGhpcykuam9pbignJyk7XG4gICAgICB9XG4gICAgICBpZiAoZW50aXR5LnBzZXVkb3MpIHtcbiAgICAgICAgcmVzICs9IGVudGl0eS5wc2V1ZG9zLm1hcChmdW5jdGlvbihwc2V1ZG8pIHtcbiAgICAgICAgICBpZiAocHNldWRvLnZhbHVlVHlwZSkge1xuICAgICAgICAgICAgaWYgKHBzZXVkby52YWx1ZVR5cGUgPT09ICdzZWxlY3RvcicpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIFwiOlwiICsgdGhpcy5lc2NhcGVJZGVudGlmaWVyKHBzZXVkby5uYW1lKSArIFwiKFwiICsgdGhpcy5fcmVuZGVyRW50aXR5KHBzZXVkby52YWx1ZSkgKyBcIilcIjtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocHNldWRvLnZhbHVlVHlwZSA9PT0gJ3N1YnN0aXR1dGUnKSB7XG4gICAgICAgICAgICAgIHJldHVybiBcIjpcIiArIHRoaXMuZXNjYXBlSWRlbnRpZmllcihwc2V1ZG8ubmFtZSkgKyBcIigkXCIgKyBwc2V1ZG8udmFsdWUgKyBcIilcIjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJldHVybiBcIjpcIiArIHRoaXMuZXNjYXBlSWRlbnRpZmllcihwc2V1ZG8ubmFtZSkgKyBcIihcIiArIHRoaXMuZXNjYXBlU3RyKHBzZXVkby52YWx1ZSkgKyBcIilcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIFwiOlwiICsgdGhpcy5lc2NhcGVJZGVudGlmaWVyKHBzZXVkby5uYW1lKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sIHRoaXMpLmpvaW4oJycpO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IEVycm9yKCdVbmtub3duIGVudGl0eSB0eXBlOiBcIicgKyBlbnRpdHkudHlwZSgrJ1wiLicpKTtcbiAgfVxuICByZXR1cm4gcmVzO1xufTtcblxuZXhwb3J0cy5Dc3NTZWxlY3RvclBhcnNlciA9IENzc1NlbGVjdG9yUGFyc2VyO1xuIiwiLyohXG4gICogZG9tcmVhZHkgKGMpIER1c3RpbiBEaWF6IDIwMTQgLSBMaWNlbnNlIE1JVFxuICAqL1xuIWZ1bmN0aW9uIChuYW1lLCBkZWZpbml0aW9uKSB7XG5cbiAgaWYgKHR5cGVvZiBtb2R1bGUgIT0gJ3VuZGVmaW5lZCcpIG1vZHVsZS5leHBvcnRzID0gZGVmaW5pdGlvbigpXG4gIGVsc2UgaWYgKHR5cGVvZiBkZWZpbmUgPT0gJ2Z1bmN0aW9uJyAmJiB0eXBlb2YgZGVmaW5lLmFtZCA9PSAnb2JqZWN0JykgZGVmaW5lKGRlZmluaXRpb24pXG4gIGVsc2UgdGhpc1tuYW1lXSA9IGRlZmluaXRpb24oKVxuXG59KCdkb21yZWFkeScsIGZ1bmN0aW9uICgpIHtcblxuICB2YXIgZm5zID0gW10sIGxpc3RlbmVyXG4gICAgLCBkb2MgPSBkb2N1bWVudFxuICAgICwgaGFjayA9IGRvYy5kb2N1bWVudEVsZW1lbnQuZG9TY3JvbGxcbiAgICAsIGRvbUNvbnRlbnRMb2FkZWQgPSAnRE9NQ29udGVudExvYWRlZCdcbiAgICAsIGxvYWRlZCA9IChoYWNrID8gL15sb2FkZWR8XmMvIDogL15sb2FkZWR8Xml8XmMvKS50ZXN0KGRvYy5yZWFkeVN0YXRlKVxuXG5cbiAgaWYgKCFsb2FkZWQpXG4gIGRvYy5hZGRFdmVudExpc3RlbmVyKGRvbUNvbnRlbnRMb2FkZWQsIGxpc3RlbmVyID0gZnVuY3Rpb24gKCkge1xuICAgIGRvYy5yZW1vdmVFdmVudExpc3RlbmVyKGRvbUNvbnRlbnRMb2FkZWQsIGxpc3RlbmVyKVxuICAgIGxvYWRlZCA9IDFcbiAgICB3aGlsZSAobGlzdGVuZXIgPSBmbnMuc2hpZnQoKSkgbGlzdGVuZXIoKVxuICB9KVxuXG4gIHJldHVybiBmdW5jdGlvbiAoZm4pIHtcbiAgICBsb2FkZWQgPyBzZXRUaW1lb3V0KGZuLCAwKSA6IGZucy5wdXNoKGZuKVxuICB9XG5cbn0pO1xuIiwiaWYgKCFBcnJheS5wcm90b3R5cGUuZmlsdGVyKSB7XG4gICAgQXJyYXkucHJvdG90eXBlLmZpbHRlciA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICAgICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgICAgIGlmICh0aGlzID09PSB2b2lkIDAgfHwgdGhpcyA9PT0gbnVsbCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcigpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHQgPSBPYmplY3QodGhpcyk7XG4gICAgICAgIHZhciBsZW4gPSB0Lmxlbmd0aCA+Pj4gMDtcbiAgICAgICAgaWYgKHR5cGVvZiBmdW4gIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciByZXMgPSBbXTtcbiAgICAgICAgdmFyIHRoaXNBcmcgPSBhcmd1bWVudHMubGVuZ3RoID49IDIgPyBhcmd1bWVudHNbMV0gOiB2b2lkIDA7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChpIGluIHQpIHtcbiAgICAgICAgICAgICAgICB2YXIgdmFsID0gdFtpXTtcbiAgICAgICAgICAgICAgICBpZiAoZnVuLmNhbGwodGhpc0FyZywgdmFsLCBpLCB0KSkge1xuICAgICAgICAgICAgICAgICAgICByZXMucHVzaCh2YWwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfTtcbn1cbkFycmF5LnByb3RvdHlwZS5kaWZmID0gZnVuY3Rpb24gKGEpIHtcbiAgICByZXR1cm4gdGhpcy5maWx0ZXIoZnVuY3Rpb24gKGkpIHsgcmV0dXJuIGEuaW5kZXhPZihpKSA8IDA7IH0pO1xufTtcbkFycmF5LnByb3RvdHlwZS51bmlxdWUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlZW4gPSB7fVxuICAgIHJldHVybiB0aGlzLmZpbHRlcihmdW5jdGlvbiAoeCkge1xuICAgICAgICBpZiAoc2Vlblt4XSlcbiAgICAgICAgICAgIHJldHVyblxuICAgICAgICBzZWVuW3hdID0gdHJ1ZVxuICAgICAgICByZXR1cm4geFxuICAgIH0pXG59OyIsIlxudmFyIHZET00gPSByZXF1aXJlKCcuL3ZET00vdkRPTS5qcycpO1xuXG5cbi8qKlxuICogUmV0dXJucyB0aGUgQ1NTIHBhdGNoIHRvIGEgZ2l2ZW4gRE9NIG5vZGUuXG4gKiBAbWVtYmVyb2Ygc2VydmVyI2RpZmZcbiAqIEBpbm5lclxuICogQHBhcmFtIHtlbGVtZW50fSBub2RlIERPTSBub2RlLlxuICogQHBhcmFtIHtpbW11dGFibGVMaXN0fSBwYXRoIEN1cnJlbnQgcGF0aCBpbiB0aGUgdHJlZS5cbiAqIEByZXR1cm5zIHtzdHJpbmd9IENTUyBwYXRoXG4gKi9cbmZ1bmN0aW9uIGdldFBhdGgobm9kZSwgcGF0aCkge1xuICAgIHZhciBwID0gcGF0aC5qb2luKFwiPlwiKS5yZXBsYWNlKC8gL2csIFwiXCIpO1xuICAgIGlmIChwLmNoYXJBdCgwKSA9PT0gXCI+XCIpXG4gICAgICAgIHAgPSBwLnN1YnN0cmluZygxKTtcbiAgICByZXR1cm4gcDtcbn1cblxuZnVuY3Rpb24gZ2V0UGFyZW50UGF0aChub2RlLCBwYXRoKSB7XG4gICAgdmFyIHAgPSBub2RlLnBhcmVudE5vZGUsXG4gICAgICAgIG5ld1BhdGggPSBwYXRoLnNsaWNlKDApO1xuICAgIG5ld1BhdGgucG9wKCk7XG4gICAgdmFyIHAgPSBuZXdQYXRoLmpvaW4oXCI+XCIpLnJlcGxhY2UoLyAvZywgXCJcIik7XG4gICAgaWYgKHAuY2hhckF0KDApID09PSBcIj5cIilcbiAgICAgICAgcCA9IHAuc3Vic3RyaW5nKDEpO1xuICAgIHJldHVybiBwO1xufVxuXG5mdW5jdGlvbiBhZGRUb1BhdGgocGF0aCwgdmFsKSB7XG4gICAgdmFyIG5ld1BhdGggPSBwYXRoLnNsaWNlKDApO1xuICAgIG5ld1BhdGgucHVzaCh2YWwpO1xuICAgIHJldHVybiBuZXdQYXRoO1xufVxuLyoqXG4gKiBEaWZmIGFsZ29yaXRobS4gR2VuZXJhdGVzIGEgRE9NIHBhdGNoLlxuICogQHBhcmFtIHtkb2N1bWVudH0gb2xkRG9jIE9sZCBkb2N1bWVudC5cbiAqIEBwYXJhbSB7ZG9jdW1lbnR9IGRvYyBOZXcgZG9jdW1lbnQuXG4gKiBAZmlyZXMgZGlmZi5kb25lXG4gKiBAcmV0dXJucyB7QXJyYXl9IERPTSBwYXRjaCB0byBiZSBzZW5kIHRvIHRoZSBjbGllbnQuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKERPTTEsIERPTTIsIGVudHJ5KSB7XG4gICAgdmFyIG9wcyA9IFtdLFxuICAgICAgICByZW1vdmFscyA9IFtdO1xuXG4gICAgLyoqXG4gICAgICogSGVscGVyIGZ1bmN0aW9uIHRoYXQgaXRlcmF0ZXMgdGhyb3VnaCBib3RoIHRyZWVzIGFuZCBjb21wYXJlcyBub2Rlcy5cbiAgICAgKiBAbWVtYmVyb2Ygc2VydmVyI2RpZmZcbiAgICAgKiBAaW5uZXJcbiAgICAgKiBAcGFyYW0ge2VsZW1lbnR9IG9sZE5vZGUgQ3VycmVudCBub2RlIGluIG9sZERvY1xuICAgICAqIEBwYXJhbSB7ZWxlbWVudH0gbmV3Tm9kZSBDdXJyZW50IG5vZGUgaW4gbmV3RG9jXG4gICAgICogQHBhcmFtIHtpbW11dGFibGVMaXN0fSBwYXRoIEN1cnJlbnQgcGF0aCBpbiB0aGUgdHJlZXNcbiAgICAgKiBAcGFyYW0ge2ludGVnZXJ9IGluZGV4IFRoZSBpbmRleCBvZiB0aGUgbm9kZXMgaW4gdGhlIGN1cnJlbnQgdHJlZSBsZXZlbC5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBoZWxwZXIob2xkTm9kZSwgbmV3Tm9kZSwgcGF0aCwgaW5kZXgsIGNoaWxkTm9kZXNJbmRleCkge1xuICAgICAgICAvL2NoZWNrIGlmIHRoZXJlIGlzIHRoZSBzYW1lIGtpbmQgb2Ygbm9kZSBpbiB0aGlzIHBvc2l0aW9uXG4gICAgICAgIGlmICghKG9sZE5vZGUubmFtZSAhPT0gbmV3Tm9kZS5uYW1lKSkge1xuICAgICAgICAgICAgdmFyIG9sZEtleXMgPSBPYmplY3Qua2V5cyhvbGROb2RlLmF0dHJpYnV0ZXMpLFxuICAgICAgICAgICAgICAgIG5ld0tleXMgPSBPYmplY3Qua2V5cyhuZXdOb2RlLmF0dHJpYnV0ZXMpLFxuICAgICAgICAgICAgICAgIHJlbW92ZWQgPSBvbGRLZXlzLmRpZmYobmV3S2V5cyksXG4gICAgICAgICAgICAgICAgYWRkZWQgPSBuZXdLZXlzLmRpZmYob2xkS2V5cyksXG4gICAgICAgICAgICAgICAgdG9Db21wYXJlID0gbmV3S2V5cy5jb25jYXQob2xkS2V5cykuZGlmZihyZW1vdmVkKS5kaWZmKGFkZGVkKS51bmlxdWUoKTtcblxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0b0NvbXBhcmUubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBpZiAobmV3Tm9kZS5hdHRyaWJ1dGVzW3RvQ29tcGFyZVtpXV0gIT09IG9sZE5vZGUuYXR0cmlidXRlc1t0b0NvbXBhcmVbaV1dKSB7XG4gICAgICAgICAgICAgICAgICAgIG9wcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHQ6IFwiYXR0ckNoYW5nZWRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIG46IGdldFBhdGgobmV3Tm9kZSwgcGF0aCksXG4gICAgICAgICAgICAgICAgICAgICAgICBhOiB0b0NvbXBhcmVbaV0sXG4gICAgICAgICAgICAgICAgICAgICAgICB2OiBuZXdOb2RlLmF0dHJpYnV0ZXNbdG9Db21wYXJlW2ldXVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFkZGVkLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgb3BzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICB0OiBcImF0dHJDaGFuZ2VkXCIsXG4gICAgICAgICAgICAgICAgICAgIG46IGdldFBhdGgobmV3Tm9kZSwgcGF0aCksXG4gICAgICAgICAgICAgICAgICAgIGE6IGFkZGVkW2ldLFxuICAgICAgICAgICAgICAgICAgICB2OiBuZXdOb2RlLmF0dHJpYnV0ZXNbYWRkZWRbaV1dXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJlbW92ZWQubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBvcHMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIHQ6IFwiYXR0clJlbW92ZWRcIixcbiAgICAgICAgICAgICAgICAgICAgbjogZ2V0UGF0aChuZXdOb2RlLCBwYXRoKSxcbiAgICAgICAgICAgICAgICAgICAgYTogcmVtb3ZlZFtpXVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIG5ld0NoaWxkcmVuID0gdHlwZW9mIG5ld05vZGUuY2hpbGROb2RlcyAhPT0gXCJ1bmRlZmluZWRcIiA/IFtdLmNvbmNhdChuZXdOb2RlLmNoaWxkTm9kZXMpIDogW10sXG4gICAgICAgICAgICAgICAgb2xkQ2hpbGRyZW4gPSB0eXBlb2Ygb2xkTm9kZS5jaGlsZE5vZGVzICE9PSBcInVuZGVmaW5lZFwiID8gW10uY29uY2F0KG9sZE5vZGUuY2hpbGROb2RlcykgOiBbXSxcbiAgICAgICAgICAgICAgICBkaXNjcmVwYW5jeSA9IG9sZE5vZGUuY2hpbGROb2Rlcy5sZW5ndGggLSBvbGROb2RlLmNoaWxkcmVuLmxlbmd0aCxcbiAgICAgICAgICAgICAgICBtYXggPSBNYXRoLm1heChuZXdDaGlsZHJlbi5sZW5ndGgsIG9sZENoaWxkcmVuLmxlbmd0aCk7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG1heDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIG9sZENoaWxkID0gb2xkQ2hpbGRyZW5baV0sXG4gICAgICAgICAgICAgICAgICAgIG5ld0NoaWxkID0gbmV3Q2hpbGRyZW5baV0sXG4gICAgICAgICAgICAgICAgICAgIG5ld0luZGV4ID0gaSAtIGRpc2NyZXBhbmN5O1xuICAgICAgICAgICAgICAgIC8vY2hlY2sgaWYgbmV3IE5vZGUgaXMgbm90IGluIG9sZCBkb2MgLT4gaW5zZXJ0XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBvbGRDaGlsZCA9PT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgICAgICAgICBpZiAobmV3Q2hpbGQgaW5zdGFuY2VvZiB2RE9NLnZpcnR1YWxUZXh0Tm9kZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3BzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHQ6IFwidGV4dEFkZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHY6IG5ld05vZGUudmFsdWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcDogZ2V0UGF0aChuZXdOb2RlLCBwYXRoKVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdDaGlsZHJlbi5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpLS07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobmV3Q2hpbGRyZW4ubGVuZ3RoID4gb2xkQ2hpbGRyZW4ubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF4LS07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgbmV3UGF0aCA9IG5ld0NoaWxkLm5hbWUgPT09IFwiaHRtbFwiID8gcGF0aCA6IGFkZFRvUGF0aChwYXRoLCBuZXdDaGlsZC5uYW1lICsgXCI6bnRoLWNoaWxkKFwiICsgKG5ld0luZGV4ICsgMSkgKyBcIilcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICBvcHMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdDogXCJhZGROb2RlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcDogZ2V0UGFyZW50UGF0aChuZXdOb2RlLCBuZXdQYXRoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuOiBuZXdDaGlsZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsOiBuZXdDaGlsZC5saXN0ZW5lcnMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaGw6IG5ld0NoaWxkLmhhc0xpc3RlbmVyc1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpZiAob2xkQ2hpbGQgaW5zdGFuY2VvZiB2RE9NLnZpcnR1YWxUZXh0Tm9kZSAmJiBuZXdDaGlsZCBpbnN0YW5jZW9mIHZET00udmlydHVhbFRleHROb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAob2xkQ2hpbGQudmFsdWUgIT09IG5ld0NoaWxkLnZhbHVlKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdDogXCJ0ZXh0Q2hhbmdlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHY6IG5ld0NoaWxkLnZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwOiBnZXRQYXRoKG9sZE5vZGUsIHBhdGgpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpOiBjaGlsZE5vZGVzSW5kZXhcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG5ld0NoaWxkID09PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9sZENoaWxkIGluc3RhbmNlb2YgdkRPTS52aXJ0dWFsVGV4dE5vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdDogXCJ0ZXh0UmVtb3ZlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpOiBjaGlsZE5vZGVzSW5kZXgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwOiBnZXRQYXRoKG9sZE5vZGUsIHBhdGgpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBuZXdQYXRoID0gb2xkQ2hpbGQubmFtZSA9PT0gXCJodG1sXCIgPyBwYXRoIDogYWRkVG9QYXRoKHBhdGgsIG9sZENoaWxkLm5hbWUgKyBcIjpudGgtY2hpbGQoXCIgKyAobmV3SW5kZXggKyAxKSArIFwiKVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVtb3ZhbHMudW5zaGlmdCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0OiBcInJlbW92ZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcDogZ2V0UGF0aChvbGRDaGlsZCwgbmV3UGF0aCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpOiBuZXdJbmRleCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGw6IG9sZENoaWxkLmxpc3RlbmVycyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhsOiBvbGRDaGlsZC5oYXNMaXN0ZW5lcnNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAob2xkQ2hpbGQgaW5zdGFuY2VvZiB2RE9NLnZpcnR1YWxUZXh0Tm9kZSAmJiAhKG5ld0NoaWxkIGluc3RhbmNlb2YgdkRPTS52aXJ0dWFsVGV4dE5vZGUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHQ6IFwidGV4dFJlbW92ZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaTogY2hpbGROb2Rlc0luZGV4LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcDogZ2V0UGF0aChvbGROb2RlLCBwYXRoKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb2xkQ2hpbGRyZW4uc3BsaWNlKGksIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpLS07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuZXdDaGlsZHJlbi5sZW5ndGggPCBvbGRDaGlsZHJlbi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1heC0tO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghKG9sZENoaWxkIGluc3RhbmNlb2YgdkRPTS52aXJ0dWFsVGV4dE5vZGUpICYmIG5ld0NoaWxkIGluc3RhbmNlb2YgdkRPTS52aXJ0dWFsVGV4dE5vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0OiBcInRleHRBZGRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2OiBuZXdOb2RlLnZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHA6IGdldFBhdGgobmV3Tm9kZSwgcGF0aClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3Q2hpbGRyZW4uc3BsaWNlKGksIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaS0tO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5ld0NoaWxkcmVuLmxlbmd0aCA+IG9sZENoaWxkcmVuLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1heC0tO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBvbGRDaGlsZC5uYW1lID09PSBcInVuZGVmaW5lZFwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZGFuXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgbmV3UGF0aCA9IG9sZENoaWxkLm5hbWUgPT09IFwiaHRtbFwiID8gcGF0aCA6IGFkZFRvUGF0aChwYXRoLCBvbGRDaGlsZC5uYW1lICsgXCI6bnRoLWNoaWxkKFwiICsgKG5ld0luZGV4ICsgMSkgKyBcIilcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobmV3Q2hpbGQuaGFzTGlzdGVuZXJzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGRvbU5vZGUgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGdldFBhdGgob2xkQ2hpbGQsIG5ld1BhdGgpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBldmVudCBpbiBuZXdDaGlsZC5saXN0ZW5lcnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaz0wOyBrPG5ld0NoaWxkLmxpc3RlbmVyc1tldmVudF0ubGVuZ3RoOyBrKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBsaXN0ZW5lciA9IG5ld0NoaWxkLmxpc3RlbmVyc1tldmVudF1ba107XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWxpc3RlbmVyLl9pc0F0dGFjaGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGlzdGVuZXIuX2lzQXR0YWNoZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRvbU5vZGUuYWRkRXZlbnRMaXN0ZW5lcihldmVudCwgbGlzdGVuZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChsaXN0ZW5lci5fZGV0YWNoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZG9tTm9kZS5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50LCBsaXN0ZW5lcik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3Q2hpbGQubGlzdGVuZXJzW2V2ZW50XS5zcGxpY2UoaywxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBrLS07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoZWxwZXIob2xkQ2hpbGQsIG5ld0NoaWxkLCBuZXdQYXRoLCBuZXdJbmRleCwgaSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBvcHMucHVzaCh7XG4gICAgICAgICAgICAgICAgdDogXCJyZXBsYWNlXCIsXG4gICAgICAgICAgICAgICAgcDogZ2V0UGF0aChuZXdOb2RlLCBwYXRoKSxcbiAgICAgICAgICAgICAgICBuOiBuZXdOb2RlLFxuICAgICAgICAgICAgICAgIGk6IGluZGV4LFxuICAgICAgICAgICAgICAgIGw6IG5ld05vZGUubGlzdGVuZXJzLFxuICAgICAgICAgICAgICAgIGhsOiBuZXdOb2RlLmhhc0xpc3RlbmVyc1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgaGVscGVyKERPTTEsIERPTTIsIFtlbnRyeV0sIDEpO1xuICAgIHJldHVybiBvcHMuY29uY2F0KHJlbW92YWxzKTtcbn0iLCJtb2R1bGUub3B0aW9ucyA9IHtcbiAgICAgICAgYXV0b1VwZGF0ZTogdHJ1ZSxcbiAgICAgICAgdXBkYXRlSW50ZXJ2YWw6IDFcbn0iLCJcbnZhciB2RE9NID0gcmVxdWlyZSgnLi92RE9NL3ZET00uanMnKSxcbiAgICB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMuanMnKSxcbiAgICBkaWZmID0gcmVxdWlyZSgnLi9kaWZmLmpzJyksXG4gICAgY2xvbmVPYmplY3QgPSByZXF1aXJlKFwiY2xvbmVcIiksXG4gICAgcmVuZGVyaW5nID0gZmFsc2U7XG5cbmZ1bmN0aW9uIGhhbmRsZUxpc3RlbmVycyhkb21Ob2RlLCBsaXN0ZW5lcnMpIHtcbiAgICBmb3IgKHZhciBldmVudCBpbiBsaXN0ZW5lcnMpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGlzdGVuZXJzW2V2ZW50XS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciBsaXN0ZW5lciA9IGxpc3RlbmVyc1tldmVudF1baV07XG4gICAgICAgICAgICAgICAgaWYgKCFsaXN0ZW5lci5faXNBdHRhY2hlZCkge1xuICAgICAgICAgICAgICAgICAgICBsaXN0ZW5lci5faXNBdHRhY2hlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGRvbU5vZGUuYWRkRXZlbnRMaXN0ZW5lcihldmVudCwgbGlzdGVuZXIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBpc1JlbmRlcmluZzogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiByZW5kZXJpbmc7XG4gICAgfSxcbiAgICBhZnRlclJlbmRlckNhbGxiYWNrczogW10sXG4gICAgdXBkYXRlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGQgPSBkaWZmKHZET00ub2xkRE9NLCB2RE9NLm5ld0RPTSwgXCJodG1sXCIpO1xuICAgICAgICBpZiAoIXV0aWxzLmlzTm9kZSgpKSB7XG4gICAgICAgICAgICBpZiAoZC5sZW5ndGggPiAwKVxuICAgICAgICAgICAgICAgIHRoaXMucmVuZGVyKGQsIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCJodG1sXCIpKTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuYWZ0ZXJSZW5kZXJDYWxsYmFja3MubGVuZ3RoOyBpKyspXG4gICAgICAgICAgICB0aGlzLmFmdGVyUmVuZGVyQ2FsbGJhY2tzW2ldKCk7XG4gICAgICAgIHZET00ub2xkRE9NID0gY2xvbmVPYmplY3QodkRPTS5uZXdET00pO1xuICAgICAgICB2RE9NLm5ld0RPTS5jaGFuZ2VkID0gZmFsc2U7XG4gICAgICAgIHJldHVybiBkaWZmO1xuICAgIH0sXG4gICAgcmVuZGVyOiBmdW5jdGlvbihvcHMsbm9kZSkge1xuICAgICAgICB2YXIgdCA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgICAgICBjb25zb2xlLmxvZyhcInJlbmRlcmluZyBzdGFydFwiLCB0LCBvcHMpO1xuICAgICAgICByZW5kZXJpbmcgPSB0cnVlO1xuICAgICAgICB2YXIgcm9vdCA9IG5vZGUgPyBub2RlIDogZG9jdW1lbnQ7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgb3BzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgb3AgPSBvcHNbaV07XG4gICAgICAgICAgICBzd2l0Y2ggKG9wLnQpIHtcbiAgICAgICAgICAgICAgICBjYXNlIFwicmVtb3ZlXCI6XG4gICAgICAgICAgICAgICAgICAgIHZhciBub2RlID0gcm9vdC5xdWVyeVNlbGVjdG9yKG9wLnApLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50ID0gbm9kZS5wYXJlbnROb2RlID8gbm9kZS5wYXJlbnROb2RlIDogcm9vdDtcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50LnJlbW92ZUNoaWxkKG5vZGUpO1xuICAgICAgICAgICAgICAgICAgICBpZiAob3AuaGwpXG4gICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGVMaXN0ZW5lcnMobm9kZSwgb3AubCk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgXCJhZGROb2RlXCI6XG4gICAgICAgICAgICAgICAgICAgIHZhciBuZXdOb2RlID0gdXRpbHMuY3JlYXRlTm9kZShvcC5uLHZET00pLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50ID0gb3AucC5sZW5ndGggPiAwID8gcm9vdC5xdWVyeVNlbGVjdG9yKG9wLnApIDogcm9vdDtcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50LmFwcGVuZENoaWxkKG5ld05vZGUpO1xuICAgICAgICAgICAgICAgICAgICBpZiAob3AuaGwpXG4gICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGVMaXN0ZW5lcnMobmV3Tm9kZSwgb3AubCk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgXCJyZXBsYWNlXCI6XG4gICAgICAgICAgICAgICAgICAgIHZhciBuZXdOb2RlID0gdXRpbHMuY3JlYXRlTm9kZShvcC5uLHZET00pLFxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZSA9IHJvb3QucXVlcnlTZWxlY3RvcihvcC5wKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudCA9IG5vZGUucGFyZW50Tm9kZSA/IG5vZGUucGFyZW50Tm9kZSA6IHJvb3Q7XG4gICAgICAgICAgICAgICAgICAgIHBhcmVudC5yZXBsYWNlQ2hpbGQobmV3Tm9kZSwgbm9kZSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChvcC5obClcbiAgICAgICAgICAgICAgICAgICAgICAgIGhhbmRsZUxpc3RlbmVycyhuZXdOb2RlLCBvcC5sKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBcImF0dHJDaGFuZ2VkXCI6XG4gICAgICAgICAgICAgICAgICAgIHJvb3QucXVlcnlTZWxlY3RvcihvcC5uKS5zZXRBdHRyaWJ1dGUob3AuYSwgb3Audik7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNvbnNvbGUubG9nKFwicmVuZGVyaW5nIHN0b3BcIiwgKG5ldyBEYXRlKCkuZ2V0VGltZSgpIC0gdCkgLyAxMDAwKTtcbiAgICAgICAgcmVuZGVyaW5nID0gZmFsc2U7XG4gICAgfVxufSIsImNoZWNrQXR0ciA9IGZ1bmN0aW9uIChydWxlcywgbm9kZSkge1xuICAgIGlmICh0eXBlb2YgcnVsZXMuYXR0cnMgPT09IFwidW5kZWZpbmVkXCIpXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIHZhciBhdHRyaWJ1dGVLZXlzID0gT2JqZWN0LmtleXMobm9kZS5hdHRyaWJ1dGVzKTtcbiAgICBpZiAocnVsZXMuYXR0cnMubGVuZ3RoID4gYXR0cmlidXRlS2V5cy5sZW5ndGgpXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICBmb3IgKHZhciBpPTA7IGk8cnVsZXMuYXR0cnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGF0dHIgPSBydWxlcy5hdHRyc1tpXSxcbiAgICAgICAgICAgIG5vZGVBdHRyID0gbm9kZS5hdHRyaWJ1dGVzW2F0dHIubmFtZS50b0xvd2VyQ2FzZSgpXTtcbiAgICAgICAgaWYgKHR5cGVvZiBub2RlQXR0ciA9PT0gXCJ1bmRlZmluZWRcIilcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgaWYgKHR5cGVvZiBhdHRyLm9wZXJhdG9yICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgICAgICBzd2l0Y2ggKGF0dHIub3BlcmF0b3IpIHtcbiAgICAgICAgICAgICAgICBjYXNlIFwiPVwiOlxuICAgICAgICAgICAgICAgICAgICBpZiAobm9kZUF0dHIgIT09IGF0dHIudmFsdWUpIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICBjYXNlIFwifj1cIjpcbiAgICAgICAgICAgICAgICBjYXNlIFwiKj1cIjpcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5vZGVBdHRyLmluZGV4T2YoYXR0ci52YWx1ZSkgIT09IC0xKSByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgY2FzZSBcInw9XCI6XG4gICAgICAgICAgICAgICAgY2FzZSBcIl49XCI6XG4gICAgICAgICAgICAgICAgICAgIGlmIChub2RlQXR0ci5pbmRleE9mKGF0dHIudmFsdWUpID09PSAwKSByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgY2FzZSBcIiQ9XCI6XG4gICAgICAgICAgICAgICAgICAgIGlmIChub2RlQXR0ci5pbmRleE9mKGF0dHIudmFsdWUsIG5vZGVBdHRyLmxlbmd0aCAtIGF0dHIudmFsdWUubGVuZ3RoKSAhPT0gLTEpIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn1cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGNoZWNrQXR0cjpjaGVja0F0dHJcbn0iLCJmdW5jdGlvbiBjaGVja0NsYXNzZXMocnVsZXMsIG5vZGUpIHtcbiAgICBpZiAodHlwZW9mIHJ1bGVzLmNsYXNzTmFtZXMgPT09IFwidW5kZWZpbmVkXCIpXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIGZvciAodmFyIGk9MDsgaTxydWxlcy5jbGFzc05hbWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChub2RlLmNsYXNzTmFtZXMuaW5kZXhPZihydWxlcy5jbGFzc05hbWVzW2ldKSA9PT0gLTEpXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiBjaGVja0lEKHJ1bGVzLCBub2RlKSB7XG4gICAgaWYgKHR5cGVvZiBydWxlcy5pZCA9PT0gXCJ1bmRlZmluZWRcIilcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgaWYgKHJ1bGVzLmlkID09PSBub2RlLmlkKVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICByZXR1cm4gZmFsc2U7ICAgIFxufVxuXG5mdW5jdGlvbiBjaGVja1RhZ05hbWUocnVsZXMsIG5vZGUpIHtcbiAgICBpZiAodHlwZW9mIHJ1bGVzLnRhZ05hbWUgPT09IFwidW5kZWZpbmVkXCIgfHwgcnVsZXMudGFnTmFtZSA9PT0gXCIqXCIpXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIGlmIChydWxlcy50YWdOYW1lID09PSBub2RlLm5hbWUpXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIHJldHVybiBmYWxzZTsgICAgXG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGNoZWNrQ2xhc3NlczpjaGVja0NsYXNzZXMsXG4gICAgY2hlY2tJRDpjaGVja0lELFxuICAgIGNoZWNrVGFnTmFtZTpjaGVja1RhZ05hbWVcbn0iLCJ2YXIgc2VsZWN0b3JVdGlscyA9IHJlcXVpcmUoJy4vc2VsZWN0b3JVdGlscy5qcycpO1xuZnVuY3Rpb24gY2hlY2tOZXN0aW5nKHJ1bGVzLCBub2RlKSB7XG4gICAgaWYgKHR5cGVvZiBydWxlcy5uZXN0aW5nT3BlcmF0b3IgPT09IFwidW5kZWZpbmVkXCIgfHwgIXJ1bGVzLm5lc3RpbmdPcGVyYXRvciB8fCBydWxlcy5uZXN0aW5nT3BlcmF0b3IgPT09IFwiPlwiKVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB2YXIgbmV4dFJ1bGVzID0gc2VsZWN0b3JVdGlscy5nZXROZXh0UnVsZXMocnVsZXMpO1xuICAgIGlmICh0eXBlb2YgbmV4dFJ1bGVzICE9PSBcInVuZGVmaW5lZFwiICYmIHR5cGVvZiBuZXh0UnVsZXMubmVzdGluZ09wZXJhdG9yICE9PSBcInVuZGVmaW5lZFwiICYmIG5leHRSdWxlcy5uZXN0aW5nT3BlcmF0b3IpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHZhciBwcmV2U2libGluZyA9IG5vZGU7XG4gICAgd2hpbGUgKHR5cGVvZiBydWxlcyAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICBzd2l0Y2ggKHJ1bGVzLm5lc3RpbmdPcGVyYXRvcikge1xuICAgICAgICAgICAgY2FzZSBcIitcIjpcbiAgICAgICAgICAgIGNhc2UgXCJ+XCI6XG4gICAgICAgICAgICAgICAgdmFyIHNpYmxpbmdzID0gbm9kZS5wYXJlbnROb2RlLmNoaWxkcmVuLFxuICAgICAgICAgICAgICAgICAgICBzaWJsaW5nO1xuICAgICAgICAgICAgICAgIHN3aXRjaCAocnVsZXMubmVzdGluZ09wZXJhdG9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCIrXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgaW5kZXggPSBzaWJsaW5ncy5pbmRleE9mKHByZXZTaWJsaW5nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbmRleCA9PT0gMClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICBzaWJsaW5nID0gc2libGluZ3NbaW5kZXggLSAxXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByZXZTaWJsaW5nID0gc2libGluZztcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghY2hlY2tUYWdOYW1lKHJ1bGVzLnByZXZSdWxlLCBzaWJsaW5nKSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcIn5cIjpcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpbmRleCA9IHNpYmxpbmdzLmluZGV4T2YocHJldlNpYmxpbmcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4ID09PSAwKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdoaWxlIChpbmRleD4wKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5kZXgtLTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzaWJsaW5nID0gc2libGluZ3NbaW5kZXhdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjaGVja1RhZ05hbWUocnVsZXMucHJldlJ1bGUsIHNpYmxpbmcpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByZXZTaWJsaW5nID0gc2libGluZztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBydWxlcyA9IHJ1bGVzLnByZXZSdWxlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn1cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGNoZWNrTmVzdGluZzpjaGVja05lc3Rpbmdcbn0iLCJ2YXIgc2VsZWN0b3JVdGlscyA9IHJlcXVpcmUoJy4vc2VsZWN0b3JVdGlscy5qcycpO1xuZnVuY3Rpb24gY2hlY2tQc2V1ZG9zKHJ1bGVzLCBub2RlKSB7XG4gICAgaWYgKHR5cGVvZiBydWxlcy5wc2V1ZG9zID09PSBcInVuZGVmaW5lZFwiKVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB2YXIgcHNldWRvcyA9IHJ1bGVzLnBzZXVkb3M7XG4gICAgZm9yICh2YXIgaT0wOyBpPHBzZXVkb3MubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHBzZXVkbyA9IHBzZXVkb3NbaV07XG4gICAgICAgIHN3aXRjaChwc2V1ZG8ubmFtZSkge1xuICAgICAgICAgICAgY2FzZSBcImZpcnN0LWNoaWxkXCI6XG4gICAgICAgICAgICBjYXNlIFwibGFzdC1jaGlsZFwiOlxuICAgICAgICAgICAgY2FzZSBcIm9ubHktY2hpbGRcIjpcbiAgICAgICAgICAgIGNhc2UgXCJudGgtY2hpbGRcIjpcbiAgICAgICAgICAgIGNhc2UgXCJudGgtbGFzdC1jaGlsZFwiOlxuICAgICAgICAgICAgICAgIHZhciBjaGlsZHJlbiA9IG5vZGUucGFyZW50Tm9kZS5jaGlsZHJlbjtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHJ1bGVzLnRhZ05hbWUgIT09IFwidW5kZWZpbmVkXCIpXG4gICAgICAgICAgICAgICAgICAgIGNoaWxkcmVuID0gY2hpbGRyZW4uZmlsdGVyKGZ1bmN0aW9uKGNoaWxkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2hpbGQubmFtZSA9PT0gcnVsZXMudGFnTmFtZTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgc3dpdGNoKHBzZXVkby5uYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJmaXJzdC1jaGlsZFwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNoaWxkcmVuLmluZGV4T2Yobm9kZSkgPT09IDA7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJsYXN0LWNoaWxkXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2hpbGRyZW4uaW5kZXhPZihub2RlKSA9PT0gY2hpbGRyZW4ubGVuZ3RoIC0gMTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcIm50aC1jaGlsZFwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNoaWxkcmVuLmluZGV4T2Yobm9kZSkgKyAxID09PSBwYXJzZUludChwc2V1ZG8udmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIFwibnRoLWxhc3QtY2hpbGRcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjaGlsZHJlbi5yZXZlcnNlKCkuaW5kZXhPZihub2RlKSArIDEgPT09IHBhcnNlSW50KHBzZXVkby52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJvbmx5LWNoaWxkXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2hpbGRyZW4ubGVuZ3RoID09PSAxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgXCJoYXNcIjpcbiAgICAgICAgICAgICAgICB2YXIgc2VsZWN0ZWROb2RlcyA9IFtdLFxuICAgICAgICAgICAgICAgIG5leHRSdWxlcyA9IHNlbGVjdG9yVXRpbHMuZ2V0TmV4dFJ1bGVzKHBzZXVkby52YWx1ZSk7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBub2RlLmNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdG9yVXRpbHMudHJhdmVyc2VWRE9NKG5leHRSdWxlcywgbm9kZS5jaGlsZHJlbltpXSwgc2VsZWN0ZWROb2RlcywgbmV4dFJ1bGVzLm5lc3RpbmdPcGVyYXRvciA9PT0gXCI+XCIsIHRydWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gc2VsZWN0ZWROb2Rlcy5sZW5ndGggPiAwO1xuICAgICAgICAgICAgY2FzZSBcIm5vdFwiOlxuICAgICAgICAgICAgICAgIHZhciBzZWxlY3RlZE5vZGVzID0gW10sXG4gICAgICAgICAgICAgICAgbmV4dFJ1bGVzID0gc2VsZWN0b3JVdGlscy5nZXROZXh0UnVsZXMocHNldWRvLnZhbHVlKTtcbiAgICAgICAgICAgICAgICBzZWxlY3RvclV0aWxzLnRyYXZlcnNlVkRPTShuZXh0UnVsZXMsIG5vZGUsIHNlbGVjdGVkTm9kZXMsIG5leHRSdWxlcy5uZXN0aW5nT3BlcmF0b3IgPT09IFwiPlwiLCB0cnVlKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gc2VsZWN0ZWROb2Rlcy5sZW5ndGggPT09IDA7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlOyAgICBcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgY2hlY2tQc2V1ZG9zOmNoZWNrUHNldWRvc1xufSIsIlxudmFyIENzc1NlbGVjdG9yUGFyc2VyID0gcmVxdWlyZSgnY3NzLXNlbGVjdG9yLXBhcnNlcicpLkNzc1NlbGVjdG9yUGFyc2VyLFxuICAgIHNwYXJzZXIgPSBuZXcgQ3NzU2VsZWN0b3JQYXJzZXIoKSxcbiAgICBzZWxlY3RvclV0aWxzID0gcmVxdWlyZSgnLi9zZWxlY3RvclV0aWxzLmpzJyksXG4gICAgYXR0cmlidXRlcyA9IHJlcXVpcmUoJy4vYXR0cmlidXRlcy5qcycpLFxuICAgIGlkZW50aWZpZXJzID0gcmVxdWlyZSgnLi9pZGVudGlmaWVycy5qcycpLFxuICAgIG5lc3RpbmcgPSByZXF1aXJlKCcuL25lc3RpbmcuanMnKSxcbiAgICBwc2V1ZG9zID0gcmVxdWlyZSgnLi9wc2V1ZG9zLmpzJyk7XG5cbnNwYXJzZXIucmVnaXN0ZXJTZWxlY3RvclBzZXVkb3MoJ2hhcycsICdub3QnKTtcbnNwYXJzZXIucmVnaXN0ZXJOZXN0aW5nT3BlcmF0b3JzKCc+JywgJysnLCAnficpO1xuc3BhcnNlci5yZWdpc3RlckF0dHJFcXVhbGl0eU1vZHMoJ14nLCAnJCcsICcqJywgJ34nLCAnfCcpO1xuc3BhcnNlci5lbmFibGVTdWJzdGl0dXRlcygpO1xuXG52YXIgY2hlY2tzID0gW1xuICAgIGlkZW50aWZpZXJzLmNoZWNrVGFnTmFtZSxcbiAgICBpZGVudGlmaWVycy5jaGVja0lELFxuICAgIGlkZW50aWZpZXJzLmNoZWNrQ2xhc3NlcyxcbiAgICBhdHRyaWJ1dGVzLmNoZWNrQXR0cixcbiAgICBuZXN0aW5nLmNoZWNrTmVzdGluZyxcbiAgICBwc2V1ZG9zLmNoZWNrUHNldWRvc1xuXVxuY2hlY2tIaXRzID0gZnVuY3Rpb24ocnVsZXMsIGN1cnJlbnRWRE9NKSB7XG4gICAgdmFyIHJlcyA9IHRydWU7XG4gICAgZm9yICh2YXIgaT0wOyBpPGNoZWNrcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoIWNoZWNrc1tpXShydWxlcywgY3VycmVudFZET00pKVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn1cblxubW9kdWxlLmV4cG9ydHMucXVlcnkgPSBmdW5jdGlvbih2aXJ0dWFsTm9kZSwgc2VsZWN0b3IpIHtcbiAgICB2YXIgcGFyc2VkU2VsZWN0b3IgPSBzcGFyc2VyLnBhcnNlKHNlbGVjdG9yKSxcbiAgICAgICAgc2VsZWN0ZWROb2RlcyA9IFtdLFxuICAgICAgICBuZXh0UnVsZXMgPSBzZWxlY3RvclV0aWxzLmdldE5leHRSdWxlcyhwYXJzZWRTZWxlY3Rvcik7XG4gICAgLy9jb25zb2xlLmxvZyhwYXJzZWRTZWxlY3RvcilcbiAgICBpZiAoc2VsZWN0b3JVdGlscy5oYXNNb3JlUnVsZXMocGFyc2VkU2VsZWN0b3IpKVxuICAgICAgICBzZWxlY3RvclV0aWxzLnRyYXZlcnNlVkRPTShuZXh0UnVsZXMsIHZpcnR1YWxOb2RlLmNoaWxkcmVuWzBdLCBzZWxlY3RlZE5vZGVzLCBuZXh0UnVsZXMubmVzdGluZ09wZXJhdG9yID09PSBcIj5cIiwgZmFsc2UsIG51bGwpO1xuICAgIHJldHVybiBzZWxlY3RlZE5vZGVzO1xufSIsInZhciB2RE9NID0gcmVxdWlyZSgnLi4vdkRPTS92RE9NLmpzJyk7XG5mdW5jdGlvbiBoYXNNb3JlUnVsZXMocnVsZXMpIHtcbiAgICByZXR1cm4gdHlwZW9mIHJ1bGVzLnJ1bGUgIT09IFwidW5kZWZpbmVkXCIgfHwgdHlwZW9mIHJ1bGVzLnJ1bGVTZXQgIT09IFwidW5kZWZpbmVkXCJ8fCB0eXBlb2YgcnVsZXMuc2VsZWN0b3JzICE9PSBcInVuZGVmaW5lZFwiO1xufVxuXG5mdW5jdGlvbiBnZXROZXh0UnVsZXMocnVsZXMpIHtcbiAgICBpZiAodHlwZW9mIHJ1bGVzLnJ1bGVTZXQgIT09IFwidW5kZWZpbmVkXCIpXG4gICAgICAgIHJldHVybiBydWxlcy5ydWxlU2V0LnJ1bGU7XG4gICAgaWYgKHR5cGVvZiBydWxlcy5zZWxlY3RvcnMgIT09IFwidW5kZWZpbmVkXCIpXG4gICAgICAgIHJldHVybiBydWxlcy5zZWxlY3RvcnMubWFwKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgICAgIHJldHVybiBpdGVtLnJ1bGVcbiAgICAgICAgfSk7XG4gICAgZWxzZSByZXR1cm4gcnVsZXMucnVsZTtcbn1cblxuZnVuY3Rpb24gdHJhdmVyc2VWRE9NKHJ1bGVzLCBjdXJyZW50VkRPTSwgc2VsZWN0ZWROb2RlcywgZXhhY3QsIHBzZXVkb01vZGUpIHtcbiAgICBpZiAodHlwZW9mIHJ1bGVzLmxlbmd0aCA9PT0gXCJ1bmRlZmluZWRcIilcbiAgICAgICAgdmFyIGl0ZXJhdG9yID0gW3J1bGVzXTtcbiAgICBlbHNlXG4gICAgICAgIHZhciBpdGVyYXRvciA9IHJ1bGVzO1xuICAgIGZvciAodmFyIHI9MDsgcjxpdGVyYXRvci5sZW5ndGg7IHIrKykge1xuICAgICAgICB2YXIgcnVsZSA9IGl0ZXJhdG9yW3JdO1xuICAgICAgICBpZiAocnVsZS5pZCAmJiAhcHNldWRvTW9kZSkge1xuICAgICAgICAgICAgdmFyIGlkTm9kZSA9IHZET00uaWROb2Rlc1tydWxlLmlkXTtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgaWROb2RlICE9PSBcInVuZGVmaW5lZFwiICYmIGlkTm9kZS5sZW5ndGggIT09IFtdKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHJ1bGUuaWQ7XG4gICAgICAgICAgICAgICAgY3VycmVudFZET00gPSBpZE5vZGU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNoZWNrSGl0cyhydWxlLCBjdXJyZW50VkRPTSkpIHtcbiAgICAgICAgICAgIGlmICghaGFzTW9yZVJ1bGVzKHJ1bGUpKSB7XG4gICAgICAgICAgICAgICAgaWYgKHNlbGVjdGVkTm9kZXMuaW5kZXhPZihjdXJyZW50VkRPTSkgPT09IC0xKVxuICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZE5vZGVzLnB1c2goY3VycmVudFZET00pO1xuICAgICAgICAgICAgICAgIGlmICghZXhhY3QgJiYgY3VycmVudFZET00uY2hpbGRyZW4ubGVuZ3RoID4gMClcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjdXJyZW50VkRPTS5jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHJhdmVyc2VWRE9NKHJ1bGUsIGN1cnJlbnRWRE9NLmNoaWxkcmVuW2ldLCBzZWxlY3RlZE5vZGVzLCBleGFjdCwgcHNldWRvTW9kZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhciBuZXh0UnVsZXMgPSBnZXROZXh0UnVsZXMocnVsZSk7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBuZXh0UnVsZXMubmVzdGluZ09wZXJhdG9yICE9PSBcInVuZGVmaW5lZFwiICYmIG5leHRSdWxlcy5uZXN0aW5nT3BlcmF0b3IgJiYgbmV4dFJ1bGVzLm5lc3RpbmdPcGVyYXRvciAhPT0gXCI+XCIpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV4dFJ1bGVzLnByZXZSdWxlID0gcnVsZTtcbiAgICAgICAgICAgICAgICAgICAgdHJhdmVyc2VWRE9NKG5leHRSdWxlcywgY3VycmVudFZET00sIHNlbGVjdGVkTm9kZXMsIGV4YWN0LCBwc2V1ZG9Nb2RlKTtcbiAgICAgICAgICAgICAgICB9IGVsc2VcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5leHRSdWxlcylcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY3VycmVudFZET00uY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cmF2ZXJzZVZET00obmV4dFJ1bGVzLCBjdXJyZW50VkRPTS5jaGlsZHJlbltpXSwgc2VsZWN0ZWROb2RlcywgbmV4dFJ1bGVzLm5lc3RpbmdPcGVyYXRvciA9PT0gXCI+XCIsIHBzZXVkb01vZGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2VcbiAgICAgICAgICAgIGlmICghZXhhY3QgJiYgY3VycmVudFZET00uY2hpbGRyZW4ubGVuZ3RoID4gMClcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGN1cnJlbnRWRE9NLmNoaWxkcmVuLmxlbmd0aDsgaSsrKVxuICAgICAgICAgICAgICAgICAgICB0cmF2ZXJzZVZET00ocnVsZXMsIGN1cnJlbnRWRE9NLmNoaWxkcmVuW2ldLCBzZWxlY3RlZE5vZGVzLCBleGFjdCwgcHNldWRvTW9kZSk7XG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBoYXNNb3JlUnVsZXM6aGFzTW9yZVJ1bGVzLFxuICAgIGdldE5leHRSdWxlczpnZXROZXh0UnVsZXMsXG4gICAgdHJhdmVyc2VWRE9NOnRyYXZlcnNlVkRPTVxufSIsImZ1bmN0aW9uIGNyZWF0ZU5vZGUoZGF0YSwgdkRPTSkge1xuICAgIHZhciBub2RlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChkYXRhLm5hbWUpO1xuICAgIGZvciAodmFyIGkgaW4gZGF0YS5hdHRyaWJ1dGVzKSB7XG4gICAgICAgIG5vZGUuc2V0QXR0cmlidXRlKGksIGRhdGEuYXR0cmlidXRlc1tpXSk7XG4gICAgfVxuICAgIGlmICh0eXBlb2YgZGF0YS5jaGlsZE5vZGVzICE9PSBcInVuZGVmaW5lZFwiKVxuICAgICAgICBmb3IgKHZhciBpPTA7IGk8ZGF0YS5jaGlsZE5vZGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgY2hpbGQgPWNyZWF0ZU5vZGUoZGF0YS5jaGlsZE5vZGVzW2ldLCB2RE9NKTtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgY2hpbGQgIT09IFwidW5kZWZpbmVkXCIpXG4gICAgICAgICAgICAgICAgbm9kZS5hcHBlbmRDaGlsZChjaGlsZCk7XG4gICAgICAgIH1cbiAgICBpZiAoZGF0YSBpbnN0YW5jZW9mIHZET00udmlydHVhbFRleHROb2RlKVxuICAgICAgICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoZGF0YS52YWx1ZSk7XG4gICAgcmV0dXJuIG5vZGU7XG59XG52YXIgcnF1aWNrRXhwciA9IC9eKD86XFxzKig8W1xcd1xcV10rPilbXj5dKnwjKFtcXHctXSspKSQvO1xuZnVuY3Rpb24gaXNIVE1MKHN0cikge1xuICAgIGlmIChzdHJbMF0gPT09IFwiPFwiICYmIHN0cltzdHIubGVuZ3RoIC0gMV0gPT09IFwiPlwiICYmIHN0ci5sZW5ndGggPj0gMykge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIG1hdGNoID0gcnF1aWNrRXhwci5leGVjKHN0cik7XG4gICAgICAgIHJldHVybiBtYXRjaCAhPT0gbnVsbCAmJiBtYXRjaFsxXTtcbiAgICB9XG59XG5mdW5jdGlvbiBpc05vZGUoKSB7XG4gICAgdmFyIHJlcyA9IGZhbHNlOyBcbiAgICB0cnkge1xuICAgICAgICByZXMgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoZ2xvYmFsLnByb2Nlc3MpID09PSAnW29iamVjdCBwcm9jZXNzXScgXG4gICAgfSBjYXRjaChlKSB7fVxuICAgIHJldHVybiByZXM7XG59XG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBjcmVhdGVOb2RlOiBjcmVhdGVOb2RlLFxuICAgIGlzSFRNTDogaXNIVE1MLFxuICAgIGlzTm9kZTogaXNOb2RlXG59IiwidmFyIHZET01VdGlscyA9IHJlcXVpcmUoJy4vdkRPTVV0aWxzLmpzJyk7XG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICAvL2NyZWF0ZXMgYSBuZXcgdml0dWFsIG5vZGUgZnJvbSBwYXNzZWQgaHRtbCBhbmQgYXBwZW5kcyBpdCB0byBhbGwgdmlydHVhbCBub2Rlc1xuICAgIGFkZENoaWxkRnJvbUh0bWw6IGZ1bmN0aW9uKG5vZGVzLCBodG1sLCBwb3NpdGlvbikge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHN3aXRjaCAodHlwZW9mIHBvc2l0aW9uKSB7XG4gICAgICAgICAgICBjYXNlIFwic3RyaW5nXCI6XG4gICAgICAgICAgICAgICAgICAgIGlmIChwb3NpdGlvbiA9PT0gXCJzdGFydFwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpPTA7IGk8bm9kZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgbmV3RE9NID0gdGhpcy5jcmVhdGVWRE9NKGh0bWwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGo9MDsgajxuZXdET00uY2hpbGRyZW4ubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3RE9NLmNoaWxkcmVuW2pdLnBhcmVudE5vZGUgPSBub2Rlc1tpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9kZXNbaV0uY2hpbGRyZW4udW5zaGlmdChuZXdET00uY2hpbGRyZW5bal0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2Rlc1tpXS5jaGlsZE5vZGVzLnVuc2hpZnQobmV3RE9NLmNoaWxkTm9kZXNbal0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobmV3RE9NLmNoaWxkTm9kZXNbal0uaWQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLmlkTm9kZXNbbmV3RE9NLmNoaWxkTm9kZXNbal0uaWRdID0gbmV3RE9NLmNoaWxkTm9kZXNbal07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGlmIChwb3NpdGlvbiA9PT0gXCJlbmRcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaT0wOyBpPG5vZGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG5ld0RPTSA9IHRoaXMuY3JlYXRlVkRPTShodG1sKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBqPTA7IGo8bmV3RE9NLmNoaWxkcmVuLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld0RPTS5jaGlsZHJlbltqXS5wYXJlbnROb2RlID0gbm9kZXNbaV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVzW2ldLmNoaWxkcmVuLnB1c2gobmV3RE9NLmNoaWxkcmVuW2pdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9kZXNbaV0uY2hpbGROb2Rlcy5wdXNoKG5ld0RPTS5jaGlsZE5vZGVzW2pdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5ld0RPTS5jaGlsZE5vZGVzW2pdLmlkKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5pZE5vZGVzW25ld0RPTS5jaGlsZE5vZGVzW2pdLmlkXSA9IG5ld0RPTS5jaGlsZE5vZGVzW2pdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcIm51bWJlclwiOlxuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpPTA7IGk8bm9kZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBuZXdET00gPSB0aGlzLmNyZWF0ZVZET00oaHRtbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBqPTA7IGo8bmV3RE9NLmNoaWxkcmVuLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3RE9NLmNoaWxkcmVuW2pdLnBhcmVudE5vZGUgPSBub2Rlc1tpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2Rlc1tpXS5jaGlsZE5vZGVzLnNwbGljZShwb3NpdGlvbiwgbm9kZXNbaV0uY2hpbGROb2Rlcy5pbmRleE9mKG5vZGVzW2ldLmNoaWxkcmVuW3Bvc2l0aW9uXSksIG5ld0RPTSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9kZXNbaV0uY2hpbGRyZW4uc3BsaWNlKHBvc2l0aW9uLCAwLCBuZXdET00uY2hpbGRyZW5bal0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuZXdET00uY2hpbGROb2Rlc1tqXS5pZClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5pZE5vZGVzW25ld0RPTS5jaGlsZE5vZGVzW2pdLmlkXSA9IG5ld0RPTS5jaGlsZE5vZGVzW2pdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgdkRPTVV0aWxzLnNldENoYW5nZWQobm9kZXNbMF0pO1xuICAgIH0sXG4gICAgYWRkQ2hpbGRGcm9tVk5vZGVzOiBmdW5jdGlvbihub2Rlcywgdk5vZGVzLCBwb3NpdGlvbikge1xuICAgICAgICB0aGlzLnJlbW92ZU5vZGVzKHZOb2RlcywgdHJ1ZSk7XG4gICAgICAgIHZhciBjbG9uZXMgPSBbXSxcbiAgICAgICAgICAgIHNlbGYgPSB0aGlzO1xuICAgICAgICBzd2l0Y2ggKHR5cGVvZiBwb3NpdGlvbikge1xuICAgICAgICAgICAgY2FzZSBcInN0cmluZ1wiOlxuICAgICAgICAgICAgICAgICAgICBpZiAocG9zaXRpb24gPT09IFwic3RhcnRcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaT0wOyBpPG5vZGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG5ld0RPTSA9IHZET01VdGlscy5jbG9uZSh2Tm9kZXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsb25lcyA9IGNsb25lcy5jb25jYXQobmV3RE9NKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2Rlc1tpXS5jaGlsZHJlbiA9IG5ld0RPTS5jb25jYXQobm9kZXNbaV0uY2hpbGRyZW4pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVzW2ldLmNoaWxkTm9kZXMgPSBuZXdET00uY29uY2F0KG5vZGVzW2ldLmNoaWxkTm9kZXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGs9MDsgazxuZXdET00ubGVuZ3RoOyBrKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3RE9NW2tdLnBhcmVudE5vZGUgPSBub2Rlc1tpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5ld0RPTVtrXS5pZClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuaWROb2Rlc1tuZXdET01ba10uaWRdID0gbmV3RE9NW2tdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBpZiAocG9zaXRpb24gPT09IFwiZW5kXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGk9MDsgaTxub2Rlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBuZXdET00gPSB2RE9NVXRpbHMuY2xvbmUodk5vZGVzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbG9uZXMgPSBjbG9uZXMuY29uY2F0KG5ld0RPTSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9kZXNbaV0uY2hpbGRyZW4gPSBub2Rlc1tpXS5jaGlsZHJlbi5jb25jYXQobmV3RE9NKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2Rlc1tpXS5jaGlsZE5vZGVzID0gbm9kZXNbaV0uY2hpbGROb2Rlcy5jb25jYXQobmV3RE9NKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBrPTA7IGs8bmV3RE9NLmxlbmd0aDsgaysrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld0RPTVtrXS5wYXJlbnROb2RlID0gbm9kZXNbaV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuZXdET01ba10uaWQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLmlkTm9kZXNbbmV3RE9NW2tdLmlkXSA9IG5ld0RPTVtrXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCJudW1iZXJcIjpcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaT0wOyBpPG5vZGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgbmV3RE9NID0gdGhpcy5jcmVhdGVWRE9NKGh0bWwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaj0wOyBqPG5ld0RPTS5jaGlsZHJlbi5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBuZXdET00gPSB2RE9NVXRpbHMuY2xvbmUodk5vZGVzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbG9uZXMgPSBjbG9uZXMuY29uY2F0KG5ld0RPTSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9kZXNbaV0uY2hpbGROb2Rlcy5zcGxpY2UocG9zaXRpb24sIG5vZGVzW2ldLmNoaWxkTm9kZXMuaW5kZXhPZihub2Rlc1tpXS5jaGlsZHJlbltwb3NpdGlvbl0pLCBuZXdET00pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVzW2ldLmNoaWxkcmVuLnNwbGljZShwb3NpdGlvbiwgMCwgbmV3RE9NKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBrPTA7IGs8bmV3RE9NLmxlbmd0aDsgaysrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld0RPTVtrXS5wYXJlbnROb2RlID0gbm9kZXNbaV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuZXdET01ba10uaWQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLmlkTm9kZXNbbmV3RE9NW2tdLmlkXSA9IG5ld0RPTVtrXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICB2RE9NVXRpbHMuc2V0Q2hhbmdlZChub2Rlc1swXSk7XG4gICAgICAgIHJldHVybiBjbG9uZXM7XG4gICAgfVxufSIsInZhciB2RE9NVXRpbHMgPSByZXF1aXJlKCcuL3ZET01VdGlscy5qcycpO1xubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgLy9HZXQgdGhlIHZhbHVlIG9mIGFuIGF0dHJpYnV0ZSBmb3IgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzXG4gICAgZ2V0QXR0cmlidXRlKG5vZGVzLCBhdHRyaWJ1dGUpIHtcbiAgICAgICAgdmFyIG5vZGUgPSBub2Rlc1swXTtcbiAgICAgICAgaWYgKHR5cGVvZiBub2RlLmF0dHJpYnV0ZXNbYXR0cmlidXRlLnRvTG93ZXJDYXNlKCldICE9PSBcInVuZGVmaW5lZFwiKVxuICAgICAgICAgICAgcmV0dXJuIG5vZGUuYXR0cmlidXRlc1thdHRyaWJ1dGUudG9Mb3dlckNhc2UoKV07XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfSxcbiAgICAvL1NldCB0aGUgdmFsdWUgb2YgYW4gYXR0cmlidXRlIGZvciBlYWNoIGVsZW1lbnRcbiAgICBzZXRBdHRyaWJ1dGUobm9kZXMsIGF0dHJpYnV0ZSwgdmFsdWUpIHtcbiAgICAgICAgZm9yICh2YXIgaT0wOyBpPG5vZGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgbm9kZSA9IG5vZGVzW2ldO1xuICAgICAgICAgICAgbm9kZS5hdHRyaWJ1dGVzW2F0dHJpYnV0ZS50b0xvd2VyQ2FzZSgpXSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIHZET01VdGlscy5zZXRDaGFuZ2VkKG5vZGVzWzBdKTtcbiAgICB9XG59IiwidmFyIHZET01VdGlscyA9IHJlcXVpcmUoJy4vdkRPTVV0aWxzLmpzJyk7XG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICAvL2NoZWNrcyBhbGwgbm9kZXMgaWYgdGhleSBoYXZlIHRoZSBzdXBwbGllZCBjbGFzc2VzXG4gICAgaGFzQ2xhc3M6IGZ1bmN0aW9uKG5vZGVzLCBjbGFzc0luKSB7XG4gICAgICAgIGZvciAodmFyIGk9MDsgaTxub2Rlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIG5vZGUgPSBub2Rlc1tpXTtcbiAgICAgICAgICAgIGlmIChub2RlLmNsYXNzTmFtZXMuaW5kZXhPZihjbGFzc0luLnRvTG93ZXJDYXNlKCkpID4gLTEpXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0sXG4gICAgLy9yZW1vdmVzIGNsYXNzZXMgZnJvbSBhbGwgdmlydHVhbCBub2Rlc1xuICAgIHJlbW92ZUNsYXNzZXM6IGZ1bmN0aW9uKG5vZGVzLCBjbGFzc2VzKSB7XG4gICAgICAgIGNsYXNzZXMgPSBjbGFzc2VzLnNwbGl0KCcgJyk7XG4gICAgICAgIGZvciAodmFyIGk9MDsgaTxub2Rlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIG5vZGUgPSBub2Rlc1tpXTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBqPTA7IGo8Y2xhc3Nlcy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGNsYXNzZXNbal0gPT09IFwidW5kZWZpbmVkXCIpIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICB2YXIgaW5kZXggPSBub2RlLmNsYXNzTmFtZXMuaW5kZXhPZihjbGFzc2VzW2pdLnRvTG93ZXJDYXNlKCkpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXggPiAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZS5jbGFzc05hbWVzLnNwbGljZShpbmRleCwxKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG5vZGUuYXR0cmlidXRlcy5jbGFzcyA9IG5vZGUuY2xhc3NOYW1lcy5qb2luKCcgJyk7XG4gICAgICAgIH1cbiAgICAgICAgdkRPTVV0aWxzLnNldENoYW5nZWQobm9kZXNbMF0pO1xuICAgIH0sXG4gICAgLy9hZGRzIGNsYXNzcyB0byBhbGwgdmlydHVhbCBub2Rlc1xuICAgIGFkZENsYXNzZXM6IGZ1bmN0aW9uKG5vZGVzLCBjbGFzc2VzKSB7XG4gICAgICAgIGNsYXNzZXMgPSBjbGFzc2VzLnNwbGl0KCcgJyk7XG4gICAgICAgIGZvciAodmFyIGk9MDsgaTxub2Rlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIG5vZGUgPSBub2Rlc1tpXTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBqPTA7IGo8Y2xhc3Nlcy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGNsYXNzZXNbal0gPT09IFwidW5kZWZpbmVkXCIpIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICBpZiAobm9kZS5jbGFzc05hbWVzLmluZGV4T2YoY2xhc3Nlc1tqXS50b0xvd2VyQ2FzZSgpKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGUuY2xhc3NOYW1lcy5wdXNoKGNsYXNzZXNbal0udG9Mb3dlckNhc2UoKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBub2RlLmF0dHJpYnV0ZXMuY2xhc3MgPSBub2RlLmNsYXNzTmFtZXMuam9pbignICcpO1xuICAgICAgICB9XG4gICAgICAgIHZET01VdGlscy5zZXRDaGFuZ2VkKG5vZGVzWzBdKTtcbiAgICB9XG59IiwiLyoqXG4gKiBcbiAqIGxpZnRlZCBhbmQgbW9kaWZpZWQgZnJvbTogaHR0cHM6Ly9naXRodWIuY29tL2FzaGkwMDkvbm9kZS1mYXN0LWh0bWwtcGFyc2VyXG4gKiBcbiAqL1xuXG52YXIga01hcmt1cFBhdHRlcm4gPSAvPCEtLVteXSo/KD89LS0+KS0tPnw8KFxcLz8pKFthLXpdW2EtejAtOV0qKVxccyooW14+XSo/KShcXC8/KT4vaWc7XG52YXIga0F0dHJpYnV0ZVBhdHRlcm4gPSAvXFxiKFtBLXpdKilcXHMqPVxccyooXCIoW15cIl0rKVwifCcoW14nXSspJ3woXFxTKykpL2lnO1xudmFyIGtTZWxmQ2xvc2luZ0VsZW1lbnRzID0ge1xuICAgIG1ldGE6IHRydWUsXG4gICAgaW1nOiB0cnVlLFxuICAgIGxpbms6IHRydWUsXG4gICAgaW5wdXQ6IHRydWUsXG4gICAgYXJlYTogdHJ1ZSxcbiAgICBicjogdHJ1ZSxcbiAgICBocjogdHJ1ZVxufTtcbnZhciBrRWxlbWVudHNDbG9zZWRCeU9wZW5pbmcgPSB7XG4gICAgbGk6IHsgbGk6IHRydWUgfSxcbiAgICBwOiB7IHA6IHRydWUsIGRpdjogdHJ1ZSB9LFxuICAgIHRkOiB7IHRkOiB0cnVlLCB0aDogdHJ1ZSB9LFxuICAgIHRoOiB7IHRkOiB0cnVlLCB0aDogdHJ1ZSB9XG59O1xudmFyIGtFbGVtZW50c0Nsb3NlZEJ5Q2xvc2luZyA9IHtcbiAgICBsaTogeyB1bDogdHJ1ZSwgb2w6IHRydWUgfSxcbiAgICBhOiB7IGRpdjogdHJ1ZSB9LFxuICAgIGI6IHsgZGl2OiB0cnVlIH0sXG4gICAgaTogeyBkaXY6IHRydWUgfSxcbiAgICBwOiB7IGRpdjogdHJ1ZSB9LFxuICAgIHRkOiB7IHRyOiB0cnVlLCB0YWJsZTogdHJ1ZSB9LFxuICAgIHRoOiB7IHRyOiB0cnVlLCB0YWJsZTogdHJ1ZSB9XG59O1xudmFyIGtCbG9ja1RleHRFbGVtZW50cyA9IHtcbiAgICBzY3JpcHQ6IHRydWUsXG4gICAgbm9zY3JpcHQ6IHRydWUsXG4gICAgc3R5bGU6IHRydWUsXG4gICAgcHJlOiB0cnVlXG59O1xuXG52YXIgbm9kZVR5cGVzID0gcmVxdWlyZSgnLi9ub2RlVHlwZXMuanMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgaWROb2RlczogW10sXG4gICAgY3JlYXRlVkRPTTogZnVuY3Rpb24gKGRhdGEsIGluaXQpIHtcbiAgICAgICAgZGF0YSA9IGRhdGEucmVwbGFjZSgvXFxyP1xcbnxcXHIvZywgXCJcIik7XG4gICAgICAgIHZhciByb290ID0gbmV3IG5vZGVUeXBlcy52aXJ0dWFsTm9kZShcInJvb3RcIiwgbnVsbCk7XG4gICAgICAgIHZhciBjdXJyZW50UGFyZW50ID0gcm9vdDtcbiAgICAgICAgdmFyIHN0YWNrID0gW3Jvb3RdO1xuICAgICAgICB2YXIgbGFzdFRleHRQb3MgPSAtMTtcblxuICAgICAgICBmb3IgKHZhciBtYXRjaCwgdGV4dDsgbWF0Y2ggPSBrTWFya3VwUGF0dGVybi5leGVjKGRhdGEpOykge1xuICAgICAgICAgICAgaWYgKGxhc3RUZXh0UG9zID4gLTEpIHtcbiAgICAgICAgICAgICAgICBpZiAobGFzdFRleHRQb3MgKyBtYXRjaFswXS5sZW5ndGggPCBrTWFya3VwUGF0dGVybi5sYXN0SW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gaWYgaGFzIGNvbnRlbnRcbiAgICAgICAgICAgICAgICAgICAgdGV4dCA9IGRhdGEuc3Vic3RyaW5nKGxhc3RUZXh0UG9zLCBrTWFya3VwUGF0dGVybi5sYXN0SW5kZXggLSBtYXRjaFswXS5sZW5ndGgpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodGV4dC5yZXBsYWNlKC8gL2csIFwiXCIpLmxlbmd0aCA+IDApXG4gICAgICAgICAgICAgICAgICAgICAgICBjdXJyZW50UGFyZW50LmNoaWxkTm9kZXMucHVzaChuZXcgbm9kZVR5cGVzLnZpcnR1YWxUZXh0Tm9kZSh0ZXh0LCBjdXJyZW50UGFyZW50KSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbGFzdFRleHRQb3MgPSBrTWFya3VwUGF0dGVybi5sYXN0SW5kZXg7XG4gICAgICAgICAgICBpZiAobWF0Y2hbMF1bMV0gPT0gJyEnKSB7XG4gICAgICAgICAgICAgICAgLy8gdGhpcyBpcyBhIGNvbW1lbnRcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG1hdGNoWzJdID0gbWF0Y2hbMl0udG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgIGlmICghbWF0Y2hbMV0pIHtcbiAgICAgICAgICAgICAgICAvLyBub3QgPC8gdGFnc1xuICAgICAgICAgICAgICAgIHZhciBhdHRycyA9IHt9O1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGF0dE1hdGNoOyBhdHRNYXRjaCA9IGtBdHRyaWJ1dGVQYXR0ZXJuLmV4ZWMobWF0Y2hbM10pOylcbiAgICAgICAgICAgICAgICAgICAgYXR0cnNbYXR0TWF0Y2hbMV1dID0gYXR0TWF0Y2hbM10gfHwgYXR0TWF0Y2hbNF0gfHwgYXR0TWF0Y2hbNV07XG4gICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coYXR0cnMpO1xuICAgICAgICAgICAgICAgIGlmICghbWF0Y2hbNF0gJiYga0VsZW1lbnRzQ2xvc2VkQnlPcGVuaW5nW2N1cnJlbnRQYXJlbnQubmFtZV0pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGtFbGVtZW50c0Nsb3NlZEJ5T3BlbmluZ1tjdXJyZW50UGFyZW50Lm5hbWVdW21hdGNoWzJdXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhY2sucG9wKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXJyZW50UGFyZW50ID0gc3RhY2tbc3RhY2subGVuZ3RoIC0gMV07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIG5vZGUgPSBuZXcgbm9kZVR5cGVzLnZpcnR1YWxOb2RlKG1hdGNoWzJdLCBjdXJyZW50UGFyZW50KTtcbiAgICAgICAgICAgICAgICBjdXJyZW50UGFyZW50LmNoaWxkcmVuLnB1c2gobm9kZSk7XG4gICAgICAgICAgICAgICAgY3VycmVudFBhcmVudC5jaGlsZE5vZGVzLnB1c2gobm9kZSk7XG4gICAgICAgICAgICAgICAgY3VycmVudFBhcmVudCA9IG5vZGU7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgYU5hbWUgaW4gYXR0cnMpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHZhbHVlID0gYXR0cnNbYU5hbWVdO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYU5hbWUgPT09IFwiaWRcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGluaXQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pZE5vZGVzW3ZhbHVlXSA9IGN1cnJlbnRQYXJlbnQ7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXJyZW50UGFyZW50LmlkID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKGFOYW1lID09PSBcImNsYXNzXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICBjdXJyZW50UGFyZW50LmNsYXNzTmFtZXMgPSB2YWx1ZS5zcGxpdChcIiBcIik7XG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnRQYXJlbnQuYXR0cmlidXRlc1thTmFtZV0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc3RhY2sucHVzaChjdXJyZW50UGFyZW50KTtcbiAgICAgICAgICAgICAgICBpZiAoa0Jsb2NrVGV4dEVsZW1lbnRzW21hdGNoWzJdXSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBhIGxpdHRsZSB0ZXN0IHRvIGZpbmQgbmV4dCA8L3NjcmlwdD4gb3IgPC9zdHlsZT4gLi4uXG4gICAgICAgICAgICAgICAgICAgIHZhciBjbG9zZU1hcmt1cCA9ICc8LycgKyBtYXRjaFsyXSArICc+JztcbiAgICAgICAgICAgICAgICAgICAgdmFyIGluZGV4ID0gZGF0YS5pbmRleE9mKGNsb3NlTWFya3VwLCBrTWFya3VwUGF0dGVybi5sYXN0SW5kZXgpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXggPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxhc3RUZXh0UG9zID0ga01hcmt1cFBhdHRlcm4ubGFzdEluZGV4ID0gZGF0YS5sZW5ndGggKyAxO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGFzdFRleHRQb3MgPSBrTWFya3VwUGF0dGVybi5sYXN0SW5kZXggPSBpbmRleCArIGNsb3NlTWFya3VwLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hdGNoWzFdID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChtYXRjaFsxXSB8fCBtYXRjaFs0XSB8fFxuICAgICAgICAgICAgICAgIGtTZWxmQ2xvc2luZ0VsZW1lbnRzW21hdGNoWzJdXSkge1xuICAgICAgICAgICAgICAgIC8vIDwvIG9yIC8+IG9yIDxicj4gZXRjLlxuICAgICAgICAgICAgICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjdXJyZW50UGFyZW50Lm5hbWUgPT0gbWF0Y2hbMl0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YWNrLnBvcCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY3VycmVudFBhcmVudCA9IHN0YWNrW3N0YWNrLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBUcnlpbmcgdG8gY2xvc2UgY3VycmVudCB0YWcsIGFuZCBtb3ZlIG9uXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoa0VsZW1lbnRzQ2xvc2VkQnlDbG9zaW5nW2N1cnJlbnRQYXJlbnQubmFtZV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoa0VsZW1lbnRzQ2xvc2VkQnlDbG9zaW5nW2N1cnJlbnRQYXJlbnQubmFtZV1bbWF0Y2hbMl1dKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YWNrLnBvcCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXJyZW50UGFyZW50ID0gc3RhY2tbc3RhY2subGVuZ3RoIC0gMV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFVzZSBhZ2dyZXNzaXZlIHN0cmF0ZWd5IHRvIGhhbmRsZSB1bm1hdGNoaW5nIG1hcmt1cHMuXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcm9vdDtcbiAgICB9LFxuICAgIGxvYWQ6IGZ1bmN0aW9uKGh0bWwpIHtcbiAgICAgICAgdGhpcy5vbGRET00gPSB0aGlzLmNyZWF0ZVZET00oaHRtbCwgdHJ1ZSk7XG4gICAgICAgIHRoaXMubmV3RE9NID0gdGhpcy5jcmVhdGVWRE9NKGh0bWwsIHRydWUpO1xuICAgICAgICB0aGlzLm5ld0RPTS5jaGFuZ2VkID0gZmFsc2U7XG4gICAgfVxufTsiLCJ2YXIgdkRPTVV0aWxzID0gcmVxdWlyZSgnLi92RE9NVXRpbHMuanMnKTtcbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIG9uOiBmdW5jdGlvbihub2RlcywgZXZlbnQsIGNhbGxiYWNrKSB7XG4gICAgICAgIGZvciAodmFyIGk9MDsgaTxub2Rlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIG5vZGUgPSBub2Rlc1tpXTtcbiAgICAgICAgICAgIHZhciBsaXN0ZW5lciA9IChmdW5jdGlvbihub2RlLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgICAgIHZhciBuZXdMaXN0ZW5lciA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjay5jYWxsKG5vZGUsIGV2ZW50KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbmV3TGlzdGVuZXIuX29yaWdpbmFsQ2FsbGJhY2sgPSBjYWxsYmFjaztcbiAgICAgICAgICAgICAgICBuZXdMaXN0ZW5lci5fZGV0YWNoID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgbmV3TGlzdGVuZXIuX2lzQXR0YWNoZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3TGlzdGVuZXJcbiAgICAgICAgICAgIH0pKG5vZGUsIGNhbGxiYWNrKTtcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygbm9kZS5saXN0ZW5lcnNbZXZlbnRdID09PSBcInVuZGVmaW5lZFwiKVxuICAgICAgICAgICAgICAgIG5vZGUubGlzdGVuZXJzW2V2ZW50XSA9IFtsaXN0ZW5lcl07XG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgbm9kZS5saXN0ZW5lcnNbZXZlbnRdLnB1c2gobGlzdGVuZXIpO1xuICAgICAgICAgICAgbm9kZS5oYXNMaXN0ZW5lcnMgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHZET01VdGlscy5zZXRDaGFuZ2VkKG5vZGVzWzBdKTtcbiAgICB9LFxuICAgIG9mZjogZnVuY3Rpb24obm9kZXMsIGV2ZW50LCBjYWxsYmFjaykge1xuICAgICAgICBmb3IgKHZhciBpPTA7IGk8bm9kZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBub2RlID0gbm9kZXNbaV07XG4gICAgICAgICAgICBpZiAodHlwZW9mIG5vZGUubGlzdGVuZXJzW2V2ZW50XSAhPT0gXCJ1bmRlZmluZWRcIilcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpPTA7IGk8bm9kZS5saXN0ZW5lcnNbZXZlbnRdLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBsaXN0ZW5lciA9IG5vZGUubGlzdGVuZXJzW2V2ZW50XVtpXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGxpc3RlbmVyLl9vcmlnaW5hbENhbGxiYWNrID09PSBjYWxsYmFjayAmJiBsaXN0ZW5lci5faXNBdHRhY2hlZClcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpc3RlbmVyLl9kZXRhY2ggPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG5vZGUuaGFzTGlzdGVuZXJzID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICB2RE9NVXRpbHMuc2V0Q2hhbmdlZChub2Rlc1swXSk7XG4gICAgfVxufSIsInZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzLmpzJyksXG4gICAgbm9kZVR5cGVzID0gcmVxdWlyZSgnLi9ub2RlVHlwZXMuanMnKVxuICAgIHZET01VdGlscyA9IHJlcXVpcmUoJy4vdkRPTVV0aWxzLmpzJyksXG4gICAgc2VsZkNsb3NpbmcgPSBbXCJhcmVhXCIsXCJiYXNlXCIsXCJiclwiLFwiY29sXCIsXCJjb21tYW5kXCIsXCJlbWJlZFwiLFwiaHJcIixcImltZ1wiLFwiaW5wdXRcIixcImtleWdlblwiLFwibGlua1wiLFwibWV0YVwiLFwicGFyYW1cIixcInNvdXJjZVwiLFwidHJhY2tcIixcIndiclwiXTtcblxudmFyIGdlbmVyYXRlSFRNTCA9IGZ1bmN0aW9uKG5vZGUpIHtcbiAgICBpZiAobm9kZSBpbnN0YW5jZW9mIG5vZGVUeXBlcy52aXJ0dWFsTm9kZSkge1xuICAgICAgICB2YXIgcmVzID0gXCI8XCIgKyBub2RlLm5hbWU7XG4gICAgICAgIGZvciAodmFyIG5hbWUgaW4gbm9kZS5hdHRyaWJ1dGVzKSB7XG4gICAgICAgICAgICByZXMgKz0gXCIgXCIgKyBuYW1lICsgXCI9XFxcIlwiICsgbm9kZS5hdHRyaWJ1dGVzW25hbWVdICsgXCJcXFwiXCI7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHNlbGZDbG9zaW5nLmluZGV4T2Yobm9kZS5uYW1lKSA+IC0xKSB7XG4gICAgICAgICAgICByZXMgKz1cIi8+XCI7XG4gICAgICAgICAgICByZXR1cm4gcmVzO1xuICAgICAgICB9XG4gICAgICAgIHJlcys9XCI+XCI7XG4gICAgICAgIGZvciAodmFyIGk9MDsgaTxub2RlLmNoaWxkTm9kZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHJlcyArPSBnZW5lcmF0ZUhUTUwobm9kZS5jaGlsZE5vZGVzW2ldKTtcbiAgICAgICAgfVxuICAgICAgICByZXMgKz0gXCI8L1wiICsgbm9kZS5uYW1lICsgXCI+XCI7XG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG5vZGUudmFsdWU7XG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICAvL2dlbmVyYXRlZCB2aXJ0dWFsIERPTSBmcm9tIHBhc3NlZCBodG1sIGFuZCByZXBsYWNlcyB0aGUgY2hpbGRyZW4gb2YgdGhlIHBhc3NlZCBub2RlcyB3aXRoIGl0XG4gICAgc2V0SFRNTDogZnVuY3Rpb24obm9kZXMsIGh0bWwpIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICBmdW5jdGlvbiByZW1vdmVIZWxwZXIobm9kZXMpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGk9MDsgaTxub2RlLmNoaWxkcmVuLmxlbmd0aDsgaSsrKVxuICAgICAgICAgICAgICAgIHJlbW92ZUhlbHBlcihub2RlLmNoaWxkcmVuW2ldKTtcbiAgICAgICAgICAgIHNlbGYucmVtb3ZlTm9kZXMobm9kZS5jaGlsZHJlbik7XG4gICAgICAgIH1cbiAgICAgICAgZnVuY3Rpb24gYWRkSGVscGVyKG5vZGVzKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpPTA7IGk8bm9kZS5jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGFkZEhlbHBlcihub2RlLmNoaWxkcmVuW2ldKTtcbiAgICAgICAgICAgICAgICBpZiAobm9kZS5jaGlsZHJlbltpXS5pZClcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5pZE5vZGVzID0gbm9kZS5jaGlsZHJlbltpXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBmb3IgKHZhciBpPTA7IGk8bm9kZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBub2RlID0gbm9kZXNbaV07XG4gICAgICAgICAgICByZW1vdmVIZWxwZXIobm9kZSk7XG4gICAgICAgICAgICBub2RlLmNoaWxkcmVuID0gdGhpcy5jcmVhdGVWRE9NKGh0bWwpLmNoaWxkcmVuO1xuICAgICAgICAgICAgYWRkSGVscGVyKG5vZGUuY2hpbGRyZW4pO1xuICAgICAgICAgICAgbm9kZS5jaGlsZE5vZGVzID0gdGhpcy5jcmVhdGVWRE9NKGh0bWwpLmNoaWxkTm9kZXM7ICAgIFxuICAgICAgICB9XG4gICAgICAgIHZET01VdGlscy5zZXRDaGFuZ2VkKG5vZGVzWzBdKTtcbiAgICB9LFxuICAgIC8vcmV0dXJuIGlubmVySFRNTCBmb3IgYSBub2RlXG4gICAgZ2V0SFRNTDogZnVuY3Rpb24obm9kZXMpIHtcbiAgICAgICAgdmFyIHJlcyA9IFwiXCI7XG4gICAgICAgIGZvciAodmFyIGk9MDsgaTxub2Rlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgZm9yICh2YXIgaz0wOyBrPG5vZGVzW2ldLmNoaWxkcmVuLmxlbmd0aDsgaysrKSB7XG4gICAgICAgICAgICAgICAgcmVzKz0gZ2VuZXJhdGVIVE1MKG5vZGVzW2ldLmNoaWxkcmVuW2tdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH1cbn0iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgICB2aXJ0dWFsTm9kZTogZnVuY3Rpb24gKG5hbWUsIHBhcmVudE5vZGUpIHtcbiAgICAgICAgT2JqZWN0LmFzc2lnbih0aGlzLCB7XG4gICAgICAgICAgICBuYW1lOiBuYW1lLFxuICAgICAgICAgICAgcGFyZW50Tm9kZTogcGFyZW50Tm9kZSxcbiAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHt9LFxuICAgICAgICAgICAgY2xhc3NOYW1lczogW10sXG4gICAgICAgICAgICBwYXRoOiBcIlwiLFxuICAgICAgICAgICAgY2hpbGRyZW46IFtdLFxuICAgICAgICAgICAgY2hpbGROb2RlczogW10sXG4gICAgICAgICAgICBpZDogbnVsbCxcbiAgICAgICAgICAgIGxpc3RlbmVyczoge30sXG4gICAgICAgICAgICBoYXNMaXN0ZW5lcnM6IGZhbHNlLCBcbiAgICAgICAgICAgIHJlbW92ZUxpc3RlbmVyczogW11cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICB2aXJ0dWFsVGV4dE5vZGU6IGZ1bmN0aW9uICh2YWx1ZSwgcGFyZW50Tm9kZSkge1xuICAgICAgICBPYmplY3QuYXNzaWduKHRoaXMsIHtcbiAgICAgICAgICAgIHBhcmVudE5vZGU6IHBhcmVudE5vZGUsXG4gICAgICAgICAgICB2YWx1ZTogdmFsdWVcbiAgICAgICAgfSk7XG4gICAgfVxufSIsInZhciB2RE9NVXRpbHMgPSByZXF1aXJlKCcuL3ZET01VdGlscy5qcycpO1xubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgLy9yZW1vdmVzIGEgdmlydHVhbCBub2RlIGZyb20gaXRzIHBhcmVudFxuICAgIHJlbW92ZU5vZGVzOiBmdW5jdGlvbihub2RlcywgaWdub3JlU2V0Q2hhbmdlZCkge1xuICAgICAgICBmb3IgKHZhciBpPTA7IGk8bm9kZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBub2RlID0gbm9kZXNbaV07XG4gICAgICAgICAgICBpZiAoIW5vZGUucGFyZW50Tm9kZSkgY29udGludWU7XG4gICAgICAgICAgICBpZiAobm9kZS5pZClcbiAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy5pZE5vZGVzW25vZGUuaWRdO1xuICAgICAgICAgICAgbm9kZS5wYXJlbnROb2RlLmNoaWxkcmVuLnNwbGljZShub2RlLnBhcmVudE5vZGUuY2hpbGRyZW4uaW5kZXhPZihub2RlKSwxKTtcbiAgICAgICAgICAgIG5vZGUucGFyZW50Tm9kZS5jaGlsZE5vZGVzLnNwbGljZShub2RlLnBhcmVudE5vZGUuY2hpbGROb2Rlcy5pbmRleE9mKG5vZGUpLDEpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpZ25vcmVTZXRDaGFuZ2VkKSByZXR1cm47XG4gICAgICAgIHZET01VdGlscy5zZXRDaGFuZ2VkKG5vZGVzWzBdKTtcbiAgICB9XG59IiwidmFyIHZET01VdGlscyA9IHJlcXVpcmUoJy4vdkRPTVV0aWxzLmpzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIC8vU2V0IHRoZSB2YWx1ZSBvZiBhIHN0eWxlIGZvciBlYWNoIGVsZW1lbnRcbiAgICBzZXRTdHlsZShub2RlcywgcHJvcGVydHksIHZhbHVlKSB7XG4gICAgICAgIHByb3BlcnR5ID0gdkRPTVV0aWxzLmV4cGFuZFNob3J0aGFuZENTUyhwcm9wZXJ0eSk7XG4gICAgICAgIGlmICh2RE9NVXRpbHMudmFsaWRhdGVDU1MocHJvcGVydHksIHZhbHVlKSkge1xuICAgICAgICAgICAgZm9yICh2YXIgaT0wOyBpPG5vZGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIG5vZGUgPSBub2Rlc1tpXTtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG5vZGUuYXR0cmlidXRlcy5zdHlsZSA9PT0gXCJ1bmRlZmluZWRcIilcbiAgICAgICAgICAgICAgICAgICAgbm9kZS5hdHRyaWJ1dGVzLnN0eWxlID0gXCJcIjtcbiAgICAgICAgICAgICAgICB2YXIgc3R5bGVzID0gdkRPTVV0aWxzLnN0eWxlVG9PYmplY3Qobm9kZS5hdHRyaWJ1dGVzLnN0eWxlKTsgIFxuICAgICAgICAgICAgICAgIHN0eWxlc1twcm9wZXJ0eV0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICBub2RlLmF0dHJpYnV0ZXMuc3R5bGUgPSB2RE9NVXRpbHMub2JqZWN0VG9TdHlsZShzdHlsZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdkRPTVV0aWxzLnNldENoYW5nZWQobm9kZXNbMF0pO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAvL2dldCB0aGUgdmFsdWUgb2YgYSBzdHlsZSBmb3IgdGhlIGZpcnN0IGVsZW1lbnRcbiAgICBnZXRTdHlsZShub2RlcywgcHJvcGVydHkpIHtcbiAgICAgICAgcHJvcGVydHkgPSB2RE9NVXRpbHMuZXhwYW5kU2hvcnRoYW5kQ1NTKHByb3BlcnR5KTtcbiAgICAgICAgdmFyIG5vZGUgPSBub2Rlc1swXSxcbiAgICAgICAgICAgIHN0eWxlcyA9IHZET01VdGlscy5zdHlsZVRvT2JqZWN0KG5vZGUuYXR0cmlidXRlcy5zdHlsZSk7XG4gICAgICAgIHJldHVybiBzdHlsZXNbcHJvcGVydHldO1xuICAgIH1cbn0iLCIvLyMgVmlydHVhbCBET01cbnZhciB2RE9NVXRpbHMgPSByZXF1aXJlKCcuL3ZET01VdGlscy5qcycpO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gT2JqZWN0LmFzc2lnbih7XG4gICAgbmV3RE9NOiBudWxsLFxuICAgIG9sZERPTTogbnVsbCxcbiAgICBjbG9uZTogZnVuY3Rpb24obm9kZSkge1xuICAgICAgICByZXR1cm4gdkRPTVV0aWxzLmNsb25lKG5vZGUpO1xuICAgIH1cbn0sIFxucmVxdWlyZSgnLi9ub2RlVHlwZXMuanMnKSxcbnJlcXVpcmUoJy4vY3JlYXRlVkRPTS5qcycpLFxucmVxdWlyZSgnLi9ldmVudHMuanMnKSxcbnJlcXVpcmUoJy4vY2xhc3MuanMnKSxcbnJlcXVpcmUoJy4vYWRkQ2hpbGQuanMnKSxcbnJlcXVpcmUoJy4vcmVtb3ZlQ2hpbGQuanMnKSxcbnJlcXVpcmUoJy4vaHRtbC5qcycpLFxucmVxdWlyZSgnLi9zdHlsZXMuanMnKSxcbnJlcXVpcmUoJy4vYXR0cmlidXRlcy5qcycpKTtcbiIsInZhciBjbG9uZU9iamVjdCA9IHJlcXVpcmUoXCJjbG9uZVwiKTtcbmZ1bmN0aW9uIGNsb25lKG5vZGVzKSB7XG4gICAgdmFyIG5ld05vZGVzID0gW107XG4gICAgZm9yICh2YXIgaT0wOyBpPG5vZGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBjbG9uZSA9IGNsb25lT2JqZWN0KG5vZGVzW2ldKTtcbiAgICAgICAgaWYgKGNsb25lLmhhc0xpc3RlbmVycylcbiAgICAgICAgICAgIGZvciAodmFyIGV2ZW50IGluIGNsb25lLmxpc3RlbmVycykge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY2xvbmUubGlzdGVuZXJzW2V2ZW50XS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbGlzdGVuZXIgPSBjbG9uZS5saXN0ZW5lcnNbZXZlbnRdW2ldO1xuICAgICAgICAgICAgICAgICAgICBsaXN0ZW5lci5faXNBdHRhY2hlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgbmV3Tm9kZXMucHVzaChjbG9uZSk7XG4gICAgfSBcbiAgICBuZXdOb2Rlcy5wcm90b3R5cGUgPSBub2Rlcy5wcm90b3R5cGU7XG4gICAgcmV0dXJuIG5ld05vZGVzO1xufVxuZnVuY3Rpb24gc2V0Q2hhbmdlZChub2RlKSB7XG4gICAgd2hpbGUgKG5vZGUucGFyZW50Tm9kZSkge1xuICAgICAgICBub2RlID0gbm9kZS5wYXJlbnROb2RlO1xuICAgIH1cbiAgICBub2RlLmNoYW5nZWQgPSB0cnVlO1xufVxuZnVuY3Rpb24gZXhwYW5kU2hvcnRoYW5kQ1NTKHN0cikge1xuICAgIGlmIChzdHIuaW5kZXhPZignLScpID4gMClcbiAgICAgICAgcmV0dXJuIHN0cjtcbiAgICB2YXIgcmVzdWx0ID0gc3RyLnJlcGxhY2UoLyhbQS1aXSspL2csIFwiLCQxXCIpLnJlcGxhY2UoL14sLywgXCJcIik7XG4gICAgcmV0dXJuIHJlc3VsdC5zcGxpdChcIixcIikuam9pbihcIi1cIikudG9Mb3dlckNhc2UoKTtcbn1cbmZ1bmN0aW9uIHZhbGlkYXRlQ1NTKHByb3BlcnR5LCB2YWx1ZSkge1xuICAgIHZhciBlbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgZWxlbWVudC5zdHlsZVtwcm9wZXJ0eV0gPSB2YWx1ZTtcbiAgICByZXR1cm4gZWxlbWVudC5zdHlsZVtwcm9wZXJ0eV0gPT09IHZhbHVlO1xufVxuZnVuY3Rpb24gc3R5bGVUb09iamVjdChzdHlsZSkge1xuICAgIGlmIChzdHlsZVtzdHlsZS5sZW5ndGgtMV0gPT09IFwiO1wiKVxuICAgICAgICBzdHlsZSA9IHN0eWxlLnNsaWNlKDAsc3R5bGUubGVuZ3RoLTEpOyBcbiAgICBzdHlsZSA9IHN0eWxlLnJlcGxhY2UoLyAvZywgXCJcIikuc3BsaXQoXCI7XCIpO1xuICAgIHZhciByZXMgPSB7fTtcbiAgICBmb3IgKHZhciBpPTA7IGk8c3R5bGUubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHMgPSBzdHlsZVtpXTtcbiAgICAgICAgaWYgKHMhPT1cIlwiKSB7XG4gICAgICAgICAgICB2YXIgc3MgPSBzLnNwbGl0KFwiOlwiKTtcbiAgICAgICAgICAgIHJlc1tzc1swXV0gPSBzc1sxXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzO1xufVxuZnVuY3Rpb24gb2JqZWN0VG9TdHlsZShvKSB7XG4gICAgdmFyIHJlcyA9IFtdO1xuICAgIGZvciAodmFyIGkgaW4gbykge1xuICAgICAgICByZXMucHVzaChpICsgXCI6IFwiICsgb1tpXSk7XG4gICAgfVxuICAgIHJldHVybiByZXMuam9pbihcIjtcIik7XG59XG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBjbG9uZTogY2xvbmUsXG4gICAgc2V0Q2hhbmdlZDogc2V0Q2hhbmdlZCxcbiAgICBleHBhbmRTaG9ydGhhbmRDU1M6IGV4cGFuZFNob3J0aGFuZENTUyxcbiAgICB2YWxpZGF0ZUNTUzogdmFsaWRhdGVDU1MsXG4gICAgc3R5bGVUb09iamVjdDogc3R5bGVUb09iamVjdCxcbiAgICBvYmplY3RUb1N0eWxlOiBvYmplY3RUb1N0eWxlXG59IiwidmFyIHZET00gPSByZXF1aXJlKCcuL3ZET00vdkRPTS5qcycpLFxuICAgIHJlbmRlciA9IHJlcXVpcmUoJy4vcmVuZGVyLmpzJyksXG4gICAgb3B0aW9ucyA9IHJlcXVpcmUoJy4vb3B0aW9ucy5qcycpO1xuXG5mdW5jdGlvbiB2aXJ0dWFsUXVlcnkoYXJyYXkpIHtcbiAgdmFyIGFyciA9IFtdO1xuICBhcnIgPSBhcnIuY29uY2F0KGFycmF5KTtcbiAgYXJyLl9fcHJvdG9fXyA9IHZpcnR1YWxRdWVyeS5wcm90b3R5cGU7XG4gIHJldHVybiBhcnI7XG59XG52aXJ0dWFsUXVlcnkucHJvdG90eXBlID0gbmV3IEFycmF5O1xuXG5PYmplY3QuYXNzaWduKHZpcnR1YWxRdWVyeS5wcm90b3R5cGUsIHtcbiAgICBhcHBlbmQ6IGZ1bmN0aW9uIChhcmcpIHtcbiAgICAgICAgc3dpdGNoICh0eXBlb2YgYXJnKSB7XG4gICAgICAgICAgICBjYXNlIFwic3RyaW5nXCI6XG4gICAgICAgICAgICAgICAgdkRPTS5hZGRDaGlsZEZyb21IdG1sKHRoaXMsIGFyZywgXCJlbmRcIik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICBjYXNlIFwib2JqZWN0XCI6XG4gICAgICAgICAgICAgICAgaWYgKGFyZyBpbnN0YW5jZW9mIHZET00udmlydHVhbE5vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgdkRPTS5hZGRDaGlsZEZyb21WTm9kZXModGhpcywgW2FyZ10sIFwiZW5kXCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoYXJnIGluc3RhbmNlb2YgdmlydHVhbFF1ZXJ5KSB7XG4gICAgICAgICAgICAgICAgICAgIHZET00uYWRkQ2hpbGRGcm9tVk5vZGVzKHRoaXMsIGFyZywgXCJlbmRcIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBhcHBlbmRUbzogZnVuY3Rpb24gKGFyZykge1xuICAgICAgICBzd2l0Y2ggKHR5cGVvZiBhcmcpIHtcbiAgICAgICAgICAgIGNhc2UgXCJzdHJpbmdcIjpcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IHZpcnR1YWxRdWVyeSh2RE9NLmFkZENoaWxkRnJvbVZOb2RlcyhbdkRPTS5jcmVhdGVWRE9NKGFyZyldLCB0aGlzLCBcImVuZFwiKSk7XG4gICAgICAgICAgICBjYXNlIFwib2JqZWN0XCI6XG4gICAgICAgICAgICAgICAgaWYgKGFyZyBpbnN0YW5jZW9mIHZET00udmlydHVhbE5vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyB2aXJ0dWFsUXVlcnkodkRPTS5hZGRDaGlsZEZyb21WTm9kZXMoW2FyZ10sIHRoaXMsIFwiZW5kXCIpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGFyZyBpbnN0YW5jZW9mIHZpcnR1YWxRdWVyeSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IHZpcnR1YWxRdWVyeSh2RE9NLmFkZENoaWxkRnJvbVZOb2RlcyhhcmcsIHRoaXMsIFwiZW5kXCIpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHByZXBlbmQ6IGZ1bmN0aW9uIChhcmcpIHtcbiAgICAgICAgc3dpdGNoICh0eXBlb2YgYXJnKSB7XG4gICAgICAgICAgICBjYXNlIFwic3RyaW5nXCI6XG4gICAgICAgICAgICAgICAgdkRPTS5hZGRDaGlsZEZyb21IdG1sKHRoaXMsIGFyZywgXCJzdGFydFwiKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIGNhc2UgXCJvYmplY3RcIjpcbiAgICAgICAgICAgICAgICBpZiAoYXJnIGluc3RhbmNlb2YgdkRPTS52aXJ0dWFsTm9kZSkge1xuICAgICAgICAgICAgICAgICAgICB2RE9NLmFkZENoaWxkRnJvbVZOb2Rlcyh0aGlzLCBbYXJnXSwgXCJzdGFydFwiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGFyZyBpbnN0YW5jZW9mIHZpcnR1YWxRdWVyeSkge1xuICAgICAgICAgICAgICAgICAgICB2RE9NLmFkZENoaWxkRnJvbVZOb2Rlcyh0aGlzLCBhcmcsIFwic3RhcnRcIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBwcmVwZW5kVG86IGZ1bmN0aW9uIChhcmcpIHtcbiAgICAgICAgc3dpdGNoICh0eXBlb2YgYXJnKSB7XG4gICAgICAgICAgICBjYXNlIFwic3RyaW5nXCI6XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyB2aXJ0dWFsUXVlcnkodkRPTS5hZGRDaGlsZEZyb21WTm9kZXMoW3ZET00uY3JlYXRlVkRPTShhcmcpXSwgdGhpcywgXCJzdGFydFwiKSk7XG4gICAgICAgICAgICBjYXNlIFwib2JqZWN0XCI6XG4gICAgICAgICAgICAgICAgaWYgKGFyZyBpbnN0YW5jZW9mIHZET00udmlydHVhbE5vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyB2aXJ0dWFsUXVlcnkodkRPTS5hZGRDaGlsZEZyb21WTm9kZXMoW2FyZ10sIHRoaXMsIFwic3RhcnRcIikpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoYXJnIGluc3RhbmNlb2YgdmlydHVhbFF1ZXJ5KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgdmlydHVhbFF1ZXJ5KHZET00uYWRkQ2hpbGRGcm9tVk5vZGVzKGFyZywgdGhpcywgXCJzdGFydFwiKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICByZW1vdmU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdkRPTS5yZW1vdmVOb2Rlcyh0aGlzKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBhZGRDbGFzczogZnVuY3Rpb24gKGNsYXNzZXMpIHtcbiAgICAgICAgdkRPTS5hZGRDbGFzc2VzKHRoaXMsIGNsYXNzZXMpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIHJlbW92ZUNsYXNzOiBmdW5jdGlvbihjbGFzc2VzKSB7XG4gICAgICAgIHZET00ucmVtb3ZlQ2xhc3Nlcyh0aGlzLCBjbGFzc2VzKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBoYXNDbGFzczogZnVuY3Rpb24oY2xhc3NJbikge1xuICAgICAgICByZXR1cm4gdkRPTS5oYXNDbGFzcyh0aGlzLCBjbGFzc0luKTtcbiAgICB9LFxuICAgIGh0bWw6IGZ1bmN0aW9uIChodG1sKSB7XG4gICAgICAgIGlmICh0eXBlb2YgaHRtbCAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgdkRPTS5zZXRIVE1MKHRoaXMsIGh0bWwpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdkRPTS5nZXRIVE1MKHRoaXMpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBhdHRyOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgICAgIHN3aXRjaCAoYXJncy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNhc2UgMTpcbiAgICAgICAgICAgICAgICBzd2l0Y2godHlwZW9mIGFyZ3NbMF0pIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcInN0cmluZ1wiOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZET00uZ2V0QXR0cmlidXRlKHRoaXMsIGFyZ3NbMF0pO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIFwib2JqZWN0XCI6XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBhdHRyTmFtZSBpbiBhcmdzWzBdKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZET00uc2V0QXR0cmlidXRlKHRoaXMsIGF0dHJOYW1lLCBhcmdzWzBdW2F0dHJOYW1lXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgICAgICAgdkRPTS5zZXRBdHRyaWJ1dGUodGhpcywgYXJnc1swXSwgYXJnc1sxXSlcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgIH0sXG4gICAgY3NzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgICAgIHN3aXRjaCAoYXJncy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNhc2UgMTpcbiAgICAgICAgICAgICAgICBzd2l0Y2godHlwZW9mIGFyZ3NbMF0pIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcInN0cmluZ1wiOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZET00uZ2V0U3R5bGUodGhpcywgYXJnc1swXSk7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJvYmplY3RcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAodmFyIHByb3BlcnR5IGluIGFyZ3NbMF0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdkRPTS5zZXRTdHlsZSh0aGlzLCBwcm9wZXJ0eSwgYXJnc1swXVtwcm9wZXJ0eV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSAyOlxuICAgICAgICAgICAgICAgIHZET00uc2V0U3R5bGUodGhpcywgYXJnc1swXSwgYXJnc1sxXSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIGNsb25lOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHZET00uY2xvbmUodGhpcyk7XG4gICAgfSxcbiAgICBvbjogZnVuY3Rpb24oZXZlbnQsIGNhbGxiYWNrKSB7XG4gICAgICAgIHZET00ub24odGhpcywgZXZlbnQsIGNhbGxiYWNrKTtcbiAgICAgICAgaWYgKCFvcHRpb25zLmF1dG9VcGRhdGUpXG4gICAgICAgICAgICByZW5kZXIudXBkYXRlKCk7XG4gICAgfSxcbiAgICBvZmY6IGZ1bmN0aW9uKGV2ZW50LCBjYWxsYmFjaykge1xuICAgICAgICB2RE9NLm9mZih0aGlzLCBldmVudCwgY2FsbGJhY2spO1xuICAgICAgICBpZiAoIW9wdGlvbnMuYXV0b1VwZGF0ZSlcbiAgICAgICAgICAgIHJlbmRlci51cGRhdGUoKTtcbiAgICB9XG59KTtcbm1vZHVsZS5leHBvcnRzID0gdmlydHVhbFF1ZXJ5OyIsIid1c2Ugc3RyaWN0J1xuXG5leHBvcnRzLnRvQnl0ZUFycmF5ID0gdG9CeXRlQXJyYXlcbmV4cG9ydHMuZnJvbUJ5dGVBcnJheSA9IGZyb21CeXRlQXJyYXlcblxudmFyIGxvb2t1cCA9IFtdXG52YXIgcmV2TG9va3VwID0gW11cbnZhciBBcnIgPSB0eXBlb2YgVWludDhBcnJheSAhPT0gJ3VuZGVmaW5lZCcgPyBVaW50OEFycmF5IDogQXJyYXlcblxuZnVuY3Rpb24gaW5pdCAoKSB7XG4gIHZhciBjb2RlID0gJ0FCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5Ky8nXG4gIGZvciAodmFyIGkgPSAwLCBsZW4gPSBjb2RlLmxlbmd0aDsgaSA8IGxlbjsgKytpKSB7XG4gICAgbG9va3VwW2ldID0gY29kZVtpXVxuICAgIHJldkxvb2t1cFtjb2RlLmNoYXJDb2RlQXQoaSldID0gaVxuICB9XG5cbiAgcmV2TG9va3VwWyctJy5jaGFyQ29kZUF0KDApXSA9IDYyXG4gIHJldkxvb2t1cFsnXycuY2hhckNvZGVBdCgwKV0gPSA2M1xufVxuXG5pbml0KClcblxuZnVuY3Rpb24gdG9CeXRlQXJyYXkgKGI2NCkge1xuICB2YXIgaSwgaiwgbCwgdG1wLCBwbGFjZUhvbGRlcnMsIGFyclxuICB2YXIgbGVuID0gYjY0Lmxlbmd0aFxuXG4gIGlmIChsZW4gJSA0ID4gMCkge1xuICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBzdHJpbmcuIExlbmd0aCBtdXN0IGJlIGEgbXVsdGlwbGUgb2YgNCcpXG4gIH1cblxuICAvLyB0aGUgbnVtYmVyIG9mIGVxdWFsIHNpZ25zIChwbGFjZSBob2xkZXJzKVxuICAvLyBpZiB0aGVyZSBhcmUgdHdvIHBsYWNlaG9sZGVycywgdGhhbiB0aGUgdHdvIGNoYXJhY3RlcnMgYmVmb3JlIGl0XG4gIC8vIHJlcHJlc2VudCBvbmUgYnl0ZVxuICAvLyBpZiB0aGVyZSBpcyBvbmx5IG9uZSwgdGhlbiB0aGUgdGhyZWUgY2hhcmFjdGVycyBiZWZvcmUgaXQgcmVwcmVzZW50IDIgYnl0ZXNcbiAgLy8gdGhpcyBpcyBqdXN0IGEgY2hlYXAgaGFjayB0byBub3QgZG8gaW5kZXhPZiB0d2ljZVxuICBwbGFjZUhvbGRlcnMgPSBiNjRbbGVuIC0gMl0gPT09ICc9JyA/IDIgOiBiNjRbbGVuIC0gMV0gPT09ICc9JyA/IDEgOiAwXG5cbiAgLy8gYmFzZTY0IGlzIDQvMyArIHVwIHRvIHR3byBjaGFyYWN0ZXJzIG9mIHRoZSBvcmlnaW5hbCBkYXRhXG4gIGFyciA9IG5ldyBBcnIobGVuICogMyAvIDQgLSBwbGFjZUhvbGRlcnMpXG5cbiAgLy8gaWYgdGhlcmUgYXJlIHBsYWNlaG9sZGVycywgb25seSBnZXQgdXAgdG8gdGhlIGxhc3QgY29tcGxldGUgNCBjaGFyc1xuICBsID0gcGxhY2VIb2xkZXJzID4gMCA/IGxlbiAtIDQgOiBsZW5cblxuICB2YXIgTCA9IDBcblxuICBmb3IgKGkgPSAwLCBqID0gMDsgaSA8IGw7IGkgKz0gNCwgaiArPSAzKSB7XG4gICAgdG1wID0gKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpKV0gPDwgMTgpIHwgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMSldIDw8IDEyKSB8IChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSArIDIpXSA8PCA2KSB8IHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMyldXG4gICAgYXJyW0wrK10gPSAodG1wID4+IDE2KSAmIDB4RkZcbiAgICBhcnJbTCsrXSA9ICh0bXAgPj4gOCkgJiAweEZGXG4gICAgYXJyW0wrK10gPSB0bXAgJiAweEZGXG4gIH1cblxuICBpZiAocGxhY2VIb2xkZXJzID09PSAyKSB7XG4gICAgdG1wID0gKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpKV0gPDwgMikgfCAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAxKV0gPj4gNClcbiAgICBhcnJbTCsrXSA9IHRtcCAmIDB4RkZcbiAgfSBlbHNlIGlmIChwbGFjZUhvbGRlcnMgPT09IDEpIHtcbiAgICB0bXAgPSAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkpXSA8PCAxMCkgfCAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAxKV0gPDwgNCkgfCAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAyKV0gPj4gMilcbiAgICBhcnJbTCsrXSA9ICh0bXAgPj4gOCkgJiAweEZGXG4gICAgYXJyW0wrK10gPSB0bXAgJiAweEZGXG4gIH1cblxuICByZXR1cm4gYXJyXG59XG5cbmZ1bmN0aW9uIHRyaXBsZXRUb0Jhc2U2NCAobnVtKSB7XG4gIHJldHVybiBsb29rdXBbbnVtID4+IDE4ICYgMHgzRl0gKyBsb29rdXBbbnVtID4+IDEyICYgMHgzRl0gKyBsb29rdXBbbnVtID4+IDYgJiAweDNGXSArIGxvb2t1cFtudW0gJiAweDNGXVxufVxuXG5mdW5jdGlvbiBlbmNvZGVDaHVuayAodWludDgsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHRtcFxuICB2YXIgb3V0cHV0ID0gW11cbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyBpICs9IDMpIHtcbiAgICB0bXAgPSAodWludDhbaV0gPDwgMTYpICsgKHVpbnQ4W2kgKyAxXSA8PCA4KSArICh1aW50OFtpICsgMl0pXG4gICAgb3V0cHV0LnB1c2godHJpcGxldFRvQmFzZTY0KHRtcCkpXG4gIH1cbiAgcmV0dXJuIG91dHB1dC5qb2luKCcnKVxufVxuXG5mdW5jdGlvbiBmcm9tQnl0ZUFycmF5ICh1aW50OCkge1xuICB2YXIgdG1wXG4gIHZhciBsZW4gPSB1aW50OC5sZW5ndGhcbiAgdmFyIGV4dHJhQnl0ZXMgPSBsZW4gJSAzIC8vIGlmIHdlIGhhdmUgMSBieXRlIGxlZnQsIHBhZCAyIGJ5dGVzXG4gIHZhciBvdXRwdXQgPSAnJ1xuICB2YXIgcGFydHMgPSBbXVxuICB2YXIgbWF4Q2h1bmtMZW5ndGggPSAxNjM4MyAvLyBtdXN0IGJlIG11bHRpcGxlIG9mIDNcblxuICAvLyBnbyB0aHJvdWdoIHRoZSBhcnJheSBldmVyeSB0aHJlZSBieXRlcywgd2UnbGwgZGVhbCB3aXRoIHRyYWlsaW5nIHN0dWZmIGxhdGVyXG4gIGZvciAodmFyIGkgPSAwLCBsZW4yID0gbGVuIC0gZXh0cmFCeXRlczsgaSA8IGxlbjI7IGkgKz0gbWF4Q2h1bmtMZW5ndGgpIHtcbiAgICBwYXJ0cy5wdXNoKGVuY29kZUNodW5rKHVpbnQ4LCBpLCAoaSArIG1heENodW5rTGVuZ3RoKSA+IGxlbjIgPyBsZW4yIDogKGkgKyBtYXhDaHVua0xlbmd0aCkpKVxuICB9XG5cbiAgLy8gcGFkIHRoZSBlbmQgd2l0aCB6ZXJvcywgYnV0IG1ha2Ugc3VyZSB0byBub3QgZm9yZ2V0IHRoZSBleHRyYSBieXRlc1xuICBpZiAoZXh0cmFCeXRlcyA9PT0gMSkge1xuICAgIHRtcCA9IHVpbnQ4W2xlbiAtIDFdXG4gICAgb3V0cHV0ICs9IGxvb2t1cFt0bXAgPj4gMl1cbiAgICBvdXRwdXQgKz0gbG9va3VwWyh0bXAgPDwgNCkgJiAweDNGXVxuICAgIG91dHB1dCArPSAnPT0nXG4gIH0gZWxzZSBpZiAoZXh0cmFCeXRlcyA9PT0gMikge1xuICAgIHRtcCA9ICh1aW50OFtsZW4gLSAyXSA8PCA4KSArICh1aW50OFtsZW4gLSAxXSlcbiAgICBvdXRwdXQgKz0gbG9va3VwW3RtcCA+PiAxMF1cbiAgICBvdXRwdXQgKz0gbG9va3VwWyh0bXAgPj4gNCkgJiAweDNGXVxuICAgIG91dHB1dCArPSBsb29rdXBbKHRtcCA8PCAyKSAmIDB4M0ZdXG4gICAgb3V0cHV0ICs9ICc9J1xuICB9XG5cbiAgcGFydHMucHVzaChvdXRwdXQpXG5cbiAgcmV0dXJuIHBhcnRzLmpvaW4oJycpXG59XG4iLCIvKiFcbiAqIFRoZSBidWZmZXIgbW9kdWxlIGZyb20gbm9kZS5qcywgZm9yIHRoZSBicm93c2VyLlxuICpcbiAqIEBhdXRob3IgICBGZXJvc3MgQWJvdWtoYWRpamVoIDxmZXJvc3NAZmVyb3NzLm9yZz4gPGh0dHA6Ly9mZXJvc3Mub3JnPlxuICogQGxpY2Vuc2UgIE1JVFxuICovXG4vKiBlc2xpbnQtZGlzYWJsZSBuby1wcm90byAqL1xuXG4ndXNlIHN0cmljdCdcblxudmFyIGJhc2U2NCA9IHJlcXVpcmUoJ2Jhc2U2NC1qcycpXG52YXIgaWVlZTc1NCA9IHJlcXVpcmUoJ2llZWU3NTQnKVxudmFyIGlzQXJyYXkgPSByZXF1aXJlKCdpc2FycmF5JylcblxuZXhwb3J0cy5CdWZmZXIgPSBCdWZmZXJcbmV4cG9ydHMuU2xvd0J1ZmZlciA9IFNsb3dCdWZmZXJcbmV4cG9ydHMuSU5TUEVDVF9NQVhfQllURVMgPSA1MFxuXG4vKipcbiAqIElmIGBCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVGA6XG4gKiAgID09PSB0cnVlICAgIFVzZSBVaW50OEFycmF5IGltcGxlbWVudGF0aW9uIChmYXN0ZXN0KVxuICogICA9PT0gZmFsc2UgICBVc2UgT2JqZWN0IGltcGxlbWVudGF0aW9uIChtb3N0IGNvbXBhdGlibGUsIGV2ZW4gSUU2KVxuICpcbiAqIEJyb3dzZXJzIHRoYXQgc3VwcG9ydCB0eXBlZCBhcnJheXMgYXJlIElFIDEwKywgRmlyZWZveCA0KywgQ2hyb21lIDcrLCBTYWZhcmkgNS4xKyxcbiAqIE9wZXJhIDExLjYrLCBpT1MgNC4yKy5cbiAqXG4gKiBEdWUgdG8gdmFyaW91cyBicm93c2VyIGJ1Z3MsIHNvbWV0aW1lcyB0aGUgT2JqZWN0IGltcGxlbWVudGF0aW9uIHdpbGwgYmUgdXNlZCBldmVuXG4gKiB3aGVuIHRoZSBicm93c2VyIHN1cHBvcnRzIHR5cGVkIGFycmF5cy5cbiAqXG4gKiBOb3RlOlxuICpcbiAqICAgLSBGaXJlZm94IDQtMjkgbGFja3Mgc3VwcG9ydCBmb3IgYWRkaW5nIG5ldyBwcm9wZXJ0aWVzIHRvIGBVaW50OEFycmF5YCBpbnN0YW5jZXMsXG4gKiAgICAgU2VlOiBodHRwczovL2J1Z3ppbGxhLm1vemlsbGEub3JnL3Nob3dfYnVnLmNnaT9pZD02OTU0MzguXG4gKlxuICogICAtIENocm9tZSA5LTEwIGlzIG1pc3NpbmcgdGhlIGBUeXBlZEFycmF5LnByb3RvdHlwZS5zdWJhcnJheWAgZnVuY3Rpb24uXG4gKlxuICogICAtIElFMTAgaGFzIGEgYnJva2VuIGBUeXBlZEFycmF5LnByb3RvdHlwZS5zdWJhcnJheWAgZnVuY3Rpb24gd2hpY2ggcmV0dXJucyBhcnJheXMgb2ZcbiAqICAgICBpbmNvcnJlY3QgbGVuZ3RoIGluIHNvbWUgc2l0dWF0aW9ucy5cblxuICogV2UgZGV0ZWN0IHRoZXNlIGJ1Z2d5IGJyb3dzZXJzIGFuZCBzZXQgYEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUYCB0byBgZmFsc2VgIHNvIHRoZXlcbiAqIGdldCB0aGUgT2JqZWN0IGltcGxlbWVudGF0aW9uLCB3aGljaCBpcyBzbG93ZXIgYnV0IGJlaGF2ZXMgY29ycmVjdGx5LlxuICovXG5CdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCA9IGdsb2JhbC5UWVBFRF9BUlJBWV9TVVBQT1JUICE9PSB1bmRlZmluZWRcbiAgPyBnbG9iYWwuVFlQRURfQVJSQVlfU1VQUE9SVFxuICA6IHR5cGVkQXJyYXlTdXBwb3J0KClcblxuLypcbiAqIEV4cG9ydCBrTWF4TGVuZ3RoIGFmdGVyIHR5cGVkIGFycmF5IHN1cHBvcnQgaXMgZGV0ZXJtaW5lZC5cbiAqL1xuZXhwb3J0cy5rTWF4TGVuZ3RoID0ga01heExlbmd0aCgpXG5cbmZ1bmN0aW9uIHR5cGVkQXJyYXlTdXBwb3J0ICgpIHtcbiAgdHJ5IHtcbiAgICB2YXIgYXJyID0gbmV3IFVpbnQ4QXJyYXkoMSlcbiAgICBhcnIuZm9vID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gNDIgfVxuICAgIHJldHVybiBhcnIuZm9vKCkgPT09IDQyICYmIC8vIHR5cGVkIGFycmF5IGluc3RhbmNlcyBjYW4gYmUgYXVnbWVudGVkXG4gICAgICAgIHR5cGVvZiBhcnIuc3ViYXJyYXkgPT09ICdmdW5jdGlvbicgJiYgLy8gY2hyb21lIDktMTAgbGFjayBgc3ViYXJyYXlgXG4gICAgICAgIGFyci5zdWJhcnJheSgxLCAxKS5ieXRlTGVuZ3RoID09PSAwIC8vIGllMTAgaGFzIGJyb2tlbiBgc3ViYXJyYXlgXG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxufVxuXG5mdW5jdGlvbiBrTWF4TGVuZ3RoICgpIHtcbiAgcmV0dXJuIEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUXG4gICAgPyAweDdmZmZmZmZmXG4gICAgOiAweDNmZmZmZmZmXG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUJ1ZmZlciAodGhhdCwgbGVuZ3RoKSB7XG4gIGlmIChrTWF4TGVuZ3RoKCkgPCBsZW5ndGgpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignSW52YWxpZCB0eXBlZCBhcnJheSBsZW5ndGgnKVxuICB9XG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIC8vIFJldHVybiBhbiBhdWdtZW50ZWQgYFVpbnQ4QXJyYXlgIGluc3RhbmNlLCBmb3IgYmVzdCBwZXJmb3JtYW5jZVxuICAgIHRoYXQgPSBuZXcgVWludDhBcnJheShsZW5ndGgpXG4gICAgdGhhdC5fX3Byb3RvX18gPSBCdWZmZXIucHJvdG90eXBlXG4gIH0gZWxzZSB7XG4gICAgLy8gRmFsbGJhY2s6IFJldHVybiBhbiBvYmplY3QgaW5zdGFuY2Ugb2YgdGhlIEJ1ZmZlciBjbGFzc1xuICAgIGlmICh0aGF0ID09PSBudWxsKSB7XG4gICAgICB0aGF0ID0gbmV3IEJ1ZmZlcihsZW5ndGgpXG4gICAgfVxuICAgIHRoYXQubGVuZ3RoID0gbGVuZ3RoXG4gIH1cblxuICByZXR1cm4gdGhhdFxufVxuXG4vKipcbiAqIFRoZSBCdWZmZXIgY29uc3RydWN0b3IgcmV0dXJucyBpbnN0YW5jZXMgb2YgYFVpbnQ4QXJyYXlgIHRoYXQgaGF2ZSB0aGVpclxuICogcHJvdG90eXBlIGNoYW5nZWQgdG8gYEJ1ZmZlci5wcm90b3R5cGVgLiBGdXJ0aGVybW9yZSwgYEJ1ZmZlcmAgaXMgYSBzdWJjbGFzcyBvZlxuICogYFVpbnQ4QXJyYXlgLCBzbyB0aGUgcmV0dXJuZWQgaW5zdGFuY2VzIHdpbGwgaGF2ZSBhbGwgdGhlIG5vZGUgYEJ1ZmZlcmAgbWV0aG9kc1xuICogYW5kIHRoZSBgVWludDhBcnJheWAgbWV0aG9kcy4gU3F1YXJlIGJyYWNrZXQgbm90YXRpb24gd29ya3MgYXMgZXhwZWN0ZWQgLS0gaXRcbiAqIHJldHVybnMgYSBzaW5nbGUgb2N0ZXQuXG4gKlxuICogVGhlIGBVaW50OEFycmF5YCBwcm90b3R5cGUgcmVtYWlucyB1bm1vZGlmaWVkLlxuICovXG5cbmZ1bmN0aW9uIEJ1ZmZlciAoYXJnLCBlbmNvZGluZ09yT2Zmc2V0LCBsZW5ndGgpIHtcbiAgaWYgKCFCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCAmJiAhKHRoaXMgaW5zdGFuY2VvZiBCdWZmZXIpKSB7XG4gICAgcmV0dXJuIG5ldyBCdWZmZXIoYXJnLCBlbmNvZGluZ09yT2Zmc2V0LCBsZW5ndGgpXG4gIH1cblxuICAvLyBDb21tb24gY2FzZS5cbiAgaWYgKHR5cGVvZiBhcmcgPT09ICdudW1iZXInKSB7XG4gICAgaWYgKHR5cGVvZiBlbmNvZGluZ09yT2Zmc2V0ID09PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAnSWYgZW5jb2RpbmcgaXMgc3BlY2lmaWVkIHRoZW4gdGhlIGZpcnN0IGFyZ3VtZW50IG11c3QgYmUgYSBzdHJpbmcnXG4gICAgICApXG4gICAgfVxuICAgIHJldHVybiBhbGxvY1Vuc2FmZSh0aGlzLCBhcmcpXG4gIH1cbiAgcmV0dXJuIGZyb20odGhpcywgYXJnLCBlbmNvZGluZ09yT2Zmc2V0LCBsZW5ndGgpXG59XG5cbkJ1ZmZlci5wb29sU2l6ZSA9IDgxOTIgLy8gbm90IHVzZWQgYnkgdGhpcyBpbXBsZW1lbnRhdGlvblxuXG4vLyBUT0RPOiBMZWdhY3ksIG5vdCBuZWVkZWQgYW55bW9yZS4gUmVtb3ZlIGluIG5leHQgbWFqb3IgdmVyc2lvbi5cbkJ1ZmZlci5fYXVnbWVudCA9IGZ1bmN0aW9uIChhcnIpIHtcbiAgYXJyLl9fcHJvdG9fXyA9IEJ1ZmZlci5wcm90b3R5cGVcbiAgcmV0dXJuIGFyclxufVxuXG5mdW5jdGlvbiBmcm9tICh0aGF0LCB2YWx1ZSwgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoKSB7XG4gIGlmICh0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJ2YWx1ZVwiIGFyZ3VtZW50IG11c3Qgbm90IGJlIGEgbnVtYmVyJylcbiAgfVxuXG4gIGlmICh0eXBlb2YgQXJyYXlCdWZmZXIgIT09ICd1bmRlZmluZWQnICYmIHZhbHVlIGluc3RhbmNlb2YgQXJyYXlCdWZmZXIpIHtcbiAgICByZXR1cm4gZnJvbUFycmF5QnVmZmVyKHRoYXQsIHZhbHVlLCBlbmNvZGluZ09yT2Zmc2V0LCBsZW5ndGgpXG4gIH1cblxuICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJykge1xuICAgIHJldHVybiBmcm9tU3RyaW5nKHRoYXQsIHZhbHVlLCBlbmNvZGluZ09yT2Zmc2V0KVxuICB9XG5cbiAgcmV0dXJuIGZyb21PYmplY3QodGhhdCwgdmFsdWUpXG59XG5cbi8qKlxuICogRnVuY3Rpb25hbGx5IGVxdWl2YWxlbnQgdG8gQnVmZmVyKGFyZywgZW5jb2RpbmcpIGJ1dCB0aHJvd3MgYSBUeXBlRXJyb3JcbiAqIGlmIHZhbHVlIGlzIGEgbnVtYmVyLlxuICogQnVmZmVyLmZyb20oc3RyWywgZW5jb2RpbmddKVxuICogQnVmZmVyLmZyb20oYXJyYXkpXG4gKiBCdWZmZXIuZnJvbShidWZmZXIpXG4gKiBCdWZmZXIuZnJvbShhcnJheUJ1ZmZlclssIGJ5dGVPZmZzZXRbLCBsZW5ndGhdXSlcbiAqKi9cbkJ1ZmZlci5mcm9tID0gZnVuY3Rpb24gKHZhbHVlLCBlbmNvZGluZ09yT2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGZyb20obnVsbCwgdmFsdWUsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aClcbn1cblxuaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gIEJ1ZmZlci5wcm90b3R5cGUuX19wcm90b19fID0gVWludDhBcnJheS5wcm90b3R5cGVcbiAgQnVmZmVyLl9fcHJvdG9fXyA9IFVpbnQ4QXJyYXlcbiAgaWYgKHR5cGVvZiBTeW1ib2wgIT09ICd1bmRlZmluZWQnICYmIFN5bWJvbC5zcGVjaWVzICYmXG4gICAgICBCdWZmZXJbU3ltYm9sLnNwZWNpZXNdID09PSBCdWZmZXIpIHtcbiAgICAvLyBGaXggc3ViYXJyYXkoKSBpbiBFUzIwMTYuIFNlZTogaHR0cHM6Ly9naXRodWIuY29tL2Zlcm9zcy9idWZmZXIvcHVsbC85N1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShCdWZmZXIsIFN5bWJvbC5zcGVjaWVzLCB7XG4gICAgICB2YWx1ZTogbnVsbCxcbiAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgIH0pXG4gIH1cbn1cblxuZnVuY3Rpb24gYXNzZXJ0U2l6ZSAoc2l6ZSkge1xuICBpZiAodHlwZW9mIHNpemUgIT09ICdudW1iZXInKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJzaXplXCIgYXJndW1lbnQgbXVzdCBiZSBhIG51bWJlcicpXG4gIH1cbn1cblxuZnVuY3Rpb24gYWxsb2MgKHRoYXQsIHNpemUsIGZpbGwsIGVuY29kaW5nKSB7XG4gIGFzc2VydFNpemUoc2l6ZSlcbiAgaWYgKHNpemUgPD0gMCkge1xuICAgIHJldHVybiBjcmVhdGVCdWZmZXIodGhhdCwgc2l6ZSlcbiAgfVxuICBpZiAoZmlsbCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgLy8gT25seSBwYXkgYXR0ZW50aW9uIHRvIGVuY29kaW5nIGlmIGl0J3MgYSBzdHJpbmcuIFRoaXNcbiAgICAvLyBwcmV2ZW50cyBhY2NpZGVudGFsbHkgc2VuZGluZyBpbiBhIG51bWJlciB0aGF0IHdvdWxkXG4gICAgLy8gYmUgaW50ZXJwcmV0dGVkIGFzIGEgc3RhcnQgb2Zmc2V0LlxuICAgIHJldHVybiB0eXBlb2YgZW5jb2RpbmcgPT09ICdzdHJpbmcnXG4gICAgICA/IGNyZWF0ZUJ1ZmZlcih0aGF0LCBzaXplKS5maWxsKGZpbGwsIGVuY29kaW5nKVxuICAgICAgOiBjcmVhdGVCdWZmZXIodGhhdCwgc2l6ZSkuZmlsbChmaWxsKVxuICB9XG4gIHJldHVybiBjcmVhdGVCdWZmZXIodGhhdCwgc2l6ZSlcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGEgbmV3IGZpbGxlZCBCdWZmZXIgaW5zdGFuY2UuXG4gKiBhbGxvYyhzaXplWywgZmlsbFssIGVuY29kaW5nXV0pXG4gKiovXG5CdWZmZXIuYWxsb2MgPSBmdW5jdGlvbiAoc2l6ZSwgZmlsbCwgZW5jb2RpbmcpIHtcbiAgcmV0dXJuIGFsbG9jKG51bGwsIHNpemUsIGZpbGwsIGVuY29kaW5nKVxufVxuXG5mdW5jdGlvbiBhbGxvY1Vuc2FmZSAodGhhdCwgc2l6ZSkge1xuICBhc3NlcnRTaXplKHNpemUpXG4gIHRoYXQgPSBjcmVhdGVCdWZmZXIodGhhdCwgc2l6ZSA8IDAgPyAwIDogY2hlY2tlZChzaXplKSB8IDApXG4gIGlmICghQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNpemU7IGkrKykge1xuICAgICAgdGhhdFtpXSA9IDBcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHRoYXRcbn1cblxuLyoqXG4gKiBFcXVpdmFsZW50IHRvIEJ1ZmZlcihudW0pLCBieSBkZWZhdWx0IGNyZWF0ZXMgYSBub24temVyby1maWxsZWQgQnVmZmVyIGluc3RhbmNlLlxuICogKi9cbkJ1ZmZlci5hbGxvY1Vuc2FmZSA9IGZ1bmN0aW9uIChzaXplKSB7XG4gIHJldHVybiBhbGxvY1Vuc2FmZShudWxsLCBzaXplKVxufVxuLyoqXG4gKiBFcXVpdmFsZW50IHRvIFNsb3dCdWZmZXIobnVtKSwgYnkgZGVmYXVsdCBjcmVhdGVzIGEgbm9uLXplcm8tZmlsbGVkIEJ1ZmZlciBpbnN0YW5jZS5cbiAqL1xuQnVmZmVyLmFsbG9jVW5zYWZlU2xvdyA9IGZ1bmN0aW9uIChzaXplKSB7XG4gIHJldHVybiBhbGxvY1Vuc2FmZShudWxsLCBzaXplKVxufVxuXG5mdW5jdGlvbiBmcm9tU3RyaW5nICh0aGF0LCBzdHJpbmcsIGVuY29kaW5nKSB7XG4gIGlmICh0eXBlb2YgZW5jb2RpbmcgIT09ICdzdHJpbmcnIHx8IGVuY29kaW5nID09PSAnJykge1xuICAgIGVuY29kaW5nID0gJ3V0ZjgnXG4gIH1cblxuICBpZiAoIUJ1ZmZlci5pc0VuY29kaW5nKGVuY29kaW5nKSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1wiZW5jb2RpbmdcIiBtdXN0IGJlIGEgdmFsaWQgc3RyaW5nIGVuY29kaW5nJylcbiAgfVxuXG4gIHZhciBsZW5ndGggPSBieXRlTGVuZ3RoKHN0cmluZywgZW5jb2RpbmcpIHwgMFxuICB0aGF0ID0gY3JlYXRlQnVmZmVyKHRoYXQsIGxlbmd0aClcblxuICB0aGF0LndyaXRlKHN0cmluZywgZW5jb2RpbmcpXG4gIHJldHVybiB0aGF0XG59XG5cbmZ1bmN0aW9uIGZyb21BcnJheUxpa2UgKHRoYXQsIGFycmF5KSB7XG4gIHZhciBsZW5ndGggPSBjaGVja2VkKGFycmF5Lmxlbmd0aCkgfCAwXG4gIHRoYXQgPSBjcmVhdGVCdWZmZXIodGhhdCwgbGVuZ3RoKVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSArPSAxKSB7XG4gICAgdGhhdFtpXSA9IGFycmF5W2ldICYgMjU1XG4gIH1cbiAgcmV0dXJuIHRoYXRcbn1cblxuZnVuY3Rpb24gZnJvbUFycmF5QnVmZmVyICh0aGF0LCBhcnJheSwgYnl0ZU9mZnNldCwgbGVuZ3RoKSB7XG4gIGFycmF5LmJ5dGVMZW5ndGggLy8gdGhpcyB0aHJvd3MgaWYgYGFycmF5YCBpcyBub3QgYSB2YWxpZCBBcnJheUJ1ZmZlclxuXG4gIGlmIChieXRlT2Zmc2V0IDwgMCB8fCBhcnJheS5ieXRlTGVuZ3RoIDwgYnl0ZU9mZnNldCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdcXCdvZmZzZXRcXCcgaXMgb3V0IG9mIGJvdW5kcycpXG4gIH1cblxuICBpZiAoYXJyYXkuYnl0ZUxlbmd0aCA8IGJ5dGVPZmZzZXQgKyAobGVuZ3RoIHx8IDApKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1xcJ2xlbmd0aFxcJyBpcyBvdXQgb2YgYm91bmRzJylcbiAgfVxuXG4gIGlmIChsZW5ndGggPT09IHVuZGVmaW5lZCkge1xuICAgIGFycmF5ID0gbmV3IFVpbnQ4QXJyYXkoYXJyYXksIGJ5dGVPZmZzZXQpXG4gIH0gZWxzZSB7XG4gICAgYXJyYXkgPSBuZXcgVWludDhBcnJheShhcnJheSwgYnl0ZU9mZnNldCwgbGVuZ3RoKVxuICB9XG5cbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgLy8gUmV0dXJuIGFuIGF1Z21lbnRlZCBgVWludDhBcnJheWAgaW5zdGFuY2UsIGZvciBiZXN0IHBlcmZvcm1hbmNlXG4gICAgdGhhdCA9IGFycmF5XG4gICAgdGhhdC5fX3Byb3RvX18gPSBCdWZmZXIucHJvdG90eXBlXG4gIH0gZWxzZSB7XG4gICAgLy8gRmFsbGJhY2s6IFJldHVybiBhbiBvYmplY3QgaW5zdGFuY2Ugb2YgdGhlIEJ1ZmZlciBjbGFzc1xuICAgIHRoYXQgPSBmcm9tQXJyYXlMaWtlKHRoYXQsIGFycmF5KVxuICB9XG4gIHJldHVybiB0aGF0XG59XG5cbmZ1bmN0aW9uIGZyb21PYmplY3QgKHRoYXQsIG9iaikge1xuICBpZiAoQnVmZmVyLmlzQnVmZmVyKG9iaikpIHtcbiAgICB2YXIgbGVuID0gY2hlY2tlZChvYmoubGVuZ3RoKSB8IDBcbiAgICB0aGF0ID0gY3JlYXRlQnVmZmVyKHRoYXQsIGxlbilcblxuICAgIGlmICh0aGF0Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIHRoYXRcbiAgICB9XG5cbiAgICBvYmouY29weSh0aGF0LCAwLCAwLCBsZW4pXG4gICAgcmV0dXJuIHRoYXRcbiAgfVxuXG4gIGlmIChvYmopIHtcbiAgICBpZiAoKHR5cGVvZiBBcnJheUJ1ZmZlciAhPT0gJ3VuZGVmaW5lZCcgJiZcbiAgICAgICAgb2JqLmJ1ZmZlciBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKSB8fCAnbGVuZ3RoJyBpbiBvYmopIHtcbiAgICAgIGlmICh0eXBlb2Ygb2JqLmxlbmd0aCAhPT0gJ251bWJlcicgfHwgaXNuYW4ob2JqLmxlbmd0aCkpIHtcbiAgICAgICAgcmV0dXJuIGNyZWF0ZUJ1ZmZlcih0aGF0LCAwKVxuICAgICAgfVxuICAgICAgcmV0dXJuIGZyb21BcnJheUxpa2UodGhhdCwgb2JqKVxuICAgIH1cblxuICAgIGlmIChvYmoudHlwZSA9PT0gJ0J1ZmZlcicgJiYgaXNBcnJheShvYmouZGF0YSkpIHtcbiAgICAgIHJldHVybiBmcm9tQXJyYXlMaWtlKHRoYXQsIG9iai5kYXRhKVxuICAgIH1cbiAgfVxuXG4gIHRocm93IG5ldyBUeXBlRXJyb3IoJ0ZpcnN0IGFyZ3VtZW50IG11c3QgYmUgYSBzdHJpbmcsIEJ1ZmZlciwgQXJyYXlCdWZmZXIsIEFycmF5LCBvciBhcnJheS1saWtlIG9iamVjdC4nKVxufVxuXG5mdW5jdGlvbiBjaGVja2VkIChsZW5ndGgpIHtcbiAgLy8gTm90ZTogY2Fubm90IHVzZSBgbGVuZ3RoIDwga01heExlbmd0aGAgaGVyZSBiZWNhdXNlIHRoYXQgZmFpbHMgd2hlblxuICAvLyBsZW5ndGggaXMgTmFOICh3aGljaCBpcyBvdGhlcndpc2UgY29lcmNlZCB0byB6ZXJvLilcbiAgaWYgKGxlbmd0aCA+PSBrTWF4TGVuZ3RoKCkpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignQXR0ZW1wdCB0byBhbGxvY2F0ZSBCdWZmZXIgbGFyZ2VyIHRoYW4gbWF4aW11bSAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAnc2l6ZTogMHgnICsga01heExlbmd0aCgpLnRvU3RyaW5nKDE2KSArICcgYnl0ZXMnKVxuICB9XG4gIHJldHVybiBsZW5ndGggfCAwXG59XG5cbmZ1bmN0aW9uIFNsb3dCdWZmZXIgKGxlbmd0aCkge1xuICBpZiAoK2xlbmd0aCAhPSBsZW5ndGgpIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBlcWVxZXFcbiAgICBsZW5ndGggPSAwXG4gIH1cbiAgcmV0dXJuIEJ1ZmZlci5hbGxvYygrbGVuZ3RoKVxufVxuXG5CdWZmZXIuaXNCdWZmZXIgPSBmdW5jdGlvbiBpc0J1ZmZlciAoYikge1xuICByZXR1cm4gISEoYiAhPSBudWxsICYmIGIuX2lzQnVmZmVyKVxufVxuXG5CdWZmZXIuY29tcGFyZSA9IGZ1bmN0aW9uIGNvbXBhcmUgKGEsIGIpIHtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYSkgfHwgIUJ1ZmZlci5pc0J1ZmZlcihiKSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50cyBtdXN0IGJlIEJ1ZmZlcnMnKVxuICB9XG5cbiAgaWYgKGEgPT09IGIpIHJldHVybiAwXG5cbiAgdmFyIHggPSBhLmxlbmd0aFxuICB2YXIgeSA9IGIubGVuZ3RoXG5cbiAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IE1hdGgubWluKHgsIHkpOyBpIDwgbGVuOyArK2kpIHtcbiAgICBpZiAoYVtpXSAhPT0gYltpXSkge1xuICAgICAgeCA9IGFbaV1cbiAgICAgIHkgPSBiW2ldXG4gICAgICBicmVha1xuICAgIH1cbiAgfVxuXG4gIGlmICh4IDwgeSkgcmV0dXJuIC0xXG4gIGlmICh5IDwgeCkgcmV0dXJuIDFcbiAgcmV0dXJuIDBcbn1cblxuQnVmZmVyLmlzRW5jb2RpbmcgPSBmdW5jdGlvbiBpc0VuY29kaW5nIChlbmNvZGluZykge1xuICBzd2l0Y2ggKFN0cmluZyhlbmNvZGluZykudG9Mb3dlckNhc2UoKSkge1xuICAgIGNhc2UgJ2hleCc6XG4gICAgY2FzZSAndXRmOCc6XG4gICAgY2FzZSAndXRmLTgnOlxuICAgIGNhc2UgJ2FzY2lpJzpcbiAgICBjYXNlICdiaW5hcnknOlxuICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgY2FzZSAncmF3JzpcbiAgICBjYXNlICd1Y3MyJzpcbiAgICBjYXNlICd1Y3MtMic6XG4gICAgY2FzZSAndXRmMTZsZSc6XG4gICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgcmV0dXJuIHRydWVcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIGZhbHNlXG4gIH1cbn1cblxuQnVmZmVyLmNvbmNhdCA9IGZ1bmN0aW9uIGNvbmNhdCAobGlzdCwgbGVuZ3RoKSB7XG4gIGlmICghaXNBcnJheShsaXN0KSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1wibGlzdFwiIGFyZ3VtZW50IG11c3QgYmUgYW4gQXJyYXkgb2YgQnVmZmVycycpXG4gIH1cblxuICBpZiAobGlzdC5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gQnVmZmVyLmFsbG9jKDApXG4gIH1cblxuICB2YXIgaVxuICBpZiAobGVuZ3RoID09PSB1bmRlZmluZWQpIHtcbiAgICBsZW5ndGggPSAwXG4gICAgZm9yIChpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgIGxlbmd0aCArPSBsaXN0W2ldLmxlbmd0aFxuICAgIH1cbiAgfVxuXG4gIHZhciBidWZmZXIgPSBCdWZmZXIuYWxsb2NVbnNhZmUobGVuZ3RoKVxuICB2YXIgcG9zID0gMFxuICBmb3IgKGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7IGkrKykge1xuICAgIHZhciBidWYgPSBsaXN0W2ldXG4gICAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYnVmKSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJsaXN0XCIgYXJndW1lbnQgbXVzdCBiZSBhbiBBcnJheSBvZiBCdWZmZXJzJylcbiAgICB9XG4gICAgYnVmLmNvcHkoYnVmZmVyLCBwb3MpXG4gICAgcG9zICs9IGJ1Zi5sZW5ndGhcbiAgfVxuICByZXR1cm4gYnVmZmVyXG59XG5cbmZ1bmN0aW9uIGJ5dGVMZW5ndGggKHN0cmluZywgZW5jb2RpbmcpIHtcbiAgaWYgKEJ1ZmZlci5pc0J1ZmZlcihzdHJpbmcpKSB7XG4gICAgcmV0dXJuIHN0cmluZy5sZW5ndGhcbiAgfVxuICBpZiAodHlwZW9mIEFycmF5QnVmZmVyICE9PSAndW5kZWZpbmVkJyAmJiB0eXBlb2YgQXJyYXlCdWZmZXIuaXNWaWV3ID09PSAnZnVuY3Rpb24nICYmXG4gICAgICAoQXJyYXlCdWZmZXIuaXNWaWV3KHN0cmluZykgfHwgc3RyaW5nIGluc3RhbmNlb2YgQXJyYXlCdWZmZXIpKSB7XG4gICAgcmV0dXJuIHN0cmluZy5ieXRlTGVuZ3RoXG4gIH1cbiAgaWYgKHR5cGVvZiBzdHJpbmcgIT09ICdzdHJpbmcnKSB7XG4gICAgc3RyaW5nID0gJycgKyBzdHJpbmdcbiAgfVxuXG4gIHZhciBsZW4gPSBzdHJpbmcubGVuZ3RoXG4gIGlmIChsZW4gPT09IDApIHJldHVybiAwXG5cbiAgLy8gVXNlIGEgZm9yIGxvb3AgdG8gYXZvaWQgcmVjdXJzaW9uXG4gIHZhciBsb3dlcmVkQ2FzZSA9IGZhbHNlXG4gIGZvciAoOzspIHtcbiAgICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgICBjYXNlICdhc2NpaSc6XG4gICAgICBjYXNlICdiaW5hcnknOlxuICAgICAgLy8gRGVwcmVjYXRlZFxuICAgICAgY2FzZSAncmF3JzpcbiAgICAgIGNhc2UgJ3Jhd3MnOlxuICAgICAgICByZXR1cm4gbGVuXG4gICAgICBjYXNlICd1dGY4JzpcbiAgICAgIGNhc2UgJ3V0Zi04JzpcbiAgICAgIGNhc2UgdW5kZWZpbmVkOlxuICAgICAgICByZXR1cm4gdXRmOFRvQnl0ZXMoc3RyaW5nKS5sZW5ndGhcbiAgICAgIGNhc2UgJ3VjczInOlxuICAgICAgY2FzZSAndWNzLTInOlxuICAgICAgY2FzZSAndXRmMTZsZSc6XG4gICAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICAgIHJldHVybiBsZW4gKiAyXG4gICAgICBjYXNlICdoZXgnOlxuICAgICAgICByZXR1cm4gbGVuID4+PiAxXG4gICAgICBjYXNlICdiYXNlNjQnOlxuICAgICAgICByZXR1cm4gYmFzZTY0VG9CeXRlcyhzdHJpbmcpLmxlbmd0aFxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgaWYgKGxvd2VyZWRDYXNlKSByZXR1cm4gdXRmOFRvQnl0ZXMoc3RyaW5nKS5sZW5ndGggLy8gYXNzdW1lIHV0ZjhcbiAgICAgICAgZW5jb2RpbmcgPSAoJycgKyBlbmNvZGluZykudG9Mb3dlckNhc2UoKVxuICAgICAgICBsb3dlcmVkQ2FzZSA9IHRydWVcbiAgICB9XG4gIH1cbn1cbkJ1ZmZlci5ieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aFxuXG5mdW5jdGlvbiBzbG93VG9TdHJpbmcgKGVuY29kaW5nLCBzdGFydCwgZW5kKSB7XG4gIHZhciBsb3dlcmVkQ2FzZSA9IGZhbHNlXG5cbiAgLy8gTm8gbmVlZCB0byB2ZXJpZnkgdGhhdCBcInRoaXMubGVuZ3RoIDw9IE1BWF9VSU5UMzJcIiBzaW5jZSBpdCdzIGEgcmVhZC1vbmx5XG4gIC8vIHByb3BlcnR5IG9mIGEgdHlwZWQgYXJyYXkuXG5cbiAgLy8gVGhpcyBiZWhhdmVzIG5laXRoZXIgbGlrZSBTdHJpbmcgbm9yIFVpbnQ4QXJyYXkgaW4gdGhhdCB3ZSBzZXQgc3RhcnQvZW5kXG4gIC8vIHRvIHRoZWlyIHVwcGVyL2xvd2VyIGJvdW5kcyBpZiB0aGUgdmFsdWUgcGFzc2VkIGlzIG91dCBvZiByYW5nZS5cbiAgLy8gdW5kZWZpbmVkIGlzIGhhbmRsZWQgc3BlY2lhbGx5IGFzIHBlciBFQ01BLTI2MiA2dGggRWRpdGlvbixcbiAgLy8gU2VjdGlvbiAxMy4zLjMuNyBSdW50aW1lIFNlbWFudGljczogS2V5ZWRCaW5kaW5nSW5pdGlhbGl6YXRpb24uXG4gIGlmIChzdGFydCA9PT0gdW5kZWZpbmVkIHx8IHN0YXJ0IDwgMCkge1xuICAgIHN0YXJ0ID0gMFxuICB9XG4gIC8vIFJldHVybiBlYXJseSBpZiBzdGFydCA+IHRoaXMubGVuZ3RoLiBEb25lIGhlcmUgdG8gcHJldmVudCBwb3RlbnRpYWwgdWludDMyXG4gIC8vIGNvZXJjaW9uIGZhaWwgYmVsb3cuXG4gIGlmIChzdGFydCA+IHRoaXMubGVuZ3RoKSB7XG4gICAgcmV0dXJuICcnXG4gIH1cblxuICBpZiAoZW5kID09PSB1bmRlZmluZWQgfHwgZW5kID4gdGhpcy5sZW5ndGgpIHtcbiAgICBlbmQgPSB0aGlzLmxlbmd0aFxuICB9XG5cbiAgaWYgKGVuZCA8PSAwKSB7XG4gICAgcmV0dXJuICcnXG4gIH1cblxuICAvLyBGb3JjZSBjb2Vyc2lvbiB0byB1aW50MzIuIFRoaXMgd2lsbCBhbHNvIGNvZXJjZSBmYWxzZXkvTmFOIHZhbHVlcyB0byAwLlxuICBlbmQgPj4+PSAwXG4gIHN0YXJ0ID4+Pj0gMFxuXG4gIGlmIChlbmQgPD0gc3RhcnQpIHtcbiAgICByZXR1cm4gJydcbiAgfVxuXG4gIGlmICghZW5jb2RpbmcpIGVuY29kaW5nID0gJ3V0ZjgnXG5cbiAgd2hpbGUgKHRydWUpIHtcbiAgICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgICBjYXNlICdoZXgnOlxuICAgICAgICByZXR1cm4gaGV4U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAndXRmOCc6XG4gICAgICBjYXNlICd1dGYtOCc6XG4gICAgICAgIHJldHVybiB1dGY4U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAnYXNjaWknOlxuICAgICAgICByZXR1cm4gYXNjaWlTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICdiaW5hcnknOlxuICAgICAgICByZXR1cm4gYmluYXJ5U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgICAgcmV0dXJuIGJhc2U2NFNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ3VjczInOlxuICAgICAgY2FzZSAndWNzLTInOlxuICAgICAgY2FzZSAndXRmMTZsZSc6XG4gICAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICAgIHJldHVybiB1dGYxNmxlU2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgaWYgKGxvd2VyZWRDYXNlKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdVbmtub3duIGVuY29kaW5nOiAnICsgZW5jb2RpbmcpXG4gICAgICAgIGVuY29kaW5nID0gKGVuY29kaW5nICsgJycpLnRvTG93ZXJDYXNlKClcbiAgICAgICAgbG93ZXJlZENhc2UgPSB0cnVlXG4gICAgfVxuICB9XG59XG5cbi8vIFRoZSBwcm9wZXJ0eSBpcyB1c2VkIGJ5IGBCdWZmZXIuaXNCdWZmZXJgIGFuZCBgaXMtYnVmZmVyYCAoaW4gU2FmYXJpIDUtNykgdG8gZGV0ZWN0XG4vLyBCdWZmZXIgaW5zdGFuY2VzLlxuQnVmZmVyLnByb3RvdHlwZS5faXNCdWZmZXIgPSB0cnVlXG5cbmZ1bmN0aW9uIHN3YXAgKGIsIG4sIG0pIHtcbiAgdmFyIGkgPSBiW25dXG4gIGJbbl0gPSBiW21dXG4gIGJbbV0gPSBpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuc3dhcDE2ID0gZnVuY3Rpb24gc3dhcDE2ICgpIHtcbiAgdmFyIGxlbiA9IHRoaXMubGVuZ3RoXG4gIGlmIChsZW4gJSAyICE9PSAwKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0J1ZmZlciBzaXplIG11c3QgYmUgYSBtdWx0aXBsZSBvZiAxNi1iaXRzJylcbiAgfVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSArPSAyKSB7XG4gICAgc3dhcCh0aGlzLCBpLCBpICsgMSlcbiAgfVxuICByZXR1cm4gdGhpc1xufVxuXG5CdWZmZXIucHJvdG90eXBlLnN3YXAzMiA9IGZ1bmN0aW9uIHN3YXAzMiAoKSB7XG4gIHZhciBsZW4gPSB0aGlzLmxlbmd0aFxuICBpZiAobGVuICUgNCAhPT0gMCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdCdWZmZXIgc2l6ZSBtdXN0IGJlIGEgbXVsdGlwbGUgb2YgMzItYml0cycpXG4gIH1cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkgKz0gNCkge1xuICAgIHN3YXAodGhpcywgaSwgaSArIDMpXG4gICAgc3dhcCh0aGlzLCBpICsgMSwgaSArIDIpXG4gIH1cbiAgcmV0dXJuIHRoaXNcbn1cblxuQnVmZmVyLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uIHRvU3RyaW5nICgpIHtcbiAgdmFyIGxlbmd0aCA9IHRoaXMubGVuZ3RoIHwgMFxuICBpZiAobGVuZ3RoID09PSAwKSByZXR1cm4gJydcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHJldHVybiB1dGY4U2xpY2UodGhpcywgMCwgbGVuZ3RoKVxuICByZXR1cm4gc2xvd1RvU3RyaW5nLmFwcGx5KHRoaXMsIGFyZ3VtZW50cylcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5lcXVhbHMgPSBmdW5jdGlvbiBlcXVhbHMgKGIpIHtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYikpIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50IG11c3QgYmUgYSBCdWZmZXInKVxuICBpZiAodGhpcyA9PT0gYikgcmV0dXJuIHRydWVcbiAgcmV0dXJuIEJ1ZmZlci5jb21wYXJlKHRoaXMsIGIpID09PSAwXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuaW5zcGVjdCA9IGZ1bmN0aW9uIGluc3BlY3QgKCkge1xuICB2YXIgc3RyID0gJydcbiAgdmFyIG1heCA9IGV4cG9ydHMuSU5TUEVDVF9NQVhfQllURVNcbiAgaWYgKHRoaXMubGVuZ3RoID4gMCkge1xuICAgIHN0ciA9IHRoaXMudG9TdHJpbmcoJ2hleCcsIDAsIG1heCkubWF0Y2goLy57Mn0vZykuam9pbignICcpXG4gICAgaWYgKHRoaXMubGVuZ3RoID4gbWF4KSBzdHIgKz0gJyAuLi4gJ1xuICB9XG4gIHJldHVybiAnPEJ1ZmZlciAnICsgc3RyICsgJz4nXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuY29tcGFyZSA9IGZ1bmN0aW9uIGNvbXBhcmUgKHRhcmdldCwgc3RhcnQsIGVuZCwgdGhpc1N0YXJ0LCB0aGlzRW5kKSB7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKHRhcmdldCkpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudCBtdXN0IGJlIGEgQnVmZmVyJylcbiAgfVxuXG4gIGlmIChzdGFydCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgc3RhcnQgPSAwXG4gIH1cbiAgaWYgKGVuZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgZW5kID0gdGFyZ2V0ID8gdGFyZ2V0Lmxlbmd0aCA6IDBcbiAgfVxuICBpZiAodGhpc1N0YXJ0ID09PSB1bmRlZmluZWQpIHtcbiAgICB0aGlzU3RhcnQgPSAwXG4gIH1cbiAgaWYgKHRoaXNFbmQgPT09IHVuZGVmaW5lZCkge1xuICAgIHRoaXNFbmQgPSB0aGlzLmxlbmd0aFxuICB9XG5cbiAgaWYgKHN0YXJ0IDwgMCB8fCBlbmQgPiB0YXJnZXQubGVuZ3RoIHx8IHRoaXNTdGFydCA8IDAgfHwgdGhpc0VuZCA+IHRoaXMubGVuZ3RoKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ291dCBvZiByYW5nZSBpbmRleCcpXG4gIH1cblxuICBpZiAodGhpc1N0YXJ0ID49IHRoaXNFbmQgJiYgc3RhcnQgPj0gZW5kKSB7XG4gICAgcmV0dXJuIDBcbiAgfVxuICBpZiAodGhpc1N0YXJ0ID49IHRoaXNFbmQpIHtcbiAgICByZXR1cm4gLTFcbiAgfVxuICBpZiAoc3RhcnQgPj0gZW5kKSB7XG4gICAgcmV0dXJuIDFcbiAgfVxuXG4gIHN0YXJ0ID4+Pj0gMFxuICBlbmQgPj4+PSAwXG4gIHRoaXNTdGFydCA+Pj49IDBcbiAgdGhpc0VuZCA+Pj49IDBcblxuICBpZiAodGhpcyA9PT0gdGFyZ2V0KSByZXR1cm4gMFxuXG4gIHZhciB4ID0gdGhpc0VuZCAtIHRoaXNTdGFydFxuICB2YXIgeSA9IGVuZCAtIHN0YXJ0XG4gIHZhciBsZW4gPSBNYXRoLm1pbih4LCB5KVxuXG4gIHZhciB0aGlzQ29weSA9IHRoaXMuc2xpY2UodGhpc1N0YXJ0LCB0aGlzRW5kKVxuICB2YXIgdGFyZ2V0Q29weSA9IHRhcmdldC5zbGljZShzdGFydCwgZW5kKVxuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyArK2kpIHtcbiAgICBpZiAodGhpc0NvcHlbaV0gIT09IHRhcmdldENvcHlbaV0pIHtcbiAgICAgIHggPSB0aGlzQ29weVtpXVxuICAgICAgeSA9IHRhcmdldENvcHlbaV1cbiAgICAgIGJyZWFrXG4gICAgfVxuICB9XG5cbiAgaWYgKHggPCB5KSByZXR1cm4gLTFcbiAgaWYgKHkgPCB4KSByZXR1cm4gMVxuICByZXR1cm4gMFxufVxuXG5mdW5jdGlvbiBhcnJheUluZGV4T2YgKGFyciwgdmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZykge1xuICB2YXIgaW5kZXhTaXplID0gMVxuICB2YXIgYXJyTGVuZ3RoID0gYXJyLmxlbmd0aFxuICB2YXIgdmFsTGVuZ3RoID0gdmFsLmxlbmd0aFxuXG4gIGlmIChlbmNvZGluZyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgZW5jb2RpbmcgPSBTdHJpbmcoZW5jb2RpbmcpLnRvTG93ZXJDYXNlKClcbiAgICBpZiAoZW5jb2RpbmcgPT09ICd1Y3MyJyB8fCBlbmNvZGluZyA9PT0gJ3Vjcy0yJyB8fFxuICAgICAgICBlbmNvZGluZyA9PT0gJ3V0ZjE2bGUnIHx8IGVuY29kaW5nID09PSAndXRmLTE2bGUnKSB7XG4gICAgICBpZiAoYXJyLmxlbmd0aCA8IDIgfHwgdmFsLmxlbmd0aCA8IDIpIHtcbiAgICAgICAgcmV0dXJuIC0xXG4gICAgICB9XG4gICAgICBpbmRleFNpemUgPSAyXG4gICAgICBhcnJMZW5ndGggLz0gMlxuICAgICAgdmFsTGVuZ3RoIC89IDJcbiAgICAgIGJ5dGVPZmZzZXQgLz0gMlxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHJlYWQgKGJ1ZiwgaSkge1xuICAgIGlmIChpbmRleFNpemUgPT09IDEpIHtcbiAgICAgIHJldHVybiBidWZbaV1cbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGJ1Zi5yZWFkVUludDE2QkUoaSAqIGluZGV4U2l6ZSlcbiAgICB9XG4gIH1cblxuICB2YXIgZm91bmRJbmRleCA9IC0xXG4gIGZvciAodmFyIGkgPSAwOyBieXRlT2Zmc2V0ICsgaSA8IGFyckxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKHJlYWQoYXJyLCBieXRlT2Zmc2V0ICsgaSkgPT09IHJlYWQodmFsLCBmb3VuZEluZGV4ID09PSAtMSA/IDAgOiBpIC0gZm91bmRJbmRleCkpIHtcbiAgICAgIGlmIChmb3VuZEluZGV4ID09PSAtMSkgZm91bmRJbmRleCA9IGlcbiAgICAgIGlmIChpIC0gZm91bmRJbmRleCArIDEgPT09IHZhbExlbmd0aCkgcmV0dXJuIChieXRlT2Zmc2V0ICsgZm91bmRJbmRleCkgKiBpbmRleFNpemVcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKGZvdW5kSW5kZXggIT09IC0xKSBpIC09IGkgLSBmb3VuZEluZGV4XG4gICAgICBmb3VuZEluZGV4ID0gLTFcbiAgICB9XG4gIH1cbiAgcmV0dXJuIC0xXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuaW5kZXhPZiA9IGZ1bmN0aW9uIGluZGV4T2YgKHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcpIHtcbiAgaWYgKHR5cGVvZiBieXRlT2Zmc2V0ID09PSAnc3RyaW5nJykge1xuICAgIGVuY29kaW5nID0gYnl0ZU9mZnNldFxuICAgIGJ5dGVPZmZzZXQgPSAwXG4gIH0gZWxzZSBpZiAoYnl0ZU9mZnNldCA+IDB4N2ZmZmZmZmYpIHtcbiAgICBieXRlT2Zmc2V0ID0gMHg3ZmZmZmZmZlxuICB9IGVsc2UgaWYgKGJ5dGVPZmZzZXQgPCAtMHg4MDAwMDAwMCkge1xuICAgIGJ5dGVPZmZzZXQgPSAtMHg4MDAwMDAwMFxuICB9XG4gIGJ5dGVPZmZzZXQgPj49IDBcblxuICBpZiAodGhpcy5sZW5ndGggPT09IDApIHJldHVybiAtMVxuICBpZiAoYnl0ZU9mZnNldCA+PSB0aGlzLmxlbmd0aCkgcmV0dXJuIC0xXG5cbiAgLy8gTmVnYXRpdmUgb2Zmc2V0cyBzdGFydCBmcm9tIHRoZSBlbmQgb2YgdGhlIGJ1ZmZlclxuICBpZiAoYnl0ZU9mZnNldCA8IDApIGJ5dGVPZmZzZXQgPSBNYXRoLm1heCh0aGlzLmxlbmd0aCArIGJ5dGVPZmZzZXQsIDApXG5cbiAgaWYgKHR5cGVvZiB2YWwgPT09ICdzdHJpbmcnKSB7XG4gICAgdmFsID0gQnVmZmVyLmZyb20odmFsLCBlbmNvZGluZylcbiAgfVxuXG4gIGlmIChCdWZmZXIuaXNCdWZmZXIodmFsKSkge1xuICAgIC8vIHNwZWNpYWwgY2FzZTogbG9va2luZyBmb3IgZW1wdHkgc3RyaW5nL2J1ZmZlciBhbHdheXMgZmFpbHNcbiAgICBpZiAodmFsLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIC0xXG4gICAgfVxuICAgIHJldHVybiBhcnJheUluZGV4T2YodGhpcywgdmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZylcbiAgfVxuICBpZiAodHlwZW9mIHZhbCA9PT0gJ251bWJlcicpIHtcbiAgICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQgJiYgVWludDhBcnJheS5wcm90b3R5cGUuaW5kZXhPZiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcmV0dXJuIFVpbnQ4QXJyYXkucHJvdG90eXBlLmluZGV4T2YuY2FsbCh0aGlzLCB2YWwsIGJ5dGVPZmZzZXQpXG4gICAgfVxuICAgIHJldHVybiBhcnJheUluZGV4T2YodGhpcywgWyB2YWwgXSwgYnl0ZU9mZnNldCwgZW5jb2RpbmcpXG4gIH1cblxuICB0aHJvdyBuZXcgVHlwZUVycm9yKCd2YWwgbXVzdCBiZSBzdHJpbmcsIG51bWJlciBvciBCdWZmZXInKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLmluY2x1ZGVzID0gZnVuY3Rpb24gaW5jbHVkZXMgKHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcpIHtcbiAgcmV0dXJuIHRoaXMuaW5kZXhPZih2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nKSAhPT0gLTFcbn1cblxuZnVuY3Rpb24gaGV4V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICBvZmZzZXQgPSBOdW1iZXIob2Zmc2V0KSB8fCAwXG4gIHZhciByZW1haW5pbmcgPSBidWYubGVuZ3RoIC0gb2Zmc2V0XG4gIGlmICghbGVuZ3RoKSB7XG4gICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gIH0gZWxzZSB7XG4gICAgbGVuZ3RoID0gTnVtYmVyKGxlbmd0aClcbiAgICBpZiAobGVuZ3RoID4gcmVtYWluaW5nKSB7XG4gICAgICBsZW5ndGggPSByZW1haW5pbmdcbiAgICB9XG4gIH1cblxuICAvLyBtdXN0IGJlIGFuIGV2ZW4gbnVtYmVyIG9mIGRpZ2l0c1xuICB2YXIgc3RyTGVuID0gc3RyaW5nLmxlbmd0aFxuICBpZiAoc3RyTGVuICUgMiAhPT0gMCkgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGhleCBzdHJpbmcnKVxuXG4gIGlmIChsZW5ndGggPiBzdHJMZW4gLyAyKSB7XG4gICAgbGVuZ3RoID0gc3RyTGVuIC8gMlxuICB9XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgcGFyc2VkID0gcGFyc2VJbnQoc3RyaW5nLnN1YnN0cihpICogMiwgMiksIDE2KVxuICAgIGlmIChpc05hTihwYXJzZWQpKSByZXR1cm4gaVxuICAgIGJ1ZltvZmZzZXQgKyBpXSA9IHBhcnNlZFxuICB9XG4gIHJldHVybiBpXG59XG5cbmZ1bmN0aW9uIHV0ZjhXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBibGl0QnVmZmVyKHV0ZjhUb0J5dGVzKHN0cmluZywgYnVmLmxlbmd0aCAtIG9mZnNldCksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbmZ1bmN0aW9uIGFzY2lpV3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gYmxpdEJ1ZmZlcihhc2NpaVRvQnl0ZXMoc3RyaW5nKSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuZnVuY3Rpb24gYmluYXJ5V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gYXNjaWlXcml0ZShidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbmZ1bmN0aW9uIGJhc2U2NFdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGJsaXRCdWZmZXIoYmFzZTY0VG9CeXRlcyhzdHJpbmcpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5mdW5jdGlvbiB1Y3MyV3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gYmxpdEJ1ZmZlcih1dGYxNmxlVG9CeXRlcyhzdHJpbmcsIGJ1Zi5sZW5ndGggLSBvZmZzZXQpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlID0gZnVuY3Rpb24gd3JpdGUgKHN0cmluZywgb2Zmc2V0LCBsZW5ndGgsIGVuY29kaW5nKSB7XG4gIC8vIEJ1ZmZlciN3cml0ZShzdHJpbmcpXG4gIGlmIChvZmZzZXQgPT09IHVuZGVmaW5lZCkge1xuICAgIGVuY29kaW5nID0gJ3V0ZjgnXG4gICAgbGVuZ3RoID0gdGhpcy5sZW5ndGhcbiAgICBvZmZzZXQgPSAwXG4gIC8vIEJ1ZmZlciN3cml0ZShzdHJpbmcsIGVuY29kaW5nKVxuICB9IGVsc2UgaWYgKGxlbmd0aCA9PT0gdW5kZWZpbmVkICYmIHR5cGVvZiBvZmZzZXQgPT09ICdzdHJpbmcnKSB7XG4gICAgZW5jb2RpbmcgPSBvZmZzZXRcbiAgICBsZW5ndGggPSB0aGlzLmxlbmd0aFxuICAgIG9mZnNldCA9IDBcbiAgLy8gQnVmZmVyI3dyaXRlKHN0cmluZywgb2Zmc2V0WywgbGVuZ3RoXVssIGVuY29kaW5nXSlcbiAgfSBlbHNlIGlmIChpc0Zpbml0ZShvZmZzZXQpKSB7XG4gICAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICAgIGlmIChpc0Zpbml0ZShsZW5ndGgpKSB7XG4gICAgICBsZW5ndGggPSBsZW5ndGggfCAwXG4gICAgICBpZiAoZW5jb2RpbmcgPT09IHVuZGVmaW5lZCkgZW5jb2RpbmcgPSAndXRmOCdcbiAgICB9IGVsc2Uge1xuICAgICAgZW5jb2RpbmcgPSBsZW5ndGhcbiAgICAgIGxlbmd0aCA9IHVuZGVmaW5lZFxuICAgIH1cbiAgLy8gbGVnYWN5IHdyaXRlKHN0cmluZywgZW5jb2RpbmcsIG9mZnNldCwgbGVuZ3RoKSAtIHJlbW92ZSBpbiB2MC4xM1xuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICdCdWZmZXIud3JpdGUoc3RyaW5nLCBlbmNvZGluZywgb2Zmc2V0WywgbGVuZ3RoXSkgaXMgbm8gbG9uZ2VyIHN1cHBvcnRlZCdcbiAgICApXG4gIH1cblxuICB2YXIgcmVtYWluaW5nID0gdGhpcy5sZW5ndGggLSBvZmZzZXRcbiAgaWYgKGxlbmd0aCA9PT0gdW5kZWZpbmVkIHx8IGxlbmd0aCA+IHJlbWFpbmluZykgbGVuZ3RoID0gcmVtYWluaW5nXG5cbiAgaWYgKChzdHJpbmcubGVuZ3RoID4gMCAmJiAobGVuZ3RoIDwgMCB8fCBvZmZzZXQgPCAwKSkgfHwgb2Zmc2V0ID4gdGhpcy5sZW5ndGgpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignQXR0ZW1wdCB0byB3cml0ZSBvdXRzaWRlIGJ1ZmZlciBib3VuZHMnKVxuICB9XG5cbiAgaWYgKCFlbmNvZGluZykgZW5jb2RpbmcgPSAndXRmOCdcblxuICB2YXIgbG93ZXJlZENhc2UgPSBmYWxzZVxuICBmb3IgKDs7KSB7XG4gICAgc3dpdGNoIChlbmNvZGluZykge1xuICAgICAgY2FzZSAnaGV4JzpcbiAgICAgICAgcmV0dXJuIGhleFdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGNhc2UgJ3V0ZjgnOlxuICAgICAgY2FzZSAndXRmLTgnOlxuICAgICAgICByZXR1cm4gdXRmOFdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGNhc2UgJ2FzY2lpJzpcbiAgICAgICAgcmV0dXJuIGFzY2lpV3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAnYmluYXJ5JzpcbiAgICAgICAgcmV0dXJuIGJpbmFyeVdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICAgIC8vIFdhcm5pbmc6IG1heExlbmd0aCBub3QgdGFrZW4gaW50byBhY2NvdW50IGluIGJhc2U2NFdyaXRlXG4gICAgICAgIHJldHVybiBiYXNlNjRXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBjYXNlICd1Y3MyJzpcbiAgICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgICByZXR1cm4gdWNzMldyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGlmIChsb3dlcmVkQ2FzZSkgdGhyb3cgbmV3IFR5cGVFcnJvcignVW5rbm93biBlbmNvZGluZzogJyArIGVuY29kaW5nKVxuICAgICAgICBlbmNvZGluZyA9ICgnJyArIGVuY29kaW5nKS50b0xvd2VyQ2FzZSgpXG4gICAgICAgIGxvd2VyZWRDYXNlID0gdHJ1ZVxuICAgIH1cbiAgfVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uIHRvSlNPTiAoKSB7XG4gIHJldHVybiB7XG4gICAgdHlwZTogJ0J1ZmZlcicsXG4gICAgZGF0YTogQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwodGhpcy5fYXJyIHx8IHRoaXMsIDApXG4gIH1cbn1cblxuZnVuY3Rpb24gYmFzZTY0U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICBpZiAoc3RhcnQgPT09IDAgJiYgZW5kID09PSBidWYubGVuZ3RoKSB7XG4gICAgcmV0dXJuIGJhc2U2NC5mcm9tQnl0ZUFycmF5KGJ1ZilcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gYmFzZTY0LmZyb21CeXRlQXJyYXkoYnVmLnNsaWNlKHN0YXJ0LCBlbmQpKVxuICB9XG59XG5cbmZ1bmN0aW9uIHV0ZjhTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIGVuZCA9IE1hdGgubWluKGJ1Zi5sZW5ndGgsIGVuZClcbiAgdmFyIHJlcyA9IFtdXG5cbiAgdmFyIGkgPSBzdGFydFxuICB3aGlsZSAoaSA8IGVuZCkge1xuICAgIHZhciBmaXJzdEJ5dGUgPSBidWZbaV1cbiAgICB2YXIgY29kZVBvaW50ID0gbnVsbFxuICAgIHZhciBieXRlc1BlclNlcXVlbmNlID0gKGZpcnN0Qnl0ZSA+IDB4RUYpID8gNFxuICAgICAgOiAoZmlyc3RCeXRlID4gMHhERikgPyAzXG4gICAgICA6IChmaXJzdEJ5dGUgPiAweEJGKSA/IDJcbiAgICAgIDogMVxuXG4gICAgaWYgKGkgKyBieXRlc1BlclNlcXVlbmNlIDw9IGVuZCkge1xuICAgICAgdmFyIHNlY29uZEJ5dGUsIHRoaXJkQnl0ZSwgZm91cnRoQnl0ZSwgdGVtcENvZGVQb2ludFxuXG4gICAgICBzd2l0Y2ggKGJ5dGVzUGVyU2VxdWVuY2UpIHtcbiAgICAgICAgY2FzZSAxOlxuICAgICAgICAgIGlmIChmaXJzdEJ5dGUgPCAweDgwKSB7XG4gICAgICAgICAgICBjb2RlUG9pbnQgPSBmaXJzdEJ5dGVcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgY2FzZSAyOlxuICAgICAgICAgIHNlY29uZEJ5dGUgPSBidWZbaSArIDFdXG4gICAgICAgICAgaWYgKChzZWNvbmRCeXRlICYgMHhDMCkgPT09IDB4ODApIHtcbiAgICAgICAgICAgIHRlbXBDb2RlUG9pbnQgPSAoZmlyc3RCeXRlICYgMHgxRikgPDwgMHg2IHwgKHNlY29uZEJ5dGUgJiAweDNGKVxuICAgICAgICAgICAgaWYgKHRlbXBDb2RlUG9pbnQgPiAweDdGKSB7XG4gICAgICAgICAgICAgIGNvZGVQb2ludCA9IHRlbXBDb2RlUG9pbnRcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgY2FzZSAzOlxuICAgICAgICAgIHNlY29uZEJ5dGUgPSBidWZbaSArIDFdXG4gICAgICAgICAgdGhpcmRCeXRlID0gYnVmW2kgKyAyXVxuICAgICAgICAgIGlmICgoc2Vjb25kQnl0ZSAmIDB4QzApID09PSAweDgwICYmICh0aGlyZEJ5dGUgJiAweEMwKSA9PT0gMHg4MCkge1xuICAgICAgICAgICAgdGVtcENvZGVQb2ludCA9IChmaXJzdEJ5dGUgJiAweEYpIDw8IDB4QyB8IChzZWNvbmRCeXRlICYgMHgzRikgPDwgMHg2IHwgKHRoaXJkQnl0ZSAmIDB4M0YpXG4gICAgICAgICAgICBpZiAodGVtcENvZGVQb2ludCA+IDB4N0ZGICYmICh0ZW1wQ29kZVBvaW50IDwgMHhEODAwIHx8IHRlbXBDb2RlUG9pbnQgPiAweERGRkYpKSB7XG4gICAgICAgICAgICAgIGNvZGVQb2ludCA9IHRlbXBDb2RlUG9pbnRcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgY2FzZSA0OlxuICAgICAgICAgIHNlY29uZEJ5dGUgPSBidWZbaSArIDFdXG4gICAgICAgICAgdGhpcmRCeXRlID0gYnVmW2kgKyAyXVxuICAgICAgICAgIGZvdXJ0aEJ5dGUgPSBidWZbaSArIDNdXG4gICAgICAgICAgaWYgKChzZWNvbmRCeXRlICYgMHhDMCkgPT09IDB4ODAgJiYgKHRoaXJkQnl0ZSAmIDB4QzApID09PSAweDgwICYmIChmb3VydGhCeXRlICYgMHhDMCkgPT09IDB4ODApIHtcbiAgICAgICAgICAgIHRlbXBDb2RlUG9pbnQgPSAoZmlyc3RCeXRlICYgMHhGKSA8PCAweDEyIHwgKHNlY29uZEJ5dGUgJiAweDNGKSA8PCAweEMgfCAodGhpcmRCeXRlICYgMHgzRikgPDwgMHg2IHwgKGZvdXJ0aEJ5dGUgJiAweDNGKVxuICAgICAgICAgICAgaWYgKHRlbXBDb2RlUG9pbnQgPiAweEZGRkYgJiYgdGVtcENvZGVQb2ludCA8IDB4MTEwMDAwKSB7XG4gICAgICAgICAgICAgIGNvZGVQb2ludCA9IHRlbXBDb2RlUG9pbnRcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGNvZGVQb2ludCA9PT0gbnVsbCkge1xuICAgICAgLy8gd2UgZGlkIG5vdCBnZW5lcmF0ZSBhIHZhbGlkIGNvZGVQb2ludCBzbyBpbnNlcnQgYVxuICAgICAgLy8gcmVwbGFjZW1lbnQgY2hhciAoVStGRkZEKSBhbmQgYWR2YW5jZSBvbmx5IDEgYnl0ZVxuICAgICAgY29kZVBvaW50ID0gMHhGRkZEXG4gICAgICBieXRlc1BlclNlcXVlbmNlID0gMVxuICAgIH0gZWxzZSBpZiAoY29kZVBvaW50ID4gMHhGRkZGKSB7XG4gICAgICAvLyBlbmNvZGUgdG8gdXRmMTYgKHN1cnJvZ2F0ZSBwYWlyIGRhbmNlKVxuICAgICAgY29kZVBvaW50IC09IDB4MTAwMDBcbiAgICAgIHJlcy5wdXNoKGNvZGVQb2ludCA+Pj4gMTAgJiAweDNGRiB8IDB4RDgwMClcbiAgICAgIGNvZGVQb2ludCA9IDB4REMwMCB8IGNvZGVQb2ludCAmIDB4M0ZGXG4gICAgfVxuXG4gICAgcmVzLnB1c2goY29kZVBvaW50KVxuICAgIGkgKz0gYnl0ZXNQZXJTZXF1ZW5jZVxuICB9XG5cbiAgcmV0dXJuIGRlY29kZUNvZGVQb2ludHNBcnJheShyZXMpXG59XG5cbi8vIEJhc2VkIG9uIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9hLzIyNzQ3MjcyLzY4MDc0MiwgdGhlIGJyb3dzZXIgd2l0aFxuLy8gdGhlIGxvd2VzdCBsaW1pdCBpcyBDaHJvbWUsIHdpdGggMHgxMDAwMCBhcmdzLlxuLy8gV2UgZ28gMSBtYWduaXR1ZGUgbGVzcywgZm9yIHNhZmV0eVxudmFyIE1BWF9BUkdVTUVOVFNfTEVOR1RIID0gMHgxMDAwXG5cbmZ1bmN0aW9uIGRlY29kZUNvZGVQb2ludHNBcnJheSAoY29kZVBvaW50cykge1xuICB2YXIgbGVuID0gY29kZVBvaW50cy5sZW5ndGhcbiAgaWYgKGxlbiA8PSBNQVhfQVJHVU1FTlRTX0xFTkdUSCkge1xuICAgIHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlLmFwcGx5KFN0cmluZywgY29kZVBvaW50cykgLy8gYXZvaWQgZXh0cmEgc2xpY2UoKVxuICB9XG5cbiAgLy8gRGVjb2RlIGluIGNodW5rcyB0byBhdm9pZCBcImNhbGwgc3RhY2sgc2l6ZSBleGNlZWRlZFwiLlxuICB2YXIgcmVzID0gJydcbiAgdmFyIGkgPSAwXG4gIHdoaWxlIChpIDwgbGVuKSB7XG4gICAgcmVzICs9IFN0cmluZy5mcm9tQ2hhckNvZGUuYXBwbHkoXG4gICAgICBTdHJpbmcsXG4gICAgICBjb2RlUG9pbnRzLnNsaWNlKGksIGkgKz0gTUFYX0FSR1VNRU5UU19MRU5HVEgpXG4gICAgKVxuICB9XG4gIHJldHVybiByZXNcbn1cblxuZnVuY3Rpb24gYXNjaWlTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciByZXQgPSAnJ1xuICBlbmQgPSBNYXRoLm1pbihidWYubGVuZ3RoLCBlbmQpXG5cbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspIHtcbiAgICByZXQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShidWZbaV0gJiAweDdGKVxuICB9XG4gIHJldHVybiByZXRcbn1cblxuZnVuY3Rpb24gYmluYXJ5U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgcmV0ID0gJydcbiAgZW5kID0gTWF0aC5taW4oYnVmLmxlbmd0aCwgZW5kKVxuXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgcmV0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnVmW2ldKVxuICB9XG4gIHJldHVybiByZXRcbn1cblxuZnVuY3Rpb24gaGV4U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuXG4gIGlmICghc3RhcnQgfHwgc3RhcnQgPCAwKSBzdGFydCA9IDBcbiAgaWYgKCFlbmQgfHwgZW5kIDwgMCB8fCBlbmQgPiBsZW4pIGVuZCA9IGxlblxuXG4gIHZhciBvdXQgPSAnJ1xuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xuICAgIG91dCArPSB0b0hleChidWZbaV0pXG4gIH1cbiAgcmV0dXJuIG91dFxufVxuXG5mdW5jdGlvbiB1dGYxNmxlU2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgYnl0ZXMgPSBidWYuc2xpY2Uoc3RhcnQsIGVuZClcbiAgdmFyIHJlcyA9ICcnXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYnl0ZXMubGVuZ3RoOyBpICs9IDIpIHtcbiAgICByZXMgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShieXRlc1tpXSArIGJ5dGVzW2kgKyAxXSAqIDI1NilcbiAgfVxuICByZXR1cm4gcmVzXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuc2xpY2UgPSBmdW5jdGlvbiBzbGljZSAoc3RhcnQsIGVuZCkge1xuICB2YXIgbGVuID0gdGhpcy5sZW5ndGhcbiAgc3RhcnQgPSB+fnN0YXJ0XG4gIGVuZCA9IGVuZCA9PT0gdW5kZWZpbmVkID8gbGVuIDogfn5lbmRcblxuICBpZiAoc3RhcnQgPCAwKSB7XG4gICAgc3RhcnQgKz0gbGVuXG4gICAgaWYgKHN0YXJ0IDwgMCkgc3RhcnQgPSAwXG4gIH0gZWxzZSBpZiAoc3RhcnQgPiBsZW4pIHtcbiAgICBzdGFydCA9IGxlblxuICB9XG5cbiAgaWYgKGVuZCA8IDApIHtcbiAgICBlbmQgKz0gbGVuXG4gICAgaWYgKGVuZCA8IDApIGVuZCA9IDBcbiAgfSBlbHNlIGlmIChlbmQgPiBsZW4pIHtcbiAgICBlbmQgPSBsZW5cbiAgfVxuXG4gIGlmIChlbmQgPCBzdGFydCkgZW5kID0gc3RhcnRcblxuICB2YXIgbmV3QnVmXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIG5ld0J1ZiA9IHRoaXMuc3ViYXJyYXkoc3RhcnQsIGVuZClcbiAgICBuZXdCdWYuX19wcm90b19fID0gQnVmZmVyLnByb3RvdHlwZVxuICB9IGVsc2Uge1xuICAgIHZhciBzbGljZUxlbiA9IGVuZCAtIHN0YXJ0XG4gICAgbmV3QnVmID0gbmV3IEJ1ZmZlcihzbGljZUxlbiwgdW5kZWZpbmVkKVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2xpY2VMZW47IGkrKykge1xuICAgICAgbmV3QnVmW2ldID0gdGhpc1tpICsgc3RhcnRdXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG5ld0J1ZlxufVxuXG4vKlxuICogTmVlZCB0byBtYWtlIHN1cmUgdGhhdCBidWZmZXIgaXNuJ3QgdHJ5aW5nIHRvIHdyaXRlIG91dCBvZiBib3VuZHMuXG4gKi9cbmZ1bmN0aW9uIGNoZWNrT2Zmc2V0IChvZmZzZXQsIGV4dCwgbGVuZ3RoKSB7XG4gIGlmICgob2Zmc2V0ICUgMSkgIT09IDAgfHwgb2Zmc2V0IDwgMCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ29mZnNldCBpcyBub3QgdWludCcpXG4gIGlmIChvZmZzZXQgKyBleHQgPiBsZW5ndGgpIHRocm93IG5ldyBSYW5nZUVycm9yKCdUcnlpbmcgdG8gYWNjZXNzIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludExFID0gZnVuY3Rpb24gcmVhZFVJbnRMRSAob2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoIHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIGJ5dGVMZW5ndGgsIHRoaXMubGVuZ3RoKVxuXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldF1cbiAgdmFyIG11bCA9IDFcbiAgdmFyIGkgPSAwXG4gIHdoaWxlICgrK2kgPCBieXRlTGVuZ3RoICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdmFsICs9IHRoaXNbb2Zmc2V0ICsgaV0gKiBtdWxcbiAgfVxuXG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludEJFID0gZnVuY3Rpb24gcmVhZFVJbnRCRSAob2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoIHwgMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgY2hlY2tPZmZzZXQob2Zmc2V0LCBieXRlTGVuZ3RoLCB0aGlzLmxlbmd0aClcbiAgfVxuXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldCArIC0tYnl0ZUxlbmd0aF1cbiAgdmFyIG11bCA9IDFcbiAgd2hpbGUgKGJ5dGVMZW5ndGggPiAwICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdmFsICs9IHRoaXNbb2Zmc2V0ICsgLS1ieXRlTGVuZ3RoXSAqIG11bFxuICB9XG5cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50OCA9IGZ1bmN0aW9uIHJlYWRVSW50OCAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDEsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gdGhpc1tvZmZzZXRdXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQxNkxFID0gZnVuY3Rpb24gcmVhZFVJbnQxNkxFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMiwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiB0aGlzW29mZnNldF0gfCAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MTZCRSA9IGZ1bmN0aW9uIHJlYWRVSW50MTZCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDIsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSA8PCA4KSB8IHRoaXNbb2Zmc2V0ICsgMV1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDMyTEUgPSBmdW5jdGlvbiByZWFkVUludDMyTEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcblxuICByZXR1cm4gKCh0aGlzW29mZnNldF0pIHxcbiAgICAgICh0aGlzW29mZnNldCArIDFdIDw8IDgpIHxcbiAgICAgICh0aGlzW29mZnNldCArIDJdIDw8IDE2KSkgK1xuICAgICAgKHRoaXNbb2Zmc2V0ICsgM10gKiAweDEwMDAwMDApXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQzMkJFID0gZnVuY3Rpb24gcmVhZFVJbnQzMkJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICh0aGlzW29mZnNldF0gKiAweDEwMDAwMDApICtcbiAgICAoKHRoaXNbb2Zmc2V0ICsgMV0gPDwgMTYpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCA4KSB8XG4gICAgdGhpc1tvZmZzZXQgKyAzXSlcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50TEUgPSBmdW5jdGlvbiByZWFkSW50TEUgKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCBieXRlTGVuZ3RoLCB0aGlzLmxlbmd0aClcblxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXRdXG4gIHZhciBtdWwgPSAxXG4gIHZhciBpID0gMFxuICB3aGlsZSAoKytpIDwgYnl0ZUxlbmd0aCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHZhbCArPSB0aGlzW29mZnNldCArIGldICogbXVsXG4gIH1cbiAgbXVsICo9IDB4ODBcblxuICBpZiAodmFsID49IG11bCkgdmFsIC09IE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoKVxuXG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50QkUgPSBmdW5jdGlvbiByZWFkSW50QkUgKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCBieXRlTGVuZ3RoLCB0aGlzLmxlbmd0aClcblxuICB2YXIgaSA9IGJ5dGVMZW5ndGhcbiAgdmFyIG11bCA9IDFcbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0ICsgLS1pXVxuICB3aGlsZSAoaSA+IDAgJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB2YWwgKz0gdGhpc1tvZmZzZXQgKyAtLWldICogbXVsXG4gIH1cbiAgbXVsICo9IDB4ODBcblxuICBpZiAodmFsID49IG11bCkgdmFsIC09IE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoKVxuXG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50OCA9IGZ1bmN0aW9uIHJlYWRJbnQ4IChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMSwgdGhpcy5sZW5ndGgpXG4gIGlmICghKHRoaXNbb2Zmc2V0XSAmIDB4ODApKSByZXR1cm4gKHRoaXNbb2Zmc2V0XSlcbiAgcmV0dXJuICgoMHhmZiAtIHRoaXNbb2Zmc2V0XSArIDEpICogLTEpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDE2TEUgPSBmdW5jdGlvbiByZWFkSW50MTZMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDIsIHRoaXMubGVuZ3RoKVxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXRdIHwgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgOClcbiAgcmV0dXJuICh2YWwgJiAweDgwMDApID8gdmFsIHwgMHhGRkZGMDAwMCA6IHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQxNkJFID0gZnVuY3Rpb24gcmVhZEludDE2QkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAyLCB0aGlzLmxlbmd0aClcbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0ICsgMV0gfCAodGhpc1tvZmZzZXRdIDw8IDgpXG4gIHJldHVybiAodmFsICYgMHg4MDAwKSA/IHZhbCB8IDB4RkZGRjAwMDAgOiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MzJMRSA9IGZ1bmN0aW9uIHJlYWRJbnQzMkxFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICh0aGlzW29mZnNldF0pIHxcbiAgICAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMl0gPDwgMTYpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAzXSA8PCAyNClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MzJCRSA9IGZ1bmN0aW9uIHJlYWRJbnQzMkJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICh0aGlzW29mZnNldF0gPDwgMjQpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAxXSA8PCAxNikgfFxuICAgICh0aGlzW29mZnNldCArIDJdIDw8IDgpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAzXSlcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRmxvYXRMRSA9IGZ1bmN0aW9uIHJlYWRGbG9hdExFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiBpZWVlNzU0LnJlYWQodGhpcywgb2Zmc2V0LCB0cnVlLCAyMywgNClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRmxvYXRCRSA9IGZ1bmN0aW9uIHJlYWRGbG9hdEJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiBpZWVlNzU0LnJlYWQodGhpcywgb2Zmc2V0LCBmYWxzZSwgMjMsIDQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZERvdWJsZUxFID0gZnVuY3Rpb24gcmVhZERvdWJsZUxFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgOCwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiBpZWVlNzU0LnJlYWQodGhpcywgb2Zmc2V0LCB0cnVlLCA1MiwgOClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRG91YmxlQkUgPSBmdW5jdGlvbiByZWFkRG91YmxlQkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA4LCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIGllZWU3NTQucmVhZCh0aGlzLCBvZmZzZXQsIGZhbHNlLCA1MiwgOClcbn1cblxuZnVuY3Rpb24gY2hlY2tJbnQgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgZXh0LCBtYXgsIG1pbikge1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihidWYpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdcImJ1ZmZlclwiIGFyZ3VtZW50IG11c3QgYmUgYSBCdWZmZXIgaW5zdGFuY2UnKVxuICBpZiAodmFsdWUgPiBtYXggfHwgdmFsdWUgPCBtaW4pIHRocm93IG5ldyBSYW5nZUVycm9yKCdcInZhbHVlXCIgYXJndW1lbnQgaXMgb3V0IG9mIGJvdW5kcycpXG4gIGlmIChvZmZzZXQgKyBleHQgPiBidWYubGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignSW5kZXggb3V0IG9mIHJhbmdlJylcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnRMRSA9IGZ1bmN0aW9uIHdyaXRlVUludExFICh2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoIHwgMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgdmFyIG1heEJ5dGVzID0gTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGgpIC0gMVxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG1heEJ5dGVzLCAwKVxuICB9XG5cbiAgdmFyIG11bCA9IDFcbiAgdmFyIGkgPSAwXG4gIHRoaXNbb2Zmc2V0XSA9IHZhbHVlICYgMHhGRlxuICB3aGlsZSAoKytpIDwgYnl0ZUxlbmd0aCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHRoaXNbb2Zmc2V0ICsgaV0gPSAodmFsdWUgLyBtdWwpICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIG9mZnNldCArIGJ5dGVMZW5ndGhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnRCRSA9IGZ1bmN0aW9uIHdyaXRlVUludEJFICh2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoIHwgMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgdmFyIG1heEJ5dGVzID0gTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGgpIC0gMVxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG1heEJ5dGVzLCAwKVxuICB9XG5cbiAgdmFyIGkgPSBieXRlTGVuZ3RoIC0gMVxuICB2YXIgbXVsID0gMVxuICB0aGlzW29mZnNldCArIGldID0gdmFsdWUgJiAweEZGXG4gIHdoaWxlICgtLWkgPj0gMCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHRoaXNbb2Zmc2V0ICsgaV0gPSAodmFsdWUgLyBtdWwpICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIG9mZnNldCArIGJ5dGVMZW5ndGhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQ4ID0gZnVuY3Rpb24gd3JpdGVVSW50OCAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAxLCAweGZmLCAwKVxuICBpZiAoIUJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB2YWx1ZSA9IE1hdGguZmxvb3IodmFsdWUpXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyAxXG59XG5cbmZ1bmN0aW9uIG9iamVjdFdyaXRlVUludDE2IChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbikge1xuICBpZiAodmFsdWUgPCAwKSB2YWx1ZSA9IDB4ZmZmZiArIHZhbHVlICsgMVxuICBmb3IgKHZhciBpID0gMCwgaiA9IE1hdGgubWluKGJ1Zi5sZW5ndGggLSBvZmZzZXQsIDIpOyBpIDwgajsgaSsrKSB7XG4gICAgYnVmW29mZnNldCArIGldID0gKHZhbHVlICYgKDB4ZmYgPDwgKDggKiAobGl0dGxlRW5kaWFuID8gaSA6IDEgLSBpKSkpKSA+Pj5cbiAgICAgIChsaXR0bGVFbmRpYW4gPyBpIDogMSAtIGkpICogOFxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MTZMRSA9IGZ1bmN0aW9uIHdyaXRlVUludDE2TEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHhmZmZmLCAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSAodmFsdWUgJiAweGZmKVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gIH0gZWxzZSB7XG4gICAgb2JqZWN0V3JpdGVVSW50MTYodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSlcbiAgfVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDE2QkUgPSBmdW5jdGlvbiB3cml0ZVVJbnQxNkJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDIsIDB4ZmZmZiwgMClcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiA4KVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgJiAweGZmKVxuICB9IGVsc2Uge1xuICAgIG9iamVjdFdyaXRlVUludDE2KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlKVxuICB9XG4gIHJldHVybiBvZmZzZXQgKyAyXG59XG5cbmZ1bmN0aW9uIG9iamVjdFdyaXRlVUludDMyIChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbikge1xuICBpZiAodmFsdWUgPCAwKSB2YWx1ZSA9IDB4ZmZmZmZmZmYgKyB2YWx1ZSArIDFcbiAgZm9yICh2YXIgaSA9IDAsIGogPSBNYXRoLm1pbihidWYubGVuZ3RoIC0gb2Zmc2V0LCA0KTsgaSA8IGo7IGkrKykge1xuICAgIGJ1ZltvZmZzZXQgKyBpXSA9ICh2YWx1ZSA+Pj4gKGxpdHRsZUVuZGlhbiA/IGkgOiAzIC0gaSkgKiA4KSAmIDB4ZmZcbiAgfVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDMyTEUgPSBmdW5jdGlvbiB3cml0ZVVJbnQzMkxFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDQsIDB4ZmZmZmZmZmYsIDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0ICsgM10gPSAodmFsdWUgPj4+IDI0KVxuICAgIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDE2KVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gICAgdGhpc1tvZmZzZXRdID0gKHZhbHVlICYgMHhmZilcbiAgfSBlbHNlIHtcbiAgICBvYmplY3RXcml0ZVVJbnQzMih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlKVxuICB9XG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MzJCRSA9IGZ1bmN0aW9uIHdyaXRlVUludDMyQkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgNCwgMHhmZmZmZmZmZiwgMClcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiAyNClcbiAgICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiAxNilcbiAgICB0aGlzW29mZnNldCArIDJdID0gKHZhbHVlID4+PiA4KVxuICAgIHRoaXNbb2Zmc2V0ICsgM10gPSAodmFsdWUgJiAweGZmKVxuICB9IGVsc2Uge1xuICAgIG9iamVjdFdyaXRlVUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlKVxuICB9XG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnRMRSA9IGZ1bmN0aW9uIHdyaXRlSW50TEUgKHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIHZhciBsaW1pdCA9IE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoIC0gMSlcblxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIGxpbWl0IC0gMSwgLWxpbWl0KVxuICB9XG5cbiAgdmFyIGkgPSAwXG4gIHZhciBtdWwgPSAxXG4gIHZhciBzdWIgPSAwXG4gIHRoaXNbb2Zmc2V0XSA9IHZhbHVlICYgMHhGRlxuICB3aGlsZSAoKytpIDwgYnl0ZUxlbmd0aCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIGlmICh2YWx1ZSA8IDAgJiYgc3ViID09PSAwICYmIHRoaXNbb2Zmc2V0ICsgaSAtIDFdICE9PSAwKSB7XG4gICAgICBzdWIgPSAxXG4gICAgfVxuICAgIHRoaXNbb2Zmc2V0ICsgaV0gPSAoKHZhbHVlIC8gbXVsKSA+PiAwKSAtIHN1YiAmIDB4RkZcbiAgfVxuXG4gIHJldHVybiBvZmZzZXQgKyBieXRlTGVuZ3RoXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnRCRSA9IGZ1bmN0aW9uIHdyaXRlSW50QkUgKHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIHZhciBsaW1pdCA9IE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoIC0gMSlcblxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIGxpbWl0IC0gMSwgLWxpbWl0KVxuICB9XG5cbiAgdmFyIGkgPSBieXRlTGVuZ3RoIC0gMVxuICB2YXIgbXVsID0gMVxuICB2YXIgc3ViID0gMFxuICB0aGlzW29mZnNldCArIGldID0gdmFsdWUgJiAweEZGXG4gIHdoaWxlICgtLWkgPj0gMCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIGlmICh2YWx1ZSA8IDAgJiYgc3ViID09PSAwICYmIHRoaXNbb2Zmc2V0ICsgaSArIDFdICE9PSAwKSB7XG4gICAgICBzdWIgPSAxXG4gICAgfVxuICAgIHRoaXNbb2Zmc2V0ICsgaV0gPSAoKHZhbHVlIC8gbXVsKSA+PiAwKSAtIHN1YiAmIDB4RkZcbiAgfVxuXG4gIHJldHVybiBvZmZzZXQgKyBieXRlTGVuZ3RoXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQ4ID0gZnVuY3Rpb24gd3JpdGVJbnQ4ICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDEsIDB4N2YsIC0weDgwKVxuICBpZiAoIUJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB2YWx1ZSA9IE1hdGguZmxvb3IodmFsdWUpXG4gIGlmICh2YWx1ZSA8IDApIHZhbHVlID0gMHhmZiArIHZhbHVlICsgMVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgJiAweGZmKVxuICByZXR1cm4gb2Zmc2V0ICsgMVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MTZMRSA9IGZ1bmN0aW9uIHdyaXRlSW50MTZMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweDdmZmYsIC0weDgwMDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gOClcbiAgfSBlbHNlIHtcbiAgICBvYmplY3RXcml0ZVVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlKVxuICB9XG4gIHJldHVybiBvZmZzZXQgKyAyXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQxNkJFID0gZnVuY3Rpb24gd3JpdGVJbnQxNkJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDIsIDB4N2ZmZiwgLTB4ODAwMClcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiA4KVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgJiAweGZmKVxuICB9IGVsc2Uge1xuICAgIG9iamVjdFdyaXRlVUludDE2KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlKVxuICB9XG4gIHJldHVybiBvZmZzZXQgKyAyXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQzMkxFID0gZnVuY3Rpb24gd3JpdGVJbnQzMkxFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDQsIDB4N2ZmZmZmZmYsIC0weDgwMDAwMDAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSAodmFsdWUgJiAweGZmKVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gICAgdGhpc1tvZmZzZXQgKyAyXSA9ICh2YWx1ZSA+Pj4gMTYpXG4gICAgdGhpc1tvZmZzZXQgKyAzXSA9ICh2YWx1ZSA+Pj4gMjQpXG4gIH0gZWxzZSB7XG4gICAgb2JqZWN0V3JpdGVVSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSlcbiAgfVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MzJCRSA9IGZ1bmN0aW9uIHdyaXRlSW50MzJCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweDdmZmZmZmZmLCAtMHg4MDAwMDAwMClcbiAgaWYgKHZhbHVlIDwgMCkgdmFsdWUgPSAweGZmZmZmZmZmICsgdmFsdWUgKyAxXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSA+Pj4gMjQpXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gMTYpXG4gICAgdGhpc1tvZmZzZXQgKyAyXSA9ICh2YWx1ZSA+Pj4gOClcbiAgICB0aGlzW29mZnNldCArIDNdID0gKHZhbHVlICYgMHhmZilcbiAgfSBlbHNlIHtcbiAgICBvYmplY3RXcml0ZVVJbnQzMih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSlcbiAgfVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5mdW5jdGlvbiBjaGVja0lFRUU3NTQgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgZXh0LCBtYXgsIG1pbikge1xuICBpZiAob2Zmc2V0ICsgZXh0ID4gYnVmLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0luZGV4IG91dCBvZiByYW5nZScpXG4gIGlmIChvZmZzZXQgPCAwKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignSW5kZXggb3V0IG9mIHJhbmdlJylcbn1cblxuZnVuY3Rpb24gd3JpdGVGbG9hdCAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBjaGVja0lFRUU3NTQoYnVmLCB2YWx1ZSwgb2Zmc2V0LCA0LCAzLjQwMjgyMzQ2NjM4NTI4ODZlKzM4LCAtMy40MDI4MjM0NjYzODUyODg2ZSszOClcbiAgfVxuICBpZWVlNzU0LndyaXRlKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCAyMywgNClcbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUZsb2F0TEUgPSBmdW5jdGlvbiB3cml0ZUZsb2F0TEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZUZsb2F0KHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRmxvYXRCRSA9IGZ1bmN0aW9uIHdyaXRlRmxvYXRCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHdyaXRlRmxvYXQodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiB3cml0ZURvdWJsZSAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBjaGVja0lFRUU3NTQoYnVmLCB2YWx1ZSwgb2Zmc2V0LCA4LCAxLjc5NzY5MzEzNDg2MjMxNTdFKzMwOCwgLTEuNzk3NjkzMTM0ODYyMzE1N0UrMzA4KVxuICB9XG4gIGllZWU3NTQud3JpdGUoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIDUyLCA4KVxuICByZXR1cm4gb2Zmc2V0ICsgOFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRG91YmxlTEUgPSBmdW5jdGlvbiB3cml0ZURvdWJsZUxFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVEb3VibGUodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVEb3VibGVCRSA9IGZ1bmN0aW9uIHdyaXRlRG91YmxlQkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZURvdWJsZSh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbi8vIGNvcHkodGFyZ2V0QnVmZmVyLCB0YXJnZXRTdGFydD0wLCBzb3VyY2VTdGFydD0wLCBzb3VyY2VFbmQ9YnVmZmVyLmxlbmd0aClcbkJ1ZmZlci5wcm90b3R5cGUuY29weSA9IGZ1bmN0aW9uIGNvcHkgKHRhcmdldCwgdGFyZ2V0U3RhcnQsIHN0YXJ0LCBlbmQpIHtcbiAgaWYgKCFzdGFydCkgc3RhcnQgPSAwXG4gIGlmICghZW5kICYmIGVuZCAhPT0gMCkgZW5kID0gdGhpcy5sZW5ndGhcbiAgaWYgKHRhcmdldFN0YXJ0ID49IHRhcmdldC5sZW5ndGgpIHRhcmdldFN0YXJ0ID0gdGFyZ2V0Lmxlbmd0aFxuICBpZiAoIXRhcmdldFN0YXJ0KSB0YXJnZXRTdGFydCA9IDBcbiAgaWYgKGVuZCA+IDAgJiYgZW5kIDwgc3RhcnQpIGVuZCA9IHN0YXJ0XG5cbiAgLy8gQ29weSAwIGJ5dGVzOyB3ZSdyZSBkb25lXG4gIGlmIChlbmQgPT09IHN0YXJ0KSByZXR1cm4gMFxuICBpZiAodGFyZ2V0Lmxlbmd0aCA9PT0gMCB8fCB0aGlzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIDBcblxuICAvLyBGYXRhbCBlcnJvciBjb25kaXRpb25zXG4gIGlmICh0YXJnZXRTdGFydCA8IDApIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcigndGFyZ2V0U3RhcnQgb3V0IG9mIGJvdW5kcycpXG4gIH1cbiAgaWYgKHN0YXJ0IDwgMCB8fCBzdGFydCA+PSB0aGlzLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ3NvdXJjZVN0YXJ0IG91dCBvZiBib3VuZHMnKVxuICBpZiAoZW5kIDwgMCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ3NvdXJjZUVuZCBvdXQgb2YgYm91bmRzJylcblxuICAvLyBBcmUgd2Ugb29iP1xuICBpZiAoZW5kID4gdGhpcy5sZW5ndGgpIGVuZCA9IHRoaXMubGVuZ3RoXG4gIGlmICh0YXJnZXQubGVuZ3RoIC0gdGFyZ2V0U3RhcnQgPCBlbmQgLSBzdGFydCkge1xuICAgIGVuZCA9IHRhcmdldC5sZW5ndGggLSB0YXJnZXRTdGFydCArIHN0YXJ0XG4gIH1cblxuICB2YXIgbGVuID0gZW5kIC0gc3RhcnRcbiAgdmFyIGlcblxuICBpZiAodGhpcyA9PT0gdGFyZ2V0ICYmIHN0YXJ0IDwgdGFyZ2V0U3RhcnQgJiYgdGFyZ2V0U3RhcnQgPCBlbmQpIHtcbiAgICAvLyBkZXNjZW5kaW5nIGNvcHkgZnJvbSBlbmRcbiAgICBmb3IgKGkgPSBsZW4gLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgdGFyZ2V0W2kgKyB0YXJnZXRTdGFydF0gPSB0aGlzW2kgKyBzdGFydF1cbiAgICB9XG4gIH0gZWxzZSBpZiAobGVuIDwgMTAwMCB8fCAhQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICAvLyBhc2NlbmRpbmcgY29weSBmcm9tIHN0YXJ0XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICB0YXJnZXRbaSArIHRhcmdldFN0YXJ0XSA9IHRoaXNbaSArIHN0YXJ0XVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBVaW50OEFycmF5LnByb3RvdHlwZS5zZXQuY2FsbChcbiAgICAgIHRhcmdldCxcbiAgICAgIHRoaXMuc3ViYXJyYXkoc3RhcnQsIHN0YXJ0ICsgbGVuKSxcbiAgICAgIHRhcmdldFN0YXJ0XG4gICAgKVxuICB9XG5cbiAgcmV0dXJuIGxlblxufVxuXG4vLyBVc2FnZTpcbi8vICAgIGJ1ZmZlci5maWxsKG51bWJlclssIG9mZnNldFssIGVuZF1dKVxuLy8gICAgYnVmZmVyLmZpbGwoYnVmZmVyWywgb2Zmc2V0WywgZW5kXV0pXG4vLyAgICBidWZmZXIuZmlsbChzdHJpbmdbLCBvZmZzZXRbLCBlbmRdXVssIGVuY29kaW5nXSlcbkJ1ZmZlci5wcm90b3R5cGUuZmlsbCA9IGZ1bmN0aW9uIGZpbGwgKHZhbCwgc3RhcnQsIGVuZCwgZW5jb2RpbmcpIHtcbiAgLy8gSGFuZGxlIHN0cmluZyBjYXNlczpcbiAgaWYgKHR5cGVvZiB2YWwgPT09ICdzdHJpbmcnKSB7XG4gICAgaWYgKHR5cGVvZiBzdGFydCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGVuY29kaW5nID0gc3RhcnRcbiAgICAgIHN0YXJ0ID0gMFxuICAgICAgZW5kID0gdGhpcy5sZW5ndGhcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBlbmQgPT09ICdzdHJpbmcnKSB7XG4gICAgICBlbmNvZGluZyA9IGVuZFxuICAgICAgZW5kID0gdGhpcy5sZW5ndGhcbiAgICB9XG4gICAgaWYgKHZhbC5sZW5ndGggPT09IDEpIHtcbiAgICAgIHZhciBjb2RlID0gdmFsLmNoYXJDb2RlQXQoMClcbiAgICAgIGlmIChjb2RlIDwgMjU2KSB7XG4gICAgICAgIHZhbCA9IGNvZGVcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGVuY29kaW5nICE9PSB1bmRlZmluZWQgJiYgdHlwZW9mIGVuY29kaW5nICE9PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignZW5jb2RpbmcgbXVzdCBiZSBhIHN0cmluZycpXG4gICAgfVxuICAgIGlmICh0eXBlb2YgZW5jb2RpbmcgPT09ICdzdHJpbmcnICYmICFCdWZmZXIuaXNFbmNvZGluZyhlbmNvZGluZykpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1Vua25vd24gZW5jb2Rpbmc6ICcgKyBlbmNvZGluZylcbiAgICB9XG4gIH0gZWxzZSBpZiAodHlwZW9mIHZhbCA9PT0gJ251bWJlcicpIHtcbiAgICB2YWwgPSB2YWwgJiAyNTVcbiAgfVxuXG4gIC8vIEludmFsaWQgcmFuZ2VzIGFyZSBub3Qgc2V0IHRvIGEgZGVmYXVsdCwgc28gY2FuIHJhbmdlIGNoZWNrIGVhcmx5LlxuICBpZiAoc3RhcnQgPCAwIHx8IHRoaXMubGVuZ3RoIDwgc3RhcnQgfHwgdGhpcy5sZW5ndGggPCBlbmQpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignT3V0IG9mIHJhbmdlIGluZGV4JylcbiAgfVxuXG4gIGlmIChlbmQgPD0gc3RhcnQpIHtcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgc3RhcnQgPSBzdGFydCA+Pj4gMFxuICBlbmQgPSBlbmQgPT09IHVuZGVmaW5lZCA/IHRoaXMubGVuZ3RoIDogZW5kID4+PiAwXG5cbiAgaWYgKCF2YWwpIHZhbCA9IDBcblxuICB2YXIgaVxuICBpZiAodHlwZW9mIHZhbCA9PT0gJ251bWJlcicpIHtcbiAgICBmb3IgKGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgICB0aGlzW2ldID0gdmFsXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHZhciBieXRlcyA9IEJ1ZmZlci5pc0J1ZmZlcih2YWwpXG4gICAgICA/IHZhbFxuICAgICAgOiB1dGY4VG9CeXRlcyhuZXcgQnVmZmVyKHZhbCwgZW5jb2RpbmcpLnRvU3RyaW5nKCkpXG4gICAgdmFyIGxlbiA9IGJ5dGVzLmxlbmd0aFxuICAgIGZvciAoaSA9IDA7IGkgPCBlbmQgLSBzdGFydDsgaSsrKSB7XG4gICAgICB0aGlzW2kgKyBzdGFydF0gPSBieXRlc1tpICUgbGVuXVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzXG59XG5cbi8vIEhFTFBFUiBGVU5DVElPTlNcbi8vID09PT09PT09PT09PT09PT1cblxudmFyIElOVkFMSURfQkFTRTY0X1JFID0gL1teK1xcLzAtOUEtWmEtei1fXS9nXG5cbmZ1bmN0aW9uIGJhc2U2NGNsZWFuIChzdHIpIHtcbiAgLy8gTm9kZSBzdHJpcHMgb3V0IGludmFsaWQgY2hhcmFjdGVycyBsaWtlIFxcbiBhbmQgXFx0IGZyb20gdGhlIHN0cmluZywgYmFzZTY0LWpzIGRvZXMgbm90XG4gIHN0ciA9IHN0cmluZ3RyaW0oc3RyKS5yZXBsYWNlKElOVkFMSURfQkFTRTY0X1JFLCAnJylcbiAgLy8gTm9kZSBjb252ZXJ0cyBzdHJpbmdzIHdpdGggbGVuZ3RoIDwgMiB0byAnJ1xuICBpZiAoc3RyLmxlbmd0aCA8IDIpIHJldHVybiAnJ1xuICAvLyBOb2RlIGFsbG93cyBmb3Igbm9uLXBhZGRlZCBiYXNlNjQgc3RyaW5ncyAobWlzc2luZyB0cmFpbGluZyA9PT0pLCBiYXNlNjQtanMgZG9lcyBub3RcbiAgd2hpbGUgKHN0ci5sZW5ndGggJSA0ICE9PSAwKSB7XG4gICAgc3RyID0gc3RyICsgJz0nXG4gIH1cbiAgcmV0dXJuIHN0clxufVxuXG5mdW5jdGlvbiBzdHJpbmd0cmltIChzdHIpIHtcbiAgaWYgKHN0ci50cmltKSByZXR1cm4gc3RyLnRyaW0oKVxuICByZXR1cm4gc3RyLnJlcGxhY2UoL15cXHMrfFxccyskL2csICcnKVxufVxuXG5mdW5jdGlvbiB0b0hleCAobikge1xuICBpZiAobiA8IDE2KSByZXR1cm4gJzAnICsgbi50b1N0cmluZygxNilcbiAgcmV0dXJuIG4udG9TdHJpbmcoMTYpXG59XG5cbmZ1bmN0aW9uIHV0ZjhUb0J5dGVzIChzdHJpbmcsIHVuaXRzKSB7XG4gIHVuaXRzID0gdW5pdHMgfHwgSW5maW5pdHlcbiAgdmFyIGNvZGVQb2ludFxuICB2YXIgbGVuZ3RoID0gc3RyaW5nLmxlbmd0aFxuICB2YXIgbGVhZFN1cnJvZ2F0ZSA9IG51bGxcbiAgdmFyIGJ5dGVzID0gW11cblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgY29kZVBvaW50ID0gc3RyaW5nLmNoYXJDb2RlQXQoaSlcblxuICAgIC8vIGlzIHN1cnJvZ2F0ZSBjb21wb25lbnRcbiAgICBpZiAoY29kZVBvaW50ID4gMHhEN0ZGICYmIGNvZGVQb2ludCA8IDB4RTAwMCkge1xuICAgICAgLy8gbGFzdCBjaGFyIHdhcyBhIGxlYWRcbiAgICAgIGlmICghbGVhZFN1cnJvZ2F0ZSkge1xuICAgICAgICAvLyBubyBsZWFkIHlldFxuICAgICAgICBpZiAoY29kZVBvaW50ID4gMHhEQkZGKSB7XG4gICAgICAgICAgLy8gdW5leHBlY3RlZCB0cmFpbFxuICAgICAgICAgIGlmICgodW5pdHMgLT0gMykgPiAtMSkgYnl0ZXMucHVzaCgweEVGLCAweEJGLCAweEJEKVxuICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIH0gZWxzZSBpZiAoaSArIDEgPT09IGxlbmd0aCkge1xuICAgICAgICAgIC8vIHVucGFpcmVkIGxlYWRcbiAgICAgICAgICBpZiAoKHVuaXRzIC09IDMpID4gLTEpIGJ5dGVzLnB1c2goMHhFRiwgMHhCRiwgMHhCRClcbiAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gdmFsaWQgbGVhZFxuICAgICAgICBsZWFkU3Vycm9nYXRlID0gY29kZVBvaW50XG5cbiAgICAgICAgY29udGludWVcbiAgICAgIH1cblxuICAgICAgLy8gMiBsZWFkcyBpbiBhIHJvd1xuICAgICAgaWYgKGNvZGVQb2ludCA8IDB4REMwMCkge1xuICAgICAgICBpZiAoKHVuaXRzIC09IDMpID4gLTEpIGJ5dGVzLnB1c2goMHhFRiwgMHhCRiwgMHhCRClcbiAgICAgICAgbGVhZFN1cnJvZ2F0ZSA9IGNvZGVQb2ludFxuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuXG4gICAgICAvLyB2YWxpZCBzdXJyb2dhdGUgcGFpclxuICAgICAgY29kZVBvaW50ID0gKGxlYWRTdXJyb2dhdGUgLSAweEQ4MDAgPDwgMTAgfCBjb2RlUG9pbnQgLSAweERDMDApICsgMHgxMDAwMFxuICAgIH0gZWxzZSBpZiAobGVhZFN1cnJvZ2F0ZSkge1xuICAgICAgLy8gdmFsaWQgYm1wIGNoYXIsIGJ1dCBsYXN0IGNoYXIgd2FzIGEgbGVhZFxuICAgICAgaWYgKCh1bml0cyAtPSAzKSA+IC0xKSBieXRlcy5wdXNoKDB4RUYsIDB4QkYsIDB4QkQpXG4gICAgfVxuXG4gICAgbGVhZFN1cnJvZ2F0ZSA9IG51bGxcblxuICAgIC8vIGVuY29kZSB1dGY4XG4gICAgaWYgKGNvZGVQb2ludCA8IDB4ODApIHtcbiAgICAgIGlmICgodW5pdHMgLT0gMSkgPCAwKSBicmVha1xuICAgICAgYnl0ZXMucHVzaChjb2RlUG9pbnQpXG4gICAgfSBlbHNlIGlmIChjb2RlUG9pbnQgPCAweDgwMCkge1xuICAgICAgaWYgKCh1bml0cyAtPSAyKSA8IDApIGJyZWFrXG4gICAgICBieXRlcy5wdXNoKFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHg2IHwgMHhDMCxcbiAgICAgICAgY29kZVBvaW50ICYgMHgzRiB8IDB4ODBcbiAgICAgIClcbiAgICB9IGVsc2UgaWYgKGNvZGVQb2ludCA8IDB4MTAwMDApIHtcbiAgICAgIGlmICgodW5pdHMgLT0gMykgPCAwKSBicmVha1xuICAgICAgYnl0ZXMucHVzaChcbiAgICAgICAgY29kZVBvaW50ID4+IDB4QyB8IDB4RTAsXG4gICAgICAgIGNvZGVQb2ludCA+PiAweDYgJiAweDNGIHwgMHg4MCxcbiAgICAgICAgY29kZVBvaW50ICYgMHgzRiB8IDB4ODBcbiAgICAgIClcbiAgICB9IGVsc2UgaWYgKGNvZGVQb2ludCA8IDB4MTEwMDAwKSB7XG4gICAgICBpZiAoKHVuaXRzIC09IDQpIDwgMCkgYnJlYWtcbiAgICAgIGJ5dGVzLnB1c2goXG4gICAgICAgIGNvZGVQb2ludCA+PiAweDEyIHwgMHhGMCxcbiAgICAgICAgY29kZVBvaW50ID4+IDB4QyAmIDB4M0YgfCAweDgwLFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHg2ICYgMHgzRiB8IDB4ODAsXG4gICAgICAgIGNvZGVQb2ludCAmIDB4M0YgfCAweDgwXG4gICAgICApXG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBjb2RlIHBvaW50JylcbiAgICB9XG4gIH1cblxuICByZXR1cm4gYnl0ZXNcbn1cblxuZnVuY3Rpb24gYXNjaWlUb0J5dGVzIChzdHIpIHtcbiAgdmFyIGJ5dGVBcnJheSA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgaSsrKSB7XG4gICAgLy8gTm9kZSdzIGNvZGUgc2VlbXMgdG8gYmUgZG9pbmcgdGhpcyBhbmQgbm90ICYgMHg3Ri4uXG4gICAgYnl0ZUFycmF5LnB1c2goc3RyLmNoYXJDb2RlQXQoaSkgJiAweEZGKVxuICB9XG4gIHJldHVybiBieXRlQXJyYXlcbn1cblxuZnVuY3Rpb24gdXRmMTZsZVRvQnl0ZXMgKHN0ciwgdW5pdHMpIHtcbiAgdmFyIGMsIGhpLCBsb1xuICB2YXIgYnl0ZUFycmF5ID0gW11cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoKHVuaXRzIC09IDIpIDwgMCkgYnJlYWtcblxuICAgIGMgPSBzdHIuY2hhckNvZGVBdChpKVxuICAgIGhpID0gYyA+PiA4XG4gICAgbG8gPSBjICUgMjU2XG4gICAgYnl0ZUFycmF5LnB1c2gobG8pXG4gICAgYnl0ZUFycmF5LnB1c2goaGkpXG4gIH1cblxuICByZXR1cm4gYnl0ZUFycmF5XG59XG5cbmZ1bmN0aW9uIGJhc2U2NFRvQnl0ZXMgKHN0cikge1xuICByZXR1cm4gYmFzZTY0LnRvQnl0ZUFycmF5KGJhc2U2NGNsZWFuKHN0cikpXG59XG5cbmZ1bmN0aW9uIGJsaXRCdWZmZXIgKHNyYywgZHN0LCBvZmZzZXQsIGxlbmd0aCkge1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKChpICsgb2Zmc2V0ID49IGRzdC5sZW5ndGgpIHx8IChpID49IHNyYy5sZW5ndGgpKSBicmVha1xuICAgIGRzdFtpICsgb2Zmc2V0XSA9IHNyY1tpXVxuICB9XG4gIHJldHVybiBpXG59XG5cbmZ1bmN0aW9uIGlzbmFuICh2YWwpIHtcbiAgcmV0dXJuIHZhbCAhPT0gdmFsIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tc2VsZi1jb21wYXJlXG59XG4iLCJleHBvcnRzLnJlYWQgPSBmdW5jdGlvbiAoYnVmZmVyLCBvZmZzZXQsIGlzTEUsIG1MZW4sIG5CeXRlcykge1xuICB2YXIgZSwgbVxuICB2YXIgZUxlbiA9IG5CeXRlcyAqIDggLSBtTGVuIC0gMVxuICB2YXIgZU1heCA9ICgxIDw8IGVMZW4pIC0gMVxuICB2YXIgZUJpYXMgPSBlTWF4ID4+IDFcbiAgdmFyIG5CaXRzID0gLTdcbiAgdmFyIGkgPSBpc0xFID8gKG5CeXRlcyAtIDEpIDogMFxuICB2YXIgZCA9IGlzTEUgPyAtMSA6IDFcbiAgdmFyIHMgPSBidWZmZXJbb2Zmc2V0ICsgaV1cblxuICBpICs9IGRcblxuICBlID0gcyAmICgoMSA8PCAoLW5CaXRzKSkgLSAxKVxuICBzID4+PSAoLW5CaXRzKVxuICBuQml0cyArPSBlTGVuXG4gIGZvciAoOyBuQml0cyA+IDA7IGUgPSBlICogMjU2ICsgYnVmZmVyW29mZnNldCArIGldLCBpICs9IGQsIG5CaXRzIC09IDgpIHt9XG5cbiAgbSA9IGUgJiAoKDEgPDwgKC1uQml0cykpIC0gMSlcbiAgZSA+Pj0gKC1uQml0cylcbiAgbkJpdHMgKz0gbUxlblxuICBmb3IgKDsgbkJpdHMgPiAwOyBtID0gbSAqIDI1NiArIGJ1ZmZlcltvZmZzZXQgKyBpXSwgaSArPSBkLCBuQml0cyAtPSA4KSB7fVxuXG4gIGlmIChlID09PSAwKSB7XG4gICAgZSA9IDEgLSBlQmlhc1xuICB9IGVsc2UgaWYgKGUgPT09IGVNYXgpIHtcbiAgICByZXR1cm4gbSA/IE5hTiA6ICgocyA/IC0xIDogMSkgKiBJbmZpbml0eSlcbiAgfSBlbHNlIHtcbiAgICBtID0gbSArIE1hdGgucG93KDIsIG1MZW4pXG4gICAgZSA9IGUgLSBlQmlhc1xuICB9XG4gIHJldHVybiAocyA/IC0xIDogMSkgKiBtICogTWF0aC5wb3coMiwgZSAtIG1MZW4pXG59XG5cbmV4cG9ydHMud3JpdGUgPSBmdW5jdGlvbiAoYnVmZmVyLCB2YWx1ZSwgb2Zmc2V0LCBpc0xFLCBtTGVuLCBuQnl0ZXMpIHtcbiAgdmFyIGUsIG0sIGNcbiAgdmFyIGVMZW4gPSBuQnl0ZXMgKiA4IC0gbUxlbiAtIDFcbiAgdmFyIGVNYXggPSAoMSA8PCBlTGVuKSAtIDFcbiAgdmFyIGVCaWFzID0gZU1heCA+PiAxXG4gIHZhciBydCA9IChtTGVuID09PSAyMyA/IE1hdGgucG93KDIsIC0yNCkgLSBNYXRoLnBvdygyLCAtNzcpIDogMClcbiAgdmFyIGkgPSBpc0xFID8gMCA6IChuQnl0ZXMgLSAxKVxuICB2YXIgZCA9IGlzTEUgPyAxIDogLTFcbiAgdmFyIHMgPSB2YWx1ZSA8IDAgfHwgKHZhbHVlID09PSAwICYmIDEgLyB2YWx1ZSA8IDApID8gMSA6IDBcblxuICB2YWx1ZSA9IE1hdGguYWJzKHZhbHVlKVxuXG4gIGlmIChpc05hTih2YWx1ZSkgfHwgdmFsdWUgPT09IEluZmluaXR5KSB7XG4gICAgbSA9IGlzTmFOKHZhbHVlKSA/IDEgOiAwXG4gICAgZSA9IGVNYXhcbiAgfSBlbHNlIHtcbiAgICBlID0gTWF0aC5mbG9vcihNYXRoLmxvZyh2YWx1ZSkgLyBNYXRoLkxOMilcbiAgICBpZiAodmFsdWUgKiAoYyA9IE1hdGgucG93KDIsIC1lKSkgPCAxKSB7XG4gICAgICBlLS1cbiAgICAgIGMgKj0gMlxuICAgIH1cbiAgICBpZiAoZSArIGVCaWFzID49IDEpIHtcbiAgICAgIHZhbHVlICs9IHJ0IC8gY1xuICAgIH0gZWxzZSB7XG4gICAgICB2YWx1ZSArPSBydCAqIE1hdGgucG93KDIsIDEgLSBlQmlhcylcbiAgICB9XG4gICAgaWYgKHZhbHVlICogYyA+PSAyKSB7XG4gICAgICBlKytcbiAgICAgIGMgLz0gMlxuICAgIH1cblxuICAgIGlmIChlICsgZUJpYXMgPj0gZU1heCkge1xuICAgICAgbSA9IDBcbiAgICAgIGUgPSBlTWF4XG4gICAgfSBlbHNlIGlmIChlICsgZUJpYXMgPj0gMSkge1xuICAgICAgbSA9ICh2YWx1ZSAqIGMgLSAxKSAqIE1hdGgucG93KDIsIG1MZW4pXG4gICAgICBlID0gZSArIGVCaWFzXG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSB2YWx1ZSAqIE1hdGgucG93KDIsIGVCaWFzIC0gMSkgKiBNYXRoLnBvdygyLCBtTGVuKVxuICAgICAgZSA9IDBcbiAgICB9XG4gIH1cblxuICBmb3IgKDsgbUxlbiA+PSA4OyBidWZmZXJbb2Zmc2V0ICsgaV0gPSBtICYgMHhmZiwgaSArPSBkLCBtIC89IDI1NiwgbUxlbiAtPSA4KSB7fVxuXG4gIGUgPSAoZSA8PCBtTGVuKSB8IG1cbiAgZUxlbiArPSBtTGVuXG4gIGZvciAoOyBlTGVuID4gMDsgYnVmZmVyW29mZnNldCArIGldID0gZSAmIDB4ZmYsIGkgKz0gZCwgZSAvPSAyNTYsIGVMZW4gLT0gOCkge31cblxuICBidWZmZXJbb2Zmc2V0ICsgaSAtIGRdIHw9IHMgKiAxMjhcbn1cbiIsInZhciB0b1N0cmluZyA9IHt9LnRvU3RyaW5nO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEFycmF5LmlzQXJyYXkgfHwgZnVuY3Rpb24gKGFycikge1xuICByZXR1cm4gdG9TdHJpbmcuY2FsbChhcnIpID09ICdbb2JqZWN0IEFycmF5XSc7XG59O1xuIl19
