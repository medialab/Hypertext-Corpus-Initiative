'use strict';

angular.module('hyphe.webentityExplorerController', [])

  .controller('webentityExplorer',
  function($scope,
    api,
    utils,
    $route,
    corpus,
    $location,
    $rootScope
  ) {
    $scope.corpusName = corpus.getName()
    $scope.corpusId = corpus.getId()

    $scope.explorerActive = false
    
    $scope.webentity = {id:utils.readWebentityIdFromRoute(), loading:true}

    var tree
    var currentNode = false

    $scope.loading = true

    $scope.pages
    $scope.subWebentities
    $scope.parentWebentities

    $scope.path
    $scope.pathUrl

    /*$scope.items_prefixes
    $scope.items_folders
    $scope.items_pages
    $scope.items_webentities*/
    $scope.item_list
    $scope.webentity_list

    $scope.creationRuleLoaded = false
    $scope.creationRule = null

/*    $scope.sort_pages = 'sortlabel'
    $scope.sort_asc_pages = true
    $scope.sort_folders = 'sortlabel'
    $scope.sort_asc_folders = true
    $scope.sort_prefixes = 'pagesCount'
    $scope.sort_asc_prefixes = false
    $scope.sort_webentities = 'sortlabel'
    $scope.sort_asc_webentities = true*/

    // Init
    api.downloadCorpusTLDs(function(){
      fetchWebentity(utils.readWebentityIdFromRoute())
    })

    $scope.goTo = function(node){
      console.log('Go to node', node)
      currentNode = node
      updateExplorer()
    }

    $scope.goToParent = function(){
      $scope.goTo(currentNode.parent)
    }

    $rootScope.$on('$locationChangeSuccess', function() {
      console.log('LocationChangeSuccess')
      if ($scope.webentity.id !== utils.readWebentityIdFromRoute()) {
        return;
      }
      if ($scope.webentity.prefixes && tree) {
        updateFromPath()
      }
      if (!~$location.path().indexOf("/webentityExplorer"))
        $location.search("p", undefined)
    })

    $scope.newWebEntity = function(obj){
      $scope.status = {message: 'Declaring web entity'}
      api.declareWebentity({
          prefixes: [obj.lru]
          ,name: utils.nameLRU(obj.lru)
          ,startPages: [obj.url]
          ,lruVariations: true
        }
        ,function(result){
          $route.reload();
        }
        ,function(){
          $scope.status = {message: 'Web entity could not be declared', background: 'danger'}
        }
      )
    }

    $scope.removePrefix = function(obj){
      $scope.status = {message: 'Removing prefix'}
      api.removePrefix({
          webentityId: $scope.webentity.id
          ,lru: obj.lru
        }
        ,function(result){
          $route.reload();
        }
        ,function(){
          $scope.status = {message: 'Prefix could not be removed', background: 'danger'}
        }
      )
    }

    $scope.mergeIntoCurrent = function(old_id){
      $scope.status = {message: 'Merging web entities'}
      api.webentityMergeInto({
          oldWebentityId: old_id
          ,goodWebentityId: $scope.webentity.id
        }
        ,function(result){
          $route.reload();
        }
        ,function(){
          $scope.status = {message: 'Web entities could not be merged', background: 'danger'}
        }
      )
    }

    /*$scope.toogleSortPrefixes = function(field){
      if($scope.sort_prefixes == field){
        $scope.sort_asc_prefixes = !$scope.sort_asc_prefixes
      } else {
        $scope.sort_asc_prefixes = true
        $scope.sort_prefixes = field
      }
    }

    $scope.toogleSortFolders = function(field){
      if($scope.sort_folders == field){
        $scope.sort_asc_folders = !$scope.sort_asc_folders
      } else {
        $scope.sort_asc_folders = true
        $scope.sort_folders = field
      }
    }

    $scope.toogleSortPages = function(field){
      if($scope.sort_pages == field){
        $scope.sort_asc_pages = !$scope.sort_asc_pages
      } else {
        $scope.sort_asc_pages = true
        $scope.sort_pages = field
      }
    }

    $scope.toogleSortWebentities = function(field){
      if($scope.sort_webentities == field){
        $scope.sort_asc_webentities = !$scope.sort_asc_webentities
      } else {
        $scope.sort_asc_webentities = true
        $scope.sort_webentities = field
      }
    }*/

    $scope.addWECreationRule = function(){
      $scope.status = {message: 'Loading'}
      $scope.loading = true

      api.addWECreationRules({
          prefix: currentNode.lru
          ,regexp: 'prefix+1'
        }
        ,function(result){

          $scope.status = {message: ''}
          $scope.loading = false
          fetchWebentity(utils.readWebentityIdFromRoute())
          updateExplorer()
        }
        ,function(){
          $scope.status = {message: 'Error adding creation rule', background: 'danger'}
        }
      )
    }

    $scope.removeWECreationRule = function(){
      $scope.status = {message: 'Loading'}
      $scope.loading = true

      api.removeWECreationRules({
          prefix: currentNode.lru
        }
        ,function(result){

          $scope.status = {message: ''}
          $scope.loading = false
          updateExplorer()
        }
        ,function(){
          $scope.status = {message: 'Error removing creation rule', background: 'danger'}
        }
      )
    }

    // Functions
    function fetchWebentity(id){

      $scope.status = {message: 'Loading'}
      
      api.getWebentities({
          id_list:[id]
          ,crawledOnly: false
        }
        ,function(result){
          $scope.webentity = result[0]
          $scope.webentity.loading = false
          $scope.webentity.prefixes.sort(utils.sort_LRUs)

          // Triple loading
          loadPages()
          loadSubWebentities()
          loadParentWebentities()
        }
        ,function(){
          $scope.status = {message: 'Error loading web entity', background: 'danger'}
        }
      )
    }

    function loadPages(){
      api.getPages({
          webentityId:$scope.webentity.id
        }
        ,function(result){

          $scope.pages = result

          checkTripleLoading()

        }
        ,function(){
          $scope.status = {message: 'Error loading pages', background: 'danger'}
        }
      )
    }

    function loadSubWebentities(){

      api.getSubWebentities({
          webentityId:$scope.webentity.id
        }
        ,function(result){

          $scope.subWebentities = result
          
          checkTripleLoading()

        }
        ,function(){
          $scope.status = {message: 'Error loading sub web entities', background: 'danger'}
        }
      )
    }

    function loadParentWebentities(){

      api.getParentWebentities({
          webentityId:$scope.webentity.id
        }
        ,function(result){

          $scope.parentWebentities = result
          
          checkTripleLoading()

        }
        ,function(){
          $scope.status = {message: 'Error loading sub web entities', background: 'danger'}
        }
      )
    }

    function checkTripleLoading(){
      var count = 0

      if($scope.pages !== undefined){
        count++
      }
      if($scope.subWebentities !== undefined){
        count++
      }
      if($scope.parentWebentities !== undefined){
        count++
      }
      if(count < 3){
        $scope.status = {message: 'Loading ' + count + '/3', progress:count*33}
      } else {
        $scope.loading = false

        buildExplorerTree()

        $scope.status = {message: ''}
      }
    }

    function loadWECreationRules(lru){

      $scope.creationRuleLoaded = false
      
      api.getWECreationRules({
          prefix:lru
        }
        ,function(result){

          $scope.creationRuleLoaded = true
          $scope.creationRule = result

        }
        ,function(){
          $scope.status = {message: 'Error loading w.e. creation rule', background: 'danger'}
        }
      )
    }
    
    function updateExplorer(){
      console.log('updateExplorer')
      $scope.item_list = []
      $scope.webentity_list = []

      var items_prefixes = []
      var items_folders = []
      var items_pages = []
      var items_webentities = []

      if(!currentNode){
        
        // Home: display prefixes
        
        for(var p in tree.prefix){
          if(tree.prefix[p].data.prefix){
            pushPrefix(
              cleanStem(p)                // label
              ,utils.LRU_to_URL(p)        // url
              ,p                          // lru
              ,tree.prefix[p]             // node
              ,tree.prefix[p].pagesCount  // page count
            )
          }
          if(tree.prefix[p].data.page){
            pushPage(
              utils.LRU_to_URL(p)         // label
              ,utils.LRU_to_URL(p)        // url
              ,p                          // lru
              ,tree.prefix[p].data.page   // page data
              ,tree.prefix[p].data.prefix // is a prefix
            )
          }
        }

        // Path
        $scope.path = []
        $scope.pathUrl = ''

        $scope.creationRuleLoaded = true
        $scope.creationRule = null

      } else {

        // Display the children

        for(var stem in currentNode.children){
          var childNode = currentNode.children[stem]
          if(childNode.data.page){
            pushPage(
              cleanStem(stem)                   // label
              ,utils.LRU_to_URL(childNode.lru)  // url
              ,childNode.lru                    // lru
              ,childNode.data.page              // page data
              ,!!childNode.data.webentity       // is a prefix
              ,stem.substr(0,1)
            )
          }
          if(childNode.data.webentity){
            pushWebentityPrefix(
              cleanStem(stem)                   // label
              ,utils.LRU_to_URL(childNode.lru)  // url
              ,childNode.lru                    // lru
              ,childNode.data.webentity         // data
            )
          }
          if(Object.keys(childNode.children).length>0){
            pushFolder(
              cleanStem(stem)                   // label
              ,utils.LRU_to_URL(childNode.lru)  // url
              ,childNode.lru                    // lru
              ,childNode                        // node
              ,childNode.pagesCount             // page data
              ,!!childNode.data.webentity       // is a prefix
              ,stem.substr(0,1)                 // type
            )
          }
        }

        // Path
        $scope.path = []
        var ancestor = currentNode
        while(ancestor !== undefined){
          var item = {
            label: cleanStem(ancestor.stem)
            ,node: ancestor
            ,pagesCount: ancestor.pagesCount
            ,data: ancestor.data || {}
          }
          $scope.path.unshift(item)
          ancestor = ancestor.parent
        }
        $scope.pathUrl = utils.LRU_to_URL(currentNode.lru)
        
        // Web entity creation rule
        loadWECreationRules(currentNode.lru)

      }

      // Compile different lists as single list
      if (items_prefixes.length > 0) {
        $scope.item_list.push({
          type: 'title',
          label: 'Prefix' + ((items_prefixes.length > 1)?('es'):('')) + ' of ' + $scope.webentity.name + ' - ' + items_prefixes.length
        })
        $scope.item_list = $scope.item_list.concat(items_prefixes)
      }
      if (items_folders.length > 0) {
        $scope.item_list.push({
          type: 'title',
          label: 'Folder' + ((items_folders.length > 1)?('s'):('')) + ' - ' + items_folders.length
        })
        $scope.item_list = $scope.item_list.concat(items_folders)
      }
      if (items_pages.length > 0) {
        $scope.item_list.push({
          type: 'title',
          label: 'Page' + ((items_pages.length > 1)?('s'):('')) + ' - ' + items_pages.length
        })
        $scope.item_list = $scope.item_list.concat(items_pages)
      }

      if (items_webentities.length > 0) {
        $scope.webentity_list.push({
          type: 'title',
          label: 'Other web entit' + ((items_webentities.length > 1)?('ies'):('y')) + ' - ' + items_webentities.length
        })
        $scope.webentity_list = $scope.webentity_list.concat(items_webentities)
      }

      // Record path in location
      if ($scope.path.length) {
        $location.search({'p':$scope.path.map(function(d){return d.node.stem}).join('/')})
      } else {
        $location.search({})
      }

      // Internal functions
      function pushPrefix(label, url, lru, node, pageCount){
        items_prefixes.push({
          label: label
          ,type: 'prefix'
          ,sortlabel: label
          ,url: url
          ,lru: lru
          ,node: node
          ,pagesCount: pageCount
        })
      }

      function pushFolder(label, url, lru, node, pageCount, isPrefix, type){
        items_folders.push({
          label: label
          ,sortlabel: label
          ,url: url
          ,lru: lru
          ,node: node
          ,pagesCount: pageCount
          ,isPrefix: isPrefix
          ,type: explicitType(type)
        })
      }

      function pushPage(label, url, lru, data, isPrefix, type){
        items_pages.push({
          label: label
          ,sortlabel: label
          ,url: url
          ,lru: lru
          ,data: data
          ,isPrefix: isPrefix
          ,crawled: data.crawled
          ,type: explicitType(type)
        })
      }

      function pushWebentityPrefix(label, url, lru, data){
        items_webentities.push({
          label: label
          ,sortlabel: label
          ,url: url
          ,lru: lru
          ,data: data
          ,webentityname: data.name
        })
      }
      
    }

    function buildExplorerTree(){
      
      // Init tree
      // It is a weird structure because it starts with prefixes, which we do not split in stems.
      tree = {prefix:{}}
      
      var prefixes = $scope.webentity.prefixes

      prefixes.forEach(function(p){
        tree.prefix[p] = {children:{}, pagesCount:0, lru:p, stem:p, data:{}}
      })

      
      var pushBranch = function(lru, properties, addPageCount){
        if (lru.length == 0) { return }

        // Check that the lru ends with a pipe
        if (lru[lru.length - 1] != "|") {
          console.warn("LRU does not end with a pipe:", lru)
          lru = lru + '|'
        }

        try{
          // Find the prefix of the lru
          var prefix = prefixes.filter(function(prefix){
              return lru.indexOf(prefix) == 0
            })
            .reduce(function(current, candidate){
              return (current.length>=candidate.length)?(current):(candidate)
            }, '')
          var path = prefix 
          var stub = lru.substr(prefix.length, lru.length - prefix.length) || ''
          var currentNode = tree.prefix[prefix]

          /*
          
          EXAMPLE
            lru =     'river|of|tears|'
            prefix =  'river|'
    
          In the beginning:
            path =    'river|'
            stub =    'of|tears|'

          We always have: path + stub = lru

          So at the next step:
            path = 'river|of|'
            stub = 'tears|'

          Until the stub is empty string

          */
          
          while(stub.length > 0){
            
            // console.log(stub)

            if(addPageCount)
              currentNode.pagesCount++
            
            var stem = stub.substr(0, stub.indexOf('|') + 1)
            if(stem.length == 0){
              throw('Empty stem')
            }
            currentNode.children[stem] = currentNode.children[stem] || {children:{}, pagesCount:0, parent:currentNode, lru:currentNode.lru+stem, stem:stem, data:{}}
            currentNode = currentNode.children[stem]
            stub = stub.substr(stem.length, stub.length)

          }

          // Copy properties
          for(var k in properties){
            currentNode.data[k] = properties[k]
          }
        } catch(e){
          console.error('Unable to push branch in explorer tree', 'lru: '+lru, e)
        }

      }

      prefixes.forEach(function(p){
        pushBranch(p, {prefix:true}, false)
      })

      $scope.pages.forEach(function(page){
        pushBranch(page.lru, {page:page}, true)
      })

      $scope.subWebentities.forEach(function(we){
        we.prefixes.forEach(function(lru){
          pushBranch(lru, {webentity:we}, false)
        })
      })

      // Now we get current node from path if possible
      updateFromPath()
      
    }

    function updateFromPath(){
      console.log('updateFromPath')
      var path = ($location.search()['p'] || '').split('/')
      var candidateNode = tree.prefix[path[0]]
      for(var i in path){
        if(i>0 && candidateNode !== undefined){
          candidateNode = candidateNode.children[path[i]]
        }
      }
      if (candidateNode != currentNode)
        $scope.goTo(candidateNode)
    }

    function cleanStem(stem){
      if(stem.match(/.*\|.*\|/gi)){
        return stem.substr(0, stem.length-1).split('|').map(function(s){return s.substr(2, s.length-2)}).join(' / ')
      } else {
        var type = stem.substr(0, 1)
        return stem.substr(2, stem.length-3)
          .replace(/[\n\r]/gi, '<line break>')
          .replace(/^$/gi, '<empty>')
          .replace(/^ $/, '<space>')
          .replace(/(  +)/, ' <spaces> ')
      }
    }

    function explicitType(type){
      switch(type){
        case('h'):
          return 'Host'
          break
        case('p'):
          return 'Path'
          break
        case('q'):
          return 'Query'
          break
        case('f'):
          return 'Fragment'
          break
        default:
          return 'Misc.'
          break
      }
    }

  })