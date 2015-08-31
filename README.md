#angular-viewstate

A state machine suited for angular 1.x digest

## Installation

Requires [browserify](http://browserify.org/) or similar npm-based build system.

In the command line:

```
npm install angular-viewstate --save
```

In your angular composition:

```javascript
angular.module('myModule', [])
  .factory('viewState', require('angular-viewstate'));
```

## Usage

```javascript
function controller($scope) {

  // setup states
  var state = require('angular-viewstate')
    .state('LOADING')
    .state('READY')
    .state('SAVING')
    .flag('isLoading').expression('LOADING')
    .flag('isReady').expression('!LOADING').delay(10)
    .flag('isIdle').expression('READY')
    .finalise($scope);
    
  // change state
  state.go.LOADING()
  loadSomething()
    .then(...)
    .finally(state.go.READY);
}
```

Every `state()` that is defined will produce a method on the `go` object.

Every flag `expression()` is an angular `$watch` expression where any identifier is replaced by
`(viewState === "<identifier>")`. When `finalise()` is called the watchers are installed on the given `scope`.
