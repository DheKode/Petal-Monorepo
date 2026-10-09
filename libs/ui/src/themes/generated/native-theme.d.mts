// Generated from petal.tokens.json. Do not edit.
export declare const petalNativeTheme: {
  readonly "primitive": {
    readonly "color": {
      readonly "rose": "#B83D70";
      readonly "white": "#FFFFFF";
      readonly "softWhite": "#FFF7FA";
      readonly "blush": "#FCE8EF";
      readonly "plum": "#33252D";
      readonly "mutedPlum": "#745D69";
      readonly "roseHover": "#A73563";
      readonly "rosePressed": "#922D56";
      readonly "borderSubtle": "#E7D5DE";
      readonly "borderControl": "#917584";
      readonly "error": "#A32640";
      readonly "errorSurface": "#FCE9EC";
      readonly "warning": "#835C17";
      readonly "warningSurface": "#FFF3D9";
      readonly "success": "#2B6B59";
      readonly "successSurface": "#EAF4EF";
    };
    readonly "spacing": {
      readonly "s0": 0;
      readonly "s2": 2;
      readonly "s4": 4;
      readonly "s8": 8;
      readonly "s12": 12;
      readonly "s16": 16;
      readonly "s20": 20;
      readonly "s24": 24;
      readonly "s32": 32;
      readonly "s40": 40;
      readonly "s48": 48;
      readonly "s64": 64;
      readonly "s96": 96;
    };
    readonly "radius": {
      readonly "none": 0;
      readonly "small": 8;
      readonly "control": 12;
      readonly "container": 16;
      readonly "sheet": 24;
      readonly "round": 9999;
    };
    readonly "border": {
      readonly "thin": 1;
      readonly "focus": 2;
    };
    readonly "font": {
      readonly "family": "Geist Mono";
      readonly "weight": {
        readonly "regular": "400";
        readonly "medium": "500";
        readonly "semibold": "600";
      };
      readonly "size": {
        readonly "s12": 12;
        readonly "s14": 14;
        readonly "s16": 16;
        readonly "s18": 18;
        readonly "s20": 20;
        readonly "s24": 24;
        readonly "s32": 32;
      };
      readonly "letterSpacing": 0;
    };
    readonly "duration": {
      readonly "none": number;
      readonly "fast": number;
      readonly "normal": number;
      readonly "slow": number;
    };
    readonly "easing": {
      readonly "standard": readonly [0.2, 0, 0, 1];
    };
  };
  readonly "semantic": {
    readonly "color": {
      readonly "background": "#FFF7FA";
      readonly "surface": "#FFFFFF";
      readonly "surfaceSubtle": "#FCE8EF";
      readonly "text": {
        readonly "primary": "#33252D";
        readonly "secondary": "#745D69";
        readonly "onAction": "#FFFFFF";
        readonly "link": "#B83D70";
      };
      readonly "action": {
        readonly "primary": "#B83D70";
        readonly "hover": "#A73563";
        readonly "pressed": "#922D56";
        readonly "disabled": "#FCE8EF";
        readonly "disabledText": "#745D69";
      };
      readonly "border": {
        readonly "subtle": "#E7D5DE";
        readonly "control": "#917584";
      };
      readonly "focus": "#B83D70";
      readonly "feedback": {
        readonly "error": {
          readonly "text": "#A32640";
          readonly "surface": "#FCE9EC";
        };
        readonly "warning": {
          readonly "text": "#835C17";
          readonly "surface": "#FFF3D9";
        };
        readonly "success": {
          readonly "text": "#2B6B59";
          readonly "surface": "#EAF4EF";
        };
      };
    };
    readonly "type": {
      readonly "caption": {
        readonly "fontFamily": "Geist Mono";
        readonly "fontSize": 12;
        readonly "fontWeight": "400";
        readonly "letterSpacing": 0;
        readonly "lineHeight": 18;
      };
      readonly "label": {
        readonly "fontFamily": "Geist Mono";
        readonly "fontSize": 14;
        readonly "fontWeight": "500";
        readonly "letterSpacing": 0;
        readonly "lineHeight": 20;
      };
      readonly "body": {
        readonly "fontFamily": "Geist Mono";
        readonly "fontSize": 16;
        readonly "fontWeight": "400";
        readonly "letterSpacing": 0;
        readonly "lineHeight": 24;
      };
      readonly "bodyLarge": {
        readonly "fontFamily": "Geist Mono";
        readonly "fontSize": 18;
        readonly "fontWeight": "400";
        readonly "letterSpacing": 0;
        readonly "lineHeight": 28;
      };
      readonly "title": {
        readonly "fontFamily": "Geist Mono";
        readonly "fontSize": 20;
        readonly "fontWeight": "600";
        readonly "letterSpacing": 0;
        readonly "lineHeight": 28;
      };
      readonly "heading": {
        readonly "fontFamily": "Geist Mono";
        readonly "fontSize": 24;
        readonly "fontWeight": "600";
        readonly "letterSpacing": 0;
        readonly "lineHeight": 32;
      };
      readonly "display": {
        readonly "fontFamily": "Geist Mono";
        readonly "fontSize": 32;
        readonly "fontWeight": "600";
        readonly "letterSpacing": 0;
        readonly "lineHeight": 40;
      };
    };
    readonly "space": {
      readonly "inline": 8;
      readonly "related": 12;
      readonly "group": 16;
      readonly "section": 24;
      readonly "page": 32;
    };
    readonly "layout": {
      readonly "gutterCompact": 20;
      readonly "gutterWide": 32;
      readonly "readingMax": 720;
      readonly "contentMax": 1200;
      readonly "wideBreakpoint": 768;
    };
    readonly "size": {
      readonly "touchTarget": 48;
      readonly "icon": 24;
    };
    readonly "radius": {
      readonly "control": 12;
      readonly "container": 16;
      readonly "sheet": 24;
      readonly "round": 9999;
    };
    readonly "focus": {
      readonly "width": 2;
      readonly "offset": 2;
    };
    readonly "border": {
      readonly "width": 1;
    };
    readonly "elevation": {
      readonly "flat": 0;
    };
    readonly "layer": {
      readonly "base": 0;
      readonly "sticky": 10;
      readonly "popover": 20;
      readonly "modal": 30;
      readonly "toast": 40;
    };
    readonly "motion": {
      readonly "duration": {
        readonly "fast": number;
        readonly "normal": number;
        readonly "slow": number;
      };
      readonly "easing": readonly [0.2, 0, 0, 1];
    };
  };
  readonly "component": {
    readonly "button": {
      readonly "minHeight": 48;
      readonly "radius": 12;
      readonly "paddingInline": 20;
      readonly "paddingBlock": 12;
      readonly "gap": 8;
      readonly "type": {
        readonly "fontFamily": "Geist Mono";
        readonly "fontSize": 14;
        readonly "fontWeight": "500";
        readonly "letterSpacing": 0;
        readonly "lineHeight": 20;
      };
      readonly "transition": number;
      readonly "primary": {
        readonly "background": "#B83D70";
        readonly "foreground": "#FFFFFF";
        readonly "hover": "#A73563";
        readonly "pressed": "#922D56";
      };
      readonly "secondary": {
        readonly "background": "#FFFFFF";
        readonly "foreground": "#B83D70";
        readonly "border": "#917584";
      };
      readonly "disabled": {
        readonly "background": "#FCE8EF";
        readonly "foreground": "#745D69";
      };
    };
    readonly "field": {
      readonly "minHeight": 48;
      readonly "radius": 12;
      readonly "paddingInline": 16;
      readonly "paddingBlock": 12;
      readonly "background": "#FFFFFF";
      readonly "foreground": "#33252D";
      readonly "placeholder": "#745D69";
      readonly "border": "#917584";
      readonly "borderWidth": 1;
      readonly "errorBorder": "#A32640";
      readonly "type": {
        readonly "fontFamily": "Geist Mono";
        readonly "fontSize": 16;
        readonly "fontWeight": "400";
        readonly "letterSpacing": 0;
        readonly "lineHeight": 24;
      };
    };
    readonly "card": {
      readonly "background": "#FFFFFF";
      readonly "radius": 16;
      readonly "padding": 20;
      readonly "gap": 16;
      readonly "border": "#E7D5DE";
      readonly "borderWidth": 1;
    };
    readonly "navigation": {
      readonly "minTarget": 48;
      readonly "activeBackground": "#FCE8EF";
      readonly "activeForeground": "#B83D70";
      readonly "foreground": "#745D69";
      readonly "type": {
        readonly "fontFamily": "Geist Mono";
        readonly "fontSize": 14;
        readonly "fontWeight": "500";
        readonly "letterSpacing": 0;
        readonly "lineHeight": 20;
      };
    };
    readonly "status": {
      readonly "background": "#FCE8EF";
      readonly "foreground": "#33252D";
      readonly "radius": 8;
      readonly "paddingInline": 8;
      readonly "paddingBlock": 4;
      readonly "type": {
        readonly "fontFamily": "Geist Mono";
        readonly "fontSize": 14;
        readonly "fontWeight": "500";
        readonly "letterSpacing": 0;
        readonly "lineHeight": 20;
      };
    };
    readonly "dialog": {
      readonly "background": "#FFFFFF";
      readonly "radius": 24;
      readonly "padding": 24;
      readonly "gap": 16;
    };
  };
};
export type PetalNativeTheme = typeof petalNativeTheme;
export declare const petalThemeMetadata: {
  readonly "version": "0.1.0";
  readonly "appearance": "light";
  readonly "format": "DTCG 2025.10";
  readonly "status": "Approved brand colors/family; new dimensions, functional colors, and states are initial baseline for review.";
};
export declare function getPetalNativeTheme(options?: { reduceMotion?: boolean }): typeof petalNativeTheme;
