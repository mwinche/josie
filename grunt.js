module.exports = function(grunt) {
	// Project configuration.
	grunt.initConfig({
		jsdoc : {
			dist : {
				src: ['lib/*.js', 'README.md'],
				dest: 'doc',
				config: 'jsdoc-config.json'
			}
		}
	});

	grunt.loadNpmTasks('grunt-jsdoc-plugin');
};

