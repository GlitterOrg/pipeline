goog.provide('pipeline');

goog.require('paint');
goog.require('style');


/**
 * Enqueues a microtask.
 * NOTE: I think this works. Maybe it doesn't. Who knows.
 * @param {function()} task
 * @private
 */
pipeline.enqueueMicroTask_ = function(task) {
  var p = new Promise(function(resolve) { resolve(undefined); });
  p.then(task);
};


/**
 * @enum {number}
 * @export
 */
pipeline.InvalidationLevel = {
  STYLE_INVALID: 3,
  LAYOUT_INVALID: 2,
  PAINT_INVALID: 1,
  VALID: 0
};


/** @private {!Object<!Element>} */
pipeline.invalidElements_ = {};


/**
 * If the validation set has changed since pipeline_ was last invoked. Will
 * require pipeline_ deferall to ensure pipeline_ is the last microtask.
 *
 * @private {boolean}
 */
pipeline.pendingValidation_ = false;


/**
 * If a pipeline_ call is already pending.
 *
 * @private {boolean}
 */
pipeline.pendingPipelinePhase_ = false;


/** @private {number} */
pipeline.invalidationUID_ = 0;


/**
 * Invalidate the provided element at the provided invalidation level.
 * The element will be refreshed up to the invalidation level on next
 * pipeline invokation.
 *
 * @param {!Element} element
 * @param {pipeline.InvalidationLevel} level
 * @export
 */
pipeline.invalidate = function(element, level) {
  if (element._invalidationID == undefined)
    element._invalidationID = 'i' + (pipeline.invalidationUID_++);
  pipeline.invalidElements_[element._invalidationID] = element;
  element._invalidationLevel = Math.max(
      element._invalidationLevel || pipeline.InvalidationLevel.VALID, level);
  pipeline.pendingValidation_ = true;
  pipeline.needsPipelinePhase_();
};


/**
 * Enqueue a pipeline microtask if none are pending.
 *
 * @private
 */
pipeline.needsPipelinePhase_ = function() {
  if (!pipeline.pendingPipelinePhase_) {
    pipeline.pendingPipelinePhase_ = true;
    pipeline.enqueueMicroTask_(function() {
      pipeline.pendingPipelinePhase_ = false;
      pipeline.pipeline_();
    });
  }
};


/**
 * Run the custom glitter pipeline. This will enqueue and defer to a
 * later microtask while pending validations are discovered.
 *
 * @private
 */
pipeline.pipeline_ = function() {
  pipeline.pendingValidation_ |= paint.collectInvalidPaintElements();
  // pipeline.pendingValidation_ |= collectInvalidLayoutElements_();
  // pipeline.pendingValidation_ |= collectInvalidStyleElements_();
  if (pipeline.pendingValidation_) {
    pipeline.pendingValidation_ = false;
    pipeline.needsPipelinePhase_();
    return;
  }
  for (var id in pipeline.invalidElements_) {
    var element = pipeline.invalidElements_[id];
    switch (element._invalidationLevel) {
      case pipeline.InvalidationLevel.STYLE_INVALID:
        style.processScroller(element);
      case pipeline.InvalidationLevel.LAYOUT_INVALID:
      case pipeline.InvalidationLevel.PAINT_INVALID:
        paint.paint(element);
    }
    element._invalidationLevel = pipeline.InvalidationLevel.VALID;
  }
  pipeline.invalidElements_ = {};
};

/**
 * Upgrade an element to be glitter capable. Ideally this should
 * never need to be public.
 *
 * @param {!Element} element 
 * @private
 */
pipeline.upgradeToGlitter_ = function(element) {
  // pin style object by referencing it again.
  element._style = element.style;
  // ensure element is referenceable from style object.
  element.style.element = element;
};


