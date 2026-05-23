// tokens.jsx — Theme tokens & ThemeContext for NUSLink
// Two themes (light / dark) and shared scales. Consumers read via useTheme().

const NUSLinkThemes = {
  light: {
    name: 'light',
    // surface
    bg:       '#F7F4EE',        // warm off-white canvas
    bgRaised: '#FFFFFF',
    card:     '#FFFFFF',
    surface2: '#F0ECE3',        // pill / chip rest
    border:   '#E7E2D6',
    borderStrong: '#D5CFC0',
    // text
    text:     '#1A1614',
    text2:    '#5B5650',
    text3:    '#8C877F',
    // brand
    primary:  '#EF7B45',        // muted NUS orange
    primaryDeep:'#D9633F',
    primarySoft:'#FDE9DD',
    onPrimary:'#FFFFFF',
    // accent
    accent:   '#5B7BA3',        // soft slate blue
    accentSoft:'#E1E8F1',
    // semantic
    success:  '#4A8B6B',
    successSoft:'#DCEFE3',
    danger:   '#C75B4E',
    // dataviz
    ring:     '#EF7B45',
    ringTrack:'#EEE7DB',
    bubbleSelf:'#EF7B45',
    bubbleOther:'#FFFFFF',
    shadow:   '0 1px 2px rgba(45,30,15,0.04), 0 6px 16px rgba(45,30,15,0.06)',
    shadowLg: '0 8px 24px rgba(45,30,15,0.10), 0 24px 60px rgba(45,30,15,0.08)',
  },
  dark: {
    name: 'dark',
    bg:       '#15120F',
    bgRaised: '#1E1A16',
    card:     '#1E1A16',
    surface2: '#2A2520',
    border:   '#2C2722',
    borderStrong:'#3A332C',
    text:     '#F4EFE5',
    text2:    '#B5AEA1',
    text3:    '#807A6F',
    primary:  '#F08A56',
    primaryDeep:'#E36F37',
    primarySoft:'#3A2419',
    onPrimary:'#1A1410',
    accent:   '#7B9CC4',
    accentSoft:'#1F2A38',
    success:  '#6BAE89',
    successSoft:'#1D2E25',
    danger:   '#E07767',
    ring:     '#F08A56',
    ringTrack:'#2D2620',
    bubbleSelf:'#EF7B45',
    bubbleOther:'#2A2520',
    shadow:   '0 1px 2px rgba(0,0,0,0.5), 0 6px 16px rgba(0,0,0,0.4)',
    shadowLg: '0 8px 24px rgba(0,0,0,0.5), 0 24px 60px rgba(0,0,0,0.45)',
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

// Shared scales
const RADIUS = { xs: 6, sm: 10, md: 14, lg: 20, xl: 28, pill: 9999 };
const SPACE  = { '0.5':2, '1':4, '2':8, '3':12, '4':16, '5':20, '6':24, '7':32, '8':40, '9':56 };

Object.assign(window, {
  NUSLinkThemes, ThemeContext, ThemeProvider, useTheme,
  FONT_STACK, FONT_MONO, RADIUS, SPACE,
});
