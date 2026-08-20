import assert from 'node:assert/strict';
import { findHardTextViolations } from './check-i18n.mjs';

const source = `export function Example(){return <button title="Save">Save</button>}`;
const violations = findHardTextViolations(source, 'fixture.tsx');
assert.equal(violations.length, 2);
assert.match(violations[0].text, /Save/);

const translatedSource = `export function Example(){return <button id="save" className="btn" aria-label={t('common.actions.save')}>{t('common.actions.save')}</button>`;
assert.deepEqual(findHardTextViolations(translatedSource, 'fixture.tsx'), []);
console.log('check-i18n tests passed');
