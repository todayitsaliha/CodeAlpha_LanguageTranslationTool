// Pixel-art sprites as character grids. '.' is transparent; other characters index PALETTE.
// Drawing them as SVG rects keeps them crisp at any size and needs no image files.

export const PALETTE = {
  n: '#1b1f5e', // navy outline
  b: '#4f8cff', // ocean
  l: '#a9d2ff', // light blue
  g: '#46c27a', // land
  y: '#ffc94d', // gold
  w: '#ffffff',
  r: '#ff4b4b', // alert red
};

export const GLOBE = [
  '.....nnnnnn.....',
  '...nnbbbbbbnn...',
  '..nbbgggbbbbbn..',
  '.nbbgggggbbbbbn.',
  '.nbgggggbbllbbn.',
  'nbbgggbbbbllbbbn',
  'nbbggnbbbbnbbbbn',
  'nbbbbbbbbbbbbggn',
  'nbbbbnbbbbnbbggn',
  'nbbbbbnnnnbbbggn',
  '.nbbbbbbbbbbggn.',
  '.nbbggbbbbbbbbn.',
  '..nbgggbbbbbbn..',
  '...nnbbbbbbnn...',
  '.....nnnnnn.....',
];

export const SPARKLE = [
  '...y...',
  '...y...',
  '..yyy..',
  'yyyyyyy',
  '..yyy..',
  '...y...',
  '...y...',
];

export const SPARKLE_SMALL = ['..y..', '..y..', 'yyyyy', '..y..', '..y..'];

export const BUBBLE = [
  '.nnnnnnnnn.',
  'nwwwwwwwwwn',
  'nwnwwnwwnwn',
  'nwwwwwwwwwn',
  '.nnnnnnnnn.',
  '...nwn.....',
  '...nn......',
];

export const DOCUMENT = [
  'nnnnnnnnnnn',
  'nwwwwwwwwwn',
  'nwwnwwwnwwn',
  'nwwnwwwnwwn',
  'nwwwwwwwwwn',
  'nwwnwwwnwwn',
  'nwwwnnnwwwn',
  'nwwwwwwwwwn',
  'nwllllllwwn',
  'nwwwwwwwwwn',
  'nwllllllwwn',
  'nwwwwwwwwwn',
  'nnnnnnnnnnn',
];

export const BADGE = ['..nnn..', '.nrrrn.', 'nrrwrrn', 'nrrwrrn', 'nrrrrrn', '.nrwrn.', '..nnn..'];

// Ready-made compositions: { map, x, y } layers drawn in order.
export const HEADER_GLOBE = [{ map: GLOBE }];
export const HEADER_SPARKLES = [
  { map: SPARKLE, x: 0, y: 3 },
  { map: SPARKLE_SMALL, x: 8, y: 0 },
];
export const LOADING_SCENE = [
  { map: GLOBE, x: 0, y: 6 },
  { map: BUBBLE, x: 9, y: 0 },
];
export const ERROR_SCENE = [
  { map: DOCUMENT, x: 0, y: 2 },
  { map: BADGE, x: 7, y: 9 },
];
export const BUTTON_SPARKLE = [{ map: SPARKLE }];
