/* eslint-disable dot-notation */
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Communities } from '/imports/api/communities/communities.js';
import { HouseSchema } from './house.js';

var subtype = 'house'; // eslint-disable no-var

Communities.schema = new SimpleSchema([Communities.schema, { profile: { type: HouseSchema, optional: true } }]);
Communities.attachSchema(Communities.schema);

Communities.publicFields['profile'] = 1;
