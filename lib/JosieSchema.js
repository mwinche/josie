
exports.runSummary = {
	// josie helper fields
	commit: String,
	branch: String,
	author: String,
	lastUpdated: Number,
	name: String,
	buildNumber: Number,
	date: Number,
	estimatedDuration : Number,
	changeSet: [{
		"commitId" : String,
		"timestamp" : Number,
		"author" : String,
		"comment" : String,
		"date" : Date,
		"id" : String,
		"msg" : String
	}],

		// row
	criticalAll: Boolean,
	criticalRequired: Boolean,
	description: String,
	id: String,
	rules: [ ],
	running: Boolean,
	totalFailures: Number,

	// cells
	jobs: [
		{
			buildNumber: Number,
			committers: [ ],
			critical: Boolean,
			date: Number,
			description: String,
			failures: Number,
			name: String,
			numberCommitters: Number,
			projectName: String,
			result: String,
			running: Boolean,
			visible: Boolean
		}
	]
};

exports.runDetail = {

	commit: String,
	branch: String,
	author: String,
	lastUpdated: Number,
	name: String,
	buildNumber: Number,
	date: Number,
	estimatedDuration : Number,
	changeSet: [{
		"commitHash" : String,
		"timestamp" : Number,
		"author" : String,
		"comment" : String,
		"date" : Date
	}],

	// row
	criticalAll: Boolean,
	criticalRequired: Boolean,
	description: String,
	id: String,
	rules: [ ],
	running: Boolean,
	totalFailures: Number,

	jobs: [
		{
			running: Boolean,
			result: String,
			name: String,
			projectName: String,
			failures: Number,
			building: Boolean,
			date: Number,
			number: Number,
			commitBuildNumber: Number,
			duration: Number,
			estimatedDuration : Number,
			url: String,
			failCount: Number,
			passCount: Number,
			skipCount: Number,
			testFailures: [{
				age : Number,
				className : String,
				duration : Number,
				errorDetails : String,
				errorStackTrace : String,
				failedSince : Number,
				name : String,
				skipped : Boolean,
				status : String,
				stderr : String,
				stdout : String
			}],
			artifacts: [{

			}]
		}
	]
};

exports.team = {
	name: String,
	projectID: String,
	branches: [String],
	members: [String],
	issueCount: Number,
	issueOverCount: Number,
	blockingIssueCount: Number,

	activeStories: [
		{
			ID: String,
			name: String,
			percentComplete: Number,
			pmSignOff: Boolean,
			uxSignOff: Boolean,
			techSignOff: Boolean,
			qaSignOff: Boolean
		}
	]
};

exports.branch = {
	age: Number,
	branch: {
		dead: Boolean,
		id: Number,
		name: String,
		team: {
			branchName: String,
			driftThreshold: Number,
			id: Number,
			name: String
		}
	},
	date: Date,
	drift: Number,
	filesChanged: Number,
	id: Number,
	linesAdded: Number,
	linesChanged: Number,
	linesRemoved: Number,
	newestCommit: Date,
	numCommits: Number,
	oldestCommit: Date
};
