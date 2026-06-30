// Equations.js — Equations module: bank of chemical equations + helpers.
// Game.js consumes Equations via Equations_pickRandom / Equations_buildChoices /
// Equations_formatFormula — see references in Game.js.
const EQUATION_BANK = [
  {
    reactants: [{ f: 'H', sub: '2' }, { f: 'O', sub: '2' }],
    products: [{ f: 'H', sub: '2', tail: 'O' }],
    correct: [2, 1, 2],
    hint: 'Hydrogen + Oxygen → Water'
  },
  {
    reactants: [{ f: 'N', sub: '2' }, { f: 'H', sub: '2' }],
    products: [{ f: 'NH', sub: '3' }],
    correct: [1, 3, 2],
    hint: 'Haber process — making ammonia'
  },
  {
    reactants: [{ f: 'CH', sub: '4' }, { f: 'O', sub: '2' }],
    products: [{ f: 'CO', sub: '2' }, { f: 'H', sub: '2', tail: 'O' }],
    correct: [1, 2, 1, 2],
    hint: 'Methane combustion'
  },
  {
    reactants: [{ f: 'Fe' }, { f: 'O', sub: '2' }],
    products: [{ f: 'Fe', sub: '2', tail: 'O', tailSub: '3' }],
    correct: [4, 3, 2],
    hint: 'Rusting iron'
  },
  {
    reactants: [{ f: 'Na' }, { f: 'Cl', sub: '2' }],
    products: [{ f: 'NaCl' }],
    correct: [2, 1, 2],
    hint: 'Forming table salt'
  },
  {
    reactants: [{ f: 'C', sub: '3', tail: 'H', tailSub: '8' }, { f: 'O', sub: '2' }],
    products: [{ f: 'CO', sub: '2' }, { f: 'H', sub: '2', tail: 'O' }],
    correct: [1, 5, 3, 4],
    hint: 'Propane combustion (BBQ gas!)'
  },
  {
    reactants: [{ f: 'Al' }, { f: 'O', sub: '2' }],
    products: [{ f: 'Al', sub: '2', tail: 'O', tailSub: '3' }],
    correct: [4, 3, 2],
    hint: 'Aluminum oxidation'
  },
  {
    reactants: [{ f: 'KClO', sub: '3' }],
    products: [{ f: 'KCl' }, { f: 'O', sub: '2' }],
    correct: [2, 2, 3],
    hint: 'Decomposing potassium chlorate'
  },
  {
    reactants: [{ f: 'C', sub: '2', tail: 'H', tailSub: '6' }, { f: 'O', sub: '2' }],
    products: [{ f: 'CO', sub: '2' }, { f: 'H', sub: '2', tail: 'O' }],
    correct: [2, 7, 4, 6],
    hint: 'Ethane combustion'
  },
  {
    reactants: [{ f: 'H', sub: '2' }, { f: 'Cl', sub: '2' }],
    products: [{ f: 'HCl' }],
    correct: [1, 1, 2],
    hint: 'Making hydrochloric acid'
  },
  {
    reactants: [{ f: 'Mg' }, { f: 'O', sub: '2' }],
    products: [{ f: 'MgO' }],
    correct: [2, 1, 2],
    hint: 'Burning magnesium ribbon'
  },
  {
    reactants: [{ f: 'P' }, { f: 'O', sub: '2' }],
    products: [{ f: 'P', sub: '2', tail: 'O', tailSub: '5' }],
    correct: [4, 5, 2],
    hint: 'Phosphorus burning in air'
  },
  {
    reactants: [{ f: 'C', sub: '4', tail: 'H', tailSub: '10' }, { f: 'O', sub: '2' }],
    products: [{ f: 'CO', sub: '2' }, { f: 'H', sub: '2', tail: 'O' }],
    correct: [2, 13, 8, 10],
    hint: 'Butane combustion (lighter fuel)'
  },
  {
    reactants: [{ f: 'Zn' }, { f: 'HCl' }],
    products: [{ f: 'ZnCl', sub: '2' }, { f: 'H', sub: '2' }],
    correct: [1, 2, 1, 1],
    hint: 'Zinc reacts with acid'
  },
  {
    reactants: [{ f: 'C', sub: '6', tail: 'H', tailSub: '12', tail2: 'O', tail2Sub: '6' }, { f: 'O', sub: '2' }],
    products: [{ f: 'CO', sub: '2' }, { f: 'H', sub: '2', tail: 'O' }],
    correct: [1, 6, 6, 6],
    hint: 'Glucose burning (cellular respiration)'
  }
];

function Equations_pickRandom(count) {
  const shuffled = EQUATION_BANK.slice().sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function Equations_formatFormula(part) {
  let html = part.f;
  if (part.sub) html += `<sub>${part.sub}</sub>`;
  if (part.tail) html += part.tail;
  if (part.tailSub) html += `<sub>${part.tailSub}</sub>`;
  if (part.tail2) html += part.tail2;
  if (part.tail2Sub) html += `<sub>${part.tail2Sub}</sub>`;
  return html;
}

// Build choice options: 1 correct + 3 distractors (plausible variants).
function Equations_buildChoices(correct) {
  const choices = [correct.slice()];
  const tries = 50;
  let attempts = 0;
  while (choices.length < 4 && attempts < tries) {
    attempts++;
    const variant = correct.map(c => {
      const delta = [-2, -1, 1, 2][Math.floor(Math.random() * 4)];
      return Math.max(1, c + delta);
    });
    // Avoid duplicates
    const key = variant.join(',');
    if (!choices.some(ch => ch.join(',') === key)) {
      choices.push(variant);
    }
  }
  // Fallback if we couldn't find 4 unique
  while (choices.length < 4) {
    choices.push(correct.map(c => c + choices.length));
  }
  // Shuffle
  return choices.sort(() => Math.random() - 0.5);
}
