(function() {
'use strict';

	angular
		.module('app')
		.controller('SearchController', SearchController);

	SearchController.$inject = ["$scope", "metaInfo", "sources", "library", "homebrew"];

	function SearchController($scope, metaInfo, sources, library, homebrew) {
		var vm = this;

		vm.alignments = metaInfo.alignments;
		vm.crList = metaInfo.crList;
		vm.environments = metaInfo.environments;
		vm.sizes = metaInfo.sizes;
		vm.sourceNames = sources.all;
		vm.types = metaInfo.types;
		vm.legendaryList = metaInfo.legendaryList;
		vm.encounters = library.encounters;
		vm.sortChoices = metaInfo.sortChoices;

		// Cache sorted data to avoid infinite digest
		var contentCacheKey;
		var contentCache;

		/**
		 * Lists the content packs the database was built with. This used to enumerate
		 * live Google Sheets, each with an ID, a last-updated timestamp and a link to
		 * the spreadsheet; none of those exist any more. Adding your own content returns
		 * in Phase 4 as a local file import — see MIGRATION-PLAN.md.
		 */
		$scope.getContent = function () {
			var cacheKey = sources.all.join("|");

			if ( contentCacheKey !== cacheKey ) {
				contentCacheKey = cacheKey;

				// Imported packs are listed separately in the modal, so leave them out
				// here rather than showing them twice.
				var homebrewNames = sources.sourcesByType["Homebrew"] || [];

				contentCache = sources.all
					.filter(function (name) { return homebrewNames.indexOf(name) === -1; })
					.map(function (name) {
						return {
							name: name,
							shortName: sources.shortNames[name],
						};
					});
			}

			return contentCache;
		};

		// ── Imported homebrew ────────────────────────────────────────────────
		$scope.imported = homebrew.packs;
		$scope.importResult = null;

		/**
		 * Called by the file-input directive. The file is read and parsed here in the
		 * browser; nothing is uploaded.
		 */
		$scope.importFile = function (file) {
			if ( !file ) {
				return;
			}

			var reader = new FileReader();

			reader.onload = function () {
				$scope.$apply(function () {
					$scope.importResult = homebrew.importText(file.name, reader.result);
				});
			};

			reader.onerror = function () {
				$scope.$apply(function () {
					$scope.importResult = {
						added: 0, skipped: 0, errors: ["Could not read that file."],
					};
				});
			};

			reader.readAsText(file);
		};

		$scope.removeImported = function (sourceName) {
			homebrew.remove(sourceName);
			$scope.importResult = null;
		};

		vm.resetFilters = resetFilters;
		vm.updateSourceFilters = updateSourceFilters;

		$scope.$on("custom-source-added", function (event, sourceName) {
			// Custom content should be enabled by default
			vm.filters.source[sourceName] = true;
		});

		function resetFilters() {
			vm.filters.size = null;
			vm.filters.type = null;
			vm.filters.alignment = null;
			vm.filters.minCr = null;
			vm.filters.maxCr = null;
			vm.filters.environment = null;
			vm.filters.legendary = null;
		}

		function updateSourceFilters({ type, enabled }) {
			sources.sourcesByType[type].forEach(name => vm.filters.source[name] = enabled);
		}

		let sourceSections = [];
		let sourceSectionKey;
		$scope.getSourceSections = function () {
			let key = sources.all.join();

			if ( key !== sourceSectionKey ) {
				sourceSectionKey = key;

				sourceSections = Object.keys(sources.sourcesByType).map(sourceType => ({
					name: sourceType,
					sources: sources.sourcesByType[sourceType].slice().sort(),
				}));

				sourceSections.sort((a, b) => {
					let aName = a.name;
					let bName = b.name;
					let aIsOfficial = aName.match(/Official/);
					let bIsOfficial = bName.match(/Official/);

					// Sort official types to the top, then sort by name
					if ( aIsOfficial && !bIsOfficial ) {
						return -1;
					} else if ( !aIsOfficial && bIsOfficial ) {
						return 1;
					} else {
						if ( aName > bName ) {
							return 1;
						} else {
							return -1;
						}
					}
				});
			}

			return sourceSections;
		}
	}
})();
