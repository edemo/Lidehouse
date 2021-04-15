import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { Factory } from 'meteor/dburles:factory';

import { __ } from '/imports/localization/i18n.js';
import { debugAssert } from '/imports/utils/assert.js';
import { Log } from '/imports/utils/log.js';
import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { MinimongoIndexing } from '/imports/startup/both/collection-patches.js';
import { Timestamped } from '/imports/api/behaviours/timestamped.js';
import { getActiveCommunityId } from '/imports/ui_3/lib/active-community.js';

export const Breakdowns = new Mongo.Collection('breakdowns');

Breakdowns.define = function define(doc) {
  Breakdowns.upsert({ communityId: doc.communityId, name: doc.name }, { $set: doc });
};

Breakdowns.findOneByName = function findOneByName(name, communityId = getActiveCommunityId()) {
  const result = Breakdowns.findOne({ name, communityId })
              || Breakdowns.findOne({ name, communityId: null });
  if (!result) Log.warning(`Unable to find breakdown '${name}' for community '${communityId}'`);
  return result;
};

Breakdowns.clone = function clone(name, communityId) {
  const breakdown = Breakdowns.findOne({ name, communityId: null });
  if (!breakdown) return undefined;
  Mongo.Collection.stripAdministrativeFields(breakdown);
  breakdown.communityId = communityId;
  return Breakdowns.insert(breakdown);
};

Breakdowns.name2code = function name2code(breakdownName, nodeName, communityId) {
  const breakdown = Breakdowns.findOneByName(breakdownName, communityId);
  const node = breakdown.findNodeByName(nodeName);
//  if (!node) throw new Meteor.Error(`Looking for ${nodeName} in ${breakdownName}`, 'Cannot find breakdown node');
  return node.code;
};

export const chooseBreakdown = {
  options() {
    const communityId = ModalStack.getVar('communityId');
    return Breakdowns.find({ communityId }).map(function option(breakdown) {
      return { label: breakdown.name, value: breakdown.name };
    });
  },
  firstOption: () => __('(Select one)'),
};

export function chooseSubAccount(brk, nodeCode, leafsOnly = true) {
  return {
    options() {
      const communityId = ModalStack.getVar('communityId');
      const breakdown = Breakdowns.findOneByName(brk, communityId);
      return breakdown.nodeOptionsOf(nodeCode, leafsOnly);
    },
    firstOption: false, // https://stackoverflow.com/questions/32179619/how-to-remove-autoform-dropdown-list-select-one-field
  };
}

/*
Breakdowns.schema = new SimpleSchema({
  name: { type: String },
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { type: 'hidden' } },

  // An account is either a root (then it has a type)...
  type: { type: String, allowedValues: Breakdowns.typeValues, optional: true },
  // or not a root (then it has a root and a parent)
  rootId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true },
  parentId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true },
  // TODO: Can we enforce this or-or
});
*/

Breakdowns.LeafSchema = new SimpleSchema({
  digit: { type: String, optional: true },
  name: { type: String, max: 100 }, // or a parcel number can be placed here
  label: { type: String, max: 100, optional: true, autoform: { omit: true } },
  locked: { type: Boolean, optional: true, autoform: { omit: true } },
  //  name: { type: String, max: 100, optional: true },
//  parcelId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true },
//  parcelNo: { type: Number, optional: true },
  // just for money accounts - TODO it should be some freefields here
  category: { type: String, optional: true },
  primary: { type: Boolean, optional: true },
});

Breakdowns.Level2Schema = new SimpleSchema({
  digit: { type: String, optional: true },
  name: { type: String, max: 100, optional: true },
  label: { type: String, max: 100, optional: true, autoform: { omit: true } },
  locked: { type: Boolean, optional: true, autoform: { omit: true } },
  children: { type: Array, optional: true },
  'children.$': { type: Breakdowns.LeafSchema },
  include: { type: String, optional: true, autoform: { ...chooseBreakdown } },
  // just for money accounts - TODO it should be some freefields here
  category: { type: String, optional: true },
  primary: { type: Boolean, optional: true },
});

Breakdowns.Level1Schema = new SimpleSchema({
  digit: { type: String, optional: true },
  name: { type: String, max: 100, optional: true },
  label: { type: String, max: 100, optional: true, autoform: { omit: true } },
  locked: { type: Boolean, optional: true, autoform: { omit: true } },
  children: { type: Array, optional: true },
  'children.$': { type: Breakdowns.Level2Schema },
  include: { type: String, optional: true, autoform: { ...chooseBreakdown } },
  // just for money accounts - TODO it should be some freefields here
  category: { type: String, optional: true },
  primary: { type: Boolean, optional: true },
});

Breakdowns.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { omit: true } },
  digit: { type: String, optional: true },
  name: { type: String, max: 100 },
  label: { type: String, max: 100, optional: true, autoform: { omit: true } },
  locked: { type: Boolean, optional: true, autoform: { omit: true } },
  sign: { type: Number, allowedValues: [+1, -1], optional: true, autoform: { omit: true } },
//  type: { type: String, allowedValues: Breakdowns.typeValues },
  children: { type: Array, optional: true },
  'children.$': { type: Breakdowns.Level1Schema },
  include: { type: String, optional: true, autoform: { ...chooseBreakdown } },
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
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { omit: true } },
  sign: { type: Number, allowedValues: [+1, -1], optional: true },
}], Breakdowns.SubSchema);
*/
/*
Breakdowns.isSubAccountOf = function isSubAccountOf(code, group, brk) {
  const communityId = this.communityId;
  const breakdown = Breakdowns.findOne({ communityId, name: brk });
  return _.contains(breakdown.leafsOf(group).map(l => l.code), code);
};
*/

Breakdowns.display = function display(node) {
  return `${node.code}: ${__(node.label || node.name)}`;
};

Breakdowns.displayFullPath = function displayFullPath(node) {
  return node.path./*map(__).*/join(':');
};

class BreakdownNode {
  constructor() {
    this._nodes = [];
  }
}

Breakdowns.helpers({
  init() {
    if (!this._nodes) {
      this._nodes = []; this._nodeMap = {}; const root = this;
      let currentLevel = 0;
      function handleNode(node, parent, root) {
        if (node.include) {
          if (typeof node.include === 'string') {
            node.include = Breakdowns.findOneByName(node.include, root.communityId);
          } else debugAssert(typeof node.include === 'object');
          node.name = node.name || node.include.name;
          node.digit = node.digit || node.include.digit;
          node.sign = node.sign || node.include.sign;
          if (node.include.children) {
            node.children = node.children || [];
            node.children = node.children.concat(Object.stringifyClone(node.include.children));
          }
          delete node.include;
        }
        ++currentLevel;
        if (parent) {
          node.parent = parent; node._nodes = []; 
          node.nodes = function (leafsOnly) {
            if (leafsOnly) return this._nodes.filter(n => n.isLeaf);
            return this._nodes;
          };
          node.leafs = function () { return this.nodes(true); };
        }
        node.pushNode = (n) => {
          node._nodes.push(n);
          if (node.parent) node.parent.pushNode(n);
        };
        node.isLeaf = false;
        node.level = currentLevel;
        const parentCode = parent ? parent.code : '';
        node.code = parentCode + (node.digit || '');
        const parentPath = parent ? parent.path : [];
        if (!node.name) node.path = parentPath;
        else {
          node.path = parentPath.concat(node.name);
          root._nodeMap[node.code] = node;
          node.pushNode(node);
        }
        if (!node.children) node.isLeaf = true;
        else {
          node.children.forEach(child => handleNode(child, node, root));
        }
        --currentLevel;
      }
      handleNode(root, null, root);
    }
    return this;
  },
  root() {
    return this.init();
  },
  nodes(leafsOnly) {
    const nodes = this.init()._nodes;
    if (leafsOnly) return nodes.filter(n => n.isLeaf);
    return nodes;
  },
  leafs() {
    return this.nodes(true);
  },
  nodeNames(leafsOnly) {
    return this.nodes(leafsOnly).map(n => n.name);
  },
  nodeCodes(leafsOnly) {
    return this.nodes(leafsOnly).map(l => l.code);
  },
  nodeByCode(code) {
    if (!code) return this.root();
    const node = this.root()._nodeMap[code];
    if (!node) throw new Meteor.Error('err_invalidData', 'Cannot find breakdown node by code', { Looking: code, in: this.name, names: this.nodeNames() });
    return node;
  },
  findNodeByName(name) {  // warning!! Name is not a unique id,  and searching is inefficient
    const node = this.nodes().find(l => l.name === name);
    if (!node) throw new Meteor.Error('err_invalidData', 'Cannot find breakdown node by name', { Looking: name, in: this.name, names: this.nodeNames() });
    return node;
  },
  nodesOf(code, leafsOnly) {
    if (code) return this.nodeByCode(code).nodes(leafsOnly);
    return this.nodes(leafsOnly);
  },
  leafsOf(code) {
    return this.nodesOf(code, true);
  },
  parentsOf(code) {
    if (!code) return [];
    const parents = [];
    let node = this.nodeByCode(code);
    while (node) {
      if (node.name) parents.push(node.code);
      node = node.parent;
    }
    return parents;
  },
  nodeOptions(leafsOnly) {
    const nodes = this.nodes(leafsOnly);
    return nodes.map(function option(node) {
      return { label: Breakdowns.display(node), value: node.code };
    });
  },
  nodeOptionsOf(code, leafsOnly) {
    const nodeCodes = (code instanceof Array) ? code : [code];
    const self = this;
    return nodeCodes.map(nodeCode =>
      self.nodesOf(nodeCode, leafsOnly).map(node =>
        ({ label: Breakdowns.display(node), value: node.code })
      )
    ).flat(1);
  },
  display(code) {
    const node = this.nodeByCode(code);
    return Breakdowns.display(node);
  },
  displayFullPath(code) {
    const node = this.nodeByCode(code);
    return Breakdowns.displayFullPath(node);
  },
});

Breakdowns.attachSchema(Breakdowns.schema);
Breakdowns.attachBehaviour(Timestamped);

Breakdowns.simpleSchema().i18n('schemaBreakdowns');

Factory.define('breakdown', Breakdowns, {
});
