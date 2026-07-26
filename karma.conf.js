//jshint strict: false
module.exports = function(config) {
  config.set({

    basePath: './app',

    files: [
      '../thirdparty/angular/angular.js',
      '../thirdparty/angular-ui-router/release/angular-ui-router.js',
      '../thirdparty/angular-mocks/angular-mocks.js',
      '../thirdparty/angular-touch/angular-touch.js',
      '../thirdparty/dirPagination/dirPagination.js',
      '../thirdparty/lodash.js',
      '../thirdparty/angular-local-storage/angular-local-storage.js',
      '../node_modules/bardjs/dist/bard.js',
      'test-setup.js',
      '*.js',
      '**/*.js',
      '../scripts/**/*.js'
    ],

    autoWatch: true,

    frameworks: ['jasmine', 'sinon', 'jasmine-sinon'],

    // PhantomJS was abandoned in 2018 and its launcher no longer installs on current
    // Node/macOS. Headless Chrome is the drop-in replacement.
    browsers: ['ChromeHeadless'],

    plugins: [
      'karma-chrome-launcher',
      'karma-jasmine',
      'karma-sinon',
      'karma-jasmine-sinon'
    ],

    client: {
      captureConsole: true
    }
  });
};
