var _bundler = require("./../bundling/bundler");

exports.style = function(request, response) {
    _bundler.bundleCss("./css", false, function(css) {
        response.writeHead(200, { "Content-Type": "text/css" });
        response.write(css);
        response.end();
    });
};

exports.scripts = function(request, response) {
    _bundler.bundleScripts("./scripts", false, function(script) {
        response.writeHead(200, { "Content-Type": "text/javascript" });
        response.write(script);
        response.end();
    });
};