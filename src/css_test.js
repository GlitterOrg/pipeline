goog.provide('css_test');

goog.require('css');
goog.require('goog.testing.jsunit');

function testSelectorSpecificity() {
  checkSpecificity('* {}', 0, 0, 0);
  checkSpecificity('LI {}', 0, 0, 1);
  checkSpecificity('UL LI {}', 0, 0, 2);
  checkSpecificity('UL OL+LI {}', 0, 0, 3);
  checkSpecificity('H1 + *[REL=up] {}', 0, 1, 1);
  checkSpecificity('UL OL LI.red {}', 0, 1, 3);
  checkSpecificity('LI.red.level {}', 0, 2, 1);
  checkSpecificity('#x34y {}', 1, 0, 0);
  checkSpecificity('#s12:not(FOO) {}', 1, 0, 1);
}

function testMatchesSelectorSpecificity() {
  var el = document.createElement('div');

  el.classList.add('bar');
  checkSpecificity('.foo :matches(.bar, #baz) {}', 0, 2, 0, el);

  el.id = 'baz';
  checkSpecificity('.foo :matches(.bar, #baz) {}', 1, 1, 0, el);

  el.classList.remove('bar');
  checkSpecificity('.foo :matches(.bar, #baz) {}', 1, 1, 0, el);

  el.classList.add('bar');
  el.classList.add('quix');
  checkSpecificity('.foo :matches(.bar.quix, .baz) {}', 0, 3, 0, el);
}

function testRuleOrdering() {
  var el = document.createElement('div');
  el.id = 'id';
  el.className = 'foo bar quix';

  // Div matches all rules.
  checkRuleOrdering(el, '.foo {} .bar {} #id{} .quix{}',
                    ['.foo', '.bar', '.quix', '#id']);

  // TODO add moar tests.
}

function checkSpecificity(rule, a, b, c, opt_el) {
  var el = opt_el || document.createElement('div');
  var stylesheet = parseAStylesheet(rule);
  assertEquals((a << 16) | (b << 8) | c,
               css.calcSpecificity_(stylesheet.value[0].prelude, el));
}

function checkRuleOrdering(el, styleStr, expected) {
  var stylesheet = cssom.parse(styleStr);
  var result = css.findRules_(stylesheet, el);
  var resultSelectors =
      result.map(function(rule) { return rule.selectorText; });

  assertArrayEquals(expected, resultSelectors);
}
