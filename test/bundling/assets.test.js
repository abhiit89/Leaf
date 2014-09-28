var assert = require("assert"),
	sinon = require("sinon"),
	Promise = require("bluebird");
require("../setup");

var sut = require("../../bundling/assets");

describe("assets", function() {
	describe("scripts", function() {
		it("should list all required scripts", function() {
			var required = [
				"./public/scripts/thirdParty/jquery.autogrow-textarea.js",
				"./public/scripts/global.js",
				"./public/scripts/page.js",
				"./public/scripts/utilities.js",
				"./public/scripts/controllers",
				"./public/scripts/directives",
				"./public/scripts/services",
				"./public/scripts/extensions",
				"./public/scripts/init.js"
			];

			var scripts = sut.scripts();

			assert(scripts.length == required.length);
			for (var i = 0; i < scripts.length; i++)
				assert(scripts[i] == required[i]);
		});
	});

	describe("styles", function() {
		it("should list all required styles", function() {
			var required = [
				"./public/css/variables.less",
				"./public/css/mixins.less",
				"./public/css/global.less",
				"./public/css/fonts.css",
				"./public/css/scroll.less",
				"./public/css/animation.less",
				"./public/css/directives",
				"./public/css/controls",
				"./public/css/partials",
				"./public/css/templates",
				"./public/css/views",
				"./public/css/thirdParty"
			];

			var styles = sut.styles();

			assert(styles.length == required.length);
			for (var i = 0; i < styles.length; i++)
				assert(styles[i] == required[i]);
		});
	});
});