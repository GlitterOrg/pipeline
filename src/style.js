goog.provide('style');

goog.require('css');

goog.scope(function() {
var invalidate = function() { return window['pipeline']['invalidate']; };
var InvalidationLevel =
    function() { return window['pipeline']['InvalidationLevel']; };


/**
 * @typedef {{
 *   animateAs: (string|undefined),
 *   apply: (function(!Object)|undefined),
 *   initial: (string|undefined)
 * }}
 */
style.CustomPropertyRecord;


/** @private {!Function} */
style.baseExec_ = css.exec;


/** @param {string} str */
window['css']['exec'] = function(str) {
  var els = document.querySelectorAll('*');
  for (var i = 0; i < els.length; i++)
    pipeline.upgradeToGlitter_(els[i]);
  style.baseExec_(str);
  style.handleCustomProperties_();
};


/** @private {!Object<!style.CustomPropertyRecord>} */
style.customProperties_ = {};


/**
 * Register a property handler for the provided name.
 *
 * @param {string} name
 * @param {!style.CustomPropertyRecord} record
 */
var registerPropertyHandler = function(name, record) {
  style.customProperties_[name] = record;
  if (record.animateAs) {
    window['addCustomHandler'](name, record.animateAs);
  }
  Object.defineProperty(CSSStyleDeclaration.prototype, name, {
    get: /** @this {!CSSStyleDeclaration} */ function() {
      return this['_' + name];
    },
    set: /** @this {!CSSStyleDeclaration} */ function(v) {
      invalidate()(
          this.element, InvalidationLevel().STYLE_INVALID);
      this['_' + name] = v;
    }
  });
};
goog.exportSymbol('registerPropertyHandler', registerPropertyHandler);

/**
 * Register a property handler for the provided name.
 *
 * @param {string} name
 * @param {!style.CustomPropertyRecord} record
 */
var registerListPropertyHandler = function(name, record) {
  style.customProperties_[name] = record;
  if (record.animateValueAs) {
    window['addCustomListHandler'](name, record.animateValueAs);
  }
  Object.defineProperty(CSSStyleDeclaration.prototype, name, {
    get: /** @this {!CSSStyleDeclaration} */ function() {
      return this['_' + name];
    },
    set: /** @this {!CSSStyleDeclaration} */ function(v) {
      invalidate()(
          this.element, InvalidationLevel().STYLE_INVALID);
      this['_' + name] = v;
    }
  });
};
goog.exportSymbol('registerListPropertyHandler', registerListPropertyHandler);



/**
 * Iterate through elements and custom properties on each.
 * TODO: This could be a lot more efficient if a map of custom properties to
 * elements were established during processing.
 *
 * @private
 */
style.handleCustomProperties_ = function() {
  var els = document.querySelectorAll('*');
  for (var i = 0; i < els.length; i++) {
    style.handleCustomPropertiesForElement_(els[i]);
  }
};


/**
 * @param {!Element} el
 * @private
 */
style.handleCustomPropertiesForElement_ = function(el) {
  for (var name in style.customProperties_) {
    if (style.customProperties_[name].initial !== undefined)
      if (el.style[name] == undefined) {
        el.style[name] = style.customProperties_[name].initial;
      }
  }
  for (name in style.customProperties_) {
    if (el.style[name] == undefined)
      continue;
    // TODO: Work out how to order these for complex property sets
    if (style.customProperties_[name].apply) {
      var result = style.customProperties_[name].apply({
        value: el.style[name],
        result: el.style,
        computed: window.getComputedStyle(el)
      });
      if (style.customProperties_[name].inherit == true) {
        for (var i = 0; i < el.children.length; i++) {
	  el.children[i].style[name] = el.style[name];
        }
      }
      for (var property in result) {
	if (result[property] !== 'inherit') {
	  el.style[property] = result[property];
	}
      }
    } else if (style.customProperties_[name].inherit == true) {
      for (var i = 0; i < el.children.length; i++) {
	el.children[i].style[name] = el.style[name];
      }
    }
  }
};


/** @private {!Array<!Element>} */
style.scrollers_ = [];


/**
 * Marks an element as a scrollable element.
 * TODO: GET RID OF THIS
 *
 * @param {!Element} element
 */
var isAScroller = function(element) {
  element._deltas = [];
  element._position = 0;
  //element.addEventListener('wheel', function(e) {
  //  element._deltas.push(e.wheelDeltaY);
  //});
  window['PolymerGestures'].addEventListener(element.parentElement, 'track',
      function(e) {
        element._deltas.push(e['ddy']);
        invalidate()(element, InvalidationLevel().STYLE_INVALID);
      });
  style.scrollers_.push(element);
};
goog.exportSymbol('isAScroller', isAScroller);


/**
 * Process custom properties for the provided element.
 * TODO: Rename, reify scroll stuff, make this cleaner, something something
 * internet.
 *
 * @param {!Element} element
 */
style.processScroller = function(element) {
  if (element._deltas) {
    var computedDelta =
        element._deltas.reduce(function(a, b) { return a + b; }, 0);
    var oldOffset = element._position;
    element._position -= computedDelta;
    element._position = Math.min(Math.max(0, element._position), 1600);

    element.style.scrollDeltas = element._deltas;
    element.style.oldScrollOffset = oldOffset;
    element.style.computedScrollDelta = -computedDelta;
    element.style.scrollOffset = element._position;
    element.style.scrollOffset = element._position;
  }
  style.handleCustomPropertiesForElement_(element);
  if (element._deltas) {
    element._position = element.style.scrollOffset;
    element.style.transform = 'translateY(' + (-element._position) + 'px)';
    element._deltas = [];
  }
};

});  // goog.scope
