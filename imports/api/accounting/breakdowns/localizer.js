import { Mongo } from 'meteor/mongo';
import { __ } from '/imports/localization/i18n.js';
import { TAPi18n } from 'meteor/tap:i18n';
import { Breakdowns } from '/imports/api/accounting/breakdowns/breakdowns.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { getActiveCommunityId } from '/imports/ui_3/lib/active-community.js';
import { ParcelRefFormat } from '/imports/api/communities/parcelref-format.js';

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
  parcelFromCode(code, communityId) {
    if (!communityId || !code) return undefined;
    const parcel = Parcels.findOne({ communityId, code });
    return parcel;
  },
  node(parcel) {
    const code = Localizer.parcelRef2code(parcel.ref);
    return Localizer.get(parcel.communityId).nodeByCode(code);
  },
  leafIsParcel(leaf) {
    return leaf.code && leaf.code.substr(0, 1) === '@';
  },
  _addParcel(parcelBreakdown, parcel, community) {
    const ___ = function translate(text) {
      return TAPi18n.__(text, {}, community.settings.language);
    };
    if (ParcelRefFormat.isMatching(community.settings.parcelRefFormat, parcel)) {
      let buildingNode = parcelBreakdown.children.find(c => c.digit === (parcel.building || '?'));
      if (!buildingNode) {
        buildingNode = { digit: parcel.building, name: `${___('schemaParcels.building.label')} ${parcel.building}`, label: ___('schemaParcels.building.label'), children: [] };
        parcelBreakdown.children.push(buildingNode);
      }
      let floorNode = buildingNode.children.find(c => c.digit === (parcel.floor || '?'));
      if (!floorNode) {
        floorNode = { digit: parcel.floor, name: `${___('schemaParcels.floor.label')} ${parcel.floor}`, label: ___('schemaParcels.floor.label'), children: [] };
        buildingNode.children.push(floorNode);
      }
      let doorNode = floorNode.children.find(c => c.digit === (parcel.door || '?'));
      if (!doorNode) {
        doorNode = { digit: parcel.door, name: parcel.ref, label: ___('parcel') };
        floorNode.children.push(doorNode);
      }
    } else {
      const parcelNode = { digit: parcel.ref, name: parcel.ref, label: ___('parcel') };
      parcelBreakdown.children.push(parcelNode);
    }
  },
  _removeParcel(parcelBreakdown, parcel, community) {
//    const code = this.parcelRef2code(parcel.ref);
//    const node = parcelBreakdown.nodeByCode(code);
    // TODO: remove node
  },
  addParcel(parcel) {
    this.generateParcels(parcel.communityId);
// TODO: not regenerate each time, but keep in sync
    const community = Communities.findOne(parcel.communityId);
    const parcelBreakdown = Localizer.getParcels(community._id);
    Localizer._addParcel(parcelBreakdown, parcel, community);
    const id = parcelBreakdown._id;
    Mongo.Collection.stripAdministrativeFields(parcelBreakdown);
    Breakdowns.update(id, { $set: parcelBreakdown });
  },
  updateParcel(parcel) {
    this.generateParcels(parcel.communityId);
// TODO: not regenerate each time, but keep in sync
  },
  removeParcel(parcel) {
    this.generateParcels(parcel.communityId);
// TODO: not regenerate each time, but keep in sync
    const community = Communities.findOne(parcel.communityId);
    const parcelBreakdown = Localizer.getParcels(community._id);
    Localizer._removeParcel(parcelBreakdown, parcel, community);
    const id = parcelBreakdown._id;
    Mongo.Collection.stripAdministrativeFields(parcelBreakdown);
    Breakdowns.update(id, { $set: parcelBreakdown });
  },
  generateParcels(communityId) {
    const parcelBreakdown = { communityId, name: 'Parcels', digit: '@', children: [] };
    const community = Communities.findOne(communityId);
    Parcels.find({ communityId }).forEach((parcel) => {
      Localizer._addParcel(parcelBreakdown, parcel, community);
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
