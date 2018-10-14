import { Template } from 'meteor/templating';
import { _ } from 'meteor/underscore';

// Copied from:
// https://gist.github.com/remcoder/3bd66a8c33e0f981bf66

// Usage:
// <ul>
//  {{#each _range 42}}
//    <li>number {{.}}</li>
//  {{/each}}
// </ul>

// Spacebars always passes an extra argument to the helper, an
// object of type Spacebars.kw.
// To make underscore function work with optional parameters
// that last argument is stripped from the argument list.
function createUnderscoreHelper(key, fun) {
  Template.registerHelper('_' + key, function () {
    const args = Array.prototype.slice.call(arguments, 0, arguments.length - 1);
    return fun.apply(null, args);
  });
}

function registerUnderscoreHelpers() {
  for (const key in _) {
    const prop = _[key];
    if (typeof (prop) === 'function') {
      createUnderscoreHelper(key, prop);
    }
  }
}

registerUnderscoreHelpers();
