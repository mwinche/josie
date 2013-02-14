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
	, prompt = require('prompt')
	, request = require('request')
	, JSON = require('JSON')

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
//  console.log("Express server listening on port " + app.get('port'));
});

mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost/josie', function (err){
	console.log("DB", err)
	mongoose.connections[0].db.dropDatabase(function (){
		console.log("DROP", arguments);
		start();
	});
});

function start (){
	// init Josie
	console.log("START")
	var schema = {
		properties: {
			attaskUser: {
				message: 'AtTask user',
				required: true
			},
			password: {
				hidden: true
			}
		}
	};

	prompt.message = prompt.delimiter = "";
	prompt.start();
	prompt.get(schema, function (err, result) {

		process.env.ATTASK_USER = result.attaskUser;
		process.env.ATTASK_PASS = result.password;

		request("https://hub.attask.com/attask/api/login?username=" + process.env.ATTASK_USER +"&password=" + process.env.ATTASK_PASS, function (err, resp, body){

//		try {
			var data = JSON.parse(body);
			process.env.ATTASK_SESSION_ID = data.data.sessionID;
			console.log("SessionID", process.env.ATTASK_SESSION_ID);
			var josieApp = require('./lib/JosieApp')(app, server, "http://ci.attask.com/jenkins/");

//		} catch (e){
//			console.log(e);
//			exit();
//		}

		});
	});
}
