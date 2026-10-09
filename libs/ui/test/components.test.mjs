import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Button, TextField, StatusBadge, SelectionButton, Feedback, Card, ConfirmDialog } from '@petal/ui/components';
import { Screen, Stack } from '@petal/ui/layouts';
import { buttonAppearance, classNames, resolveLayout } from '@petal/ui/utils';
import { petalNativeTheme } from '@petal/ui';
const html = (Component, props) => renderToStaticMarkup(createElement(Component, props));

test('busy actions are disabled and cannot accidentally submit a surrounding form', () => {
  const markup = html(Button, { label:'Save', busy:true, busyLabel:'Saving…' });
  assert.match(markup, /type="button"/);
  assert.match(markup, /disabled=""/);
  assert.match(markup, /aria-busy="true"/);
  assert.match(markup, /Saving…/);
});
test('fields link visible labels, hints and errors and escape user content', () => {
  const markup = html(TextField, { id:'note', label:'Note', value:'<script>example</script>', onValueChange() {},
    required:true, helperText:'Optional context', errorText:'Review this label' });
  assert.match(markup, /for="note"/);
  assert.match(markup, /aria-describedby="note-help note-error"/);
  assert.match(markup, /aria-invalid="true"/);
  assert.match(markup, /&lt;script&gt;/);
  assert.doesNotMatch(markup, /<script>/);
  const multiline = html(TextField, { label:'Details', value:'Example', multiline:true, onValueChange() {} });
  assert.match(multiline, /<textarea/);
});
test('record labels stay explicit and selected state is exposed independently of color', () => {
  for (const label of ['Taken','Confirmed missed','Unsure','No entry']) assert.match(html(StatusBadge,{label}),new RegExp(label));
  assert.match(html(SelectionButton,{label:'Friday',selected:true,onPress(){}}),/aria-pressed="true"/);
  assert.match(html(Feedback,{kind:'error',message:'Could not save'}),/role="alert"/);
});
test('confirmation has no server-rendered open state and does not call either callback during rendering', () => {
  let writes = 0, cancellations = 0;
  const markup = html(ConfirmDialog,{open:true,title:'Review change',description:'Before → after',confirmLabel:'Confirm change',
    onConfirm(){writes++;},onCancel(){cancellations++;}});
  assert.doesNotMatch(markup, /<dialog[^>]*\sopen(?:\s|=|>)/);
  assert.equal(writes,0); assert.equal(cancellations,0);
  assert.match(markup, /aria-labelledby="[^"]+"/);
  assert.match(markup, /Cancel/);
});
test('responsive measurements honor breakpoint boundaries, large native text and invalid dimensions', () => {
  assert.equal(resolveLayout(767).isWide,false);
  assert.equal(resolveLayout(768).isWide,true);
  assert.equal(resolveLayout(1080,2).isWide,false);
  assert.equal(resolveLayout(NaN).isWide,false);
  assert.equal(resolveLayout(-10).gutter,20);
  assert.equal(classNames('petal-card',false,undefined,'custom'),'petal-card custom');
  assert.equal(buttonAppearance('primary',true,true).background,petalNativeTheme.component.button.disabled.background);
  assert.equal(buttonAppearance('primary',false,true).background,petalNativeTheme.component.button.primary.pressed);
});
test('composed layouts and proposal containers preserve their content and semantic headings', () => {
  const markup = html(Screen,{title:'Review',children:createElement(Card,{title:'Proposed change',variant:'proposal'},
    createElement(Stack,{space:'related'},createElement(StatusBadge,{label:'Unsure'})))});
  assert.match(markup, /<main/); assert.match(markup, /data-petal-ui/);
  assert.match(markup, /petal-proposal/); assert.match(markup, /data-space="related"/);
  assert.match(markup, /Unsure/);
});
