const { src, dest, watch, series, parallel } = require('gulp');
const loadPlugins = require('gulp-load-plugins');
const $ = loadPlugins();
const pkg = require('./package.json');
const conf = pkg['gulp-config'];
const sizes = conf.sizes;
const autoprefixer = require('autoprefixer');
const browserSync = require('browser-sync');
const server = browserSync.create();
const isProd = process.env.NODE_ENV === 'production';
const cleanCSS = require('gulp-clean-css');
const imageminPngquant = require('imagemin-pngquant');
const imageminMozjpeg = require('imagemin-mozjpeg');

const imageminOption = [
  imageminPngquant({ quality: [0.65, 0.8] }),
  imageminMozjpeg({ quality: 85 }),
  $.imagemin.gifsicle({
    interlaced: false,
    optimizationLevel: 1,
    colors: 256,
  }),
  $.imagemin.mozjpeg(),
  $.imagemin.optipng(),
  $.imagemin.svgo(),
];

function minImage() {
  return src('./src/images/*.{png,jpg,jpeg,gif,svg}')
    .pipe($.imagemin(imageminOption))
    .pipe(dest('./dist/images'));
}

function icon(done) {
  for (let size of sizes) {
    let width = size[0];
    let height = size[1];
    src('./src/images/avatar.png')
      .pipe(
        $.imageResize({
          width,
          height,
          crop: true,
          upscale: false,
        })
      )
      .pipe($.imagemin())
      .pipe($.rename(`favicon-${width}x${height}.png`))
      .pipe(dest('./dist/images/favicon'));
  }
  done();
}

function styles() {
  return src('./src/sass/main.scss')
    .pipe($.if(!isProd, $.sourcemaps.init()))
    .pipe($.sass())
    .pipe($.autoprefixer({ cascade: false, grid: 'autoplace' }))
    .pipe($.if(!isProd, $.sourcemaps.write('.')))
    .pipe($.if(isProd, cleanCSS()))
    .pipe($.if(isProd, $.rename({ suffix: '.min' })))
    .pipe(dest('./dist/css'));
}

function scripts() {
  return src('./src/js/*.js')
    .pipe($.if(!isProd, $.sourcemaps.init()))
    .pipe($.babel())
    .pipe($.if(!isProd, $.sourcemaps.write('.')))
    .pipe($.if(isProd, $.uglify()))
    .pipe($.if(isProd, $.rename({ suffix: '.min' })))
    .pipe(dest('./dist/js'));
}

function lint() {
  return src('./src/js/*.js')
    .pipe($.eslint({ fix: true }))
    .pipe($.eslint.format())
    .pipe($.eslint.failAfterError())
    .pipe(dest('./src/js'));
}

function startAppServer() {
  server.init({
    server: {
      baseDir: 'dist/',
      index: 'index.html',
    },
  });
  watch('./src/**/*.scss', styles);
  watch('./src/js/*.js', scripts);
  watch('./src/**/*.scss').on('change', server.reload);
  watch('./src/js/*.js').on('change', server.reload);
  watch('./dist/*.html').on('change', server.reload);
}

const serve = series(parallel(styles, series(lint, scripts)), startAppServer);

exports.minImage = minImage;
exports.icon = icon;
exports.styles = styles;
exports.scripts = scripts;
exports.lint = lint;
exports.serve = serve;
