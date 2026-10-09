// Node-only host stand-ins. These verify props/composition, never Android rendering.
import { createElement, forwardRef } from 'react';
const host = (kind, tag) => forwardRef(function Host(props, ref) {
  const state = props.accessibilityState ?? {};
  const style = typeof props.style === 'function' ? props.style({pressed:false}) : props.style;
  const children = typeof props.children === 'function' ? props.children({pressed:false}) : props.children;
  return createElement(tag, { ref, 'data-host':kind, 'data-style':JSON.stringify(style),
    'data-font-scaling':props.allowFontScaling === false ? 'off' : 'on',
    'aria-label':props.accessibilityLabel, 'aria-busy':state.busy || undefined,
    'aria-pressed':state.selected, disabled:state.disabled || props.editable === false || undefined,
    value:tag === 'input' ? props.value : undefined, readOnly:tag === 'input' ? true : undefined,
    'data-hint':props.accessibilityHint, 'data-live':props.accessibilityLiveRegion,
  }, children);
});
export const View = host('View','div');
export const Text = host('Text','span');
export const Pressable = host('Pressable','button');
export const TextInput = host('TextInput','input');
export const ScrollView = host('ScrollView','div');
export function Modal({visible,children}) { return visible ? children : null; }
export const AccessibilityInfo = {
  isReduceMotionEnabled:async()=>true,
  addEventListener:()=>({remove(){}}),
  sendAccessibilityEvent(){},
};
export const useWindowDimensions = () => ({width:1080,height:1920,fontScale:2,scale:3});
