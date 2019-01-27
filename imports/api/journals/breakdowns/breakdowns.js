import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { __ } from '/imports/localization/i18n.js';
import { debugAssert } from '/imports/utils/assert.js';
import { Timestamps } from '/imports/api/timestamps.js';

String.prototype.forEachChar = function forEachChar(func) {
  for (let i = 0; i < this.length; i++) {
    func(this.charAt(i));
  }
};

function deepCopy(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export const Breakdowns = new Mongo.Collection('breakdowns');

Breakdowns.findOneByName = function findOneByName(name, communityId) {
  return Breakdowns.findOne({ name, communityId })
      || Breakdowns.findOne({ name, communityId: { $exists: false } });
};

Breakdowns.define = function define(breakdown) {
  const existingId = Breakdowns.findOne({ name: breakdown.name, communityId: breakdown.communityId });
  if (existingId) {
    Breakdowns.update(existingId, { breakdown });
    return existingId;
  } else {
    return Breakdowns.insert(breakdown);
  }
};

export const chooseBreakdown = {
  options() {
    return Breakdowns.find(/*{ communityId: Session.get('activeCommunityId') }*/).map(function option(account) {
      return { label: account.name, value: account._id };
    });
  },
  firstOption: () => __('(Select one)'),
};

export function leafIsParcel(l) {
  return parseInt(l.name, 10);
}

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
  firstOption: () => __('(Select one)'),
};
*/
Breakdowns.LeafSchema = new SimpleSchema({
  digit: { type: String, max: 1, optional: true },
  name: { type: String, max: 100 }, // or a parcel number can be placed here
  label: { type: String, max: 100, optional: true, autoform: { omit: true } },
  locked: { type: Boolean, optional: true, autoform: { omit: true } },
  //  name: { type: String, max: 100, optional: true },
//  parcelId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true },
//  parcelNo: { type: Number, optional: true },
});

Breakdowns.Level2Schema = new SimpleSchema({
  digit: { type: String, max: 1, optional: true },
  name: { type: String, max: 100, optional: true },
  label: { type: String, max: 100, optional: true, autoform: { omit: true } },
  locked: { type: Boolean, optional: true, autoform: { omit: true } },
  children: { type: Array, optional: true },
  'children.$': { type: Breakdowns.LeafSchema },
  include: { type: String, optional: true },
});

Breakdowns.Level1Schema = new SimpleSchema({
  digit: { type: String, max: 1, optional: true },
  name: { type: String, max: 100, optional: true },
  label: { type: String, max: 100, optional: true, autoform: { omit: true } },
  locked: { type: Boolean, optional: true, autoform: { omit: true } },
  children: { type: Array, optional: true },
  'children.$': { type: Breakdowns.Level2Schema },
  include: { type: String, optional: true },
});

Breakdowns.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true },
  digit: { type: String, max: 1, optional: true },
  name: { type: String, max: 100 },
  label: { type: String, max: 100, optional: true, autoform: { omit: true } },
  locked: { type: Boolean, optional: true, autoform: { omit: true } },
  sign: { type: Number, allowedValues: [+1, -1], optional: true },
//  type: { type: String, allowedValues: Breakdowns.typeValues },
  children: { type: Array, optional: true },
  'children.$': { type: Breakdowns.Level1Schema },
  include: { type: String, optional: true },
});

/*
Breakdowns.LeafSchema = new SimpleSchema({
  digit: { type: String, max: 1, optional: true },
  name: { type: String, max: 100 }, // or a parcel number can be placed here
  label: { type: String, max: 100, optional: true, autoform: { omit: true } },
  locked: { type: Boolean, optional: true, autoform: { omit: true } },
  //  name: { type: String, max: 100, optional: true },
//  parcelId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true },
//  parcelNo: { type: Number, optional: true },
});

Breakdowns.SubSchema = new SimpleSchema([
  Breakdowns.LeafSchema, {
    include: { type: String, optional: true },
    children: { type: Array, optional: true },
    'children.$': { type: Object, blackbox: true }, // will be validated dynamically (to ensure depth)
    import: { type: String, optional: true },
  },
]);

Breakdowns.schema = new SimpleSchema([{
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true },
  sign: { type: Number, allowedValues: [+1, -1], optional: true },
}], Breakdowns.SubSchema);
*/

Breakdowns.chartOfAccounts = function chartOfAccounts(communityId) {
  const accountFamilies = Breakdowns.find({ communityId, sign: { $exists: true } });
  let accountTree = { name: ' ', children: [] };
  accountFamilies.forEach(family => accountTree.children.push(family));
  accountTree = Breakdowns._transform(accountTree);
  return accountTree;
};

/*
Breakdowns.isSubAccountOf = function isSubAccountOf(code, group, brk) {
  const communityId = this.communityId;
  const breakdown = Breakdowns.findOne({ communityId, name: brk });
  return _.contains(breakdown.leafsOf(group).map(l => l.code), code);
};
*/

Breakdowns.helpers({
  init() {
    if (!this._leafs) {
      this._leafs = [];
      this._nodes = [];
      let currentLevel = 1;   // should start at 0, but bumping it up to 1 as we use 1 less depth in the breakdowns now
      const root = this;
      root.parent = null; root.isLeaf = false; root.level = currentLevel; root.pushLeaf = l => this._leafs.push(l);
      root.path = [root.name || '']; root.code = root.digit || ''; this._nodes.push(root);
      function handleNode(node, parent, pac) {
        if (node.include) {
          if (typeof node.include === 'string') {
            node.include = // TODO (node.import is regex Id) ? Breakdowns.findOne(node.import) :
              Breakdowns.findOneByName(node.include);
          } else debugAssert(typeof node.include === 'object');
//          console.log('Before include', pac);
          node.name = node.name || node.include.name;
          node.digit = node.digit || node.include.digit;
          if (node.include.children) {
            node.children = node.children || [];
            node.children = node.children.concat(deepCopy(node.include.children));
          }
//          console.log('After include', pac);
          delete node.include;
        }
        ++currentLevel;
        node.parent = parent;
        node._leafs = []; node.leafs = () => node._leafs; node.pushLeaf = l => { node._leafs.push(l); node.parent.pushLeaf(l); };
        node.isLeaf = false;
        node.level = currentLevel;
        node.code = parent.code + (node.digit || '');
        if (!node.name) { node.path = parent.path; }
        else { node.path = parent.path.concat(node.name); pac._nodes.push(node); }
        if (!node.children) { parent.pushLeaf(node); node._leafs.push(node); node.isLeaf = true; }
        else { node.children.forEach(child => handleNode(child, node, pac)); }
        --currentLevel;
      }
      this.children.forEach(node => handleNode(node, root, this));
    }
    return this;
  },
  root() {
    return this.init();
  },
  leafs() {
    return this.init()._leafs;
  },
  nodes() {
    return this.init()._nodes;
  },
  leafNames() {
    return this.leafs().map(this.display);
  },
  nodeNames() {
    return this.nodes().map(this.display);
  },
//  leafFromName(leafName) {
//    const result = this.leafs().find(l => l.name === leafName);
//    return result;
//  },
  leafCodes() {
    return this.leafs().map(l => l.code);
  },
  leafsOf(code) {
//    let node = this.root();
//    code.forEachChar(char => node = node.)
    if (code) return this.nodes().find(n => n.code === code).leafs();
    return this.leafs();
  },
  display(node) {
    return __(node.label || node.name);
  },
  displayFullPath(node) {
    return node.path/*.map(__)*/.join(':');
  },
  leafOptions(code) {
    const self = this;
    return this.leafsOf(code)
      .map(function option(leaf) {
        return { label: self.displayFullPath(leaf), value: leaf.code };
      });
  },
  nodeOptions() {
    const self = this;
    return this.nodes()
      .map(function option(node) {
        return { label: self.displayFullPath(node), value: node.code };
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
