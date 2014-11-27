goog.provide('paint');

goog.require('canvas');


goog.scope(function() {
var invalidate = function() { return window['pipeline']['invalidate']; };
var InvalidationLevel = function() { return window['pipeline']['InvalidationLevel']; };

// Set onBackground for custom paint on the background!
Object.defineProperty(Element.prototype, 'onBackground', {
  get: /** @this {!Element} */ function() { return this._onBackground; },
  set: /** @this {!Element} */ function(fn) {
    // Begin watching this element.
    // NOTE: will not unwatch.
    paint.els_.push(this);
    this.style.element = this;
    this._onBackground = fn;
    this._painted = true;
  }
});


/** @private {!Array<!Element>} List of elements which have custom paint. */
paint.els_ = [];


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


/** @private {number} Unique (incrementing) ID for canvas naming. */
paint.canvasUID_ = 0;


/**
 * Paint the provided element.
 * @param {!Element} el
 */
paint.paint = function(el) {
  if (!el._painted)
    return;
  el._width = el.clientWidth;
  el._height = el.clientHeight;

  if (!el._paintName)
    el._paintName = 'a' + (paint.canvasUID_++);

  // Clear the background by asking for a 0x0 context.
  el.style.backgroundImage = '-webkit-canvas(' + el._paintName + ')';
  document.getCSSCanvasContext('2d', el._paintName, 0, 0);

  // Get the actual context.
  var ctx = document.getCSSCanvasContext(
      '2d', el._paintName, el._width, el._height);

  // Create write-only context if needed.
  if (!el._ctx) el._ctx = new canvas.RenderingContext();

  // Record custom paint commands.
  el._ctx.setWritable(true);
  el._ctx.setDimensions(el._width, el._height);
  el._onBackground.call(null, el._ctx);
  el._ctx.setWritable(false);

  // Write to actual canvas.
  el._ctx.write(ctx);
};
});
