import type { AppInfo } from '../../shared/ipc';

// Functional screen only. Visual direction belongs to the designer (#11); do not add styling decisions here.
// Every statement here must stay true of the code (see test/privacy.test.ts). Do not add claims that are not verified.
export function Privacy({ info }: { info: AppInfo | null }) {
  return (
    <details>
      <summary>Privacy: where your records are kept</summary>
      <ul>
        <li>
          <strong>Where your records are:</strong> in a file on this device
          {info ? <> (<code>petal.db</code> in <code>{info.dataFolder}</code>)</> : null}. Petal needs no account.
        </li>
        <li>
          <strong>Not sent anywhere:</strong> Petal does not send your records off this device. This version has no
          sync, no analytics and no crash reporting.
        </li>
        <li>
          <strong>Not encrypted:</strong> the records file is not encrypted by Petal. Anyone who can open your user
          account or this device's files can read it. Petal does not check whether your disk is encrypted by your
          operating system.
        </li>
        <li>
          <strong>Backups:</strong> a backup file is a readable copy of everything, also not encrypted. Keep it
          somewhere private.
        </li>
        <li>
          <strong>Logs:</strong> Petal does not write your records into its logs. When something fails it logs only
          the kind of failure.
        </li>
      </ul>
    </details>
  );
}
