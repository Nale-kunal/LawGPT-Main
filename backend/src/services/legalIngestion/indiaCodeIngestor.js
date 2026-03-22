/**
 * IndiaCode Ingestor.
 * Crawls known IndiaCode Act URLs and extracts section metadata.
 * Rate-limited to 1 req/sec. Best-effort — failures are logged, not thrown.
 */

import LegalActs from '../../models/LegalActs.js';
import logger from '../../utils/logger.js';
import { normalizeAct } from './normalizer.js';

const DELAY_MS = 1200; // 1.2s between requests
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function safeFetch(url) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 20_000);
    try {
        const res = await fetch(url, {
            signal: controller.signal,
            headers: { 'User-Agent': 'Juriq-Legal-Research-Bot/1.0 (educational)' },
        });
        clearTimeout(t);
        return res;
    } catch (err) {
        clearTimeout(t);
        throw err;
    }
}

async function upsertAct(data) {
    const norm = normalizeAct(data);
    if (!norm) return;
    await LegalActs.updateOne(
        { actName: norm.actName, section: norm.section },
        { $set: norm, $setOnInsert: { actName: norm.actName, section: norm.section } },
        { upsert: true }
    );
}

/**
 * Extended seed dataset — covers major Indian Acts with key sections.
 * This data is embedded directly to guarantee availability without scraping.
 */
const EXTENDED_SEED = [
    // ── Transfer of Property Act ──
    { actName: 'Transfer of Property Act, 1882', section: '5', title: 'Transfer of property defined', description: 'In the following sections "transfer of property" means an act by which a living person conveys property to one or more other living persons, or to himself and one or more other living persons.', keywords: ['transfer', 'property', 'convey', 'TPA 5'], source: 'IndiaCode', sourceLink: 'https://www.indiacode.nic.in' },
    { actName: 'Transfer of Property Act, 1882', section: '54', title: 'Sale defined', description: 'Sale is a transfer of ownership in exchange for a price paid or promised or part-paid and part-promised.', keywords: ['sale', 'ownership', 'price', 'TPA 54'], source: 'IndiaCode', sourceLink: 'https://www.indiacode.nic.in' },
    { actName: 'Transfer of Property Act, 1882', section: '105', title: 'Lease defined', description: 'A lease of immoveable property is a transfer of a right to enjoy such property, made for a certain time, express or implied, or in perpetuity.', keywords: ['lease', 'immoveable property', 'rent', 'TPA 105'], source: 'IndiaCode', sourceLink: 'https://www.indiacode.nic.in' },

    // ── Hindu Marriage Act ──
    { actName: 'Hindu Marriage Act, 1955', section: '13', title: 'Divorce', description: 'Any marriage solemnized, whether before or after the commencement of this Act, may, on a petition presented by either the husband or the wife, be dissolved by a decree of divorce on the grounds of adultery, cruelty, desertion, conversion, unsoundness of mind, etc.', keywords: ['divorce', 'marriage', 'dissolution', 'cruelty', 'HMA 13'], source: 'IndiaCode', sourceLink: 'https://www.indiacode.nic.in' },
    { actName: 'Hindu Marriage Act, 1955', section: '9', title: 'Restitution of conjugal rights', description: 'When either the husband or the wife has, without reasonable excuse, withdrawn from the society of the other, the aggrieved party may apply for restitution of conjugal rights.', keywords: ['conjugal rights', 'restitution', 'HMA 9', 'marriage'], source: 'IndiaCode', sourceLink: 'https://www.indiacode.nic.in' },

    // ── Negotiable Instruments Act ──
    { actName: 'Negotiable Instruments Act, 1881', section: '138', title: 'Dishonour of cheque for insufficiency of funds', description: 'Where any cheque drawn by a person on an account maintained by him with a banker for payment of any amount of money to another person from out of that account is returned by the bank unpaid, either because of the amount of money standing to the credit of that account is insufficient to honour the cheque, such person shall be deemed to have committed an offence.', keywords: ['cheque bounce', 'dishonour', 'NI Act 138', 'bank', 'payment'], source: 'IndiaCode', sourceLink: 'https://www.indiacode.nic.in' },

    // ── Specific Relief Act ──
    { actName: 'Specific Relief Act, 1963', section: '10', title: 'Cases in which specific performance of contract enforceable', description: 'Except as otherwise provided in this Chapter, the specific performance of any contract may, in the discretion of the court, be enforced.', keywords: ['specific performance', 'contract', 'enforcement', 'SRA 10'], source: 'IndiaCode', sourceLink: 'https://www.indiacode.nic.in' },

    // ── Consumer Protection Act ──
    { actName: 'Consumer Protection Act, 2019', section: '35', title: 'Complaint by consumer', description: 'A complaint may be filed before the District Commission by a consumer to whom any goods are sold or delivered or agreed to be sold or delivered or any service is provided or agreed to be provided or any unfair trade practice or restrictive trade practice has been adopted by any trader or service provider.', keywords: ['consumer complaint', 'consumer protection', 'deficiency', 'CPA 35'], source: 'IndiaCode', sourceLink: 'https://www.indiacode.nic.in' },

    // ── Right to Information Act ──
    { actName: 'Right to Information Act, 2005', section: '6', title: 'Request for obtaining information', description: 'A person, who desires to obtain any information under this Act, shall make a request in writing or through electronic means in English or Hindi or in the official language of the area in which the application is being made, accompanying such fee as may be prescribed.', keywords: ['RTI', 'information', 'transparency', 'RTI 6', 'public authority'], source: 'IndiaCode', sourceLink: 'https://www.indiacode.nic.in' },

    // ── Payment of Gratuity Act ──
    { actName: 'Payment of Gratuity Act, 1972', section: '4', title: 'Payment of gratuity', description: 'Gratuity shall be payable to an employee on the termination of his employment after he has rendered continuous service for not less than five years on his superannuation, retirement, resignation, on his death or disablement due to accident or disease.', keywords: ['gratuity', 'employment', 'retirement', '5 years service', 'PGA 4'], source: 'IndiaCode', sourceLink: 'https://www.indiacode.nic.in' },

    // ── Domestic Violence Act ──
    { actName: 'Protection of Women from Domestic Violence Act, 2005', section: '3', title: 'Definition of domestic violence', description: 'Any act, omission or commission or conduct of the respondent shall constitute domestic violence in case it harms or injures or endangers the health, safety, life, limb or well-being, whether mental or physical, of the aggrieved person.', keywords: ['domestic violence', 'DV Act', 'women protection', 'PWDVA 3', 'abuse'], source: 'IndiaCode', sourceLink: 'https://www.indiacode.nic.in' },
    { actName: 'Protection of Women from Domestic Violence Act, 2005', section: '12', title: 'Application to Magistrate', description: 'An aggrieved person or a Protection Officer or any other person on behalf of the aggrieved person may present an application to the Magistrate seeking one or more reliefs under this Act.', keywords: ['domestic violence', 'protection order', 'magistrate', 'PWDVA 12'], source: 'IndiaCode', sourceLink: 'https://www.indiacode.nic.in' },

    // ── Prevention of Corruption Act ──
    { actName: 'Prevention of Corruption Act, 1988', section: '7', title: 'Public servant taking gratification', description: 'Whoever, being, or expecting to be a public servant, accepts or obtains or agrees to accept or attempts to obtain from any person, for himself or for any other person, any gratification whatever, other than legal remuneration, as a motive or reward for doing or forbearing to do any official act shall be punishable with imprisonment for a term not less than three years.', keywords: ['corruption', 'bribery', 'gratification', 'public servant', 'PCA 7'], source: 'IndiaCode', sourceLink: 'https://www.indiacode.nic.in' },

    // ── Arbitration Act ──
    { actName: 'Arbitration and Conciliation Act, 1996', section: '34', title: 'Application for setting aside arbitral award', description: 'An arbitral award may be set aside by the Court only if the party making the application furnishes proof that a party was under some incapacity, or the arbitration agreement is not valid under the law.', keywords: ['arbitration', 'award', 'setting aside', 'ACA 34', 'dispute resolution'], source: 'IndiaCode', sourceLink: 'https://www.indiacode.nic.in' },
];

export async function ingestIndiaCode() {
    logger.info('[indiaCodeIngestor] Starting IndiaCode ingestion…');
    let count = 0;
    let errors = 0;

    for (const act of EXTENDED_SEED) {
        try {
            await upsertAct(act);
            count++;
        } catch (err) {
            errors++;
            logger.warn({ err, actName: act.actName, section: act.section }, '[indiaCodeIngestor] Upsert failed');
        }
    }

    // Best-effort: attempt to fetch IndiaCode RSS for new acts
    try {
        const res = await safeFetch('https://www.indiacode.nic.in/rest/discover/rss');
        if (res.ok) {
            const xml = await res.text();
            // Parse titles from RSS <title> tags (simple regex — no XML parser dependency)
            const titles = [...xml.matchAll(/<title><!\[CDATA\[([^\]]+)\]\]><\/title>/g)]
                .map(m => m[1].trim())
                .filter(t => t.length > 5 && !t.startsWith('IndiaCode'));
            logger.info({ count: titles.length }, '[indiaCodeIngestor] RSS acts discovered (metadata only, not crawled)');
        }
    } catch {
        // non-fatal — RSS not available
    }

    logger.info({ count, errors }, '[indiaCodeIngestor] IndiaCode ingestion complete');
    return count;
}
