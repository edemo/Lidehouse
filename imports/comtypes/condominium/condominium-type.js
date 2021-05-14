/* eslint-disable dot-notation */

import { CondominiumProfileSchema } from './condominium.js';
import { CondominiumTranslation } from './translation.js';

export const condominiumType = {
  name: 'house',
  profileSchema: CondominiumProfileSchema,
  translation: CondominiumTranslation,
};
