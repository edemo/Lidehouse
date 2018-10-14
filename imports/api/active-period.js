import { SimpleSchema } from 'meteor/aldeed:simple-schema';

const TimePeriodSchema = new SimpleSchema({
  begin: { type: Date, optional: true,
    custom() {
      const beginDate = this.value;
      const endDate = this.field('activeTime.end').value;
      const nowDate = new Date();
      if (!beginDate && endDate) return 'required';
      if (beginDate && beginDate > nowDate) return 'notAllowed';
      return undefined;
    },
  },
  end: { type: Date, optional: true,
    custom() {
      const beginDate = this.field('activeTime.begin').value;
      const endDate = this.value;
      const nowDate = new Date();
      if (endDate && endDate < beginDate) return 'notAllowed';
      if (endDate && endDate > nowDate) return 'notAllowed';  // We can allow this if needed, if we set up a timer
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
      return (!beginDate || beginDate <= nowDate) && (!endDate || nowDate <= endDate);
    },
  },
});

ActivePeriodSchema.fields = [
  'activeTime.begin',
  'activeTime.end',
  'active',
];
