import { Template } from 'meteor/templating';
import { Mongo } from 'meteor/mongo';
import { $ } from 'meteor/jquery';
import { _ } from 'meteor/underscore';
import { __ } from '/imports/localization/i18n.js';
import { debugAssert } from '/imports/utils/assert.js';
import { Txdefs } from '/imports/api/transactions/txdefs/txdefs.js';  // TODO get rid of
import './menu-overflow-guard.js';
import './action-buttons.html';

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
      const doc = id ? collection.findOne(id) : undefined;
      const entity = $(event.target).closest('[data-entity]').data('entity');
      const txdef = $(event.target).closest('[data-txdef]').data('txdef');
      const status = $(event.target).closest('[data-status]').data('status');
      const options = {
        entity: entity && collection.entities[entity],
        txdef: txdef && Txdefs.findOne(txdef),
        status: doc && status && doc.statusObject(status),
      };
      action.run(options, doc, event, instance);
    };
  });
  return eventHandlers;
}

//---------------------------------------------------------------------------

const buttonHelpers = {
  title() {
    const action = this.templateInstance.data.action;
    const btnText = (action.label) ? action.label(this.getOptions(), this.getDoc()) : action.name;
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
  getOptions() {
    const instanceData = this.templateInstance.data;
    if (!instanceData.options) return {};
    if (typeof instanceData.options.status === 'string') {
      const collection = Mongo.Collection.get(instanceData.collection);
      instanceData.options.status = collection.statuses[instanceData.options.status];
    }
    if (typeof instanceData.options.entity === 'string') {
      const collection = Mongo.Collection.get(instanceData.collection);
      instanceData.options.entity = collection.entities[instanceData.options.entity];
    }
    if (typeof instanceData.options.txdef === 'string') {
      instanceData.options.txdef = Txdefs.findOne(instanceData.options.txdef);
    }
    return instanceData.options;
  },
  getDoc() {
    const instanceData = this.templateInstance.data;
    if (typeof instanceData.doc === 'string') {
      const collection = Mongo.Collection.get(instanceData.collection);
      instanceData.doc = collection.findOne(instanceData.doc);
    }
    return instanceData.doc;
  },
  getActions() {
    const collection = Mongo.Collection.get(this.templateInstance.data.collection);
    const actions = this.templateInstance.data.actions
      ? this.templateInstance.data.actions.split(',').map(a => collection.actions[a])
//      : _.map(collection.actions, (action, name) => action);
      : _.values(_.omit(collection.actions, 'new', 'import', 'like', 'mute', 'block'));
    return actions;
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

//-------------------------------------------------------------

Template.Action_listitem.viewmodel(buttonHelpers);
Template.Action_sub_actions_listitems.viewmodel(buttonHelpers);
Template.Action_buttons_dropdown_list.viewmodel(buttonHelpers);
Template.Action_buttons_dropdown.viewmodel(buttonHelpers);

Template.Action_listitem.events({
  'click li.enabled'(event, instance) {
    instance.data.action.run(instance.viewmodel.getOptions(), instance.viewmodel.getDoc(), event, instance);
  },
  'click li:not(.enabled)'(event, instance) {
    event.stopPropagation();
  },
});
