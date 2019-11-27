import { Template } from 'meteor/templating';
import { Mongo } from 'meteor/mongo';
import { $ } from 'meteor/jquery';
import { _ } from 'meteor/underscore';
import './action-buttons.html';

export function actionHandlers(collection) {
  const collectionName = collection._name;
  const eventHandlers = {};
  _.each(collection.actions, (action, actionName) => {
    eventHandlers[`click .js-${actionName}.${collectionName},.${collectionName} .js-${actionName}`] = function (event, instance) {
      // TODO should copy all data-* atts over in one generic call
      const _id = $(event.target).closest('[data-id]').data('id');
      const entity = $(event.target).closest('[data-entity]').data('entity');
      const status = $(event.target).closest('[data-status]').data('status');
      const data = { _id, entity, status };
      action.run(data, event, instance);
    };
  });
  return eventHandlers;
}

Template.Action_button.helpers({
  title() {
    if (this.action.label) return this.action.label(this.data);
    return this.action.name;
  },
  large() {
    return this.size === 'lg';
  },
});

Template.Action_button.events({
  // This cannot be used, because Blaze.toHTML does not add the event handlers, only Blaze.render would do that
  // but Blaze.render needs the parent node, and we dont have that, so we are unable to render a template into a jquery cell.
  'click .btn-NOT-USED'(event, instance) {
    this.action.run(this.data, event, instance);
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

//-------------------------------------------------------------

Template.Action_listitem.helpers({
  title() {
    if (this.action.label) return this.action.label(this.data);
    return this.action.name;
  },
  large() {
    return this.size === 'lg';
  },
});

Template.Action_listitem.events({
  'click li'(event, instance) {
    this.action.run(this.data, event, instance);
  },
});

Template.Action_listitems_status_change.helpers({
/*  dataObject() {
    const result = {};
    _.forEach(this.data, (value, key) => {
      result[`data-${key}`] = value;
    });
    return result;
  },*/
  dataWithNewStatus(status) {
    return _.extend({}, this.data, { newStatus: status });
  },
});

Template.Action_buttons_dropdown.helpers({
  _actions() {
    const collection = Mongo.Collection.get(this.collection);
    const actions = this.actions
      ? this.actions.split(',').map(a => collection.actions[a])
//      : _.map(collection.actions, (action, name) => action);
      : _.values(_.omit(collection.actions, 'new', 'import', 'view', 'like'));
    return actions;
  },
  large() {
    return this.size === 'lg';
  },
  needsDividerAfter(action) {
    switch (action.name) {
      case 'statusChange': return true;
      default: return false;
    }
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
