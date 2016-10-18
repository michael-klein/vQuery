![AVA](logo.png)
# vQuery
> virtual DOM goodness for everyone

vQuery is an isomorphic library that aims to enable more developers to speed up their code base with virtual DOM diffing and DOM patching.

It implements a subset of the jQuery API, but executes all manipulations on a virtual DOM and only updates the real DOM with a patch generated from the state of the virtual DOM whenever vQuery.update is called (either manually or at set intervals).

This can significantly reduce the number of real DOM manipulations needed to render a view to the browser, thus thus also eliminating unneeded repaints and reflows.

Furthermore, vQuery also works in the node.js environment. You can load HTML documents, manipulate them and retrieve the new output - or a patch (that you might send to the browser).

**WARNING: This library is very much still a work in progress and in no way ready for production use!**


## Example:

```javascript
$(function () { //wait for page to finish loading
    $('body') //select the body element
        .append("<div>Hello World!</div>"); //append a child div
    $.update(); //computes a DOM patch and applies it to the real DOM
}, {
    autoUpdate: false //disable auto patching of the DOM
});
```

## Options
You can supply vQuery with an options object as the second argument:


```javascript
$(function () {...}, 
    {
        autoUpdate: true, //Should the DOM automatically be patched in intervals (using window.requestAnimationFrame)? Default: true
        updateInterval: 1 //The time between each auto-patch in milliseconds. Default: 1
    }
);
```

# Licence
**MIT License**

Copyright (c) 2016 Michael Klein

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
