var fs = require("fs");
var authenticate = require("../authentication/authenticate");
var models = require("../data/models");
var mapper = require("../data/mapper");
var repositories = require("../data/repositories");
var mustache = require("mustache");
var Promise = require("bluebird");
var mongoose = require("mongoose");
var formidable = require("formidable");
var storage = require("../storage/storage");
var notificationEmailer = require("../email/notificationEmailer");

module.exports = function(app) {
	app.get("/issues", authenticate, function(request, response) {
		return fs.readFileAsync("public/views/issues.html").then(function(content) {
			response.send(content);
		}).catch(function(e) {
			response.send("Error while reading issues view: " + e, 500);
		});
	});

	app.get("/issues/list", authenticate, function(request, response) {
		var start = parseInt(request.query.start);
		if (isNaN(start))
			start = 1;
		var end = parseInt(request.query.end);
		if (isNaN(end))
			end = 50;

		return repositories.Issue.search({
			priorities: request.query.priorities.split(","),
			statuses: request.query.statuses.split(","),
			developers: request.query.developers.split(","),
			testers: request.query.testers.split(","),
			milestones: request.query.milestones.split(","),
			types: request.query.types.split(",")
		}, request.query.direction, request.query.comparer, start, end).then(function(issues) {
			response.send(mapper.mapAll("issue", "issue-view-model", issues), 200);
			return issues;
		}).catch(function(e) {
			response.send("Error retrieving issues: " + e, 500);
		});
	});

	app.get("/issues/details", authenticate, function(request, response) {
		var projectId = request.query.projectId, html, issue;
		return Promise.all([
			fs.readFileAsync("public/views/issueDetails.html"),
			repositories.Issue.number(request.query.projectId, request.query.number)
		]).spread(function(h, i) {
			if (!i) {
				response.send(404);
				return;
			}

			html = h;
			issue = i;
			return Promise.all([repositories.Transition.status(issue.statusId), repositories.Comment.issue(issue._id), repositories.IssueFile.issue(issue._id)]).spread(function(transitions, comments, files) {
				var model = mapper.map("issue", "issue-view-model", issue);
				model.transitions = mapper.mapAll("transition", "transition-view-model", transitions);
				model.history = mapper.mapAll("comment", "issue-history-view-model", comments);
				model.files = mapper.mapAll("issue-file", "issue-file-view-model", files);
				response.send(!issue ? 404 : mustache.render(html.toString(), { issue: JSON.stringify(model) }));
			});
		}).catch(function(e) {
			response.send("Error while rendering issue details for issue #" + request.query.number + ": " + e, 500);
		});
	});

	app.get("/issues/create", authenticate, function(request, response) {
		return fs.readFileAsync("public/views/createIssue.html").then(function(html) {
			response.send(mustache.render(html.toString(), {
				issueId: mongoose.Types.ObjectId()
			}));
		}).catch(function(e) {
			response.send("Error while rendering create issue: " + e, 500);
		});
	});

	app.get("/issues/download-attached-file", authenticate, function(request, response) {
		return repositories.IssueFile.details(request.query.id).then(function(file) {
			response.contentType(file.name);
			return storage.get(file.container, file.id + "-" + file.name, response);
		}).catch(function(e) {
			response.send("Error while downloading attached file: " + e, 500);
		});
	});

	app.post("/issues/update", authenticate, function(request, response) {
		var issue = mapper.map("issue-view-model", "issue", request.body);
		if (!issue) {
			response.send("Error while mapping issue.", 500);
			return;
		}
		return repositories.Issue.update(issue, request.user).then(function() {
			if (request.user._id.toString() != issue.developerId.toString()) {
				repositories.Notification.create({ type: "issue-updated", issue: issue._id, user: issue.developerId });
				repositories.User.details(issue.developerId).then(function(user) {
					if (user.emailNotificationForIssueUpdated)
						notificationEmailer.issueUpdated(user, issue);
				});
			}
		}).then(function() {
			response.send(200);
		}).catch(function(e) {
			response.send("Error while updating issue: " + e, 500);
		});
	});

	app.post("/issues/add-comment", authenticate, function(request, response) {
		var issue, comment = mapper.map("issue-history-view-model", "comment", request.body);
		comment.date = new Date();
		comment.user = request.user._id;
		repositories.Issue.details(request.body.issueId).then(function(i) {
			issue = i;
			comment.issue = issue._id;
		}).then(function() {
			return repositories.Comment.create(comment);
		}).then(function() {
			if (request.user._id.toString() != issue.developerId.toString())
            	repositories.Notification.create({ type: "comment-added", comment: comment.text, issue: issue._id, user: issue.developerId });
				repositories.User.details(issue.developerId).then(function(user) {
					if (user.emailNotificationForNewCommentForAssignedIssue)
						notificationEmailer.newComment(user, issue);
				});
        }).then(function() {
			response.send(200);
		}).catch(function(e) {
			var message = "Error adding comment: " + e;
			console.log(message);
			response.send(message, 500);
		});
	});

	app.post("/issues/create", authenticate, function(request, response) {
		var model = mapper.map("issue-view-model", "issue", request.body);
		Promise.all([
			repositories.Issue.getNextNumber(request.project),
			repositories.Milestone.details(model.milestoneId),
			repositories.Priority.details(model.priorityId),
			repositories.Status.details(model.statusId),
			repositories.User.details(model.developerId),
			repositories.User.details(model.testerId),
			repositories.IssueType.details(model.typeId)
		]).spread(function(number, milestone, priority, status, developer, tester, type) {
			model.number = number;
			model.milestone = milestone.name;
			model.priority = priority.name;
			model.priorityOrder = priority.order;
			model.status = status.name;
			model.statusOrder = status.order;
			model.developer = developer.name;
			model.tester = tester.name;
			model.type = type.name;
			model.opened = new Date();
			model.updated = new Date();
			model.updatedBy = request.user._id;
			model.project = request.project._id;
			return repositories.Issue.create(model);
        }).then(function(issue) {
			if (request.user._id.toString() != issue.developerId.toString()) {
				repositories.Notification.create({ type: "issue-assigned", issue: issue._id, user: issue.developerId });
				repositories.User.details(issue.developerId).then(function(user) {
					if (user.emailNotificationForIssueAssigned)
						notificationEmailer.issueAssigned(user, issue);
				});
			}
		}).then(function() {
			response.send(200);
		}).catch(function(e) {
			var message = "Error while creating issue: " + e;
			console.log(message);
			response.send(message, 500);
		});
	});

	app.post("/issues/delete", authenticate, function(request, response) {
		var issue;
		repositories.Issue.details(request.body.id).then(function(i) {
			issue = i;
			return repositories.Notification.removeForIssue(issue._id);
		}).then(function() {
			return repositories.Issue.remove(request.body.id)
		}).then(function() {
			if (request.user._id.toString() != issue.developerId.toString()) {
				repositories.Notification.create({ type: "issue-deleted", issue: issue._id, user: issue.developerId });
				repositories.User.details(issue.developerId).then(function(user) {
					if (user.emailNotificationForIssueDeleted)
						notificationEmailer.issueDeleted(user, issue);
				});
			}
		}).then(function() {
			response.send(200);
		}).catch(function(e) {
			var message = "Error while deleting issue: " + e;
			console.log(e);
			response.send(message, 500);
		});
	});

	app.post("/issues/attach-file", authenticate, function(request, response) {
		var files;
		var paths;
		_readFilesFromRequest(request).then(function(f) {
			files = [];
			paths = [];
			for (var name in f) {
				files.push(storage.set(request.project._id.toString(), mongoose.Types.ObjectId().toString(), f[name].name, f[name].path, f[name].size));
				paths.push(f[name].path);
			}
			return Promise.all(files);
		}).spread(function() {
			var created = [];
			for (var i = 0; i < arguments.length; i++) {
				var curr = arguments[i];
				created.push(repositories.IssueFile.create({ _id: curr.id, name: curr.name, container: curr.container, size: curr.size, issue: request.query.issueId }));
			}
			return created;
		}).spread(function() {
			response.send(200);
			_cleanUpFiles(paths);
		}).catch(function(err) {
			var message = "Error while attaching file: " + err;
			console.log(message);
			response.send(message, 500);
			_cleanUpFiles(paths);
		});
	});

	function _readFilesFromRequest(request) {
		return new Promise(function(resolve, reject) {
			new formidable.IncomingForm().parse(request, function(err, fields, files) {
				if (err) reject(err);
				else resolve(files);
			});
		});
	}

	function _cleanUpFiles(paths) {
		for (var i = 0; i < paths.length; i++)
			fs.unlink(paths[i], function(err) {
				if (err)
					console.log("Error removing file " + paths[i] + ": " + err);
			});
	}
};