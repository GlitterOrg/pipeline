goog.provide('style');

goog.require('pipeline');

style.baseExec_ = css.exec;
css.exec = function(str) {
  var els = document.querySelectorAll('*');
  for (var i = 0; i < els.length; i++)
    els[i].style.element = els[i];
  style.baseExec_(str);
  style.handleCustomProperties_();
};

style.customProperties_ = {};

// Register a property handler for the provided name.
function registerPropertyHandler(name, record) {
  style.customProperties_[name] = record;
  if (record.animateAs) {
    addCustomHandler(name, record.animateAs);
  }
  Object.defineProperty(CSSStyleDeclaration.prototype, name, {
    get: function() { return this['_' + name]; },
    set: function(v) { pipeline.invalidate(this.element, pipeline.STYLE_INVALID); this['_' + name] = v; }
  });
}

// Iterate through elements and custom properties on each.
// TODO: This could be a lot more efficient if a map of custom properties to elements
// were established during processing.
style.handleCustomProperties_ = function() {
  var els = document.querySelectorAll('*');
  for (var i = 0; i < els.length; i++) {
    style.handleCustomPropertiesForElement_(els[i]);
  }
}

style.handleCustomPropertiesForElement_ = function(el) {
  for (name in style.customProperties_) {
    if (style.customProperties_[name].initial !== undefined)
      if (el.style[name] == undefined) {
        el.style[name] = style.customProperties_[name].initial;
      }
  }
  for (name in style.customProperties_) {
    if (el.style[name] == undefined)
      continue;
    // TODO: Work out how to order these for complex property sets
    if (style.customProperties_[name].apply)
      style.customProperties_[name].apply({
        value: el.style[name],
        result: el.style,
        computed: getComputedStyle(el)
      });
  }
}

style.scrollers_ = [];

function isAScroller(element) {
  element._deltas = [];
  element._position = 0;
  //element.addEventListener('wheel', function(e) {
  //  element._deltas.push(e.wheelDeltaY);
  //});
  PolymerGestures.addEventListener(element.parentElement, 'track', function(e) {
    element._deltas.push(e.ddy);
    pipeline.invalidate(element, pipeline.STYLE_INVALID);
  });
  style.scrollers_.push(element);
}

style.processScroller = function(element) {
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
  style.handleCustomPropertiesForElement_(element);
  if (element._deltas) {
    element._position = element.style.scrollOffset;
    element.style.transform = 'translateY(' + (-element._position) + 'px)';
    element._deltas = [];
  }
}
