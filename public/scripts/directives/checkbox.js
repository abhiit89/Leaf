IssueTracker.app.directive("checkbox", function($sce) {
	return {
		restrict: "E",
		templateUrl: "templates/checkbox.html",
		transclude: true,
		scope: {
			checked: "=",
			readonly: "@"
		},
		link: function(scope) {
			scope.showing = false;

			scope.toggle = function() {
				if (scope.readonly !== undefined)
					return;

				scope.checked = !scope.checked;
			};

			scope.showModal = function (event) {
				scope.showing = event ? $(event.target).offset() : true;
			};

			scope.hideModal = function () {
				scope.showing = false;
			};
		}
	};
});