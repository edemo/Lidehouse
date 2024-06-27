import { HungarianAddressSchema, hungarianDisplayAddress } from './hu/address.js';

export const AddressSchema = HungarianAddressSchema;
export const displayAddress = hungarianDisplayAddress;

export const Locales = {
  en: { currencyDecimals: 2 },
  hu: { currencyDecimals: 0 },
};

export function roundCurrency(number, locale) {
  const decimals = Locales[locale]?.currencyDecimals || 2;
  return Math.roundToDecimals(number, decimals);
}
