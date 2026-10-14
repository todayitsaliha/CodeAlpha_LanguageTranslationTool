import { render } from '@testing-library/react';
import PixelSprite from './PixelSprite';
import * as sprites from './sprites';

const GRIDS = {
  GLOBE: sprites.GLOBE,
  SPARKLE: sprites.SPARKLE,
  SPARKLE_SMALL: sprites.SPARKLE_SMALL,
  BUBBLE: sprites.BUBBLE,
  DOCUMENT: sprites.DOCUMENT,
  BADGE: sprites.BADGE,
};

describe('sprite data', () => {
  it.each(Object.entries(GRIDS))(
    '%s is a rectangle using only known palette characters',
    (_, grid) => {
      const width = grid[0].length;
      grid.forEach((row) => expect(row).toHaveLength(width));
      const used = new Set(grid.join('').replaceAll('.', ''));
      used.forEach((character) => expect(sprites.PALETTE).toHaveProperty(character));
    }
  );

  it('keeps every composed layer inside a sensible canvas', () => {
    const compositions = [
      sprites.HEADER_GLOBE,
      sprites.HEADER_SPARKLES,
      sprites.LOADING_SCENE,
      sprites.ERROR_SCENE,
      sprites.BUTTON_SPARKLE,
    ];
    compositions.forEach((layers) => {
      layers.forEach(({ map, x = 0, y = 0 }) => {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(map.length).toBeGreaterThan(0);
      });
    });
  });
});

describe('PixelSprite', () => {
  it('draws one rect per opaque cell and sizes the canvas from the grid', () => {
    const { container } = render(<PixelSprite layers={[{ map: ['yy', '.y'] }]} scale={5} />);
    const svg = container.querySelector('svg');
    expect(container.querySelectorAll('rect')).toHaveLength(3);
    expect(svg).toHaveAttribute('viewBox', '0 0 2 2');
    expect(svg).toHaveAttribute('width', '10');
    expect(svg).toHaveAttribute('height', '10');
  });

  it('offsets layers and extends the canvas to fit them', () => {
    const { container } = render(
      <PixelSprite layers={[{ map: ['y'] }, { map: ['n'], x: 3, y: 2 }]} />
    );
    expect(container.querySelector('svg')).toHaveAttribute('viewBox', '0 0 4 3');
  });

  it('is hidden from assistive technology unless a title is given', () => {
    const { container, rerender } = render(<PixelSprite layers={[{ map: ['y'] }]} />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');

    rerender(<PixelSprite layers={[{ map: ['y'] }]} title="A star" />);
    expect(container.querySelector('svg')).toHaveAttribute('role', 'img');
    expect(container.querySelector('svg')).toHaveAttribute('aria-label', 'A star');
  });
});
