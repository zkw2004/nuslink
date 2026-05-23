// tokens.jsx — Theme tokens & ThemeContext for NUSLink (B&W + light blue accents).
// Visual direction: Commuin / Vektora — white cards on light-blue gradient,
// black filled CTAs, generous rounding, no orange anywhere.

const NUSLinkThemes = {
  light: {
    name: 'light',
    // surface
    bg:        '#EEF3F9',       // light blue-tinted base
    bgGradient:'radial-gradient(120% 80% at 100% 0%, #DEE9F6 0%, #EEF3F9 40%, #F4F7FB 100%)',
    bgRaised:  '#FFFFFF',
    card:      '#FFFFFF',
    surface2:  '#EEF2F7',       // pill / chip rest — soft blue-gray
    border:    '#E4E9F1',
    borderStrong: '#D0D7E2',
    // text — true B&W
    text:      '#0F1115',
    text2:     '#5C6370',
    text3:     '#9AA0AB',
    // brand — BLACK is the primary
    primary:   '#0F1115',
    primaryDeep:'#000000',
    primarySoft:'#E7EEF7',      // soft blue surface for tinted states
    onPrimary: '#FFFFFF',
    // accent — soft slate blue (used VERY sparingly, mainly for hints/data)
    accent:    '#5B7BA3',
    accentSoft:'#E1EAF5',
    // semantic
    success:   '#3F7D63',
    successSoft:'#DDECE4',
    danger:    '#B5483D',
    // dataviz
    ring:      '#0F1115',
    ringTrack: '#E4E9F1',
    bubbleSelf:'#0F1115',
    bubbleOther:'#FFFFFF',
    shadow:    '0 1px 2px rgba(20,28,46,0.04), 0 6px 18px rgba(20,28,46,0.06)',
    shadowLg:  '0 8px 24px rgba(20,28,46,0.08), 0 24px 60px rgba(20,28,46,0.10)',
  },
  dark: {
    name: 'dark',
    bg:        '#0B0E13',
    bgGradient:'radial-gradient(120% 80% at 100% 0%, #14202E 0%, #0E1319 45%, #0B0E13 100%)',
    bgRaised:  '#161A22',
    card:      '#161A22',
    surface2:  '#1E232D',
    border:    '#222732',
    borderStrong:'#2D3340',
    text:      '#F4F6FA',
    text2:     '#A8AFBC',
    text3:     '#6B7280',
    primary:   '#FFFFFF',
    primaryDeep:'#FFFFFF',
    primarySoft:'#1E2A3B',
    onPrimary: '#0B0E13',
    accent:    '#7B9CC4',
    accentSoft:'#1B2433',
    success:   '#6BAE89',
    successSoft:'#1A2820',
    danger:    '#D87567',
    ring:      '#FFFFFF',
    ringTrack: '#22293A',
    bubbleSelf:'#FFFFFF',
    bubbleOther:'#1E232D',
    shadow:    '0 1px 2px rgba(0,0,0,0.5), 0 6px 16px rgba(0,0,0,0.4)',
    shadowLg:  '0 8px 24px rgba(0,0,0,0.55), 0 24px 60px rgba(0,0,0,0.5)',
  },
};

// Typography — SF Pro on iOS, Inter fallback elsewhere
const FONT_STACK = '-apple-system, "SF Pro Display", "SF Pro Text", "Inter", system-ui, sans-serif';
const FONT_MONO  = 'ui-monospace, "SF Mono", "JetBrains Mono", monospace';

const ThemeContext = React.createContext(NUSLinkThemes.light);
const useTheme = () => React.useContext(ThemeContext);

function ThemeProvider({ mode = 'light', children }) {
  const t = NUSLinkThemes[mode] || NUSLinkThemes.light;
  return <ThemeContext.Provider value={t}>{children}</ThemeContext.Provider>;
}

// Shared scales — bumped up to match Commuin/Vektora's generous rounding
const RADIUS = { xs: 8, sm: 12, md: 18, lg: 24, xl: 32, pill: 9999 };
const SPACE  = { '0.5':2, '1':4, '2':8, '3':12, '4':16, '5':20, '6':24, '7':32, '8':40, '9':56 };

// Neutral shadow rgbs for inline use
const SHADOW_RGBA = 'rgba(20,28,46,';

Object.assign(window, {
  NUSLinkThemes, ThemeContext, ThemeProvider, useTheme,
  FONT_STACK, FONT_MONO, RADIUS, SPACE, SHADOW_RGBA,
});
