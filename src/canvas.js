goog.provide('canvas');

goog.require('goog.asserts');

goog.scope(function() {


/**
 * A write only rendering context, records commands to be replayed later.
 * @export
 * */
canvas.RenderingContext = goog.defineClass(null, {
  /** @constructor */
  constructor: function() {
    /** @private {boolean} */
    this.writable_ = false;

    /** @private {!Array.<!canvas.Command_>} */
    this.commands_ = [];

    /** @type {number} */
    this.width = 0;

    /** @type {number} */
    this.height = 0;
  },

  /**
   * Sets the context into a writable state.
   * @param {boolean} writable
   */
  setWritable: function(writable) {
    this.writable_ = writable;
    if (writable) {
      this.commands_ = []; // TODO add assert here.
    }
  },

  /**
   * Sets the current dimensions of the context.
   * @param {number} width
   * @param {number} height
   */
  setDimensions: function(width, height) {
    this.width = width;
    this.height = height;
  },

  /**
   * Writes the command list to a real context, and clears the command buffer.
   * @param {!CanvasRenderingContext2D} ctx
   */
  write: function(ctx) {
    // Check that we aren't writable.
    goog.asserts.assert(!this.writable_);

    for (var i = 0; i < this.commands_.length; i++) {
      var cmd = this.commands_[i];
      if (ContextProperty_[cmd.command]) {
        ctx[cmd.command] = cmd.args[0];
      } else {
        CanvasRenderingContext2D.prototype[cmd.command].apply(ctx, cmd.args);
      }
    }
  },

  /**
   * @param {CommandType_} command
   * @param {...*} var_args
   */
  push_: function(command, var_args) {
    // Check that we are in a writable state.
    goog.asserts.assert(this.writable_);

    // Get & verify arguments.
    var args = Array.prototype.slice.call(arguments, 1);
    var verifyFns = canvas.VerifyMap_[command];
    goog.asserts.assert(args.length == verifyFns.length);
    for (var i = 0; i < args.length; i++) {
      verifyFns[i](args[i]);
    }

    // Push command onto list.
    this.commands_.push({command: command, args: args});
  },

  save: function() {
    this.push_(CommandType_.SAVE);
  },

  restore: function() {
    this.push_(CommandType_.RESTORE);
  },

  /**
   * @param {number} x
   * @param {number} y
   */
  scale: function(x, y) {
    this.push_(CommandType_.SCALE, x, y);
  },

  /** @param {number} angle */
  rotate: function(angle) {
    this.push_(CommandType_.ROTATE, angle);
  },

  /**
   * @param {number} x
   * @param {number} y
   */
  translate: function(x, y) {
    this.push_(CommandType_.TRANSLATE, x, y);
  },

  /**
   * @param {number} m11
   * @param {number} m12
   * @param {number} m21
   * @param {number} m22
   * @param {number} dx
   * @param {number} dy
   */
  transform: function(m11, m12, m21, m22, dx, dy) {
    this.push_(CommandType_.TRANSFORM, m11, m12, m21, m22, dx, dy);
  },

  /**
   * @param {number} m11
   * @param {number} m12
   * @param {number} m21
   * @param {number} m22
   * @param {number} dx
   * @param {number} dy
   */
  setTransform: function(m11, m12, m21, m22, dx, dy) {
    this.push_(CommandType_.SET_TRANSFORM, m11, m12, m21, m22, dx, dy);
  },

  resetTransform: function() {
    this.push_(CommandType_.RESET_TRANSFORM);
  },

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} w
   * @param {number} h
   */
  clearRect: function(x, y, w, h) {
    this.push_(CommandType_.CLEAR_RECT, x, y, w, h);
  },

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} w
   * @param {number} h
   */
  fillRect: function(x, y, w, h) {
    this.push_(CommandType_.FILL_RECT, x, y, w, h);
  },

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} w
   * @param {number} h
   */
  strokeRect: function(x, y, w, h) {
    this.push_(CommandType_.STROKE_RECT, x, y, w, h);
  },

  beginPath: function() {
    this.push_(CommandType_.BEGIN_PATH);
  },

  closePath: function() {
    this.push_(CommandType_.CLOSE_PATH);
  },

  /**
   * @param {number} x
   * @param {number} y
   */
  moveTo: function(x, y) {
    this.push_(CommandType_.MOVE_TO, x, y);
  },

  /**
   * @param {number} x
   * @param {number} y
   */
  lineTo: function(x, y) {
    this.push_(CommandType_.LINE_TO, x, y);
  },

  /**
   * @param {number} cpx
   * @param {number} cpy
   * @param {number} x
   * @param {number} y
   */
  quadraticCurveTo: function(cpx, cpy, x, y) {
    this.push_(CommandType_.QUADRATIC_CURVE_TO, cpx, cpy, x, y);
  },

  /**
   * @param {number} cp1x
   * @param {number} cp1y
   * @param {number} cp2x
   * @param {number} cp2y
   * @param {number} x
   * @param {number} y
   */
  bezierCurveTo: function(cp1x, cp1y, cp2x, cp2y, x, y) {
    this.push_(CommandType_.BEZIER_CURVE_TO,
        cp1x, cp1y, cp2x, cp2y, x, y);
  },

  /**
   * @param {number} x1
   * @param {number} y1
   * @param {number} x2
   * @param {number} y2
   * @param {number} radius
   */
  arcTo: function(x1, y1, x2, y2, radius) {
    this.push_(CommandType_.ARC_TO, x1, y1, x2, y2, radius);
  },

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} w
   * @param {number} h
   */
  rect: function(x, y, w, h) {
    this.push_(CommandType_.RECT, x, y, w, h);
  },

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} radius
   * @param {number} startAngle
   * @param {number} endAngle
   * @param {boolean=} opt_anticlockwise
   */
  arc: function(x, y, radius, startAngle, endAngle, opt_anticlockwise) {
    this.push_(CommandType_.ARC,
        x, y, radius, startAngle, endAngle, opt_anticlockwise);
  },

  fill: function() {
    this.push_(CommandType_.FILL);
  },

  stroke: function() {
    this.push_(CommandType_.STROKE);
  },

  clip: function() {
    this.push_(CommandType_.CLIP);
  },

  /**
   * @param {string} text
   * @param {number} x
   * @param {number} y
   * @param {number=} opt_maxWidth
   */
  fillText: function(text, x, y, opt_maxWidth) {
    this.push_(CommandType_.FILL_TEXT, text, x, y, opt_maxWidth);
  },

  /**
   * @param {string} text
   * @param {number} x
   * @param {number} y
   * @param {number=} opt_maxWidth
   */
  strokeText: function(text, x, y, opt_maxWidth) {
    this.push_(CommandType_.STROKE_TEXT, text, x, y, opt_maxWidth);
  },

  /** @param {!Array<number>} segments */
  setLineDash: function(segments) {
    this.push_(CommandType_.LINE_DASH, segments);
  },

  /** @param {number} alpha */
  setAlpha: function(alpha) {
    this.push_(CommandType_.ALPHA, alpha);
  },

  /** @param {number} compositeOperation */
  setCompositeOperation: function(compositeOperation) {
    this.push_(CommandType_.COMPOSITE_OPERATION, compositeOperation);
  },

  /** @param {number} shadowOffsetX */
  setShadowOffsetX: function(shadowOffsetX) {
    this.push_(CommandType_.SHADOW_OFFSET_X, shadowOffsetX);
  },

  /** @param {number} shadowOffsetY */
  setShadowOffsetY: function(shadowOffsetY) {
    this.push_(CommandType_.SHADOW_OFFSET_Y, shadowOffsetY);
  },

  /** @param {number} shadowBlur */
  setShadowBlur: function(shadowBlur) {
    this.push_(CommandType_.SHADOW_BLUR, shadowBlur);
  },

  /** @param {string} shadowColor */
  setShadowColor: function(shadowColor) {
    this.push_(CommandType_.SHADOW_COLOR, shadowColor);
  },

  /** @param {string} fillColor */
  setFillColor: function(fillColor) {
    this.push_(CommandType_.FILL_COLOR, fillColor);
  },

  /** @param {number} lineWidth */
  setLineWidth: function(lineWidth) {
    this.push_(CommandType_.LINE_WIDTH, lineWidth);
  },

  /** @param {string} lineCap */
  setLineCap: function(lineCap) {
    this.push_(CommandType_.LINE_CAP, lineCap);
  },

  /** @param {string} lineJoin */
  setLineJoin: function(lineJoin) {
    this.push_(CommandType_.LINE_JOIN, lineJoin);
  },

  /** @param {number} miterLimit */
  setMiterLimit: function(miterLimit) {
    this.push_(CommandType_.MITER_LIMIT, miterLimit);
  },

  /** @param {string} font */
  setFont: function(font) {
    this.push_(CommandType_.FONT, font);
  },

  /** @param {string} textAlign */
  setTextAlign: function(textAlign) {
    this.push_(CommandType_.TEXT_ALIGN, textAlign);
  },

  /** @param {string} textBaseline */
  setTextBaseline: function(textBaseline) {
    this.push_(CommandType_.TEXT_BASELINE, textBaseline);
  }
});


/** @typedef {{command: CommandType_, args: !Array<*>}} */
canvas.Command_;


/**
 * @enum {string}
 * @private
 */
var CommandType_ = {
  SAVE: 'save',
  RESTORE: 'restore',
  SCALE: 'scale',
  ROTATE: 'rotate',
  TRANSLATE: 'translate',
  TRANSFORM: 'transform',
  SET_TRANSFORM: 'setTransform',
  RESET_TRANSFORM: 'resetTransform',
  CLEAR_RECT: 'clearRect',
  FILL_RECT: 'fillRect',
  STROKE_RECT: 'strokeRect',
  BEGIN_PATH: 'beginPath',
  CLOSE_PATH: 'closePath',
  MOVE_TO: 'moveTo',
  LINE_TO: 'lineTo',
  QUADRATIC_CURVE_TO: 'quadraticCurveTo',
  BEZIER_CURVE_TO: 'bezierCurveTo',
  ARC_TO: 'arcTo',
  RECT: 'rect',
  ARC: 'arc',
  FILL: 'fill',
  STROKE: 'stroke',
  CLIP: 'clip',
  FILL_TEXT: 'fillText',
  STROKE_TEXT: 'strokeText',
  LINE_DASH: 'lineDash',
  ALPHA: 'globalAlpha',
  COMPOSITE_OPERATION: 'globalCompositeOperation',
  SHADOW_OFFSET_X: 'shadowOffsetX',
  SHADOW_OFFSET_Y: 'shadowOffsetY',
  SHADOW_BLUR: 'shadowBlur',
  SHADOW_COLOR: 'shadowColor',
  FILL_COLOR: 'fillStyle',
  LINE_WIDTH: 'lineWidth',
  LINE_CAP: 'lineCap',
  LINE_JOIN: 'lineJoin',
  MITER_LIMIT: 'miterLimit',
  FONT: 'font',
  TEXT_ALIGN: 'textAlign',
  TEXT_BASELINE: 'textBaseline'
};


/**
 * @enum {boolean}
 * @private
 */
var ContextProperty_ = {};
ContextProperty_[CommandType_.ALPHA] = true;
ContextProperty_[CommandType_.COMPOSITE_OPERATION] = true;
ContextProperty_[CommandType_.SHADOW_OFFSET_X] = true;
ContextProperty_[CommandType_.SHADOW_OFFSET_Y] = true;
ContextProperty_[CommandType_.SHADOW_BLUR] = true;
ContextProperty_[CommandType_.SHADOW_COLOR] = true;
ContextProperty_[CommandType_.FILL_COLOR] = true;
ContextProperty_[CommandType_.LINE_WIDTH] = true;
ContextProperty_[CommandType_.LINE_CAP] = true;
ContextProperty_[CommandType_.LINE_JOIN] = true;
ContextProperty_[CommandType_.MITER_LIMIT] = true;
ContextProperty_[CommandType_.FONT] = true;
ContextProperty_[CommandType_.TEXT_ALIGN] = true;
ContextProperty_[CommandType_.TEXT_BASELINE] = true;


/**
 * @param {*} num
 * @private
 */
var isNum_ = function(num) {
  goog.asserts.assertNumber(num);
};


/**
 * @param {*} num
 * @private
 */
var isNumOrUndefined_ = function(num) {
  goog.asserts.assert(!goog.isDef(num) || goog.isNumber(num));
};


/**
 * @param {*} str
 * @private
 */
var isString_ = function(str) {
  goog.asserts.assertString(str);
};


/**
 * @param {*} numArr
 * @private
 */
var isNumArray_ = function(numArr) {
  goog.asserts.assertArray(numArr);
  for (var i = 0; i < numArr.length; i++) {
    goog.asserts.assertNumber(numArr[i]);
  }
};


/**
 * @type {!Object<CommandType_, !Array<function(*): boolean>>}
 * @private
 */
canvas.VerifyMap_ = {};
canvas.VerifyMap_[CommandType_.SAVE] = [];
canvas.VerifyMap_[CommandType_.RESTORE] = [];
canvas.VerifyMap_[CommandType_.SCALE] = [isNum_, isNum_];
canvas.VerifyMap_[CommandType_.ROTATE] = [isNum_];
canvas.VerifyMap_[CommandType_.TRANSLATE] = [isNum_, isNum_];
canvas.VerifyMap_[CommandType_.TRANSFORM] =
    [isNum_, isNum_, isNum_, isNum_, isNum_, isNum_];
canvas.VerifyMap_[CommandType_.SET_TRANSFORM] =
    [isNum_, isNum_, isNum_, isNum_, isNum_, isNum_];
canvas.VerifyMap_[CommandType_.RESET_TRANSFORM] = [];
canvas.VerifyMap_[CommandType_.CLEAR_RECT] = [isNum_, isNum_, isNum_, isNum_];
canvas.VerifyMap_[CommandType_.FILL_RECT] = [isNum_, isNum_, isNum_, isNum_];
canvas.VerifyMap_[CommandType_.STROKE_RECT] = [isNum_, isNum_, isNum_, isNum_];
canvas.VerifyMap_[CommandType_.BEGIN_PATH] = [];
canvas.VerifyMap_[CommandType_.CLOSE_PATH] = [];
canvas.VerifyMap_[CommandType_.MOVE_TO] = [isNum_, isNum_];
canvas.VerifyMap_[CommandType_.LINE_TO] = [isNum_, isNum_];
canvas.VerifyMap_[CommandType_.QUADRATIC_CURVE_TO] =
    [isNum_, isNum_, isNum_, isNum_];
canvas.VerifyMap_[CommandType_.BEZIER_CURVE_TO] =
    [isNum_, isNum_, isNum_, isNum_, isNum_, isNum_];
canvas.VerifyMap_[CommandType_.ARC_TO] =
    [isNum_, isNum_, isNum_, isNum_, isNum_];
canvas.VerifyMap_[CommandType_.RECT] = [isNum_, isNum_, isNum_, isNum_];
canvas.VerifyMap_[CommandType_.RECT] =
    [isNum_, isNum_, isNum_, isNum_, isNumOrUndefined_];
canvas.VerifyMap_[CommandType_.ARC] =
    [isNum_, isNum_, isNum_, isNum_, isNum_, isNumOrUndefined_];
canvas.VerifyMap_[CommandType_.FILL] = [];
canvas.VerifyMap_[CommandType_.STROKE] = [];
canvas.VerifyMap_[CommandType_.CLIP] = [];
canvas.VerifyMap_[CommandType_.FILL_TEXT] =
    [isString_, isNum_, isNum_, isNumOrUndefined_];
canvas.VerifyMap_[CommandType_.STROKE_TEXT] =
    [isString_, isNum_, isNum_, isNumOrUndefined_];
canvas.VerifyMap_[CommandType_.LINE_DASH] = [isNumArray_];
canvas.VerifyMap_[CommandType_.ALPHA] = [isNum_];
canvas.VerifyMap_[CommandType_.COMPOSITE_OPERATION] = [isString_];
canvas.VerifyMap_[CommandType_.SHADOW_OFFSET_X] = [isNum_];
canvas.VerifyMap_[CommandType_.SHADOW_OFFSET_Y] = [isNum_];
canvas.VerifyMap_[CommandType_.SHADOW_BLUR] = [isNum_];
canvas.VerifyMap_[CommandType_.SHADOW_COLOR] = [isString_];
canvas.VerifyMap_[CommandType_.FILL_COLOR] = [isString_];
canvas.VerifyMap_[CommandType_.LINE_WIDTH] = [isNum_];
canvas.VerifyMap_[CommandType_.LINE_CAP] = [isString_];
canvas.VerifyMap_[CommandType_.LINE_JOIN] = [isString_];
canvas.VerifyMap_[CommandType_.MITER_LIMIT] = [isNum_];
canvas.VerifyMap_[CommandType_.FONT] = [isString_];
canvas.VerifyMap_[CommandType_.TEXT_ALIGN] = [isString_];
canvas.VerifyMap_[CommandType_.TEXT_BASELINE] = [isString_];

});  // goog.scope
