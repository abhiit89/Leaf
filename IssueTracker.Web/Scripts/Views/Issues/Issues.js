
(function (root) {

	var _container;
	var _filter = root.Filter;

	var _startCount = 50;
	var _issueCountToLoad = 15;
	var _start = 0;
	var _nextIssuesRunning = false;
	var _allLoaded = false;
	
	root.loading = ko.observable(true);

	root.list = ko.observableArray();
	root.selectedMilestones = ko.observableArray();
	root.selectedPriorities = ko.observableArray();
	root.selectedStatuses = ko.observableArray();
	root.selectedDevelopers = ko.observableArray();
	root.selectedTesters = ko.observableArray();
	root.search = ko.observable("");

	root.sortModel = {
		direction: ko.observable("descending"),
		comparer: ko.observable("priority")
	};

	root.init = function (container) {
		_container = container;
		_hookupEvents(container);

		container.find("#milestones-filter>div.selected").each(function() { root.selectedMilestones.push($(this).attr("data-id")); });
		container.find("#priority-filter>div.selected").each(function () { root.selectedPriorities.push($(this).attr("data-id")); });
		container.find("#status-filter>div.selected").each(function () { root.selectedStatuses.push($(this).attr("data-id")); });
		container.find("#developer-filter>div.selected").each(function () { root.selectedDevelopers.push($(this).attr("data-id")); });
		container.find("#tester-filter>div.selected").each(function () { root.selectedTesters.push($(this).attr("data-id")); });

		_setupLoadingMoreIssues();

		_filter.init(container);
	};

	root.load = function () {
		_resetIssueList();
	};

	root.reset = function () {
		_resetIssueList();
	};

	function _hookupEvents(container) {
		container.find("#sort").click(_showSorter);
		container.on("click", "#milestone-filter>div", function () { _toggleFilterItem($(this), root.selectedMilestones); });
		container.on("click", "#priority-filter>div", function () { _toggleFilterItem($(this), root.selectedPriorities); });
		container.on("click", "#status-filter>div", function () { _toggleFilterItem($(this), root.selectedStatuses); });
		container.on("click", "#developer-filter>div", function () { _toggleFilterItem($(this), root.selectedDevelopers); });
		container.on("click", "#tester-filter>div", function () { _toggleFilterItem($(this), root.selectedTesters); });
		container.on("focus", "div.search input", function () { $(this).parent().addClass("focus"); });
		container.on("blur", "div.search input", function () { $(this).parent().removeClass("focus"); });
		container.on("click", "div.search i", function () { root.search(""); });
		root.search.subscribe(_resetIssueList);
	}

	function _showSorter() {
		var popupContainer = IssueTracker.Popup.load({ view: "#sort-dialog", model: root.sortModel, anchor: $(this), trigger: $(this) });
		popupContainer.find("i:not(.selected)").click(function () {
			root.sortModel.direction($(this).attr("data-direction"));
			root.sortModel.comparer($(this).parent().attr("data-comparer"));
			IssueTracker.Popup.hide();
			_resetIssueList();
		});
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

		root.loading(true);
		_nextIssuesRunning = true;
		$.get(IssueTracker.virtualDirectory() + "Issues/Next", _buildParameters(count)).done(function (issues) {
			root.list([]);
			root.list.pushAll(issues);
			_setPriorityBarHeights();
			if (issues.length < count)
				_allLoaded = true;
		}).fail(function () {
			IssueTracker.Feedback.error("An error has occurred while retrieving the next set of issues. Please try again later.");
		}).always(function() {
			_nextIssuesRunning = false;
			root.loading(false);
		});
		_start += count;
	}

	function _setPriorityBarHeights() {
		_container.find("div.priority.unset").each(function() {
			var bar = $(this).removeClass("unset");
			var tile = bar.closest("a.tile");
			bar.height(tile.removeClass("hidden").height());
		});
	}
	
	function _buildParameters(count) {
		return $.toDictionary({
			start: _start + 1,
			end: _start + count,
			project: IssueTracker.selectedProject(),
			direction: root.sortModel.direction(),
			comparer: root.sortModel.comparer(),
			filter: root.search(),
			milestones: root.selectedMilestones().join(","),
			priorities: root.selectedPriorities().join(","),
			statuses: root.selectedStatuses().join(","),
			developers: root.selectedDevelopers().join(","),
			testers: root.selectedTesters().join(",")
		});
	}
	
	function _resetIssueList() {
		_start = 0;
		_allLoaded = false;
		_getNextIssues(_startCount);
	}

	function _toggleFilterItem(element, collection) {
		if (element.parent().find(">.selected").length == 1 && element.hasClass("selected"))
			return;
		element.toggleClass("selected");
		if (element.hasClass("selected"))
			collection.push(element.attr("data-id"));
		else
			collection.remove(element.attr("data-id"));
	}

	IssueTracker.Page.build({
		root: root,
		view: "Issues",
		title: "Issues",
		route: "#/:project-name/issues",
		style: "issues-container"
	});

})(root("IssueTracker.Issues"));
