var mongoose = require('mongoose')
	, backboneio = require('backbone.io')
//	, mubsub = require('mubsub')
	, request = require('request')
	, JosieRunFactory  =require("./JosieRunFactory")
	, JosieRunJobs  =require("./JosieRunJobs")
	, JosieSchema  =require("./JosieSchema")
//	, JosieMubSub = require('./JosieMubSub')
	, JSON = require('JSON');


var josieRunMongoModel = mongoose.model('JosieRecentRuns', mongoose.Schema(JosieSchema.recentRun)),
	josieRunBackend = backboneio.createBackend(),
	josieRunJobsBackend = {};

JosieRunFactory.setBackend(josieRunBackend);
josieRunBackend.use(backboneio.middleware.mongooseStore(josieRunMongoModel));

mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost/josie', function (err){
	console.log("mongoose connected!!", err)
});

module.exports = JosieServer;

/**
 * Josie Server
 * @param expressServer server
 * @param String jenkinsURL url to jenkins
 * @constructor
 */
function JosieServer(server, jenkinsURL){

	this.server = server;
	this.jenkinsURL = jenkinsURL;
	this.endpoints = [];
	// update vars
	this.updateInterval = 10 * 1000;
	this._updateTimeout = false;

	var socket = backboneio.listen(server, {josieRunBackend: josieRunBackend});
	socket.set('log level', 2);

	this.update();
}

/**
 * Get a run by build number
 * this is a method to expose runs to express
 *
 * @param {integer} buildNumber
 * @return {JosieRun}
 */
JosieServer.prototype.getRun = function (buildNumber){
	return JosieRunFactory.getRun(buildNumber);
}

/**
 * Get all jobs in a run
 * this will also setup a backend
 * for syncing updates to clients
 *
 * @param {integer} buildNumber
 */
JosieServer.prototype.getRunJobs = function (buildNumber){
	if(!josieRunJobsBackend[buildNumber]) {
		var backendName = "run_" + buildNumber;

		josieRunJobsBackend[buildNumber] = {
			listenParams: {}
		};

		josieRunJobsBackend[buildNumber].listenParams[backendName] = backboneio.createBackend();
		josieRunJobsBackend[buildNumber].server = backboneio.listen(this.server, josieRunJobsBackend[buildNumber]);
	}
}

/**
 * Add a view endpoint
 *
 * @param {string} endpoint example: view/Dev/
 */
JosieServer.prototype.addEndpoint = function (endpoint){
	this.endpoints.push(this.jenkinsURL + endpoint);
}

/**
 * update the run all endpoints
 */
JosieServer.prototype.update = function (){
	clearTimeout(this._updateTimeout);

	var len = this.endpoints.length;
	while(len--){
		var endpoint = this.endpoints[len] + "/api/json?depth=5";
		request(endpoint, function (err, resp, body){
			if(err){
				console.log("API Request error: ", err);
				return;
			}

//			try {

				var jsonObj = JSON.parse(body),
					rows = jsonObj.table.rows;

				for(var i=0, len=rows.length; i < len; i++){

					var row = rows[i];
					JosieRunFactory.processAPIResult(row);
				}

//			} catch (e){
//				console.log("WTF", e);
//				//hrm jenkins is defective
//			}
		});
	}

	this._updateTimeout = setTimeout(this.update.bind(this), this.updateInterval);
}
