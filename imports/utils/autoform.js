import { __ } from '/imports/localization/i18n.js';

export const autoformOptions = function autoformOptions(values) {
  return {
    options() {
      return values.map(function option(t) { return { label: __(t), value: t }; });
    },
  };
};
