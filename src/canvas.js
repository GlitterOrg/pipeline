goog.provide('canvas');


/** A write only rendering context, records commands to be replayed later. */
canvas.RenderingContext = goog.defineClass(null, {
  /** @constructor */
  constructor: function() {
    /** @type {!Array.<!canvas.Command_>} */
    this.commands_ = [];
  },

  /**
   * @param {canvas.CommandType_} command
   * @param {...*} var_args
   */
  push_: function(command, var_args) {
    // TODO do state checking.
    var args = Array.prototype.slice.call(arguments, 1);
    this.commands_.push({command: command, args: args});
  },

  save: function() {
    this.push_(canvas.CommandType_.SAVE);
  },

  restore: function() {
    this.push_(canvas.CommandType_.RESTORE);
  },

  /**
   * @param {number} x
   * @param {number} y
   */
  scale: function(x, y) {
    this.push_(canvas.CommandType_.SCALE, x, y);
  },

  /** @param {number} angle */
  rotate: function(angle) {
    this.push_(canvas.CommandType_.ROTATE, angle);
  },

  /**
   * @param {number} x
   * @param {number} y
   */
  translate: function(x, y) {
    this.push_(canvas.CommandType_.TRANSLATE, x, y);
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
    this.push_(canvas.CommandType_.TRANSFORM, m11, m12, m21, m22, dx, dy);
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
    this.push_(canvas.CommandType_.SET_TRANSFORM, m11, m12, m21, m22, dx, dy);
  },

  resetTransform: function() {
    this.push_(canvas.CommandType_.RESET_TRANSFORM);
  },

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} w
   * @param {number} h
   */
  clearRect: function(x, y, w, h) {
    this.push_(canvas.CommandType_.CLEAR_RECT, x, y, w, h);
  },

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} w
   * @param {number} h
   */
  fillRect: function(x, y, w, h) {
    this.push_(canvas.CommandType_.FILL_RECT, x, y, w, h);
  },

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} w
   * @param {number} h
   */
  strokeRect: function(x, y, w, h) {
    this.push_(canvas.CommandType_.STROKE_RECT, x, y, w, h);
  },

  beginPath: function() {
    this.push_(canvas.CommandType_.BEGIN_PATH);
  },

  closePath: function() {
    this.push_(canvas.CommandType_.CLOSE_PATH);
  },

  /**
   * @param {number} x
   * @param {number} y
   */
  moveTo: function(x, y) {
    this.push_(canvas.CommandType_.MOVE_TO, x, y);
  },

  /**
   * @param {number} x
   * @param {number} y
   */
  lineTo: function(x, y) {
    this.push_(canvas.CommandType_.LINE_TO, x, y);
  },

  /**
   * @param {number} cpx
   * @param {number} cpy
   * @param {number} x
   * @param {number} y
   */
  quadraticCurveTo: function(cpx, cpy, x, y) {
    this.push_(canvas.CommandType_.QUADRATIC_CURVE_TO, cpx, cpy, x, y);
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
    this.push_(canvas.CommandType_.BEZIER_CURVE_TO,
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
    this.push_(canvas.CommandType_.ARC_TO, x1, y1, x2, y2, radius);
  },

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} w
   * @param {number} h
   */
  rect: function(x, y, w, h) {
    this.push_(canvas.CommandType_.RECT, x, y, w, h);
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
    this.push_(canvas.CommandType_.ARC,
        x, y, radius, startAngle, endAngle, opt_anticlockwise);
  },

  fill: function() {
    this.push_(canvas.CommandType_.FILL);
  },

  stroke: function() {
    this.push_(canvas.CommandType_.STROKE);
  },

  clip: function() {
    this.push_(canvas.CommandType_.CLIP);
  },

  /**
   * @param {string} text
   * @param {number} x
   * @param {number} y
   * @param {number=} opt_maxWidth
   */
  fillText: function(text, x, y, opt_maxWidth) {
    this.push_(canvas.CommandType_.FILL_TEXT, text, x, y, opt_maxWidth);
  },

  /**
   * @param {string} text
   * @param {number} x
   * @param {number} y
   * @param {number=} opt_maxWidth
   */
  strokeText: function(text, x, y, opt_maxWidth) {
    this.push_(canvas.CommandType_.STROKE_TEXT, text, x, y, opt_maxWidth);
  },

  /** @param {!Array<number>} segments */
  setLineDash: function(segments) {
    this.push_(canvas.CommandType_.LINE_DASH, segments);
  },

  /** @param {number} alpha */
  setAlpha: function(alpha) {
    this.push_(canvas.CommandType_.ALPHA, alpha);
  },

  /**
   * @param {number} compositeOperation
   */
  setCompositeOperation: function(compositeOperation) {
    this.push_(canvas.CommandType_.COMPOSITE_OPERATION, compositeOperation);
  },

  /** @param {number} shadowOffsetX */
  setShadowOffsetX: function(shadowOffsetX) {
    this.push_(canvas.CommandType_.SHADOW_OFFSET_X, shadowOffsetX);
  },

  /** @param {number} shadowOffsetY */
  setShadowOffsetY: function(shadowOffsetY) {
    this.push_(canvas.CommandType_.SHADOW_OFFSET_Y, shadowOffsetY);
  },

  /** @param {number} shadowBlur */
  setShadowBlur: function(shadowBlur) {
    this.push_(canvas.CommandType_.SHADOW_BLUR, shadowBlur);
  },

  /** @param {string} shadowColor */
  setShadowColor: function(shadowColor) {
    this.push_(canvas.CommandType_.SHADOW_COLOR, shadowColor);
  },

  /** @param {number} lineWidth */
  setLineWidth: function(lineWidth) {
    this.push_(canvas.CommandType_.LINE_WIDTH, lineWidth);
  },

  /** @param {string} lineCap */
  setLineCap: function(lineCap) {
    this.push_(canvas.CommandType_.LINE_CAP, lineCap);
  },

  /** @param {string} lineJoin */
  setLineJoin: function(lineJoin) {
    this.push_(canvas.CommandType_.LINE_JOIN, lineJoin);
  },

  /** @param {number} miterLimit */
  setMiterLimit: function(miterLimit) {
    this.push_(canvas.CommandType_.MITER_LIMIT, miterLimit);
  },

  /** @param {string} font */
  setFont: function(font) {
    this.push_(canvas.CommandType_.FONT, font);
  },

  /** @param {string} textAlign */
  setTextAlign: function(textAlign) {
    this.push_(canvas.CommandType_.TEXT_ALIGN, textAlign);
  },

  /** @param {string} textBaseline */
  setTextBaseline: function(textBaseline) {
    this.push_(canvas.CommandType_.TEXT_BASELINE, textBaseline);
  }
});


/** @typedef {{command: canvas.CommandType_, args: !Array<*>}} */
canvas.Command_;


/**
 * @enum {string}
 * @private
 */
canvas.CommandType_ = {
  SAVE: 'save',
  RESTORE: 'restore',
  SCALE: 'scale',
  ROTATE: 'rotate',
  TRANSLATE: 'translate',
  TRANSFORM: 'transform',
  SET_TRANSFORM: 'set_transform',
  RESET_TRANSFORM: 'reset_transform',
  CLEAR_RECT: 'clear_rect',
  FILL_RECT: 'fill_rect',
  STROKE_RECT: 'stroke_rect',
  BEGIN_PATH: 'begin_path',
  CLOSE_PATH: 'close_path',
  MOVE_TO: 'move_to',
  LINE_TO: 'line_to',
  QUADRATIC_CURVE_TO: 'quadratic_curve_to',
  BEZIER_CURVE_TO: 'bezier_curve_to',
  ARC_TO: 'arc_to',
  RECT: 'rect',
  ARC: 'arc',
  FILL: 'fill',
  STROKE: 'stroke',
  CLIP: 'clip',
  FILL_TEXT: 'fill_text',
  STROKE_TEXT: 'stroke_text',
  LINE_DASH: 'line_dash',
  ALPHA: 'alpha',
  COMPOSITE_OPERATION: 'composite_operation',
  SHADOW_OFFSET_X: 'shadow_offset_x',
  SHADOW_OFFSET_Y: 'shadow_offset_y',
  SHADOW_BLUR: 'shadow_blur',
  SHADOW_COLOR: 'shadow_color',
  LINE_WIDTH: 'line_width',
  LINE_CAP: 'line_cap',
  LINE_JOIN: 'line_join',
  MITER_LIMIT: 'miter_limit',
  FONT: 'font',
  TEXT_ALIGN: 'text_align',
  TEXT_BASELINE: 'text_baseline'
};
