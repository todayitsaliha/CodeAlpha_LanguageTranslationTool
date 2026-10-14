import { PALETTE } from './sprites';

/**
 * Draws one or more character-grid layers as crisp SVG pixels.
 * Decorative by default (hidden from assistive tech); pass `title` to expose it as an image.
 */
export default function PixelSprite({ layers, scale = 4, className, title }) {
  const width = Math.max(...layers.map(({ map, x = 0 }) => x + map[0].length));
  const height = Math.max(...layers.map(({ map, y = 0 }) => y + map.length));

  const pixels = [];
  layers.forEach(({ map, x = 0, y = 0 }, layer) => {
    map.forEach((row, rowIndex) => {
      Array.from(row).forEach((cell, column) => {
        if (cell === '.') return;
        pixels.push(
          <rect
            key={`${layer}-${rowIndex}-${column}`}
            x={x + column}
            y={y + rowIndex}
            width="1"
            height="1"
            fill={PALETTE[cell]}
          />
        );
      });
    });
  });

  return (
    <svg
      className={className}
      viewBox={`0 0 ${width} ${height}`}
      width={width * scale}
      height={height * scale}
      shapeRendering="crispEdges"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {pixels}
    </svg>
  );
}
