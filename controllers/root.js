var Promise = require("bluebird");

var mongoose = require("mongoose");
var fs = Promise.promisifyAll(require("fs"));
var mustache = require("mustache");
var models = require("../data/models");
var mapper = require("../data/mapper");
var repositories = require("../data/repositories");

module.exports = function(app) {
	app.get("/", function(request, response) {
		Promise.all([
			fs.readFileAsync("public/views/root.html"),
			repositories.Priority.all(),
			repositories.Status.all(),
			models.User.findAsync(),
			models.Transition.findAsync(),
			models.Project.findAsync(),
			models.Milestone.findAsync(),
			models.IssueType.findAsync(),
			_getSignedInUser(request)
		]).spread(function(html, priorities, statuses, users, transitions, projects, milestones, issueTypes, user) {
			response.send(mustache.render(html.toString(), {
				priorities: JSON.stringify(mapper.mapAll("priority", "priority-view-model", priorities)),
				statuses: JSON.stringify(mapper.mapAll("status", "status-view-model", statuses)),
				users: JSON.stringify(mapper.mapAll("user", "user-view-model", users)),
				transitions: JSON.stringify(mapper.mapAll("transition", "transition-view-model", transitions)),
				projects: JSON.stringify(mapper.mapAll("project", "project-view-model", projects)),
				milestones: JSON.stringify(mapper.mapAll("milestone", "milestone-view-model", milestones)),
				issueTypes: JSON.stringify(mapper.mapAll("issue-type", "issue-type-view-model", issueTypes)),
				signedInUser: JSON.stringify(mapper.map("user", "user-view-model", !user || (user.expiration != null && user.expiration < Date.now()) ? null : user)),
				selectedProject: JSON.stringify(mapper.map("project", "project-view-model", user ? user.project : null))
			}));
		}).catch(function(e) {
			response.send("Error loading root: " + e, 500);
		});
	});
};

function _getSignedInUser(request) {
	return new Promise(function(resolve, reject) {
		if (!request.cookies.session)
			resolve(null);

		var blah = 1;
		models.User.find(function(err, users) {
			blah = 2;
		});

		models.User.findOne({ session: request.cookies.session }).populate("project").exec(function(err, user) {
			if (err) reject(err);
			else resolve(user);
		});
	})
}