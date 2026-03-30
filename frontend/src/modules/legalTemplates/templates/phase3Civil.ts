import { LegalTemplate } from "./index";

const F = `<div style="margin-top:48px;padding-top:16px;border-top:1px solid #d1d5db;font-family:'Times New Roman',Times,serif;font-size:10pt;color:#6b7280;text-align:center;font-style:italic;">Note: This is a draft generated for assistance purposes only. Final review by a qualified legal professional is advised before use in any legal proceeding.</div>`;

export const PLAINT: LegalTemplate = {
  id: "plaint",
  name: "Plaint (Civil Suit)",
  category: "Civil",
  version: "v1.0",
  jurisdiction: "India",
  fields: [
    { name: "court_name", label: "Court Name", type: "text", required: true, group: "Court Details", placeholder: "Civil Judge (Senior Division), New Delhi" },
    { name: "suit_number", label: "Suit Number", type: "text", required: false, group: "Court Details", placeholder: "CS No. ___ / 2024" },
    { name: "plaintiff_name", label: "Plaintiff Name", type: "text", required: true, group: "Plaintiff Details", placeholder: "Suresh Kumar" },
    { name: "plaintiff_address", label: "Plaintiff Address", type: "textarea", required: true, group: "Plaintiff Details", placeholder: "12, Rajpur Road, Delhi – 110054" },
    { name: "defendant_name", label: "Defendant Name", type: "text", required: true, group: "Defendant Details", placeholder: "Ramesh Sharma" },
    { name: "defendant_address", label: "Defendant Address", type: "textarea", required: true, group: "Defendant Details", placeholder: "45, Model Town, Delhi – 110009" },
    { name: "subject_matter", label: "Subject Matter", type: "text", required: true, group: "Case Details", placeholder: "Recovery of amount / Specific Performance / Injunction" },
    { name: "facts", label: "Facts of the Case", type: "textarea", required: true, group: "Case Details", placeholder: "On or about [date], the plaintiff entered into an agreement with the defendant..." },
    { name: "cause_of_action", label: "Cause of Action", type: "textarea", required: true, group: "Case Details", placeholder: "The cause of action arose on [date] when the defendant failed to..." },
    { name: "jurisdiction", label: "Jurisdiction Grounds", type: "textarea", required: true, group: "Case Details", placeholder: "The defendant resides within the jurisdiction of this court / the cause of action arose within the jurisdiction..." },
    { name: "valuation", label: "Suit Valuation", type: "text", required: true, group: "Case Details", placeholder: "₹5,00,000/-" },
    { name: "relief", label: "Relief Sought", type: "textarea", required: true, group: "Case Details", placeholder: "i. Decree for recovery of ₹5,00,000/-\nii. Interest @ 18% p.a.\niii. Costs of the suit" },
    { name: "date", label: "Date", type: "date", required: true, group: "Case Details" },
  ],
  template: `<div style="font-family:'Times New Roman',Times,serif;line-height:1.8;color:#1a1a1a;text-align:justify;">
<div style="text-align:center;margin-bottom:32px;">
<h2 style="margin:0;text-transform:uppercase;font-weight:bold;font-size:14pt;">IN THE COURT OF {{court_name}}</h2>
<p style="margin-top:6px;font-size:12pt;"><strong>{{suit_number}}</strong></p>
<p style="margin-top:8px;text-decoration:underline;font-weight:bold;font-size:13pt;letter-spacing:1px;">PLAINT UNDER ORDER VII OF THE CODE OF CIVIL PROCEDURE, 1908</p>
</div>
<table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
<tr><td style="width:60%;vertical-align:top;"><strong>{{plaintiff_name}}</strong><br><span style="white-space:pre-line;">{{plaintiff_address}}</span></td><td style="width:40%;text-align:right;vertical-align:top;"><em>...Plaintiff</em></td></tr>
</table>
<p style="text-align:center;font-weight:bold;margin:12px 0;">VERSUS</p>
<table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
<tr><td style="width:60%;vertical-align:top;"><strong>{{defendant_name}}</strong><br><span style="white-space:pre-line;">{{defendant_address}}</span></td><td style="width:40%;text-align:right;vertical-align:top;"><em>...Defendant</em></td></tr>
</table>
<p style="text-align:center;font-weight:bold;text-decoration:underline;margin:24px 0;">MOST RESPECTFULLY SHOWETH:</p>
<p><strong>1.</strong>&nbsp;&nbsp;That the present suit is filed in respect of <strong>{{subject_matter}}</strong>.</p>
<p><strong>2.</strong>&nbsp;&nbsp;That {{facts}}</p>
<p><strong>3.</strong>&nbsp;&nbsp;That the cause of action arose when {{cause_of_action}}</p>
<p><strong>4.</strong>&nbsp;&nbsp;That this Hon'ble Court has jurisdiction to try and entertain the present suit because {{jurisdiction}}</p>
<p><strong>5.</strong>&nbsp;&nbsp;That the suit is valued at <strong>{{valuation}}</strong> for the purpose of court fees and jurisdiction, and the appropriate court fee has been affixed hereon.</p>
<div style="margin:28px 0;padding:16px;border:1px solid #1a1a1a;border-radius:4px;background:#f9f9f9;">
<p style="margin:0;font-weight:bold;text-align:center;text-decoration:underline;">PRAYER</p>
<p style="margin:12px 0 0 0;">It is therefore most respectfully prayed that this Hon'ble Court may be pleased to pass a decree:</p>
<div style="margin-left:20px;white-space:pre-line;margin-top:8px;">{{relief}}</div>
<p style="margin:12px 0 0 0;text-align:center;font-style:italic;">AND FOR THIS ACT OF KINDNESS, THE PLAINTIFF SHALL EVER PRAY.</p>
</div>
<p><strong>Date:</strong> {{date}}</p>
<div style="margin-top:60px;display:flex;justify-content:space-between;">
<div><p>__________________________</p><p><strong>PLAINTIFF</strong></p><p>({{plaintiff_name}})</p></div>
<div><p>__________________________</p><p><strong>ADVOCATE FOR PLAINTIFF</strong></p></div>
</div>
</div>${F}`,
};

export const WRITTEN_STATEMENT: LegalTemplate = {
  id: "written_statement",
  name: "Written Statement",
  category: "Civil",
  version: "v1.0",
  jurisdiction: "India",
  fields: [
    { name: "court_name", label: "Court Name", type: "text", required: true, group: "Court Details", placeholder: "Civil Judge (Senior Division), New Delhi" },
    { name: "suit_number", label: "Suit / Case Number", type: "text", required: true, group: "Court Details", placeholder: "CS No. 123 / 2024" },
    { name: "plaintiff_name", label: "Plaintiff Name", type: "text", required: true, group: "Parties", placeholder: "Suresh Kumar" },
    { name: "defendant_name", label: "Defendant Name", type: "text", required: true, group: "Parties", placeholder: "Ramesh Sharma" },
    { name: "preliminary_objections", label: "Preliminary Objections", type: "textarea", required: true, group: "Statement Details", placeholder: "i. The present suit is not maintainable in law.\nii. The plaintiff has no cause of action.\niii. This Court lacks territorial jurisdiction." },
    { name: "reply_on_merits", label: "Reply on Merits", type: "textarea", required: true, group: "Statement Details", placeholder: "Para 1: Denied. It is submitted that...\nPara 2: Admitted in part. However..." },
    { name: "prayer", label: "Prayer", type: "textarea", required: true, group: "Statement Details", placeholder: "It is prayed that the suit be dismissed with costs." },
    { name: "advocate_name", label: "Advocate Name", type: "text", required: true, group: "Statement Details", placeholder: "Adv. Priya Singh" },
    { name: "date", label: "Date", type: "date", required: true, group: "Statement Details" },
  ],
  template: `<div style="font-family:'Times New Roman',Times,serif;line-height:1.8;color:#1a1a1a;text-align:justify;">
<div style="text-align:center;margin-bottom:32px;">
<h2 style="margin:0;text-transform:uppercase;font-weight:bold;font-size:14pt;">IN THE COURT OF {{court_name}}</h2>
<p style="margin-top:6px;"><strong>{{suit_number}}</strong></p>
<p style="margin-top:8px;text-decoration:underline;font-weight:bold;font-size:13pt;">WRITTEN STATEMENT</p>
<p style="margin-top:4px;font-size:10pt;">[Filed under Order VIII of the Code of Civil Procedure, 1908]</p>
</div>
<table style="width:100%;border-collapse:collapse;margin-bottom:8px;"><tr><td style="width:60%;"><strong>{{plaintiff_name}}</strong></td><td style="text-align:right;"><em>...Plaintiff</em></td></tr></table>
<p style="text-align:center;font-weight:bold;margin:6px 0;">VERSUS</p>
<table style="width:100%;border-collapse:collapse;margin-bottom:24px;"><tr><td style="width:60%;"><strong>{{defendant_name}}</strong></td><td style="text-align:right;"><em>...Defendant</em></td></tr></table>
<p style="text-align:center;font-weight:bold;text-decoration:underline;margin:20px 0;">MOST RESPECTFULLY SHOWETH:</p>
<p><strong>A. PRELIMINARY OBJECTIONS:</strong></p>
<div style="margin-left:20px;white-space:pre-line;">{{preliminary_objections}}</div>
<p style="margin-top:20px;"><strong>B. REPLY ON MERITS:</strong></p>
<div style="margin-left:20px;white-space:pre-line;">{{reply_on_merits}}</div>
<div style="margin:28px 0;padding:16px;border:1px solid #1a1a1a;border-radius:4px;background:#f9f9f9;">
<p style="margin:0;font-weight:bold;text-align:center;text-decoration:underline;">PRAYER</p>
<p style="margin:10px 0 0 0;white-space:pre-line;">{{prayer}}</p>
</div>
<p><strong>Date:</strong> {{date}}</p>
<div style="margin-top:50px;display:flex;justify-content:space-between;">
<div><p>__________________________</p><p><strong>DEFENDANT</strong></p><p>({{defendant_name}})</p></div>
<div><p>__________________________</p><p><strong>{{advocate_name}}</strong><br>Advocate for Defendant</p></div>
</div>
</div>${F}`,
};

export const CRIMINAL_COMPLAINT: LegalTemplate = {
  id: "criminal_complaint",
  name: "Criminal Complaint",
  category: "Criminal",
  version: "v1.0",
  jurisdiction: "India",
  fields: [
    { name: "court_name", label: "Court Name", type: "text", required: true, group: "Court Details", placeholder: "Chief Judicial Magistrate, New Delhi" },
    { name: "complainant_name", label: "Complainant Name", type: "text", required: true, group: "Parties", placeholder: "Anita Verma" },
    { name: "complainant_address", label: "Complainant Address", type: "textarea", required: true, group: "Parties", placeholder: "23, Saket, New Delhi – 110017" },
    { name: "accused_name", label: "Accused Name", type: "text", required: true, group: "Parties", placeholder: "Vikram Goyal" },
    { name: "accused_address", label: "Accused Address", type: "textarea", required: true, group: "Parties", placeholder: "78, Rohini, New Delhi – 110085" },
    { name: "facts", label: "Facts of the Complaint", type: "textarea", required: true, group: "Complaint Details", placeholder: "On [date], the accused approached the complainant and..." },
    { name: "offence_details", label: "Offences / Sections Invoked", type: "text", required: true, group: "Complaint Details", placeholder: "Sections 420, 406, 506 IPC" },
    { name: "prayer", label: "Prayer", type: "textarea", required: true, group: "Complaint Details", placeholder: "Take cognizance of the offence and issue process against the accused." },
    { name: "date", label: "Date", type: "date", required: true, group: "Complaint Details" },
  ],
  template: `<div style="font-family:'Times New Roman',Times,serif;line-height:1.8;color:#1a1a1a;text-align:justify;">
<div style="text-align:center;margin-bottom:32px;">
<h2 style="margin:0;text-transform:uppercase;font-weight:bold;font-size:14pt;">IN THE COURT OF {{court_name}}</h2>
<p style="margin-top:8px;text-decoration:underline;font-weight:bold;font-size:13pt;">CRIMINAL COMPLAINT</p>
<p style="margin-top:4px;font-size:10pt;">[Under Section 200 Cr.P.C.]</p>
</div>
<table style="width:100%;border-collapse:collapse;margin-bottom:8px;"><tr><td><strong>{{complainant_name}}</strong><br><span style="white-space:pre-line;">{{complainant_address}}</span></td><td style="text-align:right;vertical-align:top;"><em>...Complainant</em></td></tr></table>
<p style="text-align:center;font-weight:bold;margin:10px 0;">VERSUS</p>
<table style="width:100%;border-collapse:collapse;margin-bottom:24px;"><tr><td><strong>{{accused_name}}</strong><br><span style="white-space:pre-line;">{{accused_address}}</span></td><td style="text-align:right;vertical-align:top;"><em>...Accused</em></td></tr></table>
<p style="text-align:center;font-weight:bold;text-decoration:underline;margin:20px 0;">MOST RESPECTFULLY SHOWETH:</p>
<p><strong>1.</strong>&nbsp;&nbsp;That the complainant is a law-abiding citizen and is personally acquainted with the facts of the present complaint.</p>
<p><strong>2.</strong>&nbsp;&nbsp;That {{facts}}</p>
<p><strong>3.</strong>&nbsp;&nbsp;That by the aforesaid acts and omissions, the accused has committed cognizable offences punishable under <strong>{{offence_details}}</strong>, causing great loss, injury and hardship to the complainant.</p>
<p><strong>4.</strong>&nbsp;&nbsp;That the complainant has approached this Hon'ble Court as the last resort for justice.</p>
<div style="margin:28px 0;padding:16px;border:1px solid #1a1a1a;border-radius:4px;background:#f9f9f9;">
<p style="margin:0;font-weight:bold;text-align:center;text-decoration:underline;">PRAYER</p>
<p style="margin:10px 0 0 0;">It is therefore most respectfully prayed that this Hon'ble Court may be pleased to:</p>
<p style="margin:6px 0 0 16px;">i. Take cognizance of the offences committed by the accused;<br>ii. Issue summons / process against the accused;<br>iii. {{prayer}}</p>
</div>
<p><strong>Date:</strong> {{date}}</p>
<div style="margin-top:50px;text-align:right;"><p>__________________________</p><p><strong>COMPLAINANT</strong></p><p>({{complainant_name}})</p></div>
</div>${F}`,
};

export const ANTICIPATORY_BAIL: LegalTemplate = {
  id: "anticipatory_bail",
  name: "Anticipatory Bail (Sec 438)",
  category: "Criminal",
  version: "v1.0",
  jurisdiction: "India",
  fields: [
    { name: "court_name", label: "Court Name", type: "text", required: true, group: "Court Details", placeholder: "Sessions Judge, New Delhi" },
    { name: "case_number", label: "Case / FIR Number (if any)", type: "text", required: false, group: "Court Details", placeholder: "FIR No. 456/2024, P.S. Vasant Kunj" },
    { name: "applicant_name", label: "Applicant Name", type: "text", required: true, group: "Applicant Details", placeholder: "Mohan Lal" },
    { name: "applicant_address", label: "Applicant Address", type: "textarea", required: true, group: "Applicant Details", placeholder: "56, Vasant Vihar, New Delhi – 110057" },
    { name: "advocate_name", label: "Advocate Name", type: "text", required: true, group: "Applicant Details", placeholder: "Adv. Ritu Kapoor" },
    { name: "facts", label: "Relevant Facts", type: "textarea", required: true, group: "Case Details", placeholder: "The applicant is named in a complaint filed by... The allegations made are false and motivated..." },
    { name: "apprehension", label: "Grounds of Apprehension", type: "textarea", required: true, group: "Case Details", placeholder: "The applicant apprehends arrest in connection with FIR No. [xxx] as the police have been pressured by the complainant..." },
    { name: "grounds", label: "Grounds for Anticipatory Bail", type: "textarea", required: true, group: "Case Details", placeholder: "i. The applicant has a clean antecedent.\nii. The allegations are false and motivated.\niii. The applicant is fully cooperating with the investigation." },
    { name: "date", label: "Date", type: "date", required: true, group: "Case Details" },
  ],
  template: `<div style="font-family:'Times New Roman',Times,serif;line-height:1.8;color:#1a1a1a;text-align:justify;">
<div style="text-align:center;margin-bottom:32px;">
<h2 style="margin:0;text-transform:uppercase;font-weight:bold;font-size:14pt;">IN THE COURT OF {{court_name}}</h2>
<p style="margin-top:8px;text-decoration:underline;font-weight:bold;font-size:13pt;">APPLICATION UNDER SECTION 438 OF THE CODE OF CRIMINAL PROCEDURE, 1973</p>
<p style="margin-top:4px;font-size:10pt;">[For Grant of Anticipatory Bail]</p>
<p style="margin-top:4px;font-size:10pt;">In the matter of: <strong>{{case_number}}</strong></p>
</div>
<table style="width:100%;border-collapse:collapse;margin-bottom:24px;"><tr><td><strong>{{applicant_name}}</strong><br><span style="white-space:pre-line;">{{applicant_address}}</span></td><td style="text-align:right;vertical-align:top;"><em>...Applicant</em></td></tr></table>
<p style="text-align:center;font-weight:bold;text-decoration:underline;margin:20px 0;">MOST RESPECTFULLY SHOWETH:</p>
<p><strong>1.</strong>&nbsp;&nbsp;That the applicant apprehends arrest in connection with a case and hence approaches this Hon'ble Court for grant of anticipatory bail under Section 438 Cr.P.C.</p>
<p><strong>2.</strong>&nbsp;&nbsp;That {{facts}}</p>
<p><strong>3.</strong>&nbsp;&nbsp;That {{apprehension}}</p>
<p><strong>4.</strong>&nbsp;&nbsp;That the applicant is a respectable citizen, has deep roots in society and is not likely to flee or tamper with evidence.</p>
<p><strong>5.</strong>&nbsp;&nbsp;That the applicant undertakes to make himself available for interrogation as and when required.</p>
<p style="margin-top:20px;"><strong>GROUNDS:</strong></p>
<div style="margin-left:20px;white-space:pre-line;">{{grounds}}</div>
<div style="margin:28px 0;padding:16px;border:1px solid #1a1a1a;border-radius:4px;background:#f9f9f9;">
<p style="margin:0;font-weight:bold;text-align:center;text-decoration:underline;">PRAYER</p>
<p style="margin:10px 0 0 0;">It is therefore most respectfully prayed that this Hon'ble Court may be pleased to direct that in the event of arrest of the applicant, he be released on bail, in the interest of justice.</p>
<p style="margin:8px 0 0 0;text-align:center;font-style:italic;">AND FOR THIS ACT OF KINDNESS, THE APPLICANT SHALL EVER PRAY.</p>
</div>
<div style="margin-top:40px;"><p>Filed by:</p><p><strong>{{advocate_name}}</strong><br>Advocate</p><p><strong>Date:</strong> {{date}}</p></div>
</div>${F}`,
};

export const QUASHING_PETITION: LegalTemplate = {
  id: "quashing_petition",
  name: "Quashing Petition (Sec 482)",
  category: "Criminal",
  version: "v1.0",
  jurisdiction: "India",
  fields: [
    { name: "court_name", label: "High Court Name", type: "text", required: true, group: "Court Details", placeholder: "Delhi" },
    { name: "petition_number", label: "Petition Number", type: "text", required: false, group: "Court Details", placeholder: "Crl. M.C. No. ___ / 2024" },
    { name: "petitioner", label: "Petitioner Name", type: "text", required: true, group: "Parties", placeholder: "Rahul Jain" },
    { name: "petitioner_address", label: "Petitioner Address", type: "textarea", required: true, group: "Parties", placeholder: "34, Civil Lines, New Delhi" },
    { name: "respondent1", label: "Respondent 1", type: "text", required: true, group: "Parties", placeholder: "State (NCT of Delhi)" },
    { name: "respondent2", label: "Respondent 2 (Complainant)", type: "text", required: false, group: "Parties", placeholder: "Deepak Sharma" },
    { name: "fir_details", label: "FIR Details", type: "text", required: true, group: "Case Details", placeholder: "FIR No. 234/2023, U/s 420/406 IPC, P.S. Saket" },
    { name: "facts", label: "Facts of the Case", type: "textarea", required: true, group: "Case Details", placeholder: "The petitioner is falsely implicated in FIR No. ... registered at P.S. ..." },
    { name: "grounds", label: "Grounds for Quashing", type: "textarea", required: true, group: "Case Details", placeholder: "i. The FIR is an abuse of the process of law.\nii. No cognizable offence is made out.\niii. The matter is purely civil in nature." },
    { name: "prayer", label: "Prayer", type: "textarea", required: true, group: "Case Details", placeholder: "Quash the FIR No. [xxx] and all proceedings arising therefrom." },
    { name: "advocate_name", label: "Advocate Name", type: "text", required: true, group: "Case Details", placeholder: "Adv. Neha Sharma" },
    { name: "date", label: "Date", type: "date", required: true, group: "Case Details" },
  ],
  template: `<div style="font-family:'Times New Roman',Times,serif;line-height:1.8;color:#1a1a1a;text-align:justify;">
<div style="text-align:center;margin-bottom:32px;">
<h2 style="margin:0;text-transform:uppercase;font-weight:bold;font-size:14pt;">IN THE HIGH COURT OF {{court_name}}</h2>
<p style="margin-top:4px;font-size:11pt;">(Criminal Jurisdiction)</p>
<p style="margin-top:8px;text-decoration:underline;font-weight:bold;font-size:13pt;">PETITION UNDER SECTION 482 OF THE CODE OF CRIMINAL PROCEDURE, 1973</p>
<p style="margin-top:4px;"><strong>{{petition_number}}</strong></p>
<p style="margin-top:4px;font-size:10pt;">In the matter of: <strong>{{fir_details}}</strong></p>
</div>
<table style="width:100%;border-collapse:collapse;margin-bottom:8px;"><tr><td><strong>{{petitioner}}</strong><br><span style="white-space:pre-line;">{{petitioner_address}}</span></td><td style="text-align:right;vertical-align:top;"><em>...Petitioner</em></td></tr></table>
<p style="text-align:center;font-weight:bold;margin:10px 0;">VERSUS</p>
<table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
<tr><td><strong>{{respondent1}}</strong></td><td style="text-align:right;"><em>...Respondent No. 1</em></td></tr>
<tr><td><strong>{{respondent2}}</strong></td><td style="text-align:right;"><em>...Respondent No. 2</em></td></tr>
</table>
<p style="text-align:center;font-weight:bold;text-decoration:underline;margin:20px 0;">MOST RESPECTFULLY SHOWETH:</p>
<p>{{facts}}</p>
<p style="margin-top:20px;"><strong>GROUNDS:</strong></p>
<div style="margin-left:20px;white-space:pre-line;">{{grounds}}</div>
<div style="margin:28px 0;padding:16px;border:1px solid #1a1a1a;border-radius:4px;background:#f9f9f9;">
<p style="margin:0;font-weight:bold;text-align:center;text-decoration:underline;">PRAYER</p>
<p style="margin:10px 0 0 0;white-space:pre-line;">{{prayer}}</p>
</div>
<div style="margin-top:40px;"><p>Filed by:</p><p><strong>{{advocate_name}}</strong><br>Advocate for Petitioner</p><p><strong>Date:</strong> {{date}}</p></div>
</div>${F}`,
};
