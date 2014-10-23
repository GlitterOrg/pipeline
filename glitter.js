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
  if (el._style == undefined)
    return;
  var cs = getComputedStyle(el);
  for (name in _customProperties) {
    if (el._style[name] == undefined)
      continue;
    // TODO: Work out how to order these for complex property sets
    _customProperties[name].apply({
      value: el._style[name],
      computed: cs,
      specified: el._style,
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

    if (_scrollers[i]._style !== undefined) {
      _scrollers[i]._style.scrollDeltas = _scrollers[i]._deltas;
      _scrollers[i]._style.oldScrollOffset = oldOffset;
      _scrollers[i]._style.computedScrollDelta = -computedDelta;
      _scrollers[i]._style.scrollOffset = _scrollers[i]._position;
      _handleCustomPropertiesForElement(_scrollers[i]);
      _scrollers[i]._position = _scrollers[i]._style.scrollOffset;
    }

    _scrollers[i].style.transform = 'translateY(' + (-_scrollers[i]._position) + 'px)';
    _scrollers[i]._deltas = [];
  }
}

function isolate(f, context) {
  return f.bind(context);
}
