// The tolerant cleaning params are not good for debug mode, because they let you
// mistype a field name and that field will be cleaned away upon insert silently, since not in schema
// letting you look puzzled why you don't have your field in your doc.

const SAFE_CLEANING_PARAMS_FOR_VALIDATION = {
  filter: false,
  autoConvert: false,
};

const TOLERANT_CLEANING_PARAMS_FOR_VALIDATION = {
//    filter: true,  by default
//    autoConvert: true, by default
};

export const CleaningParams = SAFE_CLEANING_PARAMS_FOR_VALIDATION;
