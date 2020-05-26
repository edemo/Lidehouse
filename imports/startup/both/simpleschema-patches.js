import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema'; 

SimpleSchema.Types = {
  Email: () => ({
    type: String,
    regEx: SimpleSchema.RegEx.Email,
    custom() {
      if (Meteor.isClient) {
        if (this.value !== this.value?.toLowerCase()) return 'notAllowed';
        return undefined;
      }
      return undefined;
    },
    autoform: {
      type: 'email',
      autocapitalize: 'none',
      autocorrect: 'off',
    },
  }),
};
