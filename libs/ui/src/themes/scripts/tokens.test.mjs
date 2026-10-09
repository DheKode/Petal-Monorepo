import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { compileTheme, resolveTheme } from './compile.mjs';
import { petalTheme, getPetalTheme } from '../generated/theme.mjs';
import { petalNativeTheme, getPetalNativeTheme } from '../generated/native-theme.mjs';

const source = JSON.parse(await readFile(new URL('../petal.tokens.json', import.meta.url), 'utf8'));
const fixture = entries => ({$extensions: {'org.petal': {version:'test', appearance:'light'}}, ...entries});
test('a primitive edit propagates through semantic and component aliases without changing source', () => {
  const edited = structuredClone(source);
  edited.primitive.color.rose.$value = {colorSpace:'srgb', components:[0,0,0], hex:'#000000'};
  const {web, native, files} = compileTheme(edited);
  assert.equal(web.semantic.color.action.primary, '#000000');
  assert.equal(web.component.button.primary.background, '#000000');
  assert.equal(native.component.button.primary.background, '#000000');
  assert.match(files['theme.css'], /--petal-component-button-primary-background: var\(--petal-color-action-primary\)/);
  assert.equal(source.primitive.color.rose.$value.hex, '#B83D70');
});
test('rejects missing/circular references, alias type mismatches, and mismatched composite references', () => {
  assert.throws(() => resolveTheme(fixture({a:{$type:'number',$value:'{missing}'}})), /missing reference/);
  assert.throws(() => resolveTheme(fixture({a:{$type:'number',$value:'{b}'},b:{$type:'number',$value:'{a}'}})), /circular reference/);
  assert.throws(() => resolveTheme(fixture({a:{$type:'number',$value:1},b:{$type:'dimension',$value:'{a}'}})), /alias type/);
  const bad = structuredClone(source);
  bad.semantic.type.body.$value.fontWeight = '{semantic.layer.base}';
  assert.throws(() => resolveTheme(bad), /reference requires fontWeight/);
});
test('rejects malformed values, unsafe names, unsupported features and CSS name collisions', () => {
  assert.throws(() => resolveTheme(fixture({a:{$type:'color',$value:{colorSpace:'srgb',components:[0,0,0],hex:'#FFFFFF'}}})), /disagree/);
  assert.throws(() => resolveTheme(fixture({a:{$type:'dimension',$value:{value:-1,unit:'px'}}})), /dimension/);
  assert.throws(() => resolveTheme(fixture({a:{$type:'cubicBezier',$value:[1.1,0,0,1]}})), /Bezier/);
  assert.throws(() => resolveTheme(JSON.parse('{"constructor":{"$type":"number","$value":1}}')), /unsafe export key/);
  assert.throws(() => resolveTheme({a:{$extends:'{b}'}}), /outside the Petal compiler subset/);
  assert.throws(() => compileTheme(fixture({fooBar:{$type:'number',$value:1},'foo-bar':{$type:'number',$value:2}})), /collision/);
});
test('exports CSS relative units and native absolute dimensions, line heights, and font weights', () => {
  const {files, native} = compileTheme(source);
  assert.match(files['theme.css'], /--petal-primitive-font-size-s16: 1rem/);
  assert.match(files['theme.css'], /--petal-primitive-border-thin: 1px/);
  assert.equal(native.semantic.type.body.fontSize, 16);
  assert.equal(native.semantic.type.body.lineHeight, 24);
  assert.equal(native.semantic.type.label.lineHeight, 20);
  assert.equal(native.semantic.type.label.fontWeight, '500');
  assert.equal(native.semantic.type.body.fontFamily, 'Geist Mono');
  assert.equal(native.component.button.minHeight, 48);
  assert.equal(native.component.field.minHeight, 48);
  const {native: converted} = compileTheme(fixture({dimension:{$type:'dimension',$value:{value:2,unit:'rem'}},duration:{$type:'duration',$value:{value:.2,unit:'s'}}}));
  assert.equal(converted.dimension, 32);
  assert.equal(converted.duration, 200);
});
test('reduced-motion getters remove component and primitive durations and preserve frozen defaults', () => {
  for (const [base, getter] of [[petalTheme,getPetalTheme],[petalNativeTheme,getPetalNativeTheme]]) {
    assert.equal(getter(), base);
    const reduced = getter({reduceMotion:true});
    assert.equal(reduced.primitive.duration.fast, 0);
    assert.equal(reduced.semantic.motion.duration.normal, 0);
    assert.equal(reduced.component.button.transition, 0);
    assert.equal(base.component.button.transition, 120);
    assert(Object.isFrozen(reduced.component.button));
    assert(Object.isFrozen(base.component.button));
  }
  assert.equal(petalNativeTheme.semantic.type.body.lineHeight, 24);
});
function luminance(hex) {
  const rgb=hex.slice(1).match(/../g).map(n=>parseInt(n,16)/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4);
  return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];
}
function contrast(a,b) {const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
test('declared essential text, action, feedback, control and focus color pairs meet contrast thresholds', () => {
  const c=petalTheme.semantic.color;
  const pairs=[];
  for(const bg of [c.surface,c.background,c.surfaceSubtle])for(const fg of [c.text.primary,c.text.secondary,c.text.link])pairs.push([fg,bg,4.5]);
  for(const bg of [c.action.primary,c.action.hover,c.action.pressed])pairs.push([c.text.onAction,bg,4.5]);
  for(const status of Object.values(c.feedback))pairs.push([status.text,status.surface,4.5]);
  pairs.push([c.action.disabledText,c.action.disabled,4.5]);
  for(const bg of [c.surface,c.background,c.surfaceSubtle])pairs.push([c.border.control,bg,3],[c.focus,bg,3]);
  for(const [fg,bg,min] of pairs)assert(contrast(fg,bg)>=min,`${fg} on ${bg}: ${contrast(fg,bg).toFixed(2)} < ${min}`);
});
test('checked-in web and native outputs match the canonical source and regenerate without drift', () => {
  const {web,native}=compileTheme(source);
  assert.deepEqual(petalTheme,web);
  assert.deepEqual(petalNativeTheme,native);
  const result=spawnSync(process.execPath,[fileURLToPath(new URL('./build.mjs',import.meta.url)),'--check'],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
});
