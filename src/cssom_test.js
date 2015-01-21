goog.provide('cssom_test');

goog.require('cssom');
goog.require('goog.testing.jsunit');

function testCollapseSelector() {
  checkCollapseSelector('*');
  checkCollapseSelector('LI');
  checkCollapseSelector('UL LI');
  checkCollapseSelector('UL OL+LI');
  checkCollapseSelector('H1 + *[REL=up]');
  checkCollapseSelector('UL OL LI.red');
  checkCollapseSelector('LI.red.level');
  checkCollapseSelector('#x34y');
  checkCollapseSelector('#s12:not(FOO)');
}

function testEmptyStylesheet() {
  var stylesheet = cssom.parse('');
  assertEquals(0, stylesheet.cssRules.length);
}

function testSingleRuleStylesheet() {
  var stylesheet =
      cssom.parse('.foo { bar: red; bar-quix: blue; -webkit-bar-quix: blue;}');
  assertEquals(1, stylesheet.cssRules.length);

  assertEquals('.foo', stylesheet.cssRules[0].selectorText);
  checkStyle({'bar': 'red', 'barQuix': 'blue', 'webkitBarQuix': 'blue'},
             stylesheet.cssRules[0].style);
}

function testMultiRuleStylesheet() {
  var stylesheet =
      cssom.parse('.foo { bar: red !important; -o-bar: red !important; }' +
                  '.quix { size: calc(11px + 50%); }');

  assertEquals(2, stylesheet.cssRules.length);

  assertEquals('.foo', stylesheet.cssRules[0].selectorText);
  checkStyle({'bar': 'red !important', 'oBar': 'red !important'},
             stylesheet.cssRules[0].style);

  assertEquals('.quix', stylesheet.cssRules[1].selectorText);
  checkStyle({'size': 'calc(11px + 50%)'}, stylesheet.cssRules[1].style);
}

function checkCollapseSelector(selector) {
  var stylesheet = parseAStylesheet(selector + ' {}');
  assertEquals(selector, cssom.collapseTokens(stylesheet.value[0].prelude));
}

function checkStyle(expected, styleDecl) {
  for (var prop in expected) {
    var split = expected[prop].split(' !');
    assertEquals(split[0], styleDecl[prop]);
    if (goog.isDef(split[1])) {
      assertEquals(split[1], styleDecl.getPropertyPriority(prop));
    }
  }
}
