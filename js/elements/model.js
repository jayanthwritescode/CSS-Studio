const TYPES = new Set(['rectangle', 'circle', 'text', 'image']);
const HEX = /^#[\da-f]{6}$/i;
const NUMBERS = {
  x: [-100000, 100000], y: [-100000, 100000], width: [1, 10000], height: [1, 10000],
  rotation: [-36000, 36000], scaleX: [0.05, 10], scaleY: [0.05, 10], opacity: [0, 1],
  borderWidth: [0, 100], borderRadius: [0, 10000], fontSize: [1, 1000], fontWeight: [100, 900],
};
export const FONT_FAMILIES = ['Inter, sans-serif', 'Arial, sans-serif', 'Georgia, serif', 'monospace'];
export const ORIGINS = ['0% 0%', '50% 0%', '100% 0%', '0% 50%', '50% 50%', '100% 50%', '0% 100%', '50% 100%', '100% 100%'];
export const isImageSource = value => typeof value === 'string' && /^data:image\/(?:png|jpeg|gif|webp);base64,[a-z\d+/=]+$/i.test(value) && value.length <= 7_000_000;
export const newId = () => globalThis.crypto?.randomUUID?.() ?? `element-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function createElement(type, canvas, count = 0, asset = {}) {
  if (!TYPES.has(type)) throw new TypeError('Unsupported element type');
  if (type === 'image' && !isImageSource(asset.src)) throw new TypeError('Unsupported image source');
  let width = type === 'text' ? 360 : 180;
  let height = type === 'text' ? 90 : 180;
  if (type === 'image') {
    const ratio = asset.width / asset.height;
    if (!Number.isFinite(ratio) || ratio <= 0) throw new TypeError('Invalid image dimensions');
    width = Math.min(400, canvas.width * 0.7);
    height = width / ratio;
    if (height > canvas.height * 0.7) { width *= canvas.height * 0.7 / height; height = canvas.height * 0.7; }
  }
  width = Math.max(1, Math.min(width, canvas.width * 0.8));
  height = Math.max(1, Math.min(height, canvas.height * 0.8));
  return {
    id: newId(), type, name: `${type[0].toUpperCase()}${type.slice(1)} ${count + 1}`,
    visible: true, locked: false, content: type === 'text' ? 'Make it move.' : '',
    ...(type === 'image' ? { src: asset.src } : {}),
    styles: {
      x: Math.round((canvas.width - width) / 2), y: Math.round((canvas.height - height) / 2),
      width, height, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1,
      backgroundColor: type === 'text' || type === 'image' ? '#faf9ff' : '#9271ed',
      backgroundTransparent: type === 'text' || type === 'image', color: '#302547',
      borderWidth: 0, borderStyle: 'solid', borderColor: '#6c4bb8', borderRadius: type === 'circle' ? 9999 : 16,
      boxShadow: 'none', fontFamily: FONT_FAMILIES[0], fontSize: 48, fontWeight: 600,
      transformOrigin: '50% 50%',
    },
    keyframes: [],
  };
}

export function validateStylePatch(patch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return null;
  const result = {};
  for (const [key, value] of Object.entries(patch)) {
    if (Object.hasOwn(NUMBERS, key)) {
      const [min, max] = NUMBERS[key];
      if (!Number.isFinite(value) || value < min || value > max) return null;
      result[key] = Math.round(value * 1000) / 1000;
    } else if (['backgroundColor', 'color', 'borderColor'].includes(key)) {
      if (typeof value !== 'string' || !HEX.test(value)) return null;
      result[key] = value.toLowerCase();
    } else if (key === 'backgroundTransparent' && typeof value === 'boolean') result[key] = value;
    else if (key === 'borderStyle' && ['solid', 'dashed', 'dotted', 'double', 'none'].includes(value)) result[key] = value;
    else if (key === 'fontFamily' && FONT_FAMILIES.includes(value)) result[key] = value;
    else if (key === 'transformOrigin' && ORIGINS.includes(value)) result[key] = value;
    else if (key === 'boxShadow' && typeof value === 'string' && (value === 'none' || /^-?\d+(?:\.\d+)?px -?\d+(?:\.\d+)?px \d+(?:\.\d+)?px -?\d+(?:\.\d+)?px #[\da-f]{6}$/i.test(value))) result[key] = value;
    else return null;
  }
  return result;
}

export function isValidElement(element) {
  return element && typeof element.id === 'string' && element.id.length > 0 && TYPES.has(element.type)
    && typeof element.name === 'string' && element.name.length <= 80
    && typeof element.content === 'string' && element.content.length <= 10000
    && typeof element.visible === 'boolean' && typeof element.locked === 'boolean'
    && (element.type !== 'image' || isImageSource(element.src))
    && element.styles && Object.keys(NUMBERS).every(key => key in element.styles)
    && validateStylePatch(element.styles) !== null && Array.isArray(element.keyframes);
}
