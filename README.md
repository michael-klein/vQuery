![AVA](logo.png)
# vQuery
> virtual DOM goodness for everyone
vQuery is a library that aims to enable more developers to speed up their code base with virtual DOM diffing and DOM patching.

It implements a subset of the jQuery API, but executes all manipulations on a virtual DOM and only updates the real DOM with a patch generated from the state of the virtual DOM whenever vQuery.update is called (either manually or at set intervals).

This can significantly reduce the number of real DOM manipulations needed to render a view to the browser, thus thus also eliminating unneeded repaints and reflows.
