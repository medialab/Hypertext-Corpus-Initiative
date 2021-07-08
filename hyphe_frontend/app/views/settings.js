angular.module('hyphe.settingsController', ['ngMaterial', 'ngMessages'])

  .controller('settings', ['$scope', 
  function($scope) {
    var ctrl = this;
    ctrl.datesuper = new Date();
    $scope.datesuper = ctrl.datesuper
    $scope.$watch("datesuper", function(oldval, newval) { 
      console.log("watch", oldval, newval, ctrl.datesuper)
    })
  }])
