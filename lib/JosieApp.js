// Requires...
var JosieServer = require('./JosieServer'),

// local vars
	jenkinsURL,
	Team,
	RunSummary,
	josieServer;

module.exports = function (app, server, jenkinsURL){
	return new JosieApp(app, server, jenkinsURL);
}

/**
 * Josie App
 * @param expressApp server
 * @param expressServer server
 * @param String jenkinsURL url to jenkins
 * @constructor
 */
function JosieApp(app, server, url){

	this.app = app;
	this.server = server;
	this.jenkinsURL = jenkinsURL = url;

	// init local vars
	josieServer = JosieServer(app, server, jenkinsURL);


	josieServer.addEndpoint("view/Dev/");
	josieServer.addEndpoint("view/Master_new/");
	josieServer.update();



	Team = require('./Team');
	RunSummary = require('./RunSummary');

	this._setupRoutes();
}

JosieApp.prototype._setupRoutes = function (){
	this.app.get("*", function (req, res, next){
		res._pageVars = {
			title: "Home"
		}
		next();
	})
	this.app.get('/', this.routeIndex);
	this.app.get('/:team', this.routeIndex);
	this.app.get('/run/:id', this.routeRun);
	this.app.get('/jenkinsHack/', this.routeJenkinsHack);
}

JosieApp.prototype.routeIndex = function (req, res){
	var team, branches = [];

	if(req.params.team && Team.teamExists(req.params.team)){
		team = Team.getTeam(req.params.team);
	} else {
		team = Team.getTeam("Aperture");
	}

	res._pageVars = {
		title: team.get('name')
	}

	res.render('index', {
		team: team.toJSON()
	}, wrapPage.bind(res));
}

JosieApp.prototype.routeRun = function (req, res){
	var run = RunSummary.getRun(req.params.id),
		runDetail = run ? run.getRunDetail() : false;

	if(runDetail) {

		res._pageVars = {
			title: 'Run #'+ req.params.id
		}

		res.render('run/index', {
			title: 'Run #'+ req.params.id,
			run: runDetail.toJSON()
		}, wrapPage.bind(res));
	} else {

		res._pageVars = {
			title: "404 not found"
		}
		res.render('404', {
			title: 'Run not found'
		}, wrapPage.bind(res));
	}
}

JosieApp.prototype.routeJenkinsHack = function (req, res){
	request(jenkinsURL + req.query.endpoint , function (error, response, body){
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
}


function wrapPage(err, content){
	if(err) console.log("wrap page error", err);

	if(this.req.xhr){
		this.set("Content-Type", "text/html");
		console.log("xhr", content);
		//@todo make it so we can do dynamica wrappings based on the context (modals, and... nothing)
		// we have an xhr, just wrap the content in a div.wrapped
		this.end("<div class='wrapped'>" + content + "</div>");
		return;
	}

	var context = this._pageVars;

	context.content = content;
	this.render('layouts/main', context);
}