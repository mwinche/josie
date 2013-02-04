/**
 * @module JosieUtil
 * @type {Object}
 */


/**
 * Get a job from an api result row
 * @exports getJobFromAPIResult
 * @param {string} jobName
 * @param {object} row object from view api request
 * @return {Object}
 */
exports.getJobFromAPIResult = function (jobName, row){
	if(row.cells){
		var keys = Object.keys(row.cells),
			len = keys.length,
			regex = new RegExp('^' + jobName);

		while(len--){
			var job = row.cells[keys[len]];
			if(regex.test(keys[len])) return job;
		}
	}

	return null;
}