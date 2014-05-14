var assert = require("assert"),
	sinon = require("sinon"),
	Promise = require("bluebird");
require("../setup");

var sut = require("../../controllers/controllers");

describe("controllers", function() {
	describe("init", function() {
		it("should initialize the correct number of controllers", function() {
			var count = 0;
			for (var name in sut)
				if (name != "init")
					count++;

			assert.equal(count, 10);
		});

		it("should initialize root controller", function() {
			_run("root");
		});

		it("should initialize welcome controller", function() {
			_run("welcome");
		});

		it("should initialize issues controller", function() {
			_run("issues");
		});

		it("should initialize notifications controller", function() {
			_run("notifications");
		});

		it("should initialize style controller", function() {
			_run("style");
		});

		it("should initialize users controller", function() {
			_run("users");
		});

		it("should initialize search controller", function() {
			_run("search");
		});

		it("should initialize projects controller", function() {
			_run("projects");
		});

		it("should initialize milestones controller", function() {
			_run("milestones");
		});

		it("should initialize priorities controller", function() {
			_run("priorities");
		});

		function _run(controller) {
			var app = "the app";
			for (var name in sut)
				if (name != "init")
					sut[name] = sinon.stub();

			sut.init(app);

			assert(sut[controller].calledWith(app));
		}
	});
});