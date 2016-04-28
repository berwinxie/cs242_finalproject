var app = angular.module('music', ['ngRoute', 'musicControllers', 'musicServices', 'ngclipboard']);

app.config(['$routeProvider', function($routeProvider) {
  $routeProvider.
  // when('/login', {
  //   templateUrl: 'partials/landingpage.html',
  //   controller: 'LoginController'
  // }).
  when('/pickInstrument', {
    templateUrl: 'partials/pickInstrument.html',
    controller: 'InstrumentController'
  }).
  when('/instrument/:whichInstrument', {
    templateUrl: 'partials/instruments/instrument.html',
    controller: 'InstrumentController'
  }).
  when('/playSong', {
    templateUrl: 'partials/playSong.html',
    controller: 'InstrumentController'
  }).
  otherwise({
    redirectTo: '/pickInstrument'
  });
}]);
