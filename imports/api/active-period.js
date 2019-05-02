import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Memberships } from '/imports/api/memberships/memberships.js';


function updateDataContext(id) {
  const doc = Memberships.findOne(id);
  return doc;
}

function assureFields(fieldsArray, docId) {
  const doc = Memberships.findOne(docId);
  const fieldObject = {};
  fieldsArray.forEach((field) => {
    if (doc && Object.byString(doc, field) && !this.field(field).value) fieldObject[field] = doc[field];
    console.log('this field: ', field, this.field(field).value, this.value, this);
    if (this.field(field).value) fieldObject[field] = this.field(field).value;
  });
  return fieldObject;
}

const TimePeriodSchema = new SimpleSchema({
  begin: { type: Date, optional: true,
    custom() {
      const doc = updateDataContext(this.docId);
      let beginDate = this.value;
      let endDate = this.field('activeTime.end').value;
      const nowDate = new Date();
      //const object = assureFields.call(this, ['activeTime.begin', 'activeTime.end'], this.docId);
      if (!beginDate && doc && doc.activeTime) beginDate = doc.activeTime.begin;
      if (!endDate && doc && doc.activeTime) endDate = doc.activeTime.end;
      if (!beginDate && endDate) return 'required';
      if (beginDate && beginDate > nowDate) return 'notAllowed';
      return undefined;
    },
  },
  end: { type: Date, optional: true,
    custom() {
      const doc = updateDataContext(this.docId);
      let beginDate = this.field('activeTime.begin').value;
      let endDate = this.value;
      const nowDate = new Date();
      //const object = assureFields.call(this, ['activeTime.begin', 'activeTime.end'], this.docId);
      if (!beginDate && doc && doc.activeTime) beginDate = doc.activeTime.begin;
      if (!endDate && doc && doc.activeTime) endDate = doc.activeTime.end;
      if (endDate && !beginDate) return 'notAllowed';
      if (endDate && endDate < beginDate) return 'notAllowed';
      if (endDate && endDate > nowDate) return 'notAllowed';
      return undefined;
    },
  },
});

export const ActivePeriodSchema = new SimpleSchema({
  activeTime: { type: TimePeriodSchema, optional: true },
  active: { type: Boolean, autoform: { omit: true },
    autoValue() {
      const beginDate = this.field('activeTime.begin').value;
      const endDate = this.field('activeTime.end').value;
      const nowDate = new Date();
      if (this.isUpdate && !beginDate && !endDate) return undefined;
      if ((beginDate && beginDate >= nowDate) || (endDate && endDate <= nowDate)) return false;
      return true;
    },
  },
});

ActivePeriodSchema.fields = [
  'activeTime.begin',
  'activeTime.end',
  'active',
];
