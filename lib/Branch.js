// require
var _ = require("underscore")._,
	Backbone = require("backbone"),
	mongoose = require('mongoose'),
	backboneio = require('backbone.io'),
	request = require('request'),
	Schema  =require("./JosieSchema").branch
	;

mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost/josie', function (err){
	console.log("mongoose connected!!", err)
});

var mongoModel = mongoose.model('branch', mongoose.Schema(Schema)),
	backend = backboneio.createBackend(),
	instances = {},

	app, server, jenkinsURL;

backend.use(backboneio.middleware.mongooseStore(mongoModel));


/**
 * @method Branch.init
 *
 * @param expressApp
 * @param expressServer
 * @param url
 */
exports.init = function (expressApp, expressServer, url){
	app = expressApp;
	server = expressServer;
	jenkinsURL = url;

//	updateTeams();
}

/**
 * @method Branch.getBackend
 * @return {Backboneio.Backend}
 */
exports.getBackend = function(){
	return backend;
}

/**
 * loops through all instances and call storeLocal
 *
 * @method Branch.storeInstances
 */
exports.storeInstances = function (){
	var keys = Object.keys(instances),
		len = keys.length;

	while(len--){
		var branch = instances[keys[len]];
		branch.storeLocal();
	}
}

/**
 * @method Branch.getBranch
 *
 * @param {String} name name of branch
 */
exports.getBranch = function (name){
	if(!instances[name]){
		instances[name] = new Branch({branch: {name: name}});
	}

	return instances[name];
}

/**
 * @class Branch
 * @type {Backbone.Model}
 */
var Branch = Backbone.Model.extend({

	_id: null,

	/**
	 * @method Branch#initialize
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
	 * @method Branch#isStoredLocal
	 *
	 * @return {Boolean}
	 */
	isStoredLocal: function (){
		return !!this._id;
	},

	/**
	 * Store local
	 *
	 *
	 * @method Branch#storeLocal
	 */
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
						backend.emit("created", currentModel);
					}.bind(this))
				}
			}.bind(this));
		}
	},

	/**
	 * Update local stored data
	 * this is called on save
	 *
	 * @method Branch#_updateLocal
	 * @private
	 */
	_updateLocal: function (){
		var currentModel = this.toJSON();
		mongoModel.update( { _id: this._id }, { '$set': currentModel }, function (err){
			// we need this to make sure the frontend updates
			currentModel._id = this._id;
			backend.emit('updated', currentModel);
		}.bind(this));
	}
});
