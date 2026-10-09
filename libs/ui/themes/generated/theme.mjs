// Generated from petal.tokens.json. Do not edit.
const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
export const petalTheme = freeze({
  "primitive": {
    "color": {
      "rose": "#B83D70",
      "white": "#FFFFFF",
      "softWhite": "#FFF7FA",
      "blush": "#FCE8EF",
      "plum": "#33252D",
      "mutedPlum": "#745D69",
      "roseHover": "#A73563",
      "rosePressed": "#922D56",
      "borderSubtle": "#E7D5DE",
      "borderControl": "#917584",
      "error": "#A32640",
      "errorSurface": "#FCE9EC",
      "warning": "#835C17",
      "warningSurface": "#FFF3D9",
      "success": "#2B6B59",
      "successSurface": "#EAF4EF"
    },
    "spacing": {
      "s0": 0,
      "s2": 2,
      "s4": 4,
      "s8": 8,
      "s12": 12,
      "s16": 16,
      "s20": 20,
      "s24": 24,
      "s32": 32,
      "s40": 40,
      "s48": 48,
      "s64": 64,
      "s96": 96
    },
    "radius": {
      "none": 0,
      "small": 8,
      "control": 12,
      "container": 16,
      "sheet": 24,
      "round": 9999
    },
    "border": {
      "thin": 1,
      "focus": 2
    },
    "font": {
      "family": [
        "Geist Mono",
        "monospace"
      ],
      "weight": {
        "regular": 400,
        "medium": 500,
        "semibold": 600
      },
      "size": {
        "s12": 12,
        "s14": 14,
        "s16": 16,
        "s18": 18,
        "s20": 20,
        "s24": 24,
        "s32": 32
      },
      "letterSpacing": 0
    },
    "duration": {
      "none": 0,
      "fast": 120,
      "normal": 180,
      "slow": 240
    },
    "easing": {
      "standard": [
        0.2,
        0,
        0,
        1
      ]
    }
  },
  "semantic": {
    "color": {
      "background": "#FFF7FA",
      "surface": "#FFFFFF",
      "surfaceSubtle": "#FCE8EF",
      "text": {
        "primary": "#33252D",
        "secondary": "#745D69",
        "onAction": "#FFFFFF",
        "link": "#B83D70"
      },
      "action": {
        "primary": "#B83D70",
        "hover": "#A73563",
        "pressed": "#922D56",
        "disabled": "#FCE8EF",
        "disabledText": "#745D69"
      },
      "border": {
        "subtle": "#E7D5DE",
        "control": "#917584"
      },
      "focus": "#B83D70",
      "feedback": {
        "error": {
          "text": "#A32640",
          "surface": "#FCE9EC"
        },
        "warning": {
          "text": "#835C17",
          "surface": "#FFF3D9"
        },
        "success": {
          "text": "#2B6B59",
          "surface": "#EAF4EF"
        }
      }
    },
    "type": {
      "caption": {
        "fontFamily": [
          "Geist Mono",
          "monospace"
        ],
        "fontSize": 12,
        "fontWeight": 400,
        "letterSpacing": 0,
        "lineHeight": 1.5
      },
      "label": {
        "fontFamily": [
          "Geist Mono",
          "monospace"
        ],
        "fontSize": 14,
        "fontWeight": 500,
        "letterSpacing": 0,
        "lineHeight": 1.4285714285714286
      },
      "body": {
        "fontFamily": [
          "Geist Mono",
          "monospace"
        ],
        "fontSize": 16,
        "fontWeight": 400,
        "letterSpacing": 0,
        "lineHeight": 1.5
      },
      "bodyLarge": {
        "fontFamily": [
          "Geist Mono",
          "monospace"
        ],
        "fontSize": 18,
        "fontWeight": 400,
        "letterSpacing": 0,
        "lineHeight": 1.5555555555555556
      },
      "title": {
        "fontFamily": [
          "Geist Mono",
          "monospace"
        ],
        "fontSize": 20,
        "fontWeight": 600,
        "letterSpacing": 0,
        "lineHeight": 1.4
      },
      "heading": {
        "fontFamily": [
          "Geist Mono",
          "monospace"
        ],
        "fontSize": 24,
        "fontWeight": 600,
        "letterSpacing": 0,
        "lineHeight": 1.3333333333333333
      },
      "display": {
        "fontFamily": [
          "Geist Mono",
          "monospace"
        ],
        "fontSize": 32,
        "fontWeight": 600,
        "letterSpacing": 0,
        "lineHeight": 1.25
      }
    },
    "space": {
      "inline": 8,
      "related": 12,
      "group": 16,
      "section": 24,
      "page": 32
    },
    "layout": {
      "gutterCompact": 20,
      "gutterWide": 32,
      "readingMax": 720,
      "contentMax": 1200,
      "wideBreakpoint": 768
    },
    "size": {
      "touchTarget": 48,
      "icon": 24
    },
    "radius": {
      "control": 12,
      "container": 16,
      "sheet": 24,
      "round": 9999
    },
    "focus": {
      "width": 2,
      "offset": 2
    },
    "border": {
      "width": 1
    },
    "elevation": {
      "flat": 0
    },
    "layer": {
      "base": 0,
      "sticky": 10,
      "popover": 20,
      "modal": 30,
      "toast": 40
    },
    "motion": {
      "duration": {
        "fast": 120,
        "normal": 180,
        "slow": 240
      },
      "easing": [
        0.2,
        0,
        0,
        1
      ]
    }
  },
  "component": {
    "button": {
      "minHeight": 48,
      "radius": 12,
      "paddingInline": 20,
      "paddingBlock": 12,
      "gap": 8,
      "type": {
        "fontFamily": [
          "Geist Mono",
          "monospace"
        ],
        "fontSize": 14,
        "fontWeight": 500,
        "letterSpacing": 0,
        "lineHeight": 1.4285714285714286
      },
      "transition": 120,
      "primary": {
        "background": "#B83D70",
        "foreground": "#FFFFFF",
        "hover": "#A73563",
        "pressed": "#922D56"
      },
      "secondary": {
        "background": "#FFFFFF",
        "foreground": "#B83D70",
        "border": "#917584"
      },
      "disabled": {
        "background": "#FCE8EF",
        "foreground": "#745D69"
      }
    },
    "field": {
      "minHeight": 48,
      "radius": 12,
      "paddingInline": 16,
      "paddingBlock": 12,
      "background": "#FFFFFF",
      "foreground": "#33252D",
      "placeholder": "#745D69",
      "border": "#917584",
      "borderWidth": 1,
      "errorBorder": "#A32640",
      "type": {
        "fontFamily": [
          "Geist Mono",
          "monospace"
        ],
        "fontSize": 16,
        "fontWeight": 400,
        "letterSpacing": 0,
        "lineHeight": 1.5
      }
    },
    "card": {
      "background": "#FFFFFF",
      "radius": 16,
      "padding": 20,
      "gap": 16,
      "border": "#E7D5DE",
      "borderWidth": 1
    },
    "navigation": {
      "minTarget": 48,
      "activeBackground": "#FCE8EF",
      "activeForeground": "#B83D70",
      "foreground": "#745D69",
      "type": {
        "fontFamily": [
          "Geist Mono",
          "monospace"
        ],
        "fontSize": 14,
        "fontWeight": 500,
        "letterSpacing": 0,
        "lineHeight": 1.4285714285714286
      }
    },
    "status": {
      "background": "#FCE8EF",
      "foreground": "#33252D",
      "radius": 8,
      "paddingInline": 8,
      "paddingBlock": 4,
      "type": {
        "fontFamily": [
          "Geist Mono",
          "monospace"
        ],
        "fontSize": 14,
        "fontWeight": 500,
        "letterSpacing": 0,
        "lineHeight": 1.4285714285714286
      }
    },
    "dialog": {
      "background": "#FFFFFF",
      "radius": 24,
      "padding": 24,
      "gap": 16
    }
  }
});
export const petalThemeMetadata = freeze({"version":"0.1.0","appearance":"light","format":"DTCG 2025.10","status":"Approved brand colors/family; new dimensions, functional colors, and states are initial baseline for review."});
export function getPetalTheme({ reduceMotion = false } = {}) {
  if (!reduceMotion) return petalTheme;
  const theme = JSON.parse(JSON.stringify(petalTheme));
  for (const segments of [["primitive","duration","none"],["primitive","duration","fast"],["primitive","duration","normal"],["primitive","duration","slow"],["semantic","motion","duration","fast"],["semantic","motion","duration","normal"],["semantic","motion","duration","slow"],["component","button","transition"]]) {
    let parent = theme;
    for (const key of segments.slice(0, -1)) parent = parent[key];
    parent[segments.at(-1)] = 0;
  }
  return freeze(theme);
}
