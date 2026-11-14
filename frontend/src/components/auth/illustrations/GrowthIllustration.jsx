/**
 * GrowthIllustration - illustration SVG décorative (recréée d'après les maquettes).
 * Prop : className (classes Tailwind de taille/position).
 */
function GrowthIllustration({ className = '' }) {
  return (
    <svg className={className} aria-hidden="true" focusable="false" viewBox="0 0 300 220">
    <defs>
    <linearGradient id="growth-coinTop" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fbe27a"/><stop offset="1" stopColor="#e3a82c"/></linearGradient>
    <linearGradient id="growth-coinSide" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#d99a1e"/><stop offset="0.5" stopColor="#f5cf55"/><stop offset="1" stopColor="#c58512"/></linearGradient>
    <linearGradient id="growth-bar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5be07f"/><stop offset="1" stopColor="#1ea84c"/></linearGradient>
    </defs>
    <rect x="8" y="120" width="22" height="70" fill="#0b5a2b" opacity="0.75"/><rect x="34" y="100" width="18" height="90" fill="#0b5a2b" opacity="0.75"/><rect x="56" y="128" width="24" height="62" fill="#0b5a2b" opacity="0.75"/><rect x="84" y="108" width="16" height="82" fill="#0b5a2b" opacity="0.75"/><rect x="104" y="134" width="20" height="56" fill="#0b5a2b" opacity="0.75"/><rect x="134" y="112" width="18" height="78" fill="#0b5a2b" opacity="0.75"/><rect x="158" y="126" width="22" height="64" fill="#0b5a2b" opacity="0.75"/><rect x="186" y="100" width="20" height="90" fill="#0b5a2b" opacity="0.75"/><rect x="212" y="122" width="18" height="68" fill="#0b5a2b" opacity="0.75"/><rect x="236" y="106" width="24" height="84" fill="#0b5a2b" opacity="0.75"/><rect x="264" y="128" width="22" height="62" fill="#0b5a2b" opacity="0.75"/>
    <rect x="176" y="150" width="22" height="46" rx="2" fill="url(#growth-bar)"/>
    <rect x="204" y="124" width="22" height="72" rx="2" fill="url(#growth-bar)"/>
    <rect x="232" y="98" width="22" height="98" rx="2" fill="url(#growth-bar)"/>
    <rect x="260" y="66" width="22" height="130" rx="2" fill="url(#growth-bar)"/>
    <path d="M120 150 L168 118 L196 132 L262 70" fill="none" stroke="#6ff08f" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M246 66 L268 56 L264 80 z" fill="#6ff08f"/>
    <ellipse cx="80" cy="198" rx="78" ry="12" fill="#3b2a16"/>
    
    <path d="M90 188 v7 a20 7 0 0 0 40 0 v-7 z" fill="url(#growth-coinSide)" stroke="#a8700f" strokeWidth="1"/>
    <ellipse cx="110" cy="188" rx="20" ry="7" fill="url(#growth-coinTop)" stroke="#b8790f" strokeWidth="1"/>
    <ellipse cx="110" cy="188" rx="14" ry="4.8" fill="none" stroke="#e0a82a" strokeWidth="1"/>
    <path d="M90 181 v7 a20 7 0 0 0 40 0 v-7 z" fill="url(#growth-coinSide)" stroke="#a8700f" strokeWidth="1"/>
    <ellipse cx="110" cy="181" rx="20" ry="7" fill="url(#growth-coinTop)" stroke="#b8790f" strokeWidth="1"/>
    <ellipse cx="110" cy="181" rx="14" ry="4.8" fill="none" stroke="#e0a82a" strokeWidth="1"/>
    <path d="M90 174 v7 a20 7 0 0 0 40 0 v-7 z" fill="url(#growth-coinSide)" stroke="#a8700f" strokeWidth="1"/>
    <ellipse cx="110" cy="174" rx="20" ry="7" fill="url(#growth-coinTop)" stroke="#b8790f" strokeWidth="1"/>
    <ellipse cx="110" cy="174" rx="14" ry="4.8" fill="none" stroke="#e0a82a" strokeWidth="1"/>
    <path d="M90 167 v7 a20 7 0 0 0 40 0 v-7 z" fill="url(#growth-coinSide)" stroke="#a8700f" strokeWidth="1"/>
    <ellipse cx="110" cy="167" rx="20" ry="7" fill="url(#growth-coinTop)" stroke="#b8790f" strokeWidth="1"/>
    <ellipse cx="110" cy="167" rx="14" ry="4.8" fill="none" stroke="#e0a82a" strokeWidth="1"/>
    
    <path d="M30 190 v7 a22 7 0 0 0 44 0 v-7 z" fill="url(#growth-coinSide)" stroke="#a8700f" strokeWidth="1"/>
    <ellipse cx="52" cy="190" rx="22" ry="7" fill="url(#growth-coinTop)" stroke="#b8790f" strokeWidth="1"/>
    <ellipse cx="52" cy="190" rx="16" ry="4.8" fill="none" stroke="#e0a82a" strokeWidth="1"/>
    <path d="M30 183 v7 a22 7 0 0 0 44 0 v-7 z" fill="url(#growth-coinSide)" stroke="#a8700f" strokeWidth="1"/>
    <ellipse cx="52" cy="183" rx="22" ry="7" fill="url(#growth-coinTop)" stroke="#b8790f" strokeWidth="1"/>
    <ellipse cx="52" cy="183" rx="16" ry="4.8" fill="none" stroke="#e0a82a" strokeWidth="1"/>
    <path d="M30 176 v7 a22 7 0 0 0 44 0 v-7 z" fill="url(#growth-coinSide)" stroke="#a8700f" strokeWidth="1"/>
    <ellipse cx="52" cy="176" rx="22" ry="7" fill="url(#growth-coinTop)" stroke="#b8790f" strokeWidth="1"/>
    <ellipse cx="52" cy="176" rx="16" ry="4.8" fill="none" stroke="#e0a82a" strokeWidth="1"/>
    <path d="M30 169 v7 a22 7 0 0 0 44 0 v-7 z" fill="url(#growth-coinSide)" stroke="#a8700f" strokeWidth="1"/>
    <ellipse cx="52" cy="169" rx="22" ry="7" fill="url(#growth-coinTop)" stroke="#b8790f" strokeWidth="1"/>
    <ellipse cx="52" cy="169" rx="16" ry="4.8" fill="none" stroke="#e0a82a" strokeWidth="1"/>
    <path d="M30 162 v7 a22 7 0 0 0 44 0 v-7 z" fill="url(#growth-coinSide)" stroke="#a8700f" strokeWidth="1"/>
    <ellipse cx="52" cy="162" rx="22" ry="7" fill="url(#growth-coinTop)" stroke="#b8790f" strokeWidth="1"/>
    <ellipse cx="52" cy="162" rx="16" ry="4.8" fill="none" stroke="#e0a82a" strokeWidth="1"/>
    <path d="M30 155 v7 a22 7 0 0 0 44 0 v-7 z" fill="url(#growth-coinSide)" stroke="#a8700f" strokeWidth="1"/>
    <ellipse cx="52" cy="155" rx="22" ry="7" fill="url(#growth-coinTop)" stroke="#b8790f" strokeWidth="1"/>
    <ellipse cx="52" cy="155" rx="16" ry="4.8" fill="none" stroke="#e0a82a" strokeWidth="1"/>
    
    <path d="M58 194 v7 a24 7 0 0 0 48 0 v-7 z" fill="url(#growth-coinSide)" stroke="#a8700f" strokeWidth="1"/>
    <ellipse cx="82" cy="194" rx="24" ry="7" fill="url(#growth-coinTop)" stroke="#b8790f" strokeWidth="1"/>
    <ellipse cx="82" cy="194" rx="18" ry="4.8" fill="none" stroke="#e0a82a" strokeWidth="1"/>
    <path d="M58 187 v7 a24 7 0 0 0 48 0 v-7 z" fill="url(#growth-coinSide)" stroke="#a8700f" strokeWidth="1"/>
    <ellipse cx="82" cy="187" rx="24" ry="7" fill="url(#growth-coinTop)" stroke="#b8790f" strokeWidth="1"/>
    <ellipse cx="82" cy="187" rx="18" ry="4.8" fill="none" stroke="#e0a82a" strokeWidth="1"/>
    <path d="M58 180 v7 a24 7 0 0 0 48 0 v-7 z" fill="url(#growth-coinSide)" stroke="#a8700f" strokeWidth="1"/>
    <ellipse cx="82" cy="180" rx="24" ry="7" fill="url(#growth-coinTop)" stroke="#b8790f" strokeWidth="1"/>
    <ellipse cx="82" cy="180" rx="18" ry="4.8" fill="none" stroke="#e0a82a" strokeWidth="1"/>
    <path d="M58 173 v7 a24 7 0 0 0 48 0 v-7 z" fill="url(#growth-coinSide)" stroke="#a8700f" strokeWidth="1"/>
    <ellipse cx="82" cy="173" rx="24" ry="7" fill="url(#growth-coinTop)" stroke="#b8790f" strokeWidth="1"/>
    <ellipse cx="82" cy="173" rx="18" ry="4.8" fill="none" stroke="#e0a82a" strokeWidth="1"/>
    <path d="M58 166 v7 a24 7 0 0 0 48 0 v-7 z" fill="url(#growth-coinSide)" stroke="#a8700f" strokeWidth="1"/>
    <ellipse cx="82" cy="166" rx="24" ry="7" fill="url(#growth-coinTop)" stroke="#b8790f" strokeWidth="1"/>
    <ellipse cx="82" cy="166" rx="18" ry="4.8" fill="none" stroke="#e0a82a" strokeWidth="1"/>
    <path d="M58 159 v7 a24 7 0 0 0 48 0 v-7 z" fill="url(#growth-coinSide)" stroke="#a8700f" strokeWidth="1"/>
    <ellipse cx="82" cy="159" rx="24" ry="7" fill="url(#growth-coinTop)" stroke="#b8790f" strokeWidth="1"/>
    <ellipse cx="82" cy="159" rx="18" ry="4.8" fill="none" stroke="#e0a82a" strokeWidth="1"/>
    <path d="M58 152 v7 a24 7 0 0 0 48 0 v-7 z" fill="url(#growth-coinSide)" stroke="#a8700f" strokeWidth="1"/>
    <ellipse cx="82" cy="152" rx="24" ry="7" fill="url(#growth-coinTop)" stroke="#b8790f" strokeWidth="1"/>
    <ellipse cx="82" cy="152" rx="18" ry="4.8" fill="none" stroke="#e0a82a" strokeWidth="1"/>
    <path d="M58 145 v7 a24 7 0 0 0 48 0 v-7 z" fill="url(#growth-coinSide)" stroke="#a8700f" strokeWidth="1"/>
    <ellipse cx="82" cy="145" rx="24" ry="7" fill="url(#growth-coinTop)" stroke="#b8790f" strokeWidth="1"/>
    <ellipse cx="82" cy="145" rx="18" ry="4.8" fill="none" stroke="#e0a82a" strokeWidth="1"/>
    <path d="M58 138 v7 a24 7 0 0 0 48 0 v-7 z" fill="url(#growth-coinSide)" stroke="#a8700f" strokeWidth="1"/>
    <ellipse cx="82" cy="138" rx="24" ry="7" fill="url(#growth-coinTop)" stroke="#b8790f" strokeWidth="1"/>
    <ellipse cx="82" cy="138" rx="18" ry="4.8" fill="none" stroke="#e0a82a" strokeWidth="1"/>
    <g transform="translate(0 26)">
    <path d="M82 110 C80 92 80 80 84 66" fill="none" stroke="#5aa832" strokeWidth="3.5" strokeLinecap="round"/>
    <path d="M84 70 C64 72 48 62 44 44 C64 40 80 50 84 70 z" fill="#8bdc5a" stroke="#4e9a2a" strokeWidth="1.5"/>
    <path d="M84 74 C98 62 116 60 128 48 C126 70 108 84 84 74 z" fill="#6cc83f" stroke="#4e9a2a" strokeWidth="1.5"/>
    </g>
    </svg>
  )
}

export default GrowthIllustration
