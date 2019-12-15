import { Mongo } from 'meteor/mongo';
import { __ } from '/imports/localization/i18n.js';
import { TAPi18n } from 'meteor/tap:i18n';
import { Breakdowns } from '/imports/api/transactions/breakdowns/breakdowns.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { getActiveCommunityId } from '/imports/ui_3/lib/active-community.js';

// Helpers form manipulating with the Localizer
export const Localizer = {
  get(communityId = getActiveCommunityId()) {
    return Breakdowns.findOneByName('Localizer', communityId);
  },
  getParcels(communityId = getActiveCommunityId()) {
    return Breakdowns.findOneByName('Parcels', communityId);
  },
  getPlaces(communityId = getActiveCommunityId()) {
    return Breakdowns.findOneByName('Places', communityId);
  },
  parcelRef2code(ref) {
    return '@' + ref;
  },
  code2parcelRef(code) {
    if (!code) return undefined;
    return code.substring(1);
  },
  leafIsParcel(leaf) {
    return leaf.code && leaf.code.substr(0, 1) === '@';
  },
  _addParcel(parcelBreakdown, parcel, lang) {
    const ___ = function translate(text) {
//      console.log('lang', lang);
//      console.log('text', text);
//      console.log('trans', TAPi18n.__(text, {}, lang));
      return TAPi18n.__(text, {}, lang);
    };
    let buildingNode = parcelBreakdown.children.find(c => c.digit === parcel.building);
    if (!buildingNode) {
      buildingNode = { digit: parcel.building, name: `${___('schemaParcels.building.label')} ${parcel.building}`, label: ___('schemaParcels.building.label'), children: [] };
      parcelBreakdown.children.push(buildingNode);
    }
    let floorNode = buildingNode.children.find(c => c.digit === parcel.floor);
    if (!floorNode) {
      floorNode = { digit: parcel.floor, name: `${___('schemaParcels.floor.label')} ${parcel.floor}`, label: ___('schemaParcels.floor.label'), children: [] };
      buildingNode.children.push(floorNode);
    }
    let doorNode = floorNode.children.find(c => c.digit === parcel.door);
    if (!doorNode) {
      doorNode = { digit: parcel.door, name: parcel.ref, label: ___('parcel') };
      floorNode.children.push(doorNode);
    }
  },
  addParcel(communityId, parcel, lang) {
    const parcelBreakdown = Localizer.getParcels(communityId);
    Localizer._addParcel(parcelBreakdown, parcel, lang);
    const id = parcelBreakdown._id;
    Mongo.Collection.stripAdministrativeFields(parcelBreakdown);
    Breakdowns.update(id, { $set: parcelBreakdown });
  },
  generateParcels(communityId, lang) {
    const parcelBreakdown = { communityId, name: 'Parcels', digit: '@', children: [] };
    Parcels.find({ communityId }).forEach((parcel) => {
      Localizer._addParcel(parcelBreakdown, parcel, lang);
    });
    Breakdowns.define(parcelBreakdown);
  },
};

export const chooseLocalizerNode = {
  options() {
    return Localizer.get().nodeOptions();
  },
  firstOption: () => __('(Select one)'),
};
