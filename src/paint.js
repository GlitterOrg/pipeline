goog.provide('paint');

goog.require('canvas');


// Set onBackground for custom paint on the background!
Object.defineProperty(Element.prototype, 'onBackground', {
  get: /** @this {!Element} */ function() { return this._onBackground; },
  set: /** @this {!Element} */ function(fn) {
    // Begin watching this element.
    // NOTE: will not unwatch.
    paint.els_.push(this);
/*
    if (!paint.hasRaf_) {
      paint.hasRaf_ = !!goog.global.requestAnimationFrame(paint.onRaf_);
    }
*/
    this._onBackground = fn;
  }
});


/** Invalidate the paint on this element. */
Element.prototype.invalidate = function() {
  this._dirty = true;
};


/** @private {!Array<!Element>} List of elements which have custom paint. */
paint.els_ = [];


/**
 * On each RAF enqueue a microtask at the end of processing, this will ensure
 * that there is no FOUC between a user interaction and a custom paint.
 *
 * I.e.
 *  1. User-code.
 *  2. Microtasks.
 *  3. Custom paint code.
 *
 * @private
 */
paint.onRaf_ = function() {
  paint.enqueueMicroTask_(paint.microTask_);
  //goog.global.requestAnimationFrame(paint.onRaf_);
};


/** @private {boolean} If we've registered a paint RAF callback. */
paint.hasRaf_ = false;


/**
 * Enqueues a microtask.
 * NOTE: I think this works. Maybe it doesn't. Who knows.
 * @param {function()} task
 * @private
 */
paint.enqueueMicroTask_ = function(task) {
  var p = new Promise(function(resolve) { resolve(undefined); });
  p.then(task);
};

/**
 * Checks elements which have had a custom paint callback registered, and paints
 * them if required.
 *
 * This microtask will run at least twice, checking if any changes has been made
 * in other microtasks.
 *
 * @private
 */
paint.microTask_ = function() {
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
      el._needsPaint = true;
      el._width = width;
      el._height = height;
    }

    // Check if Element was manually invalidated.
    if (el._dirty) {
      dirty = true;
      el._needsPaint = true;
      el._dirty = false;
    }
  }

  if (dirty) {
    // We need to paint, however there may be other microtasks enqueued which
    // could affect painting. We really need to be the last microtask to be run,
    // but we'll just enqueue ourselves again.
    paint.enqueueMicroTask_(paint.microTask_);
    paint.globalDirty_ = true;
  } else if (paint.globalDirty_) {
    paint.globalDirty_ = false;

    // Paint the elements!
    for (var i = 0; i < paint.els_.length; i++) {i
      paint._paint(els_[i]);
    }
  }
};

var uid = 0;

paint._paint = function(el) {
  // Skip if nothing has changed.
  if (!(el._needsPaint || el._dirty)) return;

  el._width = el.clientWidth;
  el._height = el.clientHeight;
  

  if (!el._paintName)
    el._paintName = 'a' + (uid++);
 
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
