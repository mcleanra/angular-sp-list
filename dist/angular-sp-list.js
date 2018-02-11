
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
(function (angular) {

	'use strict';

	angular.module('angular.sp.list')
		.factory('spBuiltInFieldNames', [function () {
				return {
					ows_ID: { mappedName: 'Id', objectType: "Number" },
					ows_ContentTypeId: { mappedName: 'ContentTypeId', objectType: 'ContentTypeId' },
					ows_ContentType: { mappedName: 'ContentType', objectType: 'Text' },
					ows_Created: { mappedName: 'Created', objectType: 'DateTime' },
					ows_Author: { mappedName: 'Author', objectType: 'User' },
					ows_Modified: { mappedName: 'Modified', objectType: 'DateTime' },
					ows_Editor: { mappedName: 'Editor', objectType: 'User' },
					ows__HasCopyDestinations: { mappedName: '_HasCopyDestinations', objectType: 'Boolean' },
					ows__CopySource: { mappedName: '_CopySource', objectType: 'Text' },
					ows__ModerationStatus: { mappedName: '_ModerationStatus', objectType: 'ModStat' },
					ows__ModerationComments: { mappedName: '_ModerationComments', objectType: 'Note' },
					ows_FileRef: { mappedName: 'FileRef', objectType: 'Lookup' },
					ows_FileDirRef: { mappedName: 'FileDirRef', objectType: 'Lookup' },
					ows_Last_x0020_Modified: { mappedName: 'Last_x0020_Modified', objectType: 'Lookup' },
					ows_Created_x0020_Date: { mappedName: 'Created_x0020_Date', objectType: 'Lookup' },
					ows_File_x0020_Size: { mappedName: 'File_x0020_Size', objectType: 'Lookup' },
					ows_FSObjType: { mappedName: 'FSObjType', objectType: 'Lookup' },
					ows_PermMask: { mappedName: 'PermMask', objectType: 'Computed' },
					ows_CheckedOutUserId: { mappedName: 'CheckedOutUserId', objectType: 'Lookup' },
					ows_IsCheckedoutToLocal: { mappedName: 'IsCheckedoutToLocal', objectType: 'Lookup' },
					ows_CheckoutUser: { mappedName: 'CheckoutUser', objectType: 'User' },
					ows_FileLeafRef: { mappedName: 'FileLeafRef', objectType: 'File' },
					ows_UniqueId: { mappedName: 'UniqueId', objectType: 'Lookup' },
					ows_ProgId: { mappedName: 'ProgId', objectType: 'Lookup' },
					ows_ScopeId: { mappedName: 'ScopeId', objectType: 'Lookup' },
					ows_VirusStatus: { mappedName: 'VirusStatus', objectType: 'Lookup' },
					ows_CheckedOutTitle: { mappedName: 'CheckedOutTitle', objectType: 'Lookup' },
					ows__CheckinComment: { mappedName: '_CheckinComment', objectType: 'Lookup' },
					ows_LinkCheckedOutTitle: { mappedName: 'LinkCheckedOutTitle', objectType: 'Computed' },
					ows_Modified_x0020_By: { mappedName: 'Modified_x0020_By', objectType: 'Text' },
					ows_Created_x0020_By: { mappedName: 'Created_x0020_By', objectType: 'Text' },
					ows_File_x0020_Type: { mappedName: 'File_x0020_Type', objectType: 'Text' },
					ows_HTML_x0020_File_x0020_Type: { mappedName: 'HTML_x0020_File_x0020_Type', objectType: 'Text' },
					ows__SourceUrl: { mappedName: '_SourceUrl', objectType: 'Text' },
					ows__SharedFileIndex: { mappedName: '_SharedFileIndex', objectType: 'Text' },
					ows__EditMenuTableStart: { mappedName: '_EditMenuTableStart', objectType: 'Computed' },
					ows__EditMenuTableEnd: { mappedName: '_EditMenuTableEnd', objectType: 'Computed' },
					ows_LinkFilenameNoMenu: { mappedName: 'LinkFilenameNoMenu', objectType: 'Computed' },
					ows_LinkFilename: { mappedName: 'LinkFilename', objectType: 'Computed' },
					ows_DocIcon: { mappedName: 'DocIcon', objectType: 'Computed' },
					ows_ServerUrl: { mappedName: 'ServerUrl', objectType: 'Computed' },
					ows_EncodedAbsUrl: { mappedName: 'EncodedAbsUrl', objectType: 'Computed' },
					ows_BaseName: { mappedName: 'BaseName', objectType: 'Computed' },
					ows_FileSizeDisplay: { mappedName: 'FileSizeDisplay', objectType: 'Computed' },
					ows_MetaInfo: { mappedName: 'MetaInfo', objectType: 'Lookup' },
					ows__Level: { mappedName: '_Level', objectType: 'Integer' },
					ows__IsCurrentVersion: { mappedName: '_IsCurrentVersion', objectType: 'Boolean' },
					ows_SelectTitle: { mappedName: 'SelectTitle', objectType: 'Computed' },
					ows_SelectFilename: { mappedName: 'SelectFilename', objectType: 'Computed' },
					ows_Edit: { mappedName: 'Edit', objectType: 'Computed' },
					ows_owshiddenversion: { mappedName: 'owshiddenversion', objectType: 'Integer' },
					ows__UIVersion: { mappedName: '_UIVersion', objectType: 'Integer' },
					ows__UIVersionString: { mappedName: '_UIVersionString', objectType: 'Text' },
					ows_InstanceID: { mappedName: 'InstanceID', objectType: 'Integer' },
					ows_Order: { mappedName: 'Order', objectType: 'Number' },
					ows_GUID: { mappedName: 'GUID', objectType: 'Guid' },
					ows_WorkflowVersion: { mappedName: 'WorkflowVersion', objectType: 'Integer' },
					ows_WorkflowInstanceID: { mappedName: 'WorkflowInstanceID', objectType: 'Guid' },
					ows_ParentVersionString: { mappedName: 'ParentVersionString', objectType: 'Lookup' },
					ows_ParentLeafName: { mappedName: 'ParentLeafName', objectType: 'Lookup' },
					ows_Title: { mappedName: 'Title', objectType: 'Text' },
					ows_TemplateUrl: { mappedName: 'TemplateUrl', objectType: 'Text' },
					ows_xd_ProgID: { mappedName: 'xd_ProgID', objectType: 'Text' },
					ows_xd_Signature: { mappedName: 'xd_Signature', objectType: 'Boolean' },
					ows_Combine: { mappedName: 'Combine', objectType: 'Computed' },
					ows_RepairDocument: { mappedName: 'RepairDocument', objectType: 'Computed' }
				};
			}]);

})(angular);
(function (angular) {

	'use strict';

	angular.module('angular.sp.list')
		.factory('spFieldTypes', [function () {
				return {
					'Invalid': 0,
					'Integer': 1,
					'Text': 2,
					'Note': 3,
					'DateTime': 4,
					'Counter': 5,
					'Choice': 6,
					'Lookup': 7,
					'Boolean': 8,
					'Number': 9,
					'Currency': 10,
					'URL': 11,
					'Computed': 12,
					'Threading': 13,
					'Guid': 14,
					'MultiChoice': 15,
					'GridChoice': 16,
					'Calculated': 17,
					'File': 18,
					'Attachments': 19,
					'User': 20,
					'Recurrence': 21,
					'CrossProjectLink': 22,
					'ModStat': 23,
					'Error': 24,
					'ContentTypeID': 25,
					'PageSeparator': 26,
					'ThreadIndex': 27,
					'WorkflowStatus': 28,
					'AllDayEvent': 29,
					'WorkflowEventType': 30,
					'Geolocation': null, //not in the documentation
					'OutcomeChoice': null, //not in the documentation
					'MaxItems': 31
				}
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
						data = angular.extend({}, item, data);

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
									svc.provisionField(mapping.mappedName, spFieldTypes[mapping.objectType]);
								}
							});
						});
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
						data = angular.extend({}, item, data);

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

					//executes a caml query on this list
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

					this.executeRestQuery = function (options) {
						var requestURI = spListItem.prototype.siteUrl + "/_api/web/lists/GetByTitle('" + spListItem.prototype.listName + "')/Items";

						var params = angular.extend({}, options);

						return $http({
							method: 'GET',
							url: requestURI,
							headers: {
								"accept": "application/json;odata=verbose",
								"content-Type": "application/json;odata=verbose"
							},
							params: {
								'$select': params.$select,
								'$filter': params.$filter,
								'$skip': params.$skip,
								'$top': params.$top,
								'$expand': params.$expand,
								'$orderby': parmas.$orderby
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