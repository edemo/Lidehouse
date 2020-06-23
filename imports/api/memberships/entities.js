import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Memberships } from './memberships';

function transformSchemaForUI(schema) {
  const transformedSchema = new SimpleSchema(schema);
  transformedSchema._schema.partnerId.optional = false;
  transformedSchema.i18n('schemaMemberships');
  return transformedSchema;
}

Memberships.entities = {
  roleship: {
    name: 'roleship',
    schema: transformSchemaForUI(Memberships.simpleSchema({ role: 'manager' })),
  },
  ownership: {
    name: 'ownership',
    schema: transformSchemaForUI(Memberships.simpleSchema({ role: 'owner' })),
  },
  benefactorship: {
    name: 'benefactorship',
    schema: transformSchemaForUI(Memberships.simpleSchema({ role: 'benefactor' })),
  },
  delegate: {
    name: 'delegate',
    schema: transformSchemaForUI(Memberships.simpleSchema({ role: 'delegate' })),
  },
};
