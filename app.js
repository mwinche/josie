/**
 * Module dependencies.
 */

var express = require('express')
	, http = require('http')
	, path = require('path')
	, JosieServer = require('./lib/JosieServer')
	, request = require('request')
	, underscore = require('underscore')._
	, cons = require("consolidate");

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

// routes
app.get('/', function(req, res){
	res.render('index', {
		title: 'Home'
	}, wrapPage.bind(res));
});

app.get('/run/:id', function(req, res){
	var run = josie.getRun(req.params.id),
		jobs = josie.getRunJobs(req.params.id);

	if(run) {
		res.render('run/index', {
			title: 'Run #'+ req.params.id,
			run: run.toJSON()
		}, wrapPage.bind(res));
	} else {
		res.render('404', {
			title: 'Run not found'
		}, wrapPage.bind(res));
	}

});

function wrapPage(err, content){
	if(this.req.xhr){
		//@todo make it so we can do dynamica wrappings based on the context (modals, and... nothing)
		// we have an xhr, just wrap the content in a div.wrapped
		this.end("<div class='wrapped'>" + content + "</div>");
		return;
	}

	if(err) console.log("wrap page error", err);
	var context = {
		title: "Josie",
		content: content
	}

	this.render('layouts/main', context);
}


// this is a hack for jenkins
var testFailuresRegex = /toggleStackTrace\('([a-zA-Z\.\#]+)'\)/g;
app.get('/jenkinsHack/', function (req, res){
	request('http://ci.attask.com/jenkins/' + req.query.endpoint , function (error, response, body){
		var fails = [],
			match,
			fakeResponse = {
				failCount: 0,
				suites: []
			},
			fakeSuite = {cases: []};

		while(match = testFailuresRegex.exec(body)){
			var test = match[1],
				testAr = test.split("#"),
				fakeFail = {
					className: testAr[0],
					name: testAr[1],
					status: "FAILED"
				};

			if(fails.indexOf(test) === -1){
				fails.push(test);
				fakeSuite.cases.push(fakeFail);
				fakeResponse.failCount++;
			}
		}

		fakeResponse.suites.push(fakeSuite);
		res.send(fakeResponse);
	});
});

var server = http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});



var josie = new JosieServer(server, "http://ci.attask.com/jenkins/");

josie.addEndpoint("view/Dev/");
//josie.addEndpoint("http://ci.attask.com/jenkins/view/Rel/");
josie.addEndpoint("view/Master_new/");
josie.update();
