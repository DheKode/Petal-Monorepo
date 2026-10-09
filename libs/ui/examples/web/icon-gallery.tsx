import { useState } from 'react';
import { Card } from '@petal/ui/components';
import { Icon, IconButton, iconLabels, iconNames } from '@petal/ui/icons';
import { Stack } from '@petal/ui/layouts';
import { petalTheme } from '@petal/ui';

export function IconGallery() {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [lastAction, setLastAction] = useState('Focus or press an icon to try its motion.');
  return <Card title="Icons, with intent."><Stack>
    <p className="preview-text">AnimateIcons Lucide on web; matching Lucide SVGs on native. A focused set for the core flow.</p>
    <label className="preview-toggle"><input type="checkbox" checked={reduceMotion}
      onChange={event => setReduceMotion(event.currentTarget.checked)} />Reduce icon motion</label>
    <div className="preview-icon-grid">
      {iconNames.map(name => <div key={name} className="preview-icon-cell">
        <IconButton name={name} label={'Replay ' + iconLabels[name] + ' icon'} variant="tertiary"
          reduceMotion={reduceMotion} onPress={() => setLastAction(iconLabels[name] + ' icon pressed. Nothing is saved.')} testID={'icon-' + name} />
        <span>{iconLabels[name]}</span>
      </div>)}
    </div>
    <Stack direction="row" wrap space="related">
      {(['small', 'default', 'large'] as const).map(size => <div key={size} className="preview-icon-cell">
        <Icon name="calendar" size={size} decorative={false} label={'Calendar, ' + petalTheme.semantic.icon.size[size] + ' pixels'} reduceMotion={reduceMotion} />
        <span>{petalTheme.semantic.icon.size[size]} px</span>
      </div>)}
      <IconButton name="edit" label="Edit example" disabled />
      <IconButton name="check" label="Confirm example" busy busyLabel="Confirming example…" />
    </Stack>
    <Stack direction="row" wrap space="related">
      {(['taken', 'missed', 'unsure', 'no-entry'] as const).map(name => <div key={name} className="preview-record-label">
        <Icon name={name} reduceMotion={reduceMotion} /><span>{iconLabels[name]}</span>
      </div>)}
    </Stack>
    <p className="petal-muted preview-footer" role="status">{lastAction}</p>
  </Stack></Card>;
}
