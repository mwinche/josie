/**
 * @class JosieUtil
 * @type {Object}
 */
var JosieUtil = {

	/**
	 * Get a job from an api result row
	 * @method JosieUtil.getJobFromAPIResult
	 * @param {string} jobName
	 * @param {object} row object from view api request
	 * @return {Object}
	 */
	getJobFromAPIResult: function (jobName, row){
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
}

module.exports = JosieUtil;