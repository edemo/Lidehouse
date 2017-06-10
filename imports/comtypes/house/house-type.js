/* eslint-disable dot-notation */

import { HouseProfileSchema } from './house.js';
import { HouseTranslation } from './translation.js';

export const houseType = {
  name: 'house',
  profileSchema: HouseProfileSchema,
  translation: HouseTranslation,
};
