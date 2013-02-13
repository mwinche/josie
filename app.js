/**
 * Module dependencies.
 */

var express = require('express')
	, http = require('http')
	, path = require('path')
	, request = require('request')
	, underscore = require('underscore')._
	, cons = require("consolidate")
	, mongoose = require('mongoose')
;

var app = express();

app.configure(function(){
	app.engine('html', cons.underscore);
	app.set('view engine', 'html');
	app.set('port', process.env.PORT || 3000);
	app.set('views', __dirname + '/views');
	app.use(express.favicon());
	app.use(express.logger('dev'));
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(require('less-middleware')({ src: __dirname + '/public/stylesheets' }));
});

app.configure('development', function(){
	app.use(express.errorHandler());
});

// Static things and such
app.use("/js", express.static(path.join(__dirname, '/public/js/')));
app.use("/css", express.static(path.join(__dirname, '/public/css/')));
app.use("/images", express.static(path.join(__dirname, '/public/images/')));
app.use("/plugins", express.static(path.join(__dirname, '/public/plugins/')));
app.use("/templates", express.static(path.join(__dirname, '/public/templates/')));

var server = http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});

mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost/josie', function (err){
	mongoose.connections[0].db.dropDatabase(function (){
		console.log("DROP", arguments);
		start();
	});
});

function start (){
	// init Josie
	var josieApp = require('./lib/JosieApp')(app, server, "http://ci.attask.com/jenkins/");
}

