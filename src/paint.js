goog.provide('paint');

goog.require('canvas');


goog.scope(function() {
var invalidate = function() {
  return window['pipeline']['invalidate'];
};
var InvalidationLevel = function() {
  return window['pipeline']['InvalidationLevel'];
};
var upgradeToGlitter = function() {
  return window['pipeline']['upgradeToGlitter'];
};


/**
 * @typedef {{
 *   top: number,
 *   bottom: number,
 *   left: number,
 *   right: number
 * }}
 */
paint.Rect_;


/** @private {number} Unique (incrementing) ID for canvas naming. */
paint.canvasUID_ = 0;


/** @private {number} Unique (incrementing) ID for svg naming. */
paint.svgUID_ = 0;


// Set onBackground for custom paint of the background.
Object.defineProperty(Element.prototype, 'onBackground', {
  get: /** @this {!Element} */ function() { return this._onBackground; },
  set: /** @this {!Element} */ function(fn) {
    // Begin watching this element.
    // NOTE: will not unwatch.
    this._onBackground = fn;
    paint.setupElement_(this);
    invalidate()(this, InvalidationLevel().PAINT_INVALID);
  }
});


// Set onContent for custom paint of the content.
Object.defineProperty(Element.prototype, 'onContent', {
  get: /** @this {!Element} */ function() { return this._onContent; },
  set: /** @this {!Element} */ function(fn) {
    this._onContent = fn;
    paint.setupElement_(this);
    invalidate()(this, InvalidationLevel().PAINT_INVALID);
  }
});


Object.defineProperty(Element.prototype, 'additionalBackground', {
  get:
      /** @this {!Element} */ function() { return this._additionalBackground; },
  set: /** @this {!Element} */ function(additionalBackground) {
    this._additionalBackground = additionalBackground;
    invalidate()(this, InvalidationLevel().PAINT_INVALID);
  }
});


Object.defineProperty(Element.prototype, 'additionalContent', {
  get: /** @this {!Element} */ function() { return this._additionalContent; },
  set: /** @this {!Element} */ function(additionalContent) {
    this._additionalContent = additionalContent;
    invalidate()(this, InvalidationLevel().PAINT_INVALID);
  }
});


/** @private {!Array<!Element>} List of elements which have custom paint. */
paint.els_ = [];


/**
 * Sets up an element for custom paint.
 * @param {!Element} el
 * @private
 */
paint.setupElement_ = function(el) {
  // Element may already have another layer being custom painted.
  if (el._painted) return;
  el._painted = true;
  upgradeToGlitter()(el);

  // Add to list of elements to watch. NOTE will not unwatch.
  if (paint.els_.indexOf(el) < 0) {
    paint.els_.push(el);
  }

  el._svgId = 'svg_' + paint.svgUID_++;
  el._backgroundLowerName = 'a' + paint.canvasUID_++;
  el._backgroundUpperName = 'a' + paint.canvasUID_++;
  el._contentLowerName = 'a' + paint.canvasUID_++;
  el._contentUpperName = 'a' + paint.canvasUID_++;
  el._backgroundCtx = new canvas.RenderingContext();
  el._contentCtx = new canvas.RenderingContext();
};


/**
 * Collects paint elements that are invalid but have not been marked so.
 * These are elements that have changed size since last paint.
 *
 * @return {boolean} there were elements marked as invalid.
 */
paint.collectInvalidPaintElements = function() {
  var dirty = false;

  // Measure all elements which we are watching to see if they need painting.
  for (var i = 0; i < paint.els_.length; i++) {
    var el = paint.els_[i];

    // Measure client width/height as we don't care about the margin etc.
    // NOTE: this may need to change for painting borders.
    var width = el.clientWidth;
    var height = el.clientHeight;

    // Check if Element has changed size, needs painting.
    if (width != el._width || height != el._height) {
      dirty = true;
      invalidate()(el, InvalidationLevel().PAINT_INVALID);
      el._width = width;
      el._height = height;
    }
  }
  return dirty;
};


/**
 * Paint the provided element.
 * @param {!Element} el
 */
paint.paint = function(el) {
  if (!el._painted) return;

  el._width = el.clientWidth;
  el._height = el.clientHeight;

  paint.buildDom_(el);

  if (el._onBackground) {
    paint.paintLayer_(null, el._onBackground, el._backgroundCtx,
                      el._backgroundLowerName, el._backgroundUpperName,
                      el._width, el._height, el._additionalBackground);
  }

  if (el._onContent) {
    paint.paintLayer_(el, el._onContent, el._contentCtx, el._contentLowerName,
                      el._contentUpperName, el._width, el._height,
                      el._additionalContent);
  }
};


/**
 * Paints a layer.
 * @param {Element} el The element.
 * @param {function(!canvas.RenderingContext)} func The paint funciton.
 * @param {!canvas.RenderingContext} ctx The write only rendering context.
 * @param {string} lowerName The CSS reference for the lower canvas.
 * @param {string} upperName The CSS reference for the upper canvas.
 * @param {number} width The width of the element.
 * @param {number} height The height of the element.
 * @param {paint.Rect_|undefined} additionalRect The additional size of the
 *     canvas required.
 * @private
 */
paint.paintLayer_ = function(el, func, ctx, lowerName, upperName, width, height,
                             additionalRect) {
  if (additionalRect) {
    width += additionalRect.left + additionalRect.right;
    height += additionalRect.top + additionalRect.bottom;
  }

  // Clear canvases.
  document.getCSSCanvasContext('2d', lowerName, 0, 0);
  document.getCSSCanvasContext('2d', upperName, 0, 0);

  // Record commands.
  ctx.setWritable(true);
  ctx.setDimensions(width, height);
  func.call(null, ctx);
  ctx.setWritable(false);

  // Write commands to backgrounds.
  ctx.write(el, document.getCSSCanvasContext('2d', lowerName, width, height),
            document.getCSSCanvasContext('2d', upperName, width, height));
};


/**
 * Builds the DOM required for the painting canvases.
 * @param {!Element} el
 * @private
 */
paint.buildDom_ = function(el) {
  // Build up DOMs.
  paint.buildParentShadowDom_(el);
  paint.buildShadowDom_(el);

  // TODO: switch back to window.getComputedStyle, override version not working.
  var cStyle = /** @type {!CSSStyleDeclaration} */ (
      Window.prototype.getComputedStyle.call(window, el));

  // Style DOMs.
  paint.styleHighElement_(el._backgroundLower, el._backgroundLowerName, cStyle);
  paint.styleLowElement_(el._backgroundUpper, el._backgroundUpperName);
  paint.styleLowElement_(el._contentLower, el._contentLowerName);
  paint.styleHighElement_(el._contentUpper, el._contentUpperName, cStyle);

  // TODO: switch back to window.getComputedStyle, override version not working.
  cStyle = Window.prototype.getComputedStyle.call(window, el);

  var rect = el.getBoundingClientRect();
  var defaultAdditional = {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0
  };
  var additionalBack = el._additionalBackground || defaultAdditional;
  var additionalContent = el._additionalContent || defaultAdditional;
  var borderRect = {
    top: parseInt(cStyle.borderTopWidth, 10),
    left: parseInt(cStyle.borderLeftWidth, 10),
    right: parseInt(cStyle.borderRightWidth, 10),
    bottom: parseInt(cStyle.borderTopWidth, 10)
  };

  // Position DOMs.
  paint.positionElement_(el._backgroundLower, rect, additionalBack, borderRect);
  paint.positionElement_(el._backgroundUpper, rect, additionalBack, borderRect);
  paint.positionElement_(el._contentLower, rect, additionalContent, borderRect);
  paint.positionElement_(el._contentUpper, rect, additionalContent, borderRect);
};


/** @private {number} Unique (incrementing) ID for shadow dom classNames. */
paint.shadowClassNameID_ = 0;


/**
 * Builds the shadow dom required for the "high" elements:
 * (An element which is adjacent to the element with custom paint).
 *
 *  - background lower canvas
 *  - content upper canvas
 *
 *  This shadow dom gets inserted into the parent element for appropriate
 *  painting level in the stacking context.
 *
 *  @param {!Element} el The element.
 *  @private
 */
paint.buildParentShadowDom_ = function(el) {
  // NOTE: This code doesn't work with existing shadow roots which do things.
  var parent = goog.asserts.assert(el.parentElement);
  var shadow = parent.shadowRoot;
  if (!shadow) shadow = parent.createShadowRoot();

  // Get the content element which corresponds to our element.
  var content =
      el._className ?
          shadow.querySelector('content[select=".' + el._className + '"]') :
          null;

  // Need to build up shadow root DOM.
  if (!content) {
    var tmpl = [];
    for (var i = 0; i < parent.children.length; i++) {
      var child = parent.children[i];

      // Create a unique className for selecting the individual element.
      var className =
          child._className || 'glitter-' + paint.shadowClassNameID_++;
      child.classList.add(className);
      child._className = className;

      tmpl.push('<content select=".' + className + '"></content>');
    }
    shadow.innerHTML = tmpl.join('');

    content = goog.asserts.assert(
        shadow.querySelector('content[select=".' + el._className + '"]'));
  }

  // Insert "high" elements if required.
  if (el._backgroundLower && el._backgroundLower == content.previousSibling &&
      el._contentUpper && el._contentUpper == content.nextSibling)
    return;

  el._backgroundLower = document.createElement('div');
  el._backgroundLower.innerHTML = '<div></div>';
  shadow.insertBefore(el._backgroundLower, content);

  el._contentUpper = document.createElement('div');
  el._contentUpper.innerHTML = '<div></div>';
  shadow.insertBefore(el._contentUpper, content.nextSibling);
};


/**
 * Builds the shadow dom required for the "low" elements:
 * (An element which is underneath the element with custom paint).
 *
 *  - background upper canvas
 *  - content lower canvas
 *
 *  This shadow dom gets inserted into the current element for appropriate
 *  painting level in the stacking context.
 *
 *  @param {!Element} el The element.
 *  @private
 */
paint.buildShadowDom_ = function(el) {
  var shadow = el.shadowRoot;
  if (!shadow) shadow = el.createShadowRoot();

  // Check if the elements are already correct.
  if (el._backgroundUpper && el._backgroundUpper == shadow.children[0] &&
      el._contentLower && el._contentLower == shadow.children[1])
    return;

  // TODO: load a HTML template async with DOM for this.
  shadow.innerHTML = '<div><div></div></div>' +
                     '<div><div></div></div>' +
                     '<content></content>';

  el._backgroundUpper = shadow.children[0];
  el._contentLower = shadow.children[1];
};


/**
 * Positions an element.
 * @param {!Element} el The element to position.
 * @param {!ClientRect} rect The rect for the size of the element which has the
 *     custom paint.
 * @param {!paint.Rect_} additionalRect The rect for the additional size
 *     required for the canvas.
 * @param {!paint.Rect_} borderRect The border rect of the element which has the
 *     custom paint.
 * @private
 */
paint.positionElement_ = function(el, rect, additionalRect, borderRect) {
  var child = goog.asserts.assert(el.children[0]);

  // Clear all set styles for measure.
  child.style.paddingRight = '1px';
  child.style.paddingBottom = '1px';
  child.style.marginTop = '';
  child.style.marginLeft = '';

  // Perform measure of element.
  var elRect = child.getBoundingClientRect();

  var width = rect.width - borderRect.left - borderRect.right +
              additionalRect.left + additionalRect.right;
  var height = rect.height - borderRect.top - borderRect.bottom +
               additionalRect.top + additionalRect.bottom;

  var posLeft =
      (rect.left - elRect.left) - additionalRect.left + borderRect.left;
  var posTop = (rect.top - elRect.top) - additionalRect.top + borderRect.top;

  child.style.paddingRight = width + 'px';
  child.style.paddingBottom = height + 'px';
  child.style.marginTop = posTop + 'px';
  child.style.marginLeft = posLeft + 'px';
};


/** @private {!Array<string>} */
paint.CSS_PROPS_TO_COPY_ = ['zIndex', 'position', 'top', 'left', 'display'];


/**
 * Styles a "high" element. Copies across CSS properties to be positioned in the
 * correct place within the stacking context.
 * @param {!Element} el The "high" element to style.
 * @param {string} canvasName The name of the background canvas for drawing.
 * @param {!CSSStyleDeclaration} computedStyle The computed style of the
 *     element with custom paint.
 * @private
 */
paint.styleHighElement_ = function(el, canvasName, computedStyle) {
  var child = goog.asserts.assert(el.children[0]);

  // Copy across CSS properties to appear in the correct place in the stacking
  // context.
  for (var i = 0; i < paint.CSS_PROPS_TO_COPY_.length; i++) {
    var prop = paint.CSS_PROPS_TO_COPY_[i];
    el.style[prop] = computedStyle[prop];
  }

  // TODO: load a HTML template async with style for this.
  el.style.width = '0';
  el.style.height = '0';
  el.style.pointerEvents = 'none';

  child.style.webkitUserSelect = 'none';
  child.style.display =
      computedStyle.display.indexOf('inline') == 0 ? 'block' : 'inline-block';
  child.style.lineHeight = '0';
  child.style.width = '0';
  child.style.height = '0';
  child.style.backgroundImage = '-webkit-canvas(' + canvasName + ')';
  child.style.backgroundRepeat = 'no-repeat';
  child.style.pointerEvents = 'none';
};


/**
 * Styles a "low" element.
 * @param {!Element} el The "low" element to style.
 * @param {string} canvasName The name of the background canvas for drawing.
 * @private
 */
paint.styleLowElement_ = function(el, canvasName) {
  var child = goog.asserts.assert(el.children[0]);

  // TODO: load a HTML template async with style for this.
  el.style.width = '0';
  el.style.height = '0';
  el.style.pointerEvents = 'none';

  child.style.display = 'block';
  child.style.fontSize = '0';
  child.style.backgroundImage = '-webkit-canvas(' + canvasName + ')';
  child.style.backgroundRepeat = 'no-repeat';
  child.style.pointerEvents = 'none';
};

});  // goog.scope
