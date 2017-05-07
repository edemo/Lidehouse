import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { TAPi18n } from 'meteor/tap:i18n';
import { AddressSchema } from './address.js';

export const HouseSchema = new SimpleSchema({
  lot: { type: String, max: 100, label: () => TAPi18n.__('house.communities.lot') },
  address: { type: AddressSchema, label: () => TAPi18n.__('house.communities.address') },
});
