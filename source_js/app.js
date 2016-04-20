var app = angular.module('music', ['ngRoute', 'musicControllers', 'musicServices']);

app.config(['$routeProvider', function($routeProvider) {
  $routeProvider.
  when('/login', {
    templateUrl: 'partials/landingpage.html',
    controller: 'LoginController'
  }).
  when('/pickInstrument', {
    templateUrl: 'partials/pickInstrument.html',
    controller: 'InstrumentController'
  }).
  when('/instrument/:whichInstrument', {
    templateUrl: 'partials/instruments/instrument.html',
    controller: 'InstrumentController'
  }).
  otherwise({
    redirectTo: '/login'
  });
}]);
