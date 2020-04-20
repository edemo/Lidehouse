import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Memberships } from './memberships';

const Session = (Meteor.isClient) ? require('meteor/session').Session : { get: () => undefined };

function transformSchemaForUI(schema) {
  const transformedSchema = new SimpleSchema(schema);
  transformedSchema._schema.partnerId.optional = false;
  Meteor.startup(() => {
    transformedSchema.i18n('schemaMemberships');
    transformedSchema.i18n('schemaActivePeriod');
  });
  return transformedSchema;
}

Memberships.entities = {
  roleship: {
    name: 'roleship',
    schema: transformSchemaForUI(Memberships.simpleSchema({ role: 'manager' })),
    modifiableFields: ['role', 'rank', 'partnerId'],
  },
  ownership: {
    name: 'ownership',
    schema: transformSchemaForUI(Memberships.simpleSchema({ role: 'owner' })),
    modifiableFields: ['partnerId', 'ownership'],
    implicitFields: {
      parcelId: () => Session.get('modalContext').parcelId,
    },
  },
  benefactorship: {
    name: 'benefactorship',
    schema: transformSchemaForUI(Memberships.simpleSchema({ role: 'benefactor' })),
    modifiableFields: ['partnerId', 'benefactorship'],
    implicitFields: {
      parcelId: () => Session.get('modalContext').parcelId,
    },
  },
  delegate: {
    name: 'delegate',
    schema: transformSchemaForUI(Memberships.simpleSchema({ role: 'delegate' })),
  },
};
