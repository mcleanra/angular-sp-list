//base class for a sharepoint list item
(function (angular) {

	'use strict';

	angular.module('angular.sp.list')
		.factory('spListItem', ['modelBuilderService', 'restQueryBuilderService',
			function (modelBuilderService, restQueryBuilderService) {

				function spListItem(siteUrl, listName, viewFields, spServicesJsonMapping) {
					this.siteUrl = siteUrl;
					this.listName = listName;
					this.viewFields = viewFields;
					this.spServicesJsonMapping = spServicesJsonMapping;

					this.getListItemType = function () {
						return "SP.Data." + this.listName.charAt(0).toUpperCase() + this.listName.split(" ").join("").slice(1) + "ListItem";
					};

					this.getSelectFields = function (expandAll) {
						return restQueryBuilderService.getSelectFields(this.spServicesJsonMapping, expandAll);
					};

					this.getExpandFields = function (expandAll) {
						return restQueryBuilderService.getExpandFields(this.spServicesJsonMapping, expandAll);
					};

					this.buildFromJson = function (ctor, data) {
						return modelBuilderService.buildFromRestResponse(ctor, data, this.spServicesJsonMapping);
					};

					this.buildFromXml = function (ctor, data) {
						return modelBuilderService.buildFromCamlResponse(ctor, data, this.spServicesJsonMapping);
					};

					this.buildListItem = function (data) {
						return modelBuilderService.convertToSharePointListItem(data, this.spServicesJsonMapping);
					};

					this.build = function (ctor, data) {
						if ($.isXMLDoc(data)) {
							return this.buildFromXml(ctor, data);
						}
						else {
							return this.buildFromJson(ctor, data);
						}
					};
				};

				return spListItem;

			}]);

})(angular);