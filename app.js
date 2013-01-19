/**
 * Module dependencies.
 */

var express = require('express')
  , http = require('http')
  , path = require('path')
  , mongoose = require('mongoose')
  , backboneio = require('backbone.io')
  , request = require('request')
  , JSON = require('JSON');



var app = express();

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(require('less-middleware')({ src: __dirname + '/public/stylesheets' }));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.use('/', express.static(path.join(__dirname, '/public/')));

var server = http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});


//// @todo - Redo below here


mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost/josie', function (err){
    console.log("mongoose connected!!", err)
});


var jenkinsViews = {
    "dev": "http://ci.attask.com/jenkins/view/Dev/",
    "rel": "http://ci.attask.com/jenkins/view/Rel/"
}

var RunSchema = mongoose.Schema({
    runid: String,
    branch: String,
    author: String,
    totalFailures: Number,
    running: Boolean,
    name: String,
    description: String,
    numberCommitters: Number,
    testSuites: Object,
    lastUpdated: Number,
    endPoint: String
});

var mubsub = require('mubsub');
var client = mubsub(process.env.MONGO_URL || 'mongodb://localhost:27017/josie');

var Josie = function (){
    this.backends = {};
}

Josie.prototype.registerBackend = function (name, backend){
    this.backends[name] = backend;
}

Josie.prototype.listen = function (){
    backboneio.listen(server, this.backends);
}

var JosieView = function (name, endPoint){
    this.name = name;
    this.endPoint = endPoint;

    this.model = mongoose.model('JosieRunModel_' + this.name, RunSchema);

    this.backend = backboneio.createBackend();
    this.backend.use(backboneio.middleware.mongooseStore(this.model));
    josie.registerBackend('runRows_'+this.name, this.backend);

    this.mubSubChannel = client.channel('JosieView_'+ this.name);

    this.mubSubChannel.subscribe({ type: 'create' }, this.handleChannelCreate.bind(this));
    this.mubSubChannel.subscribe({ type: 'delete' }, this.handleChannelDelete.bind(this));
    this.mubSubChannel.subscribe({ type: 'update' }, this.handleChannelUpdate.bind(this));

    this.update();
}

JosieView.prototype.handleChannelCreate = function (doc){
    this.model.create(doc.model, function(err) {
        if(err) {
            console.log(err.message);
            return;
        }

        console.log(this.name +"_sub", doc.type);
        this.backend.emit('created', doc.model);
    }.bind(this));
}

JosieView.prototype.handleChannelDelete = function (doc){
    this.model.remove( {_id: doc.model._id}, function(err) {
        if(err) {
            console.log(err.message);
            return;
        }

        console.log(this.name +"_sub", doc.type);
        this.backend.emit('deleted', doc.model);
    }.bind(this));
}

JosieView.prototype.handleChannelUpdate = function (doc){
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

JosieView.prototype.processRunModel = function (tmpModel) {
    this.model.find({runid: tmpModel.runid}, function (err, result){
        if(err) {
            console.log("ERR", err.message);
            return;
        }

        tmpModel.lastUpdated = new Date().getTime();
        if(result.length) {
            var foundRow = result[0];

            // when its not running and they equal return
            if(tmpModel.running === false && tmpModel.running === foundRow.running) return;

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
    }.bind(this));
}

JosieView.prototype.update = function (){
    console.log("UPDATING", this.name);
    request(this.endPoint + 'api/json?depth=5', function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var jsonObj = JSON.parse(body),
                rows = jsonObj.table.rows,
                branchRegex = /Branch\: (.+)/g,
                authRegex = /Author\: (.+)</g,
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
                        endPoint: this.endPoint
                    };

                for(var cell in cells){
                    var tmpSuite = {};
                    for(var ci=0, clen=commonFields.length; ci < clen; ci++){
                        var tmpCellField = commonFields[ci];
                        tmpSuite[tmpCellField] = cells[cell][tmpCellField];
                    }
                    tmpModel.testSuites[cell] = tmpSuite;
                }

                this.processRunModel(tmpModel);

            }
        }

        console.log("DONE", this.name);
        setTimeout(this.update.bind(this), 10000);
    }.bind(this));

}

var josie = new Josie();
for(var name in jenkinsViews){
    new JosieView(name, jenkinsViews[name]);
}
josie.listen();

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

