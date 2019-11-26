import { Template } from 'meteor/templating';
import { Mongo } from 'meteor/mongo';
import { $ } from 'meteor/jquery';
import { _ } from 'meteor/underscore';
import './action-buttons.html';

export function actionHandlers(collection) {
  const collectionName = collection._name;
  const eventHandlers = {};
  _.each(collection.actions, (action, actionName) => {
    switch (actionName) {
      case 'new': // these actions have no corresponding doc
      case 'import':
        if (collection.entities) {
          _.each(collection.entities, (entity, entityName) => {
            eventHandlers[`click .js-${actionName}.${entityName},.${entityName} .js-${actionName}`] = function (event, instance) {
              action.run(entityName, {}, event, instance);
            };
          });
        } else {
          eventHandlers[`click .js-${actionName}.${collectionName},.${collectionName} .js-${actionName}`] = function (event, instance) {
            action.run(collectionName, {}, event, instance);
          };
        }
        break;
      default:  // the rest does have doc
        if (collection.entities) {
          _.each(collection.entities, (entity, entityName) => {
            eventHandlers[`click .js-${actionName}.${entityName},.${entityName} .js-${actionName}`] = function (event, instance) {
              const id = $(event.target).closest('[data-id]').data('id');
              action.run(id, event, instance);
            };
          });
        } else {
          eventHandlers[`click .js-${actionName}.${collectionName},.${collectionName} .js-${actionName}`] = function (event, instance) {
            const id = $(event.target).closest('[data-id]').data('id');
            action.run(id, event, instance);
          };
        }
    }
  });
  return eventHandlers;
}

Template.Action_button.helpers({
  visible() {
    return this.action.visible(this._id);
  },
  large() {
    return this.size === 'lg';
  },
});

Template.Action_button.events({
  // This cannot be used, because Blaze.toHTML does not add the event handlers, only Blaze.render would do that
  // but Blaze.render needs the parent node, and we dont have that, so we are unable to render a template into a jquery cell.
  'click .btn-NOT-USED'(event, instance) {
    if (this.action.name === 'new') {
      const entityName = this.doc ? this.doc.entityName() : this.collection;
      this.action.run(entityName, this.data, event, instance);
    } else this.action.run(this.doc, event, instance);
  },
});

Template.Action_buttons_group.helpers({
  doc() {
    const collection = Mongo.Collection.get(this.collection);
    return collection.findOne(this._id);
  },
  _actions() {
    const collection = Mongo.Collection.get(this.collection);
    const actions = this.actions
      ? this.actions.split(',').map(a => collection.actions[a])
//      : _.map(collection.actions, (action, name) => action);
      : _.values(_.omit(collection.actions, 'new', 'import'));
    return actions;
  },
});

/*
Template.Action_buttons_group_small.onCreated(function () {
  const actions = this.data.actions;
  actions.forEach(function (action) {
    Template.Action_buttons_group_small.events({
      [`click .js-${action.name}`](event, instance) {
        const id = $(event.target).closest('[data-id]').data('id');
        actions[action.name].run(id);
      },
    });
  });
});
*/
