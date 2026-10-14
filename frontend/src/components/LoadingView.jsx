import PixelSprite from './PixelSprite';
import { LOADING_SCENE } from './sprites';

export default function LoadingView() {
  return (
    <div className="state state--loading">
      <PixelSprite layers={LOADING_SCENE} scale={4} className="state__sprite state__sprite--bob" />
      <p className="state__title">Translating…</p>
      <p className="state__text">This usually takes a few seconds.</p>
    </div>
  );
}
