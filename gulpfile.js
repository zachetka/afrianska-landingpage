const { src, dest, series, parallel, watch } = require('gulp');
const env = process.env.NODE_ENV;

const browserSync = require('browser-sync').create(); // подключение Browsersync
const gulpif = require('gulp-if'); // выбор варианта выполнения
const del = require('del'); // удаление файлов и папок
const concat = require('gulp-concat'); // объединение файлов
const fileInclude = require('gulp-file-include'); // подключение файлов друг в друга
const sourcemaps = require('gulp-sourcemaps'); // создание исходных карт
const pxtorem = require('postcss-pxtorem'); // перевод px в rem

const htmlmin = require('gulp-htmlmin'); // минификация html

const sass = require('gulp-sass'); // компиляция sass в css
sass.compiler = require('node-sass'); // указание в качестве компилятора sass-файлов NodeJS
const sassGlob = require('gulp-sass-glob'); // глобальный импорт sass-файлов
const postcss = require('gulp-postcss');
const autoprefixer = require('autoprefixer'); // проставление префиксов
const cssnano = require('cssnano'); // минификация css
const groupmedia = require('gulp-group-css-media-queries'); // группировка медиазапросов

const babel = require('gulp-babel'); // подключение Babel
const uglify = require('gulp-uglify'); // минификция js

const svgo = require('gulp-svgo'); // оптимизация svg-изображений
const svgSprite = require('gulp-svg-sprite'); // создание svg-спрайта
const imagemin = require('gulp-imagemin'); // оптимизация изображений

// работа с шаблонизаторами

/* Paths */
const path = {
    clean: 'dist',
    build: {
        html: 'dist/',
        css: 'dist/',
        js: 'dist/',
        img: 'dist/images/',
        font: 'dist/fonts',
    },
    src: {
        html: 'src/views/*.html',
        css: 'src/styles/main.scss',
        js: 'src/scripts/*.js',
        svg: 'src/svg/**/*.svg',
        img: 'src/images/**/*.{jpg,png,svg,gif,ico}',
        font: 'src/fonts/**/*.{ttf,woff,woff2}',
    },
    watch: {
        html: 'src/**/*.html',
        css: 'src/styles/**/*.scss',
        js: 'src/scripts/**/*.js',
        svg: 'src/svg/**/*.svg',
        img: 'src/images/**/*.{jpg,png,svg,gif,ico}',
        font: 'src/fonts/**/*.{woff,woff2}',
    },
    styleLibs: [],
    scriptLibs: [],
};

/* Tasks */
// Запуск локального сервера с livereload
function server() {
    browserSync.init({
        watch: true, // автоматически следить за изменениями html/css/js
        server: {
            baseDir: './dist',
        },
    });
}
exports.server = server;

// Отслеживание файлов
function observe() {
    watch(path.watch.html, html);
    watch(path.watch.css, css);
    watch(path.watch.js, js);
    watch(path.watch.svg, svg);
    watch(path.watch.img, img);
    watch(path.watch.font, font);
}
exports.observe = observe;

// Очистка директории сборки
function clean() {
    return del(path.clean);
}
exports.clean = clean;

// Работа с html-файлами
function html() {
    return src(path.src.html)
        .pipe(fileInclude({ prefix: '@@' }))
        .pipe(
            gulpif(
                env === 'prod',
                htmlmin({
                    removeComments: true,
                    collapseWhitespace: true,
                })
            )
        )
        .pipe(dest(path.build.html));
}
exports.html = html;

// Работа с css-файлами
function css() {
    return src([...path.styleLibs, path.src.css])
        .pipe(gulpif(env === 'dev', sourcemaps.init()))
        .pipe(concat('style.min.css'))
        .pipe(sassGlob())
        .pipe(sass().on('error', sass.logError))
        .pipe(gulpif(env === 'prod', groupmedia()))
        .pipe(
            gulpif(
                env === 'dev',
                postcss([
                    pxtorem({
                        // replace: false,
                        minPixelValue: 2,
                    }),
                ])
            )
        )
        .pipe(
            gulpif(
                env === 'prod',
                postcss([
                    autoprefixer({ overrideBrowserslist: 'last 2 versions' }),
                    pxtorem({
                        // replace: false,
                        minPixelValue: 2,
                    }),
                    cssnano({
                        zindex: false,
                        discardComments: { removeAll: true },
                    }),
                ])
            )
        )
        .pipe(gulpif(env === 'dev', sourcemaps.write()))
        .pipe(dest(path.build.css));
}
exports.css = css;

// Работа с js-файлами
function js() {
    return src([...path.scriptLibs, path.src.js])
        .pipe(gulpif(env === 'dev', sourcemaps.init()))
        .pipe(concat('script.min.js', { newLine: ';' }))
        .pipe(
            gulpif(
                env === 'prod',
                babel({
                    presets: ['@babel/env'],
                })
            )
        )
        .pipe(gulpif(env === 'prod', uglify()))
        .pipe(gulpif(env === 'dev', sourcemaps.write()))
        .pipe(dest(path.build.js));
}
exports.js = js;

// Работа с svg-файлами
function svg() {
    return src(path.src.svg)
        .pipe(
            svgo({
                // plugins: [{ removeAttrs: { attrs: '(fill|stroke|style|width|height|data.*)' }}]
            })
        )
        .pipe(
            svgSprite({
                mode: {
                    symbol: { sprite: '../sprite.svg' },
                },
            })
        )
        .pipe(dest(path.build.img));
}

// Работа с изображениями
function img() {
    return src(path.src.img).pipe(imagemin()).pipe(dest(path.build.img));
}

// Работа со шрифтами
function font() {
    return src(path.src.font).pipe(dest(path.build.font));
}

/* Default tasks */
exports.default = series(
    clean,
    parallel(html, css, js, svg, img),
    parallel(observe, server)
);
