var fs = require("fs");
var authenticate = require("../authentication/authenticate");
var models = require("../data/models");
var mapper = require("../data/mapping/mapper");
var repositories = require("../data/repositories");
var mustache = require("mustache");
var Promise = require("bluebird");
var mongoose = require("mongoose");
var formidable = require("formidable");
var storage = require("../storage/storage");
var notificationEmailer = require("../email/notificationEmailer");
var moment = require("moment");
var config = require("../config");

module.exports = function(app) {
	app.get("/issues", authenticate, function(request, response) {
		return fs.readFileAsync("public/views/issues.html").then(function(content) {
			response.send(content);
		}).catch(function(e) {
			response.send(e.stack.formatStack(), 500);
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
			return mapper.mapAll("issue", "issue-view-model", issues);
		}).then(function (mapped) {
			response.send(mapped, 200);
		}).catch(function(e) {
			response.send(e.stack.formatStack(), 500);
		});
	});

	app.get("/issues/details", authenticate, function(request, response) {
		var html, issue;
		return Promise.all([
			fs.readFileAsync("public/views/issueDetails.html"),
			repositories.Issue.number(request.query.projectId, parseInt(request.query.number))
		]).spread(function(html, issue) {
			if (!issue) {
				response.send(404);
				return;
			}

			return Promise.all([
				repositories.Transition.status(issue.statusId),
				repositories.Comment.issue(issue._id, { populate: "user", sort: { date: -1 }}),
				repositories.IssueFile.issue(issue._id)
			]).spread(function(transitions, comments, files) {
				return Promise.all([
					mapper.map("issue", "issue-view-model", issue),
					mapper.mapAll("transition", "transition-view-model", transitions),
					mapper.mapAll("comment", "issue-history-view-model", comments),
					mapper.mapAll("issue-file", "issue-file-view-model", files)
				]);
			}).spread(function(issue, transitions, comments, files) {
				var model = issue;
				model.transitions = transitions;
				model.history = comments;
				model.files = files;
				response.send(mustache.render(html.toString(), { issue: JSON.stringify(model) }));
			});
		}).catch(function(e) {
			response.send(e.stack.formatStack(), 500);
		});
	});

	app.get("/issues/create", authenticate, function(request, response) {
		return fs.readFileAsync("public/views/createIssue.html").then(function(html) {
			response.send(mustache.render(html.toString(), {
				issueId: mongoose.Types.ObjectId()
			}));
		}).catch(function(e) {
			response.send(e.stack.formatStack(), 500);
		});
	});

	app.get("/issues/download-attached-file", authenticate, function(request, response) {
		return repositories.IssueFile.details(request.query.id).then(function(file) {
			response.contentType(file.name);
			return storage.get(file.container, file.id + "-" + file.name, response);
		}).catch(function(e) {
			response.send(e.stack.formatStack(), 500);
		});
	});

	app.post("/issues/update", authenticate, function(request, response) {
		return mapper.map("issue-view-model", "issue", request.body).then(function(issue) {
			return repositories.Issue.update(issue, request.user).then(function () {
				if (request.user._id.toString() != issue.developerId.toString()) {
					return Promise.all([
						repositories.User.details(issue.developerId),
						repositories.Notification.create({ type: "issue-updated", issue: issue._id, user: issue.developerId })
					]).spread(function (user) {
						if (user.emailNotificationForIssueUpdated)
							return notificationEmailer.issueUpdated(user, issue);
					});
				}
			});
		}).then(function () {
			response.send(200);
		}).catch(function (e) {
			response.send(e.stack.formatStack(), 500);
		});
	});

	app.post("/issues/add-comment", authenticate, function(request, response) {
		return mapper.map("issue-history-view-model", "comment", request.body).then(function(comment) {
			comment.date = request.body.date = Date.now();
			comment.user = request.body.userId = request.user._id;
			request.body.user = request.user.name;
			return repositories.Issue.details(request.body.issueId).then(function (issue) {
				comment.issue = issue._id;
				return repositories.Comment.create(comment).then(function (created) {
					request.body.id = created._id;
					if (request.user._id.toString() != issue.developerId.toString())
						return repositories.User.details(issue.developerId).then(function (user) {
							if (user.emailNotificationForNewCommentForAssignedIssue)
								return notificationEmailer.newComment(user, issue, comment.text);
						}).then(function() {
							return repositories.Notification.create({ type: "comment-added", comment: comment.text, issue: issue._id, user: issue.developerId });
						});
				});
			});
		}).then(function () {
			request.body.date = moment.call(this, request.body.date).format(config.call(this, "dateTimeFormat"));
			response.send(request.body, 200);
		}).catch(function (e) {
			response.send(e.stack.formatStack(), 500);
		});
	});

	app.post("/issues/delete-comment", authenticate, function(request, response) {
		return repositories.Comment.remove(request.body.comment.id).then(function() {
			response.send(200);
		}).catch(function(e) {
			response.send(e.stack.formatStack(), 500);
		});
	});

	app.post("/issues/create", authenticate, function(request, response) {
		return mapper.map("issue-view-model", "issue", request.body).then(function(model) {
			return Promise.all([
				repositories.Issue.getNextNumber(request.project),
				repositories.Milestone.details(model.milestoneId),
				repositories.Priority.details(model.priorityId),
				repositories.Status.details(model.statusId),
				repositories.User.details(model.developerId),
				repositories.User.details(model.testerId),
				repositories.IssueType.details(model.typeId)
			]).spread(function (number, milestone, priority, status, developer, tester, type) {
				model.number = number;
				model.milestone = milestone.name;
				model.priority = priority.name;
				model.priorityOrder = priority.order;
				model.status = status.name;
				model.statusOrder = status.order;
				model.developer = developer.name;
				model.tester = tester.name;
				model.type = type.name;
				model.opened = Date.now();
				model.updated = Date.now();
				model.updatedBy = request.user._id;
				model.project = request.project._id;
				return repositories.Issue.create(model);
			});
		}).then(function (issue) {
			return repositories.User.details(issue.developerId).then(function(user) {
				if (request.user._id.toString() != issue.developerId.toString())
					return repositories.Notification.create({ type: "issue-assigned", issue: issue._id, user: issue.developerId }).then(function () {
						if (user.emailNotificationForIssueAssigned)
							return notificationEmailer.issueAssigned(user, issue);
					});
			});
		}).then(function () {
			response.send(200);
		}).catch(function (e) {
			response.send(e.stack.formatStack(), 500);
		});
	});

	app.post("/issues/delete", authenticate, function(request, response) {
		var issue;
		return Promise.all([
			repositories.Issue.details(request.body.id),
			repositories.Issue.remove(request.body.id),
			repositories.Notification.removeForIssue(request.body.id)
		]).spread(function(issue) {
			if (request.user._id.toString() != issue.developerId.toString()) {
				return Promise.all([
					repositories.User.details(issue.developerId),
					repositories.Notification.create({ type: "issue-deleted", issue: issue._id, user: issue.developerId })
				]).spread(function (user) {
					if (user.emailNotificationForIssueDeleted)
						return notificationEmailer.issueDeleted(user, issue);
				});
			}
		}).then(function () {
			response.send(200);
		}).catch(function (e) {
			response.send(e.stack.formatStack(), 500);
		});
	});

	app.post("/issues/attach-file", authenticate, function(request, response) {
		var files = [];
		var paths = [];
		return _readFilesFromRequest(request).then(function(f) {
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
			return _cleanUpFiles(paths);
		}).catch(function(e) {
			response.send(e.stack.formatStack(), 500);
		});
	});

	function _readFilesFromRequest(request) {
		return new Promise(function(resolve, reject) {
			new formidable.IncomingForm().parse(request, function(err, fields, files) {
				if (err) reject(new Error(err));
				else resolve(files);
			});
		});
	}

	function _cleanUpFiles(paths) {
		var unlinks = [];
		for (var i = 0; i < paths.length; i++)
			unlinks.push(fs.unlinkAsync(paths[i]));
		return Promise.all(unlinks);
	}
};