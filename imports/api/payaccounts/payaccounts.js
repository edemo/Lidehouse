import { Meteor } from 'meteor/meteor';
//import { Session } from 'meteor/session';
import { _ } from 'meteor/underscore';
import { __ } from '/imports/localization/i18n.js';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Timestamps } from '/imports/api/timestamps.js';
import { Communities } from '/imports/api/communities/communities.js';
import { debugAssert } from '/imports/utils/assert.js';

export const PayAccounts = new Mongo.Collection('payaccounts');

// Physical is 'bank acount', 'cash register', 'paypal account'... must have exactly one
// Virtual is a category for mental accounting, can have many
// Locator is a type of Virtual that already has the Parcels included, plus you can define others
PayAccounts.typeValues = ['physical', 'virtual', 'locator'];

export const choosePayAccount = {
  options() {
    return PayAccounts.find(/*{ communityId: Session.get('activeCommunityId') }*/).map(function option(account) {
      return { label: account.name, value: account._id };
    });
  },
  firstOption: () => __('(Select one)'),
};

/*
PayAccounts.schema = new SimpleSchema({
  name: { type: String },
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id },

  // An account is either a root (then it has a type)...
  type: { type: String, allowedValues: PayAccounts.typeValues, optional: true },
  // or not a root (then it has a root and a parent)
  rootId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true },
  parentId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true },
  // TODO: Can we enforce this or-or
});
*/
/*
export const choosePayAccount = {
  options() {
    return PayAccounts.findOne(this._id).leafs().map(function option(account) {
      return { label: account.name, value: account._id };
    });
  },
};
*/
PayAccounts.LeafSchema = new SimpleSchema({
  name: { type: String, max: 100 }, // or a parcel number can be placed here
  label: { type: String, max: 100, optional: true, autoform: { omit: true } },
  membersRelated: { type: Boolean, optional: true },
  //  name: { type: String, max: 100, optional: true },
//  parcelId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true },
//  parcelNo: { type: Number, decimal: true, optional: true },
});

PayAccounts.Level2Schema = new SimpleSchema({
  name: { type: String, max: 100, optional: true },
  label: { type: String, max: 100, optional: true, autoform: { omit: true } },
  children: { type: Array },
  'children.$': { type: PayAccounts.LeafSchema },
});

PayAccounts.Level1Schema = new SimpleSchema({
  name: { type: String, max: 100, optional: true },
  label: { type: String, max: 100, optional: true, autoform: { omit: true } },
  children: { type: Array },
  'children.$': { type: PayAccounts.Level2Schema },
});

PayAccounts.schema = new SimpleSchema({
  name: { type: String, max: 100 },
  label: { type: String, max: 100, optional: true, autoform: { omit: true } },
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
//  type: { type: String, allowedValues: PayAccounts.typeValues },
  children: { type: Array },
  'children.$': { type: PayAccounts.Level1Schema },
});

PayAccounts.helpers({
  init() {
    if (!this._leafs) {
      this._leafs = [];
      this._nodes = [];
      const root = this; root.parent = null; root.isLeaf = false; root.level = 0;
      if (root.name) { this._nodes.push(root); }
      this.children.forEach((level1) => {
        level1._leafs = []; level1.leafs = () => level1._leafs; level1.parent = root; level1.isLeaf = false; level1.level = 1;
        if (level1.name) { this._nodes.push(level1); }
        level1.children.forEach((level2) => {
          level2._leafs = []; level2.leafs = () => level2._leafs; level2.parent = level1; level2.isLeaf = false; level2.level = 2;
          if (level2.name) { this._nodes.push(level2); }
          level2.children.forEach((leaf) => {
            this._nodes.push(leaf);
            this._leafs.push(leaf);
            level1._leafs.push(leaf);
            level2._leafs.push(leaf);
            leaf._leafs = [leaf]; leaf.leafs = () => leaf._leafs; leaf.parent = level2; leaf.isLeaf = true; leaf.level1 = level1; leaf.level2 = level2; leaf.level = 3;
            leaf.path = () => {
              let result = '';
              if (leaf.level1.name) result += `${leaf.level1.name}/`;
              if (leaf.level2.name) result += `${leaf.level2.name}/`;
              return result;
            };
          });
        });
      });
    }
    return this;
  },
  leafs() {
    return this.init()._leafs;
  },
  nodes() {
    return this.init()._nodes;
  },
  leafNames() {
    return this.leafs().map(leaf => this.leafDisplay(leaf.name));
  },
  level1Names() {
    return _.pluck(this.nodes().filter(n => n.level === 1), 'name');
  },
  level2Names() {
    return _.pluck(this.nodes().filter(n => n.level === 2), 'name');
  },
  nodeNames() {
    return this.nodes().map(node => (node.isLeaf ? this.leafDisplay(node.name) : node.name));
  },
  leafFromName(leafName) {
    const result = this.leafs().find(l => l.name === leafName);
    return result;
  },
  leafsOf(nodeName) {
    return this.nodes().find(n => n.name === nodeName).leafs();
  },
  leafIsParcel(leafName) {
    return ((this.name === 'Könyvelés helye') && parseInt(leafName, 0));
  },
  leafDisplay(leafName) {
    if (this.leafIsParcel(leafName)) return `${leafName}. ${__('parcel')}`;
    return leafName;
  },
  leafFullPathDisplay(leaf) {
    return `${leaf.path()}${this.leafDisplay(leaf.name)}`;
  },
  nodeDisplay(node) {
    if (node.isLeaf) return this.leafDisplay(node.name);
    return node.label || node.name;
  },
  leafOptions(filter) {
    const self = this;
    return this.leafs()
      .filter(filter || (() => true))
      .map(function option(leaf) {
        return { label: self.leafFullPathDisplay(leaf), value: leaf.name }; 
      });
  },
  nodeOptions() {
    const self = this;
    return this.nodes()
      .map(function option(node) {
        return { label: self.nodeDisplay(node), value: node.name };
      });
  },
  removeSubTree(name) {
    const node = this.nodes().find(n => n.name === name);
    node.parent.children = _.without(node.parent.children, node);
    this._leafs = undefined; // to rerun init
  },
});

PayAccounts.attachSchema(PayAccounts.schema);
PayAccounts.attachSchema(Timestamps);

Meteor.startup(function attach() {
  PayAccounts.simpleSchema().i18n('schemaPayAccounts');
});

// Setting up collection permissions
const hasPermission = function hasPermission(userId, doc) {
  const user = Meteor.users.findOne(userId);
  return true; //user.hasPermission('payaccounts.update', doc.communityId);
};

PayAccounts.allow({
  insert(userId, doc) {
    return hasPermission(userId, doc);
  },
  update(userId, doc) {
    return hasPermission(userId, doc);
  },
  remove(userId, doc) {
    return hasPermission(userId, doc);
  },
});
