goog.provide('cssom');

goog.require('goog.asserts');


/**
 *
 * @param {string} str The raw CSS string.
 * @return {!cssom.CSSStyleSheet} The parsed stylesheet.
 */
cssom.parse = function(str) {
  var raw = parseAStylesheet(str);
  return cssom.CSSStyleSheet.parse_(raw);
};


/** Represents a CSS style sheet. */
cssom.CSSStyleSheet = goog.defineClass(Object, {
  /** @constructor */
  constructor: function() {
    /** @const @type {!Array.<!cssom.CSSRule>} */
    this.cssRules = [];
  },

  statics: {
    /**
     * Parse a stylesheet.
     * @param {!Object} raw
     * @return {!cssom.CSSStyleSheet}
     * @private
     */
    parse_: function(raw) {
      goog.asserts.assert('STYLESHEET' == raw['type']);
      var stylesheet = new cssom.CSSStyleSheet();

      // Parse all rules in the stylesheet.
      var arr = goog.asserts.assertArray(raw['value']);
      for (var i = 0; i < arr.length; i++) {
        if (arr[i]['type'] == 'QUALIFIED-RULE') {
          stylesheet.cssRules.push(cssom.CSSStyleRule.parse_(arr[i]));
        }

        // TODO parse other types of rules.
      }

      return stylesheet;
    }
  }
});


/**
 * Represents an abstract, base CSS style rule. Each distinct CSS style rule
 * type is represented by a distinct interface that inherits from this
 * interface.
 */
cssom.CSSRule = goog.defineClass(Object, {
  /**
   * @param {number} type
   * @constructor
   */
  constructor: function(type) {
    /** @param {number} */
    this.type = type;

    // TODO cssText, parentRule, parentStyleSheet.
  },

  statics: {
    STYLE_RULE: 1,
    CHARSET_RULE: 2,
    IMPORT_RULE: 3,
    MEDIA_RULE: 4,
    FONT_FACE_RULE: 5,
    PAGE_RULE: 6,
    MARGIN_RULE: 9,
    NAMESPACE_RULE: 10
  }
});


/** Represents a style rule. */
cssom.CSSStyleRule = goog.defineClass(cssom.CSSRule, {
  /**
   * @param {string} selectorTokens
   * @consturctor
   */
  constructor: function(selectorTokens) {
    cssom.CSSStyleRule.base(this, 'constructor', cssom.CSSRule.STYLE_RULE);

    /** @type {string} */
    this.selectorText = cssom.collapseTokens(selectorTokens);

    /** @type {!Array} */
    this.selectorTokens = selectorTokens;

    /** @type {!cssom.CSSStyleDeclaration} */
    this.style = new cssom.CSSStyleDeclaration();

    /** @type {!Object.<!Object>} */
    this.styleToken = {};
  },

  statics: {
    parse_: function(raw) {
      goog.asserts.assert('QUALIFIED-RULE' == raw['type']);

      var rule = new cssom.CSSStyleRule(raw['prelude']);
      var block = raw['value'];
      goog.asserts.assert('BLOCK' == block['type']);
      var arr = goog.asserts.assertArray(block['value']).slice();
      var check = cssom.createFoo_(arr);

      while (arr.length) {

        check(cssom.TOKENS.WHITESPACE);
        var property = goog.asserts.assertObject(check(cssom.TOKENS.IDENT));
        var propertyName = cssom.propertyToCamel(property['value']);

        check(cssom.TOKENS.WHITESPACE);
        goog.asserts.assertObject(check(cssom.TOKENS.COLON));
        check(cssom.TOKENS.WHITESPACE);

        var ident = check(cssom.TOKENS.IDENT);
        var func = check(cssom.TOKENS.FUNCTION);
        var dimen = check(cssom.TOKENS.DIMENSION);
        var hash = check(cssom.TOKENS.HASH);
        var propertyToken =
            goog.asserts.assertObject(ident || func || dimen || hash);

        var propertyValue;
        if (ident) {
          propertyValue = ident['value'];
        } else if (func) {
          propertyValue = cssom.collapseTokens([func]);
        } else if (dimen) {
          propertyValue = cssom.collapseTokens([dimen]);
        } else if (hash) {
          propertyValue = cssom.collapseTokens([hash]);
        }
        goog.asserts.assert(propertyValue);

        check(cssom.TOKENS.WHITESPACE);

        // Consume !important if there.
        var important = false;
        if (check(cssom.TOKENS.DELIM, '!')) {
          check(cssom.TOKENS.WHITESPACE);
          goog.asserts.assert(check(cssom.TOKENS.IDENT, 'important'));
          check(cssom.TOKENS.WHITESPACE);
          important = true;
        }

        //goog.asserts.assertObject(check(cssom.TOKENS.SEMI_COLON));
        check(cssom.TOKENS.SEMI_COLON);
        check(cssom.TOKENS.WHITESPACE);

        rule.style.setProperty(
            propertyName, propertyValue, important ? 'important' : undefined);

        rule.styleToken[propertyName] = propertyToken;
      }

      return rule;
    }
  }
});


cssom.createFoo_ = function(tokens) {
  return function(type, value) {
    var tok = tokens[0];
    return tok && (tok['tokenType'] || tok['type']) == type &&
        (!value || tok['value'] == value) ? tokens.shift() : null;
  };
};



// CSSStyleDeclaration needs to do funky things.
/** @constructor */
cssom.Unsealable_ = function() {};
goog.tagUnsealableClass(cssom.Unsealable_);



/**
 * The CSSStyleDeclaration interface represents a CSS declaration block,
 * including its underlying state, where this underlying state depends upon
 * the source of the CSSStyleDeclaration instance.
 *
 * TODO: make this play nice with setting things directly on the object etc via
 * a Proxy... when they don't suck.
 *
 * @constructor
 */
cssom.CSSStyleDeclaration = goog.defineClass(cssom.Unsealable_, {
  constructor: function() {
    /** @private {!Object.<string>} */
    this.priority_ = {};

    /** @private {!Array.<string>} */
    this.keys_ = [];
  },

  /**
   * Gets the property value.
   * @param {string} property
   * @return {string}
   */
  getPropertyValue: function(property) {
    return this[property];
  },

  /**
   * Gets the property priority.
   * @param {string} property
   * @return {string}
   */
  getPropertyPriority: function(property) {
    return this.priority_[property] || '';
  },

  /**
   * Sets a property value (and optionally priority).
   * @param {string} property
   * @param {string} value
   * @param {string=} opt_priority
   */
  setProperty: function(property, value, opt_priority) {
    this.keys_.push(property);

    this[property] = value || '';

    if (goog.isDef(opt_priority)) {
      this.priority_[property] = opt_priority || '';
    }
  },

  /**
   * Sets a property priority.
   * @param {string} property
   * @param {string} priority
   */
  setPropertyPriority: function(property, priority) {
    this.priority_[property] = priority || '';
  },

  /**
   * Removes a property.
   * @param {string} property
   */
  removeProperty: function(property) {
    delete this[property];
    delete this.priority_[property];
  },

  /** @return {!Array.<string>} */
  keys: function() {
    return this.keys_;
  }
});


/**
 * Collapses a list of CSS tokens.
 * @param {!Array.<!Object<string>>} prelude
 * @return {string} The collapses CSSRule selector.
 */
cssom.collapseTokens = function(prelude) {
  var parts = [];

  for (var i = 0; i < prelude.length; i++) {
    var token = goog.asserts.assertObject(prelude[i]);
    var type = token['tokenType'] || token['name']; // TODO
    var value = token['value'];

    switch (type) {
      case cssom.TOKENS.DELIM:
      case cssom.TOKENS.IDENT:
        parts.push(value);
        break;

      case cssom.TOKENS.HASH:
        parts.push('#' + value);
        break;

      case cssom.TOKENS.WHITESPACE:
        parts.push(' ');
        break;

      case cssom.TOKENS.DIMENSION:
        parts.push(token['repr'] + token['unit']);
        break;

      case cssom.TOKENS.PERCENTAGE:
        parts.push(token['repr'] + '%');
        break;

      default:
        // Most values are just encoded in their type/name.
        parts.push(type);

        // Functions need surrounding parens added.
        var isFunction = token['type'] == 'FUNCTION';

        if (isFunction) {
          parts.push('(');
        }

        // Check if we need to recurse into the value.
        if (goog.isArray(value)) {
          parts.push(cssom.collapseTokens(value));
        }

        if (isFunction) {
          parts.push(')');
        }

        // Need to add end of attribute selector.
        if (type == cssom.TOKENS.START_ATTR) {
          parts.push(']');
        }
        break;
    }
  }

  // Join and do a quick & dirty trim.
  return parts.join('').replace(/\s+$/, '').replace(/$\s+/, '');
};


/**
 * Converts a TODO
 * @param {string} str
 * @return {string}
 */
cssom.propertyToCamel = function(str) {
  var ret = String(str);

  // Strip leading '-' if any.
  if (ret[0] == '-') ret = ret.substring(1);

  // Convert to camel.
  return ret.replace(/\-([a-z])/g, function(_, match) {
    return match.toUpperCase();
  });
};


/** @enum {string} */
cssom.TOKENS = {
  COLON: ':',
  SEMI_COLON: ';',
  START_ATTR: '[',
  DELIM: 'DELIM',
  IDENT: 'IDENT',
  NOT: 'not',
  MATCHES: 'matches',
  HASH: 'HASH',
  FUNCTION: 'FUNCTION',
  DIMENSION: 'DIMENSION',
  PERCENTAGE: 'PERCENTAGE',
  WHITESPACE: 'WHITESPACE'
};
