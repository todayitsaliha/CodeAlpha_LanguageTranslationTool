import { config } from '../appConfig';
import PixelSprite from './PixelSprite';
import { HEADER_GLOBE, HEADER_SPARKLES } from './sprites';

export default function Header() {
  return (
    <header className="card__header">
      <PixelSprite layers={HEADER_GLOBE} scale={3} className="card__mascot" />
      <div className="card__titles">
        <h1 className="brand">{config.appName}</h1>
        <p className="tagline">{config.tagline}</p>
      </div>
      <PixelSprite layers={HEADER_SPARKLES} scale={3} className="card__sparkles" />
    </header>
  );
}
