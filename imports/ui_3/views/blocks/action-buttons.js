import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Mongo } from 'meteor/mongo';
import { $ } from 'meteor/jquery';
import { _ } from 'meteor/underscore';
import { __ } from '/imports/localization/i18n.js';
import { debugAssert } from '/imports/utils/assert.js';
import { Log } from '/imports/utils/log.js';
import { displayError } from '/imports/ui_3/lib/errors.js';
import { Txdefs } from '/imports/api/accounting/txdefs/txdefs.js';  // TODO get rid of
import { defaultNewDoc } from '/imports/ui_3/lib/active-community.js';
import './menu-overflow-guard.js';
import './action-buttons.html';

export class ActionOptions {
  constructor(collection) {
    this.collection = collection;
  }

  fields() {
    const keys = _.toArray(Object.keys(this));
    return _.without(keys.filter(k => (typeof k !== 'function')), 'collection');
  }

  splitable() {
    return _.some(this.fields(), field => Array.isArray(this[field]));
  }

  split() { // It will split up the options to several options sets, in case array values are found in the parameters
    //Log.debug("splitting", this);
    const arrayFields = [];
    const nonArrayfields = [];
    this.fields().forEach(field => (Array.isArray(this[field]) ? arrayFields.push(field) : nonArrayfields.push(field)));
    const fixedOptions = _.pick(this.fields(), nonArrayfields);
    let results = [fixedOptions];
    arrayFields.forEach(key => {
      const values = this[key];
      const descartedResults = [];
      values.forEach(value => {
        results.forEach(obj => descartedResults.push(_.extend({}, obj, { [key]: value })));
      });
      results = descartedResults;
    });
    //Log.debug("result", results);
    return results.map(r => Object.setPrototypeOf(r, Object.getPrototypeOf(this)));
  }

  fetch() { // Wherever a string is used as parameter, it will fetch the appropriate object, named by the string
    //Log.debug("fetching", this);
    if (typeof this.status === 'string') {
      const status = this.collection.statuses[this.status];
      debugAssert(status, `No such status "${this.status}" for collection ${this.collection._name}`);
      this.status = status;
    }
    if (typeof this.entity === 'string') {
      if (this.entity + 's' === this.collection._name) {
        this.entity = { name: this.entity };
      } else {
        const entity = this.collection.entities[this.entity];
        debugAssert(entity, `No such entity "${this.entity}" for collection ${this.collection._name}`);
        this.entity = entity;
      }
    }
    if (typeof this.txdef === 'string') {
      this.txdef = Txdefs.findOne(this.txdef);
    }
    //Log.debug("result", this);
    return this;
  }
}

//---------------------------------------------------------------------------
// Apply these event handlers to your template, if the buttons are not created as Action_button templates,
// hence they don't have their event handlers yet
// (like buttons in datatables, where the buttons are not templates, just simple html)

// depreacted, can be removed:
export function actionHandlers(collection, actionNames) {
  const actions = actionNames ? actionNames.split(',').map(a => collection.actions[a]) : collection.actions;
  const eventHandlers = {};
  _.each(actions, (action) => {
    eventHandlers[`click .js-${action.name}.${collection._name},.${collection._name} .js-${action.name}`] = function (event, instance) {
      // TODO should copy all data-* atts over in one generic call
      const id = $(event.target).closest('[data-id]').data('id');
      const doc = id ? collection.findOne(id) : defaultNewDoc();
      const entity = $(event.target).closest('[data-entity]').data('entity');
      const txdef = $(event.target).closest('[data-txdef]').data('txdef');
      const status = $(event.target).closest('[data-status]').data('status');
      const options = {
        entity: entity && collection.entities[entity],
        txdef: txdef && Txdefs.findOne(txdef),
        status: doc && status && doc.statusObject(status),
      };
      Object.setPrototypeOf(options, new ActionOptions(collection));
      try { action(options, doc).run(event, instance); }
      catch (err) { displayError(err); }
    };
  });
  return eventHandlers;
}

//---------------------------------------------------------------------------

const buttonHelpers = {
  title() {
    const action = this.templateInstance.data.action;
    const btnText = (action.label) ? action.label : `actions.${action.name}.label`;
    return __(btnText).capitalize();
  },
  large() {
    return this.templateInstance.data.size === 'md' || this.templateInstance.data.size === 'xl';
  },
  long() {
    return this.templateInstance.data.size !== 'sm';
  },
  btnSize() {
    switch (this.templateInstance.data.size) {  // TODO: This is not just size, but the "kind" of the button
      case 'xl': return 'md';   // This is the large, palced on the bill footer buttons
      case 'lg': return 'xs';   // This is the long, thin version
      case 'md': return 'sm';   // This is the 'new' buttons
      case 'sm': return 'xs';   // this is the table cell buttons
      default: debugAssert(false, 'No such btn size'); return undefined;
    }
  },
  btnColor() {
    const data = this.templateInstance.data;
//    if (data.size === 'lg' || data.size === 'sm') return 'white';
    return data.action.color || 'white';
  },
  getOptions() {
    const instanceData = this.templateInstance.data;
    const collection = Mongo.Collection.get(instanceData.collection);
    instanceData.options = instanceData.options || {};
    Object.setPrototypeOf(instanceData.options, new ActionOptions(collection));
    return instanceData.options.fetch();
  },
  getDoc() {
    const instanceData = this.templateInstance.data;
    if (typeof instanceData.doc === 'string') {
      const collection = Mongo.Collection.get(instanceData.collection);
      const doc = collection.findOne(instanceData.doc);
      if (doc) instanceData.doc = doc;
      return instanceData.doc;
    }
    return instanceData.doc || defaultNewDoc();
  },
  getActions() {
    const collection = Mongo.Collection.get(this.templateInstance.data.collection);
    const actionFuncs = this.templateInstance.data.actions
      ? this.templateInstance.data.actions.split(',').map(a => collection.actions[a])
      : _.omit(collection.actions, 'create', 'import', 'like');
    const actions = _.map(actionFuncs, a => a(this.getOptions(), this.getDoc(), Meteor.userOrNull()));
    return actions;
  },
  hasVisibleAction(actions) {
    return actions && actions.some(a => a.visible);
  },
  needsDividerAfter(action) {
    return !!action.subActions;
  },
// depreacted, can be removed:
  dataObject() {
    const instanceData = this.templateInstance.data;
    const obj = {};
    obj['data-id'] = (typeof instanceData.doc === 'object') ? instanceData.doc._id : instanceData.doc;
    obj['data-status'] = instanceData.options && instanceData.options.status && instanceData.options.status.name;
    obj['data-entity'] = instanceData.options && instanceData.options.entity && instanceData.options.entity.name;
    obj['data-txdef'] = instanceData.options && instanceData.options.txdef && instanceData.options.txdef._id;
    // TODO should copy all data-* atts over in one generic call
    //  _.forEach(instanceData.options, (value, key) => {
    //    obj[`data-${key}`] = value;
    //  });
    return obj;
  },
//  extendOptions(subOptions) {
//    return _.extend({}, this.templateInstance.data.options, subOptions);
//  },
};

//-------------------------------------------------------------

Template.Action_button.viewmodel(buttonHelpers);
Template.Action_sub_actions_button.viewmodel(buttonHelpers);
Template.Action_buttons_group.viewmodel(buttonHelpers);
Template.Action_button.events({
  // This can be used most of the time to handle the click event - except when we are unable to render a proper template (like into a jquery cell).
  'click .btn'(event, instance) {
    try {
      instance.data.action.run(event, instance);
    } catch (err) { displayError(err); }
  },
});

//-------------------------------------------------------------

Template.Action_listitem.viewmodel(buttonHelpers);
Template.Action_sub_actions_listitems.viewmodel(buttonHelpers);
Template.Action_buttons_dropdown_list.viewmodel(buttonHelpers);
Template.Action_buttons_dropdown.viewmodel(buttonHelpers);

Template.Action_listitem.events({
  'click li.enabled'(event, instance) {
    try { instance.data.action.run(event, instance); }
    catch (err) { displayError(err); }
  },
  'click li:not(.enabled)'(event, instance) {
    event.stopPropagation();
  },
});
