'use strict';

var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');

gulp.task('pack-js', function () {	
	return gulp.src(['src/**/*.js'])
		.pipe(concat('angular-sp-list.js'))
		.pipe(gulp.dest('dist'))
		.pipe(uglify())
		.pipe(concat('angular-sp-list.min.js'))
		.pipe(gulp.dest('dist'));
});

gulp.task('default', function () {
  gulp.start('pack-js');
});
