

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
		this.listenTo(this.collection, 'reset', this.render);
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
	}
});



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
	backend:  'josieRunBackend',
	model: RunRow,

	initialize: function(options) {
		// Setup default backend bindings
		// (see lib/browser.js for details).

		this.bindBackend();
	},

	comparator: function(newRow, existing) {
		var newBuild = newRow.get("date"),
			oldBuild = existing.get("date");

		if(newBuild === oldBuild){
			return 0;
		}

		return newBuild > oldBuild ? -1 : 1;
	}

});

var RunRowView = Backbone.View.extend({

	tagName: 'tr',
	className: "run",

	options: {
		jobs: {
			"Unit": "Unit_",
			"Locals": "Locals_",
			"JBoss": "JBoss_",
			"Firefox": "Firefox_",
			"IE": "IE_"
		},
		viewKey: "dev"
	},

	initialize: function(options) {
		this.template = _.template($('#message-template').html());
		this.model.on('change', this.render, this);
	},

	getJob: function (name){
		var jobs = this.model.get('jobs'),
			len = jobs ? jobs.length : 0;

		while(len--){
			if(jobs[len].projectName == name){
				return jobs[len];
			}
		}

		return null;
	},

	render: function() {
		var templateData = this.model.toJSON(),
			commitJob = this.getJob("Commit_dev"),
			buildJob = this.getJob("BuildAtTask_dev");

		templateData.includeSuites = [];

		for(var label in this.options.jobs){
			var jobName = this.options.jobs[label] + this.options.viewKey;

			var tmp = this.getJob(jobName);

			if(tmp === null){
				tmp = {
					projectName: jobName,
					failures: "?",
					running: true
				}
			}
			templateData.includeSuites.push(tmp);
		}

		$(this.el).html(this.template(templateData));
		this.el.setAttribute("data-branch", this.model.attributes.branch);
		this.el.setAttribute("data-author", this.model.attributes.author);
		this.el.setAttribute("data-total-failures", this.model.attributes.totalFailures);
		this.el.setAttribute("data-commit-status", commitJob ? commitJob.result : "NOT_BUILT");
		this.el.setAttribute("data-build-status", buildJob ? buildJob.result : "NOT_BUILT");
		this.el.setAttribute("data-runid", this.model.get("commit"));
		this.el.setAttribute("data-channel", this.model.get("channel"));

		if(this.model.attributes.running){
			$(this.el).addClass("running");
		}

		// let me see the change
		$(this.el).hide();
		$(this.el).addClass("just-updated");
		$(this.el).fadeIn(function (){
			$(this).removeClass("just-updated");
		});
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
		jobs: {
			"Unit": "Unit_",
			"Locals": "Locals_",
			"JBoss": "JBoss_",
			"Firefox": "Firefox_",
			"IE": "IE_"
		},
		viewKey: "dev"

	},

	initialize: function(options) {
		window.ap = [];

		this.branch = options.branch;
		this.limit = options.limit ? options.limit : false;

		this.listenTo(this.collection, 'add', this.renderNewRow);
		this.listenTo(this.collection, 'reset', this.render);

//		this.collection.on('remove', function (){
//			console.log("remove", arguments);
//		}, this);

		this.collection.on('reset', this.render, this);
		this.template = _.template($('#messages-template').html());

//		this.branchCollection = new BranchCollection();
//		this.branchesView = new BranchesView({ el: $('#josie-branches'), collection: this.branchCollection  });

		$(".filter-link").click(function (){
			var filter = $("#josie-filters"),
				display = filter.css("display");

			filter.css("display", display === "block" ? "none" : "block");
		})
	},

	render: function() {
		$(this.el).html(this.template({jobs: this.options.jobs, viewKey: this.options.viewKey}));
		$(this.el).addClass(this.className);

		this.collection.each(function(message) {
			this.renderNewRow(message);
		}.bind(this));

//		this.branchesView.render();
		return this;
	},

	renderNewRow: function (newRow){
		if(newRow.get("branch") != this.branch || (this.limit && this.$('tbody').children()	.length >= this.limit)) return;
		var view = new RunRowView({ model: newRow }),
			table = this.$('tbody'),
			rendered = view.render().el;

//			this.branchCollection.addBranch(newRow.attributes.branch);

		if(newRow.attributes.running && table.children().length ) {
			table.find("tr.run").first().before(rendered);
		} else {
			table.append(rendered);
		}

	}
});

