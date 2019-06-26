import { _ } from 'meteor/underscore';
import { releaseAssert } from '/imports/utils/assert.js';

export function createRefFromFields(format, doc) {
  let ref = '';
  switch (format) {
    case '[bPT]fdd':
      switch (doc.type) {
        case 'parking': ref += 'P'; break;
        case 'storage': ref += 'T'; break;
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
    default: releaseAssert(false, `Unknown parcel ref format: ${format}`);
  }
  return ref;
}

export function extractFieldsFromRef(format, doc) {
  // This should be a regex based, "any format can defined" extractor
  const ref = doc.ref;
  const extract = {};
  switch (format) {
    case '[bPT]fdd':  // K704 means K building, 7th floor, 04 door -- P235 means parking space no. 235
      switch (ref[0]) {
        case 'P': extract.type = 'parking'; break;
        case 'T': extract.type = 'storage'; break;
        default: extract.type = 'flat';
      }
      if (extract.type === 'flat') {
        extract.building = ref[0];
        extract.floor = ref[1];
        extract.door = ref[2] + ref[3];
      }
      break;
    case 'F/D':    // IV/6 means, IV floor, 6 door
      const splitted = ref.split('/');
      releaseAssert(splitted.length === 2, `Invalid parcel ref: ${ref}`);
      extract.type = 'flat';
      extract.floor = splitted[0];
      extract.door = splitted[1];
      break;
    default: releaseAssert(false, `Unknown parcel ref format: ${format}`);
  }
  return _.extend(extract, doc);  // The doc fields can override what we calculate
}
