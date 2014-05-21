var fs = require("fs");
var models = require("../data/models");
var config = require("../config");
var mapper = require("../data/mapping/mapper");
var repositories = require("../data/repositories");
var authenticate = require("../authentication/authenticate");

var Promise = require("bluebird");

var base = Object.spawn(require("./baseController"));

module.exports = function(app) {
	app.get("/search", authenticate, function(request, response) {
		return base.view("public/views/search.html", response);
	});

	app.get("/search/query", authenticate, function (request, response) {
		var text = request.query.text;
		return Promise.all([
			_searchForIssues(text)
		]).then(function(result) {
			response.send({
				issues: result[0]
			}, 200);
		}).catch(function(e) {
			response.send(e.stack.formatStack(), 500);
		});
	});

	function _searchForIssues(text) {
		return new Promise(function(resolve, reject) {
			require("../data/models").Issue.textSearch(text, function(err, data) {
			//require("../data/models").Issue.find().or(_buildRegexProperties(text)).sort({ number: 1 }).exec(function (err, data) {
				if (err) reject(err);
				else resolve(data);
			});
		}).then(function(issues) {
			var split = text.split(" ");
			return mapper.mapAll("issue", "issue-view-model", issues).map(function(mapped) {
				return _highlightFoundValues(mapped, split);
			});
		});
	}

	function _highlightFoundValues(mapped, split) {
		for (var i = 0; i < split.length; i++) {
			var value = split[i];
			mapped.description = mapped.description.replace(new RegExp(value, "ig"), _replacer);
			mapped.details = mapped.details.replace(new RegExp(value, "ig"), _replacer);
		}
		return mapped;
	}

	function _buildRegexProperties(text) {
		var split = text.split(" "), properties = [];
		for (var i = 0; i < split.length; i++) {
			var regex = new RegExp(split[i], "i");
			properties.push({ name: regex });
			properties.push({ details: regex });
		}
		if (!isNaN(parseInt(text)))
			properties.push({ number: parseInt(text) });
		return properties;
	}

	function _replacer(match) {
		return "<b>" + match + "</b>";
	}
};