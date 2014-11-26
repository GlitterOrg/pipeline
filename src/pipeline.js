goog.provide('pipeline');

goog.require('paint');

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

pipeline.STYLE_INVALID = 3;
pipeline.LAYOUT_INVALID = 2;
pipeline.PAINT_INVALID = 1;
pipeline.VALID = 0;
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

pipeline.invalidationUID_ = 0;

pipeline.invalidate = function(element, level) {
  if (element._invalidationID == undefined)
    element._invalidationID = 'i' + (pipeline.invalidationUID_++);
  pipeline.invalidElements_[element._invalidationID] = element;
  element._invalidationLevel = Math.max(element._invalidationLevel || pipeline.VALID, level);
  pipeline.pendingValidation_ = true;
  pipeline.needsPipelinePhase_();
}

pipeline.needsPipelinePhase_ = function() {
  if (!pipeline.pendingPipelinePhase_) {
    pipeline.pendingPipelinePhase_ = true;
    pipeline.enqueueMicroTask_(function() {
      pipeline.pendingPipelinePhase_ = false;
      pipeline.pipeline_();
    });
  }
}

pipeline.pipeline_ = function() {
  pipeline.pendingValidation_ |= paint.collectInvalidPaintElements_();
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
      case pipeline.STYLE_INVALID:
        style.processScroller(element);
      case pipeline.LAYOUT_INVALID:
      case pipeline.PAINT_INVALID:
        paint.paint_(element);
    }
    element._invalidationLevel = pipeline.VALID;
  }
  pipeline.invalidElements_ = {};
}

