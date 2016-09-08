var babel = require('gulp-babel');
var babelify = require('babelify');
var browserify = require('browserify');
var buffer = require('vinyl-buffer');
var fs = require('fs');
var gulp = require('gulp');
var imagemin = require('gulp-imagemin');
var less = require('gulp-less');
var LessPluginAutoprefix = require('less-plugin-autoprefix');
var LessPluginCleanCSS = require('less-plugin-clean-css');
var mergeStream = require('merge-stream');
var rename = require('gulp-rename');
var source = require('vinyl-source-stream');
var sourcemaps = require('gulp-sourcemaps');
var spritesmith = require('gulp.spritesmith');
var Stream = require('stream');
var uglify = require('gulp-uglifyjs');
var webworkify = require('webworkify');

const CODEMIRROR_ADDONS = ['mode/simple'];
const CODEMIRROR_MODES = ['javascript', 'css', 'xml', 'htmlmixed'];
const JQUERY_PLUGINS = ['is-in-viewport', 'jquery-knob', '@claviska/jquery-minicolors', 'jquery-ui/jquery-ui',
  'jquery-ui-timepicker-addon', 'jquitelight', 'jstree'];
const MOUSETRAP_PLUGINS = ['bind-dictionary', 'global-bind', 'pause', 'record'];
const VENDORS = ['big-integer', 'codemirror', 'cute-localize', 'dot', 'jquery', 'jszip', 'jszip-utils', 'knockout',
  'literallycanvas', 'merge', 'mobile-detect', 'moment/min/moment-with-locales', 'mousetrap', 'node-safe-filesaver',
  'sockjs-client', 'underscore', 'urijs', 'uuid', 'vk-openapi', 'xregexp']
  .concat(CODEMIRROR_ADDONS.map(name => `codemirror/addon/${name}`))
  .concat(CODEMIRROR_MODES.map(name => `codemirror/mode/${name}/${name}`))
  .concat(JQUERY_PLUGINS)
  .concat(MOUSETRAP_PLUGINS.map(name => `mousetrap/plugins/${name}/mousetrap-${name}`));

var autoprefix = new LessPluginAutoprefix({ browsers: ['> 5%'] });
var cleanCSS = new LessPluginCleanCSS({
  advanced: true,
  keepSpecialComments: 1
});

function stringStream(string) {
  var s = new Stream.Readable();
  s._read = () => {};
  s.push(string);
  s.push(null);
  return s;
}

function buildServer(custom/*, debug*/) {
  return gulp.src(custom ? './src/server/**/custom/**.js' : './src/server/**/!(custom)**.js')
  .pipe(sourcemaps.init())
  .pipe(babel({ presets: ['es2015', 'stage-2'] }))
  .pipe(sourcemaps.write('./'))
  .pipe(gulp.dest('./server'));
}

function buildSprites(custom) {
  var spriteData = gulp.src(`./src/public/img/sprites/${custom ? 'custom/' : ''}*.png`).pipe(spritesmith({
    imgName: 'icons.png',
    cssName: 'icons.css',
    imgPath: `../img/sprites${custom ? '/custom' : ''}/icons.png`,
    cssVarMap: function(sprite) {
      if (custom) {
        sprite.name = 'custom-' + sprite.name;
      }
    }
  }));
  var imgStream = spriteData.img
  .pipe(buffer())
  .pipe(imagemin())
  .pipe(gulp.dest(`./public/img/sprites${custom ? '/custom' : ''}`));
  var cssStream = spriteData.css
  .pipe(gulp.dest(`./src/public/css/${custom ? 'custom/' : ''}sprites`));
  return mergeStream(imgStream, cssStream);
}

function buildCSS(custom, debug) {
  var path = './src/public/css';
  if (custom) {
    path += '/custom';
  }
  var stream = gulp.src(fs.readdirSync(`${__dirname}/${path}`).filter(function(fileName) {
    return fileName.split('.').pop() === 'less' && 'base.less' !== fileName;
  }).map(function(fileName) {
    return `${path}/${fileName}`;
  }))
  .pipe(sourcemaps.init({ loadMaps: true }));
  var plugins = [autoprefix];
  if (!debug) {
    plugins.push(cleanCSS);
  }
  return stream.pipe(less({ plugins: plugins }))
  .pipe(sourcemaps.write('./'))
  .pipe(gulp.dest('./public/css'));
}

function buildJS(custom, debug) {
  if (!custom || fs.existsSync(`${__dirname}/src/public/js/custom/index.js`)) {
    var stream = browserify({
      entries: (custom ? './src/public/js/custom/index.js' : './src/public/js/index.js'),
      debug: debug
    });
    if (custom) {
      stream = stream.external(VENDORS);
    } else {
      VENDORS.forEach(lib => {
        stream.require(lib);
      });
    }
    stream = stream.transform('babelify', {
      presets: ['es2015', 'stage-2']
    })
    .bundle();
  } else {
    console.log('No custom scripts. Using a dummy.');
    var stream = stringStream('');
  }
  stream = stream.pipe(source('index.js'))
  .pipe(buffer());
  if (custom) {
    stream = stream.pipe(rename('custom.js'));
  }
  stream = stream.pipe(sourcemaps.init({ loadMaps: true }));
  if (!debug) {
    stream = stream.pipe(uglify());
  }
  stream = stream.pipe(sourcemaps.write('./'));
  return stream.pipe(gulp.dest('./public/js'));
}

gulp.task('build-all', ['build', 'build-custom']);
gulp.task('build', ['build-server', 'build-css', 'build-js']);
gulp.task('build-custom', ['build-custom-server', 'build-custom-css', 'build-custom-js']);

gulp.task('build-all-debug', ['build-debug', 'build-custom-debug']);
gulp.task('build-debug', ['build-server-debug', 'build-css-debug', 'build-js-debug']);
gulp.task('build-custom-debug', ['build-custom-server-debug', 'build-custom-css-debug', 'build-custom-js-debug']);

gulp.task('build-server', buildServer.bind(null, false, false));
gulp.task('internal-build-sprites', buildSprites.bind(null, false));
gulp.task('internal-build-css', buildCSS.bind(null, false, false));
gulp.task('build-css', ['internal-build-sprites', 'internal-build-css']);
gulp.task('build-js', buildJS.bind(null, false, false));
gulp.task('build-custom-server', buildServer.bind(null, true, false));
gulp.task('internal-build-custom-sprites', buildSprites.bind(null, true));
gulp.task('internal-build-custom-css', buildCSS.bind(null, true, false));
gulp.task('build-custom-css', ['internal-build-custom-sprites', 'internal-build-custom-css']);
gulp.task('build-custom-js', buildJS.bind(null, true, false));
gulp.task('build-server-debug', buildServer.bind(null, false, true));
gulp.task('internal-build-css-debug', buildCSS.bind(null, false, true));
gulp.task('build-css-debug', ['internal-build-sprites', 'internal-build-css-debug']);
gulp.task('build-js-debug', buildJS.bind(null, false, true));
gulp.task('build-custom-server-debug', buildServer.bind(null, true, true));
gulp.task('internal-build-custom-css-debug', buildCSS.bind(null, true, true));
gulp.task('build-custom-css-debug', ['internal-build-custom-sprites', 'internal-build-custom-css-debug']);
gulp.task('build-custom-js-debug', buildJS.bind(null, true, true));
