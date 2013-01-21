/**
 * Module dependencies.
 */

var express = require('express')
	, http = require('http')
	, path = require('path')
	, Josie = require('./lib/Josie');

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

var josie = new Josie(server);

josie.addEndpoint("http://ci.attask.com/jenkins/view/Dev/");
//josie.addEndpoint("http://ci.attask.com/jenkins/view/Rel/");
josie.addEndpoint("http://ci.attask.com/jenkins/view/Master_new/");
