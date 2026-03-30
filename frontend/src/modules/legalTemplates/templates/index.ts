// f:\LAWGPT\LawGPT\frontend\src\modules\legalTemplates\templates\index.ts

export interface TemplateField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'date';
  placeholder?: string;
  required?: boolean;
  /** Optional grouping label for the form UI (e.g. "Advocate Details") */
  group?: string;
}

export interface LegalTemplate {
  id: string;
  name: string;
  category: string;
  fields: TemplateField[];
  template: string;
  icon?: string;
  version?: string;
  jurisdiction?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared disclaimer footer appended to every template
// ─────────────────────────────────────────────────────────────────────────────
const DISCLAIMER_FOOTER = `
<div style="margin-top: 48px; padding-top: 16px; border-top: 1px solid #d1d5db; font-family: 'Times New Roman', Times, serif; font-size: 10pt; color: #6b7280; text-align: center; font-style: italic;">
  Note: This is a draft generated for assistance purposes only. Final review by a qualified legal professional is advised before use in any legal proceeding.
</div>
`;

// ─────────────────────────────────────────────────────────────────────────────
// 1. LEGAL NOTICE — Professional Advocate Format
// ─────────────────────────────────────────────────────────────────────────────
export const LEGAL_NOTICE: LegalTemplate = {
  id: "legal_notice",
  name: "Legal Notice",
  category: "Civil",
  fields: [
    // ── Advocate Details ──────────────────────────────────────────────────
    {
      name: "advocate_name",
      label: "Advocate Name",
      type: "text",
      required: true,
      group: "Advocate Details",
      placeholder: "Adv. Ramesh Kumar"
    },
    {
      name: "advocate_address",
      label: "Advocate Office Address",
      type: "textarea",
      required: true,
      group: "Advocate Details",
      placeholder: "Chamber No. 12, District Court Complex, New Delhi – 110001"
    },

    // ── Client Details ────────────────────────────────────────────────────
    {
      name: "client_name",
      label: "Client Full Name",
      type: "text",
      required: true,
      group: "Client Details",
      placeholder: "Suresh Mehta"
    },
    {
      name: "client_address",
      label: "Client Address",
      type: "textarea",
      required: true,
      group: "Client Details",
      placeholder: "123, Lajpat Nagar, New Delhi – 110024"
    },

    // ── Opponent Details ──────────────────────────────────────────────────
    {
      name: "recipient_name",
      label: "Recipient / Opposite Party Name",
      type: "text",
      required: true,
      group: "Opponent Details",
      placeholder: "Anil Sharma"
    },
    {
      name: "recipient_address",
      label: "Recipient Address",
      type: "textarea",
      required: true,
      group: "Opponent Details",
      placeholder: "456, Connaught Place, New Delhi – 110001"
    },

    // ── Case Details ──────────────────────────────────────────────────────
    {
      name: "subject",
      label: "Subject of Notice",
      type: "text",
      required: true,
      group: "Case Details",
      placeholder: "Recovery of outstanding dues of ₹5,00,000/-"
    },
    {
      name: "transaction_details",
      label: "Transaction / Background Details",
      type: "textarea",
      required: true,
      group: "Case Details",
      placeholder: "describe the transaction or agreement..."
    },
    {
      name: "cause_of_action",
      label: "Cause of Action",
      type: "textarea",
      required: true,
      group: "Case Details",
      placeholder: "describe the breach or default..."
    },
    {
      name: "relief_claim",
      label: "Relief / Demand",
      type: "textarea",
      required: true,
      group: "Case Details",
      placeholder: "Pay the outstanding amount of ₹5,00,000/- along with interest..."
    },
    {
      name: "notice_period",
      label: "Notice Period (days)",
      type: "text",
      required: true,
      group: "Case Details",
      placeholder: "15"
    },
    {
      name: "place",
      label: "Place of Issue",
      type: "text",
      required: true,
      group: "Case Details",
      placeholder: "New Delhi"
    },
    {
      name: "date",
      label: "Date",
      type: "date",
      required: true,
      group: "Case Details"
    },
  ],
  template: `
<div style="font-family: 'Times New Roman', Times, serif; line-height: 1.8; color: #1a1a1a; max-width: 100%; margin: 0 auto; text-align: justify;">

  <div style="text-align: center; margin-bottom: 32px;">
    <h2 style="margin: 0; text-transform: uppercase; text-decoration: underline; font-weight: bold; font-size: 16pt; letter-spacing: 2px;">LEGAL NOTICE</h2>
  </div>

  <div style="margin-bottom: 20px;">
    <strong>Date:</strong> {{date}}
  </div>

  <div style="margin-bottom: 6px;"><strong>From,</strong></div>
  <div style="margin-bottom: 4px;"><strong>{{advocate_name}}</strong></div>
  <div style="margin-bottom: 4px;">Advocate</div>
  <div style="margin-bottom: 28px; white-space: pre-line;">{{advocate_address}}</div>

  <div style="margin-bottom: 6px;"><strong>To,</strong></div>
  <div style="margin-bottom: 4px;"><strong>{{recipient_name}}</strong></div>
  <div style="margin-bottom: 28px; white-space: pre-line;">{{recipient_address}}</div>

  <div style="margin-bottom: 24px;">
    <strong>Subject: {{subject}}</strong>
  </div>

  <p>Sir/Madam,</p>

  <p>Under instructions and on behalf of my client <strong>{{client_name}}</strong>, residing at <span style="white-space: pre-line;">{{client_address}}</span>, I hereby serve upon you the following legal notice:</p>

  <p><strong>1.</strong>&nbsp;&nbsp;That {{transaction_details}}</p>

  <p><strong>2.</strong>&nbsp;&nbsp;That {{cause_of_action}}</p>

  <p><strong>3.</strong>&nbsp;&nbsp;That despite repeated requests, you have failed to comply with your obligations, causing unlawful loss and injury to my client.</p>

  <p><strong>4.</strong>&nbsp;&nbsp;That this constitutes a clear violation of the legal rights of my client and renders you liable in law.</p>

  <div style="margin: 24px 0; padding: 16px; border-left: 4px solid #1a1a1a; background: #f9f9f9;">
    <p style="margin: 0; font-weight: bold;">THEREFORE, YOU ARE HEREBY CALLED UPON TO:</p>
    <p style="margin: 8px 0 0 0; white-space: pre-line;">{{relief_claim}}</p>
    <p style="margin: 8px 0 0 0;">within a period of <strong>{{notice_period}} days</strong> from receipt of this notice.</p>
  </div>

  <p>Failing which, my client shall be constrained to initiate appropriate civil and/or criminal proceedings against you before a competent court of law, entirely at your risk as to costs and consequences.</p>

  <p>A copy of this notice is retained in my office for future reference.</p>

  <div style="margin-top: 48px;">
    <p>Yours faithfully,</p>
    <br>
    <p><strong>{{advocate_name}}</strong><br>Advocate</p>
    <p style="margin-top: 16px;"><strong>Place:</strong> {{place}}</p>
    <p><strong>Date:</strong> {{date}}</p>
  </div>

</div>
${DISCLAIMER_FOOTER}
`
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. BAIL APPLICATION — Detailed Court Format
// ─────────────────────────────────────────────────────────────────────────────
export const BAIL_APPLICATION: LegalTemplate = {
  id: "bail_application",
  name: "Bail Application",
  category: "Criminal",
  fields: [
    // ── Court Details ─────────────────────────────────────────────────────
    {
      name: "court_name",
      label: "Court Name",
      type: "text",
      required: true,
      group: "Court Details",
      placeholder: "Sessions Judge, New Delhi"
    },
    {
      name: "case_number",
      label: "Case / FIR Number",
      type: "text",
      required: true,
      group: "Court Details",
      placeholder: "Session Case No. 123/2024"
    },
    {
      name: "police_station",
      label: "Police Station",
      type: "text",
      required: true,
      group: "Court Details",
      placeholder: "Lajpat Nagar Police Station"
    },
    {
      name: "sections",
      label: "Sections of Law",
      type: "text",
      required: true,
      group: "Court Details",
      placeholder: "302/34 IPC"
    },

    // ── Applicant Details ─────────────────────────────────────────────────
    {
      name: "applicant_name",
      label: "Applicant / Accused Name",
      type: "text",
      required: true,
      group: "Applicant Details",
      placeholder: "Rajesh Kumar"
    },
    {
      name: "applicant_address",
      label: "Applicant Address",
      type: "textarea",
      required: true,
      group: "Applicant Details",
      placeholder: "12, Shanti Nagar, New Delhi – 110002"
    },

    // ── Case Details ──────────────────────────────────────────────────────
    {
      name: "facts",
      label: "Facts of the Case",
      type: "textarea",
      required: true,
      group: "Case Details",
      placeholder: "The applicant was arrested on... and has been in judicial custody since..."
    },
    {
      name: "grounds",
      label: "Grounds for Bail",
      type: "textarea",
      required: true,
      group: "Case Details",
      placeholder: "i. The applicant has deep roots in society...\nii. The applicant cooperated with investigation..."
    },
    {
      name: "advocate_name",
      label: "Advocate Name",
      type: "text",
      required: true,
      group: "Case Details",
      placeholder: "Adv. Priya Singh"
    },
    {
      name: "date",
      label: "Date of Filing",
      type: "date",
      required: true,
      group: "Case Details"
    }
  ],
  template: `
<div style="font-family: 'Times New Roman', Times, serif; line-height: 1.8; color: #1a1a1a; text-align: justify;">

  <div style="text-align: center; margin-bottom: 32px;">
    <h2 style="margin: 0; text-transform: uppercase; font-weight: bold; font-size: 14pt;">IN THE COURT OF {{court_name}}</h2>
    <p style="margin-top: 8px; text-transform: uppercase; text-decoration: underline; font-weight: bold; font-size: 13pt; letter-spacing: 1px;">BAIL APPLICATION</p>
  </div>

  <div style="text-align: center; margin-bottom: 24px;">
    <p>IN<br><strong>Case No: {{case_number}}</strong></p>
  </div>

  <div style="margin-bottom: 24px;">
    <p>In the matter of:</p>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="width: 60%; padding: 4px 0; vertical-align: top;">
          <strong>{{applicant_name}}</strong><br>
          Resident of <span style="white-space: pre-line;">{{applicant_address}}</span>
        </td>
        <td style="width: 40%; text-align: right; vertical-align: top;">
          <em>...Applicant/Accused</em>
        </td>
      </tr>
    </table>

    <p style="text-align: center; font-weight: bold; margin: 12px 0;">VERSUS</p>

    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="width: 60%; padding: 4px 0;">
          <strong>State</strong>
        </td>
        <td style="width: 40%; text-align: right;">
          <em>...Respondent</em>
        </td>
      </tr>
    </table>
  </div>

  <p style="text-align: center; font-weight: bold; text-decoration: underline; margin: 24px 0;">MOST RESPECTFULLY SHOWETH:</p>

  <p><strong>1.</strong>&nbsp;&nbsp;That the applicant has been falsely implicated in the present case registered at <strong>{{police_station}}</strong> under Sections <strong>{{sections}}</strong>.</p>

  <p><strong>2.</strong>&nbsp;&nbsp;That {{facts}}</p>

  <p><strong>3.</strong>&nbsp;&nbsp;That the applicant is innocent and has not committed any offence as alleged in the FIR.</p>

  <p><strong>4.</strong>&nbsp;&nbsp;That the applicant is a law-abiding citizen with deep roots in the society and is not likely to abscond or tamper with the evidence.</p>

  <p><strong>5.</strong>&nbsp;&nbsp;That the applicant undertakes to cooperate fully with the investigation and abide by all conditions that may be imposed by this Hon'ble Court.</p>

  <p style="margin-top: 24px;"><strong>GROUNDS:</strong></p>
  <div style="margin-left: 20px; white-space: pre-line;">{{grounds}}</div>

  <div style="margin-top: 32px; padding: 16px; border: 1px solid #1a1a1a; border-radius: 4px; background: #f9f9f9;">
    <p style="margin: 0; font-weight: bold; text-align: center; text-transform: uppercase; text-decoration: underline;">PRAYER</p>
    <p style="margin: 12px 0 0 0;">It is therefore most respectfully prayed that this Hon'ble Court may kindly be pleased to <strong>grant bail</strong> to the applicant in the interest of justice.</p>
    <p style="margin: 8px 0 0 0; font-style: italic; text-align: center;">AND FOR THIS ACT OF KINDNESS, THE APPLICANT SHALL EVER PRAY.</p>
  </div>

  <div style="margin-top: 48px;">
    <p>Filed by:</p>
    <p><strong>{{advocate_name}}</strong><br>Advocate</p>
    <p style="margin-top: 8px;"><strong>Date:</strong> {{date}}</p>
  </div>

</div>
${DISCLAIMER_FOOTER}
`
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. AFFIDAVIT — Evidence Standard Format
// ─────────────────────────────────────────────────────────────────────────────
export const AFFIDAVIT: LegalTemplate = {
  id: "affidavit",
  name: "Affidavit",
  category: "General",
  fields: [
    {
      name: "deponent_name",
      label: "Deponent Full Name",
      type: "text",
      required: true,
      group: "Deponent Details",
      placeholder: "Sanjay Verma"
    },
    {
      name: "father_name",
      label: "Father's Name",
      type: "text",
      required: true,
      group: "Deponent Details",
      placeholder: "Ram Lal Verma"
    },
    {
      name: "age",
      label: "Age (years)",
      type: "text",
      required: true,
      group: "Deponent Details",
      placeholder: "35"
    },
    {
      name: "address",
      label: "Residential Address",
      type: "textarea",
      required: true,
      group: "Deponent Details",
      placeholder: "78, Gandhi Nagar, Jaipur, Rajasthan – 302015"
    },
    {
      name: "case_details",
      label: "Case / Matter Reference",
      type: "text",
      required: true,
      group: "Affidavit Details",
      placeholder: "Civil Suit No. 45/2024 — Verma vs Sharma"
    },
    {
      name: "statements",
      label: "Statements / Declarations",
      type: "textarea",
      required: true,
      group: "Affidavit Details",
      placeholder: "I reside at the above-mentioned address and am personally acquainted with the parties..."
    },
    {
      name: "verification_place",
      label: "Verification Place",
      type: "text",
      required: true,
      group: "Affidavit Details",
      placeholder: "Jaipur"
    },
    {
      name: "date",
      label: "Date",
      type: "date",
      required: true,
      group: "Affidavit Details"
    }
  ],
  template: `
<div style="font-family: 'Times New Roman', Times, serif; line-height: 1.8; color: #1a1a1a; text-align: justify;">

  <div style="text-align: center; margin-bottom: 32px;">
    <h2 style="margin: 0; text-transform: uppercase; text-decoration: underline; font-weight: bold; font-size: 16pt; letter-spacing: 2px;">AFFIDAVIT</h2>
  </div>

  <p>I, <strong>{{deponent_name}}</strong>, S/o <strong>{{father_name}}</strong>, aged about <strong>{{age}}</strong> years, residing at <span style="white-space: pre-line;">{{address}}</span>, do hereby solemnly affirm and state as under:</p>

  <p><strong>1.</strong>&nbsp;&nbsp;That I am the deponent herein and well acquainted with the facts of the case <strong>{{case_details}}</strong>.</p>

  <p><strong>2.</strong>&nbsp;&nbsp;That {{statements}}</p>

  <p><strong>3.</strong>&nbsp;&nbsp;That the contents of this affidavit are true and correct to the best of my knowledge and belief and nothing material has been concealed therefrom.</p>

  <div style="margin-top: 48px; padding-top: 16px; border-top: 1px solid #d1d5db;">
    <p style="font-weight: bold; text-decoration: underline;">VERIFICATION</p>
    <p>Verified at <strong>{{verification_place}}</strong> on this <strong>{{date}}</strong> that the contents of the above affidavit are true and correct to my knowledge and belief and nothing is false or has been concealed.</p>
  </div>

  <div style="margin-top: 80px; text-align: right;">
    <p>__________________________</p>
    <p><strong>DEPONENT</strong></p>
    <p>({{deponent_name}})</p>
  </div>

</div>
${DISCLAIMER_FOOTER}
`
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. NON-DISCLOSURE AGREEMENT — Proper 6-Clause Legal Structure
// ─────────────────────────────────────────────────────────────────────────────
export const NDA: LegalTemplate = {
  id: "nda",
  name: "Non-Disclosure Agreement",
  category: "Corporate",
  fields: [
    // ── Party Details ─────────────────────────────────────────────────────
    {
      name: "party1_name",
      label: "First Party Name / Entity",
      type: "text",
      required: true,
      group: "Party Details",
      placeholder: "TechCorp Innovations Pvt. Ltd."
    },
    {
      name: "party1_address",
      label: "First Party Address",
      type: "textarea",
      required: true,
      group: "Party Details",
      placeholder: "Plot 45, Sector 62, Noida, UP – 201301"
    },
    {
      name: "party2_name",
      label: "Second Party Name / Entity",
      type: "text",
      required: true,
      group: "Party Details",
      placeholder: "Alpha Solutions Ltd."
    },
    {
      name: "party2_address",
      label: "Second Party Address",
      type: "textarea",
      required: true,
      group: "Party Details",
      placeholder: "12, MG Road, Bengaluru, Karnataka – 560001"
    },

    // ── Agreement Details ─────────────────────────────────────────────────
    {
      name: "purpose",
      label: "Purpose of Agreement",
      type: "textarea",
      required: true,
      group: "Agreement Details",
      placeholder: "exploring a potential business collaboration for software development services"
    },
    {
      name: "confidential_definition",
      label: "Definition of Confidential Information",
      type: "textarea",
      required: true,
      group: "Agreement Details",
      placeholder: "all non-public business data, technical documents, source code, financial information, trade secrets, and any other information designated as confidential"
    },
    {
      name: "duration",
      label: "Duration of Agreement",
      type: "text",
      required: true,
      group: "Agreement Details",
      placeholder: "3 (Three) years from the date of signing"
    },
    {
      name: "jurisdiction",
      label: "Jurisdiction (City/Court)",
      type: "text",
      required: true,
      group: "Agreement Details",
      placeholder: "New Delhi"
    },
    {
      name: "date",
      label: "Agreement Date",
      type: "date",
      required: true,
      group: "Agreement Details"
    }
  ],
  template: `
<div style="font-family: 'Times New Roman', Times, serif; line-height: 1.8; color: #1a1a1a; text-align: justify;">

  <div style="text-align: center; margin-bottom: 32px;">
    <h2 style="margin: 0; text-transform: uppercase; text-decoration: underline; font-weight: bold; font-size: 16pt; letter-spacing: 2px;">NON-DISCLOSURE AGREEMENT</h2>
  </div>

  <p>This Non-Disclosure Agreement (hereinafter referred to as this <strong>"Agreement"</strong>) is made and executed on this <strong>{{date}}</strong>.</p>

  <p style="text-align: center; font-weight: bold;">BETWEEN</p>

  <p><strong>{{party1_name}}</strong>, having its registered address at <span style="white-space: pre-line;">{{party1_address}}</span> (hereinafter referred to as the <strong>"First Party"</strong>)</p>

  <p style="text-align: center; font-weight: bold;">AND</p>

  <p><strong>{{party2_name}}</strong>, having its registered address at <span style="white-space: pre-line;">{{party2_address}}</span> (hereinafter referred to as the <strong>"Second Party"</strong>).</p>

  <p>The First Party and the Second Party are hereinafter collectively referred to as the <strong>"Parties"</strong> and individually as a <strong>"Party"</strong>.</p>

  <hr style="margin: 24px 0; border: none; border-top: 1px solid #d1d5db;">

  <p><strong>1. PURPOSE</strong></p>
  <p>The Parties intend to engage in discussions and exchange information for the purpose of <strong>{{purpose}}</strong>. This Agreement governs the disclosure of confidential information between the Parties in connection with said purpose.</p>

  <p><strong>2. CONFIDENTIAL INFORMATION</strong></p>
  <p><strong>"Confidential Information"</strong> shall mean {{confidential_definition}}. Confidential Information shall not include information that (a) is or becomes publicly available through no fault of the Receiving Party; (b) was already in the Receiving Party's possession prior to disclosure; or (c) is independently developed by the Receiving Party without use of Confidential Information.</p>

  <p><strong>3. OBLIGATIONS OF THE RECEIVING PARTY</strong></p>
  <p>The Receiving Party shall:</p>
  <ul style="margin-left: 24px;">
    <li>not disclose, publish, or reveal the Confidential Information to any third party without prior written consent of the Disclosing Party;</li>
    <li>use the Confidential Information solely for the Purpose stated above;</li>
    <li>protect the Confidential Information with at least the same degree of care used to protect its own confidential information, but in no event less than reasonable care.</li>
  </ul>

  <p><strong>4. EXCLUSIONS</strong></p>
  <p>Information shall not be treated as Confidential Information under this Agreement if it:</p>
  <ul style="margin-left: 24px;">
    <li>is or becomes part of the public domain through no breach of this Agreement;</li>
    <li>was already known to the Receiving Party at the time of disclosure;</li>
    <li>is independently developed without reference to the Confidential Information; or</li>
    <li>is required to be disclosed by law, court order, or government authority.</li>
  </ul>

  <p><strong>5. TERM</strong></p>
  <p>This Agreement shall remain valid and in full force for a period of <strong>{{duration}}</strong>, unless earlier terminated by mutual written consent of the Parties.</p>

  <p><strong>6. GOVERNING LAW AND JURISDICTION</strong></p>
  <p>This Agreement shall be governed by and construed in accordance with the laws of India. The courts at <strong>{{jurisdiction}}</strong> shall have exclusive jurisdiction over any disputes arising out of or in connection with this Agreement.</p>

  <hr style="margin: 32px 0; border: none; border-top: 1px solid #d1d5db;">

  <p><strong>IN WITNESS WHEREOF</strong>, the Parties have executed this Agreement as of the date first written above.</p>

  <div style="margin-top: 64px; display: flex; justify-content: space-between; gap: 40px;">
    <div style="flex: 1; text-align: center;">
      <p>__________________________</p>
      <p><strong>{{party1_name}}</strong></p>
      <p>First Party</p>
      <p>Date: ____________</p>
    </div>
    <div style="flex: 1; text-align: center;">
      <p>__________________________</p>
      <p><strong>{{party2_name}}</strong></p>
      <p>Second Party</p>
      <p>Date: ____________</p>
    </div>
  </div>

</div>
${DISCLAIMER_FOOTER}
`
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. VAKALATNAMA — (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
export const VAKALATNAMA: LegalTemplate = {
  id: "vakalatnama",
  name: "Vakalatnama",
  category: "Court",
  fields: [
    { name: "client_name", label: "Client Name", type: "text", required: true },
    { name: "advocate_name", label: "Advocate Name", type: "text", required: true },
    { name: "case_title", label: "Case Title", type: "text", required: true },
    { name: "court_name", label: "Court Name", type: "text", required: true },
    { name: "date", label: "Date", type: "date", required: true }
  ],
  template: `
<div style="font-family: 'Times New Roman', Times, serif; line-height: 1.6; color: #1a1a1a; text-align: justify;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h2 style="margin: 0; text-transform: uppercase; text-decoration: underline; font-weight: bold;">VAKALATNAMA</h2>
    <p style="margin-top: 5px;"><strong>In the Court of: {{court_name}}</strong></p>
  </div>
  
  <div style="margin-bottom: 25px;">
    <p>Case Title: <strong>{{case_title}}</strong></p>
  </div>
  
  <p>I/We, <strong>{{client_name}}</strong>, the undersigned, do hereby constitute and appoint <strong>{{advocate_name}}</strong> to be my/our Advocate in the above-mentioned case. I/We authorize the said advocate to appear, plead, and act on my/our behalf in all matters related to this proceeding, including filing of documents, receiving payments, and entering into settlements.</p>
  
  <p>Signed and delivered on this <strong>{{date}}</strong>.</p>
  
  <div style="margin-top: 100px; display: flex; justify-content: space-between; align-items: flex-end;">
    <div style="text-align: center;">
      <p>__________________________</p>
      <p><strong>ADVOCATE</strong></p>
    </div>
    <div style="text-align: center;">
      <p>__________________________</p>
      <p><strong>CLIENT (SIGNATURE)</strong></p>
    </div>
  </div>
</div>
${DISCLAIMER_FOOTER}
`
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. RENT AGREEMENT — (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
export const RENT_AGREEMENT: LegalTemplate = {
  id: "rent_agreement",
  name: "Rent Agreement",
  category: "Corporate",
  fields: [
    { name: "landlord", label: "Landlord Name", type: "text", required: true },
    { name: "tenant", label: "Tenant Name", type: "text", required: true },
    { name: "property_address", label: "Property Address", type: "textarea", required: true },
    { name: "rent_amount", label: "Monthly Rent Amount", type: "text", required: true },
    { name: "duration", label: "Duration (Months)", type: "text", required: true },
    { name: "date", label: "Agreement Date", type: "date", required: true }
  ],
  template: `
<div style="font-family: 'Times New Roman', Times, serif; line-height: 1.6; color: #1a1a1a; text-align: justify;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h2 style="margin: 0; text-transform: uppercase; text-decoration: underline; font-weight: bold;">RENT AGREEMENT</h2>
  </div>
  
  <p>This DEED OF RENT AGREEMENT is executed on this <strong>{{date}}</strong> between <strong>{{landlord}}</strong> (hereinafter called the "Landlord") and <strong>{{tenant}}</strong> (hereinafter called the "Tenant").</p>
  
  <div style="margin-top: 25px;">
    <p><strong>1. Property:</strong> The Landlord is the absolute owner of the property situated at {{property_address}} and hereby lets the said premises to the Tenant.</p>
    <p><strong>2. Rent:</strong> The monthly rent for the premises shall be <strong>INR {{rent_amount}}</strong>, payable on or before the 5th of each calendar month.</p>
    <p><strong>3. Term:</strong> This agreement is for a fixed term of <strong>{{duration}}</strong> months, commencing from the date of execution.</p>
    <p><strong>4. Security Deposit:</strong> The Tenant has deposited an interest-free security deposit as agreed between the parties.</p>
  </div>
  
  <p style="margin-top: 40px;">IN WITNESS WHEREOF, the parties hereto have signed this Agreement on the day, month and year mentioned above.</p>
  
  <div style="margin-top: 80px; display: flex; justify-content: space-between;">
    <div style="text-align: center;">
      <p>__________________________</p>
      <p><strong>LANDLORD</strong></p>
    </div>
    <div style="text-align: center;">
      <p>__________________________</p>
      <p><strong>TENANT</strong></p>
    </div>
  </div>
</div>
${DISCLAIMER_FOOTER}
`
};

// ─────────────────────────────────────────────────────────────────────────────
// Phase 3 — Civil & Criminal
// ─────────────────────────────────────────────────────────────────────────────
export { PLAINT, WRITTEN_STATEMENT, CRIMINAL_COMPLAINT, ANTICIPATORY_BAIL, QUASHING_PETITION } from "./phase3Civil";
import { PLAINT, WRITTEN_STATEMENT, CRIMINAL_COMPLAINT, ANTICIPATORY_BAIL, QUASHING_PETITION } from "./phase3Civil";

// ─────────────────────────────────────────────────────────────────────────────
// Phase 3 — Corporate, Property, Family, Misc
// ─────────────────────────────────────────────────────────────────────────────
export { SERVICE_AGREEMENT, EMPLOYMENT_AGREEMENT, AGREEMENT_TO_SELL, SALE_DEED, DIVORCE_PETITION, MAINTENANCE_PETITION, POWER_OF_ATTORNEY, INDEMNITY_BOND, UNDERTAKING, LEGAL_NOTICE_RECOVERY } from "./phase3Corporate";
import { SERVICE_AGREEMENT, EMPLOYMENT_AGREEMENT, AGREEMENT_TO_SELL, SALE_DEED, DIVORCE_PETITION, MAINTENANCE_PETITION, POWER_OF_ATTORNEY, INDEMNITY_BOND, UNDERTAKING, LEGAL_NOTICE_RECOVERY } from "./phase3Corporate";

// ─────────────────────────────────────────────────────────────────────────────
// Master export — 21 templates total
// ─────────────────────────────────────────────────────────────────────────────
export const ALL_TEMPLATES: LegalTemplate[] = [
  // Civil (Phase 2 + 3)
  LEGAL_NOTICE,
  LEGAL_NOTICE_RECOVERY,
  PLAINT,
  WRITTEN_STATEMENT,

  // Criminal
  BAIL_APPLICATION,
  CRIMINAL_COMPLAINT,
  ANTICIPATORY_BAIL,
  QUASHING_PETITION,

  // Corporate
  NDA,
  SERVICE_AGREEMENT,
  EMPLOYMENT_AGREEMENT,

  // Property
  AGREEMENT_TO_SELL,
  SALE_DEED,
  RENT_AGREEMENT,

  // Family
  DIVORCE_PETITION,
  MAINTENANCE_PETITION,

  // Court
  VAKALATNAMA,

  // General / Misc
  AFFIDAVIT,
  POWER_OF_ATTORNEY,
  INDEMNITY_BOND,
  UNDERTAKING,
];
