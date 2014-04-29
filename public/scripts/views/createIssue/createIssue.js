
(function(root) {

	var _container;

	root.loading = ko.observable(false);

	root.createModel = {
		id: function() { return root.issueId; },
		description: ko.observable(""),
		details: ko.observable(""),
		priorityId: function () { return _getSelectedFromChoiceTile($("div.priority")); },
		statusId: function () { return _getSelectedFromChoiceTile($("div.status")); },
		typeId: function() { return _getSelectedFromChoiceTile($("div.type")); },
		developerId: function () { return _getSelectedFromChoiceTile($("div.developer")); },
		testerId: function () { return _getSelectedFromChoiceTile($("div.tester")); },
		milestoneId: function () { return _getSelectedFromChoiceTile($("div.milestone")); }
	};

	root.init = function (container) {
		_container = container;
		_container = container;

		_hookupEvents();

		root.Upload.init(_container);
	};

	root.load = function() {
		root.createModel.description("");
		root.createModel.details("");

		_setDefaultValues();

		_container.find("input.tile.container").focus();
		root.Upload.load(root.createModel.id());
	};

	function _hookupEvents() {
		_container.on("click", "div.choice-tile>div", _toggleSelectedChoice);
		_container.on("click", "#save", _save);
		_container.on("click", "#discard", _discard);
	}

	function _discard() {
		IssueTracker.Issues.navigate();
	}

	function _save() {
		var error = _validate();
		if (error) {
			IssueTracker.Feedback.error(error);
			return;
		}

		_submit();
	}

	function _validate() {
		var model = root.createModel;
		if (model.description() == "")
			return "The description is required.";
		if (!model.priorityId())
			return "The priority is required.";
		if (!model.statusId())
			return "The status is required.";
		if (!model.typeId())
			return "The type is required.";
		if (!model.developerId())
			return "The developer is required.";
		if (!model.testerId())
			return "The tester is required.";
		if (!model.milestoneId())
			return "The milestone is required.";
	}

	function _submit() {
		root.loading(true);
		$.when(root.Upload.upload(), _send()).then(function() {
			IssueTracker.Feedback.success("Your issue has been created.");
			IssueTracker.Issues.navigate();
			IssueTracker.Notifications.refresh();
		}).fail(function() {
			IssueTracker.Feedback.error("An error has occurred while creating your issue. Please try again later.");
		}).always(function() {
			root.loading(false);
		});
	}

	function _send() {
		return $.post(IssueTracker.virtualDirectory() + "issues/create", IssueTracker.Utilities.extractPropertyObservableValues(root.createModel));
	}

	function _toggleSelectedChoice() {
		$(this).closest("div.choice-tile").find(">div.selected").removeClass("selected");
		$(this).addClass("selected");
	}

	function _getSelectedFromChoiceTile(tile) {
		return tile.find("div.selected").attr("data-id");
	}

	function _setDefaultValues() {
		_container.find("div.detailed-info-container>div.milestone>div>div:first").addClass("selected");
		_container.find("div.detailed-info-container>div.priority>div>div:first").addClass("selected");
		_container.find("div.detailed-info-container>div.status>div>div:first").addClass("selected");
		_container.find("div.detailed-info-container>div.type>div>div:first").addClass("selected");

		var signedInUserId = IssueTracker.signedInUser().id();
		_container.find("div.detailed-info-container>div.developer>div>div[data-id='" + signedInUserId + "']").addClass("selected");
		_container.find("div.detailed-info-container>div.tester>div>div[data-id='" + signedInUserId + "']").addClass("selected");
	}

	$(function() {
		IssueTracker.Page.build({
			root: root,
			view: "issues/create",
			title: "Leaf - Create Issue",
			route: "#/new-issue",
			style: "create-issue-container"
		});
	});

})(root("IssueTracker.CreateIssue"));