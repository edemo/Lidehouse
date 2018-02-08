import { __ } from '/imports/localization/i18n.js';

export const autoformOptions = function autoformOptions(values, i18Path = '') {
  return {
    options() {
      return values.map(function option(t) { return { label: __(i18Path + t), value: t }; });
    },
  };
};
