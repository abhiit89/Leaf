var assert = require("assert"),
	sinon = require("sinon"),
	Promise = require("bluebird"),
	base = require("./base.test");
require("../setup");

var fs = Promise.promisifyAll(require("fs"));
var repositories = require("../../data/repositories");
var mapper = require("../../data/mapping/mapper");
var mustache = require("mustache");
var emailer = require("../../email/emailer");
var csprng = require("csprng");
var crypto = require("crypto");
var config = require("../../config");
var mongoose = require("mongoose");
var hash = require("../../authentication/hash");
var emailer = require("../../email/emailer");
var baseController = require("../../controllers/baseController");

var sut = require("../../controllers/users");

describe("users", function() {
	describe("get /users", function () {
		it("should set get /users route", function () {
			var app = { get: sinon.stub(), post: sinon.stub() };
			sut(app);
			assert(app.get.calledWith("/users", sinon.match.func));
		});

		it("should call base.view with 'public/views/users.html'", function () {
			var view = sinon.stub(baseController, "view");
			return base.testRoute({
				verb: "get",
				route: "/users",
				sut: sut,
				assert: function () {
					assert(view.calledWith("public/views/users.html", sinon.match.any));
					view.restore();
				}
			});
		});
	});

	describe("get /users/list", function() {
		it("should set get /users/list route", function() {
			var app = { get: sinon.stub(), post: sinon.stub() };
			sut(app);
			assert(app.get.calledWith("/users/list", sinon.match.func));
		});

		it("should get issues filtered by project id", function() {
			var projectId = "the project id";
			return _run({
				assert: function(result) {
					assert(result.stubs.getIssues.calledWith(projectId));
				}
			});
		});

		it("should get users sorted by name ascending", function() {
			return _run({
				assert: function(result) {
					assert(result.stubs.getUsers.calledWith(null, { sort: { name: 1 }}));
				}
			});
		});

		it("should map users", function() {
			var users = [{ name: "blah" }];
			return _run({
				users: users,
				assert: function(result) {
					assert(result.stubs.mapAll.calledWith("user", "user-summary-view-model", users));
				}
			})
		});

		it("should send 200", function() {
			return _run({
				assert: function(result) {
					assert(result.response.send.calledWith(sinon.match.any, 200));
				}
			});
		});

		it("should send mapped users", function() {
			var users = ["a mapped user"];
			return _run({
				mapped: users,
				assert: function(result) {
					assert(result.response.send.calledWith(users, sinon.match.any));
				}
			});
		});

		it("should send 500 when an error occurs", function() {
			return _run({
				mapAll: sinon.stub(mapper, "mapAll").rejects(new Error("oh noes!")),
				assert: function(result) {
					assert(result.response.send.calledWith(sinon.match.any, 500));
				}
			});
		});

		it("should set developer and tester issue count", function() {
			var userId = "the user id";
			var users = [{ _id: userId }];
			var issueCounts = {};
			issueCounts[userId] = { developer: 10, tester: 20 };
			return _run({
				users: users,
				mapped: [{ name: "blah", id: userId }],
				issueCounts: issueCounts,
				assert: function(result) {
					assert(result.response.send.calledWith([{ name: "blah", id: userId, developerIssueCount: 10, testerIssueCount: 20 }], 200));
				}
			});
		});

		it("should get user permissions using ids from given users", function() {
			var users = [{ _id: "first" }, { _id: "second" }];
			return _run({
				users: users,
				assert: function(result) {
					assert(result.stubs.getUserPermissions.calledWith({ user: { $in: ["first", "second"]}}))
				}
			});
		});

		it("should set permissions for each user", function() {
			var users = [{ _id: "first" }, { _id: "second" }];
			var permissions = [
				{ user: "first", permission: "first permission" },
				{ user: "first", permission: "second permission" },
				{ user: "second", permission: "third permission" },
				{ user: "second", permission: "fourth permission" }
			];
			return _run({
				users: users,
				userPermissions: permissions,
				assert: function(result) {
					assert(result.stubs.mapAll.calledWith(sinon.match.any, sinon.match.any, [
						{ _id: "first", permissions: [{ permission: "first permission", user: "first" }, { permission: "second permission", user: "first" }] },
						{ _id: "second", permissions: [{ permission: "third permission", user: "second" }, { permission: "fourth permission", user: "second" }] }
					]));
				}
			});
		});

		function _run(params) {
			params = params || {};
			return base.testRoute({
				sut: sut,
				verb: "get",
				route: "/users/list",
				env: params.env,
				request: {
					project: { _id: params.projectId || "the project id" }
				},
				stubs: {
					getIssues: sinon.stub(repositories.Issue, "issueCountsPerUser").resolves(params.issueCounts || []),
					getUsers: sinon.stub(repositories.User, "get").resolves(params.users || []),
					mapAll: params.mapAll || sinon.stub(mapper, "mapAll").resolves(params.mapped || []),
					mustache: sinon.stub(mustache, "render").returns(params.rendered || "the rendered html"),
					getUserPermissions: sinon.stub(repositories.UserPermission, "get").resolves(params.userPermissions || [])
				},
				assert: params.assert
			});
		}
	});

	describe("get /users/profile", function() {
		it("should set get /users/profile route", function () {
			var app = { get: sinon.stub(), post: sinon.stub() };
			sut(app);
			assert(app.get.calledWith("/users/profile", sinon.match.func));
		});

		it("should call base.view with 'public/views/profile.html'", function() {
			var view = sinon.stub(baseController, "view");
			return base.testRoute({
				verb: "get",
				route: "/users/profile",
				sut: sut,
				stubs: { base: view },
				assert: function(result) {
					assert(view.calledWith("public/views/profile.html", sinon.match.any));
				}
			})
		});

		it("should call base.view with response", function() {
			var view = sinon.stub(baseController, "view");
			return base.testRoute({
				verb: "get",
				route: "/users/profile",
				sut: sut,
				stubs: { base: view },
				assert: function(result) {
					assert(view.calledWith(sinon.match.any, result.response));
				}
			})
		});
	});

	describe("post /users/profile", function() {
		it("should set post /users/profile route", function () {
			var app = { get: sinon.stub(), post: sinon.stub() };
			sut(app);
			assert(app.post.calledWith("/users/profile", sinon.match.func));
		});

		it("should map user from request.body", function() {
			var body = { name: "the incoming user's name" };
			return _run({
				body: body,
				assert: function(result) {
					assert(result.stubs.mapper.calledWith("user-view-model", "user", body));
				}
			});
		});

		it("should save mapped user", function() {
			var mapped = { name: "the mapped name" };
			return _run({
				mapped: mapped,
				assert: function(result) {
					assert(result.stubs.save.calledWith(mapped));
				}
			});
		});

		it("should send 200", function() {
			return _run({
				assert: function(result) {
					assert(result.response.send.calledWith(200));
				}
			});
		});

		it("should send 500 with error", function() {
			return _run({
				mapper: sinon.stub(mapper, "map").rejects(new Error("oh noes!")),
				assert: function(result) {
					assert(result.response.send.calledWith(sinon.match.any, 500));
				}
			});
		});

		it("should not generate new password when no password is given", function() {
			var mapped = { name: "the mapped name", password: undefined };
			return _run({
				mapped: mapped,
				assert: function(result) {
					assert(result.stubs.hash.notCalled);
				}
			});
		});

		it("should generate new salt when password is given", function() {
			return _run({
				password: "not undefined",
				assert: function(result) {
					assert(result.stubs.csprng.calledWith(sinon.match.any, 512, 36));
				}
			});
		});

		it("should generate new password when password is given", function() {
			var salt = "the salt", password = "secret password";
			return _run({
				salt: salt,
				password: password,
				assert: function(result) {
					assert(result.stubs.hash.calledWith(sinon.match.any, salt + password));
				}
			});
		});

		it("should save user with generated password when password is given", function() {
			var salt = "the salt", password = "secret password", hash = "the hash";
			return _run({
				salt: salt,
				password: password,
				hash: hash,
				assert: function(result) {
					assert(result.stubs.save.calledWith({ salt: salt, password: hash }));
				}
			});
		});

		function _run(params) {
			params = params || {};
			return base.testRoute({
				sut: sut,
				verb: "post",
				route: "/users/profile",
				request: {
					project: {
						name: params.projectName,
						_id: params.projectId || "the project id"
					},
					body: params.body || {
						password: params.password,
						name: "the name",
						emailAddress: "blah@blah.com"
					}
				},
				stubs: {
					mapper: params.mapper || sinon.stub(mapper, "map").resolves(params.mapped || {}),
					csprng: params.csprng || sinon.stub(csprng, "call").returns(params.salt || "the salt"),
					hash: sinon.stub(hash, "call").returns(params.hash || "the hash"),
					save: sinon.stub(repositories.User, "save").resolves()
				},
				assert: params.assert
			});
		}
	});

	describe("post /users/create", function() {
		it("should set post /users/create route", function() {
			var app = { get: sinon.stub(), post: sinon.stub() };
			sut(app);
			assert(app.post.calledWith("/users/create", sinon.match.func));
		});

		it("should send 400 with missing name", function() {
			_run({
				body: {
					emailAddress: "the email address"
				},
				assert: function(result) {
					assert(result.response.send.calledWith("The name is required.", 400));
				}
			});
		});

		it("should send 400 with empty name", function() {
			_run({
				body: {
					name: "",
					emailAddress: "the email address"
				},
				assert: function(result) {
					assert(result.response.send.calledWith("The name is required.", 400));
				}
			});
		});

		it("should send 400 with missing email address", function() {
			_run({
				body: {
					name: "the name"
				},
				assert: function(result) {
					assert(result.response.send.calledWith("The email address is required.", 400));
				}
			});
		});

		it("should send 400 with empty email address", function() {
			_run({
				body: {
					name: "the name",
					emailAddress: ""
				},
				assert: function(result) {
					assert(result.response.send.calledWith("The email address is required.", 400));
				}
			});
		});

		it("should send 400 with invalid email address", function() {
			_run({
				body: {
					name: "the name",
					emailAddress: "faasdfasf"
				},
				assert: function(result) {
					assert(result.response.send.calledWith("The email address is invalid.", 400));
				}
			});
		});

		it("should generate activation token", function() {
			return _run({
				assert: function(result) {
					assert(result.stubs.csprng.calledWith(sinon.match.any, 128, 36));
				}
			});
		});

		it("should map user-view-model to user", function() {
			var name = "the name", email = "blah@blah.com";
			return _run({
				body: {
					name: name,
					emailAddress: email
				},
				assert: function(result) {
					assert(result.stubs.mapper.calledWith("user-view-model", "user", { name: name, emailAddress: email }));
				}
			});
		});

		it("should create new user id", function() {
			return _run({
				assert: function(result) {
					assert(result.stubs.objectId.calledWith());
				}
			});
		});

		it("should create new user", function() {
			var mapped = { name: "blah!" };
			return _run({
				mapped: mapped,
				assert: function(result) {
					assert(result.stubs.createUser.calledWith(mapped));
				}
			});
		});

		it("should send email", function() {
			var project = "the project name", domain = "http://the-domain.com", token = "the-token", name = "the name", emailAddress = "boo@blah.com";
			var user = { name: name, emailAddress: emailAddress, projectName: project, activationUrl: domain + "/users/activate/" + token };
			return _run({
				body: {
					name: name,
					emailAddress: emailAddress
				},
				domain: domain,
				token: token,
				projectName: "the project name",
				assert: function(result) {
					assert(result.stubs.email.calledWith(process.cwd() + "/email/templates/newUser.html", { user: user }, user.emailAddress, "Welcome to Leaf!"));
				}
			});
		});

		it("should send created user id", function() {
			var id = "the id";
			return({
				id: id,
				assert: function(result) {
					assert(result.response.send.calledWith(id, sinon.match.any));
				}
			});
		});

		it("should send 200", function() {
			return({
				assert: function(result) {
					assert(result.response.send.calledWith(sinon.match.any, 200));
				}
			});
		});

		it("should send 500 on error", function() {
			return _run({
				projectName: "blah",
				csprng: sinon.stub(csprng, "call").throws(new Error("oh noes!")),
				assert: function(result) {
					assert(result.response.send.calledWith(sinon.match.any, 500));
				}
			});
		});

		function _run(params) {
			params = params || {};
			return base.testRoute({
				sut: sut,
				verb: "post",
				route: "/users/create",
				request: {
					project: {
						name: params.projectName,
						_id: params.projectId || "the project id"
					},
					body: params.body || {
						name: "the name",
						emailAddress: "blah@blah.com"
					}
				},
				stubs: {
					csprng: params.csprng || sinon.stub(csprng, "call").returns(params.token || "the token"),
					mapper: sinon.stub(mapper, "map").resolves(params.mapped || {}),
					createUser: sinon.stub(repositories.User, "create").resolves(),
					email: sinon.stub(emailer, "send").resolves(),
					objectId: sinon.stub(mongoose.Types, "ObjectId").returns(params.id || "the id"),
					config: sinon.stub(config, "call").returns(params.domain || "the domain")
				},
				assert: params.assert
			});
		}
	});

	describe("post /users/edit", function() {
		it("should set post /users/edit route", function() {
			var app = { get: sinon.stub(), post: sinon.stub() };
			sut(app);
			assert(app.post.calledWith("/users/edit", sinon.match.func));
		});

		it("should send 400 with missing name", function() {
			_run({
				body: {
					emailAddress: "the email address"
				},
				assert: function(result) {
					assert(result.response.send.calledWith("The name is required.", 400));
				}
			});
		});

		it("should send 400 with empty name", function() {
			_run({
				body: {
					name: "",
					emailAddress: "the email address"
				},
				assert: function(result) {
					assert(result.response.send.calledWith("The name is required.", 400));
				}
			});
		});

		it("should send 400 with missing email address", function() {
			_run({
				body: {
					name: "the name"
				},
				assert: function(result) {
					assert(result.response.send.calledWith("The email address is required.", 400));
				}
			});
		});

		it("should send 400 with empty email address", function() {
			_run({
				body: {
					name: "the name",
					emailAddress: ""
				},
				assert: function(result) {
					assert(result.response.send.calledWith("The email address is required.", 400));
				}
			});
		});

		it("should send 400 with invalid email address", function() {
			_run({
				body: {
					name: "the name",
					emailAddress: "faasdfasf"
				},
				assert: function(result) {
					assert(result.response.send.calledWith("The email address is invalid.", 400));
				}
			});
		});

		it("should map from 'user-view-model' to 'user'", function() {
			var body = { name: "the name", emailAddress: "email@blah.com" };
			return _run({
				body: body,
				assert: function(result) {
					assert(result.stubs.mapper.calledWith("user-summary-view-model", "user", body));
				}
			});
		});

		it("should update user with name and email address set from request.body", function() {
			var body = { name: "the new name", emailAddress: "email@new.com" }, retrieved = { name: "the old name", phone: "the phone number" };
			return _run({
				user: retrieved,
				body: body,
				assert: function(result) {
					assert(result.stubs.userUpdate.calledWith({ name: body.name, emailAddress: body.emailAddress, phone: retrieved.phone }));
				}
			});
		});

		it("should update developer names for affected issues", function() {
			var body = { name: "the new name", emailAddress: "blah@blah.com" };
			var retrieved = { name: "the old name" };
			var projectId = "the project id to filter with";
			return _run({
				body: body,
				user: retrieved,
				projectId: projectId,
				assert: function(result) {
					assert(result.stubs.issueSave.calledWith({ developer: "the new name" }, { project: projectId, developer: "the old name" }));
				}
			});
		});

		it("should update tester names for affected issues", function() {
			var body = { name: "the new name", emailAddress: "blah@blah.com" };
			var retrieved = { name: "the old name" };
			var projectId = "the project id to filter with";
			return _run({
				body: body,
				user: retrieved,
				projectId: projectId,
				assert: function(result) {
					assert(result.stubs.issueSave.calledWith({ tester: "the new name" }, { project: projectId, tester: "the old name" }));
				}
			});
		});

		it("should send 200", function() {
			return _run({
				assert: function(result) {
					assert(result.response.send.calledWith(200));
				}
			});
		});

		it("should send 500 on error", function() {
			return _run({
				userOne: sinon.stub(repositories.User, "one").rejects(new Error("oh noes!")),
				assert: function(result) {
					assert(result.response.send.calledWith(sinon.match.any, 500));
				}
			});
		});

		it("should not update issues if retrieved and given names are the same", function() {
			var body = { name: "the name", emailAddress: "blah@blah.com" };
			var retrieved = { name: "the name" };
			var projectId = "the project id to filter with";
			return _run({
				body: body,
				user: retrieved,
				projectId: projectId,
				assert: function(result) {
					assert(result.stubs.issueSave.notCalled);
				}
			});
		});

		function _run(params) {
			params = params || {};
			return base.testRoute({
				sut: sut,
				verb: "post",
				route: "/users/edit",
				request: {
					project: {
						name: params.projectName,
						_id: params.projectId || "the project id"
					},
					body: params.body || {
						name: "the name",
						emailAddress: "blah@blah.com"
					}
				},
				stubs: {
					mapper: sinon.stub(mapper, "map").resolves(params.mapped || {}),
					userOne: params.userOne || sinon.stub(repositories.User, "one").resolves(params.user || {}),
					issueSave: sinon.stub(repositories.Issue, "save").resolves(),
					userUpdate: sinon.stub(repositories.User, "update").resolves()
				},
				assert: params.assert
			});
		}
	});

	describe("post /users/delete", function() {
		it("should set post /users/delete route", function() {
			var app = { get: sinon.stub(), post: sinon.stub() };
			sut(app);
			assert(app.post.calledWith("/users/delete", sinon.match.func));
		});

		it("should send 400 with missing id", function() {
			_run({
				idMissing: true,
				assert: function(result) {
					assert(result.response.send.calledWith("Unable to delete user; no ID was provided.", 400));
				}
			});
		});

		it("should call remove with the given id", function() {
			var id = "the id";
			return _run({
				id: id,
				assert: function(result) {
					assert(result.stubs.remove.calledWith(id));
				}
			});
		});

		it("should send 200 on success", function() {
			return _run({
				assert: function(result) {
					assert(result.response.send.calledWith(200));
				}
			});
		});

		it("should send 500 on failure", function() {
			return _run({
				remove: sinon.stub(repositories.User, "remove").rejects(new Error("oh noes!")),
				assert: function(result) {
					assert(result.response.send.calledWith(sinon.match.any, 500));
				}
			});
		});

		it("should not call remove when no id is found", function() {
			_run({
				idMissing: true,
				assert: function(result) {
					assert(result.stubs.remove.notCalled);
				}
			});
		});

		function _run(params) {
			params || {};
			return base.testRoute({
				sut: sut,
				verb: "post",
				route: "/users/delete",
				request: {
					body: {
						id: params.idMissing ? undefined : params.id || "the id"
					}
				},
				stubs: {
					remove: params.remove || sinon.stub(repositories.User, "remove").resolves()
				},
				assert: params.assert
			});
		}
	});

	describe("post /users/undelete", function() {
		it("should set post /users/undelete route", function() {
			var app = { get: sinon.stub(), post: sinon.stub() };
			sut(app);
			assert(app.post.calledWith("/users/undelete", sinon.match.func));
		});

		it("should send 400 with missing id", function() {
			_run({
				idMissing: true,
				assert: function(result) {
					assert(result.response.send.calledWith("Unable to restore user; no ID was provided.", 400));
				}
			});
		});

		it("should call remove with the given id", function() {
			var id = "the id";
			return _run({
				id: id,
				assert: function(result) {
					assert(result.stubs.restore.calledWith(id));
				}
			});
		});

		it("should send 200 on success", function() {
			return _run({
				assert: function(result) {
					assert(result.response.send.calledWith(200));
				}
			});
		});

		it("should send 500 on failure", function() {
			return _run({
				restore: sinon.stub(repositories.User, "restore").rejects(new Error("oh noes!")),
				assert: function(result) {
					assert(result.response.send.calledWith(sinon.match.any, 500));
				}
			});
		});

		it("should not call remove when no id is found", function() {
			_run({
				idMissing: true,
				assert: function(result) {
					assert(result.stubs.restore.notCalled);
				}
			});
		});

		function _run(params) {
			params || {};
			return base.testRoute({
				sut: sut,
				verb: "post",
				route: "/users/undelete",
				request: {
					body: {
						id: params.idMissing ? undefined : params.id || "the id"
					}
				},
				stubs: {
					restore: params.restore || sinon.stub(repositories.User, "restore").resolves()
				},
				assert: params.assert
			});
		}
	});

	describe("post /users/change-password", function() {
		it("should set post /users/change-password route", function() {
			var app = { get: sinon.stub(), post: sinon.stub() };
			sut(app);
			assert(app.post.calledWith("/users/change-password", sinon.match.func));
		});

		it("should send 400 with missing current password", function() {
			_run({
				password: "the password",
				confirmed: "the confirmed password",
				assert: function(result) {
					assert(result.response.send.calledWith("The current password is missing.", 400));
				}
			});
		});

		it("should send 400 with missing new password", function() {
			_run({
				current: "the current password",
				confirmed: "the confirmed password",
				assert: function(result) {
					assert(result.response.send.calledWith("The new password is missing.", 400));
				}
			});
		});

		it("should send 400 with missing confirmed password", function() {
			_run({
				current: "the current password",
				password: "the password",
				assert: function(result) {
					assert(result.response.send.calledWith("The confirmed password is missing.", 400));
				}
			});
		});

		it("should send 400 when new and confirmed passwords don't match", function() {
			_run({
				current: "the current password",
				password: "the password",
				confirmed: "the confirmed password",
				assert: function(result) {
					assert(result.response.send.calledWith("The new and confirmed passwords don't match.", 400));
				}
			});
		});

		it("should send 400 when given current password doesn't match stored current password", function() {
			_run({
				current: "the current password",
				password: "the password",
				confirmed: "the password",
				hash: "the hash",
				assert: function(result) {
					assert(result.response.send.calledWith("The current password is incorrect.", 400));
				}
			});
		});

		it("should calculate hash using salt and given current password", function() {
			_run({
				current: "the current password",
				password: "the password",
				confirmed: "the password",
				salt: "the salt",
				stored: "the stored password",
				hash: "the hash",
				assert: function(result) {
					assert(result.stubs.update.calledWith("the saltthe current password"));
				}
			});
		});

		it("should calculate hash using algorithm read from config", function() {
			_run({
				current: "the current password",
				password: "the password",
				confirmed: "the password",
				salt: "the salt",
				stored: "the stored password",
				hash: "the hash",
				algorithm: "the algorithm",
				assert: function(result) {
					assert(result.stubs.crypto.calledWith("the algorithm"));
				}
			});
		});

		it("should calculate hash using a hex digest", function() {
			_run({
				current: "the current password",
				password: "the password",
				confirmed: "the password",
				salt: "the salt",
				stored: "the stored password",
				hash: "the hash",
				algorithm: "the algorithm",
				assert: function(result) {
					assert(result.stubs.digest.calledWith("hex"));
				}
			});
		});

		it("should send 200", function() {
			return _run({
				current: "the current password",
				password: "the password",
				confirmed: "the password",
				salt: "the salt",
				stored: "the stored password",
				hash: "the stored password",
				algorithm: "the algorithm",
				assert: function(result) {
					assert(result.response.send.calledWith(200));
				}
			});
		});

		it("should send 500 on error", function() {
			return _run({
				userUpdate: sinon.stub(repositories.User, "update").rejects(new Error("oh noes!")),
				current: "the current password",
				password: "the password",
				confirmed: "the password",
				salt: "the salt",
				stored: "the stored password",
				hash: "the stored password",
				algorithm: "the algorithm",
				assert: function(result) {
					assert(result.response.send.calledWith(sinon.match.any, 500));
				}
			});
		});

		function _run(params) {
			params || {};

			var stubs = {};
			stubs.config = sinon.stub(config, "call").returns(params.algorithm || "the hash algorithm");
			stubs.crypto = sinon.stub(crypto, "createHash").returns({ update: stubs.update = sinon.stub().returns({ digest: stubs.digest = sinon.stub().returns(params.hash) }) });
			stubs.userUpdate = params.userUpdate || sinon.stub(repositories.User, "update").resolves();
			return base.testRoute({
				sut: sut,
				verb: "post",
				route: "/users/change-password",
				request: {
					body: {
						current: params.current,
						password: params.password,
						confirmed: params.confirmed
					},
					user: {
						password: params.stored,
						salt: params.salt
					}
				},
				stubs: stubs,
				assert: params.assert
			});
		}
	});

	describe("post /users/reset-password", function() {
		it("should set post /users/change-password route", function () {
			var app = { get: sinon.stub(), post: sinon.stub() };
			sut(app);
			assert(app.post.calledWith("/users/reset-password", sinon.match.func, sinon.match.func, sinon.match.func));
		});

		it("should retrieve user using user id given in request.body", function() {
			var userId = "the user id from request.body";
			return _run({
				userId: userId,
				assert: function(result) {
					assert(result.stubs.userOne.calledWith({ _id: userId }));
				}
			});
		});

		it("should update user", function() {
			return _run({
				assert: function(result) {
					assert(result.stubs.userUpdate.calledOnce);
				}
			});
		});

		it("should generate new password token", function() {
			return _run({
				assert: function(result) {
					assert(result.stubs.csprng.calledWith(sinon.match.any, 128, 36));
				}
			});
		});

		it("should update user with new password token set", function() {
			var user = { name: "the user's name" }, token = "the new password token";
			return _run({
				user: user,
				assert: function(result) {
					assert(result.stubs.userUpdate.calledWith({ name: "the user's name", newPasswordToken: token }));
				}
			});
		});

		it("should send email with the reset password template", function() {
			return _run({
				assert: function(result) {
					assert(result.stubs.email.calledWith(process.cwd() + "/email/templates/resetPassword.html", sinon.match.any, sinon.match.any, sinon.match.any));
				}
			});
		});

		it("should send email with the user's name", function() {
			var user = { name: "the user's name" };
			return _run({
				user: user,
				assert: function(result) {
					assert(result.stubs.email.calledWith(sinon.match.any, {
						name: user.name,
						url: sinon.match.any
					}, sinon.match.any, sinon.match.any));
				}
			});
		});

		it("should send email with the correct url", function() {
			var protocol = "the protocol", host = "the host", port = 1234, token = "the token";
			return _run({
				protocol: protocol,
				host: host,
				port: port,
				newPasswordToken: token,
				assert: function(result) {
					assert(result.stubs.email.calledWith(sinon.match.any, {
						name: sinon.match.any,
						url: protocol + "://" + host + ":" + port + "/#/new-password/" + token
					}, sinon.match.any, sinon.match.any));
				}
			});
		});

		it("should send email with the correct url for the production environment", function() {
			var protocol = "the protocol", host = "the host", token = "the token";
			return _run({
				env: "production",
				protocol: protocol,
				host: host,
				newPasswordToken: token,
				assert: function(result) {
					assert(result.stubs.email.calledWith(sinon.match.any, {
						name: sinon.match.any,
						url: protocol + "://" + host + "/#/new-password/" + token
					}, sinon.match.any, sinon.match.any));
				}
			});
		});

		it("should send email to the user's email address", function() {
			var user = { emailAddress: "the user's email address" };
			return _run({
				user: user,
				assert: function(result) {
					assert(result.stubs.email.calledWith(sinon.match.any, sinon.match.any, user.emailAddress, sinon.match.any));
				}
			});
		});

		it("should send email with 'Leaf - Reset Password' as the subject", function() {
			var user = { emailAddress: "the user's email address" };
			return _run({
				user: user,
				assert: function(result) {
					assert(result.stubs.email.calledWith(sinon.match.any, sinon.match.any, sinon.match.any, "Leaf - Reset Password"));
				}
			});
		});

		it("should send 200", function() {
			return _run({
				assert: function(result) {
					assert(result.response.send.calledWith(200));
				}
			});
		});

		it("should send 500 on error", function() {
			return _run({
				userOne: sinon.stub(repositories.User, "one").rejects(new Error("oh noes!")),
				assert: function(result) {
					assert(result.response.send.calledWith(sinon.match.any, 500));
				}
			});
		});

		function _run(params) {
			params || {};

			var stubs = {};
			stubs.userOne = params.userOne || sinon.stub(repositories.User, "one").resolves(params.user || {});
			stubs.userUpdate = params.userUpdate || sinon.stub(repositories.User, "update").resolves();
			stubs.csprng = params.csprng || sinon.stub(csprng, "call").returns(params.newPasswordToken || "the new password token");
			stubs.email = params.email || sinon.stub(emailer, "send").resolves();
			stubs.config = params.config || sinon.stub(config, "call").returns(params.port || 8080);
			return base.testRoute({
				sut: sut,
				verb: "post",
				route: "/users/reset-password",
				app: {
					settings: { env: params.env || "development" }
				},
				request: {
					protocol: params.protocol || "http",
					host: params.host || "localhost",
					body: {
						current: params.current || "the current password",
						password: params.password || "the new password",
						confirmed: params.confirmed || "the new password",
						userId: params.userId
					},
					user: {
						password: params.stored,
						salt: params.salt
					}
				},
				stubs: stubs,
				assert: params.assert
			});
		}
	});
});
