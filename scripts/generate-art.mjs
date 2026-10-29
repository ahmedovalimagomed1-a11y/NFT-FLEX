import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const nftDir = join(root, 'public/assets/nfts');
const caseDir = join(root, 'public/assets/cases');
mkdirSync(nftDir, { recursive: true });
mkdirSync(caseDir, { recursive: true });

const items = [
  ['street_cap', '#b6c2d1'], ['metro_token', '#8f9bab'], ['old_phone', '#a0adbb'],
  ['energy_drink', '#7b8b9e'], ['scratched_card', '#93a0b1'], ['paper_crown', '#aeb9c7'],
  ['neon_ramen', '#43d17a'], ['cassette', '#5ed68b'], ['pigeon', '#61cf8f'],
  ['cyber_coin', '#4bd98b'], ['gas_mask', '#50d98f'], ['street_mic', '#63d08a'],
  ['gold_chain', '#3fa7ff'], ['glitch_cat', '#48b4ff'], ['rocket_chip', '#3d9dff'],
  ['neon_skull', '#51b0ff'], ['bank_card', '#469eff'], ['pigeon_king', '#57b7ff'],
  ['luxury_watch', '#b06bff'], ['cyber_car', '#a56bff'], ['diamond_fist', '#b874ff'],
  ['golden_pigeon', '#ad6bff'], ['zero_day', '#a967ff'], ['liquid_heart', '#b46fff'],
  ['moon_rock', '#ffb020'], ['obsidian_crown', '#ffb62d'], ['satoshi_shard', '#ffbe38'],
  ['neon_dragon', '#ffb224'], ['black_amex', '#ffb82a'], ['genesis_orb', '#ff4d8d'],
  ['flex_core', '#ff5c92'], ['void_ticket', '#ff4f86'], ['god_pigeon', '#ff6597'],
  ['infinity_chain', '#ff5b91'],
];

const frame = (accent, content, collection = 'NFT FLEX', seed = 0) => {
  const particles = Array.from({ length: 16 }, (_, i) => {
    const x = 38 + ((seed * 37 + i * 71) % 404);
    const y = 55 + ((seed * 53 + i * 47) % 355);
    const r = 1 + ((i + seed) % 3);
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="${accent}" opacity="${0.12 + ((i % 4) * 0.08)}"/>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480" width="480" height="480">
  <defs>
    <radialGradient id="bg" cx="48%" cy="34%" r="80%">
      <stop offset="0" stop-color="#181a2b"/><stop offset=".55" stop-color="#0c0d17"/><stop offset="1" stop-color="#06070c"/>
    </radialGradient>
    <radialGradient id="halo" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="${accent}" stop-opacity=".55"/><stop offset=".55" stop-color="${accent}" stop-opacity=".12"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="metal" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity=".95"/><stop offset=".28" stop-color="${accent}"/><stop offset=".62" stop-color="${accent}" stop-opacity=".55"/><stop offset="1" stop-color="#ffffff" stop-opacity=".7"/>
    </linearGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity=".14"/><stop offset="1" stop-color="#ffffff" stop-opacity=".02"/>
    </linearGradient>
    <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
      <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#ffffff" stroke-opacity=".035" stroke-width="1"/>
    </pattern>
    <filter id="glow"><feGaussianBlur stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="soft"><feGaussianBlur stdDeviation="18"/></filter>
    <linearGradient id="edge" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${accent}" stop-opacity=".65"/><stop offset=".5" stop-color="#ffffff" stop-opacity=".12"/><stop offset="1" stop-color="${accent}" stop-opacity=".3"/>
    </linearGradient>
  </defs>
  <rect width="480" height="480" rx="38" fill="url(#bg)"/>
  <rect width="480" height="480" rx="38" fill="url(#grid)"/>
  <ellipse cx="240" cy="244" rx="205" ry="198" fill="url(#halo)" filter="url(#soft)"/>
  <ellipse cx="240" cy="385" rx="150" ry="28" fill="#000" opacity=".45" filter="url(#soft)"/>
  <path d="M26 168 V48 a22 22 0 0 1 22-22 h120 M454 312 v120 a22 22 0 0 1-22 22 H312" fill="none" stroke="url(#edge)" stroke-width="2"/>
  ${particles}
  <g filter="url(#glow)">${content}</g>
  <rect x="12" y="12" width="456" height="456" rx="32" fill="none" stroke="url(#edge)" stroke-width="1.5"/>
  <rect x="22" y="22" width="436" height="436" rx="26" fill="none" stroke="#ffffff" stroke-opacity=".05" stroke-width="1"/>
  <g font-family="Arial, Helvetica, sans-serif" fill="#ffffff" opacity=".45">
    <text x="32" y="450" font-size="10" letter-spacing="3">${collection.toUpperCase()}</text>
    <text x="448" y="450" font-size="10" letter-spacing="2" text-anchor="end">FLEX / ${String(seed).padStart(2, '0')}</text>
  </g>
</svg>`;
};

const cap = `<path d="M130 252c10-68 44-104 106-104 61 0 96 36 105 104h-15c-6-34-25-54-54-59-17-3-32-1-44 6-15 8-21 27-25 53z" fill="url(#metal)"/><path d="M84 254c24-18 64-26 122-26h114c24 0 42 5 54 15 8 7 5 16-8 18-41 7-97 10-167 10-55 0-89-5-103-8-7-2-10-5-12-9z" fill="url(#metal)" opacity=".9"/><path d="M218 161c14 5 25 18 31 39" stroke="#fff" stroke-opacity=".5" stroke-width="3" fill="none"/>`;
const token = `<circle cx="240" cy="240" r="118" fill="url(#metal)"/><circle cx="240" cy="240" r="92" fill="#0b0d16"/><circle cx="240" cy="240" r="76" fill="none" stroke="${'#8f9bab'}" stroke-width="3" opacity=".7"/><rect x="208" y="208" width="64" height="64" rx="14" fill="url(#metal)"/><path d="M228 240h24M240 228v24" stroke="#0b0d16" stroke-width="8" stroke-linecap="round"/><path d="M151 154l24 24M329 154l-24 24M151 326l24-24M329 326l-24-24" stroke="#fff" stroke-opacity=".45" stroke-width="3"/>`;
const phone = `<rect x="166" y="104" width="148" height="272" rx="26" fill="url(#metal)"/><rect x="180" y="126" width="120" height="172" rx="10" fill="#09111a"/><rect x="190" y="138" width="100" height="148" rx="6" fill="${'#8f9bab'}" opacity=".25"/><circle cx="240" cy="322" r="22" fill="#0b0d16"/><circle cx="240" cy="322" r="12" fill="${'#a0adbb'}" opacity=".7"/><g fill="${'#a0adbb'}" opacity=".6"><rect x="198" y="148" width="52" height="5" rx="2"/><rect x="198" y="160" width="34" height="5" rx="2"/><rect x="198" y="186" width="84" height="38" rx="6" opacity=".5"/></g>`;
const can = `<path d="M184 126h112v18l14 24v168c0 20-16 36-36 36h-68c-20 0-36-16-36-36V168l14-24z" fill="url(#metal)"/><ellipse cx="240" cy="126" rx="56" ry="15" fill="#dbe4ee"/><ellipse cx="240" cy="126" rx="42" ry="9" fill="#39434e"/><path d="M194 210h92v108h-92z" fill="#0b0d16" opacity=".3"/><path d="M222 238l36 26-36 26z" fill="#fff" opacity=".8"/><path d="M206 172h68" stroke="#fff" stroke-opacity=".5" stroke-width="3"/>`;
const card = `<rect x="112" y="158" width="256" height="164" rx="20" fill="url(#metal)" transform="rotate(-7 240 240)"/><rect x="130" y="181" width="64" height="46" rx="8" fill="#0b0d16" opacity=".7" transform="rotate(-7 240 240)"/><g transform="rotate(-7 240 240)" fill="none" stroke="#0b0d16" stroke-opacity=".55" stroke-width="4"><path d="M132 266h218M132 284h140"/></g><path d="M306 196l18 12-18 12-18-12z" fill="#0b0d16" opacity=".6" transform="rotate(-7 240 240)"/><path d="M150 168l40 12M290 300l40-28" stroke="#fff" stroke-opacity=".6" stroke-width="2"/>`;
const crown = `<path d="M126 298l18-142 74 66 22-96 22 96 74-66 18 142z" fill="url(#metal)"/><path d="M146 312h188l-12 34H158z" fill="url(#metal)" opacity=".85"/><g fill="#0b0d16"><circle cx="168" cy="268" r="8"/><circle cx="240" cy="244" r="10"/><circle cx="312" cy="268" r="8"/></g><g fill="#fff" opacity=".55"><circle cx="168" cy="268" r="3"/><circle cx="240" cy="244" r="4"/><circle cx="312" cy="268" r="3"/></g>`;
const bowl = `<path d="M142 242h196c-8 76-40 116-98 116s-90-40-98-116z" fill="url(#metal)"/><ellipse cx="240" cy="242" rx="98" ry="24" fill="#0b0d16" opacity=".85"/><path d="M174 228c18-20 16-42 4-58M222 224c18-24 16-48 2-66M270 226c16-20 15-38 5-54M314 228c12-16 12-32 4-44" stroke="#fff" stroke-opacity=".55" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M196 278c20 18 68 18 88 0" stroke="#0b0d16" stroke-opacity=".5" stroke-width="5" fill="none"/><g fill="#fff" opacity=".6"><circle cx="214" cy="266" r="4"/><circle cx="248" cy="274" r="5"/><circle cx="280" cy="262" r="3"/></g>`;
const cassette = `<rect x="112" y="160" width="256" height="166" rx="20" fill="url(#metal)"/><rect x="136" y="186" width="208" height="84" rx="12" fill="#0b0d16"/><circle cx="196" cy="228" r="28" fill="#d8e5df" opacity=".8"/><circle cx="284" cy="228" r="28" fill="#d8e5df" opacity=".8"/><circle cx="196" cy="228" r="10" fill="#0b0d16"/><circle cx="284" cy="228" r="10" fill="#0b0d16"/><path d="M170 306h140l-18-38H188z" fill="#0b0d16" opacity=".55"/><g fill="#0b0d16" opacity=".55"><circle cx="150" cy="198" r="4"/><circle cx="330" cy="198" r="4"/><circle cx="150" cy="290" r="4"/><circle cx="330" cy="290" r="4"/></g>`;
const bird = `<path d="M156 306c4-56 22-102 70-122 28-12 66-8 84 16 12 17 8 38-8 49-17 12-38 4-51-10-11 35-36 56-78 66z" fill="url(#metal)"/><circle cx="282" cy="208" r="9" fill="#0b0d16"/><path d="M311 216l34 9-32 13z" fill="#fff" opacity=".75"/><path d="M162 310c-28 8-44 24-48 42 36-2 66-10 88-26" fill="url(#metal)" opacity=".8"/><path d="M208 262c20-14 46-18 70-12" stroke="#fff" stroke-opacity=".5" stroke-width="4" fill="none"/>`;
const coin = `<circle cx="240" cy="240" r="120" fill="url(#metal)"/><circle cx="240" cy="240" r="96" fill="#0b0d16"/><circle cx="240" cy="240" r="84" fill="none" stroke="url(#metal)" stroke-width="4"/><path d="M240 178l20 34 38 12-30 28 4 42-32-20-32 20 4-42-30-28 38-12z" fill="url(#metal)"/><g stroke="#fff" stroke-opacity=".25" stroke-width="2"><path d="M240 132v20M240 328v20M132 240h20M328 240h20"/></g>`;
const mask = `<path d="M166 180c32-28 116-28 148 0 22 20 18 62 4 100-12 34-38 60-78 60s-66-26-78-60c-14-38-18-80 4-100z" fill="url(#metal)"/><path d="M186 228c20-12 44-12 64 0-4 30-16 44-32 44s-28-14-32-44zM250 228c20-12 44-12 64 0-4 30-16 44-32 44s-28-14-32-44z" fill="#0b0d16"/><circle cx="218" cy="244" r="13" fill="${'#50d98f'}" opacity=".9"/><circle cx="282" cy="244" r="13" fill="${'#50d98f'}" opacity=".9"/><path d="M220 296h40l-8 26h-24z" fill="#0b0d16"/><path d="M166 224c-22 2-34 12-38 28M334 224c22 2 34 12 38 28" stroke="#0b0d16" stroke-width="12" fill="none" stroke-linecap="round"/>`;
const mic = `<rect x="206" y="108" width="68" height="158" rx="34" fill="url(#metal)"/><g stroke="#0b0d16" stroke-opacity=".45" stroke-width="3"><path d="M206 150h68M206 174h68M206 198h68M206 222h68"/></g><path d="M178 232c0 56 28 90 62 90s62-34 62-90" fill="none" stroke="url(#metal)" stroke-width="12" stroke-linecap="round"/><path d="M240 322v42M204 372h72" stroke="url(#metal)" stroke-width="12" stroke-linecap="round"/><path d="M220 136h40" stroke="#fff" stroke-opacity=".5" stroke-width="4"/>`;
const chain = `<g fill="none" stroke="url(#metal)" stroke-width="18"><ellipse cx="184" cy="204" rx="52" ry="30" transform="rotate(-38 184 204)"/><ellipse cx="240" cy="252" rx="52" ry="30" transform="rotate(-38 240 252)"/><ellipse cx="296" cy="300" rx="52" ry="30" transform="rotate(-38 296 300)"/></g><circle cx="240" cy="252" r="44" fill="url(#metal)"/><path d="M240 226l16 26-16 26-16-26z" fill="#0b0d16" opacity=".7"/>`;
const cat = `<path d="M154 184l18-62 55 35c9-2 17-2 26 0l55-35 18 62c18 30 18 88-10 120-25 28-59 38-76 38s-51-10-76-38c-28-32-28-90-10-120z" fill="url(#metal)"/><path d="M202 226l18 12-18 12-18-12zM278 226l18 12-18 12-18-12z" fill="#0b0d16"/><path d="M240 262l-12 12 12 8 12-8z" fill="#0b0d16"/><g stroke="#0b0d16" stroke-width="4" stroke-linecap="round"><path d="M206 292l-32 10M206 302l-34 20M274 292l32 10M274 302l34 20"/></g><path d="M190 150l10 26M290 150l-10 26" stroke="#0b0d16" stroke-width="5"/>`;
const chip = `<rect x="170" y="170" width="140" height="140" rx="18" fill="url(#metal)"/><rect x="198" y="198" width="84" height="84" rx="8" fill="#0b0d16"/><path d="M240 218l26 18-10 32h-32l-10-32z" fill="url(#metal)"/><g stroke="url(#metal)" stroke-width="9" stroke-linecap="round"><path d="M198 146v24M222 146v24M246 146v24M270 146v24M198 310v24M222 310v24M246 310v24M270 310v24"/><path d="M146 198h24M146 222h24M146 246h24M146 270h24M310 198h24M310 222h24M310 246h24M310 270h24"/></g>`;
const skull = `<path d="M164 224c0-68 34-110 76-110s76 42 76 110c0 38-14 60-34 74v34h-84v-34c-20-14-34-36-34-74z" fill="url(#metal)"/><path d="M190 228c0-24 14-38 28-38s28 14 28 38v20h-56zM234 228c0-24 14-38 28-38s28 14 28 38v20h-56z" fill="#0b0d16"/><circle cx="218" cy="230" r="10" fill="${'#51b0ff'}"/><circle cx="262" cy="230" r="10" fill="${'#51b0ff'}"/><path d="M228 280l12-18 12 18z" fill="#0b0d16"/><path d="M208 306h64M216 306v18M240 306v22M264 306v18" stroke="#0b0d16" stroke-width="5"/>`;
const card2 = `<rect x="110" y="150" width="260" height="168" rx="18" fill="url(#metal)" transform="rotate(5 240 240)"/><rect x="110" y="150" width="260" height="48" fill="#0b0d16" opacity=".4" transform="rotate(5 240 240)"/><path d="M134 262h212M134 286h130" stroke="#0b0d16" stroke-opacity=".55" stroke-width="6" transform="rotate(5 240 240)"/><circle cx="320" cy="278" r="22" fill="#fff" opacity=".35" transform="rotate(5 240 240)"/><path d="M138 174h160" stroke="#fff" stroke-opacity=".55" stroke-width="4" transform="rotate(5 240 240)"/>`;
const pigeon = `<path d="M154 290c8-68 38-120 90-132 34-8 68 8 78 40 8 24-4 52-28 62-26 10-50-2-62-20-4 36-28 48-60 50z" fill="url(#metal)"/><circle cx="290" cy="194" r="8" fill="#0b0d16"/><path d="M318 202l32 8-30 12z" fill="#fff" opacity=".8"/><path d="M170 300c-24 12-38 28-42 46 34-2 62-12 84-30" fill="url(#metal)" opacity=".8"/><path d="M190 252c24-8 44-6 62 4" stroke="#fff" stroke-opacity=".45" stroke-width="4"/>`;
const watch = `<circle cx="240" cy="246" r="104" fill="url(#metal)"/><circle cx="240" cy="246" r="82" fill="#0b0d16"/><circle cx="240" cy="246" r="70" fill="none" stroke="${'#b06bff'}" stroke-width="2" opacity=".75"/><path d="M196 142l16-54h56l16 54M196 350l16 54h56l16-54" fill="url(#metal)"/><path d="M240 190v58l40 24" stroke="url(#metal)" stroke-width="8" stroke-linecap="round"/><g stroke="#fff" stroke-opacity=".45" stroke-width="3"><path d="M240 170v10M240 312v10M164 246h10M306 246h10"/></g>`;
const car = `<path d="M116 278l18-58c6-22 22-34 46-34h120c24 0 40 12 46 34l18 58h16c12 0 20 8 20 20v22H100v-22c0-12 8-20 20-20z" fill="url(#metal)"/><path d="M154 232h172l-12-28H166z" fill="#0b0d16" opacity=".55"/><g fill="#0b0d16"><circle cx="172" cy="318" r="28"/><circle cx="308" cy="318" r="28"/></g><g fill="url(#metal)"><circle cx="172" cy="318" r="12"/><circle cx="308" cy="318" r="12"/></g><path d="M222 244h40" stroke="#fff" stroke-opacity=".6" stroke-width="4"/><path d="M100 292h32M348 292h32" stroke="#fff" stroke-opacity=".5" stroke-width="5"/>`;
const fist = `<path d="M240 112l108 86-42 144-66 32-66-32-42-144z" fill="url(#metal)"/><path d="M240 144l74 60-28 102-46 22-46-22-28-102z" fill="#0b0d16" opacity=".55"/><path d="M240 172l42 32-16 56-26 12-26-12-16-56z" fill="url(#metal)"/><g stroke="#fff" stroke-opacity=".35" stroke-width="2"><path d="M240 112v338M132 198l216 144M348 198L132 342"/></g>`;
const rock = `<path d="M160 320l-18-82 48-88 88-18 62 62 18 86-54 66-96 10z" fill="url(#metal)"/><g fill="#0b0d16" opacity=".5"><circle cx="194" cy="210" r="20"/><circle cx="270" cy="184" r="14"/><circle cx="302" cy="270" r="24"/><circle cx="218" cy="302" r="12"/></g><path d="M198 196c18 14 35 16 52 6M266 254c12 14 26 18 42 12" stroke="#fff" stroke-opacity=".45" stroke-width="3" fill="none"/>`;
const shard = `<path d="M240 108l58 140-32 120-54 14-54-92z" fill="url(#metal)"/><path d="M240 108l-22 150 48 38 32-120z" fill="#fff" opacity=".18"/><path d="M170 290l48-32 40 124" fill="#0b0d16" opacity=".35"/><g fill="#fff" opacity=".6"><circle cx="304" cy="174" r="4"/><circle cx="330" cy="206" r="3"/><circle cx="148" cy="246" r="3"/></g>`;
const dragon = `<path d="M144 318c22-92 54-154 114-186 4 42 22 66 54 76-18 16-24 40-18 70-24-4-42 2-52 20 36 4 64 18 84 44-62 10-118-4-168-24z" fill="url(#metal)"/><circle cx="272" cy="164" r="9" fill="#0b0d16"/><path d="M298 178l34 8-28 16z" fill="#fff" opacity=".7"/><path d="M170 274l-28-20M192 234l-24-30M214 196l-14-38" stroke="#0b0d16" stroke-width="7" stroke-linecap="round"/><path d="M250 262c28 8 48 22 62 44" stroke="#fff" stroke-opacity=".4" stroke-width="4" fill="none"/>`;
const orb = `<circle cx="240" cy="244" r="112" fill="url(#metal)"/><circle cx="240" cy="244" r="86" fill="none" stroke="#0b0d16" stroke-opacity=".5" stroke-width="3"/><ellipse cx="240" cy="244" rx="152" ry="46" fill="none" stroke="url(#metal)" stroke-width="5" transform="rotate(-24 240 244)"/><ellipse cx="240" cy="244" rx="152" ry="46" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="2" transform="rotate(24 240 244)"/><g fill="#fff" opacity=".65"><circle cx="196" cy="208" r="5"/><circle cx="286" cy="278" r="4"/><circle cx="268" cy="194" r="3"/></g>`;
const core = `<circle cx="240" cy="244" r="122" fill="none" stroke="url(#metal)" stroke-width="5" opacity=".55"/><circle cx="240" cy="244" r="94" fill="none" stroke="url(#metal)" stroke-width="2" opacity=".45"/><path d="M240 142l54 48 22 70-42 70-68 0-42-70 22-70z" fill="url(#metal)"/><path d="M240 190l28 26 10 38-22 38h-32l-22-38 10-38z" fill="#0b0d16" opacity=".65"/><circle cx="240" cy="248" r="18" fill="url(#metal)"/><path d="M240 84v28M240 376v28M80 244h28M372 244h28" stroke="#fff" stroke-opacity=".4" stroke-width="4"/>`;
const ticket = `<path d="M132 186h216v44c-22 0-40 18-40 40s18 40 40 40v44H132v-44c22 0 40-18 40-40s-18-40-40-40z" fill="url(#metal)"/><path d="M198 252h86M198 278h86" stroke="#0b0d16" stroke-opacity=".55" stroke-width="6"/><circle cx="240" cy="226" r="16" fill="#0b0d16"/><path d="M240 214l6 12 12 2-9 9 2 13-11-6-11 6 2-13-9-9 12-2z" fill="#fff" opacity=".7"/><path d="M148 186v148" stroke="#0b0d16" stroke-opacity=".35" stroke-width="2" stroke-dasharray="6 6"/><path d="M332 186v148" stroke="#0b0d16" stroke-opacity=".35" stroke-width="2" stroke-dasharray="6 6"/>`;
const crown2 = `<path d="M116 306l24-162 76 78 24-112 24 112 76-78 24 162z" fill="url(#metal)"/><path d="M140 318h200l-14 38H154z" fill="url(#metal)" opacity=".8"/><path d="M240 154l-10 104 10 20 10-20z" fill="#0b0d16" opacity=".45"/><g fill="#0b0d16"><circle cx="170" cy="280" r="9"/><circle cx="240" cy="254" r="12"/><circle cx="310" cy="280" r="9"/></g>`;

const glyphs = {
  street_cap: cap, metro_token: token, old_phone: phone, energy_drink: can, scratched_card: card,
  paper_crown: crown, neon_ramen: bowl, cassette, pigeon: bird, cyber_coin: coin,
  gas_mask: mask, street_mic: mic, gold_chain: chain, glitch_cat: cat, rocket_chip: chip,
  neon_skull: skull, bank_card: card2, pigeon_king: pigeon, luxury_watch: watch, cyber_car: car,
  diamond_fist: fist, golden_pigeon: bird, zero_day: chip, liquid_heart: `<path d="M240 342S136 282 136 200c0-38 28-66 62-66 18 0 34 8 42 22 8-14 24-22 42-22 34 0 62 28 62 66 0 82-104 142-104 142z" fill="url(#metal)"/><path d="M172 208c10-44 46-54 68-34" stroke="#fff" stroke-opacity=".55" stroke-width="5" fill="none"/>`,
  moon_rock: rock, obsidian_crown: crown2, satoshi_shard: shard, neon_dragon: dragon, black_amex: card2,
  genesis_orb: orb, flex_core: core, void_ticket: ticket, god_pigeon: pigeon, infinity_chain: `<path d="M154 244c0-44 34-76 76-76 30 0 54 16 70 40 16-24 40-40 70-40 42 0 76 32 76 76s-34 76-76 76c-30 0-54-16-70-40-16 24-40 40-70 40-42 0-76-32-76-76z" fill="none" stroke="url(#metal)" stroke-width="18"/><circle cx="240" cy="244" r="12" fill="#fff" opacity=".6"/>`,
};

for (let i = 0; i < items.length; i += 1) {
  const [key, accent] = items[i];
  const glyph = glyphs[key];
  writeFileSync(join(nftDir, `${key}.svg`), frame(accent, glyph, key.includes('pigeon') ? 'STREET LEGENDS' : 'NFT FLEX', i + 1));
}

const cases = [
  ['bum', '#c2b08b', '#3a4b3d', 'СТАРТ', 'bum'],
  ['night', '#31d5e8', '#0b4e66', '24/7', 'night'],
  ['oligarch', '#ffc93c', '#5e410d', 'ELITE', 'gold'],
  ['neon', '#ed5cff', '#54177d', 'NEON', 'neon'],
  ['crypto', '#55ffd0', '#04756b', 'WHALE', 'crypto'],
  ['legends', '#ff8a3d', '#6f103b', 'MYTHIC', 'legends'],
];

const caseSvg = (accent, dark, label, kind) => {
  const special = {
    bum: `<path d="M150 346l30-30h240l30 30v108H150z" fill="#251f18" stroke="${accent}" stroke-opacity=".4"/><path d="M150 346l30-30h240l30 30" fill="none" stroke="${accent}" stroke-width="3"/><path d="M232 316v138M368 316v138" stroke="${accent}" stroke-opacity=".18" stroke-dasharray="4 10"/>`,
    night: `<g stroke="${accent}" fill="none" opacity=".6"><path d="M154 338h292M154 362h292M154 386h292M154 410h292"/><path d="M186 338v96M234 338v96M282 338v96M330 338v96M378 338v96M426 338v96"/></g><path d="M210 448l30-24 30 24 30-24 30 24 30-24 30 24" stroke="${accent}" stroke-width="3" fill="none"/>`,
    gold: `<path d="M144 438l42-58h228l42 58z" fill="${accent}" opacity=".18"/><g fill="${accent}" opacity=".65"><circle cx="186" cy="436" r="6"/><circle cx="246" cy="436" r="6"/><circle cx="306" cy="436" r="6"/><circle cx="366" cy="436" r="6"/></g><path d="M240 300l18 30 34 8-24 26 4 38-32-18-32 18 4-38-24-26 34-8z" fill="${accent}" opacity=".7"/>`,
    neon: `<g stroke="${accent}" fill="none" opacity=".7"><path d="M156 348h288v92H156z"/><path d="M156 372h288M156 396h288M156 420h288"/></g><path d="M180 448l24-52M300 448l24-52M420 448l-24-52" stroke="${accent}" stroke-width="5" opacity=".8"/>`,
    crypto: `<path d="M238 298l22-38 22 38 42 12-30 30 4 42-38-20-38 20 4-42-30-30z" fill="${accent}" opacity=".8"/><g stroke="${accent}" stroke-opacity=".5" fill="none"><ellipse cx="300" cy="390" rx="120" ry="32"/><ellipse cx="300" cy="390" rx="120" ry="32" transform="rotate(60 300 390)"/><ellipse cx="300" cy="390" rx="120" ry="32" transform="rotate(120 300 390)"/></g>`,
    legends: `<path d="M200 302l18 52 40-36 42 36 18-52 42 30-20 66H178l-20-66z" fill="${accent}" opacity=".8"/><g fill="#fff" opacity=".4"><circle cx="220" cy="420" r="3"/><circle cx="280" cy="400" r="2"/><circle cx="340" cy="430" r="3"/><circle cx="390" cy="392" r="2"/></g>`,
  }[kind];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">
  <defs>
    <radialGradient id="cbg" cx="50%" cy="40%" r="70%"><stop offset="0" stop-color="${dark}"/><stop offset="1" stop-color="#06070c"/></radialGradient>
    <linearGradient id="cg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".3" stop-color="${accent}"/><stop offset="1" stop-color="${dark}"/></linearGradient>
    <filter id="cglow"><feGaussianBlur stdDeviation="12" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="csoft"><feGaussianBlur stdDeviation="25"/></filter>
    <pattern id="cgrid" width="36" height="36" patternUnits="userSpaceOnUse"><path d="M36 0H0v36" fill="none" stroke="#fff" stroke-opacity=".04"/></pattern>
  </defs>
  <rect width="600" height="600" rx="48" fill="url(#cbg)"/><rect width="600" height="600" rx="48" fill="url(#cgrid)"/>
  <ellipse cx="300" cy="330" rx="250" ry="220" fill="${accent}" opacity=".16" filter="url(#csoft)"/>
  <ellipse cx="300" cy="484" rx="180" ry="30" fill="#000" opacity=".5" filter="url(#csoft)"/>
  <g filter="url(#cglow)">
    <path d="M176 260l40-58h168l40 58v182c0 12-10 22-22 22H198c-12 0-22-10-22-22z" fill="#15141d" stroke="url(#cg)" stroke-width="3"/>
    <path d="M176 260h248M300 202v-36" stroke="url(#cg)" stroke-width="4"/>
    <path d="M214 260c0-48 30-76 86-76s86 28 86 76" fill="none" stroke="${accent}" stroke-width="10" opacity=".9"/>
    <circle cx="300" cy="260" r="20" fill="${accent}"/><circle cx="300" cy="260" r="8" fill="#fff" opacity=".8"/>
    <path d="M230 260v202M370 260v202" stroke="${accent}" stroke-opacity=".25" stroke-width="2"/>
    <path d="M176 332h248" stroke="url(#cg)" stroke-width="2" opacity=".8"/>
    <rect x="278" y="314" width="44" height="36" rx="8" fill="${accent}" opacity=".9"/>
    <path d="M290 332h20" stroke="#0a0a10" stroke-width="5" stroke-linecap="round"/>
    ${special}
  </g>
  <path d="M34 184V64a30 30 0 0 1 30-30h120M566 416v120a30 30 0 0 1-30 30H416" fill="none" stroke="${accent}" stroke-opacity=".55" stroke-width="2"/>
  <rect x="18" y="18" width="564" height="564" rx="36" fill="none" stroke="${accent}" stroke-opacity=".3" stroke-width="1.5"/>
  <text x="48" y="548" font-family="Arial, Helvetica, sans-serif" font-size="14" letter-spacing="6" fill="#fff" fill-opacity=".55">${label}</text>
  <text x="552" y="548" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="12" letter-spacing="3" fill="${accent}" fill-opacity=".9">NFT FLEX</text>
</svg>`;
};

for (const [key, accent, dark, label, kind] of cases) {
  writeFileSync(join(caseDir, `${key}.svg`), caseSvg(accent, dark, label, kind));
}

const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#22d3ee"/><stop offset=".5" stop-color="#8b5cf6"/><stop offset="1" stop-color="#ff4d8d"/></linearGradient><filter id="gl"><feGaussianBlur stdDeviation="14" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
<rect width="512" height="512" rx="112" fill="#07080e"/>
<circle cx="256" cy="256" r="160" fill="none" stroke="url(#g)" stroke-width="8" opacity=".4"/>
<g filter="url(#gl)"><path d="M154 340V172l102 62 102-62v168l-102-62z" fill="url(#g)"/><path d="M154 340l102-62 102 62" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="6"/></g>
</svg>`;
writeFileSync(join(root, 'public/icon.svg'), icon);
console.log(`Generated ${items.length} NFT artworks, ${cases.length} cases and icon.`);
