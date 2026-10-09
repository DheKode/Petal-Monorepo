import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Icon, IconButton, iconNames } from '@petal/ui/icons';
import { petalTheme } from '@petal/ui';

const html = (Component, props) => renderToStaticMarkup(createElement(Component, props));

test('every named web icon renders an actual vector without an unsolicited accessible name', () => {
  for (const name of iconNames) {
    const markup = html(Icon, { name });
    assert.match(markup, /<svg/);
    assert.match(markup, /aria-hidden="true"/);
    assert.doesNotMatch(markup, /role="img"|aria-label=/);
    // Server rendering starts static and does not invent an OS motion preference.
    assert.match(markup, /data-animated="false"/);
  }
});
test('meaningful icons expose their label and token-sized canvas', () => {
  for (const [size, value] of Object.entries(petalTheme.semantic.icon.size)) {
    const markup = html(Icon, { name: 'calendar', size, decorative: false, label: 'Schedule' });
    assert.match(markup, /role="img" aria-label="Schedule"/);
    assert.match(markup, new RegExp('width="' + value + '" height="' + value + '"'));
  }
});
test('icon-only actions need labels, cannot submit forms, and disable while busy', () => {
  let presses = 0;
  const markup = html(IconButton, { name: 'check', label: 'Confirm change', busy: true,
    busyLabel: 'Confirming…', onPress() { presses++; } });
  assert.match(markup, /type="button"/);
  assert.match(markup, /aria-label="Confirming…"/);
  assert.match(markup, /disabled=""/);
  assert.match(markup, /aria-busy="true"/);
  assert.equal(presses, 0);
  assert.doesNotMatch(markup, /role="img"/);
});
test('record symbols are different vectors and retain neutral names', () => {
  const vectors = ['taken', 'missed', 'unsure', 'no-entry'].map(name => html(Icon, { name }).replace(/data-icon="[^"]+"/, ''));
  assert.equal(new Set(vectors).size, 4);
  assert.equal(iconNames.includes('protected'), false);
});
