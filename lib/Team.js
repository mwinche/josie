// require
var _ = require("underscore")._,
	Backbone = require("backbone"),
	mongoose = require('mongoose'),
	backboneio = require('backbone.io'),
	request = require('request'),
	Schema  =require("./JosieSchema").team
	Branch  =require("./branch")
	;


mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost/josie', function (err){
	console.log("mongoose connected!!", err)
});

var mongoModel = mongoose.model('team', mongoose.Schema(Schema)),
	backend = backboneio.createBackend(),
	instances = {},
	updateInterval = 3 * 60 * 1000,

	app, server, jenkinsURL;

backend.use(backboneio.middleware.mongooseStore(mongoModel));


/**
 * @method Team.init
 * @param expressApp
 * @param expressServer
 * @param url
 */
exports.init = function (expressApp, expressServer, url){
	app = expressApp;
	server = expressServer;
	jenkinsURL = url;

	updateTeams();
}

/**
 *
 * @method Team.getBackend
 * @return {*}
 */
exports.getBackend = function(){
	return backend;
}

/**
 *
 * @method Team.getTeam
 * @param {String} team
 */
var getTeam = exports.getTeam = function (team){
	if(!instances[team]){
		instances[team] = new Team({name: team})
	}

	return instances[team];
}

/**
 * @method Team.teamExists
 * @param name
 * @return {Boolean}
 */
exports.teamExists = function(name){
	return !!instances[name];
}

/**
 * @class Team
 * @type {Backbone.Model}
 */
var Team = Backbone.Model.extend({

	_id: null,

	/**
	 * @method Team#initialize
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
	 * @method Team#isStoredLocal
	 * @return {Boolean}
	 */
	isStoredLocal: function (){
		return !!this._id;
	},

	/**
	 *
	 * @method Team#storeLocal
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
	 * @method Team#_updateLocal
	 * @private
	 */
	_updateLocal: function (){
		var currentModel = this.toJSON();
		mongoModel.update( { _id: this._id }, { '$set': currentModel }, function (err){
			// we need this to make sure the frontend updates
			currentModel._id = this._id;
			backend.emit('updated', currentModel);
		}.bind(this));
	},

	/**
	 *
	 * @method Team#addBranch
	 * @param branchName
	 */
	addBranch: function (branchName){
		var branches = this.get('branches');

		if(branches && !~branches.indexOf(branchName)){
			branches.push(branchName);
		} else {
			this.set('branches', [branchName]);
		}
	}
});

// these are updated every 3 minutes
var updateEndpoints = [
//	'http://countdown.attask.com/api/moment/?format=json',
//	'http://countdown.attask.com/api/moment/?format=json&branchtype=other&namespace=dev&limit=1000',
	'http://countdown.attask.com/api/moment/?format=json&branchtype=team&namespace=rel&limit=1000',
	'http://countdown.attask.com/api/moment/?format=json&branchtype=team&namespace=dev&limit=1000'
]

var pendingRequests = 0;
function updateTeams(){
	pendingRequests = 0;
	var len = updateEndpoints.length;
	while(len--){
		var endpoint = updateEndpoints[len];
		request(endpoint, handleUpdateResponse);
	}
}

function handleUpdateResponse(err, resp, body){
	if(err){
		console.log("API Request error: ", err);
		return;
	}

//			try {

		var jsonObj = JSON.parse(body),
			teams = jsonObj.objects,
			len = teams.length;

		while(len--){

			var teamObj = teams[len],
				team = teamObj.branch.team ? teamObj.branch.team.name : false;

			if(team){

				var teamModel = getTeam(team),
					branchModel = Branch.getBranch(teamObj.branch.name);

				teamModel.addBranch(teamObj.branch.name);
				branchModel.set(teamObj);


				console.log(team, teamObj.branch.name, branchModel._id);
			}
		}



//			} catch (e){
//				console.log("WTF", e);
//				//hrm jenkins is defective
//			}

	pendingRequests++;
	if(pendingRequests === updateEndpoints.length){
		storeInstances();
		setTimeout(updateTeams, updateInterval);
	}
}

function storeInstances(){
	console.log("Storing Teams...");
	var keys = Object.keys(instances),
		len = keys.length;

	while(len--){
		var team = instances[keys[len]];
		team.storeLocal();
	}

	Branch.storeInstances();
}