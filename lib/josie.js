console.log("loading josie")

var mongoose = require('mongoose')
	, backboneio = require('backbone.io')
	, mubsub = require('mubsub')
	, request = require('request')
	, JosieSchema  =require("./JosieSchema")
	, JSON = require('JSON');


mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost/josie', function (err){
	console.log("mongoose connected!!", err)
});

module.exports = Josie;

function Josie(server){
	this.server = server;
	this.endpoints = [];
	this.runsToProcess = [];
	this.endpointsToSync = [];
	this.processingRuns = false;
	this.backends = {};
	this.updateInterval = 10000;

	this.model = mongoose.model('RecentRuns', mongoose.Schema(JosieSchema.run));
	this.backend = backboneio.createBackend();
	this.backend.use(backboneio.middleware.mongooseStore(this.model));
	this.registerBackend('RecentRuns', this.backend);

	backboneio.listen(this.server, this.backends);
	this.setupMubSub();
	this.sync();

	setInterval(this.sync.bind(this), this.updateInterval);
//	setInterval(this.processNextRun.bind(this), 1000);
}

Josie.prototype.registerBackend = function (name, backend){
	this.backends[name] = backend;
}

Josie.prototype.addEndpoint = function (endpoint){
	this.endpoints.push(endpoint);
//	backboneio.listen(this.server, {"RecentRuns": this.backend, "channel": endpoint});

}


Josie.prototype.sync = function sync(){
	console.log("Josie Sync");

	// we just que up endpoints to prevent duplicate rows
	if(this.runsToProcess.length !== 0 || this.endpointsToSync.length !== 0){
		console.log("Skipping sync!!!");
		console.log("	Endpoints to sync: "+ this.endpointsToSync.length);
		console.log("	Runs to process: "+ this.runsToProcess.length);
		return;
	}

	this.endpointsToSync = this.endpointsToSync.concat(this.endpoints);
	this.syncNext();
}

Josie.prototype.syncNext = function syncNext(){
	if(this.endpointsToSync.length === 0) {
		// no more endpoints to sync lets process the results
		this.processNextRun();
		return;
	}

	var endpoint = this.endpointsToSync.shift();
	request(endpoint + 'api/json?depth=5', function (error, response, body){
		this.syncRequestCallBack(error, response, body, endpoint);
	}.bind(this));
}

Josie.prototype.syncRequestCallBack = function syncRequestCallBack (error, response, body, endpoint) {
	if (!error && response.statusCode == 200) {
		var endpointMatch = endpoint.match(/view\/(.+)\//);
		if(endpointMatch.length){
			endpoint = endpointMatch[1];
		}


		var jsonObj = JSON.parse(body),
			rows = jsonObj.table.rows,
			branchRegex = /Branch\: (.+)/g,
			authRegex = /Author\: (.+)<?/g,
			commonFields = [
				"buildNumber",
				"date",
				"failures",
				"name",
				"projectName",
				"result",
				"running"
			];

		for(var i=0, len=rows.length; i < len; i++){
			var row = rows[i],
				cells = row.cells,
				tmpModel = {
					runid: row.id,
					branch: _getUniqueMatches(branchRegex, row.description)[0],
					author: _getUniqueMatches(authRegex, row.description)[0],
					totalFailures: row.totalFailures,
					running: row.running || false,
					name: cells.Commit_dev ? cells.Commit_dev.name : "Unknown",
					description: row.description,
					numberCommitters: cells.Commit_dev ? cells.Commit_dev.numberCommitters : 0,
					testSuites: {},
					channel: endpoint
				};

			for(var cell in cells){
				var tmpSuite = {};
				for(var ci=0, clen=commonFields.length; ci < clen; ci++){
					var tmpCellField = commonFields[ci];
					tmpSuite[tmpCellField] = cells[cell][tmpCellField];
				}
				tmpModel.testSuites[cell] = tmpSuite;
			}

			this.runsToProcess.push(tmpModel);
		}
	}

	// lets sync the next endpoint (if any);
	this.syncNext();
}

Josie.prototype.processNextRun = function processNextRun () {
	if(this.runsToProcess.length === 0) {
		console.log("done syncing");
		return;
	}
	this.processingRuns = true;
	this.processRunModel(this.runsToProcess.shift());
}


Josie.prototype.processRunModel = function processRunModel(tmpModel) {
	this.model.find({runid: tmpModel.runid}, function (err, result){
		if(err) {
			console.log("ERR", err.message);
			this.processNextRun();
			return;
		}

		tmpModel.lastUpdated = new Date().getTime();
		if(result.length) {
			var foundRow = result[0];

			// when its not running and they equal return
			if(tmpModel.running === false && tmpModel.running === foundRow.running) {
				this.processNextRun();
				return;
			}

			tmpModel._id = foundRow._id;
			this.mubSubChannel.publish({
				type: "update",
				model: tmpModel
			});
		} else {
			this.mubSubChannel.publish({
				type: "create",
				model: tmpModel
			});
		}

		this.processNextRun();
	}.bind(this));
}


Josie.prototype.setupMubSub = function (){
	var client = mubsub(process.env.MONGO_URL || 'mongodb://localhost:27017/josie');
	this.mubSubChannel = client.channel('RecentRuns_mubsub');
	this.mubSubChannel.subscribe({ type: 'create' }, this.handleChannelCreate.bind(this));
	this.mubSubChannel.subscribe({ type: 'delete' }, this.handleChannelDelete.bind(this));
	this.mubSubChannel.subscribe({ type: 'update' }, this.handleChannelUpdate.bind(this));
}

Josie.prototype.handleChannelCreate = function (doc){
	this.model.create(doc.model, function(err) {
		if(err) {
			console.log(err.message);
			return;
		}

		console.log(this.name +"_sub", doc.type);
		this.backend.emit('created', doc.model);
	}.bind(this));
}

Josie.prototype.handleChannelDelete = function (doc){
	this.model.remove( {_id: doc.model._id}, function(err) {
		if(err) {
			console.log(err.message);
			return;
		}

		console.log(this.name +"_sub", doc.type);
		this.backend.emit('deleted', doc.model);
	}.bind(this));
}

Josie.prototype.handleChannelUpdate = function (doc){
	var model = {};
	for (var key in doc.model) {
		model[key] = doc.model[key];
	}
	delete model._id;
	this.model.update( { _id: doc.model._id }, { '$set': model }, function(err) {
		if(err) {
			console.log(err.message);
			return;
		}

		console.log(this.name +"_sub", doc.type);
		this.backend.emit('updated', doc.model);
	}.bind(this));
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
