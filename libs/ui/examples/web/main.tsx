import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, Card, ConfirmDialog, Feedback, SelectionButton, StatusBadge, TextField } from '@petal/ui/components';
import { useDisclosure, useReducedMotion, useResponsiveLayout } from '@petal/ui/hooks';
import { Screen, Stack } from '@petal/ui/layouts';
import '@petal/ui/styles.css';
import './preview.css';
import { IconGallery } from './icon-gallery.js';

function Preview() {
  const [value, setValue] = useState('Example entry');
  const [selected, setSelected] = useState('Mon');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState('Fictional examples. Nothing is saved.');
  const dialog = useDisclosure();
  const reduced = useReducedMotion();
  const { isWide } = useResponsiveLayout();
  return <Screen title="Shared UI, in use." description="Real Petal React components driven by the shared tokens."
    footer={<p className="petal-muted preview-footer">{isWide ? 'Wide' : 'Compact'} composition · Reduced motion {reduced ? 'on' : 'off'} · Native counterparts use React Native primitives and require device review.</p>}>
    <IconGallery />
    <Card title="Actions and states">
      <Stack direction="row" wrap space="related"><Button label="Save example" onPress={() => setResult('Example action pressed. No record was saved.')} />
        <Button label="Edit details" variant="secondary" /><Button label="View history" variant="tertiary" />
        <Button label="Remove example" variant="danger" /><Button label="Unavailable" disabled />
        <Button label="Save example" busy={busy} busyLabel="Saving example…" onPress={() => setBusy(true)} testID="busy-button" />
        <Button label="Reset busy state" variant="secondary" onPress={() => setBusy(false)} /></Stack>
    </Card>
    <Card title="Fields and clear labels"><Stack>
      <TextField label="Entry label" value={value} onValueChange={setValue} helperText="Optional. This preview saves nothing." />
      <TextField label="Required example" value="" onValueChange={() => {}} required errorText="Enter a label before continuing." />
      <TextField label="Disabled example" value="Unavailable" onValueChange={() => {}} disabled />
      <TextField label="Notes" value={value} onValueChange={setValue} multiline />
    </Stack></Card>
    <Card title="Neutral record labels"><Stack direction="row" wrap space="inline">
      {['Taken', 'Confirmed missed', 'Unsure', 'No entry'].map(label => <StatusBadge key={label} label={label} />)}
    </Stack></Card>
    <Card title="Selection"><Stack direction="row" wrap space="inline">
      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(label => <SelectionButton key={label} label={label} selected={selected === label} onPress={() => setSelected(label)} />)}
    </Stack></Card>
    <Card title="Review this example" variant="proposal"><Stack>
      <p className="preview-text">Before: Example entry<br />After: Morning entry</p>
      <Button label="Preview confirmation" variant="secondary" onPress={dialog.open} />
    </Stack></Card>
    <Feedback kind="success" message={result} />
    <Feedback kind="warning" message="Review needed · example feedback." />
    <Feedback kind="error" message="Could not save · example feedback." />
    <ConfirmDialog open={dialog.isOpen} title="Confirm this example change?" description="Example entry → Morning entry. This preview saves nothing."
      confirmLabel="Confirm example" onCancel={() => { dialog.close(); setResult('Example cancelled. Nothing changed.'); }}
      onConfirm={() => { dialog.close(); setResult('Example confirmed. No record was saved.'); }} />
  </Screen>;
}

createRoot(document.getElementById('root')!).render(<Preview />);
