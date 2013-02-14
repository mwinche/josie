var TeamModel = Backbone.Model.extend({});
var TeamCollection = Backbone.Collection.extend({
	model: TeamModel,
	backend: 'team'
});

var DashboardIssueView = Backbone.View.extend({
	team: null,

	initialize: function (options){
		this.listenTo(this.collection, 'reset', this.render);
		this.template = _.template($("#dashboard-issue-template").html());
	},

	render: function (){

		this.team = this.collection.where({name: this.options.team})[0];

		var templateData = this.team.toJSON();
		templateData.morale = 100 - (templateData.issueCount / 2) + (templateData.blockingIssueCount * 2) + (templateData.issueOverCount / 2);

		$(this.el).html(this.template(templateData));
	}
});

var DashboardStoryView = Backbone.View.extend({
	team: null,

	initialize: function (options){
		this.listenTo(this.collection, 'reset', this.render);
		this.template = _.template($("#dashboard-story-template").html());
	},

	render: function (){

		this.team = this.collection.where({name: this.options.team})[0];

		var templateData = this.team.toJSON(),
			len = templateData.activeStories.length;

		while(len--){
			var data = templateData.activeStories[len];

			$(this.el).append(this.template(data));
		}
	}
});

var DriftMeter = Backbone.View.extend({
	className: "branch-drift",

	initialize: function (options){
		this.template = _.template($("#drift-meter-template").html());
		this.listenTo(this.model, "change", this.update, this);
	},

	render: function (){
		var templateData = this.model.toJSON();
		templateData.driftPercent = 100 - (templateData.drift == 0 ? 0 : (templateData.drift / templateData.branch.team.driftThreshold) * 100);
		this.el.setAttribute("data-branch", templateData.branch.name);
		$(this.el).html(this.template(templateData));
		return this;
	}
});

var DriftView = Backbone.View.extend({

	initialize: function (options){
		this.listenTo(this.collection, 'reset', this.render);
	},

	render: function (){
		var team = this.options.team;
		this.collection.each(function (branch){
			if(branch.get('branch').team.name == team){
				$(this.el).append(new DriftMeter({
					model: branch
				}).render().el);
			}
		}, this);
	}
});

var BranchModel = Backbone.Model.extend({});

var BranchCollection = Backbone.Collection.extend({
	model: BranchModel,
	backend: 'branch'
});

var BranchView = Backbone.View.extend({

	tagName: 'div',

	initialize: function(options) {
		this.template = _.template($('#branch-template').html());

		this.listenTo(this.model, "change", this.update, this);
		this.model.on('change', function (){
			this.update();
		}, this);

	},

	render: function() {
		var templateData = this.model.toJSON();
		$(this.el).html(this.template(templateData));

		new JosieView({
			el: $(this.el).find(".table-view"),
			collection: josieRows,
			branch: "origin/" + this.model.get("branch").name,
			viewKey: this.model.get("branch").name.match(/rel/) ? "rel" : "dev",
			limit: 10
		}).render();
//

		return this;
	},

	update: function (){
		console.log("UPDATE BRANCH INFO");

	}
});

var TeamView = Backbone.View.extend({
	branchViews: {},

	initialize: function (options){
		this.listenTo(this.collection, 'add', this.renderNewBranch);
		this.listenTo(this.collection, 'reset', this.render);
	},

	render: function (){
		this.collection.each(function(branch) {
			this.renderNewBranch(branch);
		}.bind(this));
	},

	renderNewBranch: function (branch){
		var branchName = branch.get("branch").name;
		if(~this.options.branches.indexOf(branchName) && !this.branchViews[branchName]){

			var newEl = $("<div></div>");
			$(this.el).append(newEl)
			this.branchViews[branchName] = new BranchView({
				el: newEl,
				model: branch,
				limit: this.options.limit
			}).render();
		}
	}
});

var TeamDashboard = Backbone.View.extend({
	branchView: null,

	initialize: function (options){
		this.listenTo(this.collection, 'add', this.renderNewBranch);
		this.listenTo(this.collection, 'reset', this.render);

		this.newEl = $("<table></table>");
		$(this.el).append(this.newEl);


		var len = this.options.branches.length;
		while(len--){
			var branch = this.options.branches[len];
			if(!branch.match(/^origin/)){
				this.options.branches[len] = "origin/"+branch;
			}
		}


	},

	render: function (){
		this.branchView = new JosieView({
			el: this.newEl,
			collection: josieRows,
			limit: this.options.limit,
			filter: {
				branch: this.options.branches
			},

			onlyRunningLastSuccess: true
		}).render();
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
	backend:  'runSummary',
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
			"Un": "Unit_",
			"Lc": "Locals_",
			"JB": "JBoss_",
			"FF": "Firefox_",
			"IE": "IE_"
		},
		viewKey: "dev",
		onlyRunningLastSuccess: false
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

	_validateFilters: function (newRow){
		// filters
		if(this.options.filter){
			var keys = Object.keys(this.options.filter),
				len = keys.length;

			while(len--){
				var val = this.options.filter[keys[len]],
					rVal = newRow.get(keys[len]);

				switch(typeof val){
					case "boolean":
						if(val !== rVal){
							return false;
						}
						break;

					case "object": //array
						if(val.indexOf(rVal) === -1){
							return false;
						}
						break;
					default:
						console.log(typeof val, rVal);
				}
			}
		}

		return true;
	},

	views: {},
	myMaxBuild: 0,

	renderNewRow: function (newRow){
//		if(this.branch && (newRow.get("branch") != this.branch || (this.limit && this.$('tbody').children()	.length >= this.limit))) return;

		if(!this._validateFilters(newRow)) return;

		var buildNumber = newRow.get("buildNumber") * 1,
			running = newRow.get("running");


		if(this.options.onlyRunningLastSuccess === true && running === false){
			if(buildNumber >= this.myMaxBuild){
				if(this.myMaxBuild > 0){
					this.views[this.myMaxBuild].remove();
					this.views[this.myMaxBuild] = null;
					delete this.views[this.myMaxBuild];
				}
				this.myMaxBuild = buildNumber;
			} else {
				return;
			}
		}

		var view = this.views[buildNumber] = new RunRowView({ model: newRow , viewKey: this.options.viewKey}),
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

