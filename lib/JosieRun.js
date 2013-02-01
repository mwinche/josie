var _ = require("underscore")._,
	Backbone = require("backbone"),
	mongoose = require('mongoose')
	, backboneio = require('backbone.io')
	, request = require('request')

	, JosieMubSub = require('./JosieMubSub')
	, JosieSchema  =require("./JosieSchema")
	, JosieUtil = require("./JosieUtil")
	, JSON = require('JSON');


var josieRunMongoModel = mongoose.model('JosieRecentRuns', mongoose.Schema(JosieSchema.recentRun));


/**
 * A run, this is usually just information about the
 * top most job (commit job) and summary info about its
 * child jobs
 *
 * @class JosieRun
 * @mixes {Backbone.Model}
 *
 */
var JosieRun = Backbone.Model.extend({

	_id: null,
	backend: null,

	/**
	 * @method JosieRun#initialize
	 * @param attributes
	 * @param options
	 */
	initialize: function (attributes, options){
		// first we need to find out if we are in the db
		// insert/update db
		// queue up a job updater
	},

	/**
	 * Set the backbone.io backend
	 * this is used for emiting updates to
	 * listening clients
	 *
	 * @method JosieRun#setBackend
	 * @param {Backboneio.Backend} backend
	 */
	setBackend: function (backend){
		this.backend = backend;
	},

	/**
	 * Check to see if this run has been stored
	 * in the local mongo db
	 *
	 * @method JosieRun#isStoredLocal
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
	 * @method JosieRun#storeLocal
	 */
	storeLocal: function (){
		var currentModel = this.toJSON();

		this.set('lastUpdated', new Date().getTime());

		if(this.isStoredLocal() === true){
			this._updateLocal();
		} else {

			josieRunMongoModel.findOne({commit: this.get("commit")}, function (err, model){
				if(err) return error(err);

				if(model){
					this._id = model._id;
					this._updateLocal();
				} else {

					josieRunMongoModel.create(currentModel, function(err, model){
						if(err) return error(err);
						console.log("created row: {commit: ", model.commit,", _id: ", model._id, "}");
						this._id = model._id;

						this.backend.emit("created", currentModel);
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
		josieRunMongoModel.update( { _id: this._id }, { '$set': currentModel }, function (err){
			if(currentModel.branch.match(/aperture/)){
				console.log("update", currentModel.buildNumber, new Date(currentModel.lastUpdated).toGMTString());
			}

			// we need this to make sure the frontend updates
			currentModel._id = this._id;
			this.backend.emit('updated', currentModel);
		}.bind(this));
	}
});

module.exports = JosieRun;

function error(err){
	console.log("WTF Error", err);
}
