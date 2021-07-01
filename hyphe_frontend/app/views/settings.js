
angular.module('hyphe.settingsController', [])

  .controller('settings', [
  function() {
    var ctrl = this
    ctrl.loading = false
    ctrl.date = new Date()
    ctrl.mindate = new Date("2015-01-01")
    ctrl.maxdate = new Date("2023-01-01")
    ctrl.setArchivesMinMaxDate = function(val) {
        console.log(val, ctrl)
    }
  }])
