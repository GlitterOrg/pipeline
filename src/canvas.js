goog.provide('canvas');

goog.require('commands');
goog.require('goog.asserts');
goog.require('goog.object');
goog.require('svg');

goog.scope(function() {

var CommandType_ = commands.Type;


/**
 * A write only rendering context, records commands to be replayed later.
 * @export
 */
canvas.RenderingContext = goog.defineClass(null, {
  /** @constructor */
  constructor: function() {
    /** @private {boolean} */
    this.writable_ = false;

    /** @private {boolean} */
    this.seenSuper_ = false;

    /** @private {!Array.<!canvas.Command_>} */
    this.commands_ = [];

    /** @private {!Array.<!canvas.State_>} */
    this.stateStack_ = [];

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
      this.commands_ = [];  // TODO add assert here.
      this.seenSuper_ = false;
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
   * @param {Element} el
   * @param {!CanvasRenderingContext2D} lower
   * @param {!CanvasRenderingContext2D} upper
   */
  write: function(el, lower, upper) {
    // Check that we aren't writable.
    goog.asserts.assert(!this.writable_);
    var ctx = lower;  // Begin with the lower context.
    var stateCommands = [];
    var lastBeginPathIdx = null;

    // Clear state stack.
    this.stateStack_ = [{clipPath: 'none'}];

    for (var i = 0; i < this.commands_.length; i++) {
      var cmd = this.commands_[i];

      // Keep a record of all the command which effect canvas state.
      if (ctx == lower && StateCommand_[cmd.command]) {
        stateCommands.push(cmd);
      }

      if (cmd.command == CommandType_.BEGIN_PATH) {
        lastBeginPathIdx = i;
      }

      // Update the internal state.
      if (cmd.command == CommandType_.SAVE) {
        this.stateStack_.push(
            goog.object.clone(this.stateStack_[this.stateStack_.length - 1]));
      }

      if (cmd.command == CommandType_.RESTORE) {
        this.stateStack_.pop();
      }

      // Update the internal state with a new clip if applied.
      if (cmd.command == CommandType_.CLIP && lastBeginPathIdx != null && el) {
        // Grab all the path commands.
        var subset = this.commands_.slice(lastBeginPathIdx + 1, i);
        this.stateStack_[this.stateStack_.length - 1] = {
          clipPath: this.getClipPathCSSValue_(el._svgId, subset)
        };
      }

      if (cmd.command == CommandType_.PAINT_SUPER) {
        // Write the canvas state to the element.
        if (el) {
          el.style.webkitClipPath =
              this.stateStack_[this.stateStack_.length - 1].clipPath;
        }

        ctx = upper;

        for (var j = 0; j < stateCommands.length; j++) {
          this.applyCommand_(ctx, stateCommands[j]);
        }
      } else {
        this.applyCommand_(ctx, cmd);
      }
    }
  },

  /**
   * @param {!CanvasRenderingContext2D} ctx
   * @param {!canvas.Command_} cmd
   */
  applyCommand_: function(ctx, cmd) {
    if (ContextProperty_[cmd.command]) {
      ctx[cmd.command] = cmd.args[0];
    } else {
      CanvasRenderingContext2D.prototype[cmd.command].apply(ctx, cmd.args);
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

  /**
   * Given a list of canvas paint commands builds an SVG clip path, and returns
   * a CSS clip-path value to be applied on the element.
   * @param {!Array<canvas.Command_>} cmds The paint commands to build up the
   *     clip path.
   * @param {number} id The id of the SVG path to use for the clip.
   * @return {string} The value for the 'clip-path' to be applied on the
   *     element.
   * @private
   */
  getClipPathCSSValue_: function(id, cmds) {
    var str = svg.buildPathString(cmds);
    var clipPath = canvas.SVG_['getElementById'](id);
    if (!clipPath) {
      clipPath =
          document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
      clipPath.setAttribute('id', id);
      canvas.SVG_.appendChild(clipPath);
    }

    clipPath.innerHTML = '<path d="' + str + '" />';

    return 'url(#' + id + ')';
  },

  joinArgs_: function(args) {},

  paintSuper: function() {
    goog.asserts.assert(!this.seenSuper_, 'paintSuper already been called.');
    this.seenSuper_ = true;
    this.push_(CommandType_.PAINT_SUPER);
  },

  save: function() { this.push_(CommandType_.SAVE); },

  restore: function() { this.push_(CommandType_.RESTORE); },

  /**
   * @param {number} x
   * @param {number} y
   */
  scale: function(x, y) { this.push_(CommandType_.SCALE, x, y); },

  /** @param {number} angle */
  rotate: function(angle) { this.push_(CommandType_.ROTATE, angle); },

  /**
   * @param {number} x
   * @param {number} y
   */
  translate: function(x, y) { this.push_(CommandType_.TRANSLATE, x, y); },

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

  resetTransform: function() { this.push_(CommandType_.RESET_TRANSFORM); },

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

  beginPath: function() { this.push_(CommandType_.BEGIN_PATH); },

  closePath: function() { this.push_(CommandType_.CLOSE_PATH); },

  /**
   * @param {number} x
   * @param {number} y
   */
  moveTo: function(x, y) { this.push_(CommandType_.MOVE_TO, x, y); },

  /**
   * @param {number} x
   * @param {number} y
   */
  lineTo: function(x, y) { this.push_(CommandType_.LINE_TO, x, y); },

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
    this.push_(CommandType_.BEZIER_CURVE_TO, cp1x, cp1y, cp2x, cp2y, x, y);
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
  rect: function(x, y, w, h) { this.push_(CommandType_.RECT, x, y, w, h); },

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} radius
   * @param {number} startAngle
   * @param {number} endAngle
   * @param {boolean=} opt_anticlockwise
   */
  arc: function(x, y, radius, startAngle, endAngle, opt_anticlockwise) {
    this.push_(CommandType_.ARC, x, y, radius, startAngle, endAngle,
               opt_anticlockwise);
  },

  fill: function() { this.push_(CommandType_.FILL); },

  stroke: function() { this.push_(CommandType_.STROKE); },

  clip: function() { this.push_(CommandType_.CLIP); },

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
  setAlpha: function(alpha) { this.push_(CommandType_.ALPHA, alpha); },

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

  setStrokeColor: function(strokeColor) {
    this.push_(CommandType_.STROKE_COLOR, strokeColor);
  },

  /** @param {number} lineWidth */
  setLineWidth: function(lineWidth) {
    this.push_(CommandType_.LINE_WIDTH, lineWidth);
  },

  /** @param {string} lineCap */
  setLineCap: function(lineCap) { this.push_(CommandType_.LINE_CAP, lineCap); },

  /** @param {string} lineJoin */
  setLineJoin: function(lineJoin) {
    this.push_(CommandType_.LINE_JOIN, lineJoin);
  },

  /** @param {number} miterLimit */
  setMiterLimit: function(miterLimit) {
    this.push_(CommandType_.MITER_LIMIT, miterLimit);
  },

  /** @param {string} font */
  setFont: function(font) { this.push_(CommandType_.FONT, font); },

  /** @param {string} textAlign */
  setTextAlign: function(textAlign) {
    this.push_(CommandType_.TEXT_ALIGN, textAlign);
  },

  /** @param {string} textBaseline */
  setTextBaseline: function(textBaseline) {
    this.push_(CommandType_.TEXT_BASELINE, textBaseline);
  }
});


/** @typedef {{command: commands.Type, args: !Array<*>}} */
canvas.Command_;


/** @typedef {{clipPath: string}} */
canvas.State_;


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
ContextProperty_[CommandType_.STROKE_COLOR] = true;
ContextProperty_[CommandType_.TEXT_ALIGN] = true;
ContextProperty_[CommandType_.TEXT_BASELINE] = true;


/**
 * @enum {boolean}
 * @private
 */
var StateCommand_ = {};
StateCommand_[CommandType_.SAVE] = true;
StateCommand_[CommandType_.RESTORE] = true;
StateCommand_[CommandType_.SCALE] = true;
StateCommand_[CommandType_.ROTATE] = true;
StateCommand_[CommandType_.TRANSLATE] = true;
StateCommand_[CommandType_.TRANSFORM] = true;
StateCommand_[CommandType_.SET_TRANSFORM] = true;
StateCommand_[CommandType_.RESET_TRANSFORM] = true;
StateCommand_[CommandType_.ALPHA] = true;
StateCommand_[CommandType_.COMPOSITE_OPERATION] = true;
StateCommand_[CommandType_.SHADOW_OFFSET_X] = true;
StateCommand_[CommandType_.SHADOW_OFFSET_Y] = true;
StateCommand_[CommandType_.SHADOW_BLUR] = true;
StateCommand_[CommandType_.SHADOW_COLOR] = true;
StateCommand_[CommandType_.STROKE_COLOR] = true;
StateCommand_[CommandType_.FILL_COLOR] = true;
StateCommand_[CommandType_.LINE_WIDTH] = true;
StateCommand_[CommandType_.LINE_CAP] = true;
StateCommand_[CommandType_.LINE_JOIN] = true;
StateCommand_[CommandType_.MITER_LIMIT] = true;
StateCommand_[CommandType_.FONT] = true;
StateCommand_[CommandType_.TEXT_ALIGN] = true;
StateCommand_[CommandType_.TEXT_BASELINE] = true;


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
 * @param {*} num
 * @private
 */
var isBoolOrUndefined_ = function(num) {
  goog.asserts.assert(!goog.isDef(num) || goog.isBoolean(num));
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
canvas.VerifyMap_[CommandType_.PAINT_SUPER] = [];
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
canvas.VerifyMap_[CommandType_
                      .QUADRATIC_CURVE_TO] = [isNum_, isNum_, isNum_, isNum_];
canvas.VerifyMap_[CommandType_.BEZIER_CURVE_TO] =
    [isNum_, isNum_, isNum_, isNum_, isNum_, isNum_];
canvas.VerifyMap_[CommandType_
                      .ARC_TO] = [isNum_, isNum_, isNum_, isNum_, isNum_];
canvas.VerifyMap_[CommandType_.RECT] = [isNum_, isNum_, isNum_, isNum_];
canvas.VerifyMap_[CommandType_.ARC] =
    [isNum_, isNum_, isNum_, isNum_, isNum_, isBoolOrUndefined_];
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
canvas.VerifyMap_[CommandType_.STROKE_COLOR] = [isString_];
canvas.VerifyMap_[CommandType_.FILL_COLOR] = [isString_];
canvas.VerifyMap_[CommandType_.LINE_WIDTH] = [isNum_];
canvas.VerifyMap_[CommandType_.LINE_CAP] = [isString_];
canvas.VerifyMap_[CommandType_.LINE_JOIN] = [isString_];
canvas.VerifyMap_[CommandType_.MITER_LIMIT] = [isNum_];
canvas.VerifyMap_[CommandType_.FONT] = [isString_];
canvas.VerifyMap_[CommandType_.TEXT_ALIGN] = [isString_];
canvas.VerifyMap_[CommandType_.TEXT_BASELINE] = [isString_];


/** @private {!Element} A SVG element for holding clip-paths. */
canvas.SVG_ = (function() {
  var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svg.style.position = 'absolute';
  svg.style.top = '-10000px';
  window.addEventListener(
      'load', function() { document.body.appendChild(svg); });
  return svg;
})();

});  // goog.scope
