/**
 * Hook css.exec to call custom properties handler.
 */
var _baseExec = css.exec;
css.exec = function(str) {
  _baseExec(str);
  _handleCustomProperties();
};

var _customProperties = {};

// Register a property handler for the provided name.
function registerPropertyHandler(name, record) {
  _customProperties[name] = record;
}

// Iterate through elements and custom properties on each.
// TODO: This could be a lot more efficient if a map of custom properties to elements
// were established during processing.
function _handleCustomProperties() {
  var els = document.querySelectorAll('*');
  for (var i = 0; i < els.length; i++) {
    _handleCustomPropertiesForElement(els[i]);
  }
}

function _handleCustomPropertiesForElement(el) {
  for (name in _customProperties) {
    if (_customProperties[name].initial !== undefined)
      if (el.style[name] == undefined) {
	el.style[name] = _customProperties[name].initial;
      }
  }
  for (name in _customProperties) {
    if (el.style[name] == undefined)
      continue;
    // TODO: Work out how to order these for complex property sets
    _customProperties[name].apply({
      value: el.style[name],
      result: el.style
    });
  }
}

var _scrollers = [];
var scrolled = false;

function isAScroller(element) {
  if (_scrollers.length == 0) 
    requestAnimationFrame(_processScrollers);
  element._deltas = [];
  element._position = 0;
  //element.addEventListener('wheel', function(e) {
  //  element._deltas.push(e.wheelDeltaY);
  //});
  PolymerGestures.addEventListener(element.parentElement, 'track', function(e) {
    element._deltas.push(e.ddy);
    scrolled = true;
  });
  _scrollers.push(element);
}

function _processScrollers() {
  requestAnimationFrame(_processScrollers);

  if (!scrolled) 
    return;
  scrolled = false;

  for (var i = 0; i < _scrollers.length; i++) {
    var computedDelta = _scrollers[i]._deltas.reduce(function(a, b) { return a + b; }, 0);
    var oldOffset = _scrollers[i]._position;
    _scrollers[i]._position -= computedDelta;  
    _scrollers[i]._position = Math.min(Math.max(0, _scrollers[i]._position), 1600);

    _scrollers[i].style.scrollDeltas = _scrollers[i]._deltas;
    _scrollers[i].style.oldScrollOffset = oldOffset;
    _scrollers[i].style.computedScrollDelta = -computedDelta;
    _scrollers[i].style.scrollOffset = _scrollers[i]._position;
    _scrollers[i].style.scrollOffset = _scrollers[i]._position;
    _handleCustomPropertiesForElement(_scrollers[i]);
    _scrollers[i]._position = _scrollers[i].style.scrollOffset;

    _scrollers[i].style.transform = 'translateY(' + (-_scrollers[i]._position) + 'px)';
    _scrollers[i]._deltas = [];
  }
}

function isolate(f, context) {
  return f.bind(context);
}

var _animate = Element.prototype.animate;
Element.prototype.animate = function(keyframes, timing) {
  var shadowKeyframes = [];
  for (var i = 0; i < keyframes.length; i++) {
    var keyframe = keyframes[i];
    var shadowKeyframe = {};
    for (var property in keyframe) {
      if (property in _customProperties) {
	shadowKeyframe[property] = keyframe[property];
      }
    }
    shadowKeyframes.push(shadowKeyframe);
  }

  var player = _animate.call(this, keyframes, timing);
  requestAnimationFrame(_tickAnimation(this, player, shadowKeyframes, 
      timing.duration !== undefined ? timing.duration : timing));
}

function _tickAnimation(element, player, keyframes, duration) {
  var tick = function(t) {
    var f = player.currentTime / duration;
    // TODO: Do this properly. Deal with multiple keyframes. Respect animateAs declarations.
    for (var property in keyframes[0]) {
      element.style[property] = (1 - f) * keyframes[0][property] + f * keyframes[1][property];
    }
    if (player.currentTime < duration) {
      requestAnimationFrame(tick);
    }
    _handleCustomPropertiesForElement(element);
  }
  return tick;
}

