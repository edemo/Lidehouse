import { _ } from 'meteor/underscore';
import { productionAssert } from '/imports/utils/assert.js';

export const ParcelRefFormat = {
  isMatching(format, doc) {
    if (!doc.building || !doc.floor || !doc.door) return false;
    return ParcelRefFormat.createRefFromFields(format, doc) === doc.ref;
  },
  createRefFromFields(format, doc) {
    let ref = '';
    switch (format) {
      case '[bPT]fdd':
        switch (doc.type) {
          case 'parking': ref = 'P' + doc.door; break;
          case 'storage': ref = 'T' + doc.door; break;
          case 'flat':
            ref += doc.building;
            ref += doc.floor;
            ref += doc.door;
            break;
          default: break;
        }
        break;
      case 'F/D':
        ref += doc.floor + '/' + doc.door;
        break;
      default: productionAssert(false, `Unknown parcel ref format: ${format}`);
    }
    return ref;
  },
  extractFieldsFromRef(format, doc) {
    // This should be a regex based, "any format can defined" extractor
    const ref = doc.ref;
    const extract = {};
    switch (format) {
      case '[bPT]fdd': // K704 means K building, 7th floor, 04 door -- P235 means parking space no. 235
        switch (ref[0]) {
          case 'P': extract.type = 'parking'; extract.door = ref.substring(1); break;
          case 'T': extract.type = 'storage'; extract.door = ref.substring(1); break;
          default: extract.type = 'flat';
        }
        if (extract.type === 'flat' && ref.length === 4) {
          extract.building = ref[0];
          extract.floor = ref[1];
          extract.door = ref[2] + ref[3];
        }
        break;
      case 'F/D':    // IV/6 means, IV floor, 6 door
        const splitted = ref.split('/');
        productionAssert(splitted.length === 2, `Invalid parcel ref: ${ref}`);
        extract.type = 'flat';
        extract.floor = splitted[0];
        extract.door = splitted[1];
        break;
      default: productionAssert(false, `Unknown parcel ref format: ${format}`);
    }
    return _.extend(extract, doc);  // The doc fields can override what we calculate
  },
};
