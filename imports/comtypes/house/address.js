import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { TAPi18n } from 'meteor/tap:i18n';

export const AddressSchema = new SimpleSchema({
  city: { type: String, max: 100, label: () => TAPi18n.__('house.communities.city') },
  street: { type: String, max: 100, label: () => TAPi18n.__('house.communities.street') },
  number: { type: Number, label: () => TAPi18n.__('house.communities.number') },
  zip: { type: String, regEx: /^[0-9]{4}$/, label: () => TAPi18n.__('house.communities.zip') },
});
