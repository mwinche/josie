
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
	}
}