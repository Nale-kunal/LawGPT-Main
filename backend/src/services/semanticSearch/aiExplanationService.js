/**
 * AI Legal Explanation Service.
 *
 * Generates a structured, plain-language explanation of a legal provision or case.
 * Runs entirely locally — no external API required.
 * Can be upgraded to use an LLM by replacing the buildExplanation function.
 */

/**
 * Build a rich explanation for a legal act/section.
 * @param {object} item
 * @returns {string}
 */
function explainAct(item) {
    const parts = [];

    parts.push(`📜 **${item.title}**`);
    if (item.subtitle) {parts.push(`_${item.subtitle}_`);}
    parts.push('');

    parts.push('**What it means:**');
    parts.push(item.description || '');
    parts.push('');

    // Real-world usage examples based on keywords
    const kw = (item.keywords || []).map(k => k.toLowerCase()).join(' ');
    const usageHints = [];
    if (kw.includes('murder') || kw.includes('homicide')) {usageHints.push('Criminal prosecution for causing death');}
    if (kw.includes('theft') || kw.includes('stealing')) {usageHints.push('Filing an FIR for stolen property');}
    if (kw.includes('bail') || kw.includes('arrest')) {usageHints.push('Seeking bail/anticipatory bail in criminal proceedings');}
    if (kw.includes('contract') || kw.includes('agreement')) {usageHints.push('Enforcing or contesting a commercial contract');}
    if (kw.includes('rape') || kw.includes('sexual')) {usageHints.push('Prosecution for sexual offences; survivor protection measures');}
    if (kw.includes('domestic') || kw.includes('cruelty') || kw.includes('dowry')) {usageHints.push('Protection orders and maintenance in domestic violence cases');}
    if (kw.includes('cheque') || kw.includes('dishonour')) {usageHints.push('Criminal complaint for cheque bounce (Section 138 NI Act proceedings)');}
    if (kw.includes('fundamental') || kw.includes('constitutional') || kw.includes('article 21')) {usageHints.push('Challenging state actions in High Court or Supreme Court via writ petition');}
    if (kw.includes('fir') || kw.includes('cognizable')) {usageHints.push('Registering a First Information Report with the police');}
    if (kw.includes('cyber') || kw.includes('hacking') || kw.includes('internet')) {usageHints.push('Filing cyber crime complaints with the Cyber Crime Cell');}

    if (usageHints.length) {
        parts.push('**Real-world application:**');
        usageHints.forEach(h => parts.push(`• ${h}`));
        parts.push('');
    }

    // Related legal provisions
    const related = [];
    if (kw.includes('murder')) {related.push('IPC Section 300, 304 (Culpable Homicide), 307 (Attempt to murder)');}
    if (kw.includes('bail')) {related.push('CrPC Section 436 (Bailable offences), 437, 438, 439');}
    if (kw.includes('fir')) {related.push('CrPC Section 161 (Witness examination), 173 (Chargesheet)');}
    if (kw.includes('contract')) {related.push('Indian Contract Act Sections 14 (Free Consent), 73 (Breach compensation)');}
    if (kw.includes('domestic violence')) {related.push('PWDVA Section 12 (Application to Magistrate), IPC Section 498A');}

    if (related.length) {
        parts.push('**Related provisions:**');
        related.forEach(r => parts.push(`• ${r}`));
    }

    return parts.join('\n').trim();
}

/**
 * Build a rich explanation for a case law result.
 * @param {object} item
 * @returns {string}
 */
function explainCase(item) {
    const parts = [];

    parts.push(`⚖️ **${item.title}**`);
    parts.push(`_${item.subtitle || 'Supreme Court of India'}_`);
    if (item.date) {
        const d = new Date(item.date);
        if (!isNaN(d.getTime())) {parts.push(`_Decided: ${d.toDateString()}_`);}
    }
    parts.push('');

    parts.push('**What was decided:**');
    parts.push(item.description || item.summary || '');
    parts.push('');

    parts.push('**Why it matters:**');
    const kw = (item.keywords || []).map(k => k.toLowerCase()).join(' ');
    const significance = [];
    if (kw.includes('basic structure')) {significance.push('Established constitutional limits on Parliament\'s power to amend the Constitution');}
    if (kw.includes('article 21') || kw.includes('personal liberty')) {significance.push('Expanded the right to life and personal liberty under the Constitution');}
    if (kw.includes('fundamental rights')) {significance.push('Strengthened fundamental rights guaranteed to every citizen');}
    if (kw.includes('unconstitutional')) {significance.push('Struck down legislation that violated constitutional guarantees');}
    if (kw.includes('environment') || kw.includes('absolute liability')) {significance.push('Set binding standards for corporate liability for environmental harm');}
    if (kw.includes('women') || kw.includes('gender') || kw.includes('equality')) {significance.push('Advanced gender equality and women\'s rights under Indian law');}
    if (kw.includes('privacy')) {significance.push('Recognised privacy as an enforceable fundamental right under Article 21');}

    if (significance.length) {significance.forEach(s => parts.push(`• ${s}`));}
    else {parts.push('• Landmark precedent in Indian constitutional and criminal law');}

    if (item.judges && item.judges.length) {
        parts.push('');
        parts.push(`**Bench:** ${item.judges.join(', ')}`);
    }

    return parts.join('\n').trim();
}

/**
 * Generate an AI-style explanation for any legal result.
 *
 * @param {object} item — LegalResult shape (type, title, subtitle, description, keywords, etc.)
 * @returns {string} Formatted plain-text explanation
 */
export function explainLegalResult(item) {
    if (!item) {return 'No information available.';}
    if (item.type === 'case') {return explainCase(item);}
    return explainAct(item); // 'act' or 'section'
}
