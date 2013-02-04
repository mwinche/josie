// require
var _ = require("underscore")._,
	Backbone = require("backbone"),
	mongoose = require('mongoose'),
	backboneio = require('backbone.io'),
	request = require('request'),
	Schema  =require("./JosieSchema").runDetail,
	JSON = require('JSON')
	;

mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost/josie', function (err){
	console.log("mongoose connected!!", err)
});

var mongoModel = mongoose.model('rundetail', mongoose.Schema(Schema)),
//	backends = backboneio.createBackend(),
	instances = {},

	app, server, jenkinsURL;

//backend.use(backboneio.middleware.mongooseStore(mongoModel));

exports.init = function (expressApp, expressServer, url){
	app = expressApp;
	server = expressServer;
	jenkinsURL = url;

//	updateTeams();
}

/**
 *
 * @param {RunSummary} runSummary
 */
exports.fromRunSummary = function (runSummary){
	var buildNumber = runSummary.get('buildNumber');
	if(!instances[buildNumber]){
		var json = JSON.parse(JSON.stringify(runSummary.toJSON()));

		json.jobs = null;
		delete json.jobs;

		instances[buildNumber] = new RunDetail(json);
		instances[buildNumber].setRunSummary(runSummary);
	}

	return instances[buildNumber];
}

var RunDetail = Backbone.Model.extend({

	_id: null,
	runSummary: null,


	/**
	 * @param attributes
	 * @param options
	 */
	initialize: function (attributes, options){
		// first we need to find out if we are in the db
		// insert/update db
		// queue up a job updater

		this.storeLocal();
		this.createBackend();
//		this.update();
	},

	createBackend: function (){
		this.backendioOptions = {};

		this.backend = this.backendioOptions["runDetail_" + this.get()] = backboneio.createBackend();
//		this.backend.use(backboneio.middleware.mongooseStore(mongoModel));
//		backboneio.listen(server, this.backendioOptions);
	},

	/**
	 * Check to see if this run has been stored
	 * in the local mongo db
	 *
	 * @return {Boolean}
	 */
	isStoredLocal: function (){
		return !!this._id;
	},

	storeLocal: function (){
		var currentModel = this.toJSON();

		if(this.isStoredLocal() === true){
			this._updateLocal();
		} else {

			mongoModel.findOne({name: this.get("name")}, function (err, model){
				if(err) return error(err);

				if(model){
					this._id = model._id;
					this._updateLocal();
				} else {

					mongoModel.create(currentModel, function(err, model){
						if(err) return error(err);
						this._id = model._id;
						this.backend.emit("created", currentModel);
					}.bind(this))
				}
			}.bind(this));
		}
	},


	/**
	 * Get a job by its projectName
	 *
	 * @method JosieRun#getJob
	 * @param {string} name Name of the job
	 * @param {Array} [jobs=this.get('jobs')] array of jobs to search through
	 */
	getJob: function (name, jobs){
		if(!jobs){
			jobs = this.get('jobs');
		}

		if(!jobs){
			var jobs = [];
			this.set("jobs", jobs);
		}

		var len = jobs.length;
		while(len--){
			var job = jobs[len];
			if(job.projectName === name){
				return job;
			}
		}
		return null;
	},


	/**
	 * Update local stored data
	 * this is called on save
	 *
	 * @method JosieRun#_updateLocal
	 * @private
	 */
	_updateLocal: function (){
		var currentModel = this.toJSON();
		mongoModel.update( { _id: this._id }, { '$set': currentModel }, function (err){
			// we need this to make sure the frontend updates
			currentModel._id = this._id;
			this.backend.emit('updated', currentModel);
		}.bind(this));
	},

	setRunSummary: function (runSummary){
		this.runSummary = runSummary;
		this.updateJobs();
	},


	updateJobs: function(){
		var jobs = this.runSummary.get('jobs'),
			len = jobs.length;

		while(len--){
			var job = jobs[len],
				path  = "/job/" + job.projectName + "/" + job.buildNumber +"/testReport/api/json";
			if(!job.projectName.match(/update|build|clouds|teardown|commit|_[0-9]_/gi)){
				if(job.running){
					// lets update this one
					// @todo dont hardcode this
					this._updateJob(job.projectName, "http://localhost:3000/jenkinsHack/?endpoint=" + path);
				} else {
					// @todo find an intelligent way to update completed runs if the look out of date
					this._updateJob(job.projectName, jenkinsURL + path);
				}

				console.log("JOB", jobs[len].projectName, jobs[len].buildNumber);
			}
		}

	},


	_updatingJobs: 0,

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

				if(!job){
					job = {};
					this.get("jobs").push(job);
				}

				for(var prop in realObj){
					job[prop] = realObj[prop];
				}

				job.projectName = jobName;
			}

			this._updatingJobs--;
			if(this._updatingJobs === 0){
				console.log('DONE { "commit": "' + this.get("commit") + '"}');
				this.storeLocal();
			}
		}.bind(this));
	}
});



function pruneJobResponse(jsonObj){
	var ret = {};
	for(var prop in jsonObj){
		if(prop == "suites"){
			ret["testFailures"] = [];

			for(var i = 0, len = jsonObj[prop].length; i < len; i++){
				var failures = getFailures(jsonObj[prop][i]);
				if(failures.length){
					ret["testFailures"] = ret["testFailures"].concat(failures);
				}
			}
		} else {
			ret[prop] = jsonObj[prop];
		}
	}

	return ret;
}

function getFailures(suite){
	var failures = [],
		caseLen = suite.cases.length;

	while(caseLen--){
		if(!~["PASSED","FIXED"].indexOf(suite.cases[caseLen].status)){
			failures.push(suite.cases[caseLen]);
		}
	}

	return failures;
}
