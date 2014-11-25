/**
 * Hook css.exec to call custom properties handler.
 */

goog.require('paint');
var _baseExec = css.exec;
css.exec = function(str) {
  _baseExec(str);
  _handleCustomProperties();
};

var _customProperties = {};

// Register a property handler for the provided name.
function registerPropertyHandler(name, record) {
  _customProperties[name] = record;
  if (record.animateAs) {
    addCustomHandler(name, record.animateAs);
  }
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
    if (_customProperties[name].apply)
      _customProperties[name].apply({
        value: el.style[name],
        result: el.style,
        computed: getComputedStyle(el)
      });
  }
}

var _scrollers = [];

function isAScroller(element) {
  element._deltas = [];
  element._position = 0;
  //element.addEventListener('wheel', function(e) {
  //  element._deltas.push(e.wheelDeltaY);
  //});
  PolymerGestures.addEventListener(element.parentElement, 'track', function(e) {
    element._deltas.push(e.ddy);
    invalidate_(element);
  });
  _scrollers.push(element);
}

var taskQueued = false;
var invalidatedElements_ = {};

var uniqid = 0;

function invalidate_(element) {
  if (element._id == undefined)
    element._id = 'i' + (uniqid++);
  if (taskQueued == false) {
    paint.enqueueMicroTask_(handleInvalidatedElements_);
    taskQueued = true;
  }
  invalidatedElements_[element._id] = element;
}

function handleInvalidatedElements_() {
  var ie = [];
  for (var e in invalidatedElements_) {
    ie.push(invalidatedElements_[e]);
  }
  invalidatedElements_ = {};
  for (var i = 0; i < ie.length; i++) {
    _pipeline(ie[i]);
  }
  taskQueued = false;
  if (Object.keys(invalidatedElements_).length > 0) {
    taskQueued = true;
    requestAnimationFrame(handleInvalidatedElements_);
  }
}

function _pipeline(element) {
  _processScroller(element);
  paint._paint(element);
}

function _processScroller(element) {
  if (element._deltas) {
    var computedDelta = element._deltas.reduce(function(a, b) { return a + b; }, 0);
    var oldOffset = element._position;
    element._position -= computedDelta;
    element._position = Math.min(Math.max(0, element._position), 1600);

    element.style.scrollDeltas = element._deltas;
    element.style.oldScrollOffset = oldOffset;
    element.style.computedScrollDelta = -computedDelta;
    element.style.scrollOffset = element._position;
    element.style.scrollOffset = element._position;
  }
  _handleCustomPropertiesForElement(element);
  if (element._deltas) {
    element._position = element.style.scrollOffset;
    element.style.transform = 'translateY(' + (-element._position) + 'px)';
    element._deltas = [];
  }
}

function isolate(f, context) {
  return f.bind(context);
}

