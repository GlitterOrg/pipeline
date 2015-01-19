goog.provide('svg');

goog.require('commands');
goog.require('goog.asserts');


/**
 * Given an array of canvas commands, builds up a corresponding SVG path string
 * which represents it.
 * @param {!Array<!canvas.Command_>} cmds
 * @return {string}
 */
svg.buildPathString = function(cmds) {
  var parts = ['M 0 0'];
  for (var i = 0; i < cmds.length; i++) {
    var cmd = cmds[i];
    switch (cmd.command) {
      case commands.Type.MOVE_TO:
        parts.push('M ' + cmd.args.join(' '));
        break;
      case commands.Type.LINE_TO:
        parts.push('L ' + cmd.args.join(' '));
        break;
      case commands.Type.QUADRATIC_CURVE_TO:
        parts.push('Q ' + cmd.args.join(' '));
        break;
      case commands.Type.BEZIER_CURVE_TO:
        parts.push('C ' + cmd.args.join(' '));
        break;
      case commands.Type.RECT:
        Array.prototype.push.apply(parts, svg.buildRect_(cmd.args));
        break;
      case commands.Type.ARC:
        Array.prototype.push.apply(parts, svg.buildArc_(cmd.args));
        break;
      case commands.Type.CLOSE_PATH:
        parts.push('Z');
        break;
      case commands.Type.ARC_TO:  // TODO: add support for ARC_TO.
      default:
        goog.asserts.fail('Unsupported canvas command.');
    }
  }

  return parts.join(' ');
};


/**
 * Builds a path string for a canvas 'rect' command.
 * @param {!Array<*>} args
 * @return {!Array<string>}
 * @private
 */
svg.buildRect_ = function(args) {
  return [
    // Move to start.
    'M ' + args[0] + ' ' + args[1],
    // Draw box.
    'L ' + (args[0] + args[2]) + ' ' + args[1],
    'L ' + (args[0] + args[2]) + ' ' + (args[1] + args[3]),
    'L ' + args[0] + ' ' + (args[1] + args[3]),
    'L ' + args[0] + ' ' + args[1]
  ];
};


/**
 * Builds a path string for a canvas 'arc' command.
 * @param {!Array<*>} args
 * @return {!Array<string>}
 * @private
 */
svg.buildArc_ = function(args) {
  // Extract args.
  var x0 = /** @type {number} */ (args[0]);
  var y0 = /** @type {number} */ (args[1]);
  var r = /** @type {number} */ (args[2]);
  var startAngle = /** @type {number} */ (args[3]);
  var endAngle = /** @type {number} */ (args[4]);
  var anti = /** @type {boolean} */ (!!args[5]);
  var parts = [];

  // Calculate start & end points.
  var start = [x0 + r * Math.cos(startAngle), y0 + r * Math.sin(startAngle)];
  var end = [x0 + r * Math.cos(endAngle), y0 + r * Math.sin(endAngle)];

  // Check if we have a full circle.
  if (Math.abs(endAngle - startAngle) >= Math.PI * 2) {
    Array.prototype.push.apply(parts,
                               svg.buildArc_([x0, y0, r, 0, Math.PI, true]));
    Array.prototype.push.apply(
        parts, svg.buildArc_([x0, y0, r, Math.PI, 2 * Math.PI, true]));
    // Make sure cursor ends up in correct position.
    parts.push('M ' + end.join(' '));
    return parts;
  }

  // Line-to the start point.
  parts.push('L ' + start.join(' '));

  var angleDiff = svg.clampAngle_(endAngle - startAngle);
  var largeArc =
      (angleDiff < Math.PI && !anti) || (angleDiff > Math.PI && anti) ? '0' :
                                                                        '1';
  // Sweep is +ve arc direction which is anti-clockwise.
  var sweep = anti ? '0' : '1';

  parts.push('A ' + r + ' ' + r + ' 0 ' + largeArc + ' ' + sweep + ' ' +
             end[0] + ' ' + end[1]);

  return parts;
};


/**
 * Clamps an angle between [0, 2PI).
 * @param {number} rad
 * @return {number}
 * @private
 */
svg.clampAngle_ = function(rad) {
  return rad > 0 ? rad - 2 * Math.PI * Math.floor(rad / (2 * Math.PI)) :
                   rad + 2 * Math.PI * (1 + Math.ceil(rad / (2 * Math.PI)));
};
