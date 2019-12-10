import { _ } from 'meteor/underscore';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Clock } from '/imports/utils/clock.js';
import '/imports/startup/both/utils.js';

const schema = new SimpleSchema({
  revision: { type: Array, optional: true, autoform: { omit: true } },
  'revision.$': { type: Object, blackbox: true, optional: true },
});

const helpers = {};

export const Revisioned = function (revisionedFields) {
  return { name: 'Revisioned',
    schema, helpers, methods: {}, hooks: {
      before: {
        update(userId, doc, fieldNames, modifier, options) {
          const changes = [];
          for (let i = 0; i < revisionedFields.length; i++) {
            const field = revisionedFields[i];
            if (modifier.$set && modifier.$set[field]) {
              if (!_.isEqual(Object.getByString(doc, field), modifier.$set[field])) {
                changes.push({ time: Clock.currentTime(), field, oldValue: Object.getByString(doc, field) });
              }
            }
          }
          if (changes.length > 0) {
            modifier.$push = modifier.$push || {};
            modifier.$push.revision = { $each: changes, $position: 0 };
          }
        },
      },
    },
  };
};
