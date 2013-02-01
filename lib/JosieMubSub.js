
var mubsub = require('mubsub'),
	client = mubsub(process.env.MONGO_URL || 'mongodb://localhost:27017/josie');


module.exports = JosieMubSub;

function JosieMubSub(model, backend){
	this.model = model;
	this.backend = backend;

	this.name = model.modelName + '_mubsub';
	this.channel = client.channel(this.name);

	this.channel.subscribe({ type: 'create' }, this.handleChannelCreate.bind(this));
	this.channel.subscribe({ type: 'delete' }, this.handleChannelDelete.bind(this));
	this.channel.subscribe({ type: 'update' }, this.handleChannelUpdate.bind(this));
}

JosieMubSub.prototype.publish = function (){
	this.channel.publish.apply(this.channel, arguments);
}

JosieMubSub.prototype.handleChannelCreate = function (doc){
//	this.model.create(doc.model, function(err) {
//		if(err) {
//			console.log(err.message);
//			return;
//		}
//
//		console.log(this.name, doc.type);
		this.backend.emit('created', doc.model);
//	}.bind(this));
}

JosieMubSub.prototype.handleChannelDelete = function (doc){
	this.model.remove( {_id: doc.model._id}, function(err) {
		if(err) {
			console.log(err.message);
			return;
		}

		console.log(this.name, doc.type);
		this.backend.emit('deleted', doc.model);
	}.bind(this));
}

JosieMubSub.prototype.handleChannelUpdate = function (doc){
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

		console.log(this.name, doc.type);
		this.backend.emit('updated', doc.model);
	}.bind(this));
}
