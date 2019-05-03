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
    console.log('this field (this.field.value, this.value): ', field, this.field(field).value, this.value);
    if (doc && Object.byString(doc, field) && !this.field(field).value) fieldObject[field] = doc[field];
    if (this.field(field).value) fieldObject[field] = this.field(field).value;
  });
  return fieldObject;
}

const TimePeriodSchema = new SimpleSchema({
  begin: { type: Date, optional: true,
    custom() {
      console.log('begin path');
      //console.log('assureFields:', assureFields.call(this, ['activeTime.begin'], this.docId));
      //const doc = updateDataContext(this.docId);
      //let beginDate = this.value;
      //let endDate = this.field('activeTime.end').value;
      const nowDate = new Date();
      const object = assureFields.call(this, ['activeTime.begin', 'activeTime.end'], this.docId);
      console.log('returned object begin', object);
      //if (!beginDate && doc && doc.activeTime) beginDate = doc.activeTime.begin;
      //if (!endDate && doc && doc.activeTime) endDate = doc.activeTime.end;
      if (!object['activeTime.begin'] && object['activeTime.end']) return 'required';
      if (object['activeTime.begin'] && object['activeTime.begin'] > nowDate) return 'notAllowed';
      return undefined;
    },
  },
  end: { type: Date, optional: true,
    custom() {
      console.log('end path');
      //console.log('assureFields:', assureFields.call(this, ['activeTime.end'], this.docId));
      //const doc = updateDataContext(this.docId);
      //let beginDate = this.field('activeTime.begin').value;
      //let endDate = this.value;
      const nowDate = new Date();
      const object = assureFields.call(this, ['activeTime.begin', 'activeTime.end'], this.docId);
      console.log('returned object end', object);
      //if (!beginDate && doc && doc.activeTime) beginDate = doc.activeTime.begin;
      // if (!endDate && doc && doc.activeTime) endDate = doc.activeTime.end;
      if (object['activeTime.end'] && !object['activeTime.begin']) return 'notAllowed';
      if (object['activeTime.end'] && object['activeTime.end'] < object['activeTime.begin']) return 'notAllowed';
      if (object['activeTime.end'] && object['activeTime.end'] > nowDate) return 'notAllowed';
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
