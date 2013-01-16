
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
	backend: 'runRows_dev',

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
		this.el.setAttribute("data-commit-status", this.model.attributes.testSuites.Commit_dev ? this.model.attributes.testSuites.Commit_dev.result : "NOT_BUILT");
		this.el.setAttribute("data-build-status", this.model.attributes.testSuites.BuildAtTask_dev ? this.model.attributes.testSuites.BuildAtTask_dev.result : "NOT_BUILT");

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

		this.branchCollection = new BranchCollection();
		this.branchesView = new BranchesView({ el: $('#josie-branches'), collection: this.branchCollection  });

		$(".filter-link").click(function (){
			var filter = $("#josie-filters"),
				display = filter.css("display");

			filter.css("display", display === "block" ? "none" : "block");
		})
	},

	render: function() {
		$(this.el).html(this.template({testSuites: this.options.testSuites}));
		$(this.el).addClass(this.className);

		this.collection.each(function(message) {
			this.renderNewRow(message);
		}.bind(this));

		this.branchesView.render();

		return this;
	},

	renderNewRow: function (newRow){
		var view = new RunRowView({ model: newRow }),
			table = this.$('tbody'),
			rendered = view.render().el;

			this.branchCollection.addBranch(newRow.attributes.branch);

		if(newRow.attributes.running && table.children().length ) {
			table.find("tr.run").first().before(rendered);
		} else {
			table.append(rendered);
		}

	}
});



var BranchModel = Backbone.Model.extend({

});


var BranchCollection = Backbone.Collection.extend({
	model: BranchModel,
	nameSpaceStr: null,

	initialize: function(options) {

	},

	comparator: function(newBranch, existing) {

		var s = [
			newBranch.get("name"),
			existing.get("name")
		].sort();

		return s.sort()[0] == newBranch.get("name") ? -1 : 1;
	},

	addBranch: function (branch){
		if(this.where({name: branch}).length === 0){
			this.add([{name: branch}]);

			if(branch.indexOf('/') && !this.nameSpaceStr){
				var commonNameSpace = branch.split("/");
				commonNameSpace.pop();

				this.nameSpaceStr = commonNameSpace.join("/");
				this.add({name: this.nameSpaceStr});
			}
		}
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


var BranchesView = Backbone.View.extend({

	cssRules: {},
	events: {
		"change input": "handleCheckboxClick"
	},

	initialize: function(options) {
		this.collection.on('reset', this.render, this);

		console.log(this.cssRules);
	},

	render: function() {
		this.collection.sort();
		this.collection.each(function(message) {
			this.renderNewItem(message);
		}.bind(this));

		this._initStyle();
		return this;
	},

	renderNewItem: function (newItem){
		var view = new BranchView({ model: newItem }),
			rendered = view.render().el;


		this.el.appendChild(rendered);
	},

	handleCheckboxClick: function(event){
		this.toggleBranch(event.target.value, event.target.checked);
	},


	toggleBranch: function toggleBranch(branch, show){
		if(!this.cssRules[branch]){
			this.cssRules[branch] = this._addRule("tr.run[data-branch='"+ branch +"']{}");
		}

		this.cssRules[branch].style.display = show ? "table-row" : "none";

		console.log(branch, show, this.cssRules[branch].style.display);
	},

	_initStyle: function _initStyle(){
		if(this.collection.nameSpaceStr){
			var styleSheet = document.styleSheets[0], // we should always have one stylesheet
				cssRules = styleSheet.cssRules;

			this.cssRules[this.collection.nameSpaceStr] = this._addRule("tr.run{}");
		}
	},

	_addRule: function _addRule(rule){
		return document.styleSheets[0].cssRules[document.styleSheets[0].insertRule(rule, document.styleSheets[0].length)];
	},
});
