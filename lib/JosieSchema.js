
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
}

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
	branches: [String],
	members: [String]
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


//
//
//// schema stuff
//module.exports = {
//	run: {
//		runid: String,
//		branch: String,
//		author: String,
//		totalFailures: Number,
//		running: Boolean,
//		name: String,
//		description: String,
//		numberCommitters: Number,
//		testSuites: Object,
//		lastUpdated: Number,
//		channel: String
//	},
//
//
//	recentRun: {
//		commit: String,
//		branch: String,
//		author: String,
//		totalFailures: Number,
//		running: Boolean,
//		name: String,
//		description: String,
//		numberCommitters: Number,
//		buildNumber: Number,
//		date: Number,
//
//		estimatedDuration : Number,
//		changeSet: [{
//			"commitId" : String,
//			"timestamp" : Number,
//			"author" : String,
//			"comment" : String,
//			"date" : Date,
//			"id" : String,
//			"msg" : String
//		}],
//		lastUpdated: Number,
//		channel: String
//	},
//
//	job: {
//		buildNumber: Number,
//		duration: Number,
//		failCount: Number,
//		passCount: Number,
//		skipCount: Number,
//		suites: [
//			{
//				cases: [{
//					age : Number,
//					className : String,
//					duration : Number,
//					errorDetails : String,
//					errorStackTrace : String,
//					failedSince : Number,
//					name : String,
//					skipped : Boolean,
//					status : String,
//					stderr : String,
//					stdout : String
//				}],
//				duration : Number,
//				id : String,
//				name : String,
//				stderr : String,
//				stdout : String,
//				timestamp : String
//			}
//		]
//	},
//
//
//
//
//
//	simpleJob: {
//		running: Boolean,
//		result: String,
//		name: String,
//		projectName: String,
//		failures: Number,
//		building: Boolean,
//		date: Number,
//		number: Number,
//		commitBuildNumber: Number,
//		duration: Number,
//		estimatedDuration : Number,
//		url: String,
//		failCount: Number,
//		passCount: Number,
//		skipCount: Number,
//		failingTests: [{
//			age : Number,
//			className : String,
//			duration : Number,
//			errorDetails : String,
//			errorStackTrace : String,
//			failedSince : Number,
//			name : String,
//			skipped : Boolean,
//			status : String,
//			stderr : String,
//			stdout : String
//		}],
//		artifacts: [{
//
//		}]
//	},
//
//
//}