import { HungarianAddressSchema, hungarianDisplayAddress } from './hu/address.js';

export const AddressSchema = HungarianAddressSchema;
export const displayAddress = hungarianDisplayAddress;

export const Locales = {
  en: {
    currencyDecimals: 2,
    smallestCurrencyUnit: {
      bank: 0.01,
      cash: 0.01,
    },
  },
  hu: {
    currencyDecimals: 0,
    smallestCurrencyUnit: {
      bank: 1,
      cash: 5,
    },
  },
};

export function roundCurrency(number, locale) {
  const decimals = Locales[locale].currencyDecimals;
  return Math.roundToDecimals(number, decimals);
}

export function equalWithinUnit(amount1, amount2, locale, accountCategory) {
  return Math.abs(amount1 - amount2) < Locales[locale]?.smallestCurrencyUnit[accountCategory];
}
