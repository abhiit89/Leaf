﻿
(function(root) {

	root.user = ko.observable();
	root.loading = ko.observable(false);

	root.edit = function (user) {
		root.user(user);
		IssueTracker.Dialog.load("edit-user-template", root);
	};

	root.save = function () {
		root.loading(true);
		$.post(IssueTracker.virtualDirectory() + "Users/Edit", root.user()).done(function() {
			IssueTracker.Feedback.success(root.user().name + " has been saved.");
		}).fail(function () {
			IssueTracker.Feedback.error("An error has occurred while editing the user. Please try again later.");
		}).always(function() {
			root.loading(false);
		});
	};

	root.cancel = function() {
		IssueTracker.Dialog.hide();
	};

})(root("IssueTracker.Users.EditUser"));