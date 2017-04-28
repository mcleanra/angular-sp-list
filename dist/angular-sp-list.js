
(function () {
    'use strict';

    angular.module('angular.sp.list', ['angular.sp.digest']);
	
})();

(function (angular) {

	'use strict';

	angular.module('angular.sp.list')
		.factory('modelBuilderService', ['_', function (_) {

			function _buildFromRestResponse(ctor, result, spServicesJsonMapping) {
				var json = {};

				Object.keys(result).forEach(function (key, index) {

					var mapping = spServicesJsonMapping['ows_' + key];

					if (result[key] && mapping) {
						if (mapping.objectType == "MultiChoice" || mapping.objectType == "LookupMulti" || mapping.objectType == "UserMulti") {
							//this is a multi lookup field, so move the values up
							if (result[key].results) {
								json[mapping.mappedName] = result[key].results;
							}
							//remove sharepoint ;# from multiple choice fields and make it an array
							else if (mapping.objectType == "MultiChoice") {
								json[mapping.mappedName] = _.filter(result[key].split(';#'),
									function (item) {
										return item !== "";
									});
							}
							else {
								json[mapping.mappedName] = result[key];
							}
						}
						else {
							json[mapping.mappedName] = result[key];
						}
					}
				});

				return new ctor(json, 'rest');
			};

			function _buildFromCamlResponse(ctor, row, spServicesJsonMapping) {
				var json = $(row).SPXmlToJson({
					mapping: spServicesJsonMapping,
					includeAllAttrs: false,
					removeOws: true
				});

				return new ctor(json, 'caml');
			};

			function _convertToSharePointListItem(item, spServicesJsonMapping) {
				var convertedItem = angular.copy(item);

				Object.keys(convertedItem).forEach(function (key, index) {

					var mapping = _.findWhere(spServicesJsonMapping, { mappedName: key });

					if (mapping && !mapping.objectFactory) {
						//find the key of the mapping item, which is the name of our sharepoint column
						var colName = _.findKey(spServicesJsonMapping, mapping);

						//remove the ows_ from the front
						colName = colName.substring(4, colName.length);

						//convert this key to the actual column name from our jsonMapping
						convertedItem[colName] = convertedItem[key];
					}

					delete convertedItem[key];

				});

				return convertedItem;
			};

			return {
				buildFromRestResponse: _buildFromRestResponse,
				buildFromCamlResponse: _buildFromCamlResponse,
				convertToSharePointListItem: _convertToSharePointListItem
			};

		}]);

})(angular);
(function (angular) {

	'use strict';

	angular.module('angular.sp.list')
		.factory('restQueryBuilderService', ['_', function (_) {

			//walks down the object and returns a list of comma separated fields for the $select parameter
			function _getSelectFields(spServicesJsonMapping, expandAll) {
				var fields = [];

				Object.keys(spServicesJsonMapping).forEach(function (key, index) {

					var mapping = spServicesJsonMapping[key];
					var field = key.replace('ows_', '');

					//if it's another object, we also have to get that object's fields
					if (mapping.objectType == "Lookup" || mapping.objectType == "LookupMulti") {

						if (expandAll) {

							var expandFields = [];

							if (mapping.objectFactory && mapping.objectFactory.prototype.getSelectFields) {

								expandFields = mapping.objectFactory.prototype.getSelectFields(false).split(',');

								_.each(expandFields, function (expandField, index) {

									expandFields[index] = field + '/' + expandField;

								});
							}

							fields = fields.concat(expandFields);
						}

					}
					//it's a regular field, not a lookup
					else {
						fields.push(field);
					}
				});

				return fields.join(',');
			};

			//walks down the object and returns a string of comma separated fields for the $expand parameter
			function _getExpandFields(spServicesJsonMapping, expandAll) {

				var expandFields = [];

				//get the select fields
				var selectFields = _getSelectFields(spServicesJsonMapping, true).split(',');

				//find the ones that have a slash (the lookup fields)
				selectFields = _.filter(selectFields, function (field, index) {
					return field.indexOf('/') != -1;
				});

				_.each(selectFields, function (field, index) {

					field = field.split('/');

					//discard the last item because we only want to keep the expand path
					field.pop();

					field = field.join('/');

					if (expandFields.indexOf(field) == -1) {
						expandFields.push(field);
					}
				});

				return expandFields.join(',');
			};

			return {
				getSelectFields: _getSelectFields,
				getExpandFields: _getExpandFields
			};

		}]);

})(angular);
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
//base class for setting up angular services for sharepoint lists.  this provides the basic crud operations that are needed on any list

(function (angular) {

	'use strict';

	angular.module('angular.sp.list')
		.factory('spListService', ['$http', '$q', '_', 'RequestDigestIntervalService', 'RequestDigestCacheService',
			function ($http, $q, _, RequestDigestIntervalService, RequestDigestCacheService) {

				function spListService(spListItem) {

					this.spListItem = spListItem;

					//start maintaining a request digest for this site in case they have to post
					RequestDigestIntervalService.start(spListItem.prototype.siteUrl);

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