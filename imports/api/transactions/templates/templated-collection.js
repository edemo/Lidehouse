import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { _ } from 'meteor/underscore';

import { debugAssert } from '/imports/utils/assert.js';
import { Communities } from '/imports/api/communities/communities.js';

export class TemplatedMongoCollection extends Mongo.Collection {
  constructor(name, identityFieldName) {
    super(name);
    this._identityFieldName = identityFieldName;
  }
  static _extractTemplateIdFromSelector(selector) {
    let templateId;
    if (selector.templateId) {
      templateId = selector.templateId;
      delete selector.templateId;
    } else {
      const community = Communities.findOne(selector.communityId);
      templateId = community?.settings?.templateId;
    }
    return templateId;
  }
  _union(foundInCommunity, foundInTemplate) {
    const objC = {};
    const objT = {};
    foundInCommunity.forEach(elem => { objC[elem[this._identityFieldName]] = elem; });
    foundInTemplate.forEach(elem => { objT[elem[this._identityFieldName]] = elem; });
    const result = [];
    Object.keys(objC).forEach(key => {
      result.push(objC[key]);
      delete objT[key];
    });
    Object.keys(objT).forEach(key => {
      result.push(objT[key]);
    });
    return _.sortBy(result, this._identityFieldName);
  }
  checkExists(communityId, identifier) {
    if (!identifier || !this.findOneT({ communityId, [this._identityFieldName]: identifier })) {
      throw new Meteor.Error('err_notExists', 'No such doc', { collection: this._name, field: this._identityFieldName, identifier });
    }
  }
  clone(selector, communityId) {
    const doc = this.findOneT(selector);
    if (!doc) return undefined;
    Mongo.Collection.stripAdministrativeFields(doc);
    doc.communityId = communityId;
    return this.insert(doc);
  }

  // Standard db operations equivalent
  findTfetch(selector, ...params) {
    const templateId = TemplatedMongoCollection._extractTemplateIdFromSelector(selector);
    const foundInCommunity  = this.find(selector, ...params);
    const templateSelector = _.extend({}, selector, { communityId: templateId });
    const foundInTemplate  = this.find(templateSelector, ...params);
    return this._union(foundInCommunity, foundInTemplate);
  }
  findT(selector, ...params) { // This one does not fetch, but may contain both the community version and the template version of the same element
    const templateId = TemplatedMongoCollection._extractTemplateIdFromSelector(selector);
    const selectorTemplated = _.extend({}, selector, { communityId: { $in: [selector.communityId, templateId] } });
    return this.find(selectorTemplated, ...params);
  }
  findOneT(selector) {
    if (typeof selector === 'string') return this.findOne(selector); // for findOne('id') use the regular findOne
    else if (typeof selector === 'object') {
      const templateId = TemplatedMongoCollection._extractTemplateIdFromSelector(selector);
      const templateSelector = _.extend({}, selector, { communityId: templateId });
      return this.findOne(selector) || this.findOne(templateSelector);
    } else debugAssert(false);
  }
}
