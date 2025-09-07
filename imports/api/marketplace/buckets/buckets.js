import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { _ } from 'meteor/underscore';

import { __ } from '/imports/localization/i18n.js';
import { debugAssert, productionAssert } from '/imports/utils/assert.js';
import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { getActiveCommunityId } from '/imports/ui_3/lib/active-community.js';
import { modifierChangesField, autoValueUpdate } from '/imports/api/mongo-utils.js';
import { allowedOptions } from '/imports/utils/autoform.js';
import { Timestamped } from '/imports/api/behaviours/timestamped.js';
import { TemplatedMongoCollection } from '/imports/api/accounting/templates/templated-collection.js'; // TODO: move the folder
import { Templates } from '/imports/api/accounting/templates/templates.js';
import { Communities } from '/imports/api/communities/communities.js';

export const Buckets = new TemplatedMongoCollection('buckets', 'code');
Buckets.rootCode = '>';

Buckets.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { type: 'hidden' } },
  name: { type: String, max: 100 },
  code: { type: String, max: 25 },
  isGroup: { type: Boolean, optional: true, autoform: { omit: true } },
});

Meteor.startup(function indexBuckets() {
  if (Meteor.isServer) {
    Buckets._ensureIndex({ communityId: 1, code: 1 });
    Buckets._ensureIndex({ communityId: 1, name: 1 });
  }
});

Buckets.helpers({
  nodes(communityId, leafsOnly = false) {
    debugAssert(communityId);
    const regexp = new RegExp('^' + this.code + (leafsOnly ? '.+' : ''));
    return Buckets.findTfetch({ communityId, code: regexp }, { sort: { code: 1 } });
  },
  leafs(communityId) {
    debugAssert(communityId);
    return this.nodes(communityId, true);
  },
  parent() {
    // TODO
  },
  parents() {
    // TODO
  },
  displayFull() {
    return `${this.code}: ${__(this.label || this.name)}`;
  },
  asOption() {
    return { label: __(this.name), value: this.code };
  },
  nodeOptions(communityId, leafsOnly) {
    const nodes = this.nodes(communityId, leafsOnly);
    return nodes.map(node => node.asOption());
  },
});

Buckets.move = function move(communityId, codeFrom, codeTo) {
  const Listings = Mongo.Collection.get('listings');
  const listings = Listings.find({ communityId });
  console.log('Replacing', codeFrom, 'with', codeTo, 'in Listing count', listings.count());
  Listings.update({ bucket: codeFrom }, { $set: { bucket: codeTo }});
};

Buckets.moveTemplate = function move(templateId, codeFrom, codeTo) {
  console.log('Replacing', codeFrom, 'with', codeTo, 'in Tempalte', templateId);
  const template = Communities.findOne(templateId) || Communities.findOne({ name: templateId, isTemplate: true });
  productionAssert(template && template._id, `Could not find template named '${templateId}'`);
  Communities.find({ 'settings.templateId': template._id }).forEach(community => {
    Buckets.move(community._id, codeFrom, codeTo);
  });
};

_.extend(Buckets, {
  root(communityId = getActiveCommunityId()) {
    return Buckets.findOneT({ communityId, code: Buckets.rootCode });
  },
  all(communityId) {
    return Buckets.findTfetch({ communityId }, { sort: { code: 1 } });
  },
  getByCode(code, communityId = getActiveCommunityId()) {
    return Buckets.findOneT({ communityId, code });
  },
  getByName(name, communityId = getActiveCommunityId()) {
    return Buckets.findOneT({ communityId, name });
  },
  nodesOf(communityId, code, leafsOnly = false) {
    const regexp = new RegExp('^' + code + (leafsOnly ? '.+' : ''));
    return Buckets.findTfetch({ communityId, code: regexp }, { sort: { code: 1 } });
  },
  nodeOptionsOf(communityId, codeS, leafsOnly, addRootNode = false) {
    const codes = (codeS instanceof Array) ? codeS : [codeS];
    let nodeOptions = codes.map(code => {
      const nodes = Buckets.nodesOf(communityId, code, leafsOnly);
      return nodes.map(node => node.asOption());
    }).flat(1);
    if (codes.length > 1 && addRootNode) nodeOptions = [Buckets.root(communityId).asOption()].concat(nodeOptions);
    return nodeOptions;
  },
  chooseSubNode(code, leafsOnly) {
    return {
      options() {
        const communityId = ModalStack.getVar('communityId');
        return Buckets.nodeOptionsOf(communityId, code, leafsOnly);
      },
      firstOption: false,
    };
  },
  chooseNode: {
    options() {
      const communityId = ModalStack.getVar('communityId');
      return Buckets.nodeOptionsOf(communityId, Buckets.rootCode, false);
    },
    firstOption: () => __('(Select one)'),
  },
});

Buckets.attachSchema(Buckets.schema);
Buckets.attachBehaviour(Timestamped);

Buckets.simpleSchema().i18n('schemaBuckets');

// --- Before/after functions ---

function markGroupBucketsUpward(doc) {
  const code = doc.code;
  if (Buckets.find({ communityId: doc.communityId, code: new RegExp('^' + code) }).count() > 1) {
    Buckets.direct.update(doc._id, { $set: { isGroup: true } });
  }
  const parentCodes = [];
  for (let i = 1; i < code.length; i++) {
    const parentCode = code.slice(0, -1 * i);
    parentCodes.push(parentCode);
  }
  Buckets.direct.update({ communityId: doc.communityId, code: { $in: parentCodes } }, { $set: { isGroup: true } }, { multi: true });
}

function unmarkGroupBucketsUpward(doc) {
  const code = doc.code;
  let parentCode;
  for (let i = 1; i < code.length; i++) {
    parentCode = code.slice(0, -1 * i);
    if (Buckets.findOne({ communityId: doc.communityId, code: parentCode })) break;
  }
  if (Buckets.find({ communityId: doc.communityId, code: new RegExp('^' + parentCode) }).count() === 1) {
    Buckets.direct.update({ communityId: doc.communityId, code: parentCode }, { $set: { isGroup: false } });
  }
}

if (Meteor.isServer) {
  Buckets.after.insert(function (userId, doc) {
    markGroupBucketsUpward(doc);
  });

  Buckets.after.update(function (userId, doc, fieldNames, modifier, options) {
    if (modifierChangesField(this.previous, this, ['code'])) {
      unmarkGroupBucketsUpward(this.previous);
      markGroupBucketsUpward(doc);
    }
  });

  Buckets.after.remove(function (userId, doc) {
    unmarkGroupBucketsUpward(doc);
  });
}

// --- Factory ---

Factory.define('bucket', Buckets, {
  name: () => faker.random.word(),
  code: '222',
});

// ------------------------------------

export const chooseBucket = {
  relation: 'bucket',
  value() {
    const selfId = AutoForm.getFormId();
    const value = ModalStack.readResult(selfId, 'af.bucket.create');
    return value;
  },
  options() {
    const communityId = ModalStack.getVar('communityId');
    return Buckets.nodeOptionsOf(communityId, Buckets.rootCode, false);
  },
  firstOption: () => __('(Select one)'),
};