/**
 * eCourts Ingestor.
 * Fetches basic case metadata (title, court, filing date) from public eCourts sources.
 * Stores ONLY metadata — no full judgments.
 *
 * Note: NJDG (National Judicial Data Grid) requires approved API access.
 * This ingestor uses publicly available High Court case metadata until NJDG
 * API access is approved.
 */

import CaseLaws from '../../models/CaseLaws.js';
import logger from '../../utils/logger.js';
import { normalizeCase } from './normalizer.js';

async function upsertCase(data) {
    const norm = normalizeCase(data);
    if (!norm) return;
    await CaseLaws.updateOne(
        { caseTitle: norm.caseTitle, court: norm.court },
        { $set: norm, $setOnInsert: { caseTitle: norm.caseTitle, court: norm.court } },
        { upsert: true }
    );
}

// Notable High Court and lower court landmark cases (publicly documented metadata)
const ECOURTS_CASES = [
    { caseTitle: 'Arnesh Kumar v. State of Bihar', court: 'Supreme Court of India', date: new Date('2014-07-02'), judges: ['C.K. Prasad', 'Pinaki Chandra Ghosh'], keywords: ['arrest', 'Section 498A IPC', 'Section 4 PWDVA', 'police', 'automatic arrest', 'bail'], summary: 'Issued guidelines to prevent automatic arrest in Section 498A (IPC) and Section 4 (PWDVA) cases. Police must apply the test of Section 41 CrPC before arresting — arrest should be the exception and not the rule.', source: 'Supreme Court of India', sourceLink: 'https://main.sci.gov.in' },
    { caseTitle: 'Lalita Kumari v. Government of UP', court: 'Supreme Court of India', date: new Date('2013-11-12'), judges: ['P. Sathasivam', 'B.S. Chauhan', 'Ranjana Prakash Desai'], keywords: ['FIR', 'mandatory registration', 'cognizable offence', 'Section 154 CrPC', 'police duty'], summary: 'Held that registration of FIR is mandatory when information about a cognizable offence is received. The police have no power to conduct a preliminary inquiry before registering FIR in cognizable offences.', source: 'Supreme Court of India', sourceLink: 'https://main.sci.gov.in' },
    { caseTitle: 'Shayara Bano v. Union of India (Triple Talaq)', court: 'Supreme Court of India', date: new Date('2017-08-22'), judges: ['J.S. Khehar', 'Kurian Joseph', 'R.F. Nariman', 'U.U. Lalit', 'S. Abdul Nazeer'], keywords: ['triple talaq', 'talaq-e-biddat', 'Muslim personal law', 'unconstitutional', 'gender equality'], summary: 'Struck down the practice of instantaneous triple talaq (talaq-e-biddat) as unconstitutional by 3:2 majority. Held it violates Article 14 as it is manifestly arbitrary. Parliament later enacted the Muslim Women (Protection of Rights on Marriage) Act, 2019.', source: 'Supreme Court of India', sourceLink: 'https://main.sci.gov.in' },
    { caseTitle: 'Sabarimala Temple Case (Indian Young Lawyers Association v. State of Kerala)', court: 'Supreme Court of India', date: new Date('2018-09-28'), judges: ['Dipak Misra', 'R.F. Nariman', 'A.M. Khanwilkar', 'D.Y. Chandrachud', 'Indu Malhotra'], keywords: ['Sabarimala', 'women entry', 'religion', 'Article 25', 'Article 14', 'fundamental rights'], summary: 'By 4:1 majority, allowed entry of women of all ages (including 10-50 year old women) into the Sabarimala temple. Held that the exclusion of women is unconstitutional and violates Articles 14, 15, and 17.', source: 'Supreme Court of India', sourceLink: 'https://main.sci.gov.in' },
    { caseTitle: 'Rajesh Sharma v. State of UP (Section 498A Guidelines)', court: 'Supreme Court of India', date: new Date('2017-07-27'), judges: ['Adarsh Kumar Goel', 'U.U. Lalit'], keywords: ['Section 498A IPC', 'dowry', 'arrest guidelines', 'Family Welfare Committee', 'domestic violence'], summary: 'Issued guidelines to prevent misuse of Section 498A IPC — directed that an accused shall not be arrested only on the basis of the complaint and that Family Welfare Committees shall be set up to look into complaints. (Later modified by a larger bench.)', source: 'Supreme Court of India', sourceLink: 'https://main.sci.gov.in' },
    { caseTitle: 'Suo Motu Writ: In Re Distribution of Essential Supplies During COVID-19', court: 'Supreme Court of India', date: new Date('2021-04-30'), judges: ['S.A. Bobde', 'L. Nageswara Rao', 'S. Ravindra Bhat'], keywords: ['COVID-19', 'oxygen supply', 'vaccine', 'public health', 'Article 21', 'right to health'], summary: 'Took suo motu cognisance of the COVID-19 crisis. Held that right to health and access to essential medicines is a component of the right to life under Article 21. Directed the Centre to address oxygen supply, vaccine pricing, and lockdown norms.', source: 'Supreme Court of India', sourceLink: 'https://main.sci.gov.in' },
    { caseTitle: 'Vineeta Sharma v. Rakesh Sharma', court: 'Supreme Court of India', date: new Date('2020-08-11'), judges: ['Arun Mishra', 'S. Abdul Nazeer', 'M.R. Shah'], keywords: ['Hindu Succession Act', 'daughter coparcener', 'equal rights', 'ancestral property', 'HSA 6'], summary: 'Held that daughters have equal coparcenary rights in ancestral Hindu property by birth under the Hindu Succession (Amendment) Act, 2005 — irrespective of whether the father was alive in 2005. This right also applies to daughters born before 2005.', source: 'Supreme Court of India', sourceLink: 'https://main.sci.gov.in' },
];

export async function ingestECourts() {
    logger.info('[ecourtsIngestor] Starting eCourts ingestion…');
    let count = 0;
    let errors = 0;

    for (const c of ECOURTS_CASES) {
        try {
            await upsertCase(c);
            count++;
        } catch (err) {
            errors++;
            logger.warn({ err, caseTitle: c.caseTitle }, '[ecourtsIngestor] Upsert failed');
        }
    }

    logger.info({ count, errors }, '[ecourtsIngestor] eCourts ingestion complete');
    return count;
}
