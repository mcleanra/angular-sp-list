//base class for setting up angular services for sharepoint lists.  this provides the basic crud operations that are needed on any list

(function (angular) {

	'use strict';

	angular.module('angular.sp.list')
		.factory('spListService', ['$http', '$q', '_',
			function ($http, $q, _) {

				function spListService(spListItem) {
					this.spListItem = spListItem;

					this.getByFilter = function (filter, select) {
						return this.executeRestQuery(null, select, filter, null);
					};

					this.getByFilters = this.getByFilter;

					this.get = function () {
						return this.executeRestQuery(null, null, null, null);
					};

					this.getById = function (id) {
						return this.getByArrayOfIds([id]);
					};

					this.getByArrayOfIds = function (idArray) {
						var valueArray = [];

						_.each(idArray, function (id) {
							valueArray.push("<Value Type='Text'>" + id + "</Value>")
						});

						var query = "<Query><Where><In><FieldRef Name='ID'/><Values>" + valueArray.join('') + "</Values></In></Where></Query>";
						return this.executeCamlQuery(query);
					};

					this.create = function (item) {

						item = new spListItem(item);

						var requestHeaders = {
							"accept": "application/json;odata=verbose",
							"X-RequestDigest": window.__REQUESTDIGEST[spListItem.prototype.siteUrl],
							"content-type": "application/json;odata=verbose",
							"If-Match": "*",
							"X-HTTP-Method": "POST"
						};
						var itemType = spListItem.prototype.getListItemType();
						var data = {
							__metadata: { "type": itemType },
						};
						data = angular.extend({}, item, data);

						var requestURI = spListItem.prototype.siteUrl + "/_api/web/lists/GetByTitle('" + spListItem.prototype.listName + "')/Items";
						var requestBody = JSON.stringify(data);

						return $http({
							method: 'POST',
							url: requestURI,
							contentType: "application/json;odata=verbose",
							data: requestBody,
							headers: requestHeaders
						}).then(function (response) {
							return response.data.d;
						});
					};

					this.update = function (item) {

						item = new spListItem(item);

						var requestHeaders = {
							"accept": "application/json;odata=verbose",
							"X-RequestDigest": window.__REQUESTDIGEST[spListItem.prototype.siteUrl],
							"content-type": "application/json;odata=verbose",
							"If-Match": "*",
							"X-HTTP-Method": "MERGE"
						};
						var itemType = spListItem.prototype.getListItemType();
						var data = {
							__metadata: { "type": itemType },
						};
						data = angular.extend({}, item, data);

						var requestURI = spListItem.prototype.siteUrl + "/_api/web/lists/GetByTitle('" + spListItem.prototype.listName + "')/Items(" + item.Id + ")";
						var requestBody = JSON.stringify(data);

						return $http({
							method: 'POST',
							url: requestURI,
							contentType: "application/json;odata=verbose",
							data: requestBody,
							headers: requestHeaders
						});
					};

					this.remove = function (item) {

						item = new spListItem(item);

						var requestHeaders = {
							"accept": "application/json;odata=verbose",
							"X-RequestDigest": window.__REQUESTDIGEST[spListItem.prototype.siteUrl],
							"content-type": "application/json;odata=verbose",
							"If-Match": "*",
							"X-HTTP-Method": "DELETE"
						};
						var itemType = spListItem.prototype.getListItemType();
						var data = {
							__metadata: { "type": itemType },
						};
						data = angular.extend({}, item, data);

						var requestURI = spListItem.prototype.siteUrl + "/_api/web/lists/GetByTitle('" + spListItem.prototype.listName + "')/Items(" + item.Id + ")";
						var requestBody = JSON.stringify(data);

						return $http({
							method: 'POST',
							url: requestURI,
							contentType: "application/json;odata=verbose",
							data: requestBody,
							headers: requestHeaders
						});
					};

					this.executeCamlQuery = function (query) {

						var requestURI = spListItem.prototype.siteUrl + "/_vti_bin/Lists.asmx";

						return $http({
							method: 'POST',
							url: requestURI,
							headers: {
								"Content-Type": "text/xml;charset='utf-8'",
								"Accept": "application/json",
								"SOAPAction": "http://schemas.microsoft.com/sharepoint/soap/GetListItems"
							},
							data: "<?xml version=\"1.0\" encoding=\"utf-8\"?>" +
							"<soap:Envelope xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\" xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\">" +
							"<soap:Body>" +
							"<GetListItems xmlns=\"http://schemas.microsoft.com/sharepoint/soap/\">" +
							"<listName>" + spListItem.prototype.listName + "</listName>" +
							"<query>" + query + "</query>" +
							"</GetListItems>" +
							"</soap:Body>" +
							"</soap:Envelope>"

						})
							.then(function (response) {

								//in production, the xml is in response.data.  in dev, its response.data.body - not sure why
								var data = response.data.body || response.data;

								var xml = $.parseXML(data);
								var json = $(xml).SPFilterNode("z:row").SPXmlToJson({
									mapping: spListItem.prototype.spServicesJsonMapping,
									includeAllAttrs: false
								});

								return json;
							});

					};

					this.executeRestQuery = function (top, select, filter, expand) {
						var requestURI = spListItem.prototype.siteUrl + "/_api/web/lists/GetByTitle('" + spListItem.prototype.listName + "')/Items";

						return $http({
							method: 'GET',
							url: requestURI,
							headers: {
								"accept": "application/json;odata=verbose",
								"content-Type": "application/json;odata=verbose"
							},
							params: {
								'$top': top || 100000,
								'$select': select,
								'$filter': filter,
								'$expand': expand
							}
						})
							.then(function (response) {
								var results = [];

								if (response.data.d && response.data.d.results) {
									_.each(response.data.d.results, function (item, index) {
										results.push(spListItem.prototype.buildFromJson(spListItem, item));
									});
								}
								return results;

							});
					};
				};

				return spListService;

			}]);

})(angular);