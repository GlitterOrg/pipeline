

/** @param {string} src */
window.CLOSURE_IMPORT_SCRIPT = function(src) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', src, false);
  xhr.send(''); // synchronous!

  var el = document.createElement('script');
  el.type = 'text/javascript';
  el.text = xhr.responseText;
  document.getElementsByTagName('head')[0].appendChild(el);
};


/** @type {string} */
window.CLOSURE_BASE_PATH = '../bower_components/closure-library/closure/goog/';
