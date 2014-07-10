var assert = require("assert"),
	sinon = require("sinon"),
	Promise = require("bluebird");
require("../../setup");

var repositories = require("../../../data/repositories");
var sut = require("../../../data/caches/priorityCache");

describe("priorityCache", function() {
	describe("construction", function() {
		it("should build baseCache with Priority repository", function() {
			assert.equal(sut.repository, repositories.Priority);
		});

		it("should build baseCache with sort set to order descending", function() {
			assert.equal(sut.sort.order, -1);
		});
	});
});