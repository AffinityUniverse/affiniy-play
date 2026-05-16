import { useRef, useEffect } from 'react'

interface Props { width?: number }

// ─── 심볼 정의 ────────────────────────────────────────────────────────────────

interface FaceSym  { id: string; label: string; file: string }
interface ItemSym  { id: string; label: string; svg: string; anchorTop: number } // anchorTop: 0~1 (relative to card height)
interface BgSym    { id: string; label: string; svg: string; color: string }

const FACES: FaceSym[] = [
  { id: 'char1', label: '캐릭터1', file: 'png/Artboard1.png' },
  { id: 'char2', label: '캐릭터2', file: 'png/Artboard2.png' },
  { id: 'char3', label: '캐릭터3', file: 'png/Artboard3.png' },
  { id: 'char4', label: '캐릭터4', file: 'png/Artboard4.png' },
  { id: 'char5', label: '캐릭터5', file: 'png/Artboard5.png' },
  { id: 'char6', label: '캐릭터6', file: 'png/Artboard6.png' },
]

// SVG accessories — each is a 100×100 viewBox SVG string
const ITEMS: ItemSym[] = [
  {
    id: 'pencil', label: '연필', anchorTop: 0.55,
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="42" y="12" width="16" height="62" rx="4" fill="#FFD740"/>
      <rect x="42" y="12" width="16" height="10" rx="3" fill="#FF7043"/>
      <polygon points="42,74 58,74 50,92" fill="#FFCCBC"/>
      <polygon points="46,82 54,82 50,92" fill="#795548"/>
      <rect x="42" y="68" width="16" height="6" fill="#BDBDBD"/>
      <rect x="44" y="20" width="4" height="50" rx="2" fill="rgba(255,255,255,0.35)"/>
    </svg>`,
  },
  {
    id: 'map', label: '지도', anchorTop: 0.52,
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="14" y="20" width="72" height="58" rx="6" fill="#FFF9C4"/>
      <rect x="14" y="20" width="72" height="58" rx="6" fill="none" stroke="#FBC02D" stroke-width="3"/>
      <line x1="38" y1="20" x2="38" y2="78" stroke="#FBC02D" stroke-width="2" stroke-dasharray="4,3"/>
      <line x1="62" y1="20" x2="62" y2="78" stroke="#FBC02D" stroke-width="2" stroke-dasharray="4,3"/>
      <line x1="14" y1="43" x2="86" y2="43" stroke="#FBC02D" stroke-width="2" stroke-dasharray="4,3"/>
      <line x1="14" y1="60" x2="86" y2="60" stroke="#FBC02D" stroke-width="2" stroke-dasharray="4,3"/>
      <circle cx="50" cy="50" r="7" fill="#FF5252"/>
      <polygon points="50,30 56,42 44,42" fill="#4CAF50"/>
    </svg>`,
  },
  {
    id: 'hat', label: '모자', anchorTop: 0.22,
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="68" rx="38" ry="10" fill="#5C3D2E"/>
      <rect x="28" y="30" width="44" height="40" rx="12" fill="#7B4F2E"/>
      <rect x="28" y="52" width="44" height="8" fill="#FF7043"/>
      <rect x="28" y="52" width="44" height="8" fill="none" stroke="#FFF" stroke-width="1.5" stroke-dasharray="5,4"/>
      <ellipse cx="50" cy="30" rx="22" ry="6" fill="#7B4F2E"/>
    </svg>`,
  },
  {
    id: 'sunglasses', label: '선글라스', anchorTop: 0.38,
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="8"  y="38" width="34" height="24" rx="12" fill="#222"/>
      <rect x="58" y="38" width="34" height="24" rx="12" fill="#222"/>
      <rect x="42" y="46" width="16" height="6"  rx="3"  fill="#222"/>
      <line x1="8"  y1="50" x2="2"  y2="50" stroke="#222" stroke-width="4" stroke-linecap="round"/>
      <line x1="92" y1="50" x2="98" y2="50" stroke="#222" stroke-width="4" stroke-linecap="round"/>
      <rect x="10" y="40" width="30" height="20" rx="10" fill="#1565C0" opacity="0.7"/>
      <rect x="60" y="40" width="30" height="20" rx="10" fill="#1565C0" opacity="0.7"/>
      <rect x="10" y="40" width="10" height="8" rx="4" fill="rgba(255,255,255,0.25)"/>
      <rect x="60" y="40" width="10" height="8" rx="4" fill="rgba(255,255,255,0.25)"/>
    </svg>`,
  },
  {
    id: 'eyepatch', label: '안대', anchorTop: 0.36,
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="38" width="36" height="26" rx="13" fill="#1a1a1a"/>
      <rect x="22" y="40" width="32" height="22" rx="11" fill="#333"/>
      <line x1="56" y1="48" x2="90" y2="42" stroke="#1a1a1a" stroke-width="4" stroke-linecap="round"/>
      <line x1="20" y1="48" x2="10" y2="42" stroke="#1a1a1a" stroke-width="4" stroke-linecap="round"/>
      <rect x="24" y="42" width="12" height="8" rx="4" fill="rgba(255,255,255,0.1)"/>
      <line x1="38" y1="38" x2="38" y2="64" stroke="#FF5252" stroke-width="2" stroke-linecap="round"/>
      <line x1="30" y1="46" x2="46" y2="56" stroke="#FF5252" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
  },
  {
    id: 'crown', label: '왕관', anchorTop: 0.18,
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <polygon points="10,70 10,38 28,55 50,20 72,55 90,38 90,70" fill="#FFD700"/>
      <polygon points="10,70 10,38 28,55 50,20 72,55 90,38 90,70" fill="none" stroke="#F9A825" stroke-width="2"/>
      <rect x="10" y="68" width="80" height="14" rx="4" fill="#FFB300"/>
      <circle cx="50" cy="20" r="7" fill="#FF5252"/>
      <circle cx="10" cy="38" r="5" fill="#4CAF50"/>
      <circle cx="90" cy="38" r="5" fill="#4CAF50"/>
      <circle cx="25" cy="72" r="4" fill="#E91E63"/>
      <circle cx="50" cy="72" r="4" fill="#E91E63"/>
      <circle cx="75" cy="72" r="4" fill="#E91E63"/>
    </svg>`,
  },
  {
    id: 'book', label: '책', anchorTop: 0.52,
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="18" y="18" width="64" height="70" rx="5" fill="#E53935"/>
      <rect x="18" y="18" width="10" height="70" rx="3" fill="#B71C1C"/>
      <rect x="24" y="26" width="50" height="4" rx="2" fill="rgba(255,255,255,0.6)"/>
      <rect x="24" y="34" width="50" height="4" rx="2" fill="rgba(255,255,255,0.6)"/>
      <rect x="24" y="42" width="35" height="4" rx="2" fill="rgba(255,255,255,0.6)"/>
      <rect x="24" y="54" width="50" height="3" rx="1.5" fill="rgba(255,255,255,0.35)"/>
      <rect x="24" y="61" width="50" height="3" rx="1.5" fill="rgba(255,255,255,0.35)"/>
      <rect x="24" y="68" width="40" height="3" rx="1.5" fill="rgba(255,255,255,0.35)"/>
      <circle cx="55" cy="44" r="10" fill="#FFD700" opacity="0.85"/>
      <polygon points="55,37 57,42 63,42 58,46 60,52 55,48 50,52 52,46 47,42 53,42" fill="#E53935"/>
    </svg>`,
  },
  {
    id: 'telescope', label: '망원경', anchorTop: 0.48,
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="38" y="52" width="6" height="28" rx="3" fill="#546E7A"/>
      <rect x="30" y="76" width="22" height="6" rx="3" fill="#455A64"/>
      <rect x="22" y="30" width="56" height="26" rx="8" fill="#78909C" transform="rotate(-18 50 43)"/>
      <rect x="24" y="32" width="52" height="22" rx="7" fill="#90A4AE" transform="rotate(-18 50 43)"/>
      <ellipse cx="65" cy="28" rx="12" ry="12" fill="#B0BEC5" transform="rotate(-18 65 28)"/>
      <ellipse cx="65" cy="28" rx="9" ry="9" fill="#A0DFFF" transform="rotate(-18 65 28)"/>
      <ellipse cx="63" cy="26" rx="3" ry="3" fill="rgba(255,255,255,0.55)" transform="rotate(-18 63 26)"/>
      <rect x="22" y="36" width="6" height="14" rx="3" fill="#607D8B" transform="rotate(-18 25 43)"/>
    </svg>`,
  },
  {
    id: 'umbrella', label: '우산', anchorTop: 0.20,
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <path d="M50,18 Q18,22 18,50 L50,50 Z" fill="#E91E63"/>
      <path d="M50,18 Q82,22 82,50 L50,50 Z" fill="#FF5722"/>
      <path d="M50,18 Q34,22 34,50 L50,50 Z" fill="#E91E63" opacity="0.7"/>
      <path d="M50,18 Q66,22 66,50 L50,50 Z" fill="#FF5722" opacity="0.7"/>
      <path d="M18,50 Q25,42 50,50 Q75,42 82,50" fill="none" stroke="rgba(0,0,0,0.12)" stroke-width="2"/>
      <rect x="48" y="50" width="4" height="30" rx="2" fill="#795548"/>
      <path d="M52,80 Q60,80 60,88 Q60,94 54,94" fill="none" stroke="#795548" stroke-width="4" stroke-linecap="round"/>
    </svg>`,
  },
  {
    id: 'bowtie', label: '나비넥타이', anchorTop: 0.44,
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <polygon points="18,34 48,50 18,66" fill="#E53935"/>
      <polygon points="82,34 52,50 82,66" fill="#E53935"/>
      <ellipse cx="50" cy="50" rx="8" ry="10" fill="#C62828"/>
      <polygon points="18,34 48,50 18,66" fill="none" stroke="#B71C1C" stroke-width="1.5"/>
      <polygon points="82,34 52,50 82,66" fill="none" stroke="#B71C1C" stroke-width="1.5"/>
      <line x1="26" y1="42" x2="44" y2="50" stroke="rgba(255,255,255,0.2)" stroke-width="2"/>
      <line x1="74" y1="42" x2="56" y2="50" stroke="rgba(255,255,255,0.2)" stroke-width="2"/>
    </svg>`,
  },
  {
    id: 'guitar', label: '기타', anchorTop: 0.48,
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="47" y="8" width="6" height="32" rx="3" fill="#8D6E63"/>
      <rect x="38" y="8" width="24" height="8" rx="3" fill="#6D4C41"/>
      <line x1="42" y1="8" x2="42" y2="40" stroke="#FFF" stroke-width="1" opacity="0.5"/>
      <line x1="46" y1="8" x2="46" y2="40" stroke="#FFF" stroke-width="1" opacity="0.5"/>
      <line x1="50" y1="8" x2="50" y2="40" stroke="#FFF" stroke-width="1" opacity="0.5"/>
      <line x1="54" y1="8" x2="54" y2="40" stroke="#FFF" stroke-width="1" opacity="0.5"/>
      <line x1="58" y1="8" x2="58" y2="40" stroke="#FFF" stroke-width="1" opacity="0.5"/>
      <ellipse cx="50" cy="68" rx="22" ry="26" fill="#FF8F00"/>
      <ellipse cx="50" cy="55" rx="14" ry="16" fill="#FF8F00"/>
      <ellipse cx="50" cy="68" rx="22" ry="26" fill="none" stroke="#E65100" stroke-width="2"/>
      <ellipse cx="50" cy="55" rx="14" ry="16" fill="none" stroke="#E65100" stroke-width="2"/>
      <circle cx="50" cy="62" r="7" fill="none" stroke="#5D4037" stroke-width="2"/>
      <line x1="44" y1="40" x2="56" y2="40" stroke="#6D4C41" stroke-width="3" stroke-linecap="round"/>
    </svg>`,
  },
  {
    id: 'headphones', label: '헤드폰', anchorTop: 0.18,
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <path d="M20,52 Q20,20 50,20 Q80,20 80,52" fill="none" stroke="#333" stroke-width="6" stroke-linecap="round"/>
      <rect x="10" y="48" width="18" height="26" rx="9" fill="#4D72FB"/>
      <rect x="72" y="48" width="18" height="26" rx="9" fill="#4D72FB"/>
      <rect x="12" y="50" width="14" height="22" rx="7" fill="#7B8FFC"/>
      <rect x="74" y="50" width="14" height="22" rx="7" fill="#7B8FFC"/>
      <rect x="14" y="54" width="6" height="8" rx="3" fill="rgba(255,255,255,0.4)"/>
      <rect x="76" y="54" width="6" height="8" rx="3" fill="rgba(255,255,255,0.4)"/>
    </svg>`,
  },
  {
    id: 'ribbon', label: '리본', anchorTop: 0.16,
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <polygon points="18,28 48,50 18,72" fill="#FF5FA0"/>
      <polygon points="82,28 52,50 82,72" fill="#FF5FA0"/>
      <ellipse cx="50" cy="50" rx="10" ry="12" fill="#E91E8C"/>
      <polygon points="18,28 48,50 18,72" fill="none" stroke="#C2185B" stroke-width="1.5"/>
      <polygon points="82,28 52,50 82,72" fill="none" stroke="#C2185B" stroke-width="1.5"/>
      <line x1="24" y1="38" x2="44" y2="50" stroke="rgba(255,255,255,0.25)" stroke-width="2"/>
      <line x1="76" y1="38" x2="56" y2="50" stroke="rgba(255,255,255,0.25)" stroke-width="2"/>
    </svg>`,
  },
  {
    id: 'wings', label: '날개', anchorTop: 0.34,
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <path d="M50,50 Q30,20 5,30 Q20,50 50,55" fill="#FFF9C4"/>
      <path d="M50,50 Q70,20 95,30 Q80,50 50,55" fill="#FFF9C4"/>
      <path d="M50,50 Q30,20 5,30 Q20,50 50,55" fill="none" stroke="#F9A825" stroke-width="2"/>
      <path d="M50,50 Q70,20 95,30 Q80,50 50,55" fill="none" stroke="#F9A825" stroke-width="2"/>
      <path d="M50,52 Q35,32 12,36" stroke="#F9A825" stroke-width="1.5" fill="none"/>
      <path d="M50,52 Q65,32 88,36" stroke="#F9A825" stroke-width="1.5" fill="none"/>
      <path d="M50,54 Q38,44 18,44" stroke="#F9A825" stroke-width="1.5" fill="none"/>
      <path d="M50,54 Q62,44 82,44" stroke="#F9A825" stroke-width="1.5" fill="none"/>
    </svg>`,
  },
  {
    id: 'magnifier', label: '돋보기', anchorTop: 0.50,
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="42" cy="42" r="26" fill="#A0DFFF"/>
      <circle cx="42" cy="42" r="26" fill="none" stroke="#0288D1" stroke-width="6"/>
      <circle cx="42" cy="42" r="20" fill="rgba(255,255,255,0.3)"/>
      <circle cx="35" cy="34" rx="8" cy="34" r="8" fill="rgba(255,255,255,0.45)"/>
      <line x1="62" y1="62" x2="88" y2="88" stroke="#01579B" stroke-width="8" stroke-linecap="round"/>
    </svg>`,
  },
  {
    id: 'camera', label: '카메라', anchorTop: 0.50,
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="12" y="35" width="76" height="50" rx="8" fill="#424242"/>
      <path d="M38,35 L44,22 L56,22 L62,35" fill="#424242"/>
      <circle cx="50" cy="60" r="18" fill="#616161"/>
      <circle cx="50" cy="60" r="14" fill="#A0DFFF"/>
      <circle cx="50" cy="60" r="10" fill="#7BC8F5"/>
      <circle cx="45" cy="55" r="4" fill="rgba(255,255,255,0.5)"/>
      <circle cx="80" cy="44" r="5" fill="#FF5252"/>
      <rect x="18" y="42" width="16" height="8" rx="3" fill="#616161"/>
    </svg>`,
  },
  {
    id: 'shield', label: '방패', anchorTop: 0.42,
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <path d="M50,12 L82,26 L82,54 Q82,78 50,90 Q18,78 18,54 L18,26 Z" fill="#1565C0"/>
      <path d="M50,18 L76,30 L76,54 Q76,74 50,84 Q24,74 24,54 L24,30 Z" fill="#1E88E5"/>
      <polygon points="50,30 56,44 72,44 59,54 64,68 50,58 36,68 41,54 28,44 44,44" fill="#FFD700"/>
    </svg>`,
  },
  {
    id: 'icecream', label: '아이스크림', anchorTop: 0.28,
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="40" y="52" width="20" height="36" rx="4" fill="#F9A825"/>
      <rect x="42" y="54" width="4" height="32" rx="2" fill="rgba(255,255,255,0.3)"/>
      <ellipse cx="50" cy="52" rx="28" ry="28" fill="#FF8A80"/>
      <ellipse cx="38" cy="40" rx="8" ry="8" fill="#FFCDD2"/>
      <ellipse cx="60" cy="38" rx="6" ry="6" fill="#FFCDD2"/>
      <circle cx="46" cy="52" r="4" fill="#FF5252"/>
      <circle cx="58" cy="48" r="3" fill="#FF5252"/>
      <circle cx="52" cy="58" r="3" fill="#FF5252"/>
      <path d="M50,22 Q62,28 68,40" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="2"/>
    </svg>`,
  },
  {
    id: 'backpack', label: '가방', anchorTop: 0.40,
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="22" y="32" width="56" height="58" rx="12" fill="#42A5F5"/>
      <rect x="22" y="32" width="56" height="58" rx="12" fill="none" stroke="#1976D2" stroke-width="2.5"/>
      <path d="M38,32 Q38,18 50,18 Q62,18 62,32" fill="none" stroke="#1976D2" stroke-width="5" stroke-linecap="round"/>
      <rect x="33" y="54" width="34" height="22" rx="8" fill="#1976D2"/>
      <rect x="35" y="56" width="30" height="18" rx="6" fill="#64B5F6"/>
      <rect x="44" y="62" width="12" height="6" rx="3" fill="#1976D2"/>
      <rect x="30" y="36" width="40" height="6" rx="3" fill="#1565C0" opacity="0.4"/>
    </svg>`,
  },
  {
    id: 'trophy', label: '트로피', anchorTop: 0.34,
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="36" y="72" width="28" height="8" rx="3" fill="#F9A825"/>
      <rect x="28" y="80" width="44" height="8" rx="4" fill="#F57F17"/>
      <rect x="44" y="64" width="12" height="10" rx="2" fill="#FBC02D"/>
      <path d="M30,20 L70,20 L65,55 Q65,68 50,68 Q35,68 35,55 Z" fill="#FFD740"/>
      <path d="M30,20 L20,20 Q16,20 16,28 Q16,44 32,50" fill="none" stroke="#FBC02D" stroke-width="6" stroke-linecap="round"/>
      <path d="M70,20 L80,20 Q84,20 84,28 Q84,44 68,50" fill="none" stroke="#FBC02D" stroke-width="6" stroke-linecap="round"/>
      <polygon points="50,28 53,36 62,36 55,42 58,50 50,44 42,50 45,42 38,36 47,36" fill="#FF8F00"/>
      <path d="M32,22 L68,22 L64,54 Q63,65 50,65 Q37,65 36,54 Z" fill="none" stroke="#F9A825" stroke-width="1.5" opacity="0.5"/>
    </svg>`,
  },
  {
    id: 'rocket', label: '로켓', anchorTop: 0.30,
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <path d="M50,10 Q62,10 68,30 L68,72 Q68,78 50,82 Q32,78 32,72 L32,30 Q38,10 50,10 Z" fill="#EF5350"/>
      <path d="M50,10 Q56,10 60,22 L60,72 Q60,77 50,80 Q40,77 40,72 L40,22 Q44,10 50,10 Z" fill="#FF7043"/>
      <ellipse cx="50" cy="28" rx="10" ry="12" fill="#A0DFFF"/>
      <ellipse cx="47" cy="25" rx="4" ry="5" fill="rgba(255,255,255,0.5)"/>
      <path d="M32,65 L18,80 L28,75 L24,88 L38,72 Z" fill="#FF9800"/>
      <path d="M68,65 L82,80 L72,75 L76,88 L62,72 Z" fill="#FF9800"/>
      <ellipse cx="50" cy="84" rx="12" ry="8" fill="#FFD740" opacity="0.8"/>
      <ellipse cx="50" cy="88" rx="8" ry="6" fill="#FF6D00" opacity="0.9"/>
    </svg>`,
  },
  {
    id: 'lollipop', label: '막대사탕', anchorTop: 0.28,
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="46" y="55" width="8" height="36" rx="4" fill="#795548"/>
      <circle cx="50" cy="40" r="26" fill="#FF5FA0"/>
      <path d="M50,14 Q76,14 76,40 Q76,66 50,66" fill="#FF8A80" opacity="0.6"/>
      <path d="M30,26 Q24,40 30,54" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="4" stroke-linecap="round"/>
      <path d="M36,20 Q50,14 64,20 Q76,28 76,42" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="3" stroke-linecap="round"/>
      <circle cx="40" cy="32" r="5" fill="rgba(255,255,255,0.3)"/>
    </svg>`,
  },
  {
    id: 'balloon2', label: '풍선', anchorTop: 0.22,
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="42" rx="28" ry="32" fill="#FF5FA0"/>
      <ellipse cx="42" cy="30" rx="10" ry="12" fill="rgba(255,255,255,0.3)"/>
      <path d="M50,74 L46,82 L54,82 Z" fill="#FF5FA0"/>
      <rect x="48" y="82" width="4" height="14" rx="2" fill="#795548"/>
      <path d="M52,82 Q62,78 68,88" fill="none" stroke="#795548" stroke-width="2.5" stroke-linecap="round"/>
    </svg>`,
  },
  {
    id: 'basketball', label: '농구공', anchorTop: 0.45,
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="36" fill="#FF6D00"/>
      <circle cx="50" cy="50" r="36" fill="none" stroke="#E64A19" stroke-width="2.5"/>
      <path d="M14,50 Q32,38 50,50 Q68,62 86,50" fill="none" stroke="#BF360C" stroke-width="2.5"/>
      <path d="M50,14 Q38,32 50,50 Q62,68 50,86" fill="none" stroke="#BF360C" stroke-width="2.5"/>
      <path d="M26,22 Q32,50 26,78" fill="none" stroke="#BF360C" stroke-width="2"/>
      <path d="M74,22 Q68,50 74,78" fill="none" stroke="#BF360C" stroke-width="2"/>
      <ellipse cx="38" cy="34" rx="7" ry="5" fill="rgba(255,255,255,0.2)" transform="rotate(-30 38 34)"/>
    </svg>`,
  },
  {
    id: 'diamond', label: '다이아몬드', anchorTop: 0.38,
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <polygon points="50,15 78,38 50,88 22,38" fill="#80D8FF"/>
      <polygon points="50,15 78,38 50,88 22,38" fill="none" stroke="#0288D1" stroke-width="2"/>
      <polygon points="22,38 78,38 50,88" fill="#4FC3F7"/>
      <polygon points="50,15 22,38 36,38" fill="rgba(255,255,255,0.5)"/>
      <polygon points="50,15 36,38 64,38" fill="rgba(255,255,255,0.35)"/>
      <polygon points="50,15 78,38 64,38" fill="rgba(255,255,255,0.2)"/>
      <polygon points="22,38 36,38 50,60" fill="rgba(0,0,0,0.08)"/>
      <polygon points="64,38 78,38 50,60" fill="rgba(0,0,0,0.12)"/>
    </svg>`,
  },
  {
    id: 'paintbrush', label: '붓', anchorTop: 0.40,
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="44" y="10" width="12" height="58" rx="4" fill="#8D6E63"/>
      <rect x="46" y="12" width="4" height="50" rx="2" fill="rgba(255,255,255,0.3)"/>
      <ellipse cx="50" cy="74" rx="12" ry="16" fill="#4CAF50"/>
      <ellipse cx="50" cy="82" rx="9" ry="9" fill="#388E3C"/>
      <ellipse cx="50" cy="88" rx="6" ry="5" fill="#2E7D32"/>
      <rect x="42" y="62" width="16" height="8" rx="3" fill="#6D4C41"/>
      <rect x="44" y="10" width="12" height="8" rx="4" fill="#5D4037"/>
      <ellipse cx="44" cy="72" rx="4" ry="6" fill="rgba(255,255,255,0.2)"/>
    </svg>`,
  },
  {
    id: 'microphone', label: '마이크', anchorTop: 0.38,
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="43" y="56" width="14" height="28" rx="5" fill="#546E7A"/>
      <rect x="34" y="82" width="32" height="6" rx="3" fill="#455A64"/>
      <rect x="38" y="10" width="24" height="46" rx="12" fill="#E53935"/>
      <rect x="40" y="12" width="20" height="42" rx="10" fill="#EF5350"/>
      <rect x="42" y="14" width="6" height="38" rx="3" fill="rgba(255,255,255,0.2)"/>
      <line x1="38" y1="30" x2="62" y2="30" stroke="rgba(0,0,0,0.1)" stroke-width="2"/>
      <line x1="38" y1="38" x2="62" y2="38" stroke="rgba(0,0,0,0.1)" stroke-width="2"/>
      <line x1="38" y1="46" x2="62" y2="46" stroke="rgba(0,0,0,0.1)" stroke-width="2"/>
      <path d="M28,46 Q28,66 50,66 Q72,66 72,46" fill="none" stroke="#455A64" stroke-width="4" stroke-linecap="round"/>
    </svg>`,
  },
  {
    id: 'soccer', label: '축구공', anchorTop: 0.45,
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="36" fill="white"/>
      <circle cx="50" cy="50" r="36" fill="none" stroke="#333" stroke-width="2.5"/>
      <polygon points="50,22 58,30 55,40 45,40 42,30" fill="#333"/>
      <polygon points="74,36 78,46 70,52 62,46 64,36" fill="#333"/>
      <polygon points="72,66 64,74 54,70 56,60 66,58" fill="#333"/>
      <polygon points="28,66 36,58 46,60 48,70 38,74" fill="#333"/>
      <polygon points="26,36 36,36 38,46 30,52 22,46" fill="#333"/>
    </svg>`,
  },
  {
    id: 'lantern', label: '등불', anchorTop: 0.30,
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="44" y="8" width="12" height="12" rx="3" fill="#795548"/>
      <rect x="46" y="18" width="8" height="6" rx="2" fill="#6D4C41"/>
      <rect x="30" y="24" width="40" height="54" rx="10" fill="#FF8F00"/>
      <rect x="32" y="26" width="36" height="50" rx="9" fill="#FFA726"/>
      <rect x="36" y="30" width="8" height="42" rx="4" fill="rgba(255,255,255,0.15)"/>
      <ellipse cx="50" cy="50" rx="14" ry="18" fill="#FFEE58" opacity="0.7"/>
      <ellipse cx="50" cy="48" rx="8" ry="10" fill="rgba(255,255,255,0.5)"/>
      <rect x="30" y="75" width="40" height="5" rx="2" fill="#E65100"/>
      <rect x="42" y="80" width="4" height="12" rx="2" fill="#FF8F00"/>
      <rect x="54" y="80" width="4" height="12" rx="2" fill="#FF8F00"/>
      <rect x="36" y="92" width="28" height="4" rx="2" fill="#E65100"/>
    </svg>`,
  },
  {
    id: 'flower', label: '꽃', anchorTop: 0.28,
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="47" y="56" width="6" height="36" rx="3" fill="#4CAF50"/>
      <path d="M50,70 Q40,62 32,68" fill="none" stroke="#4CAF50" stroke-width="4" stroke-linecap="round"/>
      <ellipse cx="50" cy="20" rx="10" ry="16" fill="#FF5FA0" transform="rotate(0 50 20)"/>
      <ellipse cx="50" cy="20" rx="10" ry="16" fill="#FF5FA0" transform="rotate(45 50 36)"/>
      <ellipse cx="50" cy="20" rx="10" ry="16" fill="#FF8A80" transform="rotate(90 50 50)"/>
      <ellipse cx="50" cy="20" rx="10" ry="16" fill="#FF8A80" transform="rotate(135 50 64)"/>
      <ellipse cx="50" cy="20" rx="10" ry="16" fill="#FF5FA0" transform="rotate(180 50 50)"/>
      <ellipse cx="50" cy="20" rx="10" ry="16" fill="#FF5FA0" transform="rotate(225 50 36)"/>
      <ellipse cx="50" cy="20" rx="10" ry="16" fill="#FF8A80" transform="rotate(270 50 50)"/>
      <ellipse cx="50" cy="20" rx="10" ry="16" fill="#FF8A80" transform="rotate(315 50 64)"/>
      <circle cx="50" cy="46" r="12" fill="#FFD740"/>
      <circle cx="50" cy="46" r="8" fill="#FFEA00"/>
      <circle cx="47" cy="43" r="3" fill="rgba(255,255,255,0.4)"/>
    </svg>`,
  },
  {
    id: 'cookie', label: '쿠키', anchorTop: 0.45,
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="36" fill="#C8863A"/>
      <circle cx="50" cy="50" r="34" fill="#D4944A"/>
      <circle cx="36" cy="36" r="6" fill="#5D3A1A"/>
      <circle cx="58" cy="32" r="5" fill="#5D3A1A"/>
      <circle cx="68" cy="52" r="6" fill="#5D3A1A"/>
      <circle cx="54" cy="62" r="5" fill="#5D3A1A"/>
      <circle cx="36" cy="60" r="4" fill="#5D3A1A"/>
      <circle cx="44" cy="44" r="3" fill="#5D3A1A"/>
      <circle cx="36" cy="36" r="4" fill="#7B4F28"/>
      <circle cx="58" cy="32" r="3" fill="#7B4F28"/>
      <circle cx="68" cy="52" r="4" fill="#7B4F28"/>
      <circle cx="54" cy="62" r="3" fill="#7B4F28"/>
      <ellipse cx="38" cy="32" rx="4" ry="2" fill="rgba(255,255,255,0.15)" transform="rotate(-20 38 32)"/>
    </svg>`,
  },
  {
    id: 'kite', label: '연', anchorTop: 0.30,
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <polygon points="50,8 80,46 50,68 20,46" fill="#FF5722"/>
      <polygon points="50,8 80,46 50,46" fill="#FF8A65"/>
      <polygon points="50,46 80,46 50,68" fill="#E64A19"/>
      <line x1="50" y1="8" x2="50" y2="68" stroke="rgba(0,0,0,0.2)" stroke-width="1.5"/>
      <line x1="20" y1="46" x2="80" y2="46" stroke="rgba(0,0,0,0.2)" stroke-width="1.5"/>
      <path d="M50,68 Q56,78 46,86 Q54,92 50,95" fill="none" stroke="#795548" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="44" cy="82" r="3" fill="#FF9800"/>
      <circle cx="52" cy="90" r="3" fill="#FF9800"/>
      <circle cx="48" cy="75" r="2" fill="#FF9800"/>
    </svg>`,
  },
]

const BACKGROUNDS: BgSym[] = [
  {
    id: 'ocean', label: '바다', color: '#0277BD',
    svg: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="#87CEEB"/>
      <ellipse cx="160" cy="40" rx="30" ry="20" fill="white" opacity="0.9"/>
      <ellipse cx="148" cy="38" rx="20" ry="14" fill="white" opacity="0.9"/>
      <ellipse cx="40" cy="55" rx="22" ry="14" fill="white" opacity="0.8"/>
      <ellipse cx="30" cy="53" rx="14" ry="10" fill="white" opacity="0.8"/>
      <rect x="0" y="110" width="200" height="90" fill="#0277BD"/>
      <path d="M0,118 Q25,108 50,118 Q75,128 100,118 Q125,108 150,118 Q175,128 200,118 L200,200 L0,200Z" fill="#0288D1"/>
      <path d="M0,130 Q25,120 50,130 Q75,140 100,130 Q125,120 150,130 Q175,140 200,130 L200,200 L0,200Z" fill="#0299D1" opacity="0.7"/>
      <ellipse cx="30" cy="155" rx="18" ry="8" fill="#FF8F00" opacity="0.6"/>
      <ellipse cx="170" cy="165" rx="14" ry="6" fill="#FF8F00" opacity="0.5"/>
      <circle cx="100" cy="75" r="28" fill="#F9A825"/>
      <circle cx="100" cy="75" r="28" fill="none" stroke="#FFD54F" stroke-width="6" opacity="0.5"/>
    </svg>`,
  },
  {
    id: 'jungle', label: '정글', color: '#2E7D32',
    svg: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="#81C784"/>
      <rect x="0" y="130" width="200" height="70" fill="#388E3C"/>
      <ellipse cx="30" cy="130" rx="40" ry="55" fill="#2E7D32"/>
      <ellipse cx="30" cy="120" rx="30" ry="45" fill="#388E3C"/>
      <ellipse cx="170" cy="140" rx="42" ry="50" fill="#1B5E20"/>
      <ellipse cx="170" cy="128" rx="32" ry="42" fill="#2E7D32"/>
      <ellipse cx="100" cy="90" rx="50" ry="70" fill="#1B5E20"/>
      <ellipse cx="100" cy="75" rx="38" ry="55" fill="#388E3C"/>
      <ellipse cx="60" cy="160" rx="28" ry="35" fill="#2E7D32"/>
      <ellipse cx="140" cy="165" rx="24" ry="30" fill="#388E3C"/>
      <circle cx="150" cy="35" r="22" fill="#FFF176" opacity="0.7"/>
      <circle cx="52" cy="60" r="7" fill="#FFEE58" opacity="0.6"/>
      <circle cx="148" cy="80" r="5" fill="#FFEE58" opacity="0.6"/>
    </svg>`,
  },
  {
    id: 'space', label: '우주', color: '#1A237E',
    svg: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="#0D0D2B"/>
      <circle cx="20"  cy="15"  r="1.5" fill="white" opacity="0.9"/>
      <circle cx="60"  cy="30"  r="1"   fill="white" opacity="0.8"/>
      <circle cx="100" cy="10"  r="2"   fill="white"/>
      <circle cx="145" cy="25"  r="1.5" fill="white" opacity="0.9"/>
      <circle cx="185" cy="12"  r="1"   fill="white" opacity="0.7"/>
      <circle cx="35"  cy="55"  r="1"   fill="white" opacity="0.8"/>
      <circle cx="80"  cy="45"  r="1.5" fill="white"/>
      <circle cx="160" cy="60"  r="1"   fill="white" opacity="0.9"/>
      <circle cx="190" cy="45"  r="2"   fill="white" opacity="0.6"/>
      <circle cx="10"  cy="80"  r="1"   fill="white" opacity="0.7"/>
      <circle cx="55"  cy="90"  r="1.5" fill="white" opacity="0.8"/>
      <circle cx="175" cy="90"  r="1"   fill="white"/>
      <circle cx="120" cy="75"  r="1"   fill="white" opacity="0.9"/>
      <circle cx="90"  cy="100" r="1.5" fill="white" opacity="0.7"/>
      <ellipse cx="100" cy="148" rx="55" ry="40" fill="#3949AB"/>
      <ellipse cx="100" cy="148" rx="55" ry="40" fill="none" stroke="#7986CB" stroke-width="2" opacity="0.6"/>
      <ellipse cx="100" cy="145" rx="40" ry="29" fill="#5C6BC0"/>
      <ellipse cx="85"  cy="140" rx="10" ry="8"  fill="#7986CB" opacity="0.6"/>
      <ellipse cx="115" cy="152" rx="8"  ry="6"  fill="#3F51B5" opacity="0.7"/>
      <ellipse cx="100" cy="148" rx="70" ry="12" fill="none" stroke="#9FA8DA" stroke-width="3" opacity="0.5"/>
      <circle  cx="60"  cy="38"  r="12"  fill="#FFF9C4" opacity="0.9"/>
      <circle  cx="57"  cy="35"  r="4"   fill="#FFF176" opacity="0.5"/>
    </svg>`,
  },
  {
    id: 'city', label: '도시', color: '#37474F',
    svg: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="#B0BEC5"/>
      <rect x="0" y="140" width="200" height="60" fill="#546E7A"/>
      <rect x="10"  y="80"  width="35" height="120" fill="#455A64"/>
      <rect x="15"  y="95"  width="7"  height="8"   fill="#FFF9C4" opacity="0.8"/>
      <rect x="27"  y="95"  width="7"  height="8"   fill="#FFF9C4" opacity="0.6"/>
      <rect x="15"  y="108" width="7"  height="8"   fill="#B0BEC5" opacity="0.5"/>
      <rect x="27"  y="108" width="7"  height="8"   fill="#FFF9C4" opacity="0.9"/>
      <rect x="55"  y="60"  width="45" height="140" fill="#37474F"/>
      <rect x="62"  y="70"  width="9"  height="10"  fill="#FFF9C4" opacity="0.8"/>
      <rect x="76"  y="70"  width="9"  height="10"  fill="#FFF9C4" opacity="0.6"/>
      <rect x="62"  y="86"  width="9"  height="10"  fill="#B0BEC5" opacity="0.5"/>
      <rect x="76"  y="86"  width="9"  height="10"  fill="#FFF9C4" opacity="0.9"/>
      <rect x="62"  y="102" width="9"  height="10"  fill="#FFF9C4" opacity="0.7"/>
      <rect x="76"  y="102" width="9"  height="10"  fill="#B0BEC5" opacity="0.4"/>
      <rect x="115" y="75"  width="38" height="125" fill="#455A64"/>
      <rect x="122" y="85"  width="7"  height="8"   fill="#FFF9C4" opacity="0.9"/>
      <rect x="134" y="85"  width="7"  height="8"   fill="#FFF9C4" opacity="0.6"/>
      <rect x="122" y="98"  width="7"  height="8"   fill="#FFF9C4" opacity="0.7"/>
      <rect x="134" y="98"  width="7"  height="8"   fill="#B0BEC5" opacity="0.5"/>
      <rect x="163" y="95"  width="30" height="105" fill="#546E7A"/>
      <rect x="168" y="103" width="6"  height="7"   fill="#FFF9C4" opacity="0.8"/>
      <rect x="179" y="103" width="6"  height="7"   fill="#B0BEC5" opacity="0.5"/>
      <circle cx="155" cy="35" r="20" fill="#FFD54F" opacity="0.6"/>
      <rect x="0" y="140" width="200" height="6" fill="#78909C"/>
      <rect x="30" y="143" width="20" height="4" fill="#CFD8DC" opacity="0.6"/>
      <rect x="90" y="143" width="20" height="4" fill="#CFD8DC" opacity="0.6"/>
      <rect x="150" y="143" width="20" height="4" fill="#CFD8DC" opacity="0.6"/>
    </svg>`,
  },
  {
    id: 'mountains', label: '산', color: '#4CAF50',
    svg: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="#87CEEB"/>
      <ellipse cx="60" cy="55" rx="28" ry="16" fill="white" opacity="0.85"/>
      <ellipse cx="50" cy="53" rx="20" ry="12" fill="white" opacity="0.85"/>
      <ellipse cx="150" cy="40" rx="32" ry="18" fill="white" opacity="0.8"/>
      <ellipse cx="140" cy="38" rx="22" ry="13" fill="white" opacity="0.8"/>
      <polygon points="0,200 60,80  120,200" fill="#4CAF50"/>
      <polygon points="40,200 110,70 180,200" fill="#388E3C"/>
      <polygon points="80,200 150,90 200,200" fill="#2E7D32"/>
      <polygon points="80,200 150,90 175,200" fill="#1B5E20"/>
      <polygon points="40,200 110,70 115,200" fill="#33691E"/>
      <polygon points="110,70  140,90  115,90" fill="white" opacity="0.85"/>
      <polygon points="150,90  175,108 155,108" fill="white" opacity="0.75"/>
      <rect x="0" y="175" width="200" height="25" fill="#558B2F"/>
      <circle cx="170" cy="30" r="22" fill="#FFD54F" opacity="0.8"/>
    </svg>`,
  },
  {
    id: 'desert', label: '사막', color: '#E65100',
    svg: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="#FFF8E1"/>
      <rect x="0" y="110" width="200" height="90" fill="#FFCC80"/>
      <path d="M0,110 Q30,98 60,110 Q90,122 130,106 Q160,94 200,110 L200,200 L0,200Z" fill="#FFB74D"/>
      <ellipse cx="50" cy="150" rx="20" ry="8" fill="#FFA726" opacity="0.5"/>
      <ellipse cx="160" cy="160" rx="16" ry="6" fill="#FFA726" opacity="0.5"/>
      <circle cx="160" cy="45" r="28" fill="#FF8F00" opacity="0.95"/>
      <circle cx="160" cy="45" r="28" fill="none" stroke="#FFD54F" stroke-width="8" opacity="0.4"/>
      <rect x="88" y="70" width="12" height="50" rx="4" fill="#388E3C"/>
      <ellipse cx="94" cy="66" rx="18" ry="22" fill="#4CAF50"/>
      <ellipse cx="82" cy="78" rx="12" ry="16" fill="#4CAF50"/>
      <ellipse cx="106" cy="80" rx="12" ry="15" fill="#43A047"/>
      <line x1="30" y1="120" x2="55" y2="120" stroke="#795548" stroke-width="3"/>
      <line x1="42" y1="108" x2="42" y2="120" stroke="#795548" stroke-width="3"/>
      <line x1="35" y1="113" x2="50" y2="113" stroke="#795548" stroke-width="2"/>
    </svg>`,
  },
  {
    id: 'snow', label: '눈밭', color: '#1565C0',
    svg: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="#E3F2FD"/>
      <rect x="0" y="130" width="200" height="70" fill="#E8EAF6"/>
      <path d="M0,130 Q40,118 80,130 Q120,142 160,128 Q180,122 200,130 L200,200 L0,200Z" fill="#F5F5FF"/>
      <circle cx="30" cy="105" r="25" fill="#FFF"/>
      <circle cx="50" cy="115" r="28" fill="#FFF"/>
      <circle cx="80" cy="108" r="22" fill="#FFF"/>
      <circle cx="140" cy="110" r="24" fill="#FFF"/>
      <circle cx="168" cy="103" r="20" fill="#FFF"/>
      <circle cx="155" cy="113" r="26" fill="#FFF"/>
      <circle cx="100" cy="50" r="6" fill="white" opacity="0.9"/>
      <circle cx="40" cy="35" r="4" fill="white" opacity="0.8"/>
      <circle cx="170" cy="42" r="5" fill="white" opacity="0.9"/>
      <circle cx="75" cy="20" r="3" fill="white" opacity="0.7"/>
      <circle cx="130" cy="25" r="4" fill="white" opacity="0.8"/>
      <text x="85" y="170" font-size="28" text-anchor="middle">⛄</text>
      <line x1="100" y1="25" x2="100" y2="45" stroke="white" stroke-width="2" opacity="0.7"/>
      <line x1="88" y1="35" x2="112" y2="35" stroke="white" stroke-width="2" opacity="0.7"/>
      <line x1="88" y1="28" x2="100" y2="35" stroke="white" stroke-width="1.5" opacity="0.6"/>
      <line x1="112" y1="28" x2="100" y2="35" stroke="white" stroke-width="1.5" opacity="0.6"/>
    </svg>`,
  },
  {
    id: 'castle', label: '성', color: '#4A148C',
    svg: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="#CE93D8"/>
      <rect x="0" y="160" width="200" height="40" fill="#7B1FA2"/>
      <rect x="30" y="80" width="140" height="120" fill="#9C27B0"/>
      <rect x="28" y="78" width="144" height="4" fill="#6A1B9A"/>
      <rect x="30" y="60" width="30" height="40" fill="#AB47BC"/>
      <rect x="140" y="60" width="30" height="40" fill="#AB47BC"/>
      <rect x="85" y="50" width="30" height="50" fill="#AB47BC"/>
      <rect x="28" y="52" width="10" height="14" fill="#6A1B9A"/>
      <rect x="40" y="52" width="10" height="14" fill="#6A1B9A"/>
      <rect x="138" y="52" width="10" height="14" fill="#6A1B9A"/>
      <rect x="150" y="52" width="10" height="14" fill="#6A1B9A"/>
      <rect x="83" y="42" width="10" height="14" fill="#6A1B9A"/>
      <rect x="95" y="42" width="10" height="14" fill="#6A1B9A"/>
      <rect x="107" y="42" width="10" height="14" fill="#6A1B9A"/>
      <rect x="85" y="55" width="30" height="4" fill="#6A1B9A"/>
      <rect x="82" y="110" width="36" height="50" rx="18" fill="#6A1B9A"/>
      <rect x="60" y="130" width="20" height="14" rx="3" fill="#CE93D8" opacity="0.6"/>
      <rect x="120" y="130" width="20" height="14" rx="3" fill="#CE93D8" opacity="0.6"/>
      <polygon points="100,18 94,42 106,42" fill="#F44336"/>
      <circle cx="140" cy="36" r="10" fill="#FFEE58" opacity="0.85"/>
      <circle cx="60" cy="44" r="8" fill="#FFEE58" opacity="0.75"/>
    </svg>`,
  },
  {
    id: 'rainbow', label: '무지개', color: '#FF6F00',
    svg: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="#E0F7FA"/>
      <rect x="0" y="150" width="200" height="50" fill="#A5D6A7"/>
      <path d="M10,160 Q100,40 190,160" fill="none" stroke="#F44336" stroke-width="14"/>
      <path d="M18,160 Q100,52 182,160" fill="none" stroke="#FF9800" stroke-width="12"/>
      <path d="M26,160 Q100,64 174,160" fill="none" stroke="#FFEB3B" stroke-width="12"/>
      <path d="M34,160 Q100,76 166,160" fill="none" stroke="#4CAF50" stroke-width="11"/>
      <path d="M42,160 Q100,88 158,160" fill="none" stroke="#2196F3" stroke-width="11"/>
      <path d="M50,160 Q100,100 150,160" fill="none" stroke="#9C27B0" stroke-width="10"/>
      <ellipse cx="40" cy="80" rx="28" ry="18" fill="white" opacity="0.95"/>
      <ellipse cx="28" cy="82" rx="18" ry="13" fill="white" opacity="0.95"/>
      <ellipse cx="160" cy="70" rx="32" ry="20" fill="white" opacity="0.95"/>
      <ellipse cx="148" cy="72" rx="20" ry="14" fill="white" opacity="0.95"/>
      <circle cx="100" cy="35" r="18" fill="#FFEE58" opacity="0.9"/>
      <circle cx="100" cy="35" r="18" fill="none" stroke="#FFD54F" stroke-width="5" opacity="0.5"/>
    </svg>`,
  },
  {
    id: 'beach', label: '해변', color: '#0277BD',
    svg: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="#80D8FF"/>
      <rect x="0" y="120" width="200" height="80" fill="#0288D1"/>
      <rect x="0" y="130" width="200" height="70" fill="#FFD54F"/>
      <path d="M0,120 Q30,110 60,120 Q90,130 120,118 Q150,106 200,120 L200,140 L0,140Z" fill="#01B0F3"/>
      <circle cx="160" cy="50" r="28" fill="#FFEE58"/>
      <circle cx="160" cy="50" r="28" fill="none" stroke="#FFD54F" stroke-width="6" opacity="0.5"/>
      <rect x="80" y="60" width="5" height="70" fill="#795548"/>
      <path d="M85,60 Q85,30 130,40 Q105,55 85,65" fill="#4CAF50"/>
      <ellipse cx="50" cy="150" rx="30" ry="12" fill="#FFB74D" opacity="0.6"/>
      <ellipse cx="160" cy="155" rx="22" ry="9" fill="#FFB74D" opacity="0.5"/>
      <text x="100" y="168" font-size="22" text-anchor="middle">🦀</text>
    </svg>`,
  },
  {
    id: 'farm', label: '농장', color: '#558B2F',
    svg: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="#90CAF9"/>
      <rect x="0" y="130" width="200" height="70" fill="#8BC34A"/>
      <rect x="0" y="138" width="200" height="62" fill="#7CB342"/>
      <rect x="30" y="90" width="60" height="50" fill="#EF9A9A"/>
      <polygon points="30,90 90,90 60,62" fill="#E53935"/>
      <rect x="52" y="112" width="16" height="28" fill="#6D4C41"/>
      <rect x="110" y="100" width="70" height="40" fill="#A5D6A7"/>
      <polygon points="110,100 180,100 145,76" fill="#4CAF50"/>
      <rect x="38" y="100" width="14" height="14" rx="2" fill="#F48FB1"/>
      <rect x="68" y="100" width="14" height="14" rx="2" fill="#F48FB1"/>
      <rect x="122" y="110" width="12" height="12" rx="2" fill="#80DEEA"/>
      <rect x="154" y="110" width="12" height="12" rx="2" fill="#80DEEA"/>
      <text x="170" y="155" font-size="24" text-anchor="middle">🐄</text>
      <text x="28" y="160" font-size="20" text-anchor="middle">🌻</text>
      <text x="56" y="160" font-size="20" text-anchor="middle">🌻</text>
      <circle cx="100" cy="40" r="24" fill="#FFEE58" opacity="0.9"/>
    </svg>`,
  },
]

// ─── reel defs for loop ───────────────────────────────────────────────────────
const REEL_LABELS = ['캐릭터', '소품', '배경']
const REEL_COUNTS = [FACES.length, ITEMS.length, BACKGROUNDS.length]

const CSS = `
@keyframes slotShake { 0%,100%{transform:translate(0,0)} 20%{transform:translate(-5px,-1px)} 40%{transform:translate(5px,2px)} 60%{transform:translate(-3px,1px)} 80%{transform:translate(2px,-1px)} }
@keyframes jpPulse { from{box-shadow:0 0 0 3px rgba(255,215,0,0.6),0 0 30px rgba(255,215,0,0.3)} to{box-shadow:0 0 0 6px rgba(255,215,0,1),0 0 60px rgba(255,215,0,0.6)} }
@keyframes bfly { from{transform:translate(0,0) scale(1);opacity:1} to{transform:translate(var(--tx),var(--ty)) scale(0);opacity:0} }
@keyframes bpipPulse { 0%,100%{transform:scale(1);opacity:.7} 50%{transform:scale(1.5);opacity:1} }
@keyframes resultFadeIn { from{opacity:0;transform:translateY(14px) scale(0.93)} to{opacity:1;transform:translateY(0) scale(1)} }
@keyframes resultPop { 0%{transform:scale(0.7)} 70%{transform:scale(1.06)} 100%{transform:scale(1)} }
@keyframes glowPulse { 0%,100%{box-shadow:0 0 0 0 rgba(255,215,0,0.4)} 50%{box-shadow:0 0 0 8px rgba(255,215,0,0)} }
#slot3-wrapper.shake { animation: slotShake 0.38s ease-out; }
.reel-spinning-border::after { content:''; position:absolute; inset:0; border-radius:12px; box-shadow:inset 0 0 0 3px rgba(255,255,255,0.55); pointer-events:none; z-index:5; }
.reel-jackpot { animation: jpPulse 0.24s ease-in-out infinite alternate !important; }
`

const E = {
  in3:    (t: number) => t ** 3,
  linear: (t: number) => t,
  out3:   (t: number) => 1 - (1 - t) ** 3,
  out5:   (t: number) => 1 - (1 - t) ** 5,
}

function kf(t: number, start: number, dist: number) {
  const ph: [number, number, number, number, (t: number) => number][] = [
    [0.00, 0.14, 0.00, 0.08, E.in3],
    [0.14, 0.72, 0.08, 0.82, E.linear],
    [0.72, 0.86, 0.82, 0.91, E.out3],
    [0.86, 1.00, 0.91, 1.00, E.out5],
  ]
  const p = ph.find(k => t <= k[1]) || ph[ph.length - 1]
  const lt = Math.max(0, Math.min(1, (t - p[0]) / (p[1] - p[0])))
  return start + dist * (p[2] + (p[3] - p[2]) * p[4](lt))
}

const REPEATS = 9

export default function SlotMachine({ width = 340 }: Props) {
  const wrapperRef    = useRef<HTMLDivElement>(null)
  const leverGroupRef = useRef<SVGGElement>(null)
  const resultMsgRef  = useRef<HTMLDivElement>(null)

  const reelRefs = [
    useRef<{ vp: HTMLDivElement; strip: HTMLDivElement } | null>(null),
    useRef<{ vp: HTMLDivElement; strip: HTMLDivElement } | null>(null),
    useRef<{ vp: HTMLDivElement; strip: HTMLDivElement } | null>(null),
  ]

  const mountRef = useRef({
    spinning: false,
    posY:  [0, 0, 0] as [number, number, number],
    symH:  0,
    setH:  [0, 0, 0] as [number, number, number],
    ac:    null as AudioContext | null,
    leverAngle:    0,
    leverDragging: false,
    leverDy0:      0,
    leverA0:       0,
    leverPulled:   false,
    leverRaf:      null as number | null,
  })

  useEffect(() => {
    const styleEl = document.createElement('style')
    styleEl.textContent = CSS
    document.head.appendChild(styleEl)

    const m = mountRef.current

    function getCtx(): AudioContext {
      if (!m.ac) m.ac = new (window.AudioContext || (window as any).webkitAudioContext)()
      if (m.ac.state === 'suspended') m.ac.resume()
      return m.ac
    }

    let spinNodes: { interval: ReturnType<typeof setInterval> } | null = null

    const Sfx = {
      click() {
        try {
          const c = getCtx()
          const buf = c.createBuffer(1, Math.floor(c.sampleRate * 0.06), c.sampleRate)
          const d = buf.getChannelData(0)
          for (let i = 0; i < d.length; i++) d[i] = (Math.random()*2-1)*Math.exp(-i/d.length*45)*0.8
          const s = c.createBufferSource(); s.buffer = buf; s.connect(c.destination); s.start()
        } catch(_) {}
      },
      startSpin() {
        try {
          this.stopSpin()
          const c = getCtx()
          const interval = setInterval(() => {
            try {
              const now = c.currentTime
              const o = c.createOscillator(); o.type = 'triangle'
              o.frequency.setValueAtTime(1500, now)
              o.frequency.exponentialRampToValueAtTime(600, now + 0.038)
              const g = c.createGain()
              g.gain.setValueAtTime(0.22, now)
              g.gain.exponentialRampToValueAtTime(0.001, now + 0.048)
              o.connect(g).connect(c.destination); o.start(); o.stop(now + 0.055)
            } catch(_) {}
          }, 62)
          spinNodes = { interval }
        } catch(_) {}
      },
      stopSpin() {
        try {
          if (!spinNodes) return
          clearInterval(spinNodes.interval)
          spinNodes = null
        } catch(_) {}
      },
      thud(i: number) {
        try {
          const c = getCtx()
          const t = c.currentTime + i*0.08
          const buf = c.createBuffer(1, Math.floor(c.sampleRate*0.14), c.sampleRate)
          const d = buf.getChannelData(0)
          for (let j=0;j<d.length;j++) d[j]=(Math.random()*2-1)*Math.exp(-j/d.length*20)*0.6
          const s = c.createBufferSource(); s.buffer=buf; s.connect(c.destination); s.start(t)
        } catch(_) {}
      },
      jackpot() {
        try {
          const c = getCtx()
          ;[523.25,659.25,783.99,880,1046.5,1318.5,1568].forEach((freq,i)=>{
            const t = c.currentTime+i*0.09
            const o = c.createOscillator(); o.type='sine'; o.frequency.value=freq
            const g = c.createGain(); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(0.28,t+0.04); g.gain.exponentialRampToValueAtTime(0.001,t+0.55)
            o.connect(g).connect(c.destination); o.start(t); o.stop(t+0.6)
          })
        } catch(_) {}
      },
    }

    // ── 릴 빌드 ──
    function buildReel(ri: number) {
      const refs = reelRefs[ri].current; if (!refs) return
      const { vp, strip } = refs
      const N = REEL_COUNTS[ri]
      m.symH = vp.getBoundingClientRect().width
      m.setH[ri] = N * m.symH
      strip.innerHTML = ''
      for (let rep=0; rep<REPEATS; rep++) {
        for (let si=0; si<N; si++) {
          const cell = document.createElement('div')
          cell.style.cssText = `width:${m.symH}px;height:${m.symH}px;display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative;box-sizing:border-box;`

          if (ri === 0) {
            // 얼굴: PNG image
            const face = FACES[si]
            cell.style.background = '#fff'
            const img = document.createElement('img')
            img.src = face.file; img.alt = face.label; (img as any).draggable = false
            img.style.cssText = 'width:90%;height:90%;object-fit:contain;display:block;pointer-events:none;'
            const lbl = document.createElement('div')
            lbl.style.cssText = 'position:absolute;bottom:3px;right:5px;font-size:9px;font-weight:700;color:rgba(0,0,0,0.4);font-family:sans-serif;'
            lbl.textContent = face.label
            cell.appendChild(img); cell.appendChild(lbl)

          } else if (ri === 1) {
            // 소품: SVG inline
            const item = ITEMS[si]
            cell.style.background = '#FAFAFA'
            cell.style.padding = '4px'
            const wrapper2 = document.createElement('div')
            wrapper2.style.cssText = `width:${m.symH-10}px;height:${m.symH-10}px;display:flex;align-items:center;justify-content:center;`
            wrapper2.innerHTML = item.svg.replace('<svg', `<svg width="${m.symH-10}" height="${m.symH-10}"`)
            const lbl = document.createElement('div')
            lbl.style.cssText = 'position:absolute;bottom:3px;right:5px;font-size:9px;font-weight:700;color:rgba(0,0,0,0.4);font-family:sans-serif;'
            lbl.textContent = item.label
            cell.appendChild(wrapper2); cell.appendChild(lbl)

          } else {
            // 배경: SVG scene
            const bg = BACKGROUNDS[si]
            cell.style.background = bg.color
            const wrapper2 = document.createElement('div')
            wrapper2.style.cssText = `width:${m.symH}px;height:${m.symH}px;overflow:hidden;display:flex;align-items:center;justify-content:center;`
            wrapper2.innerHTML = bg.svg.replace('<svg', `<svg width="${m.symH}" height="${m.symH}"`)
            const lbl = document.createElement('div')
            lbl.style.cssText = 'position:absolute;bottom:3px;right:5px;font-size:9px;font-weight:700;color:rgba(255,255,255,0.8);font-family:sans-serif;text-shadow:0 1px 2px rgba(0,0,0,0.5);'
            lbl.textContent = bg.label
            cell.appendChild(wrapper2); cell.appendChild(lbl)
          }

          strip.appendChild(cell)
        }
      }
      strip.style.height = (N*REPEATS*m.symH)+'px'
      applyY(ri, 0)
    }

    function applyY(ri: number, y: number) {
      m.posY[ri] = y
      const refs = reelRefs[ri].current; if (refs) refs.strip.style.transform = `translateY(${-y}px)`
    }

    function spinReel(ri: number, delay: number, onDone: (idx: number) => void) {
      const N = REEL_COUNTS[ri]
      const resultIdx = Math.floor(Math.random() * N)
      let targetY = resultIdx * m.symH
      const minY = m.posY[ri] + m.setH[ri] * 4
      while (targetY < minY) targetY += m.setH[ri]
      const startY = m.posY[ri]; const dist = targetY - startY; const TOTAL = 2600 + delay
      const refs = reelRefs[ri].current!
      refs.vp.classList.add('reel-spinning-border')
      setTimeout(() => {
        let t0: number | null = null
        function frame(ts: number) {
          if (!t0) t0 = ts
          const t = Math.min(1,(ts-t0)/TOTAL)
          applyY(ri, kf(t, startY, dist))
          if (t < 1) { requestAnimationFrame(frame); return }
          applyY(ri, targetY)
          const reset = targetY % m.setH[ri]
          requestAnimationFrame(() => {
            refs.strip.style.transition='none'
            refs.strip.style.transform=`translateY(${-reset}px)`
            m.posY[ri]=reset
            requestAnimationFrame(() => { refs.strip.style.transition='' })
          })
          refs.vp.classList.remove('reel-spinning-border')
          onDone(resultIdx)
        }
        requestAnimationFrame(frame)
      }, delay)
    }

    function spawnParticles(jackpot: boolean) {
      const wrapper = wrapperRef.current!; const rect = wrapper.getBoundingClientRect()
      const cx = rect.left+rect.width/2, cy = rect.top+rect.height/2
      const colors = jackpot ? ['#FFD700','#FFF','#FF6B8A','#4D72FB','#4DFB72','#FF8C42'] : ['#FFD700','#FFF','#4D72FB']
      for (let i=0; i<(jackpot?60:22); i++) {
        const el = document.createElement('div')
        const sz=(jackpot?8:4)+Math.random()*8, ang=Math.random()*Math.PI*2, spd=(jackpot?140:70)+Math.random()*160, dur=0.6+Math.random()*0.9
        el.style.cssText=`position:fixed;left:${cx}px;top:${cy}px;width:${sz}px;height:${sz}px;border-radius:50%;background:${colors[i%colors.length]};pointer-events:none;z-index:9999;--tx:${(Math.cos(ang)*spd).toFixed(1)}px;--ty:${(Math.sin(ang)*spd).toFixed(1)}px;animation:bfly ${dur.toFixed(2)}s ease-out forwards;animation-delay:${(Math.random()*0.2).toFixed(2)}s;`
        document.body.appendChild(el); setTimeout(()=>el.remove(),(dur+0.4)*1000)
      }
    }

    function startSpin() {
      if (m.spinning) return; m.spinning = true
      const wrapper = wrapperRef.current!
      wrapper.classList.remove('shake'); void wrapper.offsetWidth; wrapper.classList.add('shake')
      wrapper.addEventListener('animationend',()=>wrapper.classList.remove('shake'),{once:true})
      const msgEl = resultMsgRef.current!; msgEl.textContent = ''
      Sfx.startSpin()

      const resultIdxs: number[] = []
      let doneCount = 0

      for (let ri=0; ri<3; ri++) {
        spinReel(ri, ri*320, (idx) => {
          resultIdxs[ri] = idx; doneCount++
          Sfx.thud(doneCount-1)
          if (doneCount === 3) {
            Sfx.stopSpin()
            const face = FACES[resultIdxs[0]]
            const item = ITEMS[resultIdxs[1]]
            const bg   = BACKGROUNDS[resultIdxs[2]]

            spawnParticles(false)
            m.spinning = false

            msgEl.textContent = `${face.label} · ${item.label} · ${bg.label}`
            setTimeout(()=>Sfx.jackpot(), 200)
          }
        })
      }
    }

    setTimeout(()=>{ for(let i=0;i<3;i++) buildReel(i) }, 0)

    // ── 레버 ──
    const leverMount = document.getElementById('slot3-lever-mount')!
    const leverGroup = leverGroupRef.current!
    const PX=16, PY=118, MAX=62
    const easeIn3  = (t:number)=>t**3
    const easeOut2 = (t:number)=>1-(1-t)**2
    function easeBounce(t:number){const n=7.5625,d=2.75;if(t<1/d)return n*t*t;if(t<2/d){t-=1.5/d;return n*t*t+0.75}if(t<2.5/d){t-=2.25/d;return n*t*t+0.9375}t-=2.625/d;return n*t*t+0.984375}

    function setLeverAngle(a:number){m.leverAngle=Math.max(0,Math.min(MAX,a));leverGroup.setAttribute('transform',`rotate(${m.leverAngle},${PX},${PY})`)}
    function animLeverTo(target:number,ms:number,efn:(t:number)=>number,done?:()=>void){
      if(m.leverRaf!==null)cancelAnimationFrame(m.leverRaf)
      const from=m.leverAngle,t0=performance.now()
      function step(ts:number){const t=Math.min(1,(ts-t0)/ms);setLeverAngle(from+(target-from)*efn(t));if(t<1){m.leverRaf=requestAnimationFrame(step)}else{m.leverRaf=null;if(done)done()}}
      m.leverRaf=requestAnimationFrame(step)
    }
    function pull(){if(m.leverPulled)return;m.leverPulled=true;Sfx.click();animLeverTo(MAX,165,easeIn3,()=>{startSpin();setTimeout(()=>animLeverTo(0,500,easeBounce,()=>{m.leverPulled=false}),100)})}
    function onMD(e:MouseEvent){m.leverDragging=true;m.leverDy0=e.clientY;m.leverA0=m.leverAngle;e.preventDefault()}
    function onTS(e:TouchEvent){m.leverDragging=true;m.leverDy0=e.touches[0].clientY;m.leverA0=m.leverAngle;e.preventDefault()}
    function onMM(e:MouseEvent){if(!m.leverDragging)return;setLeverAngle(m.leverA0+(e.clientY-m.leverDy0)*0.55);if(m.leverAngle>=MAX-1.5&&!m.leverPulled){m.leverDragging=false;pull()}}
    function onTM(e:TouchEvent){if(!m.leverDragging)return;setLeverAngle(m.leverA0+(e.touches[0].clientY-m.leverDy0)*0.55);if(m.leverAngle>=MAX-1.5&&!m.leverPulled){m.leverDragging=false;pull()}}
    function onMU(){if(m.leverDragging&&!m.leverPulled)animLeverTo(0,260,easeOut2);m.leverDragging=false}
    function onTE(){if(m.leverDragging&&!m.leverPulled)animLeverTo(0,260,easeOut2);m.leverDragging=false}
    function onMC(){if(!m.leverPulled&&!m.leverDragging)pull()}

    leverMount.addEventListener('mousedown',onMD)
    leverMount.addEventListener('touchstart',onTS,{passive:false})
    leverMount.addEventListener('click',onMC)
    document.addEventListener('mousemove',onMM)
    document.addEventListener('mouseup',onMU)
    document.addEventListener('touchmove',onTM,{passive:false})
    document.addEventListener('touchend',onTE)

    return () => {
      leverMount.removeEventListener('mousedown',onMD)
      leverMount.removeEventListener('touchstart',onTS)
      leverMount.removeEventListener('click',onMC)
      document.removeEventListener('mousemove',onMM)
      document.removeEventListener('mouseup',onMU)
      document.removeEventListener('touchmove',onTM)
      document.removeEventListener('touchend',onTE)
      if(m.leverRaf!==null)cancelAnimationFrame(m.leverRaf)
      document.head.removeChild(styleEl)
      if(m.ac){m.ac.close();m.ac=null}
    }
  }, [])

  const REEL_W = Math.floor((width - 80) / 3)

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* 슬롯머신 본체 */}
      <div
        id="slot3-wrapper"
        ref={wrapperRef}
        style={{
          width,
          background: '#4D72FB',
          borderRadius: 32,
          padding: '20px 20px 22px',
          position: 'relative',
          boxShadow: [
            'inset 0 2px 0 rgba(255,255,255,0.22)',
            'inset 0 -3px 0 rgba(0,0,60,0.18)',
            '0 20px 52px rgba(77,114,251,0.4)',
          ].join(', '),
        }}
      >
        {/* 헤더 핍 */}
        <div style={{ display:'flex',justifyContent:'center',alignItems:'center',gap:7,marginBottom:16 }}>
          {[7,7,26,7,7].map((w,i)=>(
            <div key={i} style={{width:w,height:7,borderRadius:i===2?4:50,background:i===2?'rgba(255,255,255,0.75)':'rgba(255,255,255,0.35)'}}/>
          ))}
        </div>

        {/* 릴 라벨 */}
        <div style={{display:'flex',gap:6,marginBottom:5,justifyContent:'center'}}>
          {REEL_LABELS.map(label=>(
            <div key={label} style={{width:REEL_W+14,textAlign:'center',fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.8)',letterSpacing:'1px'}}>
              {label}
            </div>
          ))}
        </div>

        {/* 3릴 */}
        <div style={{display:'flex',gap:6,background:'rgba(0,0,40,0.28)',borderRadius:18,padding:6}}>
          {[0,1,2].map(i => (
            <div
              key={i}
              ref={(el) => {
                if (!el) return
                const strip = el.querySelector<HTMLDivElement>('.reel-strip')
                if (strip) reelRefs[i].current = { vp: el, strip }
              }}
              style={{
                width:REEL_W, height:REEL_W,
                borderRadius:12, overflow:'hidden',
                position:'relative', background:'#fff', flexShrink:0,
              }}
            >
              <div className="reel-strip" style={{position:'absolute',top:0,left:0,right:0,willChange:'transform'}} />
            </div>
          ))}
        </div>

        {/* 결과 메시지 */}
        <div ref={resultMsgRef} style={{marginTop:14,textAlign:'center',height:20,lineHeight:'20px',color:'rgba(255,255,255,0.92)',fontSize:13,fontWeight:700,letterSpacing:'1.5px',overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}} />

        {/* 하단 핍 */}
        <div style={{display:'flex',justifyContent:'center',gap:7,marginTop:16}}>
          {[0,0.3,0.6,0.9,1.2].map((delay,i)=>(
            <div key={i} style={{width:6,height:6,borderRadius:'50%',background:i===2?'rgba(255,255,255,0.8)':i===1||i===3?'rgba(255,255,255,0.5)':'rgba(255,255,255,0.3)',animation:`bpipPulse 2s ease-in-out ${delay}s infinite`}}/>
          ))}
        </div>

        {/* 레버 */}
        <div id="slot3-lever-mount" style={{position:'absolute',right:-60,top:'50%',transform:'translateY(-50%)',cursor:'pointer',userSelect:'none',WebkitUserSelect:'none',touchAction:'none'}}>
          <svg width={48} height={220} viewBox="0 0 48 220" style={{display:'block',overflow:'visible'}}>
            <rect x={4} y={96} width={22} height={44} rx={11} fill="#3558D4"/>
            <g ref={leverGroupRef} id="slot3-lever-group">
              <rect x={13} y={18} width={6} height={103} rx={3} fill="white" opacity={0.88}/>
              <circle cx={16} cy={13} r={14} fill="white"/>
              <circle cx={16} cy={13} r={14} fill="none" stroke="rgba(77,114,251,0.12)" strokeWidth={3}/>
              <circle cx={11} cy={8} r={4} fill="rgba(255,255,255,0.5)"/>
            </g>
          </svg>
        </div>
      </div>
    </div>
  )
}
