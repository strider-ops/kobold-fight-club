(function() {
	"use strict";

	angular.module("app").directive("fileSelect", FileSelect);

	/**
	 * Bridges <input type="file"> to an expression, which ng-model cannot do in
	 * AngularJS 1.x. Usage:
	 *
	 *     <input type="file" file-select="importFile($file)">
	 */
	function FileSelect() {
		return {
			restrict: "A",
			scope: { fileSelect: "&" },
			link: function (scope, element) {
				element.on("change", function (event) {
					var file = event.target.files && event.target.files[0];

					scope.fileSelect({ $file: file });

					// Clear the input so picking the same file again still fires change.
					element.val(null);
				});
			},
		};
	}
})();
