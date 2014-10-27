goog.provide('css');

goog.require('cssom');


/**
 * Apply a raw CSS string to the DOM.
 * TODO setup mutation observers.
 * @param {string} str The raw CSS string.
 */
css.exec = function(str) {
  var stylesheet = cssom.parse(str);
  css.exec_(stylesheet);
};


/**
 * Apply a CSSStyleSheet to the DOM.
 * @param {!cssom.CSSStyleSheet} stylesheet
 * @private
 */
css.exec_ = function(stylesheet) {
  var els = document.querySelectorAll('*');
  for (var i = 0; i < els.length; i++) {
    css.applyRules_(stylesheet, els[i]);
  }
}


/**
 * Applies TODO
 * @param {!cssom.CSSStyleSheet} stylesheet
 * @param {!Element} el
 */
css.applyRules_ = function(stylesheet, el) {
  var rules = css.findRules_(stylesheet, el);
  var style = {};
  var importantStyle = {};

  for (var i = 0; i < rules.length; i++) {
    var styleObj = rules
    var rule = rules[i].style.keys_;
    for (var j = 0; j < rule.length; j++) {
      var key = rule[j];
      if (rules[i].style.getPropertyPriority(key) == 'important') {
        importantStyle[key] = rules[i].style[key];
      } else {
        style[key] = rules[i].style[key];
      }
    }
  }

  function apply(el, key, value) {
    el.style[key] = value;
  }

  for (var key in style) {
    apply(el, key, style[key]);
  }

  for (var key in importantStyle) {
    apply(el, key, importantStyle[key]);
  }

  // TODO handle inline style.
  // TODO perform inheritance.
};


/**
 * Finds a list of rules to be applied (in sorted order).
 * @param {!cssom.CSSStyleSheet} stylesheet
 * @param {!Element} el
 * @return {!Array.<!cssom.CSSRules}
 * @private
 */
css.findRules_ = function(stylesheet, el) {
  var rules = stylesheet.cssRules;

  // Find matching rules.
  var matching = rules.filter(function(rule) {
    return el.matches(rule.selectorText);
  });

  // Sort rules in order.
  return matching.sort(function(a, b) {
    return css.calcSpecificity_(a.selectorTokens, el) -
      css.calcSpecificity_(b.selectorTokens, el);
  });
};


/**
 * Calculates the specificity of a CSSRule.
 *
 * NOTE(ikilpatrick): this is probably wrong. It was written while I was bored
 * in a CSSWG meeting.
 *
 * NOTE(ikilpatrick): :not() may be wrong, re-read rules.
 *
 * http://www.w3.org/TR/css3-selectors/#specificity
 * http://dev.w3.org/csswg/selectors4/#specificity
 *
 * @param {!Array.<!Object.<string>>} prelude The selector for the CSSRule.
 * @param {!Element} el The element this rule is applying to.
 * @return {number} The specificity.
 * @private
 */
css.calcSpecificity_ = function(prelude, el) {
  var result = css.calcSpecificityInternal_(prelude, el);
  return css.transformSpecificity_(result);
};


/**
 * @param {!Array.<!Object.<string>>} prelude
 * @param {!Element=} opt_el
 * @return {number}
 * @private
 */
css.calcSpecificityInternal_ = function(prelude, opt_el) {
  var a = 0; // ID selectors.
  var b = 0; // Class selectors, attributes selectors, and pseudo-classes.
  var c = 0; // Type selectors and pseudo-elements.

  var state = css.STATES_.NONE;

  for (var i = 0; i < prelude.length; i++) {
    var token = prelude[i];
    var type = token['tokenType'] || token['name'];
    var value = token['value'];

    switch (type) {
      case css.TOKENS.DELIM:
        state = value == '.' ? css.STATES_.CLASS : css.STATES_.NONE;
        break;

      case css.TOKENS.COLON:
        // Explicity check if we have a double colon as pseudo element.
        state = state == css.STATES_.PSEUDO ?
          css.STATES_.PSEUDO_ELEMENT : css.STATES_.PSEUDO;
        break;

      case css.TOKENS.HASH:
        state = css.STATES_.NONE;
        a++;
        break;

      case css.TOKENS.NOT:
        // Recurse into not clause.
        var result = css.calcSpecificityInternal_(value);
        a += result[0];
        b += result[1];
        c += result[2];
        state = css.STATES_.NONE;
        break;

      case css.TOKENS.MATCHES:
        // Check which matching clause has the highest specificity.
        var selectors = [];
        var previous = 0;

        // First split out the selectors.
        for (var i = 0; i < value.length; i++) {
          if (value[i]['tokenType'] == ',') {
            selectors.push(value.slice(previous, i));
            previous = i+1;
          }
        }

        // Grab last selector.
        selectors.push(value.slice(previous));

        // Filter by selectors that match.
        var matchingSelectors = selectors.filter(function(selector) {
          return opt_el.matches(cssom.collapseTokens(selector));
        });

        // Transform to list of specificities.
        var specificities = matchingSelectors.map(css.calcSpecificityInternal_);

        // Find greatest specificity.
        var tmp;
        var result = specificities.reduce(function(prev, curr) {
          var transformed = css.transformSpecificity_(curr);

          if (!prev || tmp < transformed) {
            // curr specificity is greater.
            tmp = transformed;
            return curr;
          }

          return prev;
        }, null);

        // Add to result so far.  
        a += result[0];
        b += result[1];
        c += result[2];
        state = css.STATES_.NONE;
        break;

      case css.TOKENS.START_ATTR:
        b++;
        state = css.STATES_.NONE;
        break;

      case css.TOKENS.IDENT:
        // Come accross IDENT, depends on which state we are in.
        switch (state) {
          case css.STATES_.CLASS:
            b++;
            break;

          case css.STATES_.PSEUDO_ELEMENT:
          case css.STATES_.NONE:
            c++;
            break;

          case css.STATES_.PSEUDO:
            // Need to explicity check for pseudo-elements.
            if (css.PSEUDO_ELEMENTS_.indexOf(value) != -1) {
              c++; // Pseudo-element.
            } else {
              b++; // Pseudo-class.
            }
            break;
        }

        // Reset the state.
        state = css.STATES_.NONE;
        break;

      default:
        // Reset the state.
        state = css.STATES_.NONE;
        break;
    }
  }

  return [a, b, c];
};


/**
 * Turns a specificity array into a number which can be compared.
 * @param {!Array.<number>} specificity
 * @return {number}
 * @private
 */
css.transformSpecificity_ = function(specificity) {
  return (specificity[0] << 16) | (specificity[1] << 8) | specificity[2];
};


/** @private @enum {number} */
css.STATES_ = {
  NONE: 0,
  CLASS: 1,
  PSEUDO: 2,
  PSEUDO_ELEMENT: 3
};


/** @private {!Array.<string>} */
css.PSEUDO_ELEMENTS_ = [
  'after',
  'before',
  'first-letter',
  'first-line',
  'selection'
];


/** @enum {string} */
css.TOKENS = {
  COLON: ':',
  START_ATTR: '[',
  DELIM: 'DELIM',
  IDENT: 'IDENT',
  NOT: 'not',
  MATCHES: 'matches',
  HASH: 'HASH',
  WHITESPACE: 'WHITESPACE'
};
