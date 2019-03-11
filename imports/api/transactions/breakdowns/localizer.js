import { TAPi18n } from 'meteor/tap:i18n';
import { Breakdowns } from '/imports/api/transactions/breakdowns/breakdowns.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { getActiveCommunityId } from '/imports/api/communities/communities.js';

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
    return code.substring(1);
  },
  leafIsParcel(leaf) {
    return leaf.code && leaf.code.substr(0, 1) === '@';
  },
  _addParcel(parcelBreakdown, parcel, lang) {
    const __ = function translate(text) {
//      console.log('lang', lang);
//      console.log('text', text);
//      console.log('trans', TAPi18n.__(text, {}, lang));
      return TAPi18n.__(text, {}, lang);
    };
    let buildingNode = parcelBreakdown.children.find(c => c.digit === parcel.building);
    if (!buildingNode) {
      buildingNode = { digit: parcel.building, name: `${__('buiding')} ${parcel.building}`, children: [] };
      parcelBreakdown.children.push(buildingNode);
    }
    let floorNode = buildingNode.children.find(c => c.digit === parcel.floor);
    if (!floorNode) {
      floorNode = { digit: parcel.floor, name: `${__('floor')} ${parcel.floor}`, children: [] };
      buildingNode.children.push(floorNode);
    }
    let doorNode = floorNode.children.find(c => c.digit === parcel.door);
    if (!doorNode) {
      doorNode = { digit: parcel.door, name: parcel.ref };
      floorNode.children.push(doorNode);
    }
  },
  addParcel(communityId, parcel, lang) {
    const parcelBreakdown = Localizer.getParcels(communityId);
    Localizer._addParcel(parcelBreakdown, parcel, lang);
    const id = parcelBreakdown._id;
    delete parcelBreakdown._id;
    delete parcelBreakdown.createdAt;
    delete parcelBreakdown.updatedAt;
    Breakdowns.define(parcelBreakdown);
  },
  generateParcels(communityId, lang) {
    const parcelBreakdown = { communityId, name: 'Parcels', digit: '@', children: [] };
    Parcels.find({ communityId }).forEach((parcel) => {
      Localizer._addParcel(parcelBreakdown, parcel, lang);
    });
    Breakdowns.define(parcelBreakdown);
  },
};
