
var RunRow = Backbone.Model.extend({
	idAttribute: "_id",
	initialize: function() {
		this.on('error', function(model, res) {
			alert(res.error.message);
		});
	}
});

var RunRows = Backbone.Collection.extend({

	// Specify the backend with which to sync
	backend: 'runRows_rel',

	model: RunRow,

	initialize: function(options) {
		// Setup default backend bindings
		// (see lib/browser.js for details).
		this.bindBackend();
	}
});

var RunRowView = Backbone.View.extend({

	tagName: 'tr',
	className: "run",

	options: {
		testSuites: {
			"Unit": "Unit_dev",
			"Locals": "Locals_dev",
			"JBoss": "JBoss_dev",
			"Firefox": "Firefox_dev",
			"IE": "IE_dev"
		},
	},

	initialize: function(options) {
		this.template = _.template($('#message-template').html());

		this.model.on('change', function (){
			this.render();
		}, this);

	},

	render: function() {
		var templateData = this.model.toJSON();
		templateData.includeSuites = this.options.testSuites;

		$(this.el).html(this.template(templateData));
		this.el.setAttribute("data-branch", this.model.attributes.branch);
		this.el.setAttribute("data-author", this.model.attributes.author);
		this.el.setAttribute("data-total-failures", this.model.attributes.totalFailures);

		if(this.model.attributes.running){
			$(this.el).addClass("running");
		}
		return this;
	},

	delete: function(e) {
		e.preventDefault();
		this.model.destroy();
	}
});

var JosieView = Backbone.View.extend({

	tagName: "table",
	className: "josie-view",
	options: {
		testSuites: {
			"Unit": "Unit_dev",
			"Locals": "Locals_dev",
			"JBoss": "JBoss_dev",
			"Firefox": "Firefox_dev",
			"IE": "IE_dev"
		},
	},

	initialize: function(options) {

		this.collection.on('add', this.renderNewRow, this);

		this.collection.on('remove', function (){
			console.log("remove", arguments);
		}, this);

		this.collection.on('reset', this.render, this);
		this.template = _.template($('#messages-template').html());
	},

	render: function() {
		$(this.el).html(this.template({testSuites: this.options.testSuites}));
		$(this.el).addClass(this.className);

		this.collection.each(function(message) {
			var view = new RunRowView({ model: message }),
				table = this.$('tbody'),
				rendered = view.render().el;

			if(message.attributes.running && table.children().length ) {
				table.find("tr.run").first().before(rendered);
			} else {
				table.append(rendered);
			}
		});

		return this;
	},

	renderNewRow: function (newRow){
		console.log("ADD");
		var view = new RunRowView({ model: newRow }),
			table = this.$('tbody'),
			rendered = view.render().el;


		if(newRow.attributes.running && table.children().length ) {
			table.find("tr.run").first().before(rendered);
		} else {
			table.append(rendered);
		}

	}
});



var BranchModel = Backbone.Model.extend({
	idAttribute: "_id",
	initialize: function() {
		this.on('error', function(model, res) {
			alert(res.error.message);
		});
	}
});


var BranchCollection = Backbone.Collection.extend({
	model: BranchModel,

	initialize: function(options) {
	}
});


var BranchView = Backbone.View.extend({

	tagName: 'div',

	initialize: function(options) {
		this.template = _.template($('#branch-template').html());

		this.model.on('change', function (){
			this.render();
		}, this);

	},

	render: function() {
		var templateData = this.model.toJSON();
		$(this.el).html(this.template(templateData));
		return this;
	}
});
