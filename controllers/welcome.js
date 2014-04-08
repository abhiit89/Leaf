var fs = require("fs");
var crypto = require("crypto");
var models = require("../data/models");
var config = require("../config");
var csprng = require("csprng");
var mapper = require("../data/mapper");
var repositories = require("../data/repositories");

var Promise = require("bluebird");

module.exports = function(app) {
	app.get("/welcome", function(request, response) {
		fs.readFile("public/views/welcome.html", function(err, content) {
			response.send(content);
		});
	});

	app.post("/sign-in", function(request, response) {
		var email = request.body.email;
		var password = request.body.password;
		var staySignedIn = request.body.staySignedIn == "true";

		new Promise(function(resolve, reject) {
			models.User.findOne({ emailAddress: email }).populate("project").exec(function(err, user) {
				if (err)
					reject(err);
				else
					resolve(user);
			});
		}).then(function(user) {
			if (!user) {
				response.send(404);
				return;
			}

			if (crypto.createHash(config.hashAlgorithm).update(user.salt + password).digest("hex") === user.password) {
				if (!user.session)
					user.session = csprng(512, 36);
				user.expiration = staySignedIn ? Date.now() + 1000*60*60*24*7*2 : null;
				response.cookie("session", user.session, staySignedIn ? { maxAge: 1000 * 60 * 60 * 24 * 7 * 2 } : { expires: false });
				return Promise.all([
					mapper.map("user", "user-view-model", user),
					mapper.map("project", "project-view-model", user.project)
				]).spread(function(user, project) {
					response.send({
						user: user,
						project: project
					}, 200);
					return repositories.User.update(user);
				});
			} else
				response.send(401);
		}).catch(function(e) {
			var message = "Error signing in: " + e;
			console.log(message);
			response.send(message, 500);
		});
	});
};