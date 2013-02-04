var _ = require("underscore")._,
	Backbone = require("backbone"),
	mongoose = require('mongoose')
	, backboneio = require('backbone.io')
	, request = require('request')

//	, JosieMubSub = require('./JosieMubSub')
	, Schema  =require("./JosieSchema").runSummary
	, RunDetail  =require("./RunDetail")
	, JosieUtil = require("./JosieUtil")
	, JSON = require('JSON');

var branchRegex = /Branch\: ([a-zA-Z\/]+)<?/g,
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


mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost/josie', function (err){
	console.log("mongoose connected!!", err)
});

var mongoModel = mongoose.model('RunSummary', mongoose.Schema(Schema)),
	backend = backboneio.createBackend(),
	instances = {},

	app, server, jenkinsURL;

backend.use(backboneio.middleware.mongooseStore(mongoModel));


/**
 * @module RunSummary
 *
 * @param expressApp
 * @param expressServer
 * @param url
 */
exports.init = function (expressApp, expressServer, url){
	app = expressApp;
	server = expressServer;
	jenkinsURL = url;
}

exports.getBackend = function(){
	return backend;
}

/**
 * Process the table row from a api call to a jenkins view
 *
 * @method JosieRunFactory.processAPIResult
 * @param {Object} row object from jenkins api
 * @return {JosieRun}
 */
exports.processAPIResult = function (row){
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
			instances[tmpModel.buildNumber] =  new RunSummary(tmpModel);
		} else {
			instances[tmpModel.buildNumber].updateFromAPI(tmpModel);
		}

		return instances[tmpModel.buildNumber];
	}

	console.log("NOT FOUND");
}


/**
 * set the Backboneio backend to be used
 *
 * @method JosieRunFactory.setBackend
 * @param {Backboneio.Backend} newBackend backend to be used
 */
exports.setBackend = function (newBackend){
	backend = newBackend;
}

/**
 * Get run by commit job build number
 *
 * @method JosieRunFactory.getRun
 * @param {integer} commitNumber build number of commit job eg: 1234
 * @return {JosieRun}
 */
exports.getRun = function (commitNumber){
	if(instances[commitNumber]){
		return instances[commitNumber];
	}
	return null;
}


/**
 * A run, this is usually just information about the
 * top most job (commit job) and summary info about its
 * child jobs
 *
 * @class RunSummary
 * @mixes {Backbone.Model}
 *
 */
var RunSummary = Backbone.Model.extend({

	_id: null,

	runDetail: null,

	/**
	 * @method RunSummary#initialize
	 * @param attributes
	 * @param options
	 */
	initialize: function (attributes, options){
		// first we need to find out if we are in the db
		// insert/update db
		// queue up a job updater
	},

	/**
	 * Check to see if this run has been stored
	 * in the local mongo db
	 *
	 * @method RunSummary#isStoredLocal
	 * @return {Boolean}
	 */
	isStoredLocal: function (){
		return !!this._id;
	},

	/**
	 * This will attempt to find this obj in the db
	 * if it finds one it will update this._id
	 * if it doesnt an obj will be created;
	 *
	 * @method RunSummary#storeLocal
	 */
	storeLocal: function (){
		var currentModel = this.toJSON();

		this.set('lastUpdated', new Date().getTime());

		if(this.isStoredLocal() === true){
			this._updateLocal();
		} else {

			mongoModel.findOne({commit: this.get("commit")}, function (err, model){
				if(err) return error(err);

				if(model){
					this._id = model._id;
					this._updateLocal();
				} else {

					mongoModel.create(currentModel, function(err, model){
						if(err) return error(err);
						console.log("created row: {commit: ", model.commit,", _id: ", model._id, "}");
						this._id = model._id;

						backend.emit("created", currentModel);
					}.bind(this))
				}
			}.bind(this));
		}
	},

	/**
	 * Update model with data from the an
	 * API request.
	 *
	 * @see JosieRunFactory.processAPIResult
	 *
	 * @method JosieRun#updateFromAPI
	 * @param {Object} newData tmpModel from JosieRunFactory.processAPIResult
	 */
	updateFromAPI: function (newData){
		if(newData.running === false && this.get("running") === false) return;
		this.set(newData);
		this.storeLocal();
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
			if(currentModel.branch.match(/aperture/)){
				console.log("update", currentModel.buildNumber, new Date(currentModel.lastUpdated).toGMTString());
			}

			// we need this to make sure the frontend updates
			currentModel._id = this._id;
			backend.emit('updated', currentModel);
		}.bind(this));
	},

	getRunDetail: function (){
		if(!this.runDetail){
			this.runDetail = RunDetail.fromRunSummary(this);
		}

		return this.runDetail;
	}
});


function error(err){
	console.log("WTF Error", err);
}


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
