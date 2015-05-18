var merge = require('lodash.merge');

/**
 * Angular factory for the view state machine.
 * @ngInject
 * @returns {{create:function, flag:function, finalise:function}}
 */
function viewStateFactory($timeout) {
  return createInstance().create;

  /**
   * Create a new instance bound to the given parameters.
   * @param parameters
   * @returns {{create: create}}
   */
  function createInstance(parameters) {

    // ensure parameters
    parameters = parameters || {
        states: {},
        flags : {}
      };

    // api
    var self = {
      create  : create,
      state   : state,
      flag    : flag,
      finalise: finalise
    };
    return self;

    /**
     * Create a new instance seperate to but based upon the existing instance.
     * @returns {{create:function, flag:function, finalise:function}}
     */
    function create() {
      return createInstance(merge({}, parameters));
    }

    /**
     * Define a state so that a <code>go.state()</code> property is created.
     * States must lead with alphabetic or underscore character and may continue with alphanumeric, underscore, or
     * dash characters.
     * @param {string} name The name of the state
     * @returns {{create:function, flag:function, finalise:function, remove:function}}
     */
    function state(name) {
      if ((typeof name === 'string') && /^[\w_][\w_\d-]*$/.test(name)) {
        parameters.states[name] = name;
      }

      // return a set of instance methods augmented with methods that act on the item
      var augmented = merge({
        remove: remove
      }, self);
      return augmented;

      /**
       * Remove the current state.
       * @returns {{create:function, flag:function, finalise:function, remove:function}}
       */
      function remove() {
        delete parameters.states[name];
        return augmented;
      }
    }

    /**
     * Define a flag based on an angular watch expression.
     * @param {string} name The name for the flag
     * @param {string} [statement] Optional expression based on the state or on other flags
     * @returns {{create:function, flag:function, finalise:function, expression:function, delay:function}}
     */
    function flag(name, statement) {
      var element;
      if (statement) {
        expression(statement);
      }

      // return a set of instance methods augmented with methods that act on the item
      var augmented = merge({
        expression: expression,
        delay     : merge(delay, {
          assert: assert,
          negate: negate
        }),
        remove    : remove
      }, self);
      return augmented;

      // create the element (in case it has been deleted)
      function init() {
        element = element || {
          name: name
        };
        parameters.flags[name] = element;
      }

      /**
       * Attach a delay to a flag.
       * @param {number|undefined} [milliseconds] A delay in milliseconds
       * @returns {{create:function, flag:function, finalise:function, expression:function, delay:function,
       * remove:function}}
       */
      function delay(milliseconds) {
        init();
        element.delayAssert = milliseconds;
        element.delayNegate = milliseconds;
        return augmented;
      }

      /**
       * Remove the current flag.
       * @returns {{create:function, flag:function, finalise:function, expression:function, delay:function,
       * remove:function}}
       */
      function remove() {
        delete parameters.flags[name];
      }

      /**
       * Attach an expression statement to a flag.
       * @param {string} statement Expression based on the state or on other flags
       * @returns {{create:function, flag:function, finalise:function, expression:function, delay:function}}
       */
      function expression(statement) {
        init();
        element.statement = statement;
        return augmented;
      }

      /**
       * Attach an assertion delay to a flag.
       * @param {number|undefined} [milliseconds] A delay in milliseconds
       * @returns {{create:function, flag:function, finalise:function, expression:function, delay:function}}
       */
      function assert(milliseconds) {
        init();
        element.delayAssert = milliseconds;
        return augmented;
      }

      /**
       * Attach an negation delay to a flag.
       * @param {number|undefined} [milliseconds] A delay in milliseconds
       * @returns {{create:function, flag:function, finalise:function, expression:function, delay:function}}
       */
      function negate(milliseconds) {
        init();
        element.delayNegate = milliseconds;
        return augmented;
      }
    }

    /**
     * Ensure that the current instance is not mutable my only allowing the <code>create()</code> method.
     * If a scope is given then we also allow the <code>go()</code> method.
     * @returns {{create:function, go:function, dispose:function, revive:function}}
     */
    function finalise(scope) {
      var watchers = {};
      var timeouts = {};
      var go = {};
      revive();
      return {
        create : create,
        go     : go,
        dispose: dispose,
        revive : revive
      };

      /**
       * Re-attach watchers for expressions.
       */
      function revive() {
        var isValid = scope && (typeof scope === 'object') && (typeof scope.$watch === 'function') &&
          (typeof scope.$on === 'function');
        if (isValid) {
          Object.keys(parameters.flags)
            .forEach(eachFlagName);
          Object.keys(parameters.states)
            .forEach(eachStateName);
        }
        return self;

        function eachFlagName(name) {
          var element = parameters.flags[name];
          var decoded = (element.statement || '').replace(/\b(\w+)\b/g, '(viewState === "$1")');
          watchers[name] = scope.$watch(decoded, setter);
          return watchers;

          function setter(value) {
            $timeout.cancel(timeouts[name]);
            var delay = value ? element.delayAssert : element.delayNegate;
            timeouts[name] = assign(element.name, value, delay);
          }
        }

        function eachStateName(name) {
          go[name] = function goToState() {
            scope.viewState = name;
          };
        }

        function assign(field, value, delay) {
          var milliseconds = parseInt(delay);
          if (isNaN(milliseconds)) {
            scope[field] = value;
            return null;
          } else {
            return $timeout(function () {
              scope[field] = value;
            }, milliseconds);
          }
        }
      }

      /**
       * Removes all watchers
       */
      function dispose() {
        while (watchers.length) {
          watchers.pop()();
        }
        for (var key in go) {
          delete go[key];
        }
        return self;
      }
    }
  }
}

module.exports = viewStateFactory;