import { Meteor } from 'meteor/meteor';
//import { Session } from 'meteor/session';
import { _ } from 'meteor/underscore';
import { __ } from '/imports/localization/i18n.js';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Timestamps } from '/imports/api/timestamps.js';
import { Communities } from '/imports/api/communities/communities.js';
import { debugAssert } from '/imports/utils/assert.js';

export const Breakdowns = new Mongo.Collection('breakdowns');

// Physical is 'bank acount', 'cash register', 'paypal account'... must have exactly one
// Virtual is a category for mental accounting, can have many
// Locator is a type of Virtual that already has the Parcels included, plus you can define others
Breakdowns.typeValues = ['physical', 'virtual', 'locator'];

export const chooseBreakdown = {
  options() {
    return Breakdowns.find(/*{ communityId: Session.get('activeCommunityId') }*/).map(function option(account) {
      return { label: account.name, value: account._id };
    });
  },
};

/*
Breakdowns.schema = new SimpleSchema({
  name: { type: String },
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id },

  // An account is either a root (then it has a type)...
  type: { type: String, allowedValues: Breakdowns.typeValues, optional: true },
  // or not a root (then it has a root and a parent)
  rootId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true },
  parentId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true },
  // TODO: Can we enforce this or-or
});
*/
/*
export const chooseBreakdown = {
  options() {
    return Breakdowns.findOne(this._id).leafs().map(function option(account) {
      return { label: account.name, value: account._id };
    });
  },
};
*/
Breakdowns.LeafSchema = new SimpleSchema({
  name: { type: String, max: 100 }, // or a parcel number can be placed here
  label: { type: String, max: 100, optional: true, autoform: { omit: true } },
  locked: { type: Boolean, optional: true, autoform: { omit: true } },
  //  name: { type: String, max: 100, optional: true },
//  parcelId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true },
//  parcelNo: { type: Number, decimal: true, optional: true },
});

Breakdowns.Level2Schema = new SimpleSchema({
  name: { type: String, max: 100, optional: true },
  label: { type: String, max: 100, optional: true, autoform: { omit: true } },
  locked: { type: Boolean, optional: true, autoform: { omit: true } },
  children: { type: Array, optional: true },
  'children.$': { type: Breakdowns.LeafSchema },
  include: { type: String, optional: true },
});

Breakdowns.Level1Schema = new SimpleSchema({
  name: { type: String, max: 100, optional: true },
  label: { type: String, max: 100, optional: true, autoform: { omit: true } },
  locked: { type: Boolean, optional: true, autoform: { omit: true } },
  children: { type: Array, optional: true },
  'children.$': { type: Breakdowns.Level2Schema },
  include: { type: String, optional: true },
});

Breakdowns.schema = new SimpleSchema({
  name: { type: String, max: 100 },
  label: { type: String, max: 100, optional: true, autoform: { omit: true } },
  negative: { type: Boolean, optional: true, autoform: { omit: true } },
  locked: { type: Boolean, optional: true, autoform: { omit: true } },
  sign: { type: Number, allowedValues: [+1, -1], optional: true },
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
//  type: { type: String, allowedValues: Breakdowns.typeValues },
  children: { type: Array },
  'children.$': { type: Breakdowns.Level1Schema },
});

Breakdowns.helpers({
  init() {
    if (!this._leafs) {
      this._leafs = [];
      this._nodes = [];
      let currentLevel = 1;   // should start at 0, but bumping it up to 1 as we use 1 less depth in the breakdowns now
      const root = this; root.parent = null; root.isLeaf = false; root.level = currentLevel; root.pushLeaf = l => this._leafs.push(l);
      if (root.name) { root.path = root.name; this._nodes.push(root); }
      function handleNode(node, parent, pac) {
        if (node.include) {
//          console.log('Before include', pac);
          node.children = node.children || [];
          const pacToInclude = Breakdowns.findOne({ communityId: pac.communityId, name: node.include });
          if (pacToInclude) node.children = node.children.concat(pacToInclude.children);
//          console.log('After include', pac);
        }
        ++currentLevel;
        node.parent = parent;
        node._leafs = []; node.leafs = () => node._leafs; node.pushLeaf = l => { node._leafs.push(l); parent.pushLeaf(l); };
        node.isLeaf = false;
        node.level = currentLevel;
        if (node.name) { node.path = parent.path + '/' + node.name; pac._nodes.push(node); }
        if (!node.children) { parent.pushLeaf(node); node._leafs.push(node); node.isLeaf = true; }
        else { node.children.forEach(child => handleNode(child, node, pac)); }
        --currentLevel;
      }
      this.children.forEach(node => handleNode(node, root, this));
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
  nodeNames() {
    return this.nodes().map(node => (node.isLeaf ? this.leafDisplay(node.name) : __(node.name)));
  },
  leafFromName(leafName) {
    const result = this.leafs().find(l => l.name === leafName);
    return result;
  },
  leafsOf(nodeName) {
    return this.nodes().find(n => n.name === nodeName).leafs();
  },
  leafIsParcel(leafName) {
    return ((this.name === 'Localizer') && parseInt(leafName, 0));
  },
  leafDisplay(leafName) {
    if (this.leafIsParcel(leafName)) return `${leafName}. ${__('parcel')}`;
    return __(leafName);
  },
  leafFullPathDisplay(leaf) {
    return `${leaf.path}`; // ${this.leafDisplay(leaf.name)}`;
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

Breakdowns.attachSchema(Breakdowns.schema);
Breakdowns.attachSchema(Timestamps);

Meteor.startup(function attach() {
  Breakdowns.simpleSchema().i18n('schemaBreakdowns');
});

// Setting up collection permissions
const hasPermission = function hasPermission(userId, doc) {
  const user = Meteor.users.findOne(userId);
  return true; //user.hasPermission('breakdowns.update', doc.communityId);
};

Breakdowns.allow({
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
