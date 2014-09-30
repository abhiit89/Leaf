IssueTracker.app.controller("users", function($scope, authentication, users) {
	authentication.check();
	users.load($scope);
});

IssueTracker.app.factory("users", function(userRepository, feedback, usersResetPassword, usersDeleteUser, usersRestoreUser, usersEditUser, usersUserPermissions) {
	return {
		load: function(scope) {
			scope.resetPassword = usersResetPassword.init();
			scope.deleteUser = usersDeleteUser.init();
			scope.restoreUser = usersRestoreUser.init();
			scope.editUser = usersEditUser.init();
			scope.userPermissions = usersUserPermissions.init();

			_getUsers(scope);
		}
	};

	function _getUsers(scope) {
		scope.loading = true;
		userRepository.summaries().then(function(users) {
			scope.users = users;
			scope.deleteUser.users(users);
			scope.restoreUser.users(users);
			scope.editUser.users(users);
		}).catch(function() {
			feedback.error("An error has occurred while retrieving the user list. Please try again later.");
		}).finally(function() {
			scope.loading = false;
		});
	}
});