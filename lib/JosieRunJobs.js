var _ = require("underscore")._,
	Backbone = require("backbone"),
	mongoose = require('mongoose')
	, backboneio = require('backbone.io')
	, request = require('request')

	, JosieMubSub = require('./JosieMubSub')
	, JosieSchema  =require("./JosieSchema")
	, JosieUtil = require("./JosieUtil")
	, JSON = require('JSON');


var josieJobMongoModel = mongoose.model('JosieJobs', mongoose.Schema(JosieSchema.simpleJob));

/**
 * @constructor
 */
var JosieRunJobs = Backbone.Model.extend({

	_id: null,
	backend: null,

	/**
	 * @method JosieRunJobs#initialize
	 *
	 * @param attributes
	 * @param options
	 */
	initialize: function (attributes, options){
		// first we need to find out if we are in the db
		// insert/update db
		// queue up a job updater
	},

	/**
	 *
	 * @method JosieRunJobs#_setupBackend
	 * @private
	 *
	 */
	_setupBackend: function (){

	},

	/**
	 *
	 * @param backend
	 */
	setBackend: function (backend){
		this.backend = backend;
	},

	updateJobs: function(){
		return;
		var jobs = this.get("jobs");
		for(var i = 0, len = jobs.length; i < len; i++){
			var job = jobs[i],
				path  = "/job/" + job.projectName + "/" + job.buildNumber +"/testReport/api/json";

			if(job.running){
				// lets update this one
				// @todo dont hardcode this
				this._updateJob(job.projectName, "http://localhost:3000/jenkinsHack/?endpoint=" + path);
			} else {
				// @todo find an intelligent way to update completed runs if the look out of date
				this._updateJob(job.projectName, "http://ci.attask.com/jenkins" + path);
			}
		}
	},


	_updateJob: function (jobName, endpoint){
		this._updatingJobs++;
		request(endpoint, function (err, res, body){

			var jsonObj;
			try {
				jsonObj = JSON.parse(body);
			} catch(e){
				// Jenkins doesnt have json api's for everything
			}

			if(jsonObj) {
				var job = this.getJob(jobName),
					realObj = pruneJobResponse(jsonObj);

				for(var prop in realObj){
					job[prop] = realObj[prop];
				}
			}

			this._updatingJobs--;
			if(this._updatingJobs === 0){
				console.log('DONE { "commit": "' + this.get("commit") + '"}');
				this.storeLocal();
			}
		}.bind(this));
	}
});

/**
 * @method
 * @param run
 */
JosieRunJobs.fromRun = function (run){

}


module.exports = JosieRunJobs;

function pruneJobResponse(jsonObj){
	var ret = {};
	for(var prop in jsonObj){
		if(prop == "suites"){
			ret[prop] = []
			for(var i = 0, len = jsonObj[prop].length; i < len; i++){
				ret[prop][i] = pruneSuites(jsonObj[prop][i]);
			}
		} else {
			ret[prop] = jsonObj[prop];
		}
	}

	return ret;
}

function pruneSuites(suite){
	var ret = {};
	for(var prop in suite){
		if(prop == 'cases'){
			ret.cases = [];

			var cases = suite['cases'],
				caseLen = cases.length;

			while(caseLen--){
				if(!~["PASSED","FIXED"].indexOf(cases[caseLen].status)){
					ret.cases.push(cases[caseLen]);
				}
			}
		} else {
			ret[prop] = suite[prop];
		}
	}

	return ret;
}
