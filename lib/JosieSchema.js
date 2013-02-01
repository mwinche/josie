
// schema stuff
module.exports = {
	run: {
		runid: String,
		branch: String,
		author: String,
		totalFailures: Number,
		running: Boolean,
		name: String,
		description: String,
		numberCommitters: Number,
		testSuites: Object,
		lastUpdated: Number,
		channel: String
	},


	recentRun: {
		commit: String,
		branch: String,
		author: String,
		totalFailures: Number,
		running: Boolean,
		name: String,
		description: String,
		numberCommitters: Number,
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
		lastUpdated: Number,
		channel: String
	},

	job: {
		buildNumber: Number,
		duration: Number,
		failCount: Number,
		passCount: Number,
		skipCount: Number,
		suites: [
			{
				cases: [{
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
				duration : Number,
				id : String,
				name : String,
				stderr : String,
				stdout : String,
				timestamp : String
			}
		]
	},

	simpleJob: {
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
		failingTests: [{
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
}