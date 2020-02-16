import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { _ } from 'meteor/underscore';

import { __ } from '/imports/localization/i18n.js';
import { debugAssert, productionAssert } from '/imports/utils/assert.js';
import { getActiveCommunityId } from '/imports/ui_3/lib/active-community.js';
import { autoformOptions, fileUpload } from '/imports/utils/autoform.js';
import { Timestamped } from '/imports/api/behaviours/timestamped.js';
import { Templates } from '/imports/api/transactions/templates/templates.js';

const Session = (Meteor.isClient) ? require('meteor/session').Session : { get: () => undefined };

export const Localizers = new Mongo.Collection('localizers');

Localizers.categoryValues = ['@group', '#tag'];

Localizers.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true } },
  category: { type: String, allowedValues: Localizers.categoryValues },
  name: { type: String, max: 100 },
  code: { type: String, max: 25, optional: true },
});

Meteor.startup(function indexMoneyLocalizers() {
  if (Meteor.isServer) {
    Localizers._ensureIndex({ communityId: 1, code: 1 });
    Localizers._ensureIndex({ communityId: 1, name: 1 });
  }
});

Localizers.helpers({
  // Almost a duplicate of Accounts functions
  entityName() {
    return this.category;
  },
  nodes(leafsOnly = false) {
    const regexp = new RegExp('^' + this.code + (leafsOnly ? '.+' : ''));
    return Localizers.find({ communityId: this.communityId, code: regexp });
  },
  leafs() {
    return this.nodes(true);
  },
  parent() {
    // TODO
  },
  parents() {
    // TODO
  },
  displayAccount() {
    return `${this.code}: ${__(this.label || this.name)}`;
  },
  asOption() {
    return { label: this.displayAccount(), value: this.code };
  },
  nodeOptions(leafsOnly) {
    const nodes = this.nodes(leafsOnly);
    return nodes.map(node => node.asOption());
  },
});

_.extend(Localizers, {
  // Almost a duplicate of Accounts functions
  checkExists(communityId, code) {
    if (!code || !Localizers.findOne({ communityId, code })) {
      throw new Meteor.Error('err_notExists', `No such parcel: ${code}`);
    }
  },
  all(communityId) {
    return Localizers.find({ communityId }, { sort: { code: 1 } });
  },
  getByCode(code, communityId = getActiveCommunityId()) {
    return Localizers.findOne({ communityId, code });
  },
  getByRef(ref, communityId = getActiveCommunityId()) {
    return Localizers.findOne({ communityId, ref });
  },
  nodesOf(communityId, code, leafsOnly = false) {
    const regexp = new RegExp('^' + code + (leafsOnly ? '.+' : ''));
    return Localizers.find({ communityId, code: regexp }, { sort: { code: 1 } });
  },
  nodeOptionsOf(communityId, code, leafsOnly) {
    const codes = (code instanceof Array) ? code : [code];
    const nodeOptions = codes.map(c => {
      const nodes = Localizers.nodesOf(communityId, code, leafsOnly);
      return nodes.map(node => node.asOption());
    }).flat(1);
    return nodeOptions;
  },
  chooseSubNode(code, leafsOnly) {
    return {
      options() {
        const communityId = Session.get('activeCommunityId');
        return Localizers.nodeOptionsOf(communityId, code, leafsOnly);
      },
      firstOption: false,
    };
  },
  choosePhysical: {
    options() {
      const communityId = Session.get('activeCommunityId');
      return Localizers.nodeOptionsOf(communityId, '@', false);
    },
    firstOption: () => __('(Select one)'),
  },
  chooseNode: {
    options() {
      const communityId = Session.get('activeCommunityId');
      return Localizers.nodeOptionsOf(communityId, '', false);
    },
    firstOption: () => __('(Select one)'),
  },
});

Localizers.attachBaseSchema(Localizers.schema);
Localizers.attachBehaviour(Timestamped);

Localizers.attachVariantSchema(undefined, { selector: { category: '@group' } });
Localizers.attachVariantSchema(undefined, { selector: { category: '#tag' } });

Meteor.startup(function attach() {
  Localizers.simpleSchema().i18n('schemaAccounts');
});

// --- Factory ---

Factory.define('localizer', Localizers, {
  category: '#tag',
  name: 'someLocation',
  code: '#222',
});
