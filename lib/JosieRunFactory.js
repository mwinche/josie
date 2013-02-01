var JosieRun = require("./JosieRun"),
	JosieUtil = require("./JosieUtil"),
	branchRegex = /Branch\: ([a-zA-Z\/]+)<?/g,
	authRegex = /Author\: ([a-zA-Z\s]+)<?/g,
	commonFields = [
		"buildNumber",
		"date",
		"failures",
		"name",
		"projectName",
		"result",
		"running"
	];

var _getUniqueMatches = function _getUniqueMatches(regex, text){
	var match = regex.exec(text),
		returnAr = [];

	while(match){
		if(!~returnAr.indexOf(match[1])){
			returnAr.push(match[1]);
		}
		match = regex.exec(text);
	}

	return returnAr.sort();
};

var instances = {},
	backend = null;


/**
 * JosieRunFactory
 * manages current/recent runs
 *
 * @class JosieRunFactory
 *
 * @type {Object}
 */
var JosieRunFactory = {

	/**
	 * set the Backboneio backend to be used
	 *
	 * @method JosieRunFactory.setBackend
	 * @param {Backboneio.Backend} newBackend backend to be used
	 */
	setBackend: function (newBackend){
		backend = newBackend;
	},

	/**
	 * Process the table row from a api call to a jenkins view
	 *
	 * @method JosieRunFactory.processAPIResult
	 * @param {Object} row object from jenkins api
	 * @return {JosieRun}
	 */
	processAPIResult: function (row){
		var cells = row.cells,
			commitJob = JosieUtil.getJobFromAPIResult("Commit", row),
			tmpModel = {
				commit: row.id,
				branch: _getUniqueMatches(branchRegex, row.description)[0] || "origin/master",
				author: _getUniqueMatches(authRegex, row.description)[0],
				totalFailures: row.totalFailures,
				running: row.running || false,
				name: "Unknown",
				buildNumber: 0,
				description: row.description,
				numberCommitters: 0,
				jobs: [],
				channel: "",
				date: 0
			};

		for(var cell in cells){
			var tmpJob = {};

			for(var ci=0, clen=commonFields.length; ci < clen; ci++){
				var tmpCellField = commonFields[ci];
				tmpJob[tmpCellField] = cells[cell][tmpCellField];
			}
			tmpModel.jobs.push(tmpJob);
		}

		if(commitJob){
			tmpModel.name = commitJob.name;
			tmpModel.buildNumber = commitJob.buildNumber;
			tmpModel.numberCommitters = commitJob.numberCommitters;
			tmpModel.date = commitJob.date;


			if(!instances[tmpModel.buildNumber]) {
				instances[tmpModel.buildNumber] =  new JosieRun(tmpModel);
				instances[tmpModel.buildNumber].setBackend(backend);
			} else {
				instances[tmpModel.buildNumber].updateFromAPI(tmpModel);
			}

			return instances[tmpModel.buildNumber];
		}

		console.log("NOT FOUND");
	},

	/**
	 * Get run by commit job build number
	 *
	 * @method JosieRunFactory.getRun
	 * @param {Integer} commitNumber build number of commit job eg: 1234
	 * @return {JosieRun}
	 */
	getRun: function (commitNumber){
		if(instances[commitNumber]){
			return instances[commitNumber];
		}
		return null;
	}
}

module.exports = JosieRunFactory;