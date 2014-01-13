
(function (root) {

	var _startCount = 25;
	var _issueCountToLoad = 15;
	var _start = 0;
	var _nextIssuesRunning = false;
	var _allLoaded = false;
	var _filter;
	var _loader;

	root.list = ko.observableArray();
	
	root.filter = ko.observable("");

	root.priorityFilterModel = {
		priorities: ko.observableArray(),
		selectedPriority: ko.observable()
	};
	
	root.statusFilterModel = {
		statuses: ko.observableArray(),
		selectedStatus: ko.observable()
	};

	root.assigneeFilterModel = {
		assignees: ko.observableArray(),
		selectedAssignee: ko.observable()
	};

	root.ownerFilterModel = {
		owners: ko.observableArray(),
		selectedOwner: ko.observable()
	};

	root.sortModel = {
		direction: ko.observable("descending"),
		comparer: ko.observable("priority")
	};

	root.load = function (container) {
		root.priorityFilterModel.priorities(IssueTracker.priorities());
		root.statusFilterModel.statuses(IssueTracker.statuses());
		root.assigneeFilterModel.assignees(IssueTracker.users());
		root.ownerFilterModel.owners(IssueTracker.users());

		_loader = container.find("table tfoot");
		_setupFilter(container);
		_setupLoadingMoreIssues();
		_getNextIssues(_startCount);
		_hookupEvents(container);
	};

	function _hookupEvents(container) {
		container.find("#priority-filter").click(function() {
			var popupContainer = IssueTracker.Popup.load({ view: "#priority-filter-dialog", model: root.priorityFilterModel, anchor: $(this).find(">span"), trigger: $(this) });
			popupContainer.find(">div").click(function () {
				root.priorityFilterModel.selectedPriority($(this).hasClass("selected") ? undefined : $.parseJSON($(this).attr("data-priority")));
				$(this).toggleClass("selected");
				IssueTracker.Popup.hide();
				_resetIssueList();
			});
		});
		
		container.find("#status-filter").click(function () {
			var popupContainer = IssueTracker.Popup.load({ view: "#status-filter-dialog", model: root.statusFilterModel, anchor: $(this).find(">span"), trigger: $(this) });
			popupContainer.find(">div").click(function () {
				root.statusFilterModel.selectedStatus($(this).hasClass("selected") ? undefined : $.parseJSON($(this).attr("data-status")));
				$(this).toggleClass("selected");
				IssueTracker.Popup.hide();
				_resetIssueList();
			});
		});

		container.find("#assignee-filter").click(function () {
			var popupContainer = IssueTracker.Popup.load({ view: "#assignee-filter-dialog", model: root.assigneeFilterModel, anchor: $(this).find(">span"), trigger: $(this) });
			popupContainer.find(">div").click(function () {
				root.assigneeFilterModel.selectedAssignee($(this).hasClass("selected") ? undefined : $.parseJSON($(this).attr("data-assignee")));
				$(this).toggleClass("selected");
				IssueTracker.Popup.hide();
				_resetIssueList();
			});
		});

		container.find("#owner-filter").click(function () {
			var popupContainer = IssueTracker.Popup.load({ view: "#owner-filter-dialog", model: root.ownerFilterModel, anchor: $(this).find(">span"), trigger: $(this) });
			popupContainer.find(">div").click(function () {
				root.ownerFilterModel.selectedOwner($(this).hasClass("selected") ? undefined : $.parseJSON($(this).attr("data-owner")));
				$(this).toggleClass("selected");
				IssueTracker.Popup.hide();
				_resetIssueList();
			});
		});

		container.find("#sort").click(function() {
			var popupContainer = IssueTracker.Popup.load({ view: "#sort-dialog", model: root.sortModel, anchor: $(this), trigger: $(this) });
			popupContainer.find("i:not(.selected)").click(function() {
				root.sortModel.direction($(this).attr("data-direction"));
				root.sortModel.comparer($(this).parent().attr("data-comparer"));
				IssueTracker.Popup.hide();
				_resetIssueList();
			});
		});
	}

	function _setupFilter(container) {
		_filter = container.find("div.filter");
		_filter.on("focus", "input[type='text']", function() { _filter.addClass("focus"); });
		_filter.on("blur", "input[type='text']", function () { _filter.removeClass("focus"); });
		_filter.on("click", "i", function () { _filter.find("input[type='text']").val("").keyup(); });
		_filter.click(function () { $(this).find("input").focus(); });
	}
	
	function _setupLoadingMoreIssues() {
		$(window).scroll(function () {
			if ($(window).scrollTop() + $(window).height() > $(document).height() - 200)
				_getNextIssues(_issueCountToLoad);
		});
	}
	
	function _getNextIssues(count) {
		if (_nextIssuesRunning === true || _allLoaded === true)
			return;

		_loader.show();
		_nextIssuesRunning = true;
		$.get(IssueTracker.virtualDirectory() + "Issues/Next", _buildParameters(count)).success(function(issues) {
			root.list.pushAll(issues);
			if (issues.length < count)
				_allLoaded = true;
		}).error(function() {
			alert("An error has occurred while retrieving the next set of issues. Please try again later.");
		}).complete(function() {
			_nextIssuesRunning = false;
			_loader.hide();
		});
		_start += count;
	}
	
	function _buildParameters(count) {
		return $.toDictionary({
			start: _start + 1,
			end: _start + count,
			priority: root.priorityFilterModel.selectedPriority(),
			status: root.statusFilterModel.selectedStatus(),
			assignee: root.assigneeFilterModel.selectedAssignee(),
			direction: root.sortModel.direction(),
			comparer: root.sortModel.comparer()
		});
	}
	
	function _resetIssueList() {
		_start = 0;
		_allLoaded = false;
		root.list([]);
		_getNextIssues(_startCount);
	}

	IssueTracker.Page.build({
		root: root,
		view: "Issues",
		title: "Issues",
		route: "#/issues",
		style: "issues-container"
	});

})(root("IssueTracker.Issues"));
