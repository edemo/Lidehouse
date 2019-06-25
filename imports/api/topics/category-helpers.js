import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { _ } from 'meteor/underscore';

Mongo.Collection.prototype.categoryHelpers = function (category, helpers) {
  var self = this;

  if (! self._helpers) throw new Meteor.Error("Can't apply category helpers to '"
    + self._name + "'. Need to specify some regular helpers first!");

  if (! self[`_${category}_helpers`]) {
    self[`_${category}_helpers`] = function Document(doc) { return _.extend(this, doc); };
    self[`_${category}_helpers`].prototype.__proto__ = self._helpers.prototype;
    self._transform = function(doc) {
      if (doc.category && self[`_${doc.category}_helpers`]) {
        return new self[`_${doc.category}_helpers`](doc);
      }
      return new self._helpers(doc);
    };
  }

  _.each(helpers, function (helper, key) {
    self[`_${category}_helpers`].prototype[key] = helper;
  });
};
