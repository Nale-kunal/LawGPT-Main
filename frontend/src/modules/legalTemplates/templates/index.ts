// f:\LAWGPT\LawGPT\frontend\src\modules\legalTemplates\templates\index.ts

export interface TemplateField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'date';
  placeholder?: string;
  required?: boolean;
}

export interface LegalTemplate {
  id: string;
  name: string;
  category: string;
  fields: TemplateField[];
  template: string;
  icon?: string;
}

export const LEGAL_NOTICE: LegalTemplate = {
  id: "legal_notice",
  name: "Legal Notice",
  category: "Civil",
  fields: [
    { name: "sender_name", label: "Sender Name", type: "text", required: true },
    { name: "sender_address", label: "Sender Address", type: "textarea", required: true },
    { name: "receiver_name", label: "Receiver Name", type: "text", required: true },
    { name: "receiver_address", label: "Receiver Address", type: "textarea", required: true },
    { name: "subject", label: "Subject", type: "text", required: true },
    { name: "body", label: "Body Details", type: "textarea", required: true },
    { name: "date", label: "Date", type: "date", required: true }
  ],
  template: `
<div style="font-family: 'Times New Roman', Times, serif; line-height: 1.6; color: #1a1a1a; max-width: 100%; margin: 0 auto; text-align: justify;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h2 style="margin: 0; text-transform: uppercase; text-decoration: underline; font-weight: bold;">LEGAL NOTICE</h2>
  </div>

  <div style="display: flex; justify-content: flex-end; margin-bottom: 25px;">
    <div><strong>Date:</strong> {{date}}</div>
  </div>
  
  <div style="margin-bottom: 25px;">
    <strong>To,</strong><br>
    <strong>{{receiver_name}}</strong><br>
    {{receiver_address}}
  </div>
  
  <div style="margin-bottom: 25px;">
    <strong>Subject: {{subject}}</strong>
  </div>
  
  <p>Sir/Madam,</p>
  
  <p>Under instructions from my client <strong>{{sender_name}}</strong>, residing at {{sender_address}}, I hereby serve upon you the following legal notice:</p>
  
  <div style="margin: 20px 0; min-height: 100px;">
    {{body}}
  </div>
  
  <p>You are hereby called upon to respond within 15 days from receipt of this notice, failing which my client shall initiate appropriate legal proceedings at your risk as to cost and consequences.</p>
  
  <div style="margin-top: 40px;">
    <p>Sincerely,</p>
    <br><br>
    <p><strong>(Signature)</strong><br>
    <strong>{{sender_name}}</strong></p>
  </div>
</div>
`
};

export const AFFIDAVIT: LegalTemplate = {
  id: "affidavit",
  name: "Affidavit",
  category: "General",
  fields: [
    { name: "name", label: "Full Name", type: "text", required: true },
    { name: "address", label: "Address", type: "textarea", required: true },
    { name: "purpose", label: "Purpose of Affidavit", type: "text", required: true },
    { name: "location", label: "Location", type: "text", required: true },
    { name: "date", label: "Date", type: "date", required: true }
  ],
  template: `
<div style="font-family: 'Times New Roman', Times, serif; line-height: 1.6; color: #1a1a1a; text-align: justify;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h2 style="margin: 0; text-transform: uppercase; text-decoration: underline; font-weight: bold;">AFFIDAVIT</h2>
  </div>
  
  <p>I, <strong>{{name}}</strong>, son/daughter/wife of _____________________, aged about _____ years, residing at {{address}}, do hereby solemnly affirm and declare as under:</p>
  
  <div style="margin: 20px 0;">
    <ol style="margin-left: 20px;">
      <li style="margin-bottom: 10px;">That I am the deponent herein and am well conversant with the facts of the case.</li>
      <li style="margin-bottom: 10px;">That the contents of this affidavit are for the purpose of <strong>{{purpose}}</strong>.</li>
      <li style="margin-bottom: 10px;">That the contents of this affidavit are true and correct to the best of my knowledge and belief.</li>
      <li style="margin-bottom: 10px;">That no part of it is false and nothing material has been concealed therefrom.</li>
    </ol>
  </div>
  
  <p style="margin-top: 40px; border-top: 1px solid #ccc; pt-4"><strong>Verification:</strong></p>
  <p>Verified at <strong>{{location}}</strong> on this <strong>{{date}}</strong> that the contents of the above affidavit are true to my knowledge and belief.</p>
  
  <div style="margin-top: 80px; display: flex; justify-content: flex-end;">
    <div style="text-align: center;">
      <p>__________________________</p>
      <p><strong>DEPONENT</strong></p>
    </div>
  </div>
</div>
`
};

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
`
};

export const BAIL_APPLICATION: LegalTemplate = {
  id: "bail_application",
  name: "Bail Application",
  category: "Criminal",
  fields: [
    { name: "court_name", label: "Court Name", type: "text", required: true },
    { name: "applicant_name", label: "Applicant Name", type: "text", required: true },
    { name: "fir_number", label: "FIR Number / Case No", type: "text", required: true },
    { name: "police_station", label: "Police Station", type: "text", required: true },
    { name: "grounds", label: "Grounds for Bail", type: "textarea", required: true },
    { name: "date", label: "Date", type: "date", required: true }
  ],
  template: `
<div style="font-family: 'Times New Roman', Times, serif; line-height: 1.6; color: #1a1a1a; text-align: justify;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h2 style="margin: 0; text-transform: uppercase; text-decoration: underline; font-weight: bold;">IN THE COURT OF {{court_name}}</h2>
    <p style="margin-top: 5px; text-transform: uppercase;"><strong>Application for Bail</strong></p>
  </div>
  
  <p><strong>Applicant:</strong> {{applicant_name}}</p>
  <p><strong>FIR No:</strong> {{fir_number}} | <strong>P.S.:</strong> {{police_station}}</p>
  
  <p style="margin-top: 25px;"><strong>MOST RESPECTFULLY SUBMITTED:</strong></p>
  
  <div style="margin: 15px 0;">
    <ol style="margin-left: 20px;">
      <li style="margin-bottom: 10px;">That the applicant has been falsely implicated in the present case and has not committed any offence as alleged.</li>
      <li style="margin-bottom: 10px;">That <strong>{{grounds}}</strong>.</li>
      <li style="margin-bottom: 10px;">That the applicant is a law-abiding citizen with deep roots in society and there is no risk of him fleeing from justice.</li>
      <li style="margin-bottom: 10px;">That the applicant undertakes to abide by all the terms and conditions that may be imposed by this Hon'ble Court.</li>
    </ol>
  </div>
  
  <p>It is therefore prayed that this Hon'ble Court may be pleased to grant bail to the applicant in the interest of justice.</p>
  
  <div style="margin-top: 40px;">
    <p><strong>Date:</strong> {{date}}</p>
    <p><strong>Place:</strong> {{police_station}}</p>
  </div>
  
  <div style="margin-top: 80px; text-align: right;">
    <p>__________________________</p>
    <p><strong>APPLICANT / ADVOCATE</strong></p>
  </div>
</div>
`
};

export const NDA: LegalTemplate = {
  id: "nda",
  name: "Non-Disclosure Agreement",
  category: "Corporate",
  fields: [
    { name: "party1", label: "Disclosing Party", type: "text", required: true },
    { name: "party2", label: "Receiving Party", type: "text", required: true },
    { name: "purpose", label: "Purpose of Disclosure", type: "text", required: true },
    { name: "date", label: "Agreement Date", type: "date", required: true }
  ],
  template: `
<div style="font-family: 'Times New Roman', Times, serif; line-height: 1.6; color: #1a1a1a; text-align: justify;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h2 style="margin: 0; text-transform: uppercase; text-decoration: underline; font-weight: bold;">NON-DISCLOSURE AGREEMENT</h2>
  </div>
  
  <p>This Non-Disclosure Agreement (the "Agreement") is entered into on this <strong>{{date}}</strong>, by and between:</p>
  
  <p><strong>{{party1}}</strong> (hereinafter referred to as the "Disclosing Party") of the ONE PART;</p>
  <p>AND</p>
  <p><strong>{{party2}}</strong> (hereinafter referred to as the "Receiving Party") of the OTHER PART.</p>
  
  <div style="margin-top: 25px;">
    <p><strong>1. Purpose:</strong> The parties wish to explore a business opportunity related to <strong>{{purpose}}</strong>.</p>
    <p><strong>2. Confidential Information:</strong> "Confidential Information" shall mean all data and information disclosed by the Disclosing Party to the Receiving Party.</p>
    <p><strong>3. Obligations:</strong> The Receiving Party shall use the Confidential Information solely for the Purpose and shall maintain the same in strict confidence.</p>
  </div>
  
  <p style="margin-top: 40px;">IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first above written.</p>
  
  <div style="margin-top: 80px; display: flex; justify-content: space-between;">
    <div style="text-align: center;">
      <p>__________________________</p>
      <p><strong>DISCLOSING PARTY</strong></p>
      <p>({{party1}})</p>
    </div>
    <div style="text-align: center;">
      <p>__________________________</p>
      <p><strong>RECEIVING PARTY</strong></p>
      <p>({{party2}})</p>
    </div>
  </div>
</div>
`
};

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
`
};

export const ALL_TEMPLATES: LegalTemplate[] = [
  LEGAL_NOTICE,
  AFFIDAVIT,
  VAKALATNAMA,
  BAIL_APPLICATION,
  NDA,
  RENT_AGREEMENT
];
