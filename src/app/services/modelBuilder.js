(function (angular) {

	'use strict';

	angular.module('angular.sp.list')
		.factory('modelBuilderService', [function () {

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