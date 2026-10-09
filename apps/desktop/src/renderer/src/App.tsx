import { useEffect, useState } from 'react';
import { DOMAIN_PACKAGE_VERSION } from '@petal/domain';
import type { AppInfo } from '../../shared/ipc';

// Scaffold placeholder only. Visual direction belongs to the designer (#11).
export function App() {
  const [info, setInfo] = useState<AppInfo | null>(null);

  useEffect(() => {
    window.petal.getAppInfo().then(setInfo);
  }, []);

  return (
    <main>
      <h1>Petal</h1>
      <p>Desktop scaffold. Renderer domain package: {DOMAIN_PACKAGE_VERSION}</p>
      {info && (
        <p>
          App {info.appVersion} on {info.platform}. Main-process domain package: {info.domainVersion}
        </p>
      )}
    </main>
  );
}
