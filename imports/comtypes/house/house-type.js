/* eslint-disable dot-notation */

import { HouseSchema } from './house.js';
import { HouseTranslation } from './translation.js';

export const houseType = {
  name: 'house',
  profileSchema: HouseSchema,
  translation: HouseTranslation,
};
