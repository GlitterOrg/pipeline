## Glitter - Explaining CSS & Layout

*Join the [glitter-dev@chromium.org list](https://groups.google.com/a/chromium.org/forum/#!forum/glitter-dev) to follow along this lovely adventure.*

Glitter is a project to explain CSS & Layout on the web, in line with the
[Extensible Web Manifesto](http://extensiblewebmanifesto.org/). This document is
meant to describe the problems that we are trying to solve and potential
solutions to these problems.

These are by no means formal proposals, they should be seen as conversation
starters for a more extensible web platform.

By explaining CSS & Layout we believe that we should empower
developers/frameworks to create polyfills of wanted features in CSS. As an
example, new features such as regions, should be polyfill-able without having
to implement in native code.

This creates a virtuous cycle between developers, implementers, and working
groups.


### Style
##### Problem statement:
People should be able to extend css in ways that they see fit.
They should be able to add custom properties which do weird and wonderful
things.

For example:

```css
.foo {
  color: red;
  --color-filter: inverse();
}
```

The above custom property should be able to invert the computed color property
from `#F00` to `#0FF`.

Other parts of CSS which should be extensible are selectors, functions, media
queries which we don’t cover here.

##### Proposal(s):
A javascript API which allows developers to register custom properties. 

```javascript
document.registerProperty({
  name: '--color-filter',
  initial: 'inherit',
  apply: function(mutation) {
    if (mutation.value == ‘inverse()’) {
      // invertColor left as an exercise.
      mutation.rule.color = invertColor(mutation.rule.color);
    }
  },
  stable: true
});
```

We believe that this API can be implemented with a 1-shot javascript pass at the
end of the recalc style phase in the browser. Although not shown above, this API
can also handle custom properties depending on other properties, and applying
'modules' to the stylesheet so that the order of different extensions can be
controlled.


### Measure
##### Problem statement:

There is currently no way to efficiently and nicely tease out size information
of blocks and text on the web. Currently DOM nodes have to be attached somewhere
in the DOM to get size information, and multiple expensive queries to
`clientHeight` / `clientWidth` (which trigger synchronous layout) have to be
called.

##### Proposal(s):

**Measure API:** The measure API should be more powerful than `clientWidth` /
`clientHeight` as it should reveal information such as baselines, and also
potentially faster, as a full layout and paint shouldn't be triggered.

The API will probably have a 'block' mode, as well as a generator for laying out
'text' runs.

```javascript
// {sizing-info} below is probably of the form:
// {mode: {MIN_CONTENT|MAX_CONTENT|AVAILABLE|EXPLICIT}, size: {number}}

// {style-info} below is probably of the form:
// (parentNode, indexPos)|(stylesheet)

measured = measureBlock(element, {sizing-info}, {style-info});
measured.width; // The measured width.
measured.height; // The measured height.
measured.firstBaseline; // The pixel offset of the first baseline.
measured.lastBaseline; // The pixel offset of the last baseline.

sizeGenerator = measureText(text);
// Send data for the next run.
measuredRun = sizeGenerator.next({sizing-info}, {style-info});
// or measuredRun = sizeGenerator.next();
measuredRun.width;
measuredRun.height;

// Additional read-only properties exposed on a DOM element.
element.sizing.aspectRatio;
element.sizing.intrinsicWidth;
element.sizing.intrinsicHeight;
```

**Box tree API:** Expose a read-only box tree API. This would expose information
about the render tree, instead of just the DOM tree. I.e. pseudo-elements, line
boxes. This should also expose a measure API.


### Layout
##### Problem statement:

Measure provides half of the answer to layout: it lets you size and position
your children efficiently, but it doesn't let you get sized and positioned as a
child of another (built-in or custom) layout mode. A custom layout which only
uses the Measure APIs described above would only be able to be implemented in a
fixed width & height world. This is boring. We want custom layouts to work in
the middle of an animating flexbox.

You need to be able to communicate how large you want to be to your parent
during the middle of the layout phase. Which is currently not possible on the
web.

##### Proposal(s):
We need a "computation engine" which runs in the middle of layout. The reason
for this is that you need to pass information back up the render tree. It cannot
be performed asynchronously or within a 1-shot javascript pass. There are a few
ways which we could implement this “computation engine”.

**EDSL:** This is akin to the WebAudio API, that you build of a declarative
representation of the computation that you want to perform and then run it
inline with layout. I.e.

```javascript
element.onLayout = new Layout(new Sum([new MeasureChild(c1), new MeasureChild(c2)]));
```

This would return the size of the two children as the size of the parent. It'd
also need to position the children. N.B. Above is just an example of a possible
API, we don't really know what we’ll actually need to build of the pipeline yet.

**FastJS:** Perform layout computations in JS. We believe that we can create a
JS context with an ability to execute author code fast inline with layout. This
JS code would have a limited API to mangle with (I.e. the JS couldn't remove DOM
nodes). We would just provide a readonly version of the "DOM".

This approach could also expose just a tree with Node#measure & Node#position
functions. Information (such as style, and attributes) would be passed to the JS
fragment in a pre-step (which has access to the real DOM) as JSON.

**MultiDimensionalPants:** Basically, maintain CSS layout code in JS as well as
C++. Once the engine hits a custom layout, switch to using the JS impls of
built-in layouts for the rest of that subtree, so you don’t pay switching costs
as often. As an extension, we can provide 'safe' variants of the C++ layout
primitives that can be called from JS, to make JS layout more efficient.
Essentially, if it's too expensive to run JS in the middle of C++ layout, why
not run C++ in the middle of JS layout instead?


### Painting
##### Problem statement:

Developers should be able to perform crazy painting functions and override
behaviour where necessary. There a couple of litmus use cases for this.
* Custom 3D shadows. Instead of hacking around with the DOM, 3D Shadows could
have be implemented as direct draw calls.
* Efficient infinite lists. Minimal DOM for
new effects (for example Android 5.0 overscroll effect). Instead of creating
lots of nested DOM to create effects, we could simply paint instead.

##### Proposal(s):
An element API which exposes a "canvas" which records paint commands. For
example:

```javascript
element.paint.onBackground = function(canvas) {
  canvas.drawImage(pony); // An amazing background.
  super.onBackground(canvas);
};

element.paint.onContent = function(canvas) {
  // element may have many children, we only want to draw 3.
  for (var i = 4; i < 7; i++) {
    element.children[i].draw(canvas);
  }
  canvas.drawRect();
};
```

Roughly, one overridable method per draw phase from CSS2.1 Appendix E. The
"canvas" object exposes the 2d canvas API, but rather than writing to a pixel
backing store, just builds up a command buffer for later execution by the
rendering pipeline. This should allow us to batch up JS paint calls, rather than
interleaving custom-painting elements with their normal-painting siblings, and
just weave their command lists together afterwards.

We believe that this API can be done without performance or security
implications.
