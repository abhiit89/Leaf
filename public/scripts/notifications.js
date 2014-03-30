(function(root) {

	var NOTIFICATION_LOAD_INTERVAL = 60000;
    var ANIMATION_SPEED = 350;
    var HEADER_HEIGHT = 60;

    var _container;
    var _trigger;

	root.loading = ko.observable(false);
	root.notifications = ko.observableArray();

    root.init = function(container) {
        _container = container;
        _trigger = $("#notifications");
		_loadNotifications();

		setInterval(_loadNotifications, NOTIFICATION_LOAD_INTERVAL);

		_trigger.on("click", _show);

        $(document).on("click", function (e) {
            var itemClicked = _wasNotificationClicked($(e.target));
            if (!_container.is(":hidden") && !itemClicked)
                _hide();
        });
    };

	root.navigateToIssue = function(issueNumber) {
		alert(issueNumber);
	};

	function _show() {
        _container.css({ top: "-" + (_container.outerHeight()-HEADER_HEIGHT) + "px" }).transition({ y: _container.outerHeight() });
	}

    function _hide() {
        _container.transition({ y: 0 }, ANIMATION_SPEED, "ease");
    }

    function _wasNotificationClicked(context) {
        for (var i = 0; i < _trigger.length; i++) {
            if ($(_trigger[i]).attr("id") == context.attr("id") || context.parents().filter("#" + $(_trigger[i]).attr("id")).length > 0)
                return true;
        }
        return false;
    }

	function _loadNotifications() {
		root.loading(true);
        $.ajax({
            url: IssueTracker.virtualDirectory() + "notifications",
            global: false
        }).done(function(notifications) {
			root.notifications.removeAll();
			for (var i = 0; i < notifications.length; i++)
				root.notifications.push(IssueTracker.Utilities.createPropertyObservables(notifications[i]));
            _setIconHeights();
		}).fail(function() {
			IssueTracker.Feedback.error("An error has occurred while retrieving your notifications. Please contact technical support.");
		}).always(function() {
			root.loading(false);
		});
	}

    function _setIconHeights() {
        _container.find("i.fa-angle-right").each(function() {
            var height = $(this).parent().height();
            $(this).css({ "line-height": height + "px", "height" : height + "px" });
        });
    }

})(root("IssueTracker.Notifications"));