var exec = require('child_process').exec,
    fs = require('fs');
function execute(command) {
    exec(command, function (error, stdout, stderr) {
        if (error) {
            console.error(error);
            return;
        }
    });
};

execute("jdi src/*.js");
var marked = require('marked'),
    renderer = new marked.Renderer();

marked.setOptions({
  highlight: function (code) {
    return require('highlight.js').highlightAuto(code).value;
  },
  renderer: renderer,
  gfm: true,
  tables: true,
  breaks: false,
  pedantic: false,
  sanitize: true,
  smartLists: true,
  smartypants: false
});
setTimeout(function() {
    var files = fs.readdirSync('./src');
    for (var i=0; i<files.length; i++) {
        // Write a trailer at eof. 
        if (files[i].indexOf('.md') === -1)
            continue;
        var fileName = files[i].replace('.js.md', "");
        //execute("markdown-html ./src/" + files[i] + " -o ./documentation/" + fileName +".html -s ./documentation/style.css");
        //fs.writeFileSync("./documentation/" + fileName +".html", marked(fs.readFileSync("./src/" + files[i]).toString()));
        execute("ghmd --dest ./documentation/" + fileName + ".html ./src/" + files[i]);
    }
},1500);

execute("browserify src/test.js -o dist/test.js");
execute("browserify src/index.js -o dist/index.js");