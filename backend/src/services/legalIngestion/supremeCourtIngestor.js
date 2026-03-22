/**
 * Supreme Court Ingestor.
 * Extracts landmark SC case metadata from public sources.
 * Only metadata and summaries are stored — NOT full judgments.
 */

import CaseLaws from '../../models/CaseLaws.js';
import logger from '../../utils/logger.js';
import { normalizeCase } from './normalizer.js';

async function upsertCase(data) {
    const norm = normalizeCase(data);
    if (!norm) {return;}
    await CaseLaws.updateOne(
        { caseTitle: norm.caseTitle, court: norm.court },
        { $set: norm, $setOnInsert: { caseTitle: norm.caseTitle, court: norm.court } },
        { upsert: true }
    );
}

// Extended landmark SC cases beyond the base seed in legalDataService.js
const EXTENDED_SC_CASES = [
    { caseTitle: 'A.K. Gopalan v. State of Madras', court: 'Supreme Court of India', date: new Date('1950-05-19'), judges: ['H.J. Kania', 'Saiyid Fazl Ali', 'Patanjali Sastri'], keywords: ['preventive detention', 'Article 21', 'personal liberty', 'procedure established by law'], summary: 'First major constitutional case on personal liberty. Held that Article 21 only requires a procedure established by law and does not mandate a just, fair procedure — later overruled by Maneka Gandhi v. Union of India (1978).', source: 'Supreme Court of India', sourceLink: 'https://main.sci.gov.in' },
    { caseTitle: 'S.R. Bommai v. Union of India', court: 'Supreme Court of India', date: new Date('1994-03-11'), judges: ['P.B. Sawant', 'Kuldip Singh', 'B.P. Jeevan Reddy'], keywords: ['President\'s Rule', 'Article 356', 'federalism', 'basic structure', 'floor test'], summary: 'Landmark ruling curtailing misuse of Article 356 (President\'s Rule). Secularism and federalism are basic features of the Constitution, and floor test must be held before dismissing a state government.', source: 'Supreme Court of India', sourceLink: 'https://main.sci.gov.in' },
    { caseTitle: 'Oleum Gas Leak Case (M.C. Mehta v. Union of India)', court: 'Supreme Court of India', date: new Date('1987-01-16'), judges: ['P.N. Bhagwati', 'R.S. Pathak', 'G.L. Oza'], keywords: ['absolute liability', 'hazardous enterprise', 'environment', 'tort law', 'compensation'], summary: 'Evolved the "absolute liability" doctrine — enterprises engaged in hazardous activities are absolutely liable for harm caused to workers and people in the vicinity, with no exceptions.', source: 'Supreme Court of India', sourceLink: 'https://main.sci.gov.in' },
    { caseTitle: 'Gian Kaur v. State of Punjab', court: 'Supreme Court of India', date: new Date('1996-03-21'), judges: ['P.B. Sawant', 'B.L. Hansaria', 'S. Saghir Ahmad'], keywords: ['right to die', 'Article 21', 'euthanasia', 'suicide', 'assisted dying'], summary: 'Held that the right to life under Article 21 does not include the right to die. Attempt to commit suicide (Section 309 IPC) is constitutionally valid.', source: 'Supreme Court of India', sourceLink: 'https://main.sci.gov.in' },
    { caseTitle: 'Bachan Singh v. State of Punjab', court: 'Supreme Court of India', date: new Date('1980-05-09'), judges: ['Y.V. Chandrachud', 'A.C. Gupta', 'N.L. Untwalia', 'P.S. Kailasam', 'Syed Murtaza Fazal Ali'], keywords: ['death penalty', 'capital punishment', 'rarest of rare', 'Section 302 IPC', 'sentencing'], summary: 'Upheld the constitutional validity of the death penalty. Laid down the "rarest of rare" doctrine — capital punishment should be imposed only in the most heinous cases where life imprisonment is inadequate.', source: 'Supreme Court of India', sourceLink: 'https://main.sci.gov.in' },
    { caseTitle: 'National Legal Services Authority v. Union of India', court: 'Supreme Court of India', date: new Date('2014-04-15'), judges: ['K.S. Radhakrishnan', 'A.K. Sikri'], keywords: ['transgender rights', 'third gender', 'Article 21', 'identity', 'fundamental rights'], summary: 'Recognised transgender persons as a third gender and held that they have a right to self-identification of their gender. Directed the government to grant them legal recognition.', source: 'Supreme Court of India', sourceLink: 'https://main.sci.gov.in' },
    { caseTitle: 'Common Cause v. Union of India (Living Will)', court: 'Supreme Court of India', date: new Date('2018-03-09'), judges: ['Dipak Misra', 'A.K. Sikri', 'A.M. Khanwilkar', 'D.Y. Chandrachud', 'Ashok Bhushan'], keywords: ['passive euthanasia', 'living will', 'advance directive', 'right to die with dignity', 'Article 21'], summary: 'Upheld the right to die with dignity as a fundamental right under Article 21. Permitted advance directives (living wills) allowing a person to refuse medical treatment in terminal condition.', source: 'Supreme Court of India', sourceLink: 'https://main.sci.gov.in' },
    { caseTitle: 'Lily Thomas v. Union of India', court: 'Supreme Court of India', date: new Date('2013-07-10'), judges: ['A.K. Patnaik', 'S.J. Mukhopadhaya'], keywords: ['disqualification', 'convicted MP', 'Section 8 RPA', 'election law', 'criminal background'], summary: 'Struck down Section 8(4) of the Representation of People Act which allowed sitting MPs/MLAs convicted of serious offences to continue in office. A person convicted of offence with 2+ years sentence is immediately disqualified.', source: 'Supreme Court of India', sourceLink: 'https://main.sci.gov.in' },
    { caseTitle: 'Joseph Shine v. Union of India', court: 'Supreme Court of India', date: new Date('2018-09-27'), judges: ['Dipak Misra', 'R.F. Nariman', 'A.M. Khanwilkar', 'D.Y. Chandrachud', 'Indu Malhotra'], keywords: ['adultery', 'Section 497 IPC', 'unconstitutional', 'gender equality', 'Article 14', 'Article 21'], summary: 'Struck down Section 497 IPC which criminalised adultery as unconstitutional. Held that the provision was based on the patriarchal notion that a woman is the property of her husband.', source: 'Supreme Court of India', sourceLink: 'https://main.sci.gov.in' },
    { caseTitle: 'Puttaswamy v. Union of India (Aadhaar)', court: 'Supreme Court of India', date: new Date('2018-09-26'), judges: ['Dipak Misra', 'A.K. Sikri', 'A.M. Khanwilkar', 'D.Y. Chandrachud', 'Ashok Bhushan'], keywords: ['Aadhaar', 'biometric data', 'privacy', 'proportionality', 'Section 57'], summary: 'Upheld the Aadhaar Act with significant restrictions — held Aadhaar valid for welfare schemes and income tax but struck down Section 57 allowing private entities to use Aadhaar; also struck down mandatory Aadhaar for bank accounts and mobile SIMs.', source: 'Supreme Court of India', sourceLink: 'https://main.sci.gov.in' },
];

export async function ingestSupremeCourt() {
    logger.info('[supremeCourtIngestor] Starting Supreme Court ingestion…');
    let count = 0;
    let errors = 0;

    for (const c of EXTENDED_SC_CASES) {
        try {
            await upsertCase(c);
            count++;
        } catch (err) {
            errors++;
            logger.warn({ err, caseTitle: c.caseTitle }, '[supremeCourtIngestor] Upsert failed');
        }
    }

    logger.info({ count, errors }, '[supremeCourtIngestor] Supreme Court ingestion complete');
    return count;
}
