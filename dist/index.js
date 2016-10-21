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
                                i: oldNode.childNodes.indexOf(oldChild)
                            });
                    } else
                        if (typeof newChild === "undefined") {
                            if (oldChild instanceof vDOM.virtualTextNode) {
                                ops.push({
                                    t: "textRemove",
                                    i: oldNode.childNodes.indexOf(oldChild),
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
module.exports.options = {
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
                case "textChange":
                    var parent = root.querySelector(op.p);
                    parent.childNodes[op.i].nodeValue = op.v;
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
        data = "<div>" + data + "</div>";
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
        return root.children[0];
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
        function removeHelper(node) {
            for (var i=0; i<node.children.length; i++)
                removeHelper(node.children[i]);
            self.removeNodes(node.children);
        }
        function addHelper(nodes) {
            for (var i=0; i<nodes.length; i++) {
                addHelper(nodes[i]);
                if (nodes[i].id)
                    self.idNodes = nodes[i];
            }
        }
        for (var i=0; i<nodes.length; i++) {
            var node = nodes[i];
            removeHelper(node);
            var newVDOM = this.createVDOM(html);
            node.children = newVDOM.children;
            addHelper(node.children);
            node.childNodes = newVDOM.childNodes;    
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
    if (typeof node === "undefined") return;
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
        if (!options.options.autoUpdate)
            render.update();
    },
    off: function(event, callback) {
        vDOM.off(this, event, callback);
        if (!options.options.autoUpdate)
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
                options.options = Object.assign(options.options, optionsIn);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIm5vZGVfbW9kdWxlcy9jbG9uZS9jbG9uZS5qcyIsIm5vZGVfbW9kdWxlcy9jc3Mtc2VsZWN0b3ItcGFyc2VyL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2Nzcy1zZWxlY3Rvci1wYXJzZXIvbGliL2Nzcy1zZWxlY3Rvci1wYXJzZXIuanMiLCJub2RlX21vZHVsZXMvZG9tcmVhZHkvcmVhZHkuanMiLCJzcmMvYXJyYXlGdW5jdGlvbnMuanMiLCJzcmMvZGlmZi5qcyIsInNyYy9vcHRpb25zLmpzIiwic3JjL3JlbmRlci5qcyIsInNyYy9zZWxlY3RvckVuZ2luZS9hdHRyaWJ1dGVzLmpzIiwic3JjL3NlbGVjdG9yRW5naW5lL2lkZW50aWZpZXJzLmpzIiwic3JjL3NlbGVjdG9yRW5naW5lL25lc3RpbmcuanMiLCJzcmMvc2VsZWN0b3JFbmdpbmUvcHNldWRvcy5qcyIsInNyYy9zZWxlY3RvckVuZ2luZS9zZWxlY3RvckVuZ2luZS5qcyIsInNyYy9zZWxlY3RvckVuZ2luZS9zZWxlY3RvclV0aWxzLmpzIiwic3JjL3V0aWxzLmpzIiwic3JjL3ZET00vYWRkQ2hpbGQuanMiLCJzcmMvdkRPTS9hdHRyaWJ1dGVzLmpzIiwic3JjL3ZET00vY2xhc3MuanMiLCJzcmMvdkRPTS9jcmVhdGVWRE9NLmpzIiwic3JjL3ZET00vZXZlbnRzLmpzIiwic3JjL3ZET00vaHRtbC5qcyIsInNyYy92RE9NL25vZGVUeXBlcy5qcyIsInNyYy92RE9NL3JlbW92ZUNoaWxkLmpzIiwic3JjL3ZET00vc3R5bGVzLmpzIiwic3JjL3ZET00vdkRPTS5qcyIsInNyYy92RE9NL3ZET01VdGlscy5qcyIsInNyYy92aXJ0dWFsUXVlcnkuanMiLCIuLi8uLi8uLi8uLi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9iYXNlNjQtanMvbGliL2I2NC5qcyIsIi4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2J1ZmZlci9pbmRleC5qcyIsIi4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2llZWU3NTQvaW5kZXguanMiLCIuLi8uLi8uLi8uLi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9pc2FycmF5L2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNyT0E7QUFDQTtBQUNBOztBQ0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsa0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoTkE7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQzVEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUM1SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDN0dBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUMvcURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIGNsb25lID0gKGZ1bmN0aW9uKCkge1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgbmF0aXZlTWFwO1xudHJ5IHtcbiAgbmF0aXZlTWFwID0gTWFwO1xufSBjYXRjaChfKSB7XG4gIC8vIG1heWJlIGEgcmVmZXJlbmNlIGVycm9yIGJlY2F1c2Ugbm8gYE1hcGAuIEdpdmUgaXQgYSBkdW1teSB2YWx1ZSB0aGF0IG5vXG4gIC8vIHZhbHVlIHdpbGwgZXZlciBiZSBhbiBpbnN0YW5jZW9mLlxuICBuYXRpdmVNYXAgPSBmdW5jdGlvbigpIHt9O1xufVxuXG52YXIgbmF0aXZlU2V0O1xudHJ5IHtcbiAgbmF0aXZlU2V0ID0gU2V0O1xufSBjYXRjaChfKSB7XG4gIG5hdGl2ZVNldCA9IGZ1bmN0aW9uKCkge307XG59XG5cbnZhciBuYXRpdmVQcm9taXNlO1xudHJ5IHtcbiAgbmF0aXZlUHJvbWlzZSA9IFByb21pc2U7XG59IGNhdGNoKF8pIHtcbiAgbmF0aXZlUHJvbWlzZSA9IGZ1bmN0aW9uKCkge307XG59XG5cbi8qKlxuICogQ2xvbmVzIChjb3BpZXMpIGFuIE9iamVjdCB1c2luZyBkZWVwIGNvcHlpbmcuXG4gKlxuICogVGhpcyBmdW5jdGlvbiBzdXBwb3J0cyBjaXJjdWxhciByZWZlcmVuY2VzIGJ5IGRlZmF1bHQsIGJ1dCBpZiB5b3UgYXJlIGNlcnRhaW5cbiAqIHRoZXJlIGFyZSBubyBjaXJjdWxhciByZWZlcmVuY2VzIGluIHlvdXIgb2JqZWN0LCB5b3UgY2FuIHNhdmUgc29tZSBDUFUgdGltZVxuICogYnkgY2FsbGluZyBjbG9uZShvYmosIGZhbHNlKS5cbiAqXG4gKiBDYXV0aW9uOiBpZiBgY2lyY3VsYXJgIGlzIGZhbHNlIGFuZCBgcGFyZW50YCBjb250YWlucyBjaXJjdWxhciByZWZlcmVuY2VzLFxuICogeW91ciBwcm9ncmFtIG1heSBlbnRlciBhbiBpbmZpbml0ZSBsb29wIGFuZCBjcmFzaC5cbiAqXG4gKiBAcGFyYW0gYHBhcmVudGAgLSB0aGUgb2JqZWN0IHRvIGJlIGNsb25lZFxuICogQHBhcmFtIGBjaXJjdWxhcmAgLSBzZXQgdG8gdHJ1ZSBpZiB0aGUgb2JqZWN0IHRvIGJlIGNsb25lZCBtYXkgY29udGFpblxuICogICAgY2lyY3VsYXIgcmVmZXJlbmNlcy4gKG9wdGlvbmFsIC0gdHJ1ZSBieSBkZWZhdWx0KVxuICogQHBhcmFtIGBkZXB0aGAgLSBzZXQgdG8gYSBudW1iZXIgaWYgdGhlIG9iamVjdCBpcyBvbmx5IHRvIGJlIGNsb25lZCB0b1xuICogICAgYSBwYXJ0aWN1bGFyIGRlcHRoLiAob3B0aW9uYWwgLSBkZWZhdWx0cyB0byBJbmZpbml0eSlcbiAqIEBwYXJhbSBgcHJvdG90eXBlYCAtIHNldHMgdGhlIHByb3RvdHlwZSB0byBiZSB1c2VkIHdoZW4gY2xvbmluZyBhbiBvYmplY3QuXG4gKiAgICAob3B0aW9uYWwgLSBkZWZhdWx0cyB0byBwYXJlbnQgcHJvdG90eXBlKS5cbiovXG5mdW5jdGlvbiBjbG9uZShwYXJlbnQsIGNpcmN1bGFyLCBkZXB0aCwgcHJvdG90eXBlKSB7XG4gIHZhciBmaWx0ZXI7XG4gIGlmICh0eXBlb2YgY2lyY3VsYXIgPT09ICdvYmplY3QnKSB7XG4gICAgZGVwdGggPSBjaXJjdWxhci5kZXB0aDtcbiAgICBwcm90b3R5cGUgPSBjaXJjdWxhci5wcm90b3R5cGU7XG4gICAgZmlsdGVyID0gY2lyY3VsYXIuZmlsdGVyO1xuICAgIGNpcmN1bGFyID0gY2lyY3VsYXIuY2lyY3VsYXI7XG4gIH1cbiAgLy8gbWFpbnRhaW4gdHdvIGFycmF5cyBmb3IgY2lyY3VsYXIgcmVmZXJlbmNlcywgd2hlcmUgY29ycmVzcG9uZGluZyBwYXJlbnRzXG4gIC8vIGFuZCBjaGlsZHJlbiBoYXZlIHRoZSBzYW1lIGluZGV4XG4gIHZhciBhbGxQYXJlbnRzID0gW107XG4gIHZhciBhbGxDaGlsZHJlbiA9IFtdO1xuXG4gIHZhciB1c2VCdWZmZXIgPSB0eXBlb2YgQnVmZmVyICE9ICd1bmRlZmluZWQnO1xuXG4gIGlmICh0eXBlb2YgY2lyY3VsYXIgPT0gJ3VuZGVmaW5lZCcpXG4gICAgY2lyY3VsYXIgPSB0cnVlO1xuXG4gIGlmICh0eXBlb2YgZGVwdGggPT0gJ3VuZGVmaW5lZCcpXG4gICAgZGVwdGggPSBJbmZpbml0eTtcblxuICAvLyByZWN1cnNlIHRoaXMgZnVuY3Rpb24gc28gd2UgZG9uJ3QgcmVzZXQgYWxsUGFyZW50cyBhbmQgYWxsQ2hpbGRyZW5cbiAgZnVuY3Rpb24gX2Nsb25lKHBhcmVudCwgZGVwdGgpIHtcbiAgICAvLyBjbG9uaW5nIG51bGwgYWx3YXlzIHJldHVybnMgbnVsbFxuICAgIGlmIChwYXJlbnQgPT09IG51bGwpXG4gICAgICByZXR1cm4gbnVsbDtcblxuICAgIGlmIChkZXB0aCA9PT0gMClcbiAgICAgIHJldHVybiBwYXJlbnQ7XG5cbiAgICB2YXIgY2hpbGQ7XG4gICAgdmFyIHByb3RvO1xuICAgIGlmICh0eXBlb2YgcGFyZW50ICE9ICdvYmplY3QnKSB7XG4gICAgICByZXR1cm4gcGFyZW50O1xuICAgIH1cblxuICAgIGlmIChwYXJlbnQgaW5zdGFuY2VvZiBuYXRpdmVNYXApIHtcbiAgICAgIGNoaWxkID0gbmV3IG5hdGl2ZU1hcCgpO1xuICAgIH0gZWxzZSBpZiAocGFyZW50IGluc3RhbmNlb2YgbmF0aXZlU2V0KSB7XG4gICAgICBjaGlsZCA9IG5ldyBuYXRpdmVTZXQoKTtcbiAgICB9IGVsc2UgaWYgKHBhcmVudCBpbnN0YW5jZW9mIG5hdGl2ZVByb21pc2UpIHtcbiAgICAgIGNoaWxkID0gbmV3IG5hdGl2ZVByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICBwYXJlbnQudGhlbihmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgIHJlc29sdmUoX2Nsb25lKHZhbHVlLCBkZXB0aCAtIDEpKTtcbiAgICAgICAgfSwgZnVuY3Rpb24oZXJyKSB7XG4gICAgICAgICAgcmVqZWN0KF9jbG9uZShlcnIsIGRlcHRoIC0gMSkpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSBpZiAoY2xvbmUuX19pc0FycmF5KHBhcmVudCkpIHtcbiAgICAgIGNoaWxkID0gW107XG4gICAgfSBlbHNlIGlmIChjbG9uZS5fX2lzUmVnRXhwKHBhcmVudCkpIHtcbiAgICAgIGNoaWxkID0gbmV3IFJlZ0V4cChwYXJlbnQuc291cmNlLCBfX2dldFJlZ0V4cEZsYWdzKHBhcmVudCkpO1xuICAgICAgaWYgKHBhcmVudC5sYXN0SW5kZXgpIGNoaWxkLmxhc3RJbmRleCA9IHBhcmVudC5sYXN0SW5kZXg7XG4gICAgfSBlbHNlIGlmIChjbG9uZS5fX2lzRGF0ZShwYXJlbnQpKSB7XG4gICAgICBjaGlsZCA9IG5ldyBEYXRlKHBhcmVudC5nZXRUaW1lKCkpO1xuICAgIH0gZWxzZSBpZiAodXNlQnVmZmVyICYmIEJ1ZmZlci5pc0J1ZmZlcihwYXJlbnQpKSB7XG4gICAgICBjaGlsZCA9IG5ldyBCdWZmZXIocGFyZW50Lmxlbmd0aCk7XG4gICAgICBwYXJlbnQuY29weShjaGlsZCk7XG4gICAgICByZXR1cm4gY2hpbGQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICh0eXBlb2YgcHJvdG90eXBlID09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHByb3RvID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKHBhcmVudCk7XG4gICAgICAgIGNoaWxkID0gT2JqZWN0LmNyZWF0ZShwcm90byk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgY2hpbGQgPSBPYmplY3QuY3JlYXRlKHByb3RvdHlwZSk7XG4gICAgICAgIHByb3RvID0gcHJvdG90eXBlO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChjaXJjdWxhcikge1xuICAgICAgdmFyIGluZGV4ID0gYWxsUGFyZW50cy5pbmRleE9mKHBhcmVudCk7XG5cbiAgICAgIGlmIChpbmRleCAhPSAtMSkge1xuICAgICAgICByZXR1cm4gYWxsQ2hpbGRyZW5baW5kZXhdO1xuICAgICAgfVxuICAgICAgYWxsUGFyZW50cy5wdXNoKHBhcmVudCk7XG4gICAgICBhbGxDaGlsZHJlbi5wdXNoKGNoaWxkKTtcbiAgICB9XG5cbiAgICBpZiAocGFyZW50IGluc3RhbmNlb2YgbmF0aXZlTWFwKSB7XG4gICAgICB2YXIga2V5SXRlcmF0b3IgPSBwYXJlbnQua2V5cygpO1xuICAgICAgd2hpbGUodHJ1ZSkge1xuICAgICAgICB2YXIgbmV4dCA9IGtleUl0ZXJhdG9yLm5leHQoKTtcbiAgICAgICAgaWYgKG5leHQuZG9uZSkge1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIHZhciBrZXlDaGlsZCA9IF9jbG9uZShuZXh0LnZhbHVlLCBkZXB0aCAtIDEpO1xuICAgICAgICB2YXIgdmFsdWVDaGlsZCA9IF9jbG9uZShwYXJlbnQuZ2V0KG5leHQudmFsdWUpLCBkZXB0aCAtIDEpO1xuICAgICAgICBjaGlsZC5zZXQoa2V5Q2hpbGQsIHZhbHVlQ2hpbGQpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAocGFyZW50IGluc3RhbmNlb2YgbmF0aXZlU2V0KSB7XG4gICAgICB2YXIgaXRlcmF0b3IgPSBwYXJlbnQua2V5cygpO1xuICAgICAgd2hpbGUodHJ1ZSkge1xuICAgICAgICB2YXIgbmV4dCA9IGl0ZXJhdG9yLm5leHQoKTtcbiAgICAgICAgaWYgKG5leHQuZG9uZSkge1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIHZhciBlbnRyeUNoaWxkID0gX2Nsb25lKG5leHQudmFsdWUsIGRlcHRoIC0gMSk7XG4gICAgICAgIGNoaWxkLmFkZChlbnRyeUNoaWxkKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmb3IgKHZhciBpIGluIHBhcmVudCkge1xuICAgICAgdmFyIGF0dHJzO1xuICAgICAgaWYgKHByb3RvKSB7XG4gICAgICAgIGF0dHJzID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihwcm90bywgaSk7XG4gICAgICB9XG5cbiAgICAgIGlmIChhdHRycyAmJiBhdHRycy5zZXQgPT0gbnVsbCkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGNoaWxkW2ldID0gX2Nsb25lKHBhcmVudFtpXSwgZGVwdGggLSAxKTtcbiAgICB9XG5cbiAgICBpZiAoT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scykge1xuICAgICAgdmFyIHN5bWJvbHMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKHBhcmVudCk7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHN5bWJvbHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgLy8gRG9uJ3QgbmVlZCB0byB3b3JyeSBhYm91dCBjbG9uaW5nIGEgc3ltYm9sIGJlY2F1c2UgaXQgaXMgYSBwcmltaXRpdmUsXG4gICAgICAgIC8vIGxpa2UgYSBudW1iZXIgb3Igc3RyaW5nLlxuICAgICAgICB2YXIgc3ltYm9sID0gc3ltYm9sc1tpXTtcbiAgICAgICAgY2hpbGRbc3ltYm9sXSA9IF9jbG9uZShwYXJlbnRbc3ltYm9sXSwgZGVwdGggLSAxKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gY2hpbGQ7XG4gIH1cblxuICByZXR1cm4gX2Nsb25lKHBhcmVudCwgZGVwdGgpO1xufVxuXG4vKipcbiAqIFNpbXBsZSBmbGF0IGNsb25lIHVzaW5nIHByb3RvdHlwZSwgYWNjZXB0cyBvbmx5IG9iamVjdHMsIHVzZWZ1bGwgZm9yIHByb3BlcnR5XG4gKiBvdmVycmlkZSBvbiBGTEFUIGNvbmZpZ3VyYXRpb24gb2JqZWN0IChubyBuZXN0ZWQgcHJvcHMpLlxuICpcbiAqIFVTRSBXSVRIIENBVVRJT04hIFRoaXMgbWF5IG5vdCBiZWhhdmUgYXMgeW91IHdpc2ggaWYgeW91IGRvIG5vdCBrbm93IGhvdyB0aGlzXG4gKiB3b3Jrcy5cbiAqL1xuY2xvbmUuY2xvbmVQcm90b3R5cGUgPSBmdW5jdGlvbiBjbG9uZVByb3RvdHlwZShwYXJlbnQpIHtcbiAgaWYgKHBhcmVudCA9PT0gbnVsbClcbiAgICByZXR1cm4gbnVsbDtcblxuICB2YXIgYyA9IGZ1bmN0aW9uICgpIHt9O1xuICBjLnByb3RvdHlwZSA9IHBhcmVudDtcbiAgcmV0dXJuIG5ldyBjKCk7XG59O1xuXG4vLyBwcml2YXRlIHV0aWxpdHkgZnVuY3Rpb25zXG5cbmZ1bmN0aW9uIF9fb2JqVG9TdHIobykge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG8pO1xufVxuY2xvbmUuX19vYmpUb1N0ciA9IF9fb2JqVG9TdHI7XG5cbmZ1bmN0aW9uIF9faXNEYXRlKG8pIHtcbiAgcmV0dXJuIHR5cGVvZiBvID09PSAnb2JqZWN0JyAmJiBfX29ialRvU3RyKG8pID09PSAnW29iamVjdCBEYXRlXSc7XG59XG5jbG9uZS5fX2lzRGF0ZSA9IF9faXNEYXRlO1xuXG5mdW5jdGlvbiBfX2lzQXJyYXkobykge1xuICByZXR1cm4gdHlwZW9mIG8gPT09ICdvYmplY3QnICYmIF9fb2JqVG9TdHIobykgPT09ICdbb2JqZWN0IEFycmF5XSc7XG59XG5jbG9uZS5fX2lzQXJyYXkgPSBfX2lzQXJyYXk7XG5cbmZ1bmN0aW9uIF9faXNSZWdFeHAobykge1xuICByZXR1cm4gdHlwZW9mIG8gPT09ICdvYmplY3QnICYmIF9fb2JqVG9TdHIobykgPT09ICdbb2JqZWN0IFJlZ0V4cF0nO1xufVxuY2xvbmUuX19pc1JlZ0V4cCA9IF9faXNSZWdFeHA7XG5cbmZ1bmN0aW9uIF9fZ2V0UmVnRXhwRmxhZ3MocmUpIHtcbiAgdmFyIGZsYWdzID0gJyc7XG4gIGlmIChyZS5nbG9iYWwpIGZsYWdzICs9ICdnJztcbiAgaWYgKHJlLmlnbm9yZUNhc2UpIGZsYWdzICs9ICdpJztcbiAgaWYgKHJlLm11bHRpbGluZSkgZmxhZ3MgKz0gJ20nO1xuICByZXR1cm4gZmxhZ3M7XG59XG5jbG9uZS5fX2dldFJlZ0V4cEZsYWdzID0gX19nZXRSZWdFeHBGbGFncztcblxucmV0dXJuIGNsb25lO1xufSkoKTtcblxuaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gIG1vZHVsZS5leHBvcnRzID0gY2xvbmU7XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgQ3NzU2VsZWN0b3JQYXJzZXI6IHJlcXVpcmUoJy4vbGliL2Nzcy1zZWxlY3Rvci1wYXJzZXIuanMnKS5Dc3NTZWxlY3RvclBhcnNlclxufTsiLCJmdW5jdGlvbiBDc3NTZWxlY3RvclBhcnNlcigpIHtcbiAgdGhpcy5wc2V1ZG9zID0ge307XG4gIHRoaXMuYXR0ckVxdWFsaXR5TW9kcyA9IHt9O1xuICB0aGlzLnJ1bGVOZXN0aW5nT3BlcmF0b3JzID0ge307XG4gIHRoaXMuc3Vic3RpdHV0ZXNFbmFibGVkID0gZmFsc2U7XG59XG5cbkNzc1NlbGVjdG9yUGFyc2VyLnByb3RvdHlwZS5yZWdpc3RlclNlbGVjdG9yUHNldWRvcyA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgZm9yICh2YXIgaiA9IDAsIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7IGogPCBsZW47IGorKykge1xuICAgIG5hbWUgPSBhcmd1bWVudHNbal07XG4gICAgdGhpcy5wc2V1ZG9zW25hbWVdID0gJ3NlbGVjdG9yJztcbiAgfVxuICByZXR1cm4gdGhpcztcbn07XG5cbkNzc1NlbGVjdG9yUGFyc2VyLnByb3RvdHlwZS51bnJlZ2lzdGVyU2VsZWN0b3JQc2V1ZG9zID0gZnVuY3Rpb24obmFtZSkge1xuICBmb3IgKHZhciBqID0gMCwgbGVuID0gYXJndW1lbnRzLmxlbmd0aDsgaiA8IGxlbjsgaisrKSB7XG4gICAgbmFtZSA9IGFyZ3VtZW50c1tqXTtcbiAgICBkZWxldGUgdGhpcy5wc2V1ZG9zW25hbWVdO1xuICB9XG4gIHJldHVybiB0aGlzO1xufTtcblxuQ3NzU2VsZWN0b3JQYXJzZXIucHJvdG90eXBlLnJlZ2lzdGVyTmVzdGluZ09wZXJhdG9ycyA9IGZ1bmN0aW9uKG9wZXJhdG9yKSB7XG4gIGZvciAodmFyIGogPSAwLCBsZW4gPSBhcmd1bWVudHMubGVuZ3RoOyBqIDwgbGVuOyBqKyspIHtcbiAgICBvcGVyYXRvciA9IGFyZ3VtZW50c1tqXTtcbiAgICB0aGlzLnJ1bGVOZXN0aW5nT3BlcmF0b3JzW29wZXJhdG9yXSA9IHRydWU7XG4gIH1cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5Dc3NTZWxlY3RvclBhcnNlci5wcm90b3R5cGUudW5yZWdpc3Rlck5lc3RpbmdPcGVyYXRvcnMgPSBmdW5jdGlvbihvcGVyYXRvcikge1xuICBmb3IgKHZhciBqID0gMCwgbGVuID0gYXJndW1lbnRzLmxlbmd0aDsgaiA8IGxlbjsgaisrKSB7XG4gICAgb3BlcmF0b3IgPSBhcmd1bWVudHNbal07XG4gICAgZGVsZXRlIHRoaXMucnVsZU5lc3RpbmdPcGVyYXRvcnNbb3BlcmF0b3JdO1xuICB9XG4gIHJldHVybiB0aGlzO1xufTtcblxuQ3NzU2VsZWN0b3JQYXJzZXIucHJvdG90eXBlLnJlZ2lzdGVyQXR0ckVxdWFsaXR5TW9kcyA9IGZ1bmN0aW9uKG1vZCkge1xuICBmb3IgKHZhciBqID0gMCwgbGVuID0gYXJndW1lbnRzLmxlbmd0aDsgaiA8IGxlbjsgaisrKSB7XG4gICAgbW9kID0gYXJndW1lbnRzW2pdO1xuICAgIHRoaXMuYXR0ckVxdWFsaXR5TW9kc1ttb2RdID0gdHJ1ZTtcbiAgfVxuICByZXR1cm4gdGhpcztcbn07XG5cbkNzc1NlbGVjdG9yUGFyc2VyLnByb3RvdHlwZS51bnJlZ2lzdGVyQXR0ckVxdWFsaXR5TW9kcyA9IGZ1bmN0aW9uKG1vZCkge1xuICBmb3IgKHZhciBqID0gMCwgbGVuID0gYXJndW1lbnRzLmxlbmd0aDsgaiA8IGxlbjsgaisrKSB7XG4gICAgbW9kID0gYXJndW1lbnRzW2pdO1xuICAgIGRlbGV0ZSB0aGlzLmF0dHJFcXVhbGl0eU1vZHNbbW9kXTtcbiAgfVxuICByZXR1cm4gdGhpcztcbn07XG5cbkNzc1NlbGVjdG9yUGFyc2VyLnByb3RvdHlwZS5lbmFibGVTdWJzdGl0dXRlcyA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLnN1YnN0aXR1dGVzRW5hYmxlZCA9IHRydWU7XG4gIHJldHVybiB0aGlzO1xufTtcblxuQ3NzU2VsZWN0b3JQYXJzZXIucHJvdG90eXBlLmRpc2FibGVTdWJzdGl0dXRlcyA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLnN1YnN0aXR1dGVzRW5hYmxlZCA9IGZhbHNlO1xuICByZXR1cm4gdGhpcztcbn07XG5cbmZ1bmN0aW9uIGlzSWRlbnRTdGFydChjKSB7XG4gIHJldHVybiAoYyA+PSAnYScgJiYgYyA8PSAneicpIHx8IChjID49ICdBJyAmJiBjIDw9ICdaJykgfHwgKGMgPT09ICctJykgfHwgKGMgPT09ICdfJyk7XG59XG5cbmZ1bmN0aW9uIGlzSWRlbnQoYykge1xuICByZXR1cm4gKGMgPj0gJ2EnICYmIGMgPD0gJ3onKSB8fCAoYyA+PSAnQScgJiYgYyA8PSAnWicpIHx8IChjID49ICcwJyAmJiBjIDw9ICc5JykgfHwgYyA9PT0gJy0nIHx8IGMgPT09ICdfJztcbn1cblxuZnVuY3Rpb24gaXNIZXgoYykge1xuICByZXR1cm4gKGMgPj0gJ2EnICYmIGMgPD0gJ2YnKSB8fCAoYyA+PSAnQScgJiYgYyA8PSAnRicpIHx8IChjID49ICcwJyAmJiBjIDw9ICc5Jyk7XG59XG5cbmZ1bmN0aW9uIGlzRGVjaW1hbChjKSB7XG4gIHJldHVybiBjID49ICcwJyAmJiBjIDw9ICc5Jztcbn1cblxuZnVuY3Rpb24gaXNBdHRyTWF0Y2hPcGVyYXRvcihjaHIpIHtcbiAgcmV0dXJuIGNociA9PT0gJz0nIHx8IGNociA9PT0gJ14nIHx8IGNociA9PT0gJyQnIHx8IGNociA9PT0gJyonIHx8IGNociA9PT0gJ34nO1xufVxuXG52YXIgaWRlbnRTcGVjaWFsQ2hhcnMgPSB7XG4gICchJzogdHJ1ZSxcbiAgJ1wiJzogdHJ1ZSxcbiAgJyMnOiB0cnVlLFxuICAnJCc6IHRydWUsXG4gICclJzogdHJ1ZSxcbiAgJyYnOiB0cnVlLFxuICAnXFwnJzogdHJ1ZSxcbiAgJygnOiB0cnVlLFxuICAnKSc6IHRydWUsXG4gICcqJzogdHJ1ZSxcbiAgJysnOiB0cnVlLFxuICAnLCc6IHRydWUsXG4gICcuJzogdHJ1ZSxcbiAgJy8nOiB0cnVlLFxuICAnOyc6IHRydWUsXG4gICc8JzogdHJ1ZSxcbiAgJz0nOiB0cnVlLFxuICAnPic6IHRydWUsXG4gICc/JzogdHJ1ZSxcbiAgJ0AnOiB0cnVlLFxuICAnWyc6IHRydWUsXG4gICdcXFxcJzogdHJ1ZSxcbiAgJ10nOiB0cnVlLFxuICAnXic6IHRydWUsXG4gICdgJzogdHJ1ZSxcbiAgJ3snOiB0cnVlLFxuICAnfCc6IHRydWUsXG4gICd9JzogdHJ1ZSxcbiAgJ34nOiB0cnVlXG59O1xuXG52YXIgc3RyUmVwbGFjZW1lbnRzUmV2ID0ge1xuICAnXFxuJzogJ1xcXFxuJyxcbiAgJ1xccic6ICdcXFxccicsXG4gICdcXHQnOiAnXFxcXHQnLFxuICAnXFxmJzogJ1xcXFxmJyxcbiAgJ1xcdic6ICdcXFxcdidcbn07XG5cbnZhciBzaW5nbGVRdW90ZUVzY2FwZUNoYXJzID0ge1xuICBuOiAnXFxuJyxcbiAgcjogJ1xccicsXG4gIHQ6ICdcXHQnLFxuICBmOiAnXFxmJyxcbiAgJ1xcXFwnOiAnXFxcXCcsXG4gICdcXCcnOiAnXFwnJ1xufTtcblxudmFyIGRvdWJsZVF1b3Rlc0VzY2FwZUNoYXJzID0ge1xuICBuOiAnXFxuJyxcbiAgcjogJ1xccicsXG4gIHQ6ICdcXHQnLFxuICBmOiAnXFxmJyxcbiAgJ1xcXFwnOiAnXFxcXCcsXG4gICdcIic6ICdcIidcbn07XG5cbmZ1bmN0aW9uIFBhcnNlQ29udGV4dChzdHIsIHBvcywgcHNldWRvcywgYXR0ckVxdWFsaXR5TW9kcywgcnVsZU5lc3RpbmdPcGVyYXRvcnMsIHN1YnN0aXR1dGVzRW5hYmxlZCkge1xuICB2YXIgY2hyLCBnZXRJZGVudCwgZ2V0U3RyLCBsLCBza2lwV2hpdGVzcGFjZTtcbiAgbCA9IHN0ci5sZW5ndGg7XG4gIGNociA9IG51bGw7XG4gIGdldFN0ciA9IGZ1bmN0aW9uKHF1b3RlLCBlc2NhcGVUYWJsZSkge1xuICAgIHZhciBlc2MsIGhleCwgcmVzdWx0O1xuICAgIHJlc3VsdCA9ICcnO1xuICAgIHBvcysrO1xuICAgIGNociA9IHN0ci5jaGFyQXQocG9zKTtcbiAgICB3aGlsZSAocG9zIDwgbCkge1xuICAgICAgaWYgKGNociA9PT0gcXVvdGUpIHtcbiAgICAgICAgcG9zKys7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9IGVsc2UgaWYgKGNociA9PT0gJ1xcXFwnKSB7XG4gICAgICAgIHBvcysrO1xuICAgICAgICBjaHIgPSBzdHIuY2hhckF0KHBvcyk7XG4gICAgICAgIGlmIChjaHIgPT09IHF1b3RlKSB7XG4gICAgICAgICAgcmVzdWx0ICs9IHF1b3RlO1xuICAgICAgICB9IGVsc2UgaWYgKGVzYyA9IGVzY2FwZVRhYmxlW2Nocl0pIHtcbiAgICAgICAgICByZXN1bHQgKz0gZXNjO1xuICAgICAgICB9IGVsc2UgaWYgKGlzSGV4KGNocikpIHtcbiAgICAgICAgICBoZXggPSBjaHI7XG4gICAgICAgICAgcG9zKys7XG4gICAgICAgICAgY2hyID0gc3RyLmNoYXJBdChwb3MpO1xuICAgICAgICAgIHdoaWxlIChpc0hleChjaHIpKSB7XG4gICAgICAgICAgICBoZXggKz0gY2hyO1xuICAgICAgICAgICAgcG9zKys7XG4gICAgICAgICAgICBjaHIgPSBzdHIuY2hhckF0KHBvcyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChjaHIgPT09ICcgJykge1xuICAgICAgICAgICAgcG9zKys7XG4gICAgICAgICAgICBjaHIgPSBzdHIuY2hhckF0KHBvcyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJlc3VsdCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHBhcnNlSW50KGhleCwgMTYpKTtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXN1bHQgKz0gY2hyO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXN1bHQgKz0gY2hyO1xuICAgICAgfVxuICAgICAgcG9zKys7XG4gICAgICBjaHIgPSBzdHIuY2hhckF0KHBvcyk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG4gIGdldElkZW50ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHJlc3VsdCA9ICcnO1xuICAgIGNociA9IHN0ci5jaGFyQXQocG9zKTtcbiAgICB3aGlsZSAocG9zIDwgbCkge1xuICAgICAgaWYgKGlzSWRlbnQoY2hyKSkge1xuICAgICAgICByZXN1bHQgKz0gY2hyO1xuICAgICAgfSBlbHNlIGlmIChjaHIgPT09ICdcXFxcJykge1xuICAgICAgICBwb3MrKztcbiAgICAgICAgaWYgKHBvcyA+PSBsKSB7XG4gICAgICAgICAgdGhyb3cgRXJyb3IoJ0V4cGVjdGVkIHN5bWJvbCBidXQgZW5kIG9mIGZpbGUgcmVhY2hlZC4nKTtcbiAgICAgICAgfVxuICAgICAgICBjaHIgPSBzdHIuY2hhckF0KHBvcyk7XG4gICAgICAgIGlmIChpZGVudFNwZWNpYWxDaGFyc1tjaHJdKSB7XG4gICAgICAgICAgcmVzdWx0ICs9IGNocjtcbiAgICAgICAgfSBlbHNlIGlmIChpc0hleChjaHIpKSB7XG4gICAgICAgICAgdmFyIGhleCA9IGNocjtcbiAgICAgICAgICBwb3MrKztcbiAgICAgICAgICBjaHIgPSBzdHIuY2hhckF0KHBvcyk7XG4gICAgICAgICAgd2hpbGUgKGlzSGV4KGNocikpIHtcbiAgICAgICAgICAgIGhleCArPSBjaHI7XG4gICAgICAgICAgICBwb3MrKztcbiAgICAgICAgICAgIGNociA9IHN0ci5jaGFyQXQocG9zKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGNociA9PT0gJyAnKSB7XG4gICAgICAgICAgICBwb3MrKztcbiAgICAgICAgICAgIGNociA9IHN0ci5jaGFyQXQocG9zKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmVzdWx0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUocGFyc2VJbnQoaGV4LCAxNikpO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc3VsdCArPSBjaHI7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9XG4gICAgICBwb3MrKztcbiAgICAgIGNociA9IHN0ci5jaGFyQXQocG9zKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcbiAgc2tpcFdoaXRlc3BhY2UgPSBmdW5jdGlvbigpIHtcbiAgICBjaHIgPSBzdHIuY2hhckF0KHBvcyk7XG4gICAgdmFyIHJlc3VsdCA9IGZhbHNlO1xuICAgIHdoaWxlIChjaHIgPT09ICcgJyB8fCBjaHIgPT09IFwiXFx0XCIgfHwgY2hyID09PSBcIlxcblwiIHx8IGNociA9PT0gXCJcXHJcIiB8fCBjaHIgPT09IFwiXFxmXCIpIHtcbiAgICAgIHJlc3VsdCA9IHRydWU7XG4gICAgICBwb3MrKztcbiAgICAgIGNociA9IHN0ci5jaGFyQXQocG9zKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcbiAgdGhpcy5wYXJzZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciByZXMgPSB0aGlzLnBhcnNlU2VsZWN0b3IoKTtcbiAgICBpZiAocG9zIDwgbCkge1xuICAgICAgdGhyb3cgRXJyb3IoJ1J1bGUgZXhwZWN0ZWQgYnV0IFwiJyArIHN0ci5jaGFyQXQocG9zKSArICdcIiBmb3VuZC4nKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlcztcbiAgfTtcbiAgdGhpcy5wYXJzZVNlbGVjdG9yID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHJlcztcbiAgICB2YXIgc2VsZWN0b3IgPSByZXMgPSB0aGlzLnBhcnNlU2luZ2xlU2VsZWN0b3IoKTtcbiAgICBjaHIgPSBzdHIuY2hhckF0KHBvcyk7XG4gICAgd2hpbGUgKGNociA9PT0gJywnKSB7XG4gICAgICBwb3MrKztcbiAgICAgIHNraXBXaGl0ZXNwYWNlKCk7XG4gICAgICBpZiAocmVzLnR5cGUgIT09ICdzZWxlY3RvcnMnKSB7XG4gICAgICAgIHJlcyA9IHtcbiAgICAgICAgICB0eXBlOiAnc2VsZWN0b3JzJyxcbiAgICAgICAgICBzZWxlY3RvcnM6IFtzZWxlY3Rvcl1cbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICAgIHNlbGVjdG9yID0gdGhpcy5wYXJzZVNpbmdsZVNlbGVjdG9yKCk7XG4gICAgICBpZiAoIXNlbGVjdG9yKSB7XG4gICAgICAgIHRocm93IEVycm9yKCdSdWxlIGV4cGVjdGVkIGFmdGVyIFwiLFwiLicpO1xuICAgICAgfVxuICAgICAgcmVzLnNlbGVjdG9ycy5wdXNoKHNlbGVjdG9yKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlcztcbiAgfTtcblxuICB0aGlzLnBhcnNlU2luZ2xlU2VsZWN0b3IgPSBmdW5jdGlvbigpIHtcbiAgICBza2lwV2hpdGVzcGFjZSgpO1xuICAgIHZhciBzZWxlY3RvciA9IHtcbiAgICAgIHR5cGU6ICdydWxlU2V0J1xuICAgIH07XG4gICAgdmFyIHJ1bGUgPSB0aGlzLnBhcnNlUnVsZSgpO1xuICAgIGlmICghcnVsZSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHZhciBjdXJyZW50UnVsZSA9IHNlbGVjdG9yO1xuICAgIHdoaWxlIChydWxlKSB7XG4gICAgICBydWxlLnR5cGUgPSAncnVsZSc7XG4gICAgICBjdXJyZW50UnVsZS5ydWxlID0gcnVsZTtcbiAgICAgIGN1cnJlbnRSdWxlID0gcnVsZTtcbiAgICAgIHNraXBXaGl0ZXNwYWNlKCk7XG4gICAgICBjaHIgPSBzdHIuY2hhckF0KHBvcyk7XG4gICAgICBpZiAocG9zID49IGwgfHwgY2hyID09PSAnLCcgfHwgY2hyID09PSAnKScpIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICBpZiAocnVsZU5lc3RpbmdPcGVyYXRvcnNbY2hyXSkge1xuICAgICAgICB2YXIgb3AgPSBjaHI7XG4gICAgICAgIHBvcysrO1xuICAgICAgICBza2lwV2hpdGVzcGFjZSgpO1xuICAgICAgICBydWxlID0gdGhpcy5wYXJzZVJ1bGUoKTtcbiAgICAgICAgaWYgKCFydWxlKSB7XG4gICAgICAgICAgdGhyb3cgRXJyb3IoJ1J1bGUgZXhwZWN0ZWQgYWZ0ZXIgXCInICsgb3AgKyAnXCIuJyk7XG4gICAgICAgIH1cbiAgICAgICAgcnVsZS5uZXN0aW5nT3BlcmF0b3IgPSBvcDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJ1bGUgPSB0aGlzLnBhcnNlUnVsZSgpO1xuICAgICAgICBpZiAocnVsZSkge1xuICAgICAgICAgIHJ1bGUubmVzdGluZ09wZXJhdG9yID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gc2VsZWN0b3I7XG4gIH07XG5cbiAgdGhpcy5wYXJzZVJ1bGUgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgcnVsZSA9IG51bGw7XG4gICAgd2hpbGUgKHBvcyA8IGwpIHtcbiAgICAgIGNociA9IHN0ci5jaGFyQXQocG9zKTtcbiAgICAgIGlmIChjaHIgPT09ICcqJykge1xuICAgICAgICBwb3MrKztcbiAgICAgICAgKHJ1bGUgPSBydWxlIHx8IHt9KS50YWdOYW1lID0gJyonO1xuICAgICAgfSBlbHNlIGlmIChpc0lkZW50U3RhcnQoY2hyKSB8fCBjaHIgPT09ICdcXFxcJykge1xuICAgICAgICAocnVsZSA9IHJ1bGUgfHwge30pLnRhZ05hbWUgPSBnZXRJZGVudCgpO1xuICAgICAgfSBlbHNlIGlmIChjaHIgPT09ICcuJykge1xuICAgICAgICBwb3MrKztcbiAgICAgICAgcnVsZSA9IHJ1bGUgfHwge307XG4gICAgICAgIChydWxlLmNsYXNzTmFtZXMgPSBydWxlLmNsYXNzTmFtZXMgfHwgW10pLnB1c2goZ2V0SWRlbnQoKSk7XG4gICAgICB9IGVsc2UgaWYgKGNociA9PT0gJyMnKSB7XG4gICAgICAgIHBvcysrO1xuICAgICAgICAocnVsZSA9IHJ1bGUgfHwge30pLmlkID0gZ2V0SWRlbnQoKTtcbiAgICAgIH0gZWxzZSBpZiAoY2hyID09PSAnWycpIHtcbiAgICAgICAgcG9zKys7XG4gICAgICAgIHNraXBXaGl0ZXNwYWNlKCk7XG4gICAgICAgIHZhciBhdHRyID0ge1xuICAgICAgICAgIG5hbWU6IGdldElkZW50KClcbiAgICAgICAgfTtcbiAgICAgICAgc2tpcFdoaXRlc3BhY2UoKTtcbiAgICAgICAgaWYgKGNociA9PT0gJ10nKSB7XG4gICAgICAgICAgcG9zKys7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdmFyIG9wZXJhdG9yID0gJyc7XG4gICAgICAgICAgaWYgKGF0dHJFcXVhbGl0eU1vZHNbY2hyXSkge1xuICAgICAgICAgICAgb3BlcmF0b3IgPSBjaHI7XG4gICAgICAgICAgICBwb3MrKztcbiAgICAgICAgICAgIGNociA9IHN0ci5jaGFyQXQocG9zKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHBvcyA+PSBsKSB7XG4gICAgICAgICAgICB0aHJvdyBFcnJvcignRXhwZWN0ZWQgXCI9XCIgYnV0IGVuZCBvZiBmaWxlIHJlYWNoZWQuJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChjaHIgIT09ICc9Jykge1xuICAgICAgICAgICAgdGhyb3cgRXJyb3IoJ0V4cGVjdGVkIFwiPVwiIGJ1dCBcIicgKyBjaHIgKyAnXCIgZm91bmQuJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGF0dHIub3BlcmF0b3IgPSBvcGVyYXRvciArICc9JztcbiAgICAgICAgICBwb3MrKztcbiAgICAgICAgICBza2lwV2hpdGVzcGFjZSgpO1xuICAgICAgICAgIHZhciBhdHRyVmFsdWUgPSAnJztcbiAgICAgICAgICBhdHRyLnZhbHVlVHlwZSA9ICdzdHJpbmcnO1xuICAgICAgICAgIGlmIChjaHIgPT09ICdcIicpIHtcbiAgICAgICAgICAgIGF0dHJWYWx1ZSA9IGdldFN0cignXCInLCBkb3VibGVRdW90ZXNFc2NhcGVDaGFycyk7XG4gICAgICAgICAgfSBlbHNlIGlmIChjaHIgPT09ICdcXCcnKSB7XG4gICAgICAgICAgICBhdHRyVmFsdWUgPSBnZXRTdHIoJ1xcJycsIHNpbmdsZVF1b3RlRXNjYXBlQ2hhcnMpO1xuICAgICAgICAgIH0gZWxzZSBpZiAoc3Vic3RpdHV0ZXNFbmFibGVkICYmIGNociA9PT0gJyQnKSB7XG4gICAgICAgICAgICBwb3MrKztcbiAgICAgICAgICAgIGF0dHJWYWx1ZSA9IGdldElkZW50KCk7XG4gICAgICAgICAgICBhdHRyLnZhbHVlVHlwZSA9ICdzdWJzdGl0dXRlJztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgd2hpbGUgKHBvcyA8IGwpIHtcbiAgICAgICAgICAgICAgaWYgKGNociA9PT0gJ10nKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgYXR0clZhbHVlICs9IGNocjtcbiAgICAgICAgICAgICAgcG9zKys7XG4gICAgICAgICAgICAgIGNociA9IHN0ci5jaGFyQXQocG9zKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGF0dHJWYWx1ZSA9IGF0dHJWYWx1ZS50cmltKCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHNraXBXaGl0ZXNwYWNlKCk7XG4gICAgICAgICAgaWYgKHBvcyA+PSBsKSB7XG4gICAgICAgICAgICB0aHJvdyBFcnJvcignRXhwZWN0ZWQgXCJdXCIgYnV0IGVuZCBvZiBmaWxlIHJlYWNoZWQuJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChjaHIgIT09ICddJykge1xuICAgICAgICAgICAgdGhyb3cgRXJyb3IoJ0V4cGVjdGVkIFwiXVwiIGJ1dCBcIicgKyBjaHIgKyAnXCIgZm91bmQuJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHBvcysrO1xuICAgICAgICAgIGF0dHIudmFsdWUgPSBhdHRyVmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgcnVsZSA9IHJ1bGUgfHwge307XG4gICAgICAgIChydWxlLmF0dHJzID0gcnVsZS5hdHRycyB8fCBbXSkucHVzaChhdHRyKTtcbiAgICAgIH0gZWxzZSBpZiAoY2hyID09PSAnOicpIHtcbiAgICAgICAgcG9zKys7XG4gICAgICAgIHZhciBwc2V1ZG9OYW1lID0gZ2V0SWRlbnQoKTtcbiAgICAgICAgdmFyIHBzZXVkbyA9IHtcbiAgICAgICAgICBuYW1lOiBwc2V1ZG9OYW1lXG4gICAgICAgIH07XG4gICAgICAgIGlmIChjaHIgPT09ICcoJykge1xuICAgICAgICAgIHBvcysrO1xuICAgICAgICAgIHZhciB2YWx1ZSA9ICcnO1xuICAgICAgICAgIHNraXBXaGl0ZXNwYWNlKCk7XG4gICAgICAgICAgaWYgKHBzZXVkb3NbcHNldWRvTmFtZV0gPT09ICdzZWxlY3RvcicpIHtcbiAgICAgICAgICAgIHBzZXVkby52YWx1ZVR5cGUgPSAnc2VsZWN0b3InO1xuICAgICAgICAgICAgdmFsdWUgPSB0aGlzLnBhcnNlU2VsZWN0b3IoKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcHNldWRvLnZhbHVlVHlwZSA9ICdzdHJpbmcnO1xuICAgICAgICAgICAgaWYgKGNociA9PT0gJ1wiJykge1xuICAgICAgICAgICAgICB2YWx1ZSA9IGdldFN0cignXCInLCBkb3VibGVRdW90ZXNFc2NhcGVDaGFycyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGNociA9PT0gJ1xcJycpIHtcbiAgICAgICAgICAgICAgdmFsdWUgPSBnZXRTdHIoJ1xcJycsIHNpbmdsZVF1b3RlRXNjYXBlQ2hhcnMpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChzdWJzdGl0dXRlc0VuYWJsZWQgJiYgY2hyID09PSAnJCcpIHtcbiAgICAgICAgICAgICAgcG9zKys7XG4gICAgICAgICAgICAgIHZhbHVlID0gZ2V0SWRlbnQoKTtcbiAgICAgICAgICAgICAgcHNldWRvLnZhbHVlVHlwZSA9ICdzdWJzdGl0dXRlJztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHdoaWxlIChwb3MgPCBsKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNociA9PT0gJyknKSB7XG4gICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFsdWUgKz0gY2hyO1xuICAgICAgICAgICAgICAgIHBvcysrO1xuICAgICAgICAgICAgICAgIGNociA9IHN0ci5jaGFyQXQocG9zKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB2YWx1ZSA9IHZhbHVlLnRyaW0oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNraXBXaGl0ZXNwYWNlKCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChwb3MgPj0gbCkge1xuICAgICAgICAgICAgdGhyb3cgRXJyb3IoJ0V4cGVjdGVkIFwiKVwiIGJ1dCBlbmQgb2YgZmlsZSByZWFjaGVkLicpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoY2hyICE9PSAnKScpIHtcbiAgICAgICAgICAgIHRocm93IEVycm9yKCdFeHBlY3RlZCBcIilcIiBidXQgXCInICsgY2hyICsgJ1wiIGZvdW5kLicpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBwb3MrKztcbiAgICAgICAgICBwc2V1ZG8udmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgICBydWxlID0gcnVsZSB8fCB7fTtcbiAgICAgICAgKHJ1bGUucHNldWRvcyA9IHJ1bGUucHNldWRvcyB8fCBbXSkucHVzaChwc2V1ZG8pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBydWxlO1xuICB9O1xuICByZXR1cm4gdGhpcztcbn1cblxuQ3NzU2VsZWN0b3JQYXJzZXIucHJvdG90eXBlLnBhcnNlID0gZnVuY3Rpb24oc3RyKSB7XG4gIHZhciBjb250ZXh0ID0gbmV3IFBhcnNlQ29udGV4dChcbiAgICAgIHN0cixcbiAgICAgIDAsXG4gICAgICB0aGlzLnBzZXVkb3MsXG4gICAgICB0aGlzLmF0dHJFcXVhbGl0eU1vZHMsXG4gICAgICB0aGlzLnJ1bGVOZXN0aW5nT3BlcmF0b3JzLFxuICAgICAgdGhpcy5zdWJzdGl0dXRlc0VuYWJsZWRcbiAgKTtcbiAgcmV0dXJuIGNvbnRleHQucGFyc2UoKTtcbn07XG5cbkNzc1NlbGVjdG9yUGFyc2VyLnByb3RvdHlwZS5lc2NhcGVJZGVudGlmaWVyID0gZnVuY3Rpb24ocykge1xuICB2YXIgcmVzdWx0ID0gJyc7XG4gIHZhciBpID0gMDtcbiAgdmFyIGxlbiA9IHMubGVuZ3RoO1xuICB3aGlsZSAoaSA8IGxlbikge1xuICAgIHZhciBjaHIgPSBzLmNoYXJBdChpKTtcbiAgICBpZiAoaWRlbnRTcGVjaWFsQ2hhcnNbY2hyXSkge1xuICAgICAgcmVzdWx0ICs9ICdcXFxcJyArIGNocjtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKFxuICAgICAgICAgICEoXG4gICAgICAgICAgICAgIGNociA9PT0gJ18nIHx8IGNociA9PT0gJy0nIHx8XG4gICAgICAgICAgICAgIChjaHIgPj0gJ0EnICYmIGNociA8PSAnWicpIHx8XG4gICAgICAgICAgICAgIChjaHIgPj0gJ2EnICYmIGNociA8PSAneicpIHx8XG4gICAgICAgICAgICAgIChpICE9PSAwICYmIGNociA+PSAnMCcgJiYgY2hyIDw9ICc5JylcbiAgICAgICAgICApXG4gICAgICApIHtcbiAgICAgICAgdmFyIGNoYXJDb2RlID0gY2hyLmNoYXJDb2RlQXQoMCk7XG4gICAgICAgIGlmICgoY2hhckNvZGUgJiAweEY4MDApID09PSAweEQ4MDApIHtcbiAgICAgICAgICB2YXIgZXh0cmFDaGFyQ29kZSA9IHMuY2hhckNvZGVBdChpKyspO1xuICAgICAgICAgIGlmICgoY2hhckNvZGUgJiAweEZDMDApICE9PSAweEQ4MDAgfHwgKGV4dHJhQ2hhckNvZGUgJiAweEZDMDApICE9PSAweERDMDApIHtcbiAgICAgICAgICAgIHRocm93IEVycm9yKCdVQ1MtMihkZWNvZGUpOiBpbGxlZ2FsIHNlcXVlbmNlJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNoYXJDb2RlID0gKChjaGFyQ29kZSAmIDB4M0ZGKSA8PCAxMCkgKyAoZXh0cmFDaGFyQ29kZSAmIDB4M0ZGKSArIDB4MTAwMDA7XG4gICAgICAgIH1cbiAgICAgICAgcmVzdWx0ICs9ICdcXFxcJyArIGNoYXJDb2RlLnRvU3RyaW5nKDE2KSArICcgJztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc3VsdCArPSBjaHI7XG4gICAgICB9XG4gICAgfVxuICAgIGkrKztcbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufTtcblxuQ3NzU2VsZWN0b3JQYXJzZXIucHJvdG90eXBlLmVzY2FwZVN0ciA9IGZ1bmN0aW9uKHMpIHtcbiAgdmFyIHJlc3VsdCA9ICcnO1xuICB2YXIgaSA9IDA7XG4gIHZhciBsZW4gPSBzLmxlbmd0aDtcbiAgdmFyIGNociwgcmVwbGFjZW1lbnQ7XG4gIHdoaWxlIChpIDwgbGVuKSB7XG4gICAgY2hyID0gcy5jaGFyQXQoaSk7XG4gICAgaWYgKGNociA9PT0gJ1wiJykge1xuICAgICAgY2hyID0gJ1xcXFxcIic7XG4gICAgfSBlbHNlIGlmIChjaHIgPT09ICdcXFxcJykge1xuICAgICAgY2hyID0gJ1xcXFxcXFxcJztcbiAgICB9IGVsc2UgaWYgKHJlcGxhY2VtZW50ID0gc3RyUmVwbGFjZW1lbnRzUmV2W2Nocl0pIHtcbiAgICAgIGNociA9IHJlcGxhY2VtZW50O1xuICAgIH1cbiAgICByZXN1bHQgKz0gY2hyO1xuICAgIGkrKztcbiAgfVxuICByZXR1cm4gXCJcXFwiXCIgKyByZXN1bHQgKyBcIlxcXCJcIjtcbn07XG5cbkNzc1NlbGVjdG9yUGFyc2VyLnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbihwYXRoKSB7XG4gIHJldHVybiB0aGlzLl9yZW5kZXJFbnRpdHkocGF0aCkudHJpbSgpO1xufTtcblxuQ3NzU2VsZWN0b3JQYXJzZXIucHJvdG90eXBlLl9yZW5kZXJFbnRpdHkgPSBmdW5jdGlvbihlbnRpdHkpIHtcbiAgdmFyIGN1cnJlbnRFbnRpdHksIHBhcnRzLCByZXM7XG4gIHJlcyA9ICcnO1xuICBzd2l0Y2ggKGVudGl0eS50eXBlKSB7XG4gICAgY2FzZSAncnVsZVNldCc6XG4gICAgICBjdXJyZW50RW50aXR5ID0gZW50aXR5LnJ1bGU7XG4gICAgICBwYXJ0cyA9IFtdO1xuICAgICAgd2hpbGUgKGN1cnJlbnRFbnRpdHkpIHtcbiAgICAgICAgaWYgKGN1cnJlbnRFbnRpdHkubmVzdGluZ09wZXJhdG9yKSB7XG4gICAgICAgICAgcGFydHMucHVzaChjdXJyZW50RW50aXR5Lm5lc3RpbmdPcGVyYXRvcik7XG4gICAgICAgIH1cbiAgICAgICAgcGFydHMucHVzaCh0aGlzLl9yZW5kZXJFbnRpdHkoY3VycmVudEVudGl0eSkpO1xuICAgICAgICBjdXJyZW50RW50aXR5ID0gY3VycmVudEVudGl0eS5ydWxlO1xuICAgICAgfVxuICAgICAgcmVzID0gcGFydHMuam9pbignICcpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnc2VsZWN0b3JzJzpcbiAgICAgIHJlcyA9IGVudGl0eS5zZWxlY3RvcnMubWFwKHRoaXMuX3JlbmRlckVudGl0eSwgdGhpcykuam9pbignLCAnKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ3J1bGUnOlxuICAgICAgaWYgKGVudGl0eS50YWdOYW1lKSB7XG4gICAgICAgIGlmIChlbnRpdHkudGFnTmFtZSA9PT0gJyonKSB7XG4gICAgICAgICAgcmVzID0gJyonO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlcyA9IHRoaXMuZXNjYXBlSWRlbnRpZmllcihlbnRpdHkudGFnTmFtZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChlbnRpdHkuaWQpIHtcbiAgICAgICAgcmVzICs9IFwiI1wiICsgdGhpcy5lc2NhcGVJZGVudGlmaWVyKGVudGl0eS5pZCk7XG4gICAgICB9XG4gICAgICBpZiAoZW50aXR5LmNsYXNzTmFtZXMpIHtcbiAgICAgICAgcmVzICs9IGVudGl0eS5jbGFzc05hbWVzLm1hcChmdW5jdGlvbihjbikge1xuICAgICAgICAgIHJldHVybiBcIi5cIiArICh0aGlzLmVzY2FwZUlkZW50aWZpZXIoY24pKTtcbiAgICAgICAgfSwgdGhpcykuam9pbignJyk7XG4gICAgICB9XG4gICAgICBpZiAoZW50aXR5LmF0dHJzKSB7XG4gICAgICAgIHJlcyArPSBlbnRpdHkuYXR0cnMubWFwKGZ1bmN0aW9uKGF0dHIpIHtcbiAgICAgICAgICBpZiAoYXR0ci5vcGVyYXRvcikge1xuICAgICAgICAgICAgaWYgKGF0dHIudmFsdWVUeXBlID09PSAnc3Vic3RpdHV0ZScpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIFwiW1wiICsgdGhpcy5lc2NhcGVJZGVudGlmaWVyKGF0dHIubmFtZSkgKyBhdHRyLm9wZXJhdG9yICsgXCIkXCIgKyBhdHRyLnZhbHVlICsgXCJdXCI7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXR1cm4gXCJbXCIgKyB0aGlzLmVzY2FwZUlkZW50aWZpZXIoYXR0ci5uYW1lKSArIGF0dHIub3BlcmF0b3IgKyB0aGlzLmVzY2FwZVN0cihhdHRyLnZhbHVlKSArIFwiXVwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gXCJbXCIgKyB0aGlzLmVzY2FwZUlkZW50aWZpZXIoYXR0ci5uYW1lKSArIFwiXVwiO1xuICAgICAgICAgIH1cbiAgICAgICAgfSwgdGhpcykuam9pbignJyk7XG4gICAgICB9XG4gICAgICBpZiAoZW50aXR5LnBzZXVkb3MpIHtcbiAgICAgICAgcmVzICs9IGVudGl0eS5wc2V1ZG9zLm1hcChmdW5jdGlvbihwc2V1ZG8pIHtcbiAgICAgICAgICBpZiAocHNldWRvLnZhbHVlVHlwZSkge1xuICAgICAgICAgICAgaWYgKHBzZXVkby52YWx1ZVR5cGUgPT09ICdzZWxlY3RvcicpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIFwiOlwiICsgdGhpcy5lc2NhcGVJZGVudGlmaWVyKHBzZXVkby5uYW1lKSArIFwiKFwiICsgdGhpcy5fcmVuZGVyRW50aXR5KHBzZXVkby52YWx1ZSkgKyBcIilcIjtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocHNldWRvLnZhbHVlVHlwZSA9PT0gJ3N1YnN0aXR1dGUnKSB7XG4gICAgICAgICAgICAgIHJldHVybiBcIjpcIiArIHRoaXMuZXNjYXBlSWRlbnRpZmllcihwc2V1ZG8ubmFtZSkgKyBcIigkXCIgKyBwc2V1ZG8udmFsdWUgKyBcIilcIjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJldHVybiBcIjpcIiArIHRoaXMuZXNjYXBlSWRlbnRpZmllcihwc2V1ZG8ubmFtZSkgKyBcIihcIiArIHRoaXMuZXNjYXBlU3RyKHBzZXVkby52YWx1ZSkgKyBcIilcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIFwiOlwiICsgdGhpcy5lc2NhcGVJZGVudGlmaWVyKHBzZXVkby5uYW1lKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sIHRoaXMpLmpvaW4oJycpO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IEVycm9yKCdVbmtub3duIGVudGl0eSB0eXBlOiBcIicgKyBlbnRpdHkudHlwZSgrJ1wiLicpKTtcbiAgfVxuICByZXR1cm4gcmVzO1xufTtcblxuZXhwb3J0cy5Dc3NTZWxlY3RvclBhcnNlciA9IENzc1NlbGVjdG9yUGFyc2VyO1xuIiwiLyohXG4gICogZG9tcmVhZHkgKGMpIER1c3RpbiBEaWF6IDIwMTQgLSBMaWNlbnNlIE1JVFxuICAqL1xuIWZ1bmN0aW9uIChuYW1lLCBkZWZpbml0aW9uKSB7XG5cbiAgaWYgKHR5cGVvZiBtb2R1bGUgIT0gJ3VuZGVmaW5lZCcpIG1vZHVsZS5leHBvcnRzID0gZGVmaW5pdGlvbigpXG4gIGVsc2UgaWYgKHR5cGVvZiBkZWZpbmUgPT0gJ2Z1bmN0aW9uJyAmJiB0eXBlb2YgZGVmaW5lLmFtZCA9PSAnb2JqZWN0JykgZGVmaW5lKGRlZmluaXRpb24pXG4gIGVsc2UgdGhpc1tuYW1lXSA9IGRlZmluaXRpb24oKVxuXG59KCdkb21yZWFkeScsIGZ1bmN0aW9uICgpIHtcblxuICB2YXIgZm5zID0gW10sIGxpc3RlbmVyXG4gICAgLCBkb2MgPSBkb2N1bWVudFxuICAgICwgaGFjayA9IGRvYy5kb2N1bWVudEVsZW1lbnQuZG9TY3JvbGxcbiAgICAsIGRvbUNvbnRlbnRMb2FkZWQgPSAnRE9NQ29udGVudExvYWRlZCdcbiAgICAsIGxvYWRlZCA9IChoYWNrID8gL15sb2FkZWR8XmMvIDogL15sb2FkZWR8Xml8XmMvKS50ZXN0KGRvYy5yZWFkeVN0YXRlKVxuXG5cbiAgaWYgKCFsb2FkZWQpXG4gIGRvYy5hZGRFdmVudExpc3RlbmVyKGRvbUNvbnRlbnRMb2FkZWQsIGxpc3RlbmVyID0gZnVuY3Rpb24gKCkge1xuICAgIGRvYy5yZW1vdmVFdmVudExpc3RlbmVyKGRvbUNvbnRlbnRMb2FkZWQsIGxpc3RlbmVyKVxuICAgIGxvYWRlZCA9IDFcbiAgICB3aGlsZSAobGlzdGVuZXIgPSBmbnMuc2hpZnQoKSkgbGlzdGVuZXIoKVxuICB9KVxuXG4gIHJldHVybiBmdW5jdGlvbiAoZm4pIHtcbiAgICBsb2FkZWQgPyBzZXRUaW1lb3V0KGZuLCAwKSA6IGZucy5wdXNoKGZuKVxuICB9XG5cbn0pO1xuIiwiaWYgKCFBcnJheS5wcm90b3R5cGUuZmlsdGVyKSB7XG4gICAgQXJyYXkucHJvdG90eXBlLmZpbHRlciA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICAgICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgICAgIGlmICh0aGlzID09PSB2b2lkIDAgfHwgdGhpcyA9PT0gbnVsbCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcigpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHQgPSBPYmplY3QodGhpcyk7XG4gICAgICAgIHZhciBsZW4gPSB0Lmxlbmd0aCA+Pj4gMDtcbiAgICAgICAgaWYgKHR5cGVvZiBmdW4gIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciByZXMgPSBbXTtcbiAgICAgICAgdmFyIHRoaXNBcmcgPSBhcmd1bWVudHMubGVuZ3RoID49IDIgPyBhcmd1bWVudHNbMV0gOiB2b2lkIDA7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChpIGluIHQpIHtcbiAgICAgICAgICAgICAgICB2YXIgdmFsID0gdFtpXTtcbiAgICAgICAgICAgICAgICBpZiAoZnVuLmNhbGwodGhpc0FyZywgdmFsLCBpLCB0KSkge1xuICAgICAgICAgICAgICAgICAgICByZXMucHVzaCh2YWwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfTtcbn1cbkFycmF5LnByb3RvdHlwZS5kaWZmID0gZnVuY3Rpb24gKGEpIHtcbiAgICByZXR1cm4gdGhpcy5maWx0ZXIoZnVuY3Rpb24gKGkpIHsgcmV0dXJuIGEuaW5kZXhPZihpKSA8IDA7IH0pO1xufTtcbkFycmF5LnByb3RvdHlwZS51bmlxdWUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlZW4gPSB7fVxuICAgIHJldHVybiB0aGlzLmZpbHRlcihmdW5jdGlvbiAoeCkge1xuICAgICAgICBpZiAoc2Vlblt4XSlcbiAgICAgICAgICAgIHJldHVyblxuICAgICAgICBzZWVuW3hdID0gdHJ1ZVxuICAgICAgICByZXR1cm4geFxuICAgIH0pXG59OyIsIlxudmFyIHZET00gPSByZXF1aXJlKCcuL3ZET00vdkRPTS5qcycpO1xuXG5cbi8qKlxuICogUmV0dXJucyB0aGUgQ1NTIHBhdGNoIHRvIGEgZ2l2ZW4gRE9NIG5vZGUuXG4gKiBAbWVtYmVyb2Ygc2VydmVyI2RpZmZcbiAqIEBpbm5lclxuICogQHBhcmFtIHtlbGVtZW50fSBub2RlIERPTSBub2RlLlxuICogQHBhcmFtIHtpbW11dGFibGVMaXN0fSBwYXRoIEN1cnJlbnQgcGF0aCBpbiB0aGUgdHJlZS5cbiAqIEByZXR1cm5zIHtzdHJpbmd9IENTUyBwYXRoXG4gKi9cbmZ1bmN0aW9uIGdldFBhdGgobm9kZSwgcGF0aCkge1xuICAgIHZhciBwID0gcGF0aC5qb2luKFwiPlwiKS5yZXBsYWNlKC8gL2csIFwiXCIpO1xuICAgIGlmIChwLmNoYXJBdCgwKSA9PT0gXCI+XCIpXG4gICAgICAgIHAgPSBwLnN1YnN0cmluZygxKTtcbiAgICByZXR1cm4gcDtcbn1cblxuZnVuY3Rpb24gZ2V0UGFyZW50UGF0aChub2RlLCBwYXRoKSB7XG4gICAgdmFyIHAgPSBub2RlLnBhcmVudE5vZGUsXG4gICAgICAgIG5ld1BhdGggPSBwYXRoLnNsaWNlKDApO1xuICAgIG5ld1BhdGgucG9wKCk7XG4gICAgdmFyIHAgPSBuZXdQYXRoLmpvaW4oXCI+XCIpLnJlcGxhY2UoLyAvZywgXCJcIik7XG4gICAgaWYgKHAuY2hhckF0KDApID09PSBcIj5cIilcbiAgICAgICAgcCA9IHAuc3Vic3RyaW5nKDEpO1xuICAgIHJldHVybiBwO1xufVxuXG5mdW5jdGlvbiBhZGRUb1BhdGgocGF0aCwgdmFsKSB7XG4gICAgdmFyIG5ld1BhdGggPSBwYXRoLnNsaWNlKDApO1xuICAgIG5ld1BhdGgucHVzaCh2YWwpO1xuICAgIHJldHVybiBuZXdQYXRoO1xufVxuLyoqXG4gKiBEaWZmIGFsZ29yaXRobS4gR2VuZXJhdGVzIGEgRE9NIHBhdGNoLlxuICogQHBhcmFtIHtkb2N1bWVudH0gb2xkRG9jIE9sZCBkb2N1bWVudC5cbiAqIEBwYXJhbSB7ZG9jdW1lbnR9IGRvYyBOZXcgZG9jdW1lbnQuXG4gKiBAZmlyZXMgZGlmZi5kb25lXG4gKiBAcmV0dXJucyB7QXJyYXl9IERPTSBwYXRjaCB0byBiZSBzZW5kIHRvIHRoZSBjbGllbnQuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKERPTTEsIERPTTIsIGVudHJ5KSB7XG4gICAgdmFyIG9wcyA9IFtdLFxuICAgICAgICByZW1vdmFscyA9IFtdO1xuXG4gICAgLyoqXG4gICAgICogSGVscGVyIGZ1bmN0aW9uIHRoYXQgaXRlcmF0ZXMgdGhyb3VnaCBib3RoIHRyZWVzIGFuZCBjb21wYXJlcyBub2Rlcy5cbiAgICAgKiBAbWVtYmVyb2Ygc2VydmVyI2RpZmZcbiAgICAgKiBAaW5uZXJcbiAgICAgKiBAcGFyYW0ge2VsZW1lbnR9IG9sZE5vZGUgQ3VycmVudCBub2RlIGluIG9sZERvY1xuICAgICAqIEBwYXJhbSB7ZWxlbWVudH0gbmV3Tm9kZSBDdXJyZW50IG5vZGUgaW4gbmV3RG9jXG4gICAgICogQHBhcmFtIHtpbW11dGFibGVMaXN0fSBwYXRoIEN1cnJlbnQgcGF0aCBpbiB0aGUgdHJlZXNcbiAgICAgKiBAcGFyYW0ge2ludGVnZXJ9IGluZGV4IFRoZSBpbmRleCBvZiB0aGUgbm9kZXMgaW4gdGhlIGN1cnJlbnQgdHJlZSBsZXZlbC5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBoZWxwZXIob2xkTm9kZSwgbmV3Tm9kZSwgcGF0aCwgaW5kZXgsIGNoaWxkTm9kZXNJbmRleCkge1xuICAgICAgICAvL2NoZWNrIGlmIHRoZXJlIGlzIHRoZSBzYW1lIGtpbmQgb2Ygbm9kZSBpbiB0aGlzIHBvc2l0aW9uXG4gICAgICAgIGlmICghKG9sZE5vZGUubmFtZSAhPT0gbmV3Tm9kZS5uYW1lKSkge1xuICAgICAgICAgICAgdmFyIG9sZEtleXMgPSBPYmplY3Qua2V5cyhvbGROb2RlLmF0dHJpYnV0ZXMpLFxuICAgICAgICAgICAgICAgIG5ld0tleXMgPSBPYmplY3Qua2V5cyhuZXdOb2RlLmF0dHJpYnV0ZXMpLFxuICAgICAgICAgICAgICAgIHJlbW92ZWQgPSBvbGRLZXlzLmRpZmYobmV3S2V5cyksXG4gICAgICAgICAgICAgICAgYWRkZWQgPSBuZXdLZXlzLmRpZmYob2xkS2V5cyksXG4gICAgICAgICAgICAgICAgdG9Db21wYXJlID0gbmV3S2V5cy5jb25jYXQob2xkS2V5cykuZGlmZihyZW1vdmVkKS5kaWZmKGFkZGVkKS51bmlxdWUoKTtcblxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0b0NvbXBhcmUubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBpZiAobmV3Tm9kZS5hdHRyaWJ1dGVzW3RvQ29tcGFyZVtpXV0gIT09IG9sZE5vZGUuYXR0cmlidXRlc1t0b0NvbXBhcmVbaV1dKSB7XG4gICAgICAgICAgICAgICAgICAgIG9wcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHQ6IFwiYXR0ckNoYW5nZWRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIG46IGdldFBhdGgobmV3Tm9kZSwgcGF0aCksXG4gICAgICAgICAgICAgICAgICAgICAgICBhOiB0b0NvbXBhcmVbaV0sXG4gICAgICAgICAgICAgICAgICAgICAgICB2OiBuZXdOb2RlLmF0dHJpYnV0ZXNbdG9Db21wYXJlW2ldXVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFkZGVkLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgb3BzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICB0OiBcImF0dHJDaGFuZ2VkXCIsXG4gICAgICAgICAgICAgICAgICAgIG46IGdldFBhdGgobmV3Tm9kZSwgcGF0aCksXG4gICAgICAgICAgICAgICAgICAgIGE6IGFkZGVkW2ldLFxuICAgICAgICAgICAgICAgICAgICB2OiBuZXdOb2RlLmF0dHJpYnV0ZXNbYWRkZWRbaV1dXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJlbW92ZWQubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBvcHMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIHQ6IFwiYXR0clJlbW92ZWRcIixcbiAgICAgICAgICAgICAgICAgICAgbjogZ2V0UGF0aChuZXdOb2RlLCBwYXRoKSxcbiAgICAgICAgICAgICAgICAgICAgYTogcmVtb3ZlZFtpXVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIG5ld0NoaWxkcmVuID0gdHlwZW9mIG5ld05vZGUuY2hpbGROb2RlcyAhPT0gXCJ1bmRlZmluZWRcIiA/IFtdLmNvbmNhdChuZXdOb2RlLmNoaWxkTm9kZXMpIDogW10sXG4gICAgICAgICAgICAgICAgb2xkQ2hpbGRyZW4gPSB0eXBlb2Ygb2xkTm9kZS5jaGlsZE5vZGVzICE9PSBcInVuZGVmaW5lZFwiID8gW10uY29uY2F0KG9sZE5vZGUuY2hpbGROb2RlcykgOiBbXSxcbiAgICAgICAgICAgICAgICBkaXNjcmVwYW5jeSA9IG9sZE5vZGUuY2hpbGROb2Rlcy5sZW5ndGggLSBvbGROb2RlLmNoaWxkcmVuLmxlbmd0aCxcbiAgICAgICAgICAgICAgICBtYXggPSBNYXRoLm1heChuZXdDaGlsZHJlbi5sZW5ndGgsIG9sZENoaWxkcmVuLmxlbmd0aCk7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG1heDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIG9sZENoaWxkID0gb2xkQ2hpbGRyZW5baV0sXG4gICAgICAgICAgICAgICAgICAgIG5ld0NoaWxkID0gbmV3Q2hpbGRyZW5baV0sXG4gICAgICAgICAgICAgICAgICAgIG5ld0luZGV4ID0gaSAtIGRpc2NyZXBhbmN5O1xuICAgICAgICAgICAgICAgIC8vY2hlY2sgaWYgbmV3IE5vZGUgaXMgbm90IGluIG9sZCBkb2MgLT4gaW5zZXJ0XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBvbGRDaGlsZCA9PT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgICAgICAgICBpZiAobmV3Q2hpbGQgaW5zdGFuY2VvZiB2RE9NLnZpcnR1YWxUZXh0Tm9kZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3BzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHQ6IFwidGV4dEFkZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHY6IG5ld05vZGUudmFsdWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcDogZ2V0UGF0aChuZXdOb2RlLCBwYXRoKVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdDaGlsZHJlbi5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpLS07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobmV3Q2hpbGRyZW4ubGVuZ3RoID4gb2xkQ2hpbGRyZW4ubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF4LS07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgbmV3UGF0aCA9IG5ld0NoaWxkLm5hbWUgPT09IFwiaHRtbFwiID8gcGF0aCA6IGFkZFRvUGF0aChwYXRoLCBuZXdDaGlsZC5uYW1lICsgXCI6bnRoLWNoaWxkKFwiICsgKG5ld0luZGV4ICsgMSkgKyBcIilcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICBvcHMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdDogXCJhZGROb2RlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcDogZ2V0UGFyZW50UGF0aChuZXdOb2RlLCBuZXdQYXRoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuOiBuZXdDaGlsZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsOiBuZXdDaGlsZC5saXN0ZW5lcnMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaGw6IG5ld0NoaWxkLmhhc0xpc3RlbmVyc1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpZiAob2xkQ2hpbGQgaW5zdGFuY2VvZiB2RE9NLnZpcnR1YWxUZXh0Tm9kZSAmJiBuZXdDaGlsZCBpbnN0YW5jZW9mIHZET00udmlydHVhbFRleHROb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAob2xkQ2hpbGQudmFsdWUgIT09IG5ld0NoaWxkLnZhbHVlKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdDogXCJ0ZXh0Q2hhbmdlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHY6IG5ld0NoaWxkLnZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwOiBnZXRQYXRoKG9sZE5vZGUsIHBhdGgpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpOiBvbGROb2RlLmNoaWxkTm9kZXMuaW5kZXhPZihvbGRDaGlsZClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG5ld0NoaWxkID09PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9sZENoaWxkIGluc3RhbmNlb2YgdkRPTS52aXJ0dWFsVGV4dE5vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdDogXCJ0ZXh0UmVtb3ZlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpOiBvbGROb2RlLmNoaWxkTm9kZXMuaW5kZXhPZihvbGRDaGlsZCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwOiBnZXRQYXRoKG9sZE5vZGUsIHBhdGgpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBuZXdQYXRoID0gb2xkQ2hpbGQubmFtZSA9PT0gXCJodG1sXCIgPyBwYXRoIDogYWRkVG9QYXRoKHBhdGgsIG9sZENoaWxkLm5hbWUgKyBcIjpudGgtY2hpbGQoXCIgKyAobmV3SW5kZXggKyAxKSArIFwiKVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVtb3ZhbHMudW5zaGlmdCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0OiBcInJlbW92ZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcDogZ2V0UGF0aChvbGRDaGlsZCwgbmV3UGF0aCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpOiBuZXdJbmRleCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGw6IG9sZENoaWxkLmxpc3RlbmVycyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhsOiBvbGRDaGlsZC5oYXNMaXN0ZW5lcnNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAob2xkQ2hpbGQgaW5zdGFuY2VvZiB2RE9NLnZpcnR1YWxUZXh0Tm9kZSAmJiAhKG5ld0NoaWxkIGluc3RhbmNlb2YgdkRPTS52aXJ0dWFsVGV4dE5vZGUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHQ6IFwidGV4dFJlbW92ZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaTogY2hpbGROb2Rlc0luZGV4LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcDogZ2V0UGF0aChvbGROb2RlLCBwYXRoKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb2xkQ2hpbGRyZW4uc3BsaWNlKGksIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpLS07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuZXdDaGlsZHJlbi5sZW5ndGggPCBvbGRDaGlsZHJlbi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1heC0tO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghKG9sZENoaWxkIGluc3RhbmNlb2YgdkRPTS52aXJ0dWFsVGV4dE5vZGUpICYmIG5ld0NoaWxkIGluc3RhbmNlb2YgdkRPTS52aXJ0dWFsVGV4dE5vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0OiBcInRleHRBZGRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2OiBuZXdOb2RlLnZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHA6IGdldFBhdGgobmV3Tm9kZSwgcGF0aClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3Q2hpbGRyZW4uc3BsaWNlKGksIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaS0tO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5ld0NoaWxkcmVuLmxlbmd0aCA+IG9sZENoaWxkcmVuLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1heC0tO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBvbGRDaGlsZC5uYW1lID09PSBcInVuZGVmaW5lZFwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZGFuXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgbmV3UGF0aCA9IG9sZENoaWxkLm5hbWUgPT09IFwiaHRtbFwiID8gcGF0aCA6IGFkZFRvUGF0aChwYXRoLCBvbGRDaGlsZC5uYW1lICsgXCI6bnRoLWNoaWxkKFwiICsgKG5ld0luZGV4ICsgMSkgKyBcIilcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobmV3Q2hpbGQuaGFzTGlzdGVuZXJzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGRvbU5vZGUgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGdldFBhdGgob2xkQ2hpbGQsIG5ld1BhdGgpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBldmVudCBpbiBuZXdDaGlsZC5saXN0ZW5lcnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaz0wOyBrPG5ld0NoaWxkLmxpc3RlbmVyc1tldmVudF0ubGVuZ3RoOyBrKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBsaXN0ZW5lciA9IG5ld0NoaWxkLmxpc3RlbmVyc1tldmVudF1ba107XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWxpc3RlbmVyLl9pc0F0dGFjaGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGlzdGVuZXIuX2lzQXR0YWNoZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRvbU5vZGUuYWRkRXZlbnRMaXN0ZW5lcihldmVudCwgbGlzdGVuZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChsaXN0ZW5lci5fZGV0YWNoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZG9tTm9kZS5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50LCBsaXN0ZW5lcik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3Q2hpbGQubGlzdGVuZXJzW2V2ZW50XS5zcGxpY2UoaywxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBrLS07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoZWxwZXIob2xkQ2hpbGQsIG5ld0NoaWxkLCBuZXdQYXRoLCBuZXdJbmRleCwgaSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBvcHMucHVzaCh7XG4gICAgICAgICAgICAgICAgdDogXCJyZXBsYWNlXCIsXG4gICAgICAgICAgICAgICAgcDogZ2V0UGF0aChuZXdOb2RlLCBwYXRoKSxcbiAgICAgICAgICAgICAgICBuOiBuZXdOb2RlLFxuICAgICAgICAgICAgICAgIGk6IGluZGV4LFxuICAgICAgICAgICAgICAgIGw6IG5ld05vZGUubGlzdGVuZXJzLFxuICAgICAgICAgICAgICAgIGhsOiBuZXdOb2RlLmhhc0xpc3RlbmVyc1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgaGVscGVyKERPTTEsIERPTTIsIFtlbnRyeV0sIDEpO1xuICAgIHJldHVybiBvcHMuY29uY2F0KHJlbW92YWxzKTtcbn0iLCJtb2R1bGUuZXhwb3J0cy5vcHRpb25zID0ge1xuICAgICAgICBhdXRvVXBkYXRlOiB0cnVlLFxuICAgICAgICB1cGRhdGVJbnRlcnZhbDogMVxufSIsIlxudmFyIHZET00gPSByZXF1aXJlKCcuL3ZET00vdkRPTS5qcycpLFxuICAgIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscy5qcycpLFxuICAgIGRpZmYgPSByZXF1aXJlKCcuL2RpZmYuanMnKSxcbiAgICBjbG9uZU9iamVjdCA9IHJlcXVpcmUoXCJjbG9uZVwiKSxcbiAgICByZW5kZXJpbmcgPSBmYWxzZTtcblxuZnVuY3Rpb24gaGFuZGxlTGlzdGVuZXJzKGRvbU5vZGUsIGxpc3RlbmVycykge1xuICAgIGZvciAodmFyIGV2ZW50IGluIGxpc3RlbmVycykge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsaXN0ZW5lcnNbZXZlbnRdLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGxpc3RlbmVyID0gbGlzdGVuZXJzW2V2ZW50XVtpXTtcbiAgICAgICAgICAgICAgICBpZiAoIWxpc3RlbmVyLl9pc0F0dGFjaGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGxpc3RlbmVyLl9pc0F0dGFjaGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgZG9tTm9kZS5hZGRFdmVudExpc3RlbmVyKGV2ZW50LCBsaXN0ZW5lcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBpc1JlbmRlcmluZzogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiByZW5kZXJpbmc7XG4gICAgfSxcbiAgICBhZnRlclJlbmRlckNhbGxiYWNrczogW10sXG4gICAgdXBkYXRlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGQgPSBkaWZmKHZET00ub2xkRE9NLCB2RE9NLm5ld0RPTSwgXCJodG1sXCIpO1xuICAgICAgICBpZiAoIXV0aWxzLmlzTm9kZSgpKSB7XG4gICAgICAgICAgICBpZiAoZC5sZW5ndGggPiAwKVxuICAgICAgICAgICAgICAgIHRoaXMucmVuZGVyKGQsIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCJodG1sXCIpKTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuYWZ0ZXJSZW5kZXJDYWxsYmFja3MubGVuZ3RoOyBpKyspXG4gICAgICAgICAgICB0aGlzLmFmdGVyUmVuZGVyQ2FsbGJhY2tzW2ldKCk7XG4gICAgICAgIHZET00ub2xkRE9NID0gY2xvbmVPYmplY3QodkRPTS5uZXdET00pO1xuICAgICAgICB2RE9NLm5ld0RPTS5jaGFuZ2VkID0gZmFsc2U7XG4gICAgICAgIHJldHVybiBkaWZmO1xuICAgIH0sXG4gICAgcmVuZGVyOiBmdW5jdGlvbihvcHMsbm9kZSkge1xuICAgICAgICB2YXIgdCA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgICAgICBjb25zb2xlLmxvZyhcInJlbmRlcmluZyBzdGFydFwiLCB0LCBvcHMpO1xuICAgICAgICByZW5kZXJpbmcgPSB0cnVlO1xuICAgICAgICB2YXIgcm9vdCA9IG5vZGUgPyBub2RlIDogZG9jdW1lbnQ7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgb3BzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgb3AgPSBvcHNbaV07XG4gICAgICAgICAgICBzd2l0Y2ggKG9wLnQpIHtcbiAgICAgICAgICAgICAgICBjYXNlIFwicmVtb3ZlXCI6XG4gICAgICAgICAgICAgICAgICAgIHZhciBub2RlID0gcm9vdC5xdWVyeVNlbGVjdG9yKG9wLnApLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50ID0gbm9kZS5wYXJlbnROb2RlID8gbm9kZS5wYXJlbnROb2RlIDogcm9vdDtcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50LnJlbW92ZUNoaWxkKG5vZGUpO1xuICAgICAgICAgICAgICAgICAgICBpZiAob3AuaGwpXG4gICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGVMaXN0ZW5lcnMobm9kZSwgb3AubCk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgXCJhZGROb2RlXCI6XG4gICAgICAgICAgICAgICAgICAgIHZhciBuZXdOb2RlID0gdXRpbHMuY3JlYXRlTm9kZShvcC5uLHZET00pLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50ID0gb3AucC5sZW5ndGggPiAwID8gcm9vdC5xdWVyeVNlbGVjdG9yKG9wLnApIDogcm9vdDtcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50LmFwcGVuZENoaWxkKG5ld05vZGUpO1xuICAgICAgICAgICAgICAgICAgICBpZiAob3AuaGwpXG4gICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGVMaXN0ZW5lcnMobmV3Tm9kZSwgb3AubCk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgXCJyZXBsYWNlXCI6XG4gICAgICAgICAgICAgICAgICAgIHZhciBuZXdOb2RlID0gdXRpbHMuY3JlYXRlTm9kZShvcC5uLHZET00pLFxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZSA9IHJvb3QucXVlcnlTZWxlY3RvcihvcC5wKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudCA9IG5vZGUucGFyZW50Tm9kZSA/IG5vZGUucGFyZW50Tm9kZSA6IHJvb3Q7XG4gICAgICAgICAgICAgICAgICAgIHBhcmVudC5yZXBsYWNlQ2hpbGQobmV3Tm9kZSwgbm9kZSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChvcC5obClcbiAgICAgICAgICAgICAgICAgICAgICAgIGhhbmRsZUxpc3RlbmVycyhuZXdOb2RlLCBvcC5sKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBcInRleHRDaGFuZ2VcIjpcbiAgICAgICAgICAgICAgICAgICAgdmFyIHBhcmVudCA9IHJvb3QucXVlcnlTZWxlY3RvcihvcC5wKTtcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50LmNoaWxkTm9kZXNbb3AuaV0ubm9kZVZhbHVlID0gb3AudjtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBcImF0dHJDaGFuZ2VkXCI6XG4gICAgICAgICAgICAgICAgICAgIHJvb3QucXVlcnlTZWxlY3RvcihvcC5uKS5zZXRBdHRyaWJ1dGUob3AuYSwgb3Audik7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNvbnNvbGUubG9nKFwicmVuZGVyaW5nIHN0b3BcIiwgKG5ldyBEYXRlKCkuZ2V0VGltZSgpIC0gdCkgLyAxMDAwKTtcbiAgICAgICAgcmVuZGVyaW5nID0gZmFsc2U7XG4gICAgfVxufSIsImNoZWNrQXR0ciA9IGZ1bmN0aW9uIChydWxlcywgbm9kZSkge1xuICAgIGlmICh0eXBlb2YgcnVsZXMuYXR0cnMgPT09IFwidW5kZWZpbmVkXCIpXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIHZhciBhdHRyaWJ1dGVLZXlzID0gT2JqZWN0LmtleXMobm9kZS5hdHRyaWJ1dGVzKTtcbiAgICBpZiAocnVsZXMuYXR0cnMubGVuZ3RoID4gYXR0cmlidXRlS2V5cy5sZW5ndGgpXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICBmb3IgKHZhciBpPTA7IGk8cnVsZXMuYXR0cnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGF0dHIgPSBydWxlcy5hdHRyc1tpXSxcbiAgICAgICAgICAgIG5vZGVBdHRyID0gbm9kZS5hdHRyaWJ1dGVzW2F0dHIubmFtZS50b0xvd2VyQ2FzZSgpXTtcbiAgICAgICAgaWYgKHR5cGVvZiBub2RlQXR0ciA9PT0gXCJ1bmRlZmluZWRcIilcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgaWYgKHR5cGVvZiBhdHRyLm9wZXJhdG9yICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgICAgICBzd2l0Y2ggKGF0dHIub3BlcmF0b3IpIHtcbiAgICAgICAgICAgICAgICBjYXNlIFwiPVwiOlxuICAgICAgICAgICAgICAgICAgICBpZiAobm9kZUF0dHIgIT09IGF0dHIudmFsdWUpIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICBjYXNlIFwifj1cIjpcbiAgICAgICAgICAgICAgICBjYXNlIFwiKj1cIjpcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5vZGVBdHRyLmluZGV4T2YoYXR0ci52YWx1ZSkgIT09IC0xKSByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgY2FzZSBcInw9XCI6XG4gICAgICAgICAgICAgICAgY2FzZSBcIl49XCI6XG4gICAgICAgICAgICAgICAgICAgIGlmIChub2RlQXR0ci5pbmRleE9mKGF0dHIudmFsdWUpID09PSAwKSByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgY2FzZSBcIiQ9XCI6XG4gICAgICAgICAgICAgICAgICAgIGlmIChub2RlQXR0ci5pbmRleE9mKGF0dHIudmFsdWUsIG5vZGVBdHRyLmxlbmd0aCAtIGF0dHIudmFsdWUubGVuZ3RoKSAhPT0gLTEpIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn1cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGNoZWNrQXR0cjpjaGVja0F0dHJcbn0iLCJmdW5jdGlvbiBjaGVja0NsYXNzZXMocnVsZXMsIG5vZGUpIHtcbiAgICBpZiAodHlwZW9mIHJ1bGVzLmNsYXNzTmFtZXMgPT09IFwidW5kZWZpbmVkXCIpXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIGZvciAodmFyIGk9MDsgaTxydWxlcy5jbGFzc05hbWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChub2RlLmNsYXNzTmFtZXMuaW5kZXhPZihydWxlcy5jbGFzc05hbWVzW2ldKSA9PT0gLTEpXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiBjaGVja0lEKHJ1bGVzLCBub2RlKSB7XG4gICAgaWYgKHR5cGVvZiBydWxlcy5pZCA9PT0gXCJ1bmRlZmluZWRcIilcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgaWYgKHJ1bGVzLmlkID09PSBub2RlLmlkKVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICByZXR1cm4gZmFsc2U7ICAgIFxufVxuXG5mdW5jdGlvbiBjaGVja1RhZ05hbWUocnVsZXMsIG5vZGUpIHtcbiAgICBpZiAodHlwZW9mIHJ1bGVzLnRhZ05hbWUgPT09IFwidW5kZWZpbmVkXCIgfHwgcnVsZXMudGFnTmFtZSA9PT0gXCIqXCIpXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIGlmIChydWxlcy50YWdOYW1lID09PSBub2RlLm5hbWUpXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIHJldHVybiBmYWxzZTsgICAgXG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGNoZWNrQ2xhc3NlczpjaGVja0NsYXNzZXMsXG4gICAgY2hlY2tJRDpjaGVja0lELFxuICAgIGNoZWNrVGFnTmFtZTpjaGVja1RhZ05hbWVcbn0iLCJ2YXIgc2VsZWN0b3JVdGlscyA9IHJlcXVpcmUoJy4vc2VsZWN0b3JVdGlscy5qcycpO1xuZnVuY3Rpb24gY2hlY2tOZXN0aW5nKHJ1bGVzLCBub2RlKSB7XG4gICAgaWYgKHR5cGVvZiBydWxlcy5uZXN0aW5nT3BlcmF0b3IgPT09IFwidW5kZWZpbmVkXCIgfHwgIXJ1bGVzLm5lc3RpbmdPcGVyYXRvciB8fCBydWxlcy5uZXN0aW5nT3BlcmF0b3IgPT09IFwiPlwiKVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB2YXIgbmV4dFJ1bGVzID0gc2VsZWN0b3JVdGlscy5nZXROZXh0UnVsZXMocnVsZXMpO1xuICAgIGlmICh0eXBlb2YgbmV4dFJ1bGVzICE9PSBcInVuZGVmaW5lZFwiICYmIHR5cGVvZiBuZXh0UnVsZXMubmVzdGluZ09wZXJhdG9yICE9PSBcInVuZGVmaW5lZFwiICYmIG5leHRSdWxlcy5uZXN0aW5nT3BlcmF0b3IpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHZhciBwcmV2U2libGluZyA9IG5vZGU7XG4gICAgd2hpbGUgKHR5cGVvZiBydWxlcyAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICBzd2l0Y2ggKHJ1bGVzLm5lc3RpbmdPcGVyYXRvcikge1xuICAgICAgICAgICAgY2FzZSBcIitcIjpcbiAgICAgICAgICAgIGNhc2UgXCJ+XCI6XG4gICAgICAgICAgICAgICAgdmFyIHNpYmxpbmdzID0gbm9kZS5wYXJlbnROb2RlLmNoaWxkcmVuLFxuICAgICAgICAgICAgICAgICAgICBzaWJsaW5nO1xuICAgICAgICAgICAgICAgIHN3aXRjaCAocnVsZXMubmVzdGluZ09wZXJhdG9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCIrXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgaW5kZXggPSBzaWJsaW5ncy5pbmRleE9mKHByZXZTaWJsaW5nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbmRleCA9PT0gMClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICBzaWJsaW5nID0gc2libGluZ3NbaW5kZXggLSAxXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByZXZTaWJsaW5nID0gc2libGluZztcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghY2hlY2tUYWdOYW1lKHJ1bGVzLnByZXZSdWxlLCBzaWJsaW5nKSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcIn5cIjpcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpbmRleCA9IHNpYmxpbmdzLmluZGV4T2YocHJldlNpYmxpbmcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4ID09PSAwKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdoaWxlIChpbmRleD4wKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5kZXgtLTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzaWJsaW5nID0gc2libGluZ3NbaW5kZXhdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjaGVja1RhZ05hbWUocnVsZXMucHJldlJ1bGUsIHNpYmxpbmcpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByZXZTaWJsaW5nID0gc2libGluZztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBydWxlcyA9IHJ1bGVzLnByZXZSdWxlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn1cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGNoZWNrTmVzdGluZzpjaGVja05lc3Rpbmdcbn0iLCJ2YXIgc2VsZWN0b3JVdGlscyA9IHJlcXVpcmUoJy4vc2VsZWN0b3JVdGlscy5qcycpO1xuZnVuY3Rpb24gY2hlY2tQc2V1ZG9zKHJ1bGVzLCBub2RlKSB7XG4gICAgaWYgKHR5cGVvZiBydWxlcy5wc2V1ZG9zID09PSBcInVuZGVmaW5lZFwiKVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB2YXIgcHNldWRvcyA9IHJ1bGVzLnBzZXVkb3M7XG4gICAgZm9yICh2YXIgaT0wOyBpPHBzZXVkb3MubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHBzZXVkbyA9IHBzZXVkb3NbaV07XG4gICAgICAgIHN3aXRjaChwc2V1ZG8ubmFtZSkge1xuICAgICAgICAgICAgY2FzZSBcImZpcnN0LWNoaWxkXCI6XG4gICAgICAgICAgICBjYXNlIFwibGFzdC1jaGlsZFwiOlxuICAgICAgICAgICAgY2FzZSBcIm9ubHktY2hpbGRcIjpcbiAgICAgICAgICAgIGNhc2UgXCJudGgtY2hpbGRcIjpcbiAgICAgICAgICAgIGNhc2UgXCJudGgtbGFzdC1jaGlsZFwiOlxuICAgICAgICAgICAgICAgIHZhciBjaGlsZHJlbiA9IG5vZGUucGFyZW50Tm9kZS5jaGlsZHJlbjtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHJ1bGVzLnRhZ05hbWUgIT09IFwidW5kZWZpbmVkXCIpXG4gICAgICAgICAgICAgICAgICAgIGNoaWxkcmVuID0gY2hpbGRyZW4uZmlsdGVyKGZ1bmN0aW9uKGNoaWxkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2hpbGQubmFtZSA9PT0gcnVsZXMudGFnTmFtZTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgc3dpdGNoKHBzZXVkby5uYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJmaXJzdC1jaGlsZFwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNoaWxkcmVuLmluZGV4T2Yobm9kZSkgPT09IDA7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJsYXN0LWNoaWxkXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2hpbGRyZW4uaW5kZXhPZihub2RlKSA9PT0gY2hpbGRyZW4ubGVuZ3RoIC0gMTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcIm50aC1jaGlsZFwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNoaWxkcmVuLmluZGV4T2Yobm9kZSkgKyAxID09PSBwYXJzZUludChwc2V1ZG8udmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIFwibnRoLWxhc3QtY2hpbGRcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjaGlsZHJlbi5yZXZlcnNlKCkuaW5kZXhPZihub2RlKSArIDEgPT09IHBhcnNlSW50KHBzZXVkby52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJvbmx5LWNoaWxkXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2hpbGRyZW4ubGVuZ3RoID09PSAxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgXCJoYXNcIjpcbiAgICAgICAgICAgICAgICB2YXIgc2VsZWN0ZWROb2RlcyA9IFtdLFxuICAgICAgICAgICAgICAgIG5leHRSdWxlcyA9IHNlbGVjdG9yVXRpbHMuZ2V0TmV4dFJ1bGVzKHBzZXVkby52YWx1ZSk7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBub2RlLmNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdG9yVXRpbHMudHJhdmVyc2VWRE9NKG5leHRSdWxlcywgbm9kZS5jaGlsZHJlbltpXSwgc2VsZWN0ZWROb2RlcywgbmV4dFJ1bGVzLm5lc3RpbmdPcGVyYXRvciA9PT0gXCI+XCIsIHRydWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gc2VsZWN0ZWROb2Rlcy5sZW5ndGggPiAwO1xuICAgICAgICAgICAgY2FzZSBcIm5vdFwiOlxuICAgICAgICAgICAgICAgIHZhciBzZWxlY3RlZE5vZGVzID0gW10sXG4gICAgICAgICAgICAgICAgbmV4dFJ1bGVzID0gc2VsZWN0b3JVdGlscy5nZXROZXh0UnVsZXMocHNldWRvLnZhbHVlKTtcbiAgICAgICAgICAgICAgICBzZWxlY3RvclV0aWxzLnRyYXZlcnNlVkRPTShuZXh0UnVsZXMsIG5vZGUsIHNlbGVjdGVkTm9kZXMsIG5leHRSdWxlcy5uZXN0aW5nT3BlcmF0b3IgPT09IFwiPlwiLCB0cnVlKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gc2VsZWN0ZWROb2Rlcy5sZW5ndGggPT09IDA7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlOyAgICBcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgY2hlY2tQc2V1ZG9zOmNoZWNrUHNldWRvc1xufSIsIlxudmFyIENzc1NlbGVjdG9yUGFyc2VyID0gcmVxdWlyZSgnY3NzLXNlbGVjdG9yLXBhcnNlcicpLkNzc1NlbGVjdG9yUGFyc2VyLFxuICAgIHNwYXJzZXIgPSBuZXcgQ3NzU2VsZWN0b3JQYXJzZXIoKSxcbiAgICBzZWxlY3RvclV0aWxzID0gcmVxdWlyZSgnLi9zZWxlY3RvclV0aWxzLmpzJyksXG4gICAgYXR0cmlidXRlcyA9IHJlcXVpcmUoJy4vYXR0cmlidXRlcy5qcycpLFxuICAgIGlkZW50aWZpZXJzID0gcmVxdWlyZSgnLi9pZGVudGlmaWVycy5qcycpLFxuICAgIG5lc3RpbmcgPSByZXF1aXJlKCcuL25lc3RpbmcuanMnKSxcbiAgICBwc2V1ZG9zID0gcmVxdWlyZSgnLi9wc2V1ZG9zLmpzJyk7XG5cbnNwYXJzZXIucmVnaXN0ZXJTZWxlY3RvclBzZXVkb3MoJ2hhcycsICdub3QnKTtcbnNwYXJzZXIucmVnaXN0ZXJOZXN0aW5nT3BlcmF0b3JzKCc+JywgJysnLCAnficpO1xuc3BhcnNlci5yZWdpc3RlckF0dHJFcXVhbGl0eU1vZHMoJ14nLCAnJCcsICcqJywgJ34nLCAnfCcpO1xuc3BhcnNlci5lbmFibGVTdWJzdGl0dXRlcygpO1xuXG52YXIgY2hlY2tzID0gW1xuICAgIGlkZW50aWZpZXJzLmNoZWNrVGFnTmFtZSxcbiAgICBpZGVudGlmaWVycy5jaGVja0lELFxuICAgIGlkZW50aWZpZXJzLmNoZWNrQ2xhc3NlcyxcbiAgICBhdHRyaWJ1dGVzLmNoZWNrQXR0cixcbiAgICBuZXN0aW5nLmNoZWNrTmVzdGluZyxcbiAgICBwc2V1ZG9zLmNoZWNrUHNldWRvc1xuXVxuY2hlY2tIaXRzID0gZnVuY3Rpb24ocnVsZXMsIGN1cnJlbnRWRE9NKSB7XG4gICAgdmFyIHJlcyA9IHRydWU7XG4gICAgZm9yICh2YXIgaT0wOyBpPGNoZWNrcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoIWNoZWNrc1tpXShydWxlcywgY3VycmVudFZET00pKVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn1cblxubW9kdWxlLmV4cG9ydHMucXVlcnkgPSBmdW5jdGlvbih2aXJ0dWFsTm9kZSwgc2VsZWN0b3IpIHtcbiAgICB2YXIgcGFyc2VkU2VsZWN0b3IgPSBzcGFyc2VyLnBhcnNlKHNlbGVjdG9yKSxcbiAgICAgICAgc2VsZWN0ZWROb2RlcyA9IFtdLFxuICAgICAgICBuZXh0UnVsZXMgPSBzZWxlY3RvclV0aWxzLmdldE5leHRSdWxlcyhwYXJzZWRTZWxlY3Rvcik7XG4gICAgLy9jb25zb2xlLmxvZyhwYXJzZWRTZWxlY3RvcilcbiAgICBpZiAoc2VsZWN0b3JVdGlscy5oYXNNb3JlUnVsZXMocGFyc2VkU2VsZWN0b3IpKVxuICAgICAgICBzZWxlY3RvclV0aWxzLnRyYXZlcnNlVkRPTShuZXh0UnVsZXMsIHZpcnR1YWxOb2RlLmNoaWxkcmVuWzBdLCBzZWxlY3RlZE5vZGVzLCBuZXh0UnVsZXMubmVzdGluZ09wZXJhdG9yID09PSBcIj5cIiwgZmFsc2UsIG51bGwpO1xuICAgIHJldHVybiBzZWxlY3RlZE5vZGVzO1xufSIsInZhciB2RE9NID0gcmVxdWlyZSgnLi4vdkRPTS92RE9NLmpzJyk7XG5mdW5jdGlvbiBoYXNNb3JlUnVsZXMocnVsZXMpIHtcbiAgICByZXR1cm4gdHlwZW9mIHJ1bGVzLnJ1bGUgIT09IFwidW5kZWZpbmVkXCIgfHwgdHlwZW9mIHJ1bGVzLnJ1bGVTZXQgIT09IFwidW5kZWZpbmVkXCJ8fCB0eXBlb2YgcnVsZXMuc2VsZWN0b3JzICE9PSBcInVuZGVmaW5lZFwiO1xufVxuXG5mdW5jdGlvbiBnZXROZXh0UnVsZXMocnVsZXMpIHtcbiAgICBpZiAodHlwZW9mIHJ1bGVzLnJ1bGVTZXQgIT09IFwidW5kZWZpbmVkXCIpXG4gICAgICAgIHJldHVybiBydWxlcy5ydWxlU2V0LnJ1bGU7XG4gICAgaWYgKHR5cGVvZiBydWxlcy5zZWxlY3RvcnMgIT09IFwidW5kZWZpbmVkXCIpXG4gICAgICAgIHJldHVybiBydWxlcy5zZWxlY3RvcnMubWFwKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgICAgIHJldHVybiBpdGVtLnJ1bGVcbiAgICAgICAgfSk7XG4gICAgZWxzZSByZXR1cm4gcnVsZXMucnVsZTtcbn1cblxuZnVuY3Rpb24gdHJhdmVyc2VWRE9NKHJ1bGVzLCBjdXJyZW50VkRPTSwgc2VsZWN0ZWROb2RlcywgZXhhY3QsIHBzZXVkb01vZGUpIHtcbiAgICBpZiAodHlwZW9mIHJ1bGVzLmxlbmd0aCA9PT0gXCJ1bmRlZmluZWRcIilcbiAgICAgICAgdmFyIGl0ZXJhdG9yID0gW3J1bGVzXTtcbiAgICBlbHNlXG4gICAgICAgIHZhciBpdGVyYXRvciA9IHJ1bGVzO1xuICAgIGZvciAodmFyIHI9MDsgcjxpdGVyYXRvci5sZW5ndGg7IHIrKykge1xuICAgICAgICB2YXIgcnVsZSA9IGl0ZXJhdG9yW3JdO1xuICAgICAgICBpZiAocnVsZS5pZCAmJiAhcHNldWRvTW9kZSkge1xuICAgICAgICAgICAgdmFyIGlkTm9kZSA9IHZET00uaWROb2Rlc1tydWxlLmlkXTtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgaWROb2RlICE9PSBcInVuZGVmaW5lZFwiICYmIGlkTm9kZS5sZW5ndGggIT09IFtdKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHJ1bGUuaWQ7XG4gICAgICAgICAgICAgICAgY3VycmVudFZET00gPSBpZE5vZGU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNoZWNrSGl0cyhydWxlLCBjdXJyZW50VkRPTSkpIHtcbiAgICAgICAgICAgIGlmICghaGFzTW9yZVJ1bGVzKHJ1bGUpKSB7XG4gICAgICAgICAgICAgICAgaWYgKHNlbGVjdGVkTm9kZXMuaW5kZXhPZihjdXJyZW50VkRPTSkgPT09IC0xKVxuICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZE5vZGVzLnB1c2goY3VycmVudFZET00pO1xuICAgICAgICAgICAgICAgIGlmICghZXhhY3QgJiYgY3VycmVudFZET00uY2hpbGRyZW4ubGVuZ3RoID4gMClcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjdXJyZW50VkRPTS5jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHJhdmVyc2VWRE9NKHJ1bGUsIGN1cnJlbnRWRE9NLmNoaWxkcmVuW2ldLCBzZWxlY3RlZE5vZGVzLCBleGFjdCwgcHNldWRvTW9kZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhciBuZXh0UnVsZXMgPSBnZXROZXh0UnVsZXMocnVsZSk7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBuZXh0UnVsZXMubmVzdGluZ09wZXJhdG9yICE9PSBcInVuZGVmaW5lZFwiICYmIG5leHRSdWxlcy5uZXN0aW5nT3BlcmF0b3IgJiYgbmV4dFJ1bGVzLm5lc3RpbmdPcGVyYXRvciAhPT0gXCI+XCIpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV4dFJ1bGVzLnByZXZSdWxlID0gcnVsZTtcbiAgICAgICAgICAgICAgICAgICAgdHJhdmVyc2VWRE9NKG5leHRSdWxlcywgY3VycmVudFZET00sIHNlbGVjdGVkTm9kZXMsIGV4YWN0LCBwc2V1ZG9Nb2RlKTtcbiAgICAgICAgICAgICAgICB9IGVsc2VcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5leHRSdWxlcylcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY3VycmVudFZET00uY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cmF2ZXJzZVZET00obmV4dFJ1bGVzLCBjdXJyZW50VkRPTS5jaGlsZHJlbltpXSwgc2VsZWN0ZWROb2RlcywgbmV4dFJ1bGVzLm5lc3RpbmdPcGVyYXRvciA9PT0gXCI+XCIsIHBzZXVkb01vZGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2VcbiAgICAgICAgICAgIGlmICghZXhhY3QgJiYgY3VycmVudFZET00uY2hpbGRyZW4ubGVuZ3RoID4gMClcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGN1cnJlbnRWRE9NLmNoaWxkcmVuLmxlbmd0aDsgaSsrKVxuICAgICAgICAgICAgICAgICAgICB0cmF2ZXJzZVZET00ocnVsZXMsIGN1cnJlbnRWRE9NLmNoaWxkcmVuW2ldLCBzZWxlY3RlZE5vZGVzLCBleGFjdCwgcHNldWRvTW9kZSk7XG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBoYXNNb3JlUnVsZXM6aGFzTW9yZVJ1bGVzLFxuICAgIGdldE5leHRSdWxlczpnZXROZXh0UnVsZXMsXG4gICAgdHJhdmVyc2VWRE9NOnRyYXZlcnNlVkRPTVxufSIsImZ1bmN0aW9uIGNyZWF0ZU5vZGUoZGF0YSwgdkRPTSkge1xuICAgIHZhciBub2RlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChkYXRhLm5hbWUpO1xuICAgIGZvciAodmFyIGkgaW4gZGF0YS5hdHRyaWJ1dGVzKSB7XG4gICAgICAgIG5vZGUuc2V0QXR0cmlidXRlKGksIGRhdGEuYXR0cmlidXRlc1tpXSk7XG4gICAgfVxuICAgIGlmICh0eXBlb2YgZGF0YS5jaGlsZE5vZGVzICE9PSBcInVuZGVmaW5lZFwiKVxuICAgICAgICBmb3IgKHZhciBpPTA7IGk8ZGF0YS5jaGlsZE5vZGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgY2hpbGQgPWNyZWF0ZU5vZGUoZGF0YS5jaGlsZE5vZGVzW2ldLCB2RE9NKTtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgY2hpbGQgIT09IFwidW5kZWZpbmVkXCIpXG4gICAgICAgICAgICAgICAgbm9kZS5hcHBlbmRDaGlsZChjaGlsZCk7XG4gICAgICAgIH1cbiAgICBpZiAoZGF0YSBpbnN0YW5jZW9mIHZET00udmlydHVhbFRleHROb2RlKVxuICAgICAgICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoZGF0YS52YWx1ZSk7XG4gICAgcmV0dXJuIG5vZGU7XG59XG52YXIgcnF1aWNrRXhwciA9IC9eKD86XFxzKig8W1xcd1xcV10rPilbXj5dKnwjKFtcXHctXSspKSQvO1xuZnVuY3Rpb24gaXNIVE1MKHN0cikge1xuICAgIGlmIChzdHJbMF0gPT09IFwiPFwiICYmIHN0cltzdHIubGVuZ3RoIC0gMV0gPT09IFwiPlwiICYmIHN0ci5sZW5ndGggPj0gMykge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIG1hdGNoID0gcnF1aWNrRXhwci5leGVjKHN0cik7XG4gICAgICAgIHJldHVybiBtYXRjaCAhPT0gbnVsbCAmJiBtYXRjaFsxXTtcbiAgICB9XG59XG5mdW5jdGlvbiBpc05vZGUoKSB7XG4gICAgdmFyIHJlcyA9IGZhbHNlOyBcbiAgICB0cnkge1xuICAgICAgICByZXMgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoZ2xvYmFsLnByb2Nlc3MpID09PSAnW29iamVjdCBwcm9jZXNzXScgXG4gICAgfSBjYXRjaChlKSB7fVxuICAgIHJldHVybiByZXM7XG59XG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBjcmVhdGVOb2RlOiBjcmVhdGVOb2RlLFxuICAgIGlzSFRNTDogaXNIVE1MLFxuICAgIGlzTm9kZTogaXNOb2RlXG59IiwidmFyIHZET01VdGlscyA9IHJlcXVpcmUoJy4vdkRPTVV0aWxzLmpzJyk7XG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICAvL2NyZWF0ZXMgYSBuZXcgdml0dWFsIG5vZGUgZnJvbSBwYXNzZWQgaHRtbCBhbmQgYXBwZW5kcyBpdCB0byBhbGwgdmlydHVhbCBub2Rlc1xuICAgIGFkZENoaWxkRnJvbUh0bWw6IGZ1bmN0aW9uKG5vZGVzLCBodG1sLCBwb3NpdGlvbikge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHN3aXRjaCAodHlwZW9mIHBvc2l0aW9uKSB7XG4gICAgICAgICAgICBjYXNlIFwic3RyaW5nXCI6XG4gICAgICAgICAgICAgICAgICAgIGlmIChwb3NpdGlvbiA9PT0gXCJzdGFydFwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpPTA7IGk8bm9kZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgbmV3RE9NID0gdGhpcy5jcmVhdGVWRE9NKGh0bWwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGo9MDsgajxuZXdET00uY2hpbGRyZW4ubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3RE9NLmNoaWxkcmVuW2pdLnBhcmVudE5vZGUgPSBub2Rlc1tpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9kZXNbaV0uY2hpbGRyZW4udW5zaGlmdChuZXdET00uY2hpbGRyZW5bal0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2Rlc1tpXS5jaGlsZE5vZGVzLnVuc2hpZnQobmV3RE9NLmNoaWxkTm9kZXNbal0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobmV3RE9NLmNoaWxkTm9kZXNbal0uaWQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLmlkTm9kZXNbbmV3RE9NLmNoaWxkTm9kZXNbal0uaWRdID0gbmV3RE9NLmNoaWxkTm9kZXNbal07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGlmIChwb3NpdGlvbiA9PT0gXCJlbmRcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaT0wOyBpPG5vZGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG5ld0RPTSA9IHRoaXMuY3JlYXRlVkRPTShodG1sKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBqPTA7IGo8bmV3RE9NLmNoaWxkcmVuLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld0RPTS5jaGlsZHJlbltqXS5wYXJlbnROb2RlID0gbm9kZXNbaV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVzW2ldLmNoaWxkcmVuLnB1c2gobmV3RE9NLmNoaWxkcmVuW2pdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9kZXNbaV0uY2hpbGROb2Rlcy5wdXNoKG5ld0RPTS5jaGlsZE5vZGVzW2pdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5ld0RPTS5jaGlsZE5vZGVzW2pdLmlkKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5pZE5vZGVzW25ld0RPTS5jaGlsZE5vZGVzW2pdLmlkXSA9IG5ld0RPTS5jaGlsZE5vZGVzW2pdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcIm51bWJlclwiOlxuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpPTA7IGk8bm9kZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBuZXdET00gPSB0aGlzLmNyZWF0ZVZET00oaHRtbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBqPTA7IGo8bmV3RE9NLmNoaWxkcmVuLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3RE9NLmNoaWxkcmVuW2pdLnBhcmVudE5vZGUgPSBub2Rlc1tpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2Rlc1tpXS5jaGlsZE5vZGVzLnNwbGljZShwb3NpdGlvbiwgbm9kZXNbaV0uY2hpbGROb2Rlcy5pbmRleE9mKG5vZGVzW2ldLmNoaWxkcmVuW3Bvc2l0aW9uXSksIG5ld0RPTSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9kZXNbaV0uY2hpbGRyZW4uc3BsaWNlKHBvc2l0aW9uLCAwLCBuZXdET00uY2hpbGRyZW5bal0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuZXdET00uY2hpbGROb2Rlc1tqXS5pZClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5pZE5vZGVzW25ld0RPTS5jaGlsZE5vZGVzW2pdLmlkXSA9IG5ld0RPTS5jaGlsZE5vZGVzW2pdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgdkRPTVV0aWxzLnNldENoYW5nZWQobm9kZXNbMF0pO1xuICAgIH0sXG4gICAgYWRkQ2hpbGRGcm9tVk5vZGVzOiBmdW5jdGlvbihub2Rlcywgdk5vZGVzLCBwb3NpdGlvbikge1xuICAgICAgICB0aGlzLnJlbW92ZU5vZGVzKHZOb2RlcywgdHJ1ZSk7XG4gICAgICAgIHZhciBjbG9uZXMgPSBbXSxcbiAgICAgICAgICAgIHNlbGYgPSB0aGlzO1xuICAgICAgICBzd2l0Y2ggKHR5cGVvZiBwb3NpdGlvbikge1xuICAgICAgICAgICAgY2FzZSBcInN0cmluZ1wiOlxuICAgICAgICAgICAgICAgICAgICBpZiAocG9zaXRpb24gPT09IFwic3RhcnRcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaT0wOyBpPG5vZGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG5ld0RPTSA9IHZET01VdGlscy5jbG9uZSh2Tm9kZXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsb25lcyA9IGNsb25lcy5jb25jYXQobmV3RE9NKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2Rlc1tpXS5jaGlsZHJlbiA9IG5ld0RPTS5jb25jYXQobm9kZXNbaV0uY2hpbGRyZW4pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVzW2ldLmNoaWxkTm9kZXMgPSBuZXdET00uY29uY2F0KG5vZGVzW2ldLmNoaWxkTm9kZXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGs9MDsgazxuZXdET00ubGVuZ3RoOyBrKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3RE9NW2tdLnBhcmVudE5vZGUgPSBub2Rlc1tpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5ld0RPTVtrXS5pZClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuaWROb2Rlc1tuZXdET01ba10uaWRdID0gbmV3RE9NW2tdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBpZiAocG9zaXRpb24gPT09IFwiZW5kXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGk9MDsgaTxub2Rlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBuZXdET00gPSB2RE9NVXRpbHMuY2xvbmUodk5vZGVzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbG9uZXMgPSBjbG9uZXMuY29uY2F0KG5ld0RPTSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9kZXNbaV0uY2hpbGRyZW4gPSBub2Rlc1tpXS5jaGlsZHJlbi5jb25jYXQobmV3RE9NKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2Rlc1tpXS5jaGlsZE5vZGVzID0gbm9kZXNbaV0uY2hpbGROb2Rlcy5jb25jYXQobmV3RE9NKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBrPTA7IGs8bmV3RE9NLmxlbmd0aDsgaysrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld0RPTVtrXS5wYXJlbnROb2RlID0gbm9kZXNbaV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuZXdET01ba10uaWQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLmlkTm9kZXNbbmV3RE9NW2tdLmlkXSA9IG5ld0RPTVtrXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCJudW1iZXJcIjpcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaT0wOyBpPG5vZGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgbmV3RE9NID0gdGhpcy5jcmVhdGVWRE9NKGh0bWwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaj0wOyBqPG5ld0RPTS5jaGlsZHJlbi5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBuZXdET00gPSB2RE9NVXRpbHMuY2xvbmUodk5vZGVzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbG9uZXMgPSBjbG9uZXMuY29uY2F0KG5ld0RPTSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9kZXNbaV0uY2hpbGROb2Rlcy5zcGxpY2UocG9zaXRpb24sIG5vZGVzW2ldLmNoaWxkTm9kZXMuaW5kZXhPZihub2Rlc1tpXS5jaGlsZHJlbltwb3NpdGlvbl0pLCBuZXdET00pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVzW2ldLmNoaWxkcmVuLnNwbGljZShwb3NpdGlvbiwgMCwgbmV3RE9NKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBrPTA7IGs8bmV3RE9NLmxlbmd0aDsgaysrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld0RPTVtrXS5wYXJlbnROb2RlID0gbm9kZXNbaV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuZXdET01ba10uaWQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLmlkTm9kZXNbbmV3RE9NW2tdLmlkXSA9IG5ld0RPTVtrXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICB2RE9NVXRpbHMuc2V0Q2hhbmdlZChub2Rlc1swXSk7XG4gICAgICAgIHJldHVybiBjbG9uZXM7XG4gICAgfVxufSIsInZhciB2RE9NVXRpbHMgPSByZXF1aXJlKCcuL3ZET01VdGlscy5qcycpO1xubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgLy9HZXQgdGhlIHZhbHVlIG9mIGFuIGF0dHJpYnV0ZSBmb3IgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzXG4gICAgZ2V0QXR0cmlidXRlKG5vZGVzLCBhdHRyaWJ1dGUpIHtcbiAgICAgICAgdmFyIG5vZGUgPSBub2Rlc1swXTtcbiAgICAgICAgaWYgKHR5cGVvZiBub2RlLmF0dHJpYnV0ZXNbYXR0cmlidXRlLnRvTG93ZXJDYXNlKCldICE9PSBcInVuZGVmaW5lZFwiKVxuICAgICAgICAgICAgcmV0dXJuIG5vZGUuYXR0cmlidXRlc1thdHRyaWJ1dGUudG9Mb3dlckNhc2UoKV07XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfSxcbiAgICAvL1NldCB0aGUgdmFsdWUgb2YgYW4gYXR0cmlidXRlIGZvciBlYWNoIGVsZW1lbnRcbiAgICBzZXRBdHRyaWJ1dGUobm9kZXMsIGF0dHJpYnV0ZSwgdmFsdWUpIHtcbiAgICAgICAgZm9yICh2YXIgaT0wOyBpPG5vZGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgbm9kZSA9IG5vZGVzW2ldO1xuICAgICAgICAgICAgbm9kZS5hdHRyaWJ1dGVzW2F0dHJpYnV0ZS50b0xvd2VyQ2FzZSgpXSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIHZET01VdGlscy5zZXRDaGFuZ2VkKG5vZGVzWzBdKTtcbiAgICB9XG59IiwidmFyIHZET01VdGlscyA9IHJlcXVpcmUoJy4vdkRPTVV0aWxzLmpzJyk7XG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICAvL2NoZWNrcyBhbGwgbm9kZXMgaWYgdGhleSBoYXZlIHRoZSBzdXBwbGllZCBjbGFzc2VzXG4gICAgaGFzQ2xhc3M6IGZ1bmN0aW9uKG5vZGVzLCBjbGFzc0luKSB7XG4gICAgICAgIGZvciAodmFyIGk9MDsgaTxub2Rlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIG5vZGUgPSBub2Rlc1tpXTtcbiAgICAgICAgICAgIGlmIChub2RlLmNsYXNzTmFtZXMuaW5kZXhPZihjbGFzc0luLnRvTG93ZXJDYXNlKCkpID4gLTEpXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0sXG4gICAgLy9yZW1vdmVzIGNsYXNzZXMgZnJvbSBhbGwgdmlydHVhbCBub2Rlc1xuICAgIHJlbW92ZUNsYXNzZXM6IGZ1bmN0aW9uKG5vZGVzLCBjbGFzc2VzKSB7XG4gICAgICAgIGNsYXNzZXMgPSBjbGFzc2VzLnNwbGl0KCcgJyk7XG4gICAgICAgIGZvciAodmFyIGk9MDsgaTxub2Rlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIG5vZGUgPSBub2Rlc1tpXTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBqPTA7IGo8Y2xhc3Nlcy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGNsYXNzZXNbal0gPT09IFwidW5kZWZpbmVkXCIpIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICB2YXIgaW5kZXggPSBub2RlLmNsYXNzTmFtZXMuaW5kZXhPZihjbGFzc2VzW2pdLnRvTG93ZXJDYXNlKCkpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXggPiAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZS5jbGFzc05hbWVzLnNwbGljZShpbmRleCwxKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG5vZGUuYXR0cmlidXRlcy5jbGFzcyA9IG5vZGUuY2xhc3NOYW1lcy5qb2luKCcgJyk7XG4gICAgICAgIH1cbiAgICAgICAgdkRPTVV0aWxzLnNldENoYW5nZWQobm9kZXNbMF0pO1xuICAgIH0sXG4gICAgLy9hZGRzIGNsYXNzcyB0byBhbGwgdmlydHVhbCBub2Rlc1xuICAgIGFkZENsYXNzZXM6IGZ1bmN0aW9uKG5vZGVzLCBjbGFzc2VzKSB7XG4gICAgICAgIGNsYXNzZXMgPSBjbGFzc2VzLnNwbGl0KCcgJyk7XG4gICAgICAgIGZvciAodmFyIGk9MDsgaTxub2Rlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIG5vZGUgPSBub2Rlc1tpXTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBqPTA7IGo8Y2xhc3Nlcy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGNsYXNzZXNbal0gPT09IFwidW5kZWZpbmVkXCIpIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICBpZiAobm9kZS5jbGFzc05hbWVzLmluZGV4T2YoY2xhc3Nlc1tqXS50b0xvd2VyQ2FzZSgpKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGUuY2xhc3NOYW1lcy5wdXNoKGNsYXNzZXNbal0udG9Mb3dlckNhc2UoKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBub2RlLmF0dHJpYnV0ZXMuY2xhc3MgPSBub2RlLmNsYXNzTmFtZXMuam9pbignICcpO1xuICAgICAgICB9XG4gICAgICAgIHZET01VdGlscy5zZXRDaGFuZ2VkKG5vZGVzWzBdKTtcbiAgICB9XG59IiwiLyoqXG4gKiBcbiAqIGxpZnRlZCBhbmQgbW9kaWZpZWQgZnJvbTogaHR0cHM6Ly9naXRodWIuY29tL2FzaGkwMDkvbm9kZS1mYXN0LWh0bWwtcGFyc2VyXG4gKiBcbiAqL1xuXG52YXIga01hcmt1cFBhdHRlcm4gPSAvPCEtLVteXSo/KD89LS0+KS0tPnw8KFxcLz8pKFthLXpdW2EtejAtOV0qKVxccyooW14+XSo/KShcXC8/KT4vaWc7XG52YXIga0F0dHJpYnV0ZVBhdHRlcm4gPSAvXFxiKFtBLXpdKilcXHMqPVxccyooXCIoW15cIl0rKVwifCcoW14nXSspJ3woXFxTKykpL2lnO1xudmFyIGtTZWxmQ2xvc2luZ0VsZW1lbnRzID0ge1xuICAgIG1ldGE6IHRydWUsXG4gICAgaW1nOiB0cnVlLFxuICAgIGxpbms6IHRydWUsXG4gICAgaW5wdXQ6IHRydWUsXG4gICAgYXJlYTogdHJ1ZSxcbiAgICBicjogdHJ1ZSxcbiAgICBocjogdHJ1ZVxufTtcbnZhciBrRWxlbWVudHNDbG9zZWRCeU9wZW5pbmcgPSB7XG4gICAgbGk6IHsgbGk6IHRydWUgfSxcbiAgICBwOiB7IHA6IHRydWUsIGRpdjogdHJ1ZSB9LFxuICAgIHRkOiB7IHRkOiB0cnVlLCB0aDogdHJ1ZSB9LFxuICAgIHRoOiB7IHRkOiB0cnVlLCB0aDogdHJ1ZSB9XG59O1xudmFyIGtFbGVtZW50c0Nsb3NlZEJ5Q2xvc2luZyA9IHtcbiAgICBsaTogeyB1bDogdHJ1ZSwgb2w6IHRydWUgfSxcbiAgICBhOiB7IGRpdjogdHJ1ZSB9LFxuICAgIGI6IHsgZGl2OiB0cnVlIH0sXG4gICAgaTogeyBkaXY6IHRydWUgfSxcbiAgICBwOiB7IGRpdjogdHJ1ZSB9LFxuICAgIHRkOiB7IHRyOiB0cnVlLCB0YWJsZTogdHJ1ZSB9LFxuICAgIHRoOiB7IHRyOiB0cnVlLCB0YWJsZTogdHJ1ZSB9XG59O1xudmFyIGtCbG9ja1RleHRFbGVtZW50cyA9IHtcbiAgICBzY3JpcHQ6IHRydWUsXG4gICAgbm9zY3JpcHQ6IHRydWUsXG4gICAgc3R5bGU6IHRydWUsXG4gICAgcHJlOiB0cnVlXG59O1xuXG52YXIgbm9kZVR5cGVzID0gcmVxdWlyZSgnLi9ub2RlVHlwZXMuanMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgaWROb2RlczogW10sXG4gICAgY3JlYXRlVkRPTTogZnVuY3Rpb24gKGRhdGEsIGluaXQpIHtcbiAgICAgICAgZGF0YSA9IFwiPGRpdj5cIiArIGRhdGEgKyBcIjwvZGl2PlwiO1xuICAgICAgICBkYXRhID0gZGF0YS5yZXBsYWNlKC9cXHI/XFxufFxcci9nLCBcIlwiKTtcbiAgICAgICAgdmFyIHJvb3QgPSBuZXcgbm9kZVR5cGVzLnZpcnR1YWxOb2RlKFwicm9vdFwiLCBudWxsKTtcbiAgICAgICAgdmFyIGN1cnJlbnRQYXJlbnQgPSByb290O1xuICAgICAgICB2YXIgc3RhY2sgPSBbcm9vdF07XG4gICAgICAgIHZhciBsYXN0VGV4dFBvcyA9IC0xO1xuXG4gICAgICAgIGZvciAodmFyIG1hdGNoLCB0ZXh0OyBtYXRjaCA9IGtNYXJrdXBQYXR0ZXJuLmV4ZWMoZGF0YSk7KSB7XG4gICAgICAgICAgICBpZiAobGFzdFRleHRQb3MgPiAtMSkge1xuICAgICAgICAgICAgICAgIGlmIChsYXN0VGV4dFBvcyArIG1hdGNoWzBdLmxlbmd0aCA8IGtNYXJrdXBQYXR0ZXJuLmxhc3RJbmRleCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBpZiBoYXMgY29udGVudFxuICAgICAgICAgICAgICAgICAgICB0ZXh0ID0gZGF0YS5zdWJzdHJpbmcobGFzdFRleHRQb3MsIGtNYXJrdXBQYXR0ZXJuLmxhc3RJbmRleCAtIG1hdGNoWzBdLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0ZXh0LnJlcGxhY2UoLyAvZywgXCJcIikubGVuZ3RoID4gMClcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJlbnRQYXJlbnQuY2hpbGROb2Rlcy5wdXNoKG5ldyBub2RlVHlwZXMudmlydHVhbFRleHROb2RlKHRleHQsIGN1cnJlbnRQYXJlbnQpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBsYXN0VGV4dFBvcyA9IGtNYXJrdXBQYXR0ZXJuLmxhc3RJbmRleDtcbiAgICAgICAgICAgIGlmIChtYXRjaFswXVsxXSA9PSAnIScpIHtcbiAgICAgICAgICAgICAgICAvLyB0aGlzIGlzIGEgY29tbWVudFxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbWF0Y2hbMl0gPSBtYXRjaFsyXS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgaWYgKCFtYXRjaFsxXSkge1xuICAgICAgICAgICAgICAgIC8vIG5vdCA8LyB0YWdzXG4gICAgICAgICAgICAgICAgdmFyIGF0dHJzID0ge307XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgYXR0TWF0Y2g7IGF0dE1hdGNoID0ga0F0dHJpYnV0ZVBhdHRlcm4uZXhlYyhtYXRjaFszXSk7KVxuICAgICAgICAgICAgICAgICAgICBhdHRyc1thdHRNYXRjaFsxXV0gPSBhdHRNYXRjaFszXSB8fCBhdHRNYXRjaFs0XSB8fCBhdHRNYXRjaFs1XTtcbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhhdHRycyk7XG4gICAgICAgICAgICAgICAgaWYgKCFtYXRjaFs0XSAmJiBrRWxlbWVudHNDbG9zZWRCeU9wZW5pbmdbY3VycmVudFBhcmVudC5uYW1lXSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoa0VsZW1lbnRzQ2xvc2VkQnlPcGVuaW5nW2N1cnJlbnRQYXJlbnQubmFtZV1bbWF0Y2hbMl1dKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGFjay5wb3AoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJlbnRQYXJlbnQgPSBzdGFja1tzdGFjay5sZW5ndGggLSAxXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgbm9kZSA9IG5ldyBub2RlVHlwZXMudmlydHVhbE5vZGUobWF0Y2hbMl0sIGN1cnJlbnRQYXJlbnQpO1xuICAgICAgICAgICAgICAgIGN1cnJlbnRQYXJlbnQuY2hpbGRyZW4ucHVzaChub2RlKTtcbiAgICAgICAgICAgICAgICBjdXJyZW50UGFyZW50LmNoaWxkTm9kZXMucHVzaChub2RlKTtcbiAgICAgICAgICAgICAgICBjdXJyZW50UGFyZW50ID0gbm9kZTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBhTmFtZSBpbiBhdHRycykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdmFsdWUgPSBhdHRyc1thTmFtZV07XG4gICAgICAgICAgICAgICAgICAgIGlmIChhTmFtZSA9PT0gXCJpZFwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW5pdClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmlkTm9kZXNbdmFsdWVdID0gY3VycmVudFBhcmVudDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJlbnRQYXJlbnQuaWQgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoYU5hbWUgPT09IFwiY2xhc3NcIilcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJlbnRQYXJlbnQuY2xhc3NOYW1lcyA9IHZhbHVlLnNwbGl0KFwiIFwiKTtcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudFBhcmVudC5hdHRyaWJ1dGVzW2FOYW1lXSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzdGFjay5wdXNoKGN1cnJlbnRQYXJlbnQpO1xuICAgICAgICAgICAgICAgIGlmIChrQmxvY2tUZXh0RWxlbWVudHNbbWF0Y2hbMl1dKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGEgbGl0dGxlIHRlc3QgdG8gZmluZCBuZXh0IDwvc2NyaXB0PiBvciA8L3N0eWxlPiAuLi5cbiAgICAgICAgICAgICAgICAgICAgdmFyIGNsb3NlTWFya3VwID0gJzwvJyArIG1hdGNoWzJdICsgJz4nO1xuICAgICAgICAgICAgICAgICAgICB2YXIgaW5kZXggPSBkYXRhLmluZGV4T2YoY2xvc2VNYXJrdXAsIGtNYXJrdXBQYXR0ZXJuLmxhc3RJbmRleCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmRleCA9PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGFzdFRleHRQb3MgPSBrTWFya3VwUGF0dGVybi5sYXN0SW5kZXggPSBkYXRhLmxlbmd0aCArIDE7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsYXN0VGV4dFBvcyA9IGtNYXJrdXBQYXR0ZXJuLmxhc3RJbmRleCA9IGluZGV4ICsgY2xvc2VNYXJrdXAubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICAgICAgbWF0Y2hbMV0gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG1hdGNoWzFdIHx8IG1hdGNoWzRdIHx8XG4gICAgICAgICAgICAgICAga1NlbGZDbG9zaW5nRWxlbWVudHNbbWF0Y2hbMl1dKSB7XG4gICAgICAgICAgICAgICAgLy8gPC8gb3IgLz4gb3IgPGJyPiBldGMuXG4gICAgICAgICAgICAgICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGN1cnJlbnRQYXJlbnQubmFtZSA9PSBtYXRjaFsyXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhY2sucG9wKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXJyZW50UGFyZW50ID0gc3RhY2tbc3RhY2subGVuZ3RoIC0gMV07XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRyeWluZyB0byBjbG9zZSBjdXJyZW50IHRhZywgYW5kIG1vdmUgb25cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChrRWxlbWVudHNDbG9zZWRCeUNsb3NpbmdbY3VycmVudFBhcmVudC5uYW1lXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChrRWxlbWVudHNDbG9zZWRCeUNsb3NpbmdbY3VycmVudFBhcmVudC5uYW1lXVttYXRjaFsyXV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhY2sucG9wKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJlbnRQYXJlbnQgPSBzdGFja1tzdGFjay5sZW5ndGggLSAxXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVXNlIGFnZ3Jlc3NpdmUgc3RyYXRlZ3kgdG8gaGFuZGxlIHVubWF0Y2hpbmcgbWFya3Vwcy5cbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByb290LmNoaWxkcmVuWzBdO1xuICAgIH0sXG4gICAgbG9hZDogZnVuY3Rpb24oaHRtbCkge1xuICAgICAgICB0aGlzLm9sZERPTSA9IHRoaXMuY3JlYXRlVkRPTShodG1sLCB0cnVlKTtcbiAgICAgICAgdGhpcy5uZXdET00gPSB0aGlzLmNyZWF0ZVZET00oaHRtbCwgdHJ1ZSk7XG4gICAgICAgIHRoaXMubmV3RE9NLmNoYW5nZWQgPSBmYWxzZTtcbiAgICB9XG59OyIsInZhciB2RE9NVXRpbHMgPSByZXF1aXJlKCcuL3ZET01VdGlscy5qcycpO1xubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgb246IGZ1bmN0aW9uKG5vZGVzLCBldmVudCwgY2FsbGJhY2spIHtcbiAgICAgICAgZm9yICh2YXIgaT0wOyBpPG5vZGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgbm9kZSA9IG5vZGVzW2ldO1xuICAgICAgICAgICAgdmFyIGxpc3RlbmVyID0gKGZ1bmN0aW9uKG5vZGUsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgdmFyIG5ld0xpc3RlbmVyID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrLmNhbGwobm9kZSwgZXZlbnQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBuZXdMaXN0ZW5lci5fb3JpZ2luYWxDYWxsYmFjayA9IGNhbGxiYWNrO1xuICAgICAgICAgICAgICAgIG5ld0xpc3RlbmVyLl9kZXRhY2ggPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBuZXdMaXN0ZW5lci5faXNBdHRhY2hlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHJldHVybiBuZXdMaXN0ZW5lclxuICAgICAgICAgICAgfSkobm9kZSwgY2FsbGJhY2spO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBub2RlLmxpc3RlbmVyc1tldmVudF0gPT09IFwidW5kZWZpbmVkXCIpXG4gICAgICAgICAgICAgICAgbm9kZS5saXN0ZW5lcnNbZXZlbnRdID0gW2xpc3RlbmVyXTtcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICBub2RlLmxpc3RlbmVyc1tldmVudF0ucHVzaChsaXN0ZW5lcik7XG4gICAgICAgICAgICBub2RlLmhhc0xpc3RlbmVycyA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgdkRPTVV0aWxzLnNldENoYW5nZWQobm9kZXNbMF0pO1xuICAgIH0sXG4gICAgb2ZmOiBmdW5jdGlvbihub2RlcywgZXZlbnQsIGNhbGxiYWNrKSB7XG4gICAgICAgIGZvciAodmFyIGk9MDsgaTxub2Rlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIG5vZGUgPSBub2Rlc1tpXTtcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygbm9kZS5saXN0ZW5lcnNbZXZlbnRdICE9PSBcInVuZGVmaW5lZFwiKVxuICAgICAgICAgICAgICAgIGZvciAodmFyIGk9MDsgaTxub2RlLmxpc3RlbmVyc1tldmVudF0ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGxpc3RlbmVyID0gbm9kZS5saXN0ZW5lcnNbZXZlbnRdW2ldO1xuICAgICAgICAgICAgICAgICAgICBpZiAobGlzdGVuZXIuX29yaWdpbmFsQ2FsbGJhY2sgPT09IGNhbGxiYWNrICYmIGxpc3RlbmVyLl9pc0F0dGFjaGVkKVxuICAgICAgICAgICAgICAgICAgICAgICAgbGlzdGVuZXIuX2RldGFjaCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgbm9kZS5oYXNMaXN0ZW5lcnMgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHZET01VdGlscy5zZXRDaGFuZ2VkKG5vZGVzWzBdKTtcbiAgICB9XG59IiwidmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMuanMnKSxcbiAgICBub2RlVHlwZXMgPSByZXF1aXJlKCcuL25vZGVUeXBlcy5qcycpXG4gICAgdkRPTVV0aWxzID0gcmVxdWlyZSgnLi92RE9NVXRpbHMuanMnKSxcbiAgICBzZWxmQ2xvc2luZyA9IFtcImFyZWFcIixcImJhc2VcIixcImJyXCIsXCJjb2xcIixcImNvbW1hbmRcIixcImVtYmVkXCIsXCJoclwiLFwiaW1nXCIsXCJpbnB1dFwiLFwia2V5Z2VuXCIsXCJsaW5rXCIsXCJtZXRhXCIsXCJwYXJhbVwiLFwic291cmNlXCIsXCJ0cmFja1wiLFwid2JyXCJdO1xuXG52YXIgZ2VuZXJhdGVIVE1MID0gZnVuY3Rpb24obm9kZSkge1xuICAgIGlmIChub2RlIGluc3RhbmNlb2Ygbm9kZVR5cGVzLnZpcnR1YWxOb2RlKSB7XG4gICAgICAgIHZhciByZXMgPSBcIjxcIiArIG5vZGUubmFtZTtcbiAgICAgICAgZm9yICh2YXIgbmFtZSBpbiBub2RlLmF0dHJpYnV0ZXMpIHtcbiAgICAgICAgICAgIHJlcyArPSBcIiBcIiArIG5hbWUgKyBcIj1cXFwiXCIgKyBub2RlLmF0dHJpYnV0ZXNbbmFtZV0gKyBcIlxcXCJcIjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc2VsZkNsb3NpbmcuaW5kZXhPZihub2RlLm5hbWUpID4gLTEpIHtcbiAgICAgICAgICAgIHJlcyArPVwiLz5cIjtcbiAgICAgICAgICAgIHJldHVybiByZXM7XG4gICAgICAgIH1cbiAgICAgICAgcmVzKz1cIj5cIjtcbiAgICAgICAgZm9yICh2YXIgaT0wOyBpPG5vZGUuY2hpbGROb2Rlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgcmVzICs9IGdlbmVyYXRlSFRNTChub2RlLmNoaWxkTm9kZXNbaV0pO1xuICAgICAgICB9XG4gICAgICAgIHJlcyArPSBcIjwvXCIgKyBub2RlLm5hbWUgKyBcIj5cIjtcbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gbm9kZS52YWx1ZTtcbiAgICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIC8vZ2VuZXJhdGVkIHZpcnR1YWwgRE9NIGZyb20gcGFzc2VkIGh0bWwgYW5kIHJlcGxhY2VzIHRoZSBjaGlsZHJlbiBvZiB0aGUgcGFzc2VkIG5vZGVzIHdpdGggaXRcbiAgICBzZXRIVE1MOiBmdW5jdGlvbihub2RlcywgaHRtbCkge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIGZ1bmN0aW9uIHJlbW92ZUhlbHBlcihub2RlKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpPTA7IGk8bm9kZS5jaGlsZHJlbi5sZW5ndGg7IGkrKylcbiAgICAgICAgICAgICAgICByZW1vdmVIZWxwZXIobm9kZS5jaGlsZHJlbltpXSk7XG4gICAgICAgICAgICBzZWxmLnJlbW92ZU5vZGVzKG5vZGUuY2hpbGRyZW4pO1xuICAgICAgICB9XG4gICAgICAgIGZ1bmN0aW9uIGFkZEhlbHBlcihub2Rlcykge1xuICAgICAgICAgICAgZm9yICh2YXIgaT0wOyBpPG5vZGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgYWRkSGVscGVyKG5vZGVzW2ldKTtcbiAgICAgICAgICAgICAgICBpZiAobm9kZXNbaV0uaWQpXG4gICAgICAgICAgICAgICAgICAgIHNlbGYuaWROb2RlcyA9IG5vZGVzW2ldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGZvciAodmFyIGk9MDsgaTxub2Rlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIG5vZGUgPSBub2Rlc1tpXTtcbiAgICAgICAgICAgIHJlbW92ZUhlbHBlcihub2RlKTtcbiAgICAgICAgICAgIHZhciBuZXdWRE9NID0gdGhpcy5jcmVhdGVWRE9NKGh0bWwpO1xuICAgICAgICAgICAgbm9kZS5jaGlsZHJlbiA9IG5ld1ZET00uY2hpbGRyZW47XG4gICAgICAgICAgICBhZGRIZWxwZXIobm9kZS5jaGlsZHJlbik7XG4gICAgICAgICAgICBub2RlLmNoaWxkTm9kZXMgPSBuZXdWRE9NLmNoaWxkTm9kZXM7ICAgIFxuICAgICAgICB9XG4gICAgICAgIHZET01VdGlscy5zZXRDaGFuZ2VkKG5vZGVzWzBdKTtcbiAgICB9LFxuICAgIC8vcmV0dXJuIGlubmVySFRNTCBmb3IgYSBub2RlXG4gICAgZ2V0SFRNTDogZnVuY3Rpb24obm9kZXMpIHtcbiAgICAgICAgdmFyIHJlcyA9IFwiXCI7XG4gICAgICAgIGZvciAodmFyIGk9MDsgaTxub2Rlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgZm9yICh2YXIgaz0wOyBrPG5vZGVzW2ldLmNoaWxkcmVuLmxlbmd0aDsgaysrKSB7XG4gICAgICAgICAgICAgICAgcmVzKz0gZ2VuZXJhdGVIVE1MKG5vZGVzW2ldLmNoaWxkcmVuW2tdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH1cbn0iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgICB2aXJ0dWFsTm9kZTogZnVuY3Rpb24gKG5hbWUsIHBhcmVudE5vZGUpIHtcbiAgICAgICAgT2JqZWN0LmFzc2lnbih0aGlzLCB7XG4gICAgICAgICAgICBuYW1lOiBuYW1lLFxuICAgICAgICAgICAgcGFyZW50Tm9kZTogcGFyZW50Tm9kZSxcbiAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHt9LFxuICAgICAgICAgICAgY2xhc3NOYW1lczogW10sXG4gICAgICAgICAgICBwYXRoOiBcIlwiLFxuICAgICAgICAgICAgY2hpbGRyZW46IFtdLFxuICAgICAgICAgICAgY2hpbGROb2RlczogW10sXG4gICAgICAgICAgICBpZDogbnVsbCxcbiAgICAgICAgICAgIGxpc3RlbmVyczoge30sXG4gICAgICAgICAgICBoYXNMaXN0ZW5lcnM6IGZhbHNlLCBcbiAgICAgICAgICAgIHJlbW92ZUxpc3RlbmVyczogW11cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICB2aXJ0dWFsVGV4dE5vZGU6IGZ1bmN0aW9uICh2YWx1ZSwgcGFyZW50Tm9kZSkge1xuICAgICAgICBPYmplY3QuYXNzaWduKHRoaXMsIHtcbiAgICAgICAgICAgIHBhcmVudE5vZGU6IHBhcmVudE5vZGUsXG4gICAgICAgICAgICB2YWx1ZTogdmFsdWVcbiAgICAgICAgfSk7XG4gICAgfVxufSIsInZhciB2RE9NVXRpbHMgPSByZXF1aXJlKCcuL3ZET01VdGlscy5qcycpO1xubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgLy9yZW1vdmVzIGEgdmlydHVhbCBub2RlIGZyb20gaXRzIHBhcmVudFxuICAgIHJlbW92ZU5vZGVzOiBmdW5jdGlvbihub2RlcywgaWdub3JlU2V0Q2hhbmdlZCkge1xuICAgICAgICBmb3IgKHZhciBpPTA7IGk8bm9kZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBub2RlID0gbm9kZXNbaV07XG4gICAgICAgICAgICBpZiAoIW5vZGUucGFyZW50Tm9kZSkgY29udGludWU7XG4gICAgICAgICAgICBpZiAobm9kZS5pZClcbiAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy5pZE5vZGVzW25vZGUuaWRdO1xuICAgICAgICAgICAgbm9kZS5wYXJlbnROb2RlLmNoaWxkcmVuLnNwbGljZShub2RlLnBhcmVudE5vZGUuY2hpbGRyZW4uaW5kZXhPZihub2RlKSwxKTtcbiAgICAgICAgICAgIG5vZGUucGFyZW50Tm9kZS5jaGlsZE5vZGVzLnNwbGljZShub2RlLnBhcmVudE5vZGUuY2hpbGROb2Rlcy5pbmRleE9mKG5vZGUpLDEpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpZ25vcmVTZXRDaGFuZ2VkKSByZXR1cm47XG4gICAgICAgIHZET01VdGlscy5zZXRDaGFuZ2VkKG5vZGVzWzBdKTtcbiAgICB9XG59IiwidmFyIHZET01VdGlscyA9IHJlcXVpcmUoJy4vdkRPTVV0aWxzLmpzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIC8vU2V0IHRoZSB2YWx1ZSBvZiBhIHN0eWxlIGZvciBlYWNoIGVsZW1lbnRcbiAgICBzZXRTdHlsZShub2RlcywgcHJvcGVydHksIHZhbHVlKSB7XG4gICAgICAgIHByb3BlcnR5ID0gdkRPTVV0aWxzLmV4cGFuZFNob3J0aGFuZENTUyhwcm9wZXJ0eSk7XG4gICAgICAgIGlmICh2RE9NVXRpbHMudmFsaWRhdGVDU1MocHJvcGVydHksIHZhbHVlKSkge1xuICAgICAgICAgICAgZm9yICh2YXIgaT0wOyBpPG5vZGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIG5vZGUgPSBub2Rlc1tpXTtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG5vZGUuYXR0cmlidXRlcy5zdHlsZSA9PT0gXCJ1bmRlZmluZWRcIilcbiAgICAgICAgICAgICAgICAgICAgbm9kZS5hdHRyaWJ1dGVzLnN0eWxlID0gXCJcIjtcbiAgICAgICAgICAgICAgICB2YXIgc3R5bGVzID0gdkRPTVV0aWxzLnN0eWxlVG9PYmplY3Qobm9kZS5hdHRyaWJ1dGVzLnN0eWxlKTsgIFxuICAgICAgICAgICAgICAgIHN0eWxlc1twcm9wZXJ0eV0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICBub2RlLmF0dHJpYnV0ZXMuc3R5bGUgPSB2RE9NVXRpbHMub2JqZWN0VG9TdHlsZShzdHlsZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdkRPTVV0aWxzLnNldENoYW5nZWQobm9kZXNbMF0pO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAvL2dldCB0aGUgdmFsdWUgb2YgYSBzdHlsZSBmb3IgdGhlIGZpcnN0IGVsZW1lbnRcbiAgICBnZXRTdHlsZShub2RlcywgcHJvcGVydHkpIHtcbiAgICAgICAgcHJvcGVydHkgPSB2RE9NVXRpbHMuZXhwYW5kU2hvcnRoYW5kQ1NTKHByb3BlcnR5KTtcbiAgICAgICAgdmFyIG5vZGUgPSBub2Rlc1swXSxcbiAgICAgICAgICAgIHN0eWxlcyA9IHZET01VdGlscy5zdHlsZVRvT2JqZWN0KG5vZGUuYXR0cmlidXRlcy5zdHlsZSk7XG4gICAgICAgIHJldHVybiBzdHlsZXNbcHJvcGVydHldO1xuICAgIH1cbn0iLCIvLyMgVmlydHVhbCBET01cbnZhciB2RE9NVXRpbHMgPSByZXF1aXJlKCcuL3ZET01VdGlscy5qcycpO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gT2JqZWN0LmFzc2lnbih7XG4gICAgbmV3RE9NOiBudWxsLFxuICAgIG9sZERPTTogbnVsbCxcbiAgICBjbG9uZTogZnVuY3Rpb24obm9kZSkge1xuICAgICAgICByZXR1cm4gdkRPTVV0aWxzLmNsb25lKG5vZGUpO1xuICAgIH1cbn0sIFxucmVxdWlyZSgnLi9ub2RlVHlwZXMuanMnKSxcbnJlcXVpcmUoJy4vY3JlYXRlVkRPTS5qcycpLFxucmVxdWlyZSgnLi9ldmVudHMuanMnKSxcbnJlcXVpcmUoJy4vY2xhc3MuanMnKSxcbnJlcXVpcmUoJy4vYWRkQ2hpbGQuanMnKSxcbnJlcXVpcmUoJy4vcmVtb3ZlQ2hpbGQuanMnKSxcbnJlcXVpcmUoJy4vaHRtbC5qcycpLFxucmVxdWlyZSgnLi9zdHlsZXMuanMnKSxcbnJlcXVpcmUoJy4vYXR0cmlidXRlcy5qcycpKTtcbiIsInZhciBjbG9uZU9iamVjdCA9IHJlcXVpcmUoXCJjbG9uZVwiKTtcbmZ1bmN0aW9uIGNsb25lKG5vZGVzKSB7XG4gICAgdmFyIG5ld05vZGVzID0gW107XG4gICAgZm9yICh2YXIgaT0wOyBpPG5vZGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBjbG9uZSA9IGNsb25lT2JqZWN0KG5vZGVzW2ldKTtcbiAgICAgICAgaWYgKGNsb25lLmhhc0xpc3RlbmVycylcbiAgICAgICAgICAgIGZvciAodmFyIGV2ZW50IGluIGNsb25lLmxpc3RlbmVycykge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY2xvbmUubGlzdGVuZXJzW2V2ZW50XS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbGlzdGVuZXIgPSBjbG9uZS5saXN0ZW5lcnNbZXZlbnRdW2ldO1xuICAgICAgICAgICAgICAgICAgICBsaXN0ZW5lci5faXNBdHRhY2hlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgbmV3Tm9kZXMucHVzaChjbG9uZSk7XG4gICAgfSBcbiAgICBuZXdOb2Rlcy5wcm90b3R5cGUgPSBub2Rlcy5wcm90b3R5cGU7XG4gICAgcmV0dXJuIG5ld05vZGVzO1xufVxuZnVuY3Rpb24gc2V0Q2hhbmdlZChub2RlKSB7XG4gICAgaWYgKHR5cGVvZiBub2RlID09PSBcInVuZGVmaW5lZFwiKSByZXR1cm47XG4gICAgd2hpbGUgKG5vZGUucGFyZW50Tm9kZSkge1xuICAgICAgICBub2RlID0gbm9kZS5wYXJlbnROb2RlO1xuICAgIH1cbiAgICBub2RlLmNoYW5nZWQgPSB0cnVlO1xufVxuZnVuY3Rpb24gZXhwYW5kU2hvcnRoYW5kQ1NTKHN0cikge1xuICAgIGlmIChzdHIuaW5kZXhPZignLScpID4gMClcbiAgICAgICAgcmV0dXJuIHN0cjtcbiAgICB2YXIgcmVzdWx0ID0gc3RyLnJlcGxhY2UoLyhbQS1aXSspL2csIFwiLCQxXCIpLnJlcGxhY2UoL14sLywgXCJcIik7XG4gICAgcmV0dXJuIHJlc3VsdC5zcGxpdChcIixcIikuam9pbihcIi1cIikudG9Mb3dlckNhc2UoKTtcbn1cbmZ1bmN0aW9uIHZhbGlkYXRlQ1NTKHByb3BlcnR5LCB2YWx1ZSkge1xuICAgIHZhciBlbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgZWxlbWVudC5zdHlsZVtwcm9wZXJ0eV0gPSB2YWx1ZTtcbiAgICByZXR1cm4gZWxlbWVudC5zdHlsZVtwcm9wZXJ0eV0gPT09IHZhbHVlO1xufVxuZnVuY3Rpb24gc3R5bGVUb09iamVjdChzdHlsZSkge1xuICAgIGlmIChzdHlsZVtzdHlsZS5sZW5ndGgtMV0gPT09IFwiO1wiKVxuICAgICAgICBzdHlsZSA9IHN0eWxlLnNsaWNlKDAsc3R5bGUubGVuZ3RoLTEpOyBcbiAgICBzdHlsZSA9IHN0eWxlLnJlcGxhY2UoLyAvZywgXCJcIikuc3BsaXQoXCI7XCIpO1xuICAgIHZhciByZXMgPSB7fTtcbiAgICBmb3IgKHZhciBpPTA7IGk8c3R5bGUubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHMgPSBzdHlsZVtpXTtcbiAgICAgICAgaWYgKHMhPT1cIlwiKSB7XG4gICAgICAgICAgICB2YXIgc3MgPSBzLnNwbGl0KFwiOlwiKTtcbiAgICAgICAgICAgIHJlc1tzc1swXV0gPSBzc1sxXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzO1xufVxuZnVuY3Rpb24gb2JqZWN0VG9TdHlsZShvKSB7XG4gICAgdmFyIHJlcyA9IFtdO1xuICAgIGZvciAodmFyIGkgaW4gbykge1xuICAgICAgICByZXMucHVzaChpICsgXCI6IFwiICsgb1tpXSk7XG4gICAgfVxuICAgIHJldHVybiByZXMuam9pbihcIjtcIik7XG59XG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBjbG9uZTogY2xvbmUsXG4gICAgc2V0Q2hhbmdlZDogc2V0Q2hhbmdlZCxcbiAgICBleHBhbmRTaG9ydGhhbmRDU1M6IGV4cGFuZFNob3J0aGFuZENTUyxcbiAgICB2YWxpZGF0ZUNTUzogdmFsaWRhdGVDU1MsXG4gICAgc3R5bGVUb09iamVjdDogc3R5bGVUb09iamVjdCxcbiAgICBvYmplY3RUb1N0eWxlOiBvYmplY3RUb1N0eWxlXG59IiwidmFyIHZET00gPSByZXF1aXJlKCcuL3ZET00vdkRPTS5qcycpLFxuICAgIHJlbmRlciA9IHJlcXVpcmUoJy4vcmVuZGVyLmpzJyksXG4gICAgb3B0aW9ucyA9IHJlcXVpcmUoJy4vb3B0aW9ucy5qcycpO1xuXG5mdW5jdGlvbiB2aXJ0dWFsUXVlcnkoYXJyYXkpIHtcbiAgdmFyIGFyciA9IFtdO1xuICBhcnIgPSBhcnIuY29uY2F0KGFycmF5KTtcbiAgYXJyLl9fcHJvdG9fXyA9IHZpcnR1YWxRdWVyeS5wcm90b3R5cGU7XG4gIHJldHVybiBhcnI7XG59XG52aXJ0dWFsUXVlcnkucHJvdG90eXBlID0gbmV3IEFycmF5O1xuXG5PYmplY3QuYXNzaWduKHZpcnR1YWxRdWVyeS5wcm90b3R5cGUsIHtcbiAgICBhcHBlbmQ6IGZ1bmN0aW9uIChhcmcpIHtcbiAgICAgICAgc3dpdGNoICh0eXBlb2YgYXJnKSB7XG4gICAgICAgICAgICBjYXNlIFwic3RyaW5nXCI6XG4gICAgICAgICAgICAgICAgdkRPTS5hZGRDaGlsZEZyb21IdG1sKHRoaXMsIGFyZywgXCJlbmRcIik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICBjYXNlIFwib2JqZWN0XCI6XG4gICAgICAgICAgICAgICAgaWYgKGFyZyBpbnN0YW5jZW9mIHZET00udmlydHVhbE5vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgdkRPTS5hZGRDaGlsZEZyb21WTm9kZXModGhpcywgW2FyZ10sIFwiZW5kXCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoYXJnIGluc3RhbmNlb2YgdmlydHVhbFF1ZXJ5KSB7XG4gICAgICAgICAgICAgICAgICAgIHZET00uYWRkQ2hpbGRGcm9tVk5vZGVzKHRoaXMsIGFyZywgXCJlbmRcIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBhcHBlbmRUbzogZnVuY3Rpb24gKGFyZykge1xuICAgICAgICBzd2l0Y2ggKHR5cGVvZiBhcmcpIHtcbiAgICAgICAgICAgIGNhc2UgXCJzdHJpbmdcIjpcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IHZpcnR1YWxRdWVyeSh2RE9NLmFkZENoaWxkRnJvbVZOb2RlcyhbdkRPTS5jcmVhdGVWRE9NKGFyZyldLCB0aGlzLCBcImVuZFwiKSk7XG4gICAgICAgICAgICBjYXNlIFwib2JqZWN0XCI6XG4gICAgICAgICAgICAgICAgaWYgKGFyZyBpbnN0YW5jZW9mIHZET00udmlydHVhbE5vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyB2aXJ0dWFsUXVlcnkodkRPTS5hZGRDaGlsZEZyb21WTm9kZXMoW2FyZ10sIHRoaXMsIFwiZW5kXCIpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGFyZyBpbnN0YW5jZW9mIHZpcnR1YWxRdWVyeSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IHZpcnR1YWxRdWVyeSh2RE9NLmFkZENoaWxkRnJvbVZOb2RlcyhhcmcsIHRoaXMsIFwiZW5kXCIpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHByZXBlbmQ6IGZ1bmN0aW9uIChhcmcpIHtcbiAgICAgICAgc3dpdGNoICh0eXBlb2YgYXJnKSB7XG4gICAgICAgICAgICBjYXNlIFwic3RyaW5nXCI6XG4gICAgICAgICAgICAgICAgdkRPTS5hZGRDaGlsZEZyb21IdG1sKHRoaXMsIGFyZywgXCJzdGFydFwiKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIGNhc2UgXCJvYmplY3RcIjpcbiAgICAgICAgICAgICAgICBpZiAoYXJnIGluc3RhbmNlb2YgdkRPTS52aXJ0dWFsTm9kZSkge1xuICAgICAgICAgICAgICAgICAgICB2RE9NLmFkZENoaWxkRnJvbVZOb2Rlcyh0aGlzLCBbYXJnXSwgXCJzdGFydFwiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGFyZyBpbnN0YW5jZW9mIHZpcnR1YWxRdWVyeSkge1xuICAgICAgICAgICAgICAgICAgICB2RE9NLmFkZENoaWxkRnJvbVZOb2Rlcyh0aGlzLCBhcmcsIFwic3RhcnRcIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBwcmVwZW5kVG86IGZ1bmN0aW9uIChhcmcpIHtcbiAgICAgICAgc3dpdGNoICh0eXBlb2YgYXJnKSB7XG4gICAgICAgICAgICBjYXNlIFwic3RyaW5nXCI6XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyB2aXJ0dWFsUXVlcnkodkRPTS5hZGRDaGlsZEZyb21WTm9kZXMoW3ZET00uY3JlYXRlVkRPTShhcmcpXSwgdGhpcywgXCJzdGFydFwiKSk7XG4gICAgICAgICAgICBjYXNlIFwib2JqZWN0XCI6XG4gICAgICAgICAgICAgICAgaWYgKGFyZyBpbnN0YW5jZW9mIHZET00udmlydHVhbE5vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyB2aXJ0dWFsUXVlcnkodkRPTS5hZGRDaGlsZEZyb21WTm9kZXMoW2FyZ10sIHRoaXMsIFwic3RhcnRcIikpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoYXJnIGluc3RhbmNlb2YgdmlydHVhbFF1ZXJ5KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgdmlydHVhbFF1ZXJ5KHZET00uYWRkQ2hpbGRGcm9tVk5vZGVzKGFyZywgdGhpcywgXCJzdGFydFwiKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICByZW1vdmU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdkRPTS5yZW1vdmVOb2Rlcyh0aGlzKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBhZGRDbGFzczogZnVuY3Rpb24gKGNsYXNzZXMpIHtcbiAgICAgICAgdkRPTS5hZGRDbGFzc2VzKHRoaXMsIGNsYXNzZXMpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIHJlbW92ZUNsYXNzOiBmdW5jdGlvbihjbGFzc2VzKSB7XG4gICAgICAgIHZET00ucmVtb3ZlQ2xhc3Nlcyh0aGlzLCBjbGFzc2VzKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBoYXNDbGFzczogZnVuY3Rpb24oY2xhc3NJbikge1xuICAgICAgICByZXR1cm4gdkRPTS5oYXNDbGFzcyh0aGlzLCBjbGFzc0luKTtcbiAgICB9LFxuICAgIGh0bWw6IGZ1bmN0aW9uIChodG1sKSB7XG4gICAgICAgIGlmICh0eXBlb2YgaHRtbCAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgdkRPTS5zZXRIVE1MKHRoaXMsIGh0bWwpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdkRPTS5nZXRIVE1MKHRoaXMpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBhdHRyOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgICAgIHN3aXRjaCAoYXJncy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNhc2UgMTpcbiAgICAgICAgICAgICAgICBzd2l0Y2godHlwZW9mIGFyZ3NbMF0pIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcInN0cmluZ1wiOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZET00uZ2V0QXR0cmlidXRlKHRoaXMsIGFyZ3NbMF0pO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIFwib2JqZWN0XCI6XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBhdHRyTmFtZSBpbiBhcmdzWzBdKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZET00uc2V0QXR0cmlidXRlKHRoaXMsIGF0dHJOYW1lLCBhcmdzWzBdW2F0dHJOYW1lXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgICAgICAgdkRPTS5zZXRBdHRyaWJ1dGUodGhpcywgYXJnc1swXSwgYXJnc1sxXSlcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgIH0sXG4gICAgY3NzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgICAgIHN3aXRjaCAoYXJncy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNhc2UgMTpcbiAgICAgICAgICAgICAgICBzd2l0Y2godHlwZW9mIGFyZ3NbMF0pIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcInN0cmluZ1wiOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZET00uZ2V0U3R5bGUodGhpcywgYXJnc1swXSk7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJvYmplY3RcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAodmFyIHByb3BlcnR5IGluIGFyZ3NbMF0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdkRPTS5zZXRTdHlsZSh0aGlzLCBwcm9wZXJ0eSwgYXJnc1swXVtwcm9wZXJ0eV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSAyOlxuICAgICAgICAgICAgICAgIHZET00uc2V0U3R5bGUodGhpcywgYXJnc1swXSwgYXJnc1sxXSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIGNsb25lOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHZET00uY2xvbmUodGhpcyk7XG4gICAgfSxcbiAgICBvbjogZnVuY3Rpb24oZXZlbnQsIGNhbGxiYWNrKSB7XG4gICAgICAgIHZET00ub24odGhpcywgZXZlbnQsIGNhbGxiYWNrKTtcbiAgICAgICAgaWYgKCFvcHRpb25zLm9wdGlvbnMuYXV0b1VwZGF0ZSlcbiAgICAgICAgICAgIHJlbmRlci51cGRhdGUoKTtcbiAgICB9LFxuICAgIG9mZjogZnVuY3Rpb24oZXZlbnQsIGNhbGxiYWNrKSB7XG4gICAgICAgIHZET00ub2ZmKHRoaXMsIGV2ZW50LCBjYWxsYmFjayk7XG4gICAgICAgIGlmICghb3B0aW9ucy5vcHRpb25zLmF1dG9VcGRhdGUpXG4gICAgICAgICAgICByZW5kZXIudXBkYXRlKCk7XG4gICAgfVxufSk7XG5tb2R1bGUuZXhwb3J0cyA9IHZpcnR1YWxRdWVyeTsiLCIndXNlIHN0cmljdCdcblxuZXhwb3J0cy50b0J5dGVBcnJheSA9IHRvQnl0ZUFycmF5XG5leHBvcnRzLmZyb21CeXRlQXJyYXkgPSBmcm9tQnl0ZUFycmF5XG5cbnZhciBsb29rdXAgPSBbXVxudmFyIHJldkxvb2t1cCA9IFtdXG52YXIgQXJyID0gdHlwZW9mIFVpbnQ4QXJyYXkgIT09ICd1bmRlZmluZWQnID8gVWludDhBcnJheSA6IEFycmF5XG5cbmZ1bmN0aW9uIGluaXQgKCkge1xuICB2YXIgY29kZSA9ICdBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSsvJ1xuICBmb3IgKHZhciBpID0gMCwgbGVuID0gY29kZS5sZW5ndGg7IGkgPCBsZW47ICsraSkge1xuICAgIGxvb2t1cFtpXSA9IGNvZGVbaV1cbiAgICByZXZMb29rdXBbY29kZS5jaGFyQ29kZUF0KGkpXSA9IGlcbiAgfVxuXG4gIHJldkxvb2t1cFsnLScuY2hhckNvZGVBdCgwKV0gPSA2MlxuICByZXZMb29rdXBbJ18nLmNoYXJDb2RlQXQoMCldID0gNjNcbn1cblxuaW5pdCgpXG5cbmZ1bmN0aW9uIHRvQnl0ZUFycmF5IChiNjQpIHtcbiAgdmFyIGksIGosIGwsIHRtcCwgcGxhY2VIb2xkZXJzLCBhcnJcbiAgdmFyIGxlbiA9IGI2NC5sZW5ndGhcblxuICBpZiAobGVuICUgNCA+IDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgc3RyaW5nLiBMZW5ndGggbXVzdCBiZSBhIG11bHRpcGxlIG9mIDQnKVxuICB9XG5cbiAgLy8gdGhlIG51bWJlciBvZiBlcXVhbCBzaWducyAocGxhY2UgaG9sZGVycylcbiAgLy8gaWYgdGhlcmUgYXJlIHR3byBwbGFjZWhvbGRlcnMsIHRoYW4gdGhlIHR3byBjaGFyYWN0ZXJzIGJlZm9yZSBpdFxuICAvLyByZXByZXNlbnQgb25lIGJ5dGVcbiAgLy8gaWYgdGhlcmUgaXMgb25seSBvbmUsIHRoZW4gdGhlIHRocmVlIGNoYXJhY3RlcnMgYmVmb3JlIGl0IHJlcHJlc2VudCAyIGJ5dGVzXG4gIC8vIHRoaXMgaXMganVzdCBhIGNoZWFwIGhhY2sgdG8gbm90IGRvIGluZGV4T2YgdHdpY2VcbiAgcGxhY2VIb2xkZXJzID0gYjY0W2xlbiAtIDJdID09PSAnPScgPyAyIDogYjY0W2xlbiAtIDFdID09PSAnPScgPyAxIDogMFxuXG4gIC8vIGJhc2U2NCBpcyA0LzMgKyB1cCB0byB0d28gY2hhcmFjdGVycyBvZiB0aGUgb3JpZ2luYWwgZGF0YVxuICBhcnIgPSBuZXcgQXJyKGxlbiAqIDMgLyA0IC0gcGxhY2VIb2xkZXJzKVxuXG4gIC8vIGlmIHRoZXJlIGFyZSBwbGFjZWhvbGRlcnMsIG9ubHkgZ2V0IHVwIHRvIHRoZSBsYXN0IGNvbXBsZXRlIDQgY2hhcnNcbiAgbCA9IHBsYWNlSG9sZGVycyA+IDAgPyBsZW4gLSA0IDogbGVuXG5cbiAgdmFyIEwgPSAwXG5cbiAgZm9yIChpID0gMCwgaiA9IDA7IGkgPCBsOyBpICs9IDQsIGogKz0gMykge1xuICAgIHRtcCA9IChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSldIDw8IDE4KSB8IChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSArIDEpXSA8PCAxMikgfCAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAyKV0gPDwgNikgfCByZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSArIDMpXVxuICAgIGFycltMKytdID0gKHRtcCA+PiAxNikgJiAweEZGXG4gICAgYXJyW0wrK10gPSAodG1wID4+IDgpICYgMHhGRlxuICAgIGFycltMKytdID0gdG1wICYgMHhGRlxuICB9XG5cbiAgaWYgKHBsYWNlSG9sZGVycyA9PT0gMikge1xuICAgIHRtcCA9IChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSldIDw8IDIpIHwgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMSldID4+IDQpXG4gICAgYXJyW0wrK10gPSB0bXAgJiAweEZGXG4gIH0gZWxzZSBpZiAocGxhY2VIb2xkZXJzID09PSAxKSB7XG4gICAgdG1wID0gKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpKV0gPDwgMTApIHwgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMSldIDw8IDQpIHwgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMildID4+IDIpXG4gICAgYXJyW0wrK10gPSAodG1wID4+IDgpICYgMHhGRlxuICAgIGFycltMKytdID0gdG1wICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIGFyclxufVxuXG5mdW5jdGlvbiB0cmlwbGV0VG9CYXNlNjQgKG51bSkge1xuICByZXR1cm4gbG9va3VwW251bSA+PiAxOCAmIDB4M0ZdICsgbG9va3VwW251bSA+PiAxMiAmIDB4M0ZdICsgbG9va3VwW251bSA+PiA2ICYgMHgzRl0gKyBsb29rdXBbbnVtICYgMHgzRl1cbn1cblxuZnVuY3Rpb24gZW5jb2RlQ2h1bmsgKHVpbnQ4LCBzdGFydCwgZW5kKSB7XG4gIHZhciB0bXBcbiAgdmFyIG91dHB1dCA9IFtdXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSArPSAzKSB7XG4gICAgdG1wID0gKHVpbnQ4W2ldIDw8IDE2KSArICh1aW50OFtpICsgMV0gPDwgOCkgKyAodWludDhbaSArIDJdKVxuICAgIG91dHB1dC5wdXNoKHRyaXBsZXRUb0Jhc2U2NCh0bXApKVxuICB9XG4gIHJldHVybiBvdXRwdXQuam9pbignJylcbn1cblxuZnVuY3Rpb24gZnJvbUJ5dGVBcnJheSAodWludDgpIHtcbiAgdmFyIHRtcFxuICB2YXIgbGVuID0gdWludDgubGVuZ3RoXG4gIHZhciBleHRyYUJ5dGVzID0gbGVuICUgMyAvLyBpZiB3ZSBoYXZlIDEgYnl0ZSBsZWZ0LCBwYWQgMiBieXRlc1xuICB2YXIgb3V0cHV0ID0gJydcbiAgdmFyIHBhcnRzID0gW11cbiAgdmFyIG1heENodW5rTGVuZ3RoID0gMTYzODMgLy8gbXVzdCBiZSBtdWx0aXBsZSBvZiAzXG5cbiAgLy8gZ28gdGhyb3VnaCB0aGUgYXJyYXkgZXZlcnkgdGhyZWUgYnl0ZXMsIHdlJ2xsIGRlYWwgd2l0aCB0cmFpbGluZyBzdHVmZiBsYXRlclxuICBmb3IgKHZhciBpID0gMCwgbGVuMiA9IGxlbiAtIGV4dHJhQnl0ZXM7IGkgPCBsZW4yOyBpICs9IG1heENodW5rTGVuZ3RoKSB7XG4gICAgcGFydHMucHVzaChlbmNvZGVDaHVuayh1aW50OCwgaSwgKGkgKyBtYXhDaHVua0xlbmd0aCkgPiBsZW4yID8gbGVuMiA6IChpICsgbWF4Q2h1bmtMZW5ndGgpKSlcbiAgfVxuXG4gIC8vIHBhZCB0aGUgZW5kIHdpdGggemVyb3MsIGJ1dCBtYWtlIHN1cmUgdG8gbm90IGZvcmdldCB0aGUgZXh0cmEgYnl0ZXNcbiAgaWYgKGV4dHJhQnl0ZXMgPT09IDEpIHtcbiAgICB0bXAgPSB1aW50OFtsZW4gLSAxXVxuICAgIG91dHB1dCArPSBsb29rdXBbdG1wID4+IDJdXG4gICAgb3V0cHV0ICs9IGxvb2t1cFsodG1wIDw8IDQpICYgMHgzRl1cbiAgICBvdXRwdXQgKz0gJz09J1xuICB9IGVsc2UgaWYgKGV4dHJhQnl0ZXMgPT09IDIpIHtcbiAgICB0bXAgPSAodWludDhbbGVuIC0gMl0gPDwgOCkgKyAodWludDhbbGVuIC0gMV0pXG4gICAgb3V0cHV0ICs9IGxvb2t1cFt0bXAgPj4gMTBdXG4gICAgb3V0cHV0ICs9IGxvb2t1cFsodG1wID4+IDQpICYgMHgzRl1cbiAgICBvdXRwdXQgKz0gbG9va3VwWyh0bXAgPDwgMikgJiAweDNGXVxuICAgIG91dHB1dCArPSAnPSdcbiAgfVxuXG4gIHBhcnRzLnB1c2gob3V0cHV0KVxuXG4gIHJldHVybiBwYXJ0cy5qb2luKCcnKVxufVxuIiwiLyohXG4gKiBUaGUgYnVmZmVyIG1vZHVsZSBmcm9tIG5vZGUuanMsIGZvciB0aGUgYnJvd3Nlci5cbiAqXG4gKiBAYXV0aG9yICAgRmVyb3NzIEFib3VraGFkaWplaCA8ZmVyb3NzQGZlcm9zcy5vcmc+IDxodHRwOi8vZmVyb3NzLm9yZz5cbiAqIEBsaWNlbnNlICBNSVRcbiAqL1xuLyogZXNsaW50LWRpc2FibGUgbm8tcHJvdG8gKi9cblxuJ3VzZSBzdHJpY3QnXG5cbnZhciBiYXNlNjQgPSByZXF1aXJlKCdiYXNlNjQtanMnKVxudmFyIGllZWU3NTQgPSByZXF1aXJlKCdpZWVlNzU0JylcbnZhciBpc0FycmF5ID0gcmVxdWlyZSgnaXNhcnJheScpXG5cbmV4cG9ydHMuQnVmZmVyID0gQnVmZmVyXG5leHBvcnRzLlNsb3dCdWZmZXIgPSBTbG93QnVmZmVyXG5leHBvcnRzLklOU1BFQ1RfTUFYX0JZVEVTID0gNTBcblxuLyoqXG4gKiBJZiBgQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlRgOlxuICogICA9PT0gdHJ1ZSAgICBVc2UgVWludDhBcnJheSBpbXBsZW1lbnRhdGlvbiAoZmFzdGVzdClcbiAqICAgPT09IGZhbHNlICAgVXNlIE9iamVjdCBpbXBsZW1lbnRhdGlvbiAobW9zdCBjb21wYXRpYmxlLCBldmVuIElFNilcbiAqXG4gKiBCcm93c2VycyB0aGF0IHN1cHBvcnQgdHlwZWQgYXJyYXlzIGFyZSBJRSAxMCssIEZpcmVmb3ggNCssIENocm9tZSA3KywgU2FmYXJpIDUuMSssXG4gKiBPcGVyYSAxMS42KywgaU9TIDQuMisuXG4gKlxuICogRHVlIHRvIHZhcmlvdXMgYnJvd3NlciBidWdzLCBzb21ldGltZXMgdGhlIE9iamVjdCBpbXBsZW1lbnRhdGlvbiB3aWxsIGJlIHVzZWQgZXZlblxuICogd2hlbiB0aGUgYnJvd3NlciBzdXBwb3J0cyB0eXBlZCBhcnJheXMuXG4gKlxuICogTm90ZTpcbiAqXG4gKiAgIC0gRmlyZWZveCA0LTI5IGxhY2tzIHN1cHBvcnQgZm9yIGFkZGluZyBuZXcgcHJvcGVydGllcyB0byBgVWludDhBcnJheWAgaW5zdGFuY2VzLFxuICogICAgIFNlZTogaHR0cHM6Ly9idWd6aWxsYS5tb3ppbGxhLm9yZy9zaG93X2J1Zy5jZ2k/aWQ9Njk1NDM4LlxuICpcbiAqICAgLSBDaHJvbWUgOS0xMCBpcyBtaXNzaW5nIHRoZSBgVHlwZWRBcnJheS5wcm90b3R5cGUuc3ViYXJyYXlgIGZ1bmN0aW9uLlxuICpcbiAqICAgLSBJRTEwIGhhcyBhIGJyb2tlbiBgVHlwZWRBcnJheS5wcm90b3R5cGUuc3ViYXJyYXlgIGZ1bmN0aW9uIHdoaWNoIHJldHVybnMgYXJyYXlzIG9mXG4gKiAgICAgaW5jb3JyZWN0IGxlbmd0aCBpbiBzb21lIHNpdHVhdGlvbnMuXG5cbiAqIFdlIGRldGVjdCB0aGVzZSBidWdneSBicm93c2VycyBhbmQgc2V0IGBCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVGAgdG8gYGZhbHNlYCBzbyB0aGV5XG4gKiBnZXQgdGhlIE9iamVjdCBpbXBsZW1lbnRhdGlvbiwgd2hpY2ggaXMgc2xvd2VyIGJ1dCBiZWhhdmVzIGNvcnJlY3RseS5cbiAqL1xuQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQgPSBnbG9iYWwuVFlQRURfQVJSQVlfU1VQUE9SVCAhPT0gdW5kZWZpbmVkXG4gID8gZ2xvYmFsLlRZUEVEX0FSUkFZX1NVUFBPUlRcbiAgOiB0eXBlZEFycmF5U3VwcG9ydCgpXG5cbi8qXG4gKiBFeHBvcnQga01heExlbmd0aCBhZnRlciB0eXBlZCBhcnJheSBzdXBwb3J0IGlzIGRldGVybWluZWQuXG4gKi9cbmV4cG9ydHMua01heExlbmd0aCA9IGtNYXhMZW5ndGgoKVxuXG5mdW5jdGlvbiB0eXBlZEFycmF5U3VwcG9ydCAoKSB7XG4gIHRyeSB7XG4gICAgdmFyIGFyciA9IG5ldyBVaW50OEFycmF5KDEpXG4gICAgYXJyLmZvbyA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIDQyIH1cbiAgICByZXR1cm4gYXJyLmZvbygpID09PSA0MiAmJiAvLyB0eXBlZCBhcnJheSBpbnN0YW5jZXMgY2FuIGJlIGF1Z21lbnRlZFxuICAgICAgICB0eXBlb2YgYXJyLnN1YmFycmF5ID09PSAnZnVuY3Rpb24nICYmIC8vIGNocm9tZSA5LTEwIGxhY2sgYHN1YmFycmF5YFxuICAgICAgICBhcnIuc3ViYXJyYXkoMSwgMSkuYnl0ZUxlbmd0aCA9PT0gMCAvLyBpZTEwIGhhcyBicm9rZW4gYHN1YmFycmF5YFxuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cbn1cblxuZnVuY3Rpb24ga01heExlbmd0aCAoKSB7XG4gIHJldHVybiBCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVFxuICAgID8gMHg3ZmZmZmZmZlxuICAgIDogMHgzZmZmZmZmZlxufVxuXG5mdW5jdGlvbiBjcmVhdGVCdWZmZXIgKHRoYXQsIGxlbmd0aCkge1xuICBpZiAoa01heExlbmd0aCgpIDwgbGVuZ3RoKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0ludmFsaWQgdHlwZWQgYXJyYXkgbGVuZ3RoJylcbiAgfVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICAvLyBSZXR1cm4gYW4gYXVnbWVudGVkIGBVaW50OEFycmF5YCBpbnN0YW5jZSwgZm9yIGJlc3QgcGVyZm9ybWFuY2VcbiAgICB0aGF0ID0gbmV3IFVpbnQ4QXJyYXkobGVuZ3RoKVxuICAgIHRoYXQuX19wcm90b19fID0gQnVmZmVyLnByb3RvdHlwZVxuICB9IGVsc2Uge1xuICAgIC8vIEZhbGxiYWNrOiBSZXR1cm4gYW4gb2JqZWN0IGluc3RhbmNlIG9mIHRoZSBCdWZmZXIgY2xhc3NcbiAgICBpZiAodGhhdCA9PT0gbnVsbCkge1xuICAgICAgdGhhdCA9IG5ldyBCdWZmZXIobGVuZ3RoKVxuICAgIH1cbiAgICB0aGF0Lmxlbmd0aCA9IGxlbmd0aFxuICB9XG5cbiAgcmV0dXJuIHRoYXRcbn1cblxuLyoqXG4gKiBUaGUgQnVmZmVyIGNvbnN0cnVjdG9yIHJldHVybnMgaW5zdGFuY2VzIG9mIGBVaW50OEFycmF5YCB0aGF0IGhhdmUgdGhlaXJcbiAqIHByb3RvdHlwZSBjaGFuZ2VkIHRvIGBCdWZmZXIucHJvdG90eXBlYC4gRnVydGhlcm1vcmUsIGBCdWZmZXJgIGlzIGEgc3ViY2xhc3Mgb2ZcbiAqIGBVaW50OEFycmF5YCwgc28gdGhlIHJldHVybmVkIGluc3RhbmNlcyB3aWxsIGhhdmUgYWxsIHRoZSBub2RlIGBCdWZmZXJgIG1ldGhvZHNcbiAqIGFuZCB0aGUgYFVpbnQ4QXJyYXlgIG1ldGhvZHMuIFNxdWFyZSBicmFja2V0IG5vdGF0aW9uIHdvcmtzIGFzIGV4cGVjdGVkIC0tIGl0XG4gKiByZXR1cm5zIGEgc2luZ2xlIG9jdGV0LlxuICpcbiAqIFRoZSBgVWludDhBcnJheWAgcHJvdG90eXBlIHJlbWFpbnMgdW5tb2RpZmllZC5cbiAqL1xuXG5mdW5jdGlvbiBCdWZmZXIgKGFyZywgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoKSB7XG4gIGlmICghQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQgJiYgISh0aGlzIGluc3RhbmNlb2YgQnVmZmVyKSkge1xuICAgIHJldHVybiBuZXcgQnVmZmVyKGFyZywgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoKVxuICB9XG5cbiAgLy8gQ29tbW9uIGNhc2UuXG4gIGlmICh0eXBlb2YgYXJnID09PSAnbnVtYmVyJykge1xuICAgIGlmICh0eXBlb2YgZW5jb2RpbmdPck9mZnNldCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgJ0lmIGVuY29kaW5nIGlzIHNwZWNpZmllZCB0aGVuIHRoZSBmaXJzdCBhcmd1bWVudCBtdXN0IGJlIGEgc3RyaW5nJ1xuICAgICAgKVxuICAgIH1cbiAgICByZXR1cm4gYWxsb2NVbnNhZmUodGhpcywgYXJnKVxuICB9XG4gIHJldHVybiBmcm9tKHRoaXMsIGFyZywgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoKVxufVxuXG5CdWZmZXIucG9vbFNpemUgPSA4MTkyIC8vIG5vdCB1c2VkIGJ5IHRoaXMgaW1wbGVtZW50YXRpb25cblxuLy8gVE9ETzogTGVnYWN5LCBub3QgbmVlZGVkIGFueW1vcmUuIFJlbW92ZSBpbiBuZXh0IG1ham9yIHZlcnNpb24uXG5CdWZmZXIuX2F1Z21lbnQgPSBmdW5jdGlvbiAoYXJyKSB7XG4gIGFyci5fX3Byb3RvX18gPSBCdWZmZXIucHJvdG90eXBlXG4gIHJldHVybiBhcnJcbn1cblxuZnVuY3Rpb24gZnJvbSAodGhhdCwgdmFsdWUsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aCkge1xuICBpZiAodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1widmFsdWVcIiBhcmd1bWVudCBtdXN0IG5vdCBiZSBhIG51bWJlcicpXG4gIH1cblxuICBpZiAodHlwZW9mIEFycmF5QnVmZmVyICE9PSAndW5kZWZpbmVkJyAmJiB2YWx1ZSBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKSB7XG4gICAgcmV0dXJuIGZyb21BcnJheUJ1ZmZlcih0aGF0LCB2YWx1ZSwgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoKVxuICB9XG5cbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gZnJvbVN0cmluZyh0aGF0LCB2YWx1ZSwgZW5jb2RpbmdPck9mZnNldClcbiAgfVxuXG4gIHJldHVybiBmcm9tT2JqZWN0KHRoYXQsIHZhbHVlKVxufVxuXG4vKipcbiAqIEZ1bmN0aW9uYWxseSBlcXVpdmFsZW50IHRvIEJ1ZmZlcihhcmcsIGVuY29kaW5nKSBidXQgdGhyb3dzIGEgVHlwZUVycm9yXG4gKiBpZiB2YWx1ZSBpcyBhIG51bWJlci5cbiAqIEJ1ZmZlci5mcm9tKHN0clssIGVuY29kaW5nXSlcbiAqIEJ1ZmZlci5mcm9tKGFycmF5KVxuICogQnVmZmVyLmZyb20oYnVmZmVyKVxuICogQnVmZmVyLmZyb20oYXJyYXlCdWZmZXJbLCBieXRlT2Zmc2V0WywgbGVuZ3RoXV0pXG4gKiovXG5CdWZmZXIuZnJvbSA9IGZ1bmN0aW9uICh2YWx1ZSwgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBmcm9tKG51bGwsIHZhbHVlLCBlbmNvZGluZ09yT2Zmc2V0LCBsZW5ndGgpXG59XG5cbmlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICBCdWZmZXIucHJvdG90eXBlLl9fcHJvdG9fXyA9IFVpbnQ4QXJyYXkucHJvdG90eXBlXG4gIEJ1ZmZlci5fX3Byb3RvX18gPSBVaW50OEFycmF5XG4gIGlmICh0eXBlb2YgU3ltYm9sICE9PSAndW5kZWZpbmVkJyAmJiBTeW1ib2wuc3BlY2llcyAmJlxuICAgICAgQnVmZmVyW1N5bWJvbC5zcGVjaWVzXSA9PT0gQnVmZmVyKSB7XG4gICAgLy8gRml4IHN1YmFycmF5KCkgaW4gRVMyMDE2LiBTZWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9mZXJvc3MvYnVmZmVyL3B1bGwvOTdcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoQnVmZmVyLCBTeW1ib2wuc3BlY2llcywge1xuICAgICAgdmFsdWU6IG51bGwsXG4gICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICB9KVxuICB9XG59XG5cbmZ1bmN0aW9uIGFzc2VydFNpemUgKHNpemUpIHtcbiAgaWYgKHR5cGVvZiBzaXplICE9PSAnbnVtYmVyJykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1wic2l6ZVwiIGFyZ3VtZW50IG11c3QgYmUgYSBudW1iZXInKVxuICB9XG59XG5cbmZ1bmN0aW9uIGFsbG9jICh0aGF0LCBzaXplLCBmaWxsLCBlbmNvZGluZykge1xuICBhc3NlcnRTaXplKHNpemUpXG4gIGlmIChzaXplIDw9IDApIHtcbiAgICByZXR1cm4gY3JlYXRlQnVmZmVyKHRoYXQsIHNpemUpXG4gIH1cbiAgaWYgKGZpbGwgIT09IHVuZGVmaW5lZCkge1xuICAgIC8vIE9ubHkgcGF5IGF0dGVudGlvbiB0byBlbmNvZGluZyBpZiBpdCdzIGEgc3RyaW5nLiBUaGlzXG4gICAgLy8gcHJldmVudHMgYWNjaWRlbnRhbGx5IHNlbmRpbmcgaW4gYSBudW1iZXIgdGhhdCB3b3VsZFxuICAgIC8vIGJlIGludGVycHJldHRlZCBhcyBhIHN0YXJ0IG9mZnNldC5cbiAgICByZXR1cm4gdHlwZW9mIGVuY29kaW5nID09PSAnc3RyaW5nJ1xuICAgICAgPyBjcmVhdGVCdWZmZXIodGhhdCwgc2l6ZSkuZmlsbChmaWxsLCBlbmNvZGluZylcbiAgICAgIDogY3JlYXRlQnVmZmVyKHRoYXQsIHNpemUpLmZpbGwoZmlsbClcbiAgfVxuICByZXR1cm4gY3JlYXRlQnVmZmVyKHRoYXQsIHNpemUpXG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIG5ldyBmaWxsZWQgQnVmZmVyIGluc3RhbmNlLlxuICogYWxsb2Moc2l6ZVssIGZpbGxbLCBlbmNvZGluZ11dKVxuICoqL1xuQnVmZmVyLmFsbG9jID0gZnVuY3Rpb24gKHNpemUsIGZpbGwsIGVuY29kaW5nKSB7XG4gIHJldHVybiBhbGxvYyhudWxsLCBzaXplLCBmaWxsLCBlbmNvZGluZylcbn1cblxuZnVuY3Rpb24gYWxsb2NVbnNhZmUgKHRoYXQsIHNpemUpIHtcbiAgYXNzZXJ0U2l6ZShzaXplKVxuICB0aGF0ID0gY3JlYXRlQnVmZmVyKHRoYXQsIHNpemUgPCAwID8gMCA6IGNoZWNrZWQoc2l6ZSkgfCAwKVxuICBpZiAoIUJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzaXplOyBpKyspIHtcbiAgICAgIHRoYXRbaV0gPSAwXG4gICAgfVxuICB9XG4gIHJldHVybiB0aGF0XG59XG5cbi8qKlxuICogRXF1aXZhbGVudCB0byBCdWZmZXIobnVtKSwgYnkgZGVmYXVsdCBjcmVhdGVzIGEgbm9uLXplcm8tZmlsbGVkIEJ1ZmZlciBpbnN0YW5jZS5cbiAqICovXG5CdWZmZXIuYWxsb2NVbnNhZmUgPSBmdW5jdGlvbiAoc2l6ZSkge1xuICByZXR1cm4gYWxsb2NVbnNhZmUobnVsbCwgc2l6ZSlcbn1cbi8qKlxuICogRXF1aXZhbGVudCB0byBTbG93QnVmZmVyKG51bSksIGJ5IGRlZmF1bHQgY3JlYXRlcyBhIG5vbi16ZXJvLWZpbGxlZCBCdWZmZXIgaW5zdGFuY2UuXG4gKi9cbkJ1ZmZlci5hbGxvY1Vuc2FmZVNsb3cgPSBmdW5jdGlvbiAoc2l6ZSkge1xuICByZXR1cm4gYWxsb2NVbnNhZmUobnVsbCwgc2l6ZSlcbn1cblxuZnVuY3Rpb24gZnJvbVN0cmluZyAodGhhdCwgc3RyaW5nLCBlbmNvZGluZykge1xuICBpZiAodHlwZW9mIGVuY29kaW5nICE9PSAnc3RyaW5nJyB8fCBlbmNvZGluZyA9PT0gJycpIHtcbiAgICBlbmNvZGluZyA9ICd1dGY4J1xuICB9XG5cbiAgaWYgKCFCdWZmZXIuaXNFbmNvZGluZyhlbmNvZGluZykpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdcImVuY29kaW5nXCIgbXVzdCBiZSBhIHZhbGlkIHN0cmluZyBlbmNvZGluZycpXG4gIH1cblxuICB2YXIgbGVuZ3RoID0gYnl0ZUxlbmd0aChzdHJpbmcsIGVuY29kaW5nKSB8IDBcbiAgdGhhdCA9IGNyZWF0ZUJ1ZmZlcih0aGF0LCBsZW5ndGgpXG5cbiAgdGhhdC53cml0ZShzdHJpbmcsIGVuY29kaW5nKVxuICByZXR1cm4gdGhhdFxufVxuXG5mdW5jdGlvbiBmcm9tQXJyYXlMaWtlICh0aGF0LCBhcnJheSkge1xuICB2YXIgbGVuZ3RoID0gY2hlY2tlZChhcnJheS5sZW5ndGgpIHwgMFxuICB0aGF0ID0gY3JlYXRlQnVmZmVyKHRoYXQsIGxlbmd0aClcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkgKz0gMSkge1xuICAgIHRoYXRbaV0gPSBhcnJheVtpXSAmIDI1NVxuICB9XG4gIHJldHVybiB0aGF0XG59XG5cbmZ1bmN0aW9uIGZyb21BcnJheUJ1ZmZlciAodGhhdCwgYXJyYXksIGJ5dGVPZmZzZXQsIGxlbmd0aCkge1xuICBhcnJheS5ieXRlTGVuZ3RoIC8vIHRoaXMgdGhyb3dzIGlmIGBhcnJheWAgaXMgbm90IGEgdmFsaWQgQXJyYXlCdWZmZXJcblxuICBpZiAoYnl0ZU9mZnNldCA8IDAgfHwgYXJyYXkuYnl0ZUxlbmd0aCA8IGJ5dGVPZmZzZXQpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignXFwnb2Zmc2V0XFwnIGlzIG91dCBvZiBib3VuZHMnKVxuICB9XG5cbiAgaWYgKGFycmF5LmJ5dGVMZW5ndGggPCBieXRlT2Zmc2V0ICsgKGxlbmd0aCB8fCAwKSkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdcXCdsZW5ndGhcXCcgaXMgb3V0IG9mIGJvdW5kcycpXG4gIH1cblxuICBpZiAobGVuZ3RoID09PSB1bmRlZmluZWQpIHtcbiAgICBhcnJheSA9IG5ldyBVaW50OEFycmF5KGFycmF5LCBieXRlT2Zmc2V0KVxuICB9IGVsc2Uge1xuICAgIGFycmF5ID0gbmV3IFVpbnQ4QXJyYXkoYXJyYXksIGJ5dGVPZmZzZXQsIGxlbmd0aClcbiAgfVxuXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIC8vIFJldHVybiBhbiBhdWdtZW50ZWQgYFVpbnQ4QXJyYXlgIGluc3RhbmNlLCBmb3IgYmVzdCBwZXJmb3JtYW5jZVxuICAgIHRoYXQgPSBhcnJheVxuICAgIHRoYXQuX19wcm90b19fID0gQnVmZmVyLnByb3RvdHlwZVxuICB9IGVsc2Uge1xuICAgIC8vIEZhbGxiYWNrOiBSZXR1cm4gYW4gb2JqZWN0IGluc3RhbmNlIG9mIHRoZSBCdWZmZXIgY2xhc3NcbiAgICB0aGF0ID0gZnJvbUFycmF5TGlrZSh0aGF0LCBhcnJheSlcbiAgfVxuICByZXR1cm4gdGhhdFxufVxuXG5mdW5jdGlvbiBmcm9tT2JqZWN0ICh0aGF0LCBvYmopIHtcbiAgaWYgKEJ1ZmZlci5pc0J1ZmZlcihvYmopKSB7XG4gICAgdmFyIGxlbiA9IGNoZWNrZWQob2JqLmxlbmd0aCkgfCAwXG4gICAgdGhhdCA9IGNyZWF0ZUJ1ZmZlcih0aGF0LCBsZW4pXG5cbiAgICBpZiAodGhhdC5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiB0aGF0XG4gICAgfVxuXG4gICAgb2JqLmNvcHkodGhhdCwgMCwgMCwgbGVuKVxuICAgIHJldHVybiB0aGF0XG4gIH1cblxuICBpZiAob2JqKSB7XG4gICAgaWYgKCh0eXBlb2YgQXJyYXlCdWZmZXIgIT09ICd1bmRlZmluZWQnICYmXG4gICAgICAgIG9iai5idWZmZXIgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcikgfHwgJ2xlbmd0aCcgaW4gb2JqKSB7XG4gICAgICBpZiAodHlwZW9mIG9iai5sZW5ndGggIT09ICdudW1iZXInIHx8IGlzbmFuKG9iai5sZW5ndGgpKSB7XG4gICAgICAgIHJldHVybiBjcmVhdGVCdWZmZXIodGhhdCwgMClcbiAgICAgIH1cbiAgICAgIHJldHVybiBmcm9tQXJyYXlMaWtlKHRoYXQsIG9iailcbiAgICB9XG5cbiAgICBpZiAob2JqLnR5cGUgPT09ICdCdWZmZXInICYmIGlzQXJyYXkob2JqLmRhdGEpKSB7XG4gICAgICByZXR1cm4gZnJvbUFycmF5TGlrZSh0aGF0LCBvYmouZGF0YSlcbiAgICB9XG4gIH1cblxuICB0aHJvdyBuZXcgVHlwZUVycm9yKCdGaXJzdCBhcmd1bWVudCBtdXN0IGJlIGEgc3RyaW5nLCBCdWZmZXIsIEFycmF5QnVmZmVyLCBBcnJheSwgb3IgYXJyYXktbGlrZSBvYmplY3QuJylcbn1cblxuZnVuY3Rpb24gY2hlY2tlZCAobGVuZ3RoKSB7XG4gIC8vIE5vdGU6IGNhbm5vdCB1c2UgYGxlbmd0aCA8IGtNYXhMZW5ndGhgIGhlcmUgYmVjYXVzZSB0aGF0IGZhaWxzIHdoZW5cbiAgLy8gbGVuZ3RoIGlzIE5hTiAod2hpY2ggaXMgb3RoZXJ3aXNlIGNvZXJjZWQgdG8gemVyby4pXG4gIGlmIChsZW5ndGggPj0ga01heExlbmd0aCgpKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0F0dGVtcHQgdG8gYWxsb2NhdGUgQnVmZmVyIGxhcmdlciB0aGFuIG1heGltdW0gJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgJ3NpemU6IDB4JyArIGtNYXhMZW5ndGgoKS50b1N0cmluZygxNikgKyAnIGJ5dGVzJylcbiAgfVxuICByZXR1cm4gbGVuZ3RoIHwgMFxufVxuXG5mdW5jdGlvbiBTbG93QnVmZmVyIChsZW5ndGgpIHtcbiAgaWYgKCtsZW5ndGggIT0gbGVuZ3RoKSB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgZXFlcWVxXG4gICAgbGVuZ3RoID0gMFxuICB9XG4gIHJldHVybiBCdWZmZXIuYWxsb2MoK2xlbmd0aClcbn1cblxuQnVmZmVyLmlzQnVmZmVyID0gZnVuY3Rpb24gaXNCdWZmZXIgKGIpIHtcbiAgcmV0dXJuICEhKGIgIT0gbnVsbCAmJiBiLl9pc0J1ZmZlcilcbn1cblxuQnVmZmVyLmNvbXBhcmUgPSBmdW5jdGlvbiBjb21wYXJlIChhLCBiKSB7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGEpIHx8ICFCdWZmZXIuaXNCdWZmZXIoYikpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudHMgbXVzdCBiZSBCdWZmZXJzJylcbiAgfVxuXG4gIGlmIChhID09PSBiKSByZXR1cm4gMFxuXG4gIHZhciB4ID0gYS5sZW5ndGhcbiAgdmFyIHkgPSBiLmxlbmd0aFxuXG4gIGZvciAodmFyIGkgPSAwLCBsZW4gPSBNYXRoLm1pbih4LCB5KTsgaSA8IGxlbjsgKytpKSB7XG4gICAgaWYgKGFbaV0gIT09IGJbaV0pIHtcbiAgICAgIHggPSBhW2ldXG4gICAgICB5ID0gYltpXVxuICAgICAgYnJlYWtcbiAgICB9XG4gIH1cblxuICBpZiAoeCA8IHkpIHJldHVybiAtMVxuICBpZiAoeSA8IHgpIHJldHVybiAxXG4gIHJldHVybiAwXG59XG5cbkJ1ZmZlci5pc0VuY29kaW5nID0gZnVuY3Rpb24gaXNFbmNvZGluZyAoZW5jb2RpbmcpIHtcbiAgc3dpdGNoIChTdHJpbmcoZW5jb2RpbmcpLnRvTG93ZXJDYXNlKCkpIHtcbiAgICBjYXNlICdoZXgnOlxuICAgIGNhc2UgJ3V0ZjgnOlxuICAgIGNhc2UgJ3V0Zi04JzpcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgY2FzZSAnYmluYXJ5JzpcbiAgICBjYXNlICdiYXNlNjQnOlxuICAgIGNhc2UgJ3Jhdyc6XG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndWNzLTInOlxuICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgIHJldHVybiB0cnVlXG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiBmYWxzZVxuICB9XG59XG5cbkJ1ZmZlci5jb25jYXQgPSBmdW5jdGlvbiBjb25jYXQgKGxpc3QsIGxlbmd0aCkge1xuICBpZiAoIWlzQXJyYXkobGlzdCkpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdcImxpc3RcIiBhcmd1bWVudCBtdXN0IGJlIGFuIEFycmF5IG9mIEJ1ZmZlcnMnKVxuICB9XG5cbiAgaWYgKGxpc3QubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIEJ1ZmZlci5hbGxvYygwKVxuICB9XG5cbiAgdmFyIGlcbiAgaWYgKGxlbmd0aCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgbGVuZ3RoID0gMFxuICAgIGZvciAoaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICBsZW5ndGggKz0gbGlzdFtpXS5sZW5ndGhcbiAgICB9XG4gIH1cblxuICB2YXIgYnVmZmVyID0gQnVmZmVyLmFsbG9jVW5zYWZlKGxlbmd0aClcbiAgdmFyIHBvcyA9IDBcbiAgZm9yIChpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgYnVmID0gbGlzdFtpXVxuICAgIGlmICghQnVmZmVyLmlzQnVmZmVyKGJ1ZikpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1wibGlzdFwiIGFyZ3VtZW50IG11c3QgYmUgYW4gQXJyYXkgb2YgQnVmZmVycycpXG4gICAgfVxuICAgIGJ1Zi5jb3B5KGJ1ZmZlciwgcG9zKVxuICAgIHBvcyArPSBidWYubGVuZ3RoXG4gIH1cbiAgcmV0dXJuIGJ1ZmZlclxufVxuXG5mdW5jdGlvbiBieXRlTGVuZ3RoIChzdHJpbmcsIGVuY29kaW5nKSB7XG4gIGlmIChCdWZmZXIuaXNCdWZmZXIoc3RyaW5nKSkge1xuICAgIHJldHVybiBzdHJpbmcubGVuZ3RoXG4gIH1cbiAgaWYgKHR5cGVvZiBBcnJheUJ1ZmZlciAhPT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIEFycmF5QnVmZmVyLmlzVmlldyA9PT0gJ2Z1bmN0aW9uJyAmJlxuICAgICAgKEFycmF5QnVmZmVyLmlzVmlldyhzdHJpbmcpIHx8IHN0cmluZyBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKSkge1xuICAgIHJldHVybiBzdHJpbmcuYnl0ZUxlbmd0aFxuICB9XG4gIGlmICh0eXBlb2Ygc3RyaW5nICE9PSAnc3RyaW5nJykge1xuICAgIHN0cmluZyA9ICcnICsgc3RyaW5nXG4gIH1cblxuICB2YXIgbGVuID0gc3RyaW5nLmxlbmd0aFxuICBpZiAobGVuID09PSAwKSByZXR1cm4gMFxuXG4gIC8vIFVzZSBhIGZvciBsb29wIHRvIGF2b2lkIHJlY3Vyc2lvblxuICB2YXIgbG93ZXJlZENhc2UgPSBmYWxzZVxuICBmb3IgKDs7KSB7XG4gICAgc3dpdGNoIChlbmNvZGluZykge1xuICAgICAgY2FzZSAnYXNjaWknOlxuICAgICAgY2FzZSAnYmluYXJ5JzpcbiAgICAgIC8vIERlcHJlY2F0ZWRcbiAgICAgIGNhc2UgJ3Jhdyc6XG4gICAgICBjYXNlICdyYXdzJzpcbiAgICAgICAgcmV0dXJuIGxlblxuICAgICAgY2FzZSAndXRmOCc6XG4gICAgICBjYXNlICd1dGYtOCc6XG4gICAgICBjYXNlIHVuZGVmaW5lZDpcbiAgICAgICAgcmV0dXJuIHV0ZjhUb0J5dGVzKHN0cmluZykubGVuZ3RoXG4gICAgICBjYXNlICd1Y3MyJzpcbiAgICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgICByZXR1cm4gbGVuICogMlxuICAgICAgY2FzZSAnaGV4JzpcbiAgICAgICAgcmV0dXJuIGxlbiA+Pj4gMVxuICAgICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgICAgcmV0dXJuIGJhc2U2NFRvQnl0ZXMoc3RyaW5nKS5sZW5ndGhcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGlmIChsb3dlcmVkQ2FzZSkgcmV0dXJuIHV0ZjhUb0J5dGVzKHN0cmluZykubGVuZ3RoIC8vIGFzc3VtZSB1dGY4XG4gICAgICAgIGVuY29kaW5nID0gKCcnICsgZW5jb2RpbmcpLnRvTG93ZXJDYXNlKClcbiAgICAgICAgbG93ZXJlZENhc2UgPSB0cnVlXG4gICAgfVxuICB9XG59XG5CdWZmZXIuYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGhcblxuZnVuY3Rpb24gc2xvd1RvU3RyaW5nIChlbmNvZGluZywgc3RhcnQsIGVuZCkge1xuICB2YXIgbG93ZXJlZENhc2UgPSBmYWxzZVxuXG4gIC8vIE5vIG5lZWQgdG8gdmVyaWZ5IHRoYXQgXCJ0aGlzLmxlbmd0aCA8PSBNQVhfVUlOVDMyXCIgc2luY2UgaXQncyBhIHJlYWQtb25seVxuICAvLyBwcm9wZXJ0eSBvZiBhIHR5cGVkIGFycmF5LlxuXG4gIC8vIFRoaXMgYmVoYXZlcyBuZWl0aGVyIGxpa2UgU3RyaW5nIG5vciBVaW50OEFycmF5IGluIHRoYXQgd2Ugc2V0IHN0YXJ0L2VuZFxuICAvLyB0byB0aGVpciB1cHBlci9sb3dlciBib3VuZHMgaWYgdGhlIHZhbHVlIHBhc3NlZCBpcyBvdXQgb2YgcmFuZ2UuXG4gIC8vIHVuZGVmaW5lZCBpcyBoYW5kbGVkIHNwZWNpYWxseSBhcyBwZXIgRUNNQS0yNjIgNnRoIEVkaXRpb24sXG4gIC8vIFNlY3Rpb24gMTMuMy4zLjcgUnVudGltZSBTZW1hbnRpY3M6IEtleWVkQmluZGluZ0luaXRpYWxpemF0aW9uLlxuICBpZiAoc3RhcnQgPT09IHVuZGVmaW5lZCB8fCBzdGFydCA8IDApIHtcbiAgICBzdGFydCA9IDBcbiAgfVxuICAvLyBSZXR1cm4gZWFybHkgaWYgc3RhcnQgPiB0aGlzLmxlbmd0aC4gRG9uZSBoZXJlIHRvIHByZXZlbnQgcG90ZW50aWFsIHVpbnQzMlxuICAvLyBjb2VyY2lvbiBmYWlsIGJlbG93LlxuICBpZiAoc3RhcnQgPiB0aGlzLmxlbmd0aCkge1xuICAgIHJldHVybiAnJ1xuICB9XG5cbiAgaWYgKGVuZCA9PT0gdW5kZWZpbmVkIHx8IGVuZCA+IHRoaXMubGVuZ3RoKSB7XG4gICAgZW5kID0gdGhpcy5sZW5ndGhcbiAgfVxuXG4gIGlmIChlbmQgPD0gMCkge1xuICAgIHJldHVybiAnJ1xuICB9XG5cbiAgLy8gRm9yY2UgY29lcnNpb24gdG8gdWludDMyLiBUaGlzIHdpbGwgYWxzbyBjb2VyY2UgZmFsc2V5L05hTiB2YWx1ZXMgdG8gMC5cbiAgZW5kID4+Pj0gMFxuICBzdGFydCA+Pj49IDBcblxuICBpZiAoZW5kIDw9IHN0YXJ0KSB7XG4gICAgcmV0dXJuICcnXG4gIH1cblxuICBpZiAoIWVuY29kaW5nKSBlbmNvZGluZyA9ICd1dGY4J1xuXG4gIHdoaWxlICh0cnVlKSB7XG4gICAgc3dpdGNoIChlbmNvZGluZykge1xuICAgICAgY2FzZSAnaGV4JzpcbiAgICAgICAgcmV0dXJuIGhleFNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ3V0ZjgnOlxuICAgICAgY2FzZSAndXRmLTgnOlxuICAgICAgICByZXR1cm4gdXRmOFNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ2FzY2lpJzpcbiAgICAgICAgcmV0dXJuIGFzY2lpU2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAnYmluYXJ5JzpcbiAgICAgICAgcmV0dXJuIGJpbmFyeVNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICAgIHJldHVybiBiYXNlNjRTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICd1Y3MyJzpcbiAgICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgICByZXR1cm4gdXRmMTZsZVNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGlmIChsb3dlcmVkQ2FzZSkgdGhyb3cgbmV3IFR5cGVFcnJvcignVW5rbm93biBlbmNvZGluZzogJyArIGVuY29kaW5nKVxuICAgICAgICBlbmNvZGluZyA9IChlbmNvZGluZyArICcnKS50b0xvd2VyQ2FzZSgpXG4gICAgICAgIGxvd2VyZWRDYXNlID0gdHJ1ZVxuICAgIH1cbiAgfVxufVxuXG4vLyBUaGUgcHJvcGVydHkgaXMgdXNlZCBieSBgQnVmZmVyLmlzQnVmZmVyYCBhbmQgYGlzLWJ1ZmZlcmAgKGluIFNhZmFyaSA1LTcpIHRvIGRldGVjdFxuLy8gQnVmZmVyIGluc3RhbmNlcy5cbkJ1ZmZlci5wcm90b3R5cGUuX2lzQnVmZmVyID0gdHJ1ZVxuXG5mdW5jdGlvbiBzd2FwIChiLCBuLCBtKSB7XG4gIHZhciBpID0gYltuXVxuICBiW25dID0gYlttXVxuICBiW21dID0gaVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnN3YXAxNiA9IGZ1bmN0aW9uIHN3YXAxNiAoKSB7XG4gIHZhciBsZW4gPSB0aGlzLmxlbmd0aFxuICBpZiAobGVuICUgMiAhPT0gMCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdCdWZmZXIgc2l6ZSBtdXN0IGJlIGEgbXVsdGlwbGUgb2YgMTYtYml0cycpXG4gIH1cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkgKz0gMikge1xuICAgIHN3YXAodGhpcywgaSwgaSArIDEpXG4gIH1cbiAgcmV0dXJuIHRoaXNcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5zd2FwMzIgPSBmdW5jdGlvbiBzd2FwMzIgKCkge1xuICB2YXIgbGVuID0gdGhpcy5sZW5ndGhcbiAgaWYgKGxlbiAlIDQgIT09IDApIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignQnVmZmVyIHNpemUgbXVzdCBiZSBhIG11bHRpcGxlIG9mIDMyLWJpdHMnKVxuICB9XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpICs9IDQpIHtcbiAgICBzd2FwKHRoaXMsIGksIGkgKyAzKVxuICAgIHN3YXAodGhpcywgaSArIDEsIGkgKyAyKVxuICB9XG4gIHJldHVybiB0aGlzXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiB0b1N0cmluZyAoKSB7XG4gIHZhciBsZW5ndGggPSB0aGlzLmxlbmd0aCB8IDBcbiAgaWYgKGxlbmd0aCA9PT0gMCkgcmV0dXJuICcnXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSByZXR1cm4gdXRmOFNsaWNlKHRoaXMsIDAsIGxlbmd0aClcbiAgcmV0dXJuIHNsb3dUb1N0cmluZy5hcHBseSh0aGlzLCBhcmd1bWVudHMpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuZXF1YWxzID0gZnVuY3Rpb24gZXF1YWxzIChiKSB7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGIpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudCBtdXN0IGJlIGEgQnVmZmVyJylcbiAgaWYgKHRoaXMgPT09IGIpIHJldHVybiB0cnVlXG4gIHJldHVybiBCdWZmZXIuY29tcGFyZSh0aGlzLCBiKSA9PT0gMFxufVxuXG5CdWZmZXIucHJvdG90eXBlLmluc3BlY3QgPSBmdW5jdGlvbiBpbnNwZWN0ICgpIHtcbiAgdmFyIHN0ciA9ICcnXG4gIHZhciBtYXggPSBleHBvcnRzLklOU1BFQ1RfTUFYX0JZVEVTXG4gIGlmICh0aGlzLmxlbmd0aCA+IDApIHtcbiAgICBzdHIgPSB0aGlzLnRvU3RyaW5nKCdoZXgnLCAwLCBtYXgpLm1hdGNoKC8uezJ9L2cpLmpvaW4oJyAnKVxuICAgIGlmICh0aGlzLmxlbmd0aCA+IG1heCkgc3RyICs9ICcgLi4uICdcbiAgfVxuICByZXR1cm4gJzxCdWZmZXIgJyArIHN0ciArICc+J1xufVxuXG5CdWZmZXIucHJvdG90eXBlLmNvbXBhcmUgPSBmdW5jdGlvbiBjb21wYXJlICh0YXJnZXQsIHN0YXJ0LCBlbmQsIHRoaXNTdGFydCwgdGhpc0VuZCkge1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcih0YXJnZXQpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJndW1lbnQgbXVzdCBiZSBhIEJ1ZmZlcicpXG4gIH1cblxuICBpZiAoc3RhcnQgPT09IHVuZGVmaW5lZCkge1xuICAgIHN0YXJ0ID0gMFxuICB9XG4gIGlmIChlbmQgPT09IHVuZGVmaW5lZCkge1xuICAgIGVuZCA9IHRhcmdldCA/IHRhcmdldC5sZW5ndGggOiAwXG4gIH1cbiAgaWYgKHRoaXNTdGFydCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdGhpc1N0YXJ0ID0gMFxuICB9XG4gIGlmICh0aGlzRW5kID09PSB1bmRlZmluZWQpIHtcbiAgICB0aGlzRW5kID0gdGhpcy5sZW5ndGhcbiAgfVxuXG4gIGlmIChzdGFydCA8IDAgfHwgZW5kID4gdGFyZ2V0Lmxlbmd0aCB8fCB0aGlzU3RhcnQgPCAwIHx8IHRoaXNFbmQgPiB0aGlzLmxlbmd0aCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdvdXQgb2YgcmFuZ2UgaW5kZXgnKVxuICB9XG5cbiAgaWYgKHRoaXNTdGFydCA+PSB0aGlzRW5kICYmIHN0YXJ0ID49IGVuZCkge1xuICAgIHJldHVybiAwXG4gIH1cbiAgaWYgKHRoaXNTdGFydCA+PSB0aGlzRW5kKSB7XG4gICAgcmV0dXJuIC0xXG4gIH1cbiAgaWYgKHN0YXJ0ID49IGVuZCkge1xuICAgIHJldHVybiAxXG4gIH1cblxuICBzdGFydCA+Pj49IDBcbiAgZW5kID4+Pj0gMFxuICB0aGlzU3RhcnQgPj4+PSAwXG4gIHRoaXNFbmQgPj4+PSAwXG5cbiAgaWYgKHRoaXMgPT09IHRhcmdldCkgcmV0dXJuIDBcblxuICB2YXIgeCA9IHRoaXNFbmQgLSB0aGlzU3RhcnRcbiAgdmFyIHkgPSBlbmQgLSBzdGFydFxuICB2YXIgbGVuID0gTWF0aC5taW4oeCwgeSlcblxuICB2YXIgdGhpc0NvcHkgPSB0aGlzLnNsaWNlKHRoaXNTdGFydCwgdGhpc0VuZClcbiAgdmFyIHRhcmdldENvcHkgPSB0YXJnZXQuc2xpY2Uoc3RhcnQsIGVuZClcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgKytpKSB7XG4gICAgaWYgKHRoaXNDb3B5W2ldICE9PSB0YXJnZXRDb3B5W2ldKSB7XG4gICAgICB4ID0gdGhpc0NvcHlbaV1cbiAgICAgIHkgPSB0YXJnZXRDb3B5W2ldXG4gICAgICBicmVha1xuICAgIH1cbiAgfVxuXG4gIGlmICh4IDwgeSkgcmV0dXJuIC0xXG4gIGlmICh5IDwgeCkgcmV0dXJuIDFcbiAgcmV0dXJuIDBcbn1cblxuZnVuY3Rpb24gYXJyYXlJbmRleE9mIChhcnIsIHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcpIHtcbiAgdmFyIGluZGV4U2l6ZSA9IDFcbiAgdmFyIGFyckxlbmd0aCA9IGFyci5sZW5ndGhcbiAgdmFyIHZhbExlbmd0aCA9IHZhbC5sZW5ndGhcblxuICBpZiAoZW5jb2RpbmcgIT09IHVuZGVmaW5lZCkge1xuICAgIGVuY29kaW5nID0gU3RyaW5nKGVuY29kaW5nKS50b0xvd2VyQ2FzZSgpXG4gICAgaWYgKGVuY29kaW5nID09PSAndWNzMicgfHwgZW5jb2RpbmcgPT09ICd1Y3MtMicgfHxcbiAgICAgICAgZW5jb2RpbmcgPT09ICd1dGYxNmxlJyB8fCBlbmNvZGluZyA9PT0gJ3V0Zi0xNmxlJykge1xuICAgICAgaWYgKGFyci5sZW5ndGggPCAyIHx8IHZhbC5sZW5ndGggPCAyKSB7XG4gICAgICAgIHJldHVybiAtMVxuICAgICAgfVxuICAgICAgaW5kZXhTaXplID0gMlxuICAgICAgYXJyTGVuZ3RoIC89IDJcbiAgICAgIHZhbExlbmd0aCAvPSAyXG4gICAgICBieXRlT2Zmc2V0IC89IDJcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiByZWFkIChidWYsIGkpIHtcbiAgICBpZiAoaW5kZXhTaXplID09PSAxKSB7XG4gICAgICByZXR1cm4gYnVmW2ldXG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBidWYucmVhZFVJbnQxNkJFKGkgKiBpbmRleFNpemUpXG4gICAgfVxuICB9XG5cbiAgdmFyIGZvdW5kSW5kZXggPSAtMVxuICBmb3IgKHZhciBpID0gMDsgYnl0ZU9mZnNldCArIGkgPCBhcnJMZW5ndGg7IGkrKykge1xuICAgIGlmIChyZWFkKGFyciwgYnl0ZU9mZnNldCArIGkpID09PSByZWFkKHZhbCwgZm91bmRJbmRleCA9PT0gLTEgPyAwIDogaSAtIGZvdW5kSW5kZXgpKSB7XG4gICAgICBpZiAoZm91bmRJbmRleCA9PT0gLTEpIGZvdW5kSW5kZXggPSBpXG4gICAgICBpZiAoaSAtIGZvdW5kSW5kZXggKyAxID09PSB2YWxMZW5ndGgpIHJldHVybiAoYnl0ZU9mZnNldCArIGZvdW5kSW5kZXgpICogaW5kZXhTaXplXG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChmb3VuZEluZGV4ICE9PSAtMSkgaSAtPSBpIC0gZm91bmRJbmRleFxuICAgICAgZm91bmRJbmRleCA9IC0xXG4gICAgfVxuICB9XG4gIHJldHVybiAtMVxufVxuXG5CdWZmZXIucHJvdG90eXBlLmluZGV4T2YgPSBmdW5jdGlvbiBpbmRleE9mICh2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nKSB7XG4gIGlmICh0eXBlb2YgYnl0ZU9mZnNldCA9PT0gJ3N0cmluZycpIHtcbiAgICBlbmNvZGluZyA9IGJ5dGVPZmZzZXRcbiAgICBieXRlT2Zmc2V0ID0gMFxuICB9IGVsc2UgaWYgKGJ5dGVPZmZzZXQgPiAweDdmZmZmZmZmKSB7XG4gICAgYnl0ZU9mZnNldCA9IDB4N2ZmZmZmZmZcbiAgfSBlbHNlIGlmIChieXRlT2Zmc2V0IDwgLTB4ODAwMDAwMDApIHtcbiAgICBieXRlT2Zmc2V0ID0gLTB4ODAwMDAwMDBcbiAgfVxuICBieXRlT2Zmc2V0ID4+PSAwXG5cbiAgaWYgKHRoaXMubGVuZ3RoID09PSAwKSByZXR1cm4gLTFcbiAgaWYgKGJ5dGVPZmZzZXQgPj0gdGhpcy5sZW5ndGgpIHJldHVybiAtMVxuXG4gIC8vIE5lZ2F0aXZlIG9mZnNldHMgc3RhcnQgZnJvbSB0aGUgZW5kIG9mIHRoZSBidWZmZXJcbiAgaWYgKGJ5dGVPZmZzZXQgPCAwKSBieXRlT2Zmc2V0ID0gTWF0aC5tYXgodGhpcy5sZW5ndGggKyBieXRlT2Zmc2V0LCAwKVxuXG4gIGlmICh0eXBlb2YgdmFsID09PSAnc3RyaW5nJykge1xuICAgIHZhbCA9IEJ1ZmZlci5mcm9tKHZhbCwgZW5jb2RpbmcpXG4gIH1cblxuICBpZiAoQnVmZmVyLmlzQnVmZmVyKHZhbCkpIHtcbiAgICAvLyBzcGVjaWFsIGNhc2U6IGxvb2tpbmcgZm9yIGVtcHR5IHN0cmluZy9idWZmZXIgYWx3YXlzIGZhaWxzXG4gICAgaWYgKHZhbC5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiAtMVxuICAgIH1cbiAgICByZXR1cm4gYXJyYXlJbmRleE9mKHRoaXMsIHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcpXG4gIH1cbiAgaWYgKHR5cGVvZiB2YWwgPT09ICdudW1iZXInKSB7XG4gICAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUICYmIFVpbnQ4QXJyYXkucHJvdG90eXBlLmluZGV4T2YgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHJldHVybiBVaW50OEFycmF5LnByb3RvdHlwZS5pbmRleE9mLmNhbGwodGhpcywgdmFsLCBieXRlT2Zmc2V0KVxuICAgIH1cbiAgICByZXR1cm4gYXJyYXlJbmRleE9mKHRoaXMsIFsgdmFsIF0sIGJ5dGVPZmZzZXQsIGVuY29kaW5nKVxuICB9XG5cbiAgdGhyb3cgbmV3IFR5cGVFcnJvcigndmFsIG11c3QgYmUgc3RyaW5nLCBudW1iZXIgb3IgQnVmZmVyJylcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5pbmNsdWRlcyA9IGZ1bmN0aW9uIGluY2x1ZGVzICh2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nKSB7XG4gIHJldHVybiB0aGlzLmluZGV4T2YodmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZykgIT09IC0xXG59XG5cbmZ1bmN0aW9uIGhleFdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgb2Zmc2V0ID0gTnVtYmVyKG9mZnNldCkgfHwgMFxuICB2YXIgcmVtYWluaW5nID0gYnVmLmxlbmd0aCAtIG9mZnNldFxuICBpZiAoIWxlbmd0aCkge1xuICAgIGxlbmd0aCA9IHJlbWFpbmluZ1xuICB9IGVsc2Uge1xuICAgIGxlbmd0aCA9IE51bWJlcihsZW5ndGgpXG4gICAgaWYgKGxlbmd0aCA+IHJlbWFpbmluZykge1xuICAgICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gICAgfVxuICB9XG5cbiAgLy8gbXVzdCBiZSBhbiBldmVuIG51bWJlciBvZiBkaWdpdHNcbiAgdmFyIHN0ckxlbiA9IHN0cmluZy5sZW5ndGhcbiAgaWYgKHN0ckxlbiAlIDIgIT09IDApIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBoZXggc3RyaW5nJylcblxuICBpZiAobGVuZ3RoID4gc3RyTGVuIC8gMikge1xuICAgIGxlbmd0aCA9IHN0ckxlbiAvIDJcbiAgfVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIHBhcnNlZCA9IHBhcnNlSW50KHN0cmluZy5zdWJzdHIoaSAqIDIsIDIpLCAxNilcbiAgICBpZiAoaXNOYU4ocGFyc2VkKSkgcmV0dXJuIGlcbiAgICBidWZbb2Zmc2V0ICsgaV0gPSBwYXJzZWRcbiAgfVxuICByZXR1cm4gaVxufVxuXG5mdW5jdGlvbiB1dGY4V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gYmxpdEJ1ZmZlcih1dGY4VG9CeXRlcyhzdHJpbmcsIGJ1Zi5sZW5ndGggLSBvZmZzZXQpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5mdW5jdGlvbiBhc2NpaVdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGJsaXRCdWZmZXIoYXNjaWlUb0J5dGVzKHN0cmluZyksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbmZ1bmN0aW9uIGJpbmFyeVdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGFzY2lpV3JpdGUoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5mdW5jdGlvbiBiYXNlNjRXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBibGl0QnVmZmVyKGJhc2U2NFRvQnl0ZXMoc3RyaW5nKSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuZnVuY3Rpb24gdWNzMldyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGJsaXRCdWZmZXIodXRmMTZsZVRvQnl0ZXMoc3RyaW5nLCBidWYubGVuZ3RoIC0gb2Zmc2V0KSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZSA9IGZ1bmN0aW9uIHdyaXRlIChzdHJpbmcsIG9mZnNldCwgbGVuZ3RoLCBlbmNvZGluZykge1xuICAvLyBCdWZmZXIjd3JpdGUoc3RyaW5nKVxuICBpZiAob2Zmc2V0ID09PSB1bmRlZmluZWQpIHtcbiAgICBlbmNvZGluZyA9ICd1dGY4J1xuICAgIGxlbmd0aCA9IHRoaXMubGVuZ3RoXG4gICAgb2Zmc2V0ID0gMFxuICAvLyBCdWZmZXIjd3JpdGUoc3RyaW5nLCBlbmNvZGluZylcbiAgfSBlbHNlIGlmIChsZW5ndGggPT09IHVuZGVmaW5lZCAmJiB0eXBlb2Ygb2Zmc2V0ID09PSAnc3RyaW5nJykge1xuICAgIGVuY29kaW5nID0gb2Zmc2V0XG4gICAgbGVuZ3RoID0gdGhpcy5sZW5ndGhcbiAgICBvZmZzZXQgPSAwXG4gIC8vIEJ1ZmZlciN3cml0ZShzdHJpbmcsIG9mZnNldFssIGxlbmd0aF1bLCBlbmNvZGluZ10pXG4gIH0gZWxzZSBpZiAoaXNGaW5pdGUob2Zmc2V0KSkge1xuICAgIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgICBpZiAoaXNGaW5pdGUobGVuZ3RoKSkge1xuICAgICAgbGVuZ3RoID0gbGVuZ3RoIHwgMFxuICAgICAgaWYgKGVuY29kaW5nID09PSB1bmRlZmluZWQpIGVuY29kaW5nID0gJ3V0ZjgnXG4gICAgfSBlbHNlIHtcbiAgICAgIGVuY29kaW5nID0gbGVuZ3RoXG4gICAgICBsZW5ndGggPSB1bmRlZmluZWRcbiAgICB9XG4gIC8vIGxlZ2FjeSB3cml0ZShzdHJpbmcsIGVuY29kaW5nLCBvZmZzZXQsIGxlbmd0aCkgLSByZW1vdmUgaW4gdjAuMTNcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAnQnVmZmVyLndyaXRlKHN0cmluZywgZW5jb2RpbmcsIG9mZnNldFssIGxlbmd0aF0pIGlzIG5vIGxvbmdlciBzdXBwb3J0ZWQnXG4gICAgKVxuICB9XG5cbiAgdmFyIHJlbWFpbmluZyA9IHRoaXMubGVuZ3RoIC0gb2Zmc2V0XG4gIGlmIChsZW5ndGggPT09IHVuZGVmaW5lZCB8fCBsZW5ndGggPiByZW1haW5pbmcpIGxlbmd0aCA9IHJlbWFpbmluZ1xuXG4gIGlmICgoc3RyaW5nLmxlbmd0aCA+IDAgJiYgKGxlbmd0aCA8IDAgfHwgb2Zmc2V0IDwgMCkpIHx8IG9mZnNldCA+IHRoaXMubGVuZ3RoKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0F0dGVtcHQgdG8gd3JpdGUgb3V0c2lkZSBidWZmZXIgYm91bmRzJylcbiAgfVxuXG4gIGlmICghZW5jb2RpbmcpIGVuY29kaW5nID0gJ3V0ZjgnXG5cbiAgdmFyIGxvd2VyZWRDYXNlID0gZmFsc2VcbiAgZm9yICg7Oykge1xuICAgIHN3aXRjaCAoZW5jb2RpbmcpIHtcbiAgICAgIGNhc2UgJ2hleCc6XG4gICAgICAgIHJldHVybiBoZXhXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBjYXNlICd1dGY4JzpcbiAgICAgIGNhc2UgJ3V0Zi04JzpcbiAgICAgICAgcmV0dXJuIHV0ZjhXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBjYXNlICdhc2NpaSc6XG4gICAgICAgIHJldHVybiBhc2NpaVdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgICAgIHJldHVybiBiaW5hcnlXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBjYXNlICdiYXNlNjQnOlxuICAgICAgICAvLyBXYXJuaW5nOiBtYXhMZW5ndGggbm90IHRha2VuIGludG8gYWNjb3VudCBpbiBiYXNlNjRXcml0ZVxuICAgICAgICByZXR1cm4gYmFzZTY0V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAndWNzMic6XG4gICAgICBjYXNlICd1Y3MtMic6XG4gICAgICBjYXNlICd1dGYxNmxlJzpcbiAgICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgICAgcmV0dXJuIHVjczJXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBpZiAobG93ZXJlZENhc2UpIHRocm93IG5ldyBUeXBlRXJyb3IoJ1Vua25vd24gZW5jb2Rpbmc6ICcgKyBlbmNvZGluZylcbiAgICAgICAgZW5jb2RpbmcgPSAoJycgKyBlbmNvZGluZykudG9Mb3dlckNhc2UoKVxuICAgICAgICBsb3dlcmVkQ2FzZSA9IHRydWVcbiAgICB9XG4gIH1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS50b0pTT04gPSBmdW5jdGlvbiB0b0pTT04gKCkge1xuICByZXR1cm4ge1xuICAgIHR5cGU6ICdCdWZmZXInLFxuICAgIGRhdGE6IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKHRoaXMuX2FyciB8fCB0aGlzLCAwKVxuICB9XG59XG5cbmZ1bmN0aW9uIGJhc2U2NFNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgaWYgKHN0YXJ0ID09PSAwICYmIGVuZCA9PT0gYnVmLmxlbmd0aCkge1xuICAgIHJldHVybiBiYXNlNjQuZnJvbUJ5dGVBcnJheShidWYpXG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGJhc2U2NC5mcm9tQnl0ZUFycmF5KGJ1Zi5zbGljZShzdGFydCwgZW5kKSlcbiAgfVxufVxuXG5mdW5jdGlvbiB1dGY4U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICBlbmQgPSBNYXRoLm1pbihidWYubGVuZ3RoLCBlbmQpXG4gIHZhciByZXMgPSBbXVxuXG4gIHZhciBpID0gc3RhcnRcbiAgd2hpbGUgKGkgPCBlbmQpIHtcbiAgICB2YXIgZmlyc3RCeXRlID0gYnVmW2ldXG4gICAgdmFyIGNvZGVQb2ludCA9IG51bGxcbiAgICB2YXIgYnl0ZXNQZXJTZXF1ZW5jZSA9IChmaXJzdEJ5dGUgPiAweEVGKSA/IDRcbiAgICAgIDogKGZpcnN0Qnl0ZSA+IDB4REYpID8gM1xuICAgICAgOiAoZmlyc3RCeXRlID4gMHhCRikgPyAyXG4gICAgICA6IDFcblxuICAgIGlmIChpICsgYnl0ZXNQZXJTZXF1ZW5jZSA8PSBlbmQpIHtcbiAgICAgIHZhciBzZWNvbmRCeXRlLCB0aGlyZEJ5dGUsIGZvdXJ0aEJ5dGUsIHRlbXBDb2RlUG9pbnRcblxuICAgICAgc3dpdGNoIChieXRlc1BlclNlcXVlbmNlKSB7XG4gICAgICAgIGNhc2UgMTpcbiAgICAgICAgICBpZiAoZmlyc3RCeXRlIDwgMHg4MCkge1xuICAgICAgICAgICAgY29kZVBvaW50ID0gZmlyc3RCeXRlXG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIGNhc2UgMjpcbiAgICAgICAgICBzZWNvbmRCeXRlID0gYnVmW2kgKyAxXVxuICAgICAgICAgIGlmICgoc2Vjb25kQnl0ZSAmIDB4QzApID09PSAweDgwKSB7XG4gICAgICAgICAgICB0ZW1wQ29kZVBvaW50ID0gKGZpcnN0Qnl0ZSAmIDB4MUYpIDw8IDB4NiB8IChzZWNvbmRCeXRlICYgMHgzRilcbiAgICAgICAgICAgIGlmICh0ZW1wQ29kZVBvaW50ID4gMHg3Rikge1xuICAgICAgICAgICAgICBjb2RlUG9pbnQgPSB0ZW1wQ29kZVBvaW50XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIGNhc2UgMzpcbiAgICAgICAgICBzZWNvbmRCeXRlID0gYnVmW2kgKyAxXVxuICAgICAgICAgIHRoaXJkQnl0ZSA9IGJ1ZltpICsgMl1cbiAgICAgICAgICBpZiAoKHNlY29uZEJ5dGUgJiAweEMwKSA9PT0gMHg4MCAmJiAodGhpcmRCeXRlICYgMHhDMCkgPT09IDB4ODApIHtcbiAgICAgICAgICAgIHRlbXBDb2RlUG9pbnQgPSAoZmlyc3RCeXRlICYgMHhGKSA8PCAweEMgfCAoc2Vjb25kQnl0ZSAmIDB4M0YpIDw8IDB4NiB8ICh0aGlyZEJ5dGUgJiAweDNGKVxuICAgICAgICAgICAgaWYgKHRlbXBDb2RlUG9pbnQgPiAweDdGRiAmJiAodGVtcENvZGVQb2ludCA8IDB4RDgwMCB8fCB0ZW1wQ29kZVBvaW50ID4gMHhERkZGKSkge1xuICAgICAgICAgICAgICBjb2RlUG9pbnQgPSB0ZW1wQ29kZVBvaW50XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIGNhc2UgNDpcbiAgICAgICAgICBzZWNvbmRCeXRlID0gYnVmW2kgKyAxXVxuICAgICAgICAgIHRoaXJkQnl0ZSA9IGJ1ZltpICsgMl1cbiAgICAgICAgICBmb3VydGhCeXRlID0gYnVmW2kgKyAzXVxuICAgICAgICAgIGlmICgoc2Vjb25kQnl0ZSAmIDB4QzApID09PSAweDgwICYmICh0aGlyZEJ5dGUgJiAweEMwKSA9PT0gMHg4MCAmJiAoZm91cnRoQnl0ZSAmIDB4QzApID09PSAweDgwKSB7XG4gICAgICAgICAgICB0ZW1wQ29kZVBvaW50ID0gKGZpcnN0Qnl0ZSAmIDB4RikgPDwgMHgxMiB8IChzZWNvbmRCeXRlICYgMHgzRikgPDwgMHhDIHwgKHRoaXJkQnl0ZSAmIDB4M0YpIDw8IDB4NiB8IChmb3VydGhCeXRlICYgMHgzRilcbiAgICAgICAgICAgIGlmICh0ZW1wQ29kZVBvaW50ID4gMHhGRkZGICYmIHRlbXBDb2RlUG9pbnQgPCAweDExMDAwMCkge1xuICAgICAgICAgICAgICBjb2RlUG9pbnQgPSB0ZW1wQ29kZVBvaW50XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChjb2RlUG9pbnQgPT09IG51bGwpIHtcbiAgICAgIC8vIHdlIGRpZCBub3QgZ2VuZXJhdGUgYSB2YWxpZCBjb2RlUG9pbnQgc28gaW5zZXJ0IGFcbiAgICAgIC8vIHJlcGxhY2VtZW50IGNoYXIgKFUrRkZGRCkgYW5kIGFkdmFuY2Ugb25seSAxIGJ5dGVcbiAgICAgIGNvZGVQb2ludCA9IDB4RkZGRFxuICAgICAgYnl0ZXNQZXJTZXF1ZW5jZSA9IDFcbiAgICB9IGVsc2UgaWYgKGNvZGVQb2ludCA+IDB4RkZGRikge1xuICAgICAgLy8gZW5jb2RlIHRvIHV0ZjE2IChzdXJyb2dhdGUgcGFpciBkYW5jZSlcbiAgICAgIGNvZGVQb2ludCAtPSAweDEwMDAwXG4gICAgICByZXMucHVzaChjb2RlUG9pbnQgPj4+IDEwICYgMHgzRkYgfCAweEQ4MDApXG4gICAgICBjb2RlUG9pbnQgPSAweERDMDAgfCBjb2RlUG9pbnQgJiAweDNGRlxuICAgIH1cblxuICAgIHJlcy5wdXNoKGNvZGVQb2ludClcbiAgICBpICs9IGJ5dGVzUGVyU2VxdWVuY2VcbiAgfVxuXG4gIHJldHVybiBkZWNvZGVDb2RlUG9pbnRzQXJyYXkocmVzKVxufVxuXG4vLyBCYXNlZCBvbiBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8yMjc0NzI3Mi82ODA3NDIsIHRoZSBicm93c2VyIHdpdGhcbi8vIHRoZSBsb3dlc3QgbGltaXQgaXMgQ2hyb21lLCB3aXRoIDB4MTAwMDAgYXJncy5cbi8vIFdlIGdvIDEgbWFnbml0dWRlIGxlc3MsIGZvciBzYWZldHlcbnZhciBNQVhfQVJHVU1FTlRTX0xFTkdUSCA9IDB4MTAwMFxuXG5mdW5jdGlvbiBkZWNvZGVDb2RlUG9pbnRzQXJyYXkgKGNvZGVQb2ludHMpIHtcbiAgdmFyIGxlbiA9IGNvZGVQb2ludHMubGVuZ3RoXG4gIGlmIChsZW4gPD0gTUFYX0FSR1VNRU5UU19MRU5HVEgpIHtcbiAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZS5hcHBseShTdHJpbmcsIGNvZGVQb2ludHMpIC8vIGF2b2lkIGV4dHJhIHNsaWNlKClcbiAgfVxuXG4gIC8vIERlY29kZSBpbiBjaHVua3MgdG8gYXZvaWQgXCJjYWxsIHN0YWNrIHNpemUgZXhjZWVkZWRcIi5cbiAgdmFyIHJlcyA9ICcnXG4gIHZhciBpID0gMFxuICB3aGlsZSAoaSA8IGxlbikge1xuICAgIHJlcyArPSBTdHJpbmcuZnJvbUNoYXJDb2RlLmFwcGx5KFxuICAgICAgU3RyaW5nLFxuICAgICAgY29kZVBvaW50cy5zbGljZShpLCBpICs9IE1BWF9BUkdVTUVOVFNfTEVOR1RIKVxuICAgIClcbiAgfVxuICByZXR1cm4gcmVzXG59XG5cbmZ1bmN0aW9uIGFzY2lpU2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgcmV0ID0gJydcbiAgZW5kID0gTWF0aC5taW4oYnVmLmxlbmd0aCwgZW5kKVxuXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgcmV0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnVmW2ldICYgMHg3RilcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbmZ1bmN0aW9uIGJpbmFyeVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHJldCA9ICcnXG4gIGVuZCA9IE1hdGgubWluKGJ1Zi5sZW5ndGgsIGVuZClcblxuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xuICAgIHJldCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ1ZltpXSlcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbmZ1bmN0aW9uIGhleFNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcblxuICBpZiAoIXN0YXJ0IHx8IHN0YXJ0IDwgMCkgc3RhcnQgPSAwXG4gIGlmICghZW5kIHx8IGVuZCA8IDAgfHwgZW5kID4gbGVuKSBlbmQgPSBsZW5cblxuICB2YXIgb3V0ID0gJydcbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspIHtcbiAgICBvdXQgKz0gdG9IZXgoYnVmW2ldKVxuICB9XG4gIHJldHVybiBvdXRcbn1cblxuZnVuY3Rpb24gdXRmMTZsZVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGJ5dGVzID0gYnVmLnNsaWNlKHN0YXJ0LCBlbmQpXG4gIHZhciByZXMgPSAnJ1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGJ5dGVzLmxlbmd0aDsgaSArPSAyKSB7XG4gICAgcmVzICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnl0ZXNbaV0gKyBieXRlc1tpICsgMV0gKiAyNTYpXG4gIH1cbiAgcmV0dXJuIHJlc1xufVxuXG5CdWZmZXIucHJvdG90eXBlLnNsaWNlID0gZnVuY3Rpb24gc2xpY2UgKHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGxlbiA9IHRoaXMubGVuZ3RoXG4gIHN0YXJ0ID0gfn5zdGFydFxuICBlbmQgPSBlbmQgPT09IHVuZGVmaW5lZCA/IGxlbiA6IH5+ZW5kXG5cbiAgaWYgKHN0YXJ0IDwgMCkge1xuICAgIHN0YXJ0ICs9IGxlblxuICAgIGlmIChzdGFydCA8IDApIHN0YXJ0ID0gMFxuICB9IGVsc2UgaWYgKHN0YXJ0ID4gbGVuKSB7XG4gICAgc3RhcnQgPSBsZW5cbiAgfVxuXG4gIGlmIChlbmQgPCAwKSB7XG4gICAgZW5kICs9IGxlblxuICAgIGlmIChlbmQgPCAwKSBlbmQgPSAwXG4gIH0gZWxzZSBpZiAoZW5kID4gbGVuKSB7XG4gICAgZW5kID0gbGVuXG4gIH1cblxuICBpZiAoZW5kIDwgc3RhcnQpIGVuZCA9IHN0YXJ0XG5cbiAgdmFyIG5ld0J1ZlxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICBuZXdCdWYgPSB0aGlzLnN1YmFycmF5KHN0YXJ0LCBlbmQpXG4gICAgbmV3QnVmLl9fcHJvdG9fXyA9IEJ1ZmZlci5wcm90b3R5cGVcbiAgfSBlbHNlIHtcbiAgICB2YXIgc2xpY2VMZW4gPSBlbmQgLSBzdGFydFxuICAgIG5ld0J1ZiA9IG5ldyBCdWZmZXIoc2xpY2VMZW4sIHVuZGVmaW5lZClcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNsaWNlTGVuOyBpKyspIHtcbiAgICAgIG5ld0J1ZltpXSA9IHRoaXNbaSArIHN0YXJ0XVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBuZXdCdWZcbn1cblxuLypcbiAqIE5lZWQgdG8gbWFrZSBzdXJlIHRoYXQgYnVmZmVyIGlzbid0IHRyeWluZyB0byB3cml0ZSBvdXQgb2YgYm91bmRzLlxuICovXG5mdW5jdGlvbiBjaGVja09mZnNldCAob2Zmc2V0LCBleHQsIGxlbmd0aCkge1xuICBpZiAoKG9mZnNldCAlIDEpICE9PSAwIHx8IG9mZnNldCA8IDApIHRocm93IG5ldyBSYW5nZUVycm9yKCdvZmZzZXQgaXMgbm90IHVpbnQnKVxuICBpZiAob2Zmc2V0ICsgZXh0ID4gbGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignVHJ5aW5nIHRvIGFjY2VzcyBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnRMRSA9IGZ1bmN0aW9uIHJlYWRVSW50TEUgKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCBieXRlTGVuZ3RoLCB0aGlzLmxlbmd0aClcblxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXRdXG4gIHZhciBtdWwgPSAxXG4gIHZhciBpID0gMFxuICB3aGlsZSAoKytpIDwgYnl0ZUxlbmd0aCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHZhbCArPSB0aGlzW29mZnNldCArIGldICogbXVsXG4gIH1cblxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnRCRSA9IGZ1bmN0aW9uIHJlYWRVSW50QkUgKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCB8IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGNoZWNrT2Zmc2V0KG9mZnNldCwgYnl0ZUxlbmd0aCwgdGhpcy5sZW5ndGgpXG4gIH1cblxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXQgKyAtLWJ5dGVMZW5ndGhdXG4gIHZhciBtdWwgPSAxXG4gIHdoaWxlIChieXRlTGVuZ3RoID4gMCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHZhbCArPSB0aGlzW29mZnNldCArIC0tYnl0ZUxlbmd0aF0gKiBtdWxcbiAgfVxuXG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDggPSBmdW5jdGlvbiByZWFkVUludDggKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAxLCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIHRoaXNbb2Zmc2V0XVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MTZMRSA9IGZ1bmN0aW9uIHJlYWRVSW50MTZMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDIsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gdGhpc1tvZmZzZXRdIHwgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgOClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDE2QkUgPSBmdW5jdGlvbiByZWFkVUludDE2QkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAyLCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuICh0aGlzW29mZnNldF0gPDwgOCkgfCB0aGlzW29mZnNldCArIDFdXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQzMkxFID0gZnVuY3Rpb24gcmVhZFVJbnQzMkxFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICgodGhpc1tvZmZzZXRdKSB8XG4gICAgICAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KSB8XG4gICAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCAxNikpICtcbiAgICAgICh0aGlzW29mZnNldCArIDNdICogMHgxMDAwMDAwKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MzJCRSA9IGZ1bmN0aW9uIHJlYWRVSW50MzJCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAodGhpc1tvZmZzZXRdICogMHgxMDAwMDAwKSArXG4gICAgKCh0aGlzW29mZnNldCArIDFdIDw8IDE2KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMl0gPDwgOCkgfFxuICAgIHRoaXNbb2Zmc2V0ICsgM10pXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludExFID0gZnVuY3Rpb24gcmVhZEludExFIChvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgYnl0ZUxlbmd0aCwgdGhpcy5sZW5ndGgpXG5cbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0XVxuICB2YXIgbXVsID0gMVxuICB2YXIgaSA9IDBcbiAgd2hpbGUgKCsraSA8IGJ5dGVMZW5ndGggJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB2YWwgKz0gdGhpc1tvZmZzZXQgKyBpXSAqIG11bFxuICB9XG4gIG11bCAqPSAweDgwXG5cbiAgaWYgKHZhbCA+PSBtdWwpIHZhbCAtPSBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aClcblxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludEJFID0gZnVuY3Rpb24gcmVhZEludEJFIChvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgYnl0ZUxlbmd0aCwgdGhpcy5sZW5ndGgpXG5cbiAgdmFyIGkgPSBieXRlTGVuZ3RoXG4gIHZhciBtdWwgPSAxXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldCArIC0taV1cbiAgd2hpbGUgKGkgPiAwICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdmFsICs9IHRoaXNbb2Zmc2V0ICsgLS1pXSAqIG11bFxuICB9XG4gIG11bCAqPSAweDgwXG5cbiAgaWYgKHZhbCA+PSBtdWwpIHZhbCAtPSBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aClcblxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDggPSBmdW5jdGlvbiByZWFkSW50OCAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDEsIHRoaXMubGVuZ3RoKVxuICBpZiAoISh0aGlzW29mZnNldF0gJiAweDgwKSkgcmV0dXJuICh0aGlzW29mZnNldF0pXG4gIHJldHVybiAoKDB4ZmYgLSB0aGlzW29mZnNldF0gKyAxKSAqIC0xKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQxNkxFID0gZnVuY3Rpb24gcmVhZEludDE2TEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAyLCB0aGlzLmxlbmd0aClcbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0XSB8ICh0aGlzW29mZnNldCArIDFdIDw8IDgpXG4gIHJldHVybiAodmFsICYgMHg4MDAwKSA/IHZhbCB8IDB4RkZGRjAwMDAgOiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MTZCRSA9IGZ1bmN0aW9uIHJlYWRJbnQxNkJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMiwgdGhpcy5sZW5ndGgpXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldCArIDFdIHwgKHRoaXNbb2Zmc2V0XSA8PCA4KVxuICByZXR1cm4gKHZhbCAmIDB4ODAwMCkgPyB2YWwgfCAweEZGRkYwMDAwIDogdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDMyTEUgPSBmdW5jdGlvbiByZWFkSW50MzJMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAodGhpc1tvZmZzZXRdKSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgOCkgfFxuICAgICh0aGlzW29mZnNldCArIDJdIDw8IDE2KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgM10gPDwgMjQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDMyQkUgPSBmdW5jdGlvbiByZWFkSW50MzJCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAodGhpc1tvZmZzZXRdIDw8IDI0KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgMTYpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCA4KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgM10pXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEZsb2F0TEUgPSBmdW5jdGlvbiByZWFkRmxvYXRMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgdHJ1ZSwgMjMsIDQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEZsb2F0QkUgPSBmdW5jdGlvbiByZWFkRmxvYXRCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgZmFsc2UsIDIzLCA0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWREb3VibGVMRSA9IGZ1bmN0aW9uIHJlYWREb3VibGVMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDgsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgdHJ1ZSwgNTIsIDgpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZERvdWJsZUJFID0gZnVuY3Rpb24gcmVhZERvdWJsZUJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgOCwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiBpZWVlNzU0LnJlYWQodGhpcywgb2Zmc2V0LCBmYWxzZSwgNTIsIDgpXG59XG5cbmZ1bmN0aW9uIGNoZWNrSW50IChidWYsIHZhbHVlLCBvZmZzZXQsIGV4dCwgbWF4LCBtaW4pIHtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYnVmKSkgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJidWZmZXJcIiBhcmd1bWVudCBtdXN0IGJlIGEgQnVmZmVyIGluc3RhbmNlJylcbiAgaWYgKHZhbHVlID4gbWF4IHx8IHZhbHVlIDwgbWluKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignXCJ2YWx1ZVwiIGFyZ3VtZW50IGlzIG91dCBvZiBib3VuZHMnKVxuICBpZiAob2Zmc2V0ICsgZXh0ID4gYnVmLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0luZGV4IG91dCBvZiByYW5nZScpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50TEUgPSBmdW5jdGlvbiB3cml0ZVVJbnRMRSAodmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCB8IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIHZhciBtYXhCeXRlcyA9IE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoKSAtIDFcbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBtYXhCeXRlcywgMClcbiAgfVxuXG4gIHZhciBtdWwgPSAxXG4gIHZhciBpID0gMFxuICB0aGlzW29mZnNldF0gPSB2YWx1ZSAmIDB4RkZcbiAgd2hpbGUgKCsraSA8IGJ5dGVMZW5ndGggJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB0aGlzW29mZnNldCArIGldID0gKHZhbHVlIC8gbXVsKSAmIDB4RkZcbiAgfVxuXG4gIHJldHVybiBvZmZzZXQgKyBieXRlTGVuZ3RoXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50QkUgPSBmdW5jdGlvbiB3cml0ZVVJbnRCRSAodmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCB8IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIHZhciBtYXhCeXRlcyA9IE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoKSAtIDFcbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBtYXhCeXRlcywgMClcbiAgfVxuXG4gIHZhciBpID0gYnl0ZUxlbmd0aCAtIDFcbiAgdmFyIG11bCA9IDFcbiAgdGhpc1tvZmZzZXQgKyBpXSA9IHZhbHVlICYgMHhGRlxuICB3aGlsZSAoLS1pID49IDAgJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB0aGlzW29mZnNldCArIGldID0gKHZhbHVlIC8gbXVsKSAmIDB4RkZcbiAgfVxuXG4gIHJldHVybiBvZmZzZXQgKyBieXRlTGVuZ3RoXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50OCA9IGZ1bmN0aW9uIHdyaXRlVUludDggKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMSwgMHhmZiwgMClcbiAgaWYgKCFCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkgdmFsdWUgPSBNYXRoLmZsb29yKHZhbHVlKVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgJiAweGZmKVxuICByZXR1cm4gb2Zmc2V0ICsgMVxufVxuXG5mdW5jdGlvbiBvYmplY3RXcml0ZVVJbnQxNiAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4pIHtcbiAgaWYgKHZhbHVlIDwgMCkgdmFsdWUgPSAweGZmZmYgKyB2YWx1ZSArIDFcbiAgZm9yICh2YXIgaSA9IDAsIGogPSBNYXRoLm1pbihidWYubGVuZ3RoIC0gb2Zmc2V0LCAyKTsgaSA8IGo7IGkrKykge1xuICAgIGJ1ZltvZmZzZXQgKyBpXSA9ICh2YWx1ZSAmICgweGZmIDw8ICg4ICogKGxpdHRsZUVuZGlhbiA/IGkgOiAxIC0gaSkpKSkgPj4+XG4gICAgICAobGl0dGxlRW5kaWFuID8gaSA6IDEgLSBpKSAqIDhcbiAgfVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDE2TEUgPSBmdW5jdGlvbiB3cml0ZVVJbnQxNkxFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDIsIDB4ZmZmZiwgMClcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXRdID0gKHZhbHVlICYgMHhmZilcbiAgICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiA4KVxuICB9IGVsc2Uge1xuICAgIG9iamVjdFdyaXRlVUludDE2KHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUpXG4gIH1cbiAgcmV0dXJuIG9mZnNldCArIDJcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQxNkJFID0gZnVuY3Rpb24gd3JpdGVVSW50MTZCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweGZmZmYsIDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSA+Pj4gOClcbiAgICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlICYgMHhmZilcbiAgfSBlbHNlIHtcbiAgICBvYmplY3RXcml0ZVVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSlcbiAgfVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5mdW5jdGlvbiBvYmplY3RXcml0ZVVJbnQzMiAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4pIHtcbiAgaWYgKHZhbHVlIDwgMCkgdmFsdWUgPSAweGZmZmZmZmZmICsgdmFsdWUgKyAxXG4gIGZvciAodmFyIGkgPSAwLCBqID0gTWF0aC5taW4oYnVmLmxlbmd0aCAtIG9mZnNldCwgNCk7IGkgPCBqOyBpKyspIHtcbiAgICBidWZbb2Zmc2V0ICsgaV0gPSAodmFsdWUgPj4+IChsaXR0bGVFbmRpYW4gPyBpIDogMyAtIGkpICogOCkgJiAweGZmXG4gIH1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQzMkxFID0gZnVuY3Rpb24gd3JpdGVVSW50MzJMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweGZmZmZmZmZmLCAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldCArIDNdID0gKHZhbHVlID4+PiAyNClcbiAgICB0aGlzW29mZnNldCArIDJdID0gKHZhbHVlID4+PiAxNilcbiAgICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiA4KVxuICAgIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIH0gZWxzZSB7XG4gICAgb2JqZWN0V3JpdGVVSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSlcbiAgfVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDMyQkUgPSBmdW5jdGlvbiB3cml0ZVVJbnQzMkJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDQsIDB4ZmZmZmZmZmYsIDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSA+Pj4gMjQpXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gMTYpXG4gICAgdGhpc1tvZmZzZXQgKyAyXSA9ICh2YWx1ZSA+Pj4gOClcbiAgICB0aGlzW29mZnNldCArIDNdID0gKHZhbHVlICYgMHhmZilcbiAgfSBlbHNlIHtcbiAgICBvYmplY3RXcml0ZVVJbnQzMih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSlcbiAgfVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50TEUgPSBmdW5jdGlvbiB3cml0ZUludExFICh2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICB2YXIgbGltaXQgPSBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aCAtIDEpXG5cbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBsaW1pdCAtIDEsIC1saW1pdClcbiAgfVxuXG4gIHZhciBpID0gMFxuICB2YXIgbXVsID0gMVxuICB2YXIgc3ViID0gMFxuICB0aGlzW29mZnNldF0gPSB2YWx1ZSAmIDB4RkZcbiAgd2hpbGUgKCsraSA8IGJ5dGVMZW5ndGggJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICBpZiAodmFsdWUgPCAwICYmIHN1YiA9PT0gMCAmJiB0aGlzW29mZnNldCArIGkgLSAxXSAhPT0gMCkge1xuICAgICAgc3ViID0gMVxuICAgIH1cbiAgICB0aGlzW29mZnNldCArIGldID0gKCh2YWx1ZSAvIG11bCkgPj4gMCkgLSBzdWIgJiAweEZGXG4gIH1cblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50QkUgPSBmdW5jdGlvbiB3cml0ZUludEJFICh2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICB2YXIgbGltaXQgPSBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aCAtIDEpXG5cbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBsaW1pdCAtIDEsIC1saW1pdClcbiAgfVxuXG4gIHZhciBpID0gYnl0ZUxlbmd0aCAtIDFcbiAgdmFyIG11bCA9IDFcbiAgdmFyIHN1YiA9IDBcbiAgdGhpc1tvZmZzZXQgKyBpXSA9IHZhbHVlICYgMHhGRlxuICB3aGlsZSAoLS1pID49IDAgJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICBpZiAodmFsdWUgPCAwICYmIHN1YiA9PT0gMCAmJiB0aGlzW29mZnNldCArIGkgKyAxXSAhPT0gMCkge1xuICAgICAgc3ViID0gMVxuICAgIH1cbiAgICB0aGlzW29mZnNldCArIGldID0gKCh2YWx1ZSAvIG11bCkgPj4gMCkgLSBzdWIgJiAweEZGXG4gIH1cblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50OCA9IGZ1bmN0aW9uIHdyaXRlSW50OCAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAxLCAweDdmLCAtMHg4MClcbiAgaWYgKCFCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkgdmFsdWUgPSBNYXRoLmZsb29yKHZhbHVlKVxuICBpZiAodmFsdWUgPCAwKSB2YWx1ZSA9IDB4ZmYgKyB2YWx1ZSArIDFcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlICYgMHhmZilcbiAgcmV0dXJuIG9mZnNldCArIDFcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDE2TEUgPSBmdW5jdGlvbiB3cml0ZUludDE2TEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHg3ZmZmLCAtMHg4MDAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSAodmFsdWUgJiAweGZmKVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gIH0gZWxzZSB7XG4gICAgb2JqZWN0V3JpdGVVSW50MTYodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSlcbiAgfVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MTZCRSA9IGZ1bmN0aW9uIHdyaXRlSW50MTZCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweDdmZmYsIC0weDgwMDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSA+Pj4gOClcbiAgICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlICYgMHhmZilcbiAgfSBlbHNlIHtcbiAgICBvYmplY3RXcml0ZVVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSlcbiAgfVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MzJMRSA9IGZ1bmN0aW9uIHdyaXRlSW50MzJMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweDdmZmZmZmZmLCAtMHg4MDAwMDAwMClcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXRdID0gKHZhbHVlICYgMHhmZilcbiAgICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiA4KVxuICAgIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDE2KVxuICAgIHRoaXNbb2Zmc2V0ICsgM10gPSAodmFsdWUgPj4+IDI0KVxuICB9IGVsc2Uge1xuICAgIG9iamVjdFdyaXRlVUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUpXG4gIH1cbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDMyQkUgPSBmdW5jdGlvbiB3cml0ZUludDMyQkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgNCwgMHg3ZmZmZmZmZiwgLTB4ODAwMDAwMDApXG4gIGlmICh2YWx1ZSA8IDApIHZhbHVlID0gMHhmZmZmZmZmZiArIHZhbHVlICsgMVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDI0KVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDE2KVxuICAgIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDgpXG4gICAgdGhpc1tvZmZzZXQgKyAzXSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIH0gZWxzZSB7XG4gICAgb2JqZWN0V3JpdGVVSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UpXG4gIH1cbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuZnVuY3Rpb24gY2hlY2tJRUVFNzU0IChidWYsIHZhbHVlLCBvZmZzZXQsIGV4dCwgbWF4LCBtaW4pIHtcbiAgaWYgKG9mZnNldCArIGV4dCA+IGJ1Zi5sZW5ndGgpIHRocm93IG5ldyBSYW5nZUVycm9yKCdJbmRleCBvdXQgb2YgcmFuZ2UnKVxuICBpZiAob2Zmc2V0IDwgMCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0luZGV4IG91dCBvZiByYW5nZScpXG59XG5cbmZ1bmN0aW9uIHdyaXRlRmxvYXQgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgY2hlY2tJRUVFNzU0KGJ1ZiwgdmFsdWUsIG9mZnNldCwgNCwgMy40MDI4MjM0NjYzODUyODg2ZSszOCwgLTMuNDAyODIzNDY2Mzg1Mjg4NmUrMzgpXG4gIH1cbiAgaWVlZTc1NC53cml0ZShidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgMjMsIDQpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVGbG9hdExFID0gZnVuY3Rpb24gd3JpdGVGbG9hdExFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVGbG9hdCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUZsb2F0QkUgPSBmdW5jdGlvbiB3cml0ZUZsb2F0QkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZUZsb2F0KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gd3JpdGVEb3VibGUgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgY2hlY2tJRUVFNzU0KGJ1ZiwgdmFsdWUsIG9mZnNldCwgOCwgMS43OTc2OTMxMzQ4NjIzMTU3RSszMDgsIC0xLjc5NzY5MzEzNDg2MjMxNTdFKzMwOClcbiAgfVxuICBpZWVlNzU0LndyaXRlKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCA1MiwgOClcbiAgcmV0dXJuIG9mZnNldCArIDhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZURvdWJsZUxFID0gZnVuY3Rpb24gd3JpdGVEb3VibGVMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHdyaXRlRG91YmxlKHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRG91YmxlQkUgPSBmdW5jdGlvbiB3cml0ZURvdWJsZUJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVEb3VibGUodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG4vLyBjb3B5KHRhcmdldEJ1ZmZlciwgdGFyZ2V0U3RhcnQ9MCwgc291cmNlU3RhcnQ9MCwgc291cmNlRW5kPWJ1ZmZlci5sZW5ndGgpXG5CdWZmZXIucHJvdG90eXBlLmNvcHkgPSBmdW5jdGlvbiBjb3B5ICh0YXJnZXQsIHRhcmdldFN0YXJ0LCBzdGFydCwgZW5kKSB7XG4gIGlmICghc3RhcnQpIHN0YXJ0ID0gMFxuICBpZiAoIWVuZCAmJiBlbmQgIT09IDApIGVuZCA9IHRoaXMubGVuZ3RoXG4gIGlmICh0YXJnZXRTdGFydCA+PSB0YXJnZXQubGVuZ3RoKSB0YXJnZXRTdGFydCA9IHRhcmdldC5sZW5ndGhcbiAgaWYgKCF0YXJnZXRTdGFydCkgdGFyZ2V0U3RhcnQgPSAwXG4gIGlmIChlbmQgPiAwICYmIGVuZCA8IHN0YXJ0KSBlbmQgPSBzdGFydFxuXG4gIC8vIENvcHkgMCBieXRlczsgd2UncmUgZG9uZVxuICBpZiAoZW5kID09PSBzdGFydCkgcmV0dXJuIDBcbiAgaWYgKHRhcmdldC5sZW5ndGggPT09IDAgfHwgdGhpcy5sZW5ndGggPT09IDApIHJldHVybiAwXG5cbiAgLy8gRmF0YWwgZXJyb3IgY29uZGl0aW9uc1xuICBpZiAodGFyZ2V0U3RhcnQgPCAwKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ3RhcmdldFN0YXJ0IG91dCBvZiBib3VuZHMnKVxuICB9XG4gIGlmIChzdGFydCA8IDAgfHwgc3RhcnQgPj0gdGhpcy5sZW5ndGgpIHRocm93IG5ldyBSYW5nZUVycm9yKCdzb3VyY2VTdGFydCBvdXQgb2YgYm91bmRzJylcbiAgaWYgKGVuZCA8IDApIHRocm93IG5ldyBSYW5nZUVycm9yKCdzb3VyY2VFbmQgb3V0IG9mIGJvdW5kcycpXG5cbiAgLy8gQXJlIHdlIG9vYj9cbiAgaWYgKGVuZCA+IHRoaXMubGVuZ3RoKSBlbmQgPSB0aGlzLmxlbmd0aFxuICBpZiAodGFyZ2V0Lmxlbmd0aCAtIHRhcmdldFN0YXJ0IDwgZW5kIC0gc3RhcnQpIHtcbiAgICBlbmQgPSB0YXJnZXQubGVuZ3RoIC0gdGFyZ2V0U3RhcnQgKyBzdGFydFxuICB9XG5cbiAgdmFyIGxlbiA9IGVuZCAtIHN0YXJ0XG4gIHZhciBpXG5cbiAgaWYgKHRoaXMgPT09IHRhcmdldCAmJiBzdGFydCA8IHRhcmdldFN0YXJ0ICYmIHRhcmdldFN0YXJ0IDwgZW5kKSB7XG4gICAgLy8gZGVzY2VuZGluZyBjb3B5IGZyb20gZW5kXG4gICAgZm9yIChpID0gbGVuIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgIHRhcmdldFtpICsgdGFyZ2V0U3RhcnRdID0gdGhpc1tpICsgc3RhcnRdXG4gICAgfVxuICB9IGVsc2UgaWYgKGxlbiA8IDEwMDAgfHwgIUJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgLy8gYXNjZW5kaW5nIGNvcHkgZnJvbSBzdGFydFxuICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgdGFyZ2V0W2kgKyB0YXJnZXRTdGFydF0gPSB0aGlzW2kgKyBzdGFydF1cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgVWludDhBcnJheS5wcm90b3R5cGUuc2V0LmNhbGwoXG4gICAgICB0YXJnZXQsXG4gICAgICB0aGlzLnN1YmFycmF5KHN0YXJ0LCBzdGFydCArIGxlbiksXG4gICAgICB0YXJnZXRTdGFydFxuICAgIClcbiAgfVxuXG4gIHJldHVybiBsZW5cbn1cblxuLy8gVXNhZ2U6XG4vLyAgICBidWZmZXIuZmlsbChudW1iZXJbLCBvZmZzZXRbLCBlbmRdXSlcbi8vICAgIGJ1ZmZlci5maWxsKGJ1ZmZlclssIG9mZnNldFssIGVuZF1dKVxuLy8gICAgYnVmZmVyLmZpbGwoc3RyaW5nWywgb2Zmc2V0WywgZW5kXV1bLCBlbmNvZGluZ10pXG5CdWZmZXIucHJvdG90eXBlLmZpbGwgPSBmdW5jdGlvbiBmaWxsICh2YWwsIHN0YXJ0LCBlbmQsIGVuY29kaW5nKSB7XG4gIC8vIEhhbmRsZSBzdHJpbmcgY2FzZXM6XG4gIGlmICh0eXBlb2YgdmFsID09PSAnc3RyaW5nJykge1xuICAgIGlmICh0eXBlb2Ygc3RhcnQgPT09ICdzdHJpbmcnKSB7XG4gICAgICBlbmNvZGluZyA9IHN0YXJ0XG4gICAgICBzdGFydCA9IDBcbiAgICAgIGVuZCA9IHRoaXMubGVuZ3RoXG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZW5kID09PSAnc3RyaW5nJykge1xuICAgICAgZW5jb2RpbmcgPSBlbmRcbiAgICAgIGVuZCA9IHRoaXMubGVuZ3RoXG4gICAgfVxuICAgIGlmICh2YWwubGVuZ3RoID09PSAxKSB7XG4gICAgICB2YXIgY29kZSA9IHZhbC5jaGFyQ29kZUF0KDApXG4gICAgICBpZiAoY29kZSA8IDI1Nikge1xuICAgICAgICB2YWwgPSBjb2RlXG4gICAgICB9XG4gICAgfVxuICAgIGlmIChlbmNvZGluZyAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZiBlbmNvZGluZyAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2VuY29kaW5nIG11c3QgYmUgYSBzdHJpbmcnKVxuICAgIH1cbiAgICBpZiAodHlwZW9mIGVuY29kaW5nID09PSAnc3RyaW5nJyAmJiAhQnVmZmVyLmlzRW5jb2RpbmcoZW5jb2RpbmcpKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdVbmtub3duIGVuY29kaW5nOiAnICsgZW5jb2RpbmcpXG4gICAgfVxuICB9IGVsc2UgaWYgKHR5cGVvZiB2YWwgPT09ICdudW1iZXInKSB7XG4gICAgdmFsID0gdmFsICYgMjU1XG4gIH1cblxuICAvLyBJbnZhbGlkIHJhbmdlcyBhcmUgbm90IHNldCB0byBhIGRlZmF1bHQsIHNvIGNhbiByYW5nZSBjaGVjayBlYXJseS5cbiAgaWYgKHN0YXJ0IDwgMCB8fCB0aGlzLmxlbmd0aCA8IHN0YXJ0IHx8IHRoaXMubGVuZ3RoIDwgZW5kKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ091dCBvZiByYW5nZSBpbmRleCcpXG4gIH1cblxuICBpZiAoZW5kIDw9IHN0YXJ0KSB7XG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIHN0YXJ0ID0gc3RhcnQgPj4+IDBcbiAgZW5kID0gZW5kID09PSB1bmRlZmluZWQgPyB0aGlzLmxlbmd0aCA6IGVuZCA+Pj4gMFxuXG4gIGlmICghdmFsKSB2YWwgPSAwXG5cbiAgdmFyIGlcbiAgaWYgKHR5cGVvZiB2YWwgPT09ICdudW1iZXInKSB7XG4gICAgZm9yIChpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xuICAgICAgdGhpc1tpXSA9IHZhbFxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB2YXIgYnl0ZXMgPSBCdWZmZXIuaXNCdWZmZXIodmFsKVxuICAgICAgPyB2YWxcbiAgICAgIDogdXRmOFRvQnl0ZXMobmV3IEJ1ZmZlcih2YWwsIGVuY29kaW5nKS50b1N0cmluZygpKVxuICAgIHZhciBsZW4gPSBieXRlcy5sZW5ndGhcbiAgICBmb3IgKGkgPSAwOyBpIDwgZW5kIC0gc3RhcnQ7IGkrKykge1xuICAgICAgdGhpc1tpICsgc3RhcnRdID0gYnl0ZXNbaSAlIGxlbl1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpc1xufVxuXG4vLyBIRUxQRVIgRlVOQ1RJT05TXG4vLyA9PT09PT09PT09PT09PT09XG5cbnZhciBJTlZBTElEX0JBU0U2NF9SRSA9IC9bXitcXC8wLTlBLVphLXotX10vZ1xuXG5mdW5jdGlvbiBiYXNlNjRjbGVhbiAoc3RyKSB7XG4gIC8vIE5vZGUgc3RyaXBzIG91dCBpbnZhbGlkIGNoYXJhY3RlcnMgbGlrZSBcXG4gYW5kIFxcdCBmcm9tIHRoZSBzdHJpbmcsIGJhc2U2NC1qcyBkb2VzIG5vdFxuICBzdHIgPSBzdHJpbmd0cmltKHN0cikucmVwbGFjZShJTlZBTElEX0JBU0U2NF9SRSwgJycpXG4gIC8vIE5vZGUgY29udmVydHMgc3RyaW5ncyB3aXRoIGxlbmd0aCA8IDIgdG8gJydcbiAgaWYgKHN0ci5sZW5ndGggPCAyKSByZXR1cm4gJydcbiAgLy8gTm9kZSBhbGxvd3MgZm9yIG5vbi1wYWRkZWQgYmFzZTY0IHN0cmluZ3MgKG1pc3NpbmcgdHJhaWxpbmcgPT09KSwgYmFzZTY0LWpzIGRvZXMgbm90XG4gIHdoaWxlIChzdHIubGVuZ3RoICUgNCAhPT0gMCkge1xuICAgIHN0ciA9IHN0ciArICc9J1xuICB9XG4gIHJldHVybiBzdHJcbn1cblxuZnVuY3Rpb24gc3RyaW5ndHJpbSAoc3RyKSB7XG4gIGlmIChzdHIudHJpbSkgcmV0dXJuIHN0ci50cmltKClcbiAgcmV0dXJuIHN0ci5yZXBsYWNlKC9eXFxzK3xcXHMrJC9nLCAnJylcbn1cblxuZnVuY3Rpb24gdG9IZXggKG4pIHtcbiAgaWYgKG4gPCAxNikgcmV0dXJuICcwJyArIG4udG9TdHJpbmcoMTYpXG4gIHJldHVybiBuLnRvU3RyaW5nKDE2KVxufVxuXG5mdW5jdGlvbiB1dGY4VG9CeXRlcyAoc3RyaW5nLCB1bml0cykge1xuICB1bml0cyA9IHVuaXRzIHx8IEluZmluaXR5XG4gIHZhciBjb2RlUG9pbnRcbiAgdmFyIGxlbmd0aCA9IHN0cmluZy5sZW5ndGhcbiAgdmFyIGxlYWRTdXJyb2dhdGUgPSBudWxsXG4gIHZhciBieXRlcyA9IFtdXG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIGNvZGVQb2ludCA9IHN0cmluZy5jaGFyQ29kZUF0KGkpXG5cbiAgICAvLyBpcyBzdXJyb2dhdGUgY29tcG9uZW50XG4gICAgaWYgKGNvZGVQb2ludCA+IDB4RDdGRiAmJiBjb2RlUG9pbnQgPCAweEUwMDApIHtcbiAgICAgIC8vIGxhc3QgY2hhciB3YXMgYSBsZWFkXG4gICAgICBpZiAoIWxlYWRTdXJyb2dhdGUpIHtcbiAgICAgICAgLy8gbm8gbGVhZCB5ZXRcbiAgICAgICAgaWYgKGNvZGVQb2ludCA+IDB4REJGRikge1xuICAgICAgICAgIC8vIHVuZXhwZWN0ZWQgdHJhaWxcbiAgICAgICAgICBpZiAoKHVuaXRzIC09IDMpID4gLTEpIGJ5dGVzLnB1c2goMHhFRiwgMHhCRiwgMHhCRClcbiAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9IGVsc2UgaWYgKGkgKyAxID09PSBsZW5ndGgpIHtcbiAgICAgICAgICAvLyB1bnBhaXJlZCBsZWFkXG4gICAgICAgICAgaWYgKCh1bml0cyAtPSAzKSA+IC0xKSBieXRlcy5wdXNoKDB4RUYsIDB4QkYsIDB4QkQpXG4gICAgICAgICAgY29udGludWVcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHZhbGlkIGxlYWRcbiAgICAgICAgbGVhZFN1cnJvZ2F0ZSA9IGNvZGVQb2ludFxuXG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG5cbiAgICAgIC8vIDIgbGVhZHMgaW4gYSByb3dcbiAgICAgIGlmIChjb2RlUG9pbnQgPCAweERDMDApIHtcbiAgICAgICAgaWYgKCh1bml0cyAtPSAzKSA+IC0xKSBieXRlcy5wdXNoKDB4RUYsIDB4QkYsIDB4QkQpXG4gICAgICAgIGxlYWRTdXJyb2dhdGUgPSBjb2RlUG9pbnRcbiAgICAgICAgY29udGludWVcbiAgICAgIH1cblxuICAgICAgLy8gdmFsaWQgc3Vycm9nYXRlIHBhaXJcbiAgICAgIGNvZGVQb2ludCA9IChsZWFkU3Vycm9nYXRlIC0gMHhEODAwIDw8IDEwIHwgY29kZVBvaW50IC0gMHhEQzAwKSArIDB4MTAwMDBcbiAgICB9IGVsc2UgaWYgKGxlYWRTdXJyb2dhdGUpIHtcbiAgICAgIC8vIHZhbGlkIGJtcCBjaGFyLCBidXQgbGFzdCBjaGFyIHdhcyBhIGxlYWRcbiAgICAgIGlmICgodW5pdHMgLT0gMykgPiAtMSkgYnl0ZXMucHVzaCgweEVGLCAweEJGLCAweEJEKVxuICAgIH1cblxuICAgIGxlYWRTdXJyb2dhdGUgPSBudWxsXG5cbiAgICAvLyBlbmNvZGUgdXRmOFxuICAgIGlmIChjb2RlUG9pbnQgPCAweDgwKSB7XG4gICAgICBpZiAoKHVuaXRzIC09IDEpIDwgMCkgYnJlYWtcbiAgICAgIGJ5dGVzLnB1c2goY29kZVBvaW50KVxuICAgIH0gZWxzZSBpZiAoY29kZVBvaW50IDwgMHg4MDApIHtcbiAgICAgIGlmICgodW5pdHMgLT0gMikgPCAwKSBicmVha1xuICAgICAgYnl0ZXMucHVzaChcbiAgICAgICAgY29kZVBvaW50ID4+IDB4NiB8IDB4QzAsXG4gICAgICAgIGNvZGVQb2ludCAmIDB4M0YgfCAweDgwXG4gICAgICApXG4gICAgfSBlbHNlIGlmIChjb2RlUG9pbnQgPCAweDEwMDAwKSB7XG4gICAgICBpZiAoKHVuaXRzIC09IDMpIDwgMCkgYnJlYWtcbiAgICAgIGJ5dGVzLnB1c2goXG4gICAgICAgIGNvZGVQb2ludCA+PiAweEMgfCAweEUwLFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHg2ICYgMHgzRiB8IDB4ODAsXG4gICAgICAgIGNvZGVQb2ludCAmIDB4M0YgfCAweDgwXG4gICAgICApXG4gICAgfSBlbHNlIGlmIChjb2RlUG9pbnQgPCAweDExMDAwMCkge1xuICAgICAgaWYgKCh1bml0cyAtPSA0KSA8IDApIGJyZWFrXG4gICAgICBieXRlcy5wdXNoKFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHgxMiB8IDB4RjAsXG4gICAgICAgIGNvZGVQb2ludCA+PiAweEMgJiAweDNGIHwgMHg4MCxcbiAgICAgICAgY29kZVBvaW50ID4+IDB4NiAmIDB4M0YgfCAweDgwLFxuICAgICAgICBjb2RlUG9pbnQgJiAweDNGIHwgMHg4MFxuICAgICAgKVxuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgY29kZSBwb2ludCcpXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGJ5dGVzXG59XG5cbmZ1bmN0aW9uIGFzY2lpVG9CeXRlcyAoc3RyKSB7XG4gIHZhciBieXRlQXJyYXkgPSBbXVxuICBmb3IgKHZhciBpID0gMDsgaSA8IHN0ci5sZW5ndGg7IGkrKykge1xuICAgIC8vIE5vZGUncyBjb2RlIHNlZW1zIHRvIGJlIGRvaW5nIHRoaXMgYW5kIG5vdCAmIDB4N0YuLlxuICAgIGJ5dGVBcnJheS5wdXNoKHN0ci5jaGFyQ29kZUF0KGkpICYgMHhGRilcbiAgfVxuICByZXR1cm4gYnl0ZUFycmF5XG59XG5cbmZ1bmN0aW9uIHV0ZjE2bGVUb0J5dGVzIChzdHIsIHVuaXRzKSB7XG4gIHZhciBjLCBoaSwgbG9cbiAgdmFyIGJ5dGVBcnJheSA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKCh1bml0cyAtPSAyKSA8IDApIGJyZWFrXG5cbiAgICBjID0gc3RyLmNoYXJDb2RlQXQoaSlcbiAgICBoaSA9IGMgPj4gOFxuICAgIGxvID0gYyAlIDI1NlxuICAgIGJ5dGVBcnJheS5wdXNoKGxvKVxuICAgIGJ5dGVBcnJheS5wdXNoKGhpKVxuICB9XG5cbiAgcmV0dXJuIGJ5dGVBcnJheVxufVxuXG5mdW5jdGlvbiBiYXNlNjRUb0J5dGVzIChzdHIpIHtcbiAgcmV0dXJuIGJhc2U2NC50b0J5dGVBcnJheShiYXNlNjRjbGVhbihzdHIpKVxufVxuXG5mdW5jdGlvbiBibGl0QnVmZmVyIChzcmMsIGRzdCwgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIGlmICgoaSArIG9mZnNldCA+PSBkc3QubGVuZ3RoKSB8fCAoaSA+PSBzcmMubGVuZ3RoKSkgYnJlYWtcbiAgICBkc3RbaSArIG9mZnNldF0gPSBzcmNbaV1cbiAgfVxuICByZXR1cm4gaVxufVxuXG5mdW5jdGlvbiBpc25hbiAodmFsKSB7XG4gIHJldHVybiB2YWwgIT09IHZhbCAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXNlbGYtY29tcGFyZVxufVxuIiwiZXhwb3J0cy5yZWFkID0gZnVuY3Rpb24gKGJ1ZmZlciwgb2Zmc2V0LCBpc0xFLCBtTGVuLCBuQnl0ZXMpIHtcbiAgdmFyIGUsIG1cbiAgdmFyIGVMZW4gPSBuQnl0ZXMgKiA4IC0gbUxlbiAtIDFcbiAgdmFyIGVNYXggPSAoMSA8PCBlTGVuKSAtIDFcbiAgdmFyIGVCaWFzID0gZU1heCA+PiAxXG4gIHZhciBuQml0cyA9IC03XG4gIHZhciBpID0gaXNMRSA/IChuQnl0ZXMgLSAxKSA6IDBcbiAgdmFyIGQgPSBpc0xFID8gLTEgOiAxXG4gIHZhciBzID0gYnVmZmVyW29mZnNldCArIGldXG5cbiAgaSArPSBkXG5cbiAgZSA9IHMgJiAoKDEgPDwgKC1uQml0cykpIC0gMSlcbiAgcyA+Pj0gKC1uQml0cylcbiAgbkJpdHMgKz0gZUxlblxuICBmb3IgKDsgbkJpdHMgPiAwOyBlID0gZSAqIDI1NiArIGJ1ZmZlcltvZmZzZXQgKyBpXSwgaSArPSBkLCBuQml0cyAtPSA4KSB7fVxuXG4gIG0gPSBlICYgKCgxIDw8ICgtbkJpdHMpKSAtIDEpXG4gIGUgPj49ICgtbkJpdHMpXG4gIG5CaXRzICs9IG1MZW5cbiAgZm9yICg7IG5CaXRzID4gMDsgbSA9IG0gKiAyNTYgKyBidWZmZXJbb2Zmc2V0ICsgaV0sIGkgKz0gZCwgbkJpdHMgLT0gOCkge31cblxuICBpZiAoZSA9PT0gMCkge1xuICAgIGUgPSAxIC0gZUJpYXNcbiAgfSBlbHNlIGlmIChlID09PSBlTWF4KSB7XG4gICAgcmV0dXJuIG0gPyBOYU4gOiAoKHMgPyAtMSA6IDEpICogSW5maW5pdHkpXG4gIH0gZWxzZSB7XG4gICAgbSA9IG0gKyBNYXRoLnBvdygyLCBtTGVuKVxuICAgIGUgPSBlIC0gZUJpYXNcbiAgfVxuICByZXR1cm4gKHMgPyAtMSA6IDEpICogbSAqIE1hdGgucG93KDIsIGUgLSBtTGVuKVxufVxuXG5leHBvcnRzLndyaXRlID0gZnVuY3Rpb24gKGJ1ZmZlciwgdmFsdWUsIG9mZnNldCwgaXNMRSwgbUxlbiwgbkJ5dGVzKSB7XG4gIHZhciBlLCBtLCBjXG4gIHZhciBlTGVuID0gbkJ5dGVzICogOCAtIG1MZW4gLSAxXG4gIHZhciBlTWF4ID0gKDEgPDwgZUxlbikgLSAxXG4gIHZhciBlQmlhcyA9IGVNYXggPj4gMVxuICB2YXIgcnQgPSAobUxlbiA9PT0gMjMgPyBNYXRoLnBvdygyLCAtMjQpIC0gTWF0aC5wb3coMiwgLTc3KSA6IDApXG4gIHZhciBpID0gaXNMRSA/IDAgOiAobkJ5dGVzIC0gMSlcbiAgdmFyIGQgPSBpc0xFID8gMSA6IC0xXG4gIHZhciBzID0gdmFsdWUgPCAwIHx8ICh2YWx1ZSA9PT0gMCAmJiAxIC8gdmFsdWUgPCAwKSA/IDEgOiAwXG5cbiAgdmFsdWUgPSBNYXRoLmFicyh2YWx1ZSlcblxuICBpZiAoaXNOYU4odmFsdWUpIHx8IHZhbHVlID09PSBJbmZpbml0eSkge1xuICAgIG0gPSBpc05hTih2YWx1ZSkgPyAxIDogMFxuICAgIGUgPSBlTWF4XG4gIH0gZWxzZSB7XG4gICAgZSA9IE1hdGguZmxvb3IoTWF0aC5sb2codmFsdWUpIC8gTWF0aC5MTjIpXG4gICAgaWYgKHZhbHVlICogKGMgPSBNYXRoLnBvdygyLCAtZSkpIDwgMSkge1xuICAgICAgZS0tXG4gICAgICBjICo9IDJcbiAgICB9XG4gICAgaWYgKGUgKyBlQmlhcyA+PSAxKSB7XG4gICAgICB2YWx1ZSArPSBydCAvIGNcbiAgICB9IGVsc2Uge1xuICAgICAgdmFsdWUgKz0gcnQgKiBNYXRoLnBvdygyLCAxIC0gZUJpYXMpXG4gICAgfVxuICAgIGlmICh2YWx1ZSAqIGMgPj0gMikge1xuICAgICAgZSsrXG4gICAgICBjIC89IDJcbiAgICB9XG5cbiAgICBpZiAoZSArIGVCaWFzID49IGVNYXgpIHtcbiAgICAgIG0gPSAwXG4gICAgICBlID0gZU1heFxuICAgIH0gZWxzZSBpZiAoZSArIGVCaWFzID49IDEpIHtcbiAgICAgIG0gPSAodmFsdWUgKiBjIC0gMSkgKiBNYXRoLnBvdygyLCBtTGVuKVxuICAgICAgZSA9IGUgKyBlQmlhc1xuICAgIH0gZWxzZSB7XG4gICAgICBtID0gdmFsdWUgKiBNYXRoLnBvdygyLCBlQmlhcyAtIDEpICogTWF0aC5wb3coMiwgbUxlbilcbiAgICAgIGUgPSAwXG4gICAgfVxuICB9XG5cbiAgZm9yICg7IG1MZW4gPj0gODsgYnVmZmVyW29mZnNldCArIGldID0gbSAmIDB4ZmYsIGkgKz0gZCwgbSAvPSAyNTYsIG1MZW4gLT0gOCkge31cblxuICBlID0gKGUgPDwgbUxlbikgfCBtXG4gIGVMZW4gKz0gbUxlblxuICBmb3IgKDsgZUxlbiA+IDA7IGJ1ZmZlcltvZmZzZXQgKyBpXSA9IGUgJiAweGZmLCBpICs9IGQsIGUgLz0gMjU2LCBlTGVuIC09IDgpIHt9XG5cbiAgYnVmZmVyW29mZnNldCArIGkgLSBkXSB8PSBzICogMTI4XG59XG4iLCJ2YXIgdG9TdHJpbmcgPSB7fS50b1N0cmluZztcblxubW9kdWxlLmV4cG9ydHMgPSBBcnJheS5pc0FycmF5IHx8IGZ1bmN0aW9uIChhcnIpIHtcbiAgcmV0dXJuIHRvU3RyaW5nLmNhbGwoYXJyKSA9PSAnW29iamVjdCBBcnJheV0nO1xufTtcbiJdfQ==
