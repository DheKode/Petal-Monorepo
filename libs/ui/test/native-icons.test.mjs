import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

registerHooks({ resolve(specifier, context, next) {
  if (specifier.startsWith('@animateicons') || specifier.startsWith('react-dom/client')) throw new Error('Web runtime in native icon graph');
  if (specifier === 'react-native') return { url: new URL('./native-host-mock.mjs', import.meta.url).href, shortCircuit: true };
  if (specifier === 'react-native-svg') return { url: new URL('./native-svg-mock.mjs', import.meta.url).href, shortCircuit: true };
  return next(specifier, context);
} });
const { Icon, IconButton, iconNames } = await import('@petal/ui/icons/native');
const html = (Component, props) => renderToStaticMarkup(createElement(Component, props));

test('native icon graph excludes AnimateIcons and renders real Lucide vectors through mocked SVG hosts', () => {
  for (const name of iconNames) {
    const markup = html(Icon, { name });
    assert.match(markup, /<svg/);
    assert.match(markup, /data-important="no-hide-descendants"/);
    assert.doesNotMatch(markup, /aria-label=/);
  }
});
test('native meaningful icons expose one label and preserve physical outline width across sizes', () => {
  for (const dimension of [20, 24, 32]) {
    const size = {20:'small',24:'default',32:'large'}[dimension];
    const markup = html(Icon, { name: 'calendar', size, decorative: false, label: 'Schedule' });
    assert.match(markup, /aria-label="Schedule"/);
    assert.match(markup, /data-accessible="true"/);
    const stroke = Number(markup.match(/stroke-width="([^"]+)"/)[1]);
    assert.ok(Math.abs(stroke * dimension / 24 - 1.75) < 0.001);
  }
});
test('native busy actions retain their label/state and minimum press target', () => {
  const markup = html(IconButton, { name: 'check', label: 'Confirm change', busy: true, busyLabel: 'Confirming…' });
  assert.match(markup, /aria-label="Confirming…"/);
  assert.match(markup, /aria-busy="true"/);
  assert.match(markup, /disabled=""/);
  assert.match(markup, /&quot;minHeight&quot;:48/);
  assert.match(markup, /&quot;minWidth&quot;:48/);
});
