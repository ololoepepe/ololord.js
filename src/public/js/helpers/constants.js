import _ from 'underscore';
import UUID from 'uuid';

export const SECOND = 1000;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
export const YEAR = 365 * DAY;
export const BILLION = 2 * 1000 * 1000 * 1000;

export const KEY_RETURN = 13;

export const CONTENT_PADDING_TOP = 6;
export const SWIPE_MIN_DISTANCE_X = 100;
export const SWIPE_MAX_DISTANCE_Y = 15;

export const AUTO_PLAY_DELAY = SECOND / 2;
export const WINDOW_ID = UUID.v4();

export const LEVEL_MAP = {
  User: 'USER',
  Moder: 'MODER',
  Admin: 'ADMIN',
  Superuser: 'SUPERUSER'
};

export const MAX_THREAD_TEXT_LENGTH = 300;
