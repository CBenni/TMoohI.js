'use strict';

import gulp from 'gulp';
import nodemon from 'gulp-nodemon';
import babel from 'gulp-babel';
import sourceMaps from 'gulp-sourcemaps';
import Cache from 'gulp-file-cache';

const cache = new Cache();

gulp.task('compile', () => {
  const stream = gulp.src('./lib/**/*.js')
  .pipe(cache.filter())
  .pipe(sourceMaps.init())
  .pipe(babel({ presets: ['es2015'] }))
  .pipe(cache.cache())
  .pipe(sourceMaps.write('.'))
  .pipe(gulp.dest('./dist'));
  return stream;
});

gulp.task('watch', ['compile'], () => {
  const stream = nodemon({
    script: 'dist/tmoohi.js',
    watch: 'lib',
    ignore: ['gulpfile.babel.js', 'dist'],
    tasks: ['compile']
  });

  return stream;
});

gulp.task('default', ['compile', 'watch']);
