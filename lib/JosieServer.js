var mongoose = require('mongoose')
	, backboneio = require('backbone.io')
	, request = require('request')
	, RunSummary  =require("./RunSummary")
	, RunDetail  =require("./RunDetail")
	, Branch  =require("./Branch")
	, Team  =require("./Team")
	, JSON = require('JSON');


var josieRunJobsBackend = {};

module.exports = function (app, server, jenkinsURL){

	RunSummary.init(app, server, jenkinsURL);
	RunDetail.init(app, server, jenkinsURL);
	Team.init(app, server, jenkinsURL);
	Branch.init(app, server, jenkinsURL);

	var socket = backboneio.listen(server, {
		runSummary: RunSummary.getBackend(),
		team: Team.getBackend(),
		branch: Branch.getBackend()
	});

	socket.set('log level', 2);

	return new JosieServer(app, server, jenkinsURL);
}

/**
 * Josie Server
 * @param expressServer server
 * @param String jenkinsURL url to jenkins
 * @constructor
 */
function JosieServer(app, server, jenkinsURL){

	this.app = app;
	this.server = server;
	this.jenkinsURL = jenkinsURL;

	this.endpoints = [];

	// update vars
	this.updateInterval = 10 * 1000;
	this._updateTimeout = false;

	this.update();
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

	console.log("update");

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
					RunSummary.processAPIResult(row);
				}

//			} catch (e){
//				console.log("WTF", e);
//				//hrm jenkins is defective
//			}
		});
	}

	this._updateTimeout = setTimeout(this.update.bind(this), this.updateInterval);
}

