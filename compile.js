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
execute("browserify src/test.js -o dist/test.js");
execute("browserify src/index.js -o dist/index.js");