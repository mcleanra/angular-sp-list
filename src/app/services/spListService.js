//base class for setting up angular services for sharepoint lists.  this provides the basic crud operations that are needed on any list

(function (angular) {

	'use strict';

	angular.module('angular.sp.list')
		.factory('spListService', ['$http', '$q', '_', 'RequestDigestIntervalService', 'RequestDigestCacheService', 'spFieldTypes', 'spBuiltInFieldNames',
			function ($http, $q, _, RequestDigestIntervalService, RequestDigestCacheService, spFieldTypes, spBuiltInFieldNames) {

				function spListService(spListItem) {

					this.spListItem = spListItem;

					//start maintaining a request digest for this site in case they have to post
					RequestDigestIntervalService.start(spListItem.prototype.siteUrl);

					this.getByFilter = function (filter, options) {
						var params = {
							$filter: filter
						};
						options = angular.extend({}, options, params);
						return this.executeRestQuery(options);
					};

					this.getByFilters = this.getByFilter;

					this.get = function (options) {
						return this.executeRestQuery(options);
					};

					//gets a list item by its id
					this.getById = function (id) {
						return this.getByArrayOfIds([id]);
					};

					//get list items from this list by an array of list item ids
					this.getByArrayOfIds = function (idArray) {
						var valueArray = [];

						_.each(idArray, function (id) {
							valueArray.push("<Value Type='Text'>" + id + "</Value>")
						});

						var query = "<Query><Where><In><FieldRef Name='ID'/><Values>" + valueArray.join('') + "</Values></In></Where></Query>";
						return this.executeCamlQuery(query);
					};

					//adds a column to this sharepoint list
					this.provisionField = function(title, type) {
						var requestHeaders = {
							"accept": "application/json;odata=verbose",
							"X-RequestDigest": RequestDigestCacheService.get(spListItem.prototype.siteUrl),
							"content-type": "application/json;odata=verbose",
							"If-Match": "*",
							"X-HTTP-Method": "POST"
						};
						var data = {
							__metadata: { "type": "SP.Field" },
							"Title": title,
							"FieldTypeKind": type
						};
						data = angular.extend({}, data);

						var requestURI = spListItem.prototype.siteUrl + "/_api/web/lists/GetByTitle('" + spListItem.prototype.listName + "')/Fields";
						var requestBody = JSON.stringify(data);

						return $http({
							method: 'POST',
							url: requestURI,
							contentType: "application/json;odata=verbose",
							data: requestBody,
							headers: requestHeaders
						}).then(function (response) {
							return response;
						});
					};

					//creates this list with the columns from the model
					this.provisionList = function() {

						var requestHeaders = {
							"accept": "application/json;odata=verbose",
							"X-RequestDigest": RequestDigestCacheService.get(spListItem.prototype.siteUrl),
							"content-type": "application/json;odata=verbose",
							"If-Match": "*",
							"X-HTTP-Method": "POST"
						};
						var data = {
							__metadata: { "type": "SP.List" },
							"AllowContentTypes": true,
							"BaseTemplate": 100,
							"ContentTypesEnabled": true,
							"Description": "",
							"Title":  spListItem.prototype.listName
						};
						data = angular.extend({}, data);

						var requestURI = spListItem.prototype.siteUrl + "/_api/web/lists";
						var requestBody = JSON.stringify(data);

						return $http({
							method: 'POST',
							url: requestURI,
							contentType: "application/json;odata=verbose",
							data: requestBody,
							headers: requestHeaders
						}).then(function (response) {
							_.each(spListItem.prototype.spServicesJsonMapping, function(mapping, key){
								if( spBuiltInFieldNames[key] ) {
									//if this is a built-in field name, don't try to provision it
								}
								else {
									provisionField(mapping.mappedName, spFieldTypes[mapping.objectType]);
								}
							});
							return response;
						});
					};

					//creates an item in this list
					this.create = function (item) {

						item = new spListItem(item);

						var requestHeaders = {
							"accept": "application/json;odata=verbose",
							"X-RequestDigest": RequestDigestCacheService.get(spListItem.prototype.siteUrl),
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
					
					//updates an existing item in this list
					this.update = function (item) {

						item = new spListItem(item);

						var requestHeaders = {
							"accept": "application/json;odata=verbose",
							"X-RequestDigest": RequestDigestCacheService.get(spListItem.prototype.siteUrl),
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

					//deletes an item from this list
					this.remove = function (item) {

						item = new spListItem(item);

						var requestHeaders = {
							"accept": "application/json;odata=verbose",
							"X-RequestDigest": RequestDigestCacheService.get(spListItem.prototype.siteUrl),
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

					//returns a count of list items that match the filter, or zero if there is any type of error
					this.getCount = function(filter) {
						var requestURI = spListItem.prototype.siteUrl + "/_vti_bin/listdata.svc/" + spListItem.prototype.listName + "/$count";

						return $http({
							method: 'GET',
							url: requestURI,
							headers: {
								"accept": "application/json;odata=verbose",
								"content-Type": "application/json;odata=verbose"
							},
							params: {
								'$filter': filter
							}
						})
						.then(function (response) {
							var results = 0;

							try {
								if ( angular.isFinite(response.data) ) {
									results = response.data;
								}
							}
							catch(e){}

							return results;
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

					this.executeCamlQueryViaRest = function( query ) {
						return $http({
							url: spListItem.prototype.siteUrl + "/_api/Web/lists/getbytitle('" + spListItem.prototype.listName + "')/getitems",
							method: "POST",
							headers: {
								"Accept": "application/json; odata=verbose",
								"Content-Type": "application/json; odata=verbose",
								"X-RequestDigest": RequestDigestCacheService.get(spListItem.prototype.siteUrl)
							},
							data: {
								"query": {
									"__metadata": {
										"type": "SP.CamlQuery"
									},
									"ViewXml": "<View>" + query + "</View>"
								}
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

					this.executeRestQuery = function (options) {
						var requestURI = spListItem.prototype.siteUrl + "/_api/web/lists/GetByTitle('" + spListItem.prototype.listName + "')/Items";

						var params = angular.extend({}, options);

						return $http({
							method: 'GET',
							url: requestURI,
							headers: {
								"accept": "application/json;odata=verbose",
								"content-Type": "application/json;odata=verbose",
								"X-RequestDigest": RequestDigestCacheService.get(spListItem.prototype.siteUrl)
							},
							params: {
								'$select': params.$select,
								'$filter': params.$filter,
								'$skip': params.$skip,
								'$top': params.$top,
								'$expand': params.$expand,
								'$orderby': params.$orderby
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