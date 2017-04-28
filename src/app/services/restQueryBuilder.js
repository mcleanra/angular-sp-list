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