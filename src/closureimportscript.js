(function() {

  var startsWith = function(str, prefix) {
    return str.lastIndexOf(prefix, 0) == 0;
  };

  // from goog.path.dirname
  var dirname = function(path) {
    var i = path.lastIndexOf('/') + 1;
    var head = path.slice(0, i);
    // If the path isn't all forward slashes, trim the trailing slashes.
    if (!/^\/+$/.test(head)) {
      head = head.replace(/\/+$/, '');
    }
    return head;
  };

  // from goog.path.normalizePath
  var normalizePath = function(path) {
    if (path == '') {
      return '.';
    }

    var initialSlashes = '';
    // POSIX will keep two slashes, but three or more will be collapsed to one.
    if (startsWith(path, '/')) {
      initialSlashes = '/';
      if (startsWith(path, '//') && !startsWith(path, '///')) {
        initialSlashes = '//';
      }
    }

    var parts = path.split('/');
    var newParts = [];

    for (var i = 0; i < parts.length; i++) {
      var part = parts[i];

      // '' and '.' don't change the directory, ignore.
      if (part == '' || part == '.') {
        continue;
      }

      // A '..' should pop a directory unless this is not an absolute path and
      // we're at the root, or we've travelled upwards relatively in the last
      // iteration.
      if (part != '..' || (!initialSlashes && !newParts.length) ||
          newParts[newParts.length - 1] == '..') {
        newParts.push(part);
      } else {
        newParts.pop();
      }
    }

    var returnPath = initialSlashes + newParts.join('/');
    return returnPath || '.';
  };

  // write a script tag with inline source.
  var writeScriptTag = function(text) {
    var el = document.createElement('script');
    el.type = 'text/javascript';
    el.text = text;
    document.getElementsByTagName('head')[0].appendChild(el);
  };

  window.CLOSURE_IMPORT_SCRIPT = function(src, opt_sourceText) {
    // Being asked to just run some source in a script tag.
    if (src.length > 0) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', src, false);
      xhr.send('');  // synchronous!

      // Adding sourceURL will make the script appear as if it has been loaded
      // from netowrk in the chrome devtools script sources. Debug points, etc
      // persist across page refreshes.
      writeScriptTag(
          xhr.responseText + '\n//# sourceURL=' + window.location.origin +
          normalizePath(dirname(window.location.pathname) + '/' + src));

      return true;
    } else if (opt_sourceText) {
      writeScriptTag(opt_sourceText);
      return true;
    }

    return false;
  };

  window.CLOSURE_BASE_PATH =
      '../bower_components/closure-library/closure/goog/';

})();
