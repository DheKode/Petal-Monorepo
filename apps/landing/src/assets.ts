// L01 / F15: module imports let Vite serve assets outside the app root in dev
// and emit portable, hashed files in the static build. Never duplicate artwork.
import logo from '../../../libs/assets/brands/svg/petal-logo-horizontal-primary.svg?url';
import icon32 from '../../../libs/assets/brands/png/petal-icon-circle-rose-32.png?url';
import icon192 from '../../../libs/assets/brands/png/petal-icon-circle-rose-192.png?url';
import icon180 from '../../../libs/assets/brands/png/petal-icon-circle-rose-180.png?url';
import journaling from '../../../libs/assets/images/illustrations/characters/petal-character-journaling-v1.png?url';
import reading from '../../../libs/assets/images/illustrations/characters/petal-character-reading-v2.png?url';
import reflecting from '../../../libs/assets/images/illustrations/characters/petal-character-reflecting-v1.png?url';
import journal from '../../../libs/assets/images/illustrations/objects/petal-object-journal-v1.png?url';
import folder from '../../../libs/assets/images/illustrations/objects/petal-object-folder-v1.png?url';
import leaves from '../../../libs/assets/images/illustrations/abstract/petal-abstract-leaf-cluster-v1.png?url';
import orbit from '../../../libs/assets/images/illustrations/abstract/petal-abstract-petal-orbit-v1.png?url';

const assets = {logo, icon32, icon192, icon180, journaling, reading, reflecting, journal, folder, leaves, orbit};
type AssetName = keyof typeof assets;

export function loadArtwork(): void {
  for (const node of document.querySelectorAll<HTMLImageElement | HTMLLinkElement>('[data-asset]')) {
    const name = node.dataset.asset as AssetName | undefined;
    if (!name || !Object.hasOwn(assets, name)) continue;
    if (node instanceof HTMLImageElement) node.src = assets[name];
    else node.href = assets[name];
  }
}
