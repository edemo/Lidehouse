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

Breakdowns.chartOfAccounts = function chartOfAccounts(communityId) {
  return Breakdowns.findOneByName('COA');
}

Breakdowns.define = function define(breakdown) {
  const existingId = Breakdowns.findOne({ name: breakdown.name, communityId: breakdown.communityId });
  if (existingId) {
    Breakdowns.update(existingId, { $set: breakdown });
    return existingId;
  } else {
    return Breakdowns.insert(breakdown);
  }
};

Breakdowns.clone = function clone(name, communityId) {
  const breakdown = Breakdowns.findOne({ name, communityId: { $exists: false } });
  if (!breakdown) return undefined;
  delete breakdown._id;
  breakdown.communityId = communityId;
  return Breakdowns.insert(breakdown);
};

Breakdowns.name2code = function name2code(breakdownName, nodeName, communityId) {
  const breakdown = Breakdowns.findOneByName(breakdownName, communityId);
  //console.log("looking for", nodeName);
  //console.log("in breakdown:", JSON.stringify(breakdown));
  const node = breakdown.findNodeByName(nodeName);
  //console.log("result:", node.code, node.name);
  return node.code;
};


export const chooseBreakdown = {
  options() {
    return Breakdowns.find(/*{ communityId: Session.get('activeCommunityId') }*/).map(function option(account) {
      return { label: account.name, value: account._id };
    });
  },
  firstOption: () => __('(Select one)'),
};

export const parcelRef2digit = function parcelRef2digit(parcelRef) {
//  return `[${parcelRef}]`;
  return parcelRef;
};

export const digit2parcelRef = function digit2parcelRef(digit) {
//  return digit.substring(1, digit.length - 1);
  return digit;
};

export function leafIsParcel(l) {
  return l.code && l.code.substr(0, 2) === '71';
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
  digit: { type: String, optional: true },
  name: { type: String, max: 100 }, // or a parcel number can be placed here
  label: { type: String, max: 100, optional: true, autoform: { omit: true } },
  locked: { type: Boolean, optional: true, autoform: { omit: true } },
  //  name: { type: String, max: 100, optional: true },
//  parcelId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true },
//  parcelNo: { type: Number, optional: true },
});

Breakdowns.Level2Schema = new SimpleSchema({
  digit: { type: String, optional: true },
  name: { type: String, max: 100, optional: true },
  label: { type: String, max: 100, optional: true, autoform: { omit: true } },
  locked: { type: Boolean, optional: true, autoform: { omit: true } },
  children: { type: Array, optional: true },
  'children.$': { type: Breakdowns.LeafSchema },
  include: { type: String, optional: true },
});

Breakdowns.Level1Schema = new SimpleSchema({
  digit: { type: String, optional: true },
  name: { type: String, max: 100, optional: true },
  label: { type: String, max: 100, optional: true, autoform: { omit: true } },
  locked: { type: Boolean, optional: true, autoform: { omit: true } },
  children: { type: Array, optional: true },
  'children.$': { type: Breakdowns.Level2Schema },
  include: { type: String, optional: true },
});

Breakdowns.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true },
  digit: { type: String, optional: true },
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
/*
Breakdowns.chartOfAccounts = function chartOfAccounts(communityId) {
  const accountFamilies = Breakdowns.find({ communityId, sign: { $exists: true } });
  let accountTree = { name: ' ', children: [] };
  accountFamilies.forEach(family => accountTree.children.push(family));
  accountTree = Breakdowns._transform(accountTree);
  return accountTree;
};
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

Breakdowns.helpers({
  init() {
    if (!this._leafs) {
      this._nodeMap = {};
      this._leafs = [];
      this._nodes = [];
      let currentLevel = 0;
      const root = this;
      function handleNode(node, parent, root) {
        if (node.include) {
          if (typeof node.include === 'string') {
            node.include = // TODO (node.import is regex Id) ? Breakdowns.findOne(node.import) :
              Breakdowns.findOneByName(node.include);
          } else debugAssert(typeof node.include === 'object');
//          console.log('Before include', root);
          node.name = node.name || node.include.name;
          node.digit = node.digit || node.include.digit;
          node.sign = node.sign || node.include.sign;
          if (node.include.children) {
            node.children = node.children || [];
            node.children = node.children.concat(deepCopy(node.include.children));
          }
//          console.log('After include', root);
          delete node.include;
        }
        ++currentLevel;
        node.parent = parent;
        node._leafs = []; node.leafs = () => node._leafs; node.pushLeaf = l => { node._leafs.push(l); if (node.parent) node.parent.pushLeaf(l); };
        node.isLeaf = false;
        node.level = currentLevel;
        const parentCode = parent ? parent.code : '';
        node.code = parentCode + (node.digit || '');
        const parentPath = parent ? parent.path : [];
        if (!node.name) { node.path = parentPath; }
        else { node.path = parentPath.concat(node.name); root._nodes.push(node); root._nodeMap[node.code] = node; }
        if (!node.children) { node._leafs.push(node); node.isLeaf = true; if (parent) parent.pushLeaf(node); }
        else { node.children.forEach(child => handleNode(child, node, root)); }
        --currentLevel;
      }
      handleNode(root, null, root);
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
    return this.leafs().map(l => l.name);
  },
  nodeNames() {
    return this.nodes().map(n => n.name);
  },
  nodeByCode(code) {
    return this.init()._nodeMap[code];
  },
  findLeafByName(name) {  // warning!! Name is not a unique id, and searching is inefficient
    return this.leafs().find(l => l.name === name);
  },
  findNodeByName(name) {  // warning!! Name is not a unique id,  and searching is inefficient
    return this.nodes().find(l => l.name === name);
  },
  leafCodes() {
    return this.leafs().map(l => l.code);
  },
  leafsOf(code) {
    if (code) return this.nodeByCode(code).leafs();
    return this.leafs();
  },
  parentsOf(code) {
    if (!code) return [];
    const parents = [];
    let node = this.nodeByCode(code);
    while (node) {
      parents.push(node.code);
      node = node.parent;
    }
    return parents;
  },
  display(code) {
    Breakdowns.display(this.nodeByCode(code));
  },
  displayFullPath(code) {
    Breakdowns.displayFullPath(this.nodeByCode(code));
  },
  leafOptions(code) {
    const self = this;
    return this.leafsOf(code)
      .map(function option(leaf) {
        return { label: Breakdowns.displayFullPath(leaf), value: leaf.code };
      });
  },
  nodeOptions() {
    const self = this;
    return this.nodes()
      .map(function option(node) {
        return { label: Breakdowns.displayFullPath(node), value: node.code };
      });
  },
  removeSubTree(name) {
    const node = this.findNodeByName(name);
    node.parent.children = _.without(node.parent.children, node);
    this._leafMap = undefined; // to rerun init
  },
});

Breakdowns.attachSchema(Breakdowns.schema);
Breakdowns.attachSchema(Timestamps);

Meteor.startup(function attach() {
  Breakdowns.simpleSchema().i18n('schemaBreakdowns');
});
