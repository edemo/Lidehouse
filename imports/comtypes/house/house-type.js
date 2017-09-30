/* eslint-disable dot-notation */

import { HouseProfileSchema, HouseFinancesSchema } from './house.js';
import { HouseTranslation } from './translation.js';

export const houseType = {
  name: 'house',
  profileSchema: HouseProfileSchema,
  financesSchema: HouseFinancesSchema,
  translation: HouseTranslation,
};
