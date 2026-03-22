/**
 * Legal Data Ingestion Service — Orchestrator.
 *
 * Coordinates all legal data ingestors:
 *  A) IndiaCode ingestor — Acts, sections, regulations
 *  B) Supreme Court ingestor — Landmark SC case metadata
 *  C) eCourts ingestor — High Court and lower court case metadata
 *
 * After ingestion, triggers non-blocking embedding generation for semantic search.
 * Update strategy: upsert — never creates duplicates.
 */

import LegalActs from '../models/LegalActs.js';
import CaseLaws from '../models/CaseLaws.js';
import logger from '../utils/logger.js';
import { ingestIndiaCode } from './legalIngestion/indiaCodeIngestor.js';
import { ingestSupremeCourt } from './legalIngestion/supremeCourtIngestor.js';
import { ingestECourts } from './legalIngestion/ecourtsIngestor.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

// ─── Seed data (initial dataset used when external sources are unavailable) ───

/**
 * Built-in seed acts that are always available regardless of network.
 * These represent the most frequently referenced Indian statutory provisions.
 */
const SEED_ACTS = [
    // Indian Penal Code
    { actName: 'Indian Penal Code, 1860', section: '300', title: 'Murder', description: 'Culpable homicide is murder if the act by which the death is caused is done with the intention of causing death.', keywords: ['murder', 'culpable homicide', 'death', 'killing', 'IPC 300'], source: 'IndiaCode', sourceLink: 'https://www.indiacode.nic.in/bitstream/123456789/2263/1/AAA1860___45.pdf' },
    { actName: 'Indian Penal Code, 1860', section: '302', title: 'Punishment for murder', description: 'Whoever commits murder shall be punished with death, or imprisonment for life, and shall also be liable to fine.', keywords: ['murder', 'death', 'life imprisonment', 'killing', 'IPC 302'], source: 'IndiaCode', sourceLink: 'https://www.indiacode.nic.in/bitstream/123456789/2263/1/AAA1860___45.pdf' },
    { actName: 'Indian Penal Code, 1860', section: '304', title: 'Punishment for culpable homicide not amounting to murder', description: 'Whoever commits culpable homicide not amounting to murder shall be punished with imprisonment for life, or imprisonment of either description for a term which may extend to 10 years.', keywords: ['culpable homicide', 'IPC 304', 'manslaughter', 'death'], source: 'IndiaCode', sourceLink: 'https://www.indiacode.nic.in/bitstream/123456789/2263/1/AAA1860___45.pdf' },
    { actName: 'Indian Penal Code, 1860', section: '307', title: 'Attempt to murder', description: 'Whoever does any act with the intention or knowledge that such act, if carried through, would be likely to cause the death of any person, shall be punished with imprisonment of either description for a term extending to 10 years.', keywords: ['attempt to murder', 'IPC 307', 'shooting', 'grievous hurt'], source: 'IndiaCode', sourceLink: 'https://www.indiacode.nic.in/bitstream/123456789/2263/1/AAA1860___45.pdf' },
    { actName: 'Indian Penal Code, 1860', section: '375', title: 'Rape', description: 'A man is said to commit "rape" if he penetrates without consent or against will, or with or without consent when she is under 18 years of age.', keywords: ['rape', 'sexual assault', 'consent', 'IPC 375'], source: 'IndiaCode', sourceLink: 'https://www.indiacode.nic.in/bitstream/123456789/2263/1/AAA1860___45.pdf' },
    { actName: 'Indian Penal Code, 1860', section: '376', title: 'Punishment for rape', description: 'Whoever commits rape shall be punished with rigorous imprisonment of either description for a term which shall not be less than 10 years.', keywords: ['rape', 'punishment', 'sexual offence', 'IPC 376'], source: 'IndiaCode', sourceLink: 'https://www.indiacode.nic.in/bitstream/123456789/2263/1/AAA1860___45.pdf' },
    { actName: 'Indian Penal Code, 1860', section: '379', title: 'Punishment for theft', description: 'Whoever commits theft shall be punished with imprisonment of either description for a term which may extend to 3 years, or with fine, or with both.', keywords: ['theft', 'stealing', 'property', 'IPC 379'], source: 'IndiaCode', sourceLink: 'https://www.indiacode.nic.in/bitstream/123456789/2263/1/AAA1860___45.pdf' },
    { actName: 'Indian Penal Code, 1860', section: '391', title: 'Dacoity', description: 'When five or more persons conjointly commit or attempt to commit a robbery, every person so committing, attempting or aiding is said to commit dacoity.', keywords: ['dacoity', 'robbery', 'gang', 'IPC 391'], source: 'IndiaCode', sourceLink: 'https://www.indiacode.nic.in/bitstream/123456789/2263/1/AAA1860___45.pdf' },
    { actName: 'Indian Penal Code, 1860', section: '406', title: 'Punishment for criminal breach of trust', description: 'Whoever commits criminal breach of trust shall be punished with imprisonment of either description for a term which may extend to 3 years, or with fine, or with both.', keywords: ['breach of trust', 'cheating', 'property', 'IPC 406'], source: 'IndiaCode', sourceLink: 'https://www.indiacode.nic.in/bitstream/123456789/2263/1/AAA1860___45.pdf' },
    { actName: 'Indian Penal Code, 1860', section: '420', title: 'Cheating and dishonestly inducing delivery of property', description: 'Whoever cheats and thereby dishonestly induces the person deceived to deliver any property to any person, or to make, alter or destroy the whole or any part of a valuable security, shall be punished with imprisonment of either description for a term extending to 7 years.', keywords: ['cheating', 'fraud', 'property', 'dishonestly', 'IPC 420'], source: 'IndiaCode', sourceLink: 'https://www.indiacode.nic.in/bitstream/123456789/2263/1/AAA1860___45.pdf' },
    { actName: 'Indian Penal Code, 1860', section: '498A', title: 'Husband or relative of husband of a woman subjecting her to cruelty', description: 'Whoever, being the husband or a relative of a husband of a woman, subjects her to cruelty shall be punished with imprisonment for a term extending to 3 years and shall also be liable to fine.', keywords: ['cruelty', 'domestic violence', 'husband', 'dowry', 'IPC 498A'], source: 'IndiaCode', sourceLink: 'https://www.indiacode.nic.in/bitstream/123456789/2263/1/AAA1860___45.pdf' },
    // CrPC
    { actName: 'Code of Criminal Procedure, 1973', section: '154', title: 'Information in cognizable cases (FIR)', description: 'Every information relating to the commission of a cognizable offence, if given orally to an officer in charge of a police station, shall be reduced to writing by him or under his direction.', keywords: ['FIR', 'first information report', 'cognizable', 'police', 'CrPC 154'], source: 'IndiaCode', sourceLink: 'https://www.indiacode.nic.in/bitstream/123456789/1362/1/197402.pdf' },
    { actName: 'Code of Criminal Procedure, 1973', section: '161', title: 'Examination of witnesses by police', description: 'Any police officer making an investigation may examine orally any person supposed to be acquainted with the facts and circumstances of the case.', keywords: ['witness', 'examination', 'police', 'investigation', 'CrPC 161'], source: 'IndiaCode', sourceLink: 'https://www.indiacode.nic.in/bitstream/123456789/1362/1/197402.pdf' },
    { actName: 'Code of Criminal Procedure, 1973', section: '164', title: 'Recording of confessions and statements', description: 'Any Metropolitan Magistrate or Judicial Magistrate may record any confession or statement made to him in the course of an investigation under this Chapter.', keywords: ['confession', 'statement', 'magistrate', 'investigation', 'CrPC 164'], source: 'IndiaCode', sourceLink: 'https://www.indiacode.nic.in/bitstream/123456789/1362/1/197402.pdf' },
    { actName: 'Code of Criminal Procedure, 1973', section: '173', title: 'Report of police officer on completion of investigation', description: 'Every investigation under this Chapter shall be completed without unnecessary delay. As soon as it is completed, the officer in charge of the police station shall forward a report.', keywords: ['chargesheet', 'police report', 'investigation', 'CrPC 173'], source: 'IndiaCode', sourceLink: 'https://www.indiacode.nic.in/bitstream/123456789/1362/1/197402.pdf' },
    { actName: 'Code of Criminal Procedure, 1973', section: '437', title: 'When bail may be taken in case of non-bailable offence', description: 'When any person accused of, or suspected of, the commission of any non-bailable offence is arrested or detained without warrant by an officer in charge of a police station, or appears or is brought before a Court, he may be released on bail.', keywords: ['bail', 'non-bailable', 'arrest', 'CrPC 437'], source: 'IndiaCode', sourceLink: 'https://www.indiacode.nic.in/bitstream/123456789/1362/1/197402.pdf' },
    { actName: 'Code of Criminal Procedure, 1973', section: '438', title: 'Direction for grant of bail to person apprehending arrest (Anticipatory Bail)', description: 'When any person has reason to believe that he may be arrested on accusation of having committed a non-bailable offence, he may apply to the High Court or the Court of Session for a direction that in the event of such arrest he shall be released on bail.', keywords: ['anticipatory bail', 'arrest', 'high court', 'CrPC 438'], source: 'IndiaCode', sourceLink: 'https://www.indiacode.nic.in/bitstream/123456789/1362/1/197402.pdf' },
    // Indian Contract Act
    { actName: 'Indian Contract Act, 1872', section: '10', title: 'What agreements are contracts', description: 'All agreements are contracts if they are made by the free consent of parties competent to contract, for a lawful consideration and with a lawful object, and are not hereby expressly declared to be void.', keywords: ['contract', 'agreement', 'consent', 'competent', 'ICA 10'], source: 'IndiaCode', sourceLink: 'https://www.indiacode.nic.in/bitstream/123456789/2187/1/A1872-09.pdf' },
    { actName: 'Indian Contract Act, 1872', section: '73', title: 'Compensation for loss or damage caused by breach of contract', description: 'When a contract has been broken, the party who suffers by such breach is entitled to receive, from the party who has broken it, compensation for any loss or damage caused to him thereby.', keywords: ['breach of contract', 'compensation', 'damages', 'ICA 73'], source: 'IndiaCode', sourceLink: 'https://www.indiacode.nic.in/bitstream/123456789/2187/1/A1872-09.pdf' },
    // Constitution
    { actName: 'Constitution of India, 1950', section: 'Article 21', title: 'Protection of life and personal liberty', description: 'No person shall be deprived of his life or personal liberty except according to procedure established by law.', keywords: ['fundamental right', 'life', 'liberty', 'Article 21', 'constitutional right'], source: 'IndiaCode', sourceLink: 'https://www.indiacode.nic.in/handle/123456789/1104' },
    { actName: 'Constitution of India, 1950', section: 'Article 14', title: 'Equality before law', description: 'The State shall not deny to any person equality before the law or the equal protection of the laws within the territory of India.', keywords: ['equality', 'equal protection', 'discrimination', 'Article 14'], source: 'IndiaCode', sourceLink: 'https://www.indiacode.nic.in/handle/123456789/1104' },
    { actName: 'Constitution of India, 1950', section: 'Article 19', title: 'Protection of certain rights regarding freedom of speech etc.', description: 'All citizens shall have the right to freedom of speech and expression; to assemble peaceably without arms; to form associations or unions; to move freely throughout India; to reside and settle in any part of India; to practise any profession, or to carry on any occupation, trade or business.', keywords: ['freedom of speech', 'fundamental rights', 'expression', 'Article 19'], source: 'IndiaCode', sourceLink: 'https://www.indiacode.nic.in/handle/123456789/1104' },
    // POCSO Act
    { actName: 'Protection of Children from Sexual Offences Act, 2012', section: '4', title: 'Punishment for penetrative sexual assault', description: 'Whoever commits penetrative sexual assault shall be punished with rigorous imprisonment for a term which shall not be less than 10 years but extending to imprisonment for life, and shall also be liable to fine.', keywords: ['POCSO', 'child abuse', 'sexual assault', 'minor', 'POCSO 4'], source: 'IndiaCode', sourceLink: 'https://www.indiacode.nic.in/bitstream/123456789/2079/1/A2012-32.pdf' },
    // IT Act
    { actName: 'Information Technology Act, 2000', section: '66', title: 'Computer related offences', description: 'If any person, dishonestly or fraudulently, does any act referred to in section 43, he shall be punishable with imprisonment for a term which may extend to 3 years or with fine which may extend to five lakh rupees or with both.', keywords: ['cyber crime', 'hacking', 'computer', 'IT Act 66', 'digital offence'], source: 'IndiaCode', sourceLink: 'https://www.indiacode.nic.in/bitstream/123456789/1999/3/A2000-21.pdf' },
    { actName: 'Information Technology Act, 2000', section: '66A', title: 'Punishment for sending offensive messages', description: '(Struck down by Supreme Court in Shreya Singhal v. Union of India, 2015) — Previously punished sending offensive electronic communications.', keywords: ['offensive messages', 'social media', 'IT Act 66A', 'struck down', 'Shreya Singhal'], source: 'IndiaCode', sourceLink: 'https://www.indiacode.nic.in/bitstream/123456789/1999/3/A2000-21.pdf' },
];

/**
 * Built-in seed case laws – landmark Indian Supreme Court and High Court decisions.
 */
const SEED_CASES = [
    { caseTitle: 'Kesavananda Bharati v. State of Kerala', court: 'Supreme Court of India', date: new Date('1973-04-24'), judges: ['S.M. Sikri', 'A.N. Ray', 'D.G. Palekar'], keywords: ['constitution', 'basic structure', 'fundamental rights', 'amendment'], summary: 'Landmark 13-judge bench ruling establishing the "basic structure" doctrine — Parliament cannot amend the Constitution in a manner that destroys its basic structure, such as supremacy of the Constitution, rule of law, judicial review, and separation of powers.', source: 'Supreme Court of India', sourceLink: 'https://main.sci.gov.in' },
    { caseTitle: 'Maneka Gandhi v. Union of India', court: 'Supreme Court of India', date: new Date('1978-01-25'), judges: ['M.H. Beg', 'Y.V. Chandrachud', 'P.N. Bhagwati'], keywords: ['Article 21', 'personal liberty', 'passport', 'natural justice'], summary: 'Expanded the scope of Article 21 — the right to life and personal liberty is not merely a procedural right; the procedure established by law must also be fair, just, and reasonable.', source: 'Supreme Court of India', sourceLink: 'https://main.sci.gov.in' },
    { caseTitle: 'Vishaka v. State of Rajasthan', court: 'Supreme Court of India', date: new Date('1997-08-13'), judges: ['J.S. Verma', 'Sujata V. Manohar', 'B.N. Kirpal'], keywords: ['sexual harassment', 'workplace', 'women rights', 'guidelines', 'POSH'], summary: 'Landmark judgment laying down the Vishaka Guidelines for prevention of sexual harassment of women at workplace, later codified into the POSH Act 2013.', source: 'Supreme Court of India', sourceLink: 'https://main.sci.gov.in' },
    { caseTitle: 'Shreya Singhal v. Union of India', court: 'Supreme Court of India', date: new Date('2015-03-24'), judges: ['J. Chelameswar', 'R.F. Nariman'], keywords: ['Section 66A', 'IT Act', 'freedom of speech', 'internet', 'unconstitutional'], summary: 'Struck down Section 66A of the IT Act as unconstitutional, holding that it violated the right to freedom of speech and expression under Article 19(1)(a) of the Constitution.', source: 'Supreme Court of India', sourceLink: 'https://main.sci.gov.in' },
    { caseTitle: 'Justice K.S. Puttaswamy v. Union of India', court: 'Supreme Court of India', date: new Date('2017-08-24'), judges: ['D.Y. Chandrachud', 'J.S. Khehar', 'J. Chelameswar'], keywords: ['right to privacy', 'fundamental right', 'Aadhaar', 'Article 21', 'data protection'], summary: '9-judge bench unanimously held that the right to privacy is a fundamental right protected under the Indian Constitution, forming an intrinsic part of the right to life and personal liberty under Article 21.', source: 'Supreme Court of India', sourceLink: 'https://main.sci.gov.in' },
    { caseTitle: 'Navtej Singh Johar v. Union of India', court: 'Supreme Court of India', date: new Date('2018-09-06'), judges: ['Dipak Misra', 'A.M. Khanwilkar', 'D.Y. Chandrachud', 'Indu Malhotra', 'R.F. Nariman'], keywords: ['Section 377', 'homosexuality', 'LGBT rights', 'decriminalisation', 'fundamental rights'], summary: 'Decriminalised consensual same-sex relations between adults by reading down Section 377 IPC to exclude consensual sex between adults of the same gender.', source: 'Supreme Court of India', sourceLink: 'https://main.sci.gov.in' },
    { caseTitle: 'Arnab Manoranjan Goswami v. State of Maharashtra', court: 'Supreme Court of India', date: new Date('2020-11-11'), judges: ['D.Y. Chandrachud', 'Indira Banerjee'], keywords: ['bail', 'personal liberty', 'Article 21', 'freedom of press', 'media'], summary: 'Reinforced that courts must be sensitive to the need to protect personal liberty; an individual cannot be deprived of liberty except according to fair procedure established by law.', source: 'Supreme Court of India', sourceLink: 'https://main.sci.gov.in' },
    { caseTitle: 'State of Maharashtra v. Madhukar Narayan Mardikar', court: 'Supreme Court of India', date: new Date('1991-02-01'), judges: ['K.N. Singh', 'R.M. Sahai'], keywords: ['sexual assault', 'woman', 'character evidence', 'privacy', 'evidence'], summary: 'Held that even a woman of easy virtue is entitled to privacy and her evidence cannot be discarded merely because of her sexual history — every woman has a right to her privacy.', source: 'Supreme Court of India', sourceLink: 'https://main.sci.gov.in' },
    { caseTitle: 'Indira Gandhi v. Raj Narain', court: 'Supreme Court of India', date: new Date('1975-11-07'), judges: ['A.N. Ray', 'H.R. Khanna', 'K.K. Mathew', 'M.H. Beg', 'Y.V. Chandrachud'], keywords: ['election law', 'basic structure', 'democracy', 'free and fair elections', 'emergency'], summary: 'Held that free and fair elections are part of the basic structure of the Constitution; dismissed Indira Gandhi\'s appeal against Allahabad HC ruling setting aside her election.', source: 'Supreme Court of India', sourceLink: 'https://main.sci.gov.in' },
    { caseTitle: 'D.K. Basu v. State of West Bengal', court: 'Supreme Court of India', date: new Date('1997-12-18'), judges: ['A.S. Anand', 'Faizanuddin'], keywords: ['custodial death', 'arrest', 'police', 'human rights', 'detention guidelines'], summary: 'Issued comprehensive guidelines to be mandatorily followed in all cases of arrest and detention to prevent custodial deaths and torture — these guidelines were later incorporated into CrPC.', source: 'Supreme Court of India', sourceLink: 'https://main.sci.gov.in' },
    { caseTitle: 'Mohd. Ahmed Khan v. Shah Bano Begum', court: 'Supreme Court of India', date: new Date('1985-04-23'), judges: ['Y.V. Chandrachud', 'D.A. Desai', 'O. Chinnappa Reddy', 'E.S. Venkataramaiah', 'Ranganath Misra'], keywords: ['Muslim personal law', 'maintenance', 'Section 125 CrPC', 'divorce', 'secular law'], summary: 'Held that a Muslim divorced woman is entitled to claim maintenance under Section 125 of CrPC (secular law), overriding personal law — sparked nationwide debate on uniform civil code.', source: 'Supreme Court of India', sourceLink: 'https://main.sci.gov.in' },
    { caseTitle: 'Aruna Shanbaug v. Union of India', court: 'Supreme Court of India', date: new Date('2011-03-07'), judges: ['Markandey Katju', 'Gyan Sudha Misra'], keywords: ['euthanasia', 'passive euthanasia', 'right to die', 'living will', 'Article 21'], summary: 'Permitted passive euthanasia under strict guidelines in India. Held that passive euthanasia (withdrawal of life support) can be allowed with permission of the High Court.', source: 'Supreme Court of India', sourceLink: 'https://main.sci.gov.in' },
];

// ─── Upsert Helpers ───────────────────────────────────────────────────────────

/**
 * Upsert a legal act record — updates if it already exists, inserts otherwise.
 */
async function upsertAct(data) {
    const filter = { actName: data.actName, section: data.section };
    const update = {
        $set: {
            title: data.title,
            description: data.description,
            keywords: data.keywords || [],
            source: data.source || 'IndiaCode',
            sourceLink: data.sourceLink || '',
            lastUpdated: new Date(),
        },
        $setOnInsert: { actName: data.actName, section: data.section },
    };
    await LegalActs.updateOne(filter, update, { upsert: true });
}

/**
 * Upsert a case law record — updates if it already exists, inserts otherwise.
 */
async function upsertCase(data) {
    const filter = { caseTitle: data.caseTitle, court: data.court };
    const update = {
        $set: {
            date: data.date,
            judges: data.judges || [],
            keywords: data.keywords || [],
            summary: data.summary,
            source: data.source || 'eCourts',
            sourceLink: data.sourceLink || '',
            lastUpdated: new Date(),
        },
        $setOnInsert: { caseTitle: data.caseTitle, court: data.court },
    };
    await CaseLaws.updateOne(filter, update, { upsert: true });
}

// ─── Public ingestion functions ───────────────────────────────────────────────

/**
 * Update legal acts from the built-in seed dataset and optionally from IndiaCode
 * public XML/JSON feeds (rate-limited, best-effort).
 */
export async function updateLegalActs() {
    logger.info('Legal data ingestion: updating acts…');
    let count = 0;

    // 1. Seed built-in acts first — always available
    for (const act of SEED_ACTS) {
        try {
            await upsertAct(act);
            count++;
        } catch (err) {
            logger.warn({ err, actName: act.actName, section: act.section }, 'Failed to upsert seed act');
        }
    }

    // 2. Run IndiaCode ingestor (extended dataset + best-effort RSS)
    try {
        const extra = await ingestIndiaCode();
        count += extra;
    } catch (err) {
        logger.warn({ err }, 'IndiaCode ingestor failed (non-fatal)');
    }

    logger.info({ count }, 'Legal acts update complete');
    return count;
}

/**
 * Update case laws from the built-in seed dataset and optionally from eCourts
 * public data feeds (rate-limited, best-effort).
 */
export async function updateCaseLaws() {
    logger.info('Legal data ingestion: updating case laws…');
    let count = 0;

    // 1. Seed built-in landmark cases — always available
    for (const caseLaw of SEED_CASES) {
        try {
            await upsertCase(caseLaw);
            count++;
        } catch (err) {
            logger.warn({ err, caseTitle: caseLaw.caseTitle }, 'Failed to upsert seed case');
        }
    }

    // 2. Run Supreme Court ingestor (extended landmark cases)
    try {
        const scExtra = await ingestSupremeCourt();
        count += scExtra;
    } catch (err) {
        logger.warn({ err }, 'Supreme Court ingestor failed (non-fatal)');
    }

    // 3. Run eCourts ingestor (High Court + notable cases)
    try {
        const ecExtra = await ingestECourts();
        count += ecExtra;
    } catch (err) {
        logger.warn({ err }, 'eCourts ingestor failed (non-fatal)');
    }

    logger.info({ count }, 'Case laws update complete');
    return count;
}

/**
 * Run a full data refresh: acts + cases.
 * Called from the cron job and can also be called manually.
 */
export async function runFullRefresh() {
    logger.info('Legal data: running full refresh');
    const [actsResult, casesResult] = await Promise.allSettled([
        updateLegalActs(),
        updateCaseLaws(),
    ]);
    logger.info({
        acts: actsResult.status === 'fulfilled' ? actsResult.value : 'error',
        cases: casesResult.status === 'fulfilled' ? casesResult.value : 'error',
    }, 'Legal data full refresh complete');

    // Trigger semantic embedding generation asynchronously (non-blocking)
    import('../services/semanticSearch/vectorStore.js')
        .then(({ generateAndStoreEmbeddings }) => generateAndStoreEmbeddings())
        .catch(err => logger.warn({ err }, 'Embedding generation failed (non-fatal)'));
}
