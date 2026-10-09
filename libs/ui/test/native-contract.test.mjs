import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

registerHooks({resolve(specifier,context,next){
  if(specifier === 'react-native') return {url:new URL('./native-host-mock.mjs',import.meta.url).href,shortCircuit:true};
  return next(specifier,context);
}});
const {Button,TextField,ConfirmDialog,StatusBadge} = await import('@petal/ui/components/native');
const {Screen} = await import('@petal/ui/layouts/native');
const html = (Component,props) => renderToStaticMarkup(createElement(Component,props));

test('native host contract: busy disables the press target and exposes busy state',()=>{
  const markup=html(Button,{label:'Save',busy:true,busyLabel:'Saving…'});
  assert.match(markup,/disabled=""/); assert.match(markup,/aria-busy="true"/);
  assert.match(markup,/Saving…/); assert.match(markup,/data-font-scaling="on"/);
  assert.match(markup,/&quot;minHeight&quot;:48/);
});
test('native host contract: fields retain labels, error hints, editable state and font scaling',()=>{
  const markup=html(TextField,{label:'Note',value:'Example',onValueChange(){},disabled:true,errorText:'Review note'});
  assert.match(markup,/aria-label="Note"/); assert.match(markup,/data-hint="Review note"/);
  assert.match(markup,/disabled=""/); assert.match(markup,/Review note/);
  assert.doesNotMatch(markup,/data-font-scaling="off"/);
});
test('native host contract: closed modal hides confirmation and rendering performs no write',()=>{
  let writes=0;
  const props={title:'Review',description:'Before → after',confirmLabel:'Confirm',onConfirm(){writes++;},onCancel(){}};
  assert.equal(html(ConfirmDialog,{...props,open:false}),'');
  assert.match(html(ConfirmDialog,{...props,open:true}),/Cancel/);
  assert.equal(writes,0);
});
test('native host contract: large-font layout keeps compact gutters and neutral status wording',()=>{
  const markup=html(Screen,{title:'Review',children:createElement(StatusBadge,{label:'Unsure'})});
  assert.match(markup,/&quot;paddingHorizontal&quot;:20/);
  assert.match(markup,/Unsure/); assert.doesNotMatch(markup,/data-font-scaling="off"/);
});
