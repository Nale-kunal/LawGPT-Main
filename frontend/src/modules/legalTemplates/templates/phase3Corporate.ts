import { LegalTemplate } from "./index";

const F = `<div style="margin-top:48px;padding-top:16px;border-top:1px solid #d1d5db;font-family:'Times New Roman',Times,serif;font-size:10pt;color:#6b7280;text-align:center;font-style:italic;">Note: This is a draft generated for assistance purposes only. Final review by a qualified legal professional is advised before use in any legal proceeding.</div>`;

export const SERVICE_AGREEMENT: LegalTemplate = {
  id: "service_agreement",
  name: "Service Agreement",
  category: "Corporate",
  version: "v1.0",
  jurisdiction: "India",
  fields: [
    { name: "date", label: "Agreement Date", type: "date", required: true, group: "Agreement Details" },
    { name: "service_provider", label: "Service Provider Name", type: "text", required: true, group: "Agreement Details", placeholder: "ABC Consultants Pvt. Ltd." },
    { name: "provider_address", label: "Service Provider Address", type: "textarea", required: true, group: "Agreement Details", placeholder: "Plot 12, Sector 44, Gurugram, Haryana – 122003" },
    { name: "client", label: "Client Name", type: "text", required: true, group: "Agreement Details", placeholder: "XYZ Enterprises Ltd." },
    { name: "client_address", label: "Client Address", type: "textarea", required: true, group: "Agreement Details", placeholder: "7, Connaught Place, New Delhi – 110001" },
    { name: "services", label: "Description of Services", type: "textarea", required: true, group: "Service Details", placeholder: "IT consulting, software development, and project management services as mutually agreed..." },
    { name: "payment_terms", label: "Payment Terms", type: "textarea", required: true, group: "Service Details", placeholder: "₹1,50,000/- per month, payable within 15 days of invoice." },
    { name: "duration", label: "Term / Duration", type: "text", required: true, group: "Service Details", placeholder: "12 (Twelve) months from the date of this Agreement" },
    { name: "termination", label: "Termination Clause", type: "textarea", required: true, group: "Service Details", placeholder: "Either party may terminate this Agreement by giving 30 days' written notice." },
    { name: "jurisdiction", label: "Governing Jurisdiction", type: "text", required: true, group: "Service Details", placeholder: "Gurugram, Haryana" },
  ],
  template: `<div style="font-family:'Times New Roman',Times,serif;line-height:1.8;color:#1a1a1a;text-align:justify;">
<div style="text-align:center;margin-bottom:32px;"><h2 style="margin:0;text-transform:uppercase;text-decoration:underline;font-weight:bold;font-size:16pt;letter-spacing:2px;">SERVICE AGREEMENT</h2></div>
<p>This Service Agreement (the <strong>"Agreement"</strong>) is entered into on <strong>{{date}}</strong> between:</p>
<p><strong>{{service_provider}}</strong>, having its address at <span style="white-space:pre-line;">{{provider_address}}</span> (hereinafter the <strong>"Service Provider"</strong>)</p>
<p style="text-align:center;font-weight:bold;">AND</p>
<p><strong>{{client}}</strong>, having its address at <span style="white-space:pre-line;">{{client_address}}</span> (hereinafter the <strong>"Client"</strong>).</p>
<hr style="margin:20px 0;border:none;border-top:1px solid #d1d5db;">
<p><strong>1. SERVICES</strong></p>
<p>The Service Provider agrees to render the following services to the Client: <span style="white-space:pre-line;">{{services}}</span></p>
<p><strong>2. PAYMENT</strong></p>
<p style="white-space:pre-line;">{{payment_terms}}</p>
<p><strong>3. TERM</strong></p>
<p>This Agreement shall be in force for <strong>{{duration}}</strong>, unless earlier terminated in accordance with the terms hereof.</p>
<p><strong>4. TERMINATION</strong></p>
<p style="white-space:pre-line;">{{termination}}</p>
<p><strong>5. GOVERNING LAW & JURISDICTION</strong></p>
<p>This Agreement shall be governed by the laws of India. Courts at <strong>{{jurisdiction}}</strong> shall have exclusive jurisdiction.</p>
<p style="margin-top:32px;"><strong>IN WITNESS WHEREOF</strong>, the parties have executed this Agreement on the date first above written.</p>
<div style="margin-top:60px;display:flex;justify-content:space-between;">
<div style="text-align:center;flex:1;"><p>__________________________</p><p><strong>{{service_provider}}</strong></p><p>Service Provider</p><p>Date: ____________</p></div>
<div style="text-align:center;flex:1;"><p>__________________________</p><p><strong>{{client}}</strong></p><p>Client</p><p>Date: ____________</p></div>
</div>
</div>${F}`,
};

export const EMPLOYMENT_AGREEMENT: LegalTemplate = {
  id: "employment_agreement",
  name: "Employment Agreement",
  category: "Corporate",
  version: "v1.0",
  jurisdiction: "India",
  fields: [
    { name: "date", label: "Agreement Date", type: "date", required: true, group: "Agreement Details" },
    { name: "company_name", label: "Company Name", type: "text", required: true, group: "Agreement Details", placeholder: "Innovate Tech Pvt. Ltd." },
    { name: "company_address", label: "Company Address", type: "textarea", required: true, group: "Agreement Details", placeholder: "Tower B, Cyber City, Gurugram – 122002" },
    { name: "employee_name", label: "Employee Full Name", type: "text", required: true, group: "Employee Details", placeholder: "Sneha Patel" },
    { name: "employee_address", label: "Employee Address", type: "textarea", required: true, group: "Employee Details", placeholder: "Flat 5B, Sector 57, Gurugram – 122011" },
    { name: "designation", label: "Designation / Title", type: "text", required: true, group: "Employment Details", placeholder: "Senior Software Engineer" },
    { name: "department", label: "Department", type: "text", required: false, group: "Employment Details", placeholder: "Engineering" },
    { name: "start_date", label: "Date of Joining", type: "date", required: true, group: "Employment Details" },
    { name: "salary", label: "Salary / CTC", type: "text", required: true, group: "Employment Details", placeholder: "₹15,00,000/- per annum (CTC)" },
    { name: "duties", label: "Key Duties & Responsibilities", type: "textarea", required: true, group: "Employment Details", placeholder: "i. Design and develop software solutions.\nii. Lead a team of junior developers.\niii. Collaborate with cross-functional teams." },
    { name: "termination", label: "Termination / Notice Period", type: "textarea", required: true, group: "Employment Details", placeholder: "Either party may terminate by giving 60 days' prior written notice. During probation, 15 days' notice is required." },
    { name: "confidentiality", label: "Confidentiality Obligations", type: "textarea", required: false, group: "Employment Details", placeholder: "The employee shall not disclose any confidential or proprietary information of the company during or after employment." },
  ],
  template: `<div style="font-family:'Times New Roman',Times,serif;line-height:1.8;color:#1a1a1a;text-align:justify;">
<div style="text-align:center;margin-bottom:32px;"><h2 style="margin:0;text-transform:uppercase;text-decoration:underline;font-weight:bold;font-size:16pt;letter-spacing:2px;">EMPLOYMENT AGREEMENT</h2></div>
<p>This Employment Agreement (the <strong>"Agreement"</strong>) is made on <strong>{{date}}</strong> between:</p>
<p><strong>{{company_name}}</strong>, a company incorporated under the Companies Act, having its registered office at <span style="white-space:pre-line;">{{company_address}}</span> (hereinafter the <strong>"Company"</strong>)</p>
<p style="text-align:center;font-weight:bold;">AND</p>
<p><strong>{{employee_name}}</strong>, residing at <span style="white-space:pre-line;">{{employee_address}}</span> (hereinafter the <strong>"Employee"</strong>).</p>
<hr style="margin:20px 0;border:none;border-top:1px solid #d1d5db;">
<p><strong>1. POSITION & COMMENCEMENT</strong></p>
<p>The Company hereby appoints the Employee as <strong>{{designation}}</strong> in the <strong>{{department}}</strong> department, effective from <strong>{{start_date}}</strong>.</p>
<p><strong>2. REMUNERATION</strong></p>
<p>The Employee shall be entitled to a gross salary / CTC of <strong>{{salary}}</strong>, subject to applicable deductions as per law.</p>
<p><strong>3. DUTIES & RESPONSIBILITIES</strong></p>
<div style="white-space:pre-line;margin-left:16px;">{{duties}}</div>
<p><strong>4. TERMINATION</strong></p>
<p style="white-space:pre-line;">{{termination}}</p>
<p><strong>5. CONFIDENTIALITY</strong></p>
<p style="white-space:pre-line;">{{confidentiality}}</p>
<p><strong>6. GOVERNING LAW</strong></p>
<p>This Agreement shall be governed by the laws of India. Any dispute shall be subject to the jurisdiction of courts in the city where the Company's registered office is located.</p>
<p style="margin-top:32px;"><strong>IN WITNESS WHEREOF</strong>, the parties have executed this Agreement as of the date first above written.</p>
<div style="margin-top:60px;display:flex;justify-content:space-between;">
<div style="text-align:center;flex:1;"><p>__________________________</p><p><strong>{{company_name}}</strong></p><p>Authorised Signatory</p></div>
<div style="text-align:center;flex:1;"><p>__________________________</p><p><strong>{{employee_name}}</strong></p><p>Employee</p></div>
</div>
</div>${F}`,
};

export const AGREEMENT_TO_SELL: LegalTemplate = {
  id: "agreement_to_sell",
  name: "Agreement to Sell",
  category: "Property",
  version: "v1.0",
  jurisdiction: "India",
  fields: [
    { name: "date", label: "Agreement Date", type: "date", required: true, group: "Agreement Details" },
    { name: "seller", label: "Seller Name", type: "text", required: true, group: "Parties", placeholder: "Harish Malhotra" },
    { name: "seller_address", label: "Seller Address", type: "textarea", required: true, group: "Parties", placeholder: "22, Palam Vihar, Gurugram" },
    { name: "buyer", label: "Buyer Name", type: "text", required: true, group: "Parties", placeholder: "Deepak Mehta" },
    { name: "buyer_address", label: "Buyer Address", type: "textarea", required: true, group: "Parties", placeholder: "5, DLF Phase 2, Gurugram" },
    { name: "property_details", label: "Property Description", type: "textarea", required: true, group: "Property Details", placeholder: "Property bearing House No. 22A, measuring 200 sq. yds., situated at Sector 14, Gurugram, Haryana, bounded on..." },
    { name: "price", label: "Total Sale Price", type: "text", required: true, group: "Property Details", placeholder: "₹75,00,000/- (Rupees Seventy-Five Lakhs only)" },
    { name: "advance", label: "Advance / Earnest Money Paid", type: "text", required: true, group: "Property Details", placeholder: "₹5,00,000/- (Rupees Five Lakhs only) paid via Cheque No. [xxx]" },
    { name: "completion_date", label: "Sale Deed Execution Date", type: "date", required: true, group: "Property Details" },
    { name: "terms", label: "Special Terms & Conditions", type: "textarea", required: false, group: "Property Details", placeholder: "i. The seller shall clear all dues and encumbrances prior to execution of Sale Deed.\nii. The buyer shall pay the balance at the time of registration." },
  ],
  template: `<div style="font-family:'Times New Roman',Times,serif;line-height:1.8;color:#1a1a1a;text-align:justify;">
<div style="text-align:center;margin-bottom:32px;"><h2 style="margin:0;text-transform:uppercase;text-decoration:underline;font-weight:bold;font-size:16pt;letter-spacing:2px;">AGREEMENT TO SELL</h2></div>
<p>This Agreement to Sell is executed on <strong>{{date}}</strong> between:</p>
<p><strong>{{seller}}</strong>, residing at <span style="white-space:pre-line;">{{seller_address}}</span> (hereinafter the <strong>"Seller"</strong>)</p>
<p style="text-align:center;font-weight:bold;">AND</p>
<p><strong>{{buyer}}</strong>, residing at <span style="white-space:pre-line;">{{buyer_address}}</span> (hereinafter the <strong>"Buyer"</strong>).</p>
<hr style="margin:20px 0;border:none;border-top:1px solid #d1d5db;">
<p><strong>1. PROPERTY</strong></p>
<p style="white-space:pre-line;">{{property_details}}</p>
<p><strong>2. SALE PRICE</strong></p>
<p>The total agreed sale consideration for the said property is <strong>{{price}}</strong>.</p>
<p><strong>3. EARNEST MONEY</strong></p>
<p>The Buyer has paid an advance / earnest money of <strong>{{advance}}</strong>, the receipt whereof the Seller hereby acknowledges.</p>
<p><strong>4. EXECUTION OF SALE DEED</strong></p>
<p>The balance consideration shall be paid and the Sale Deed shall be executed and registered on or before <strong>{{completion_date}}</strong>.</p>
<p><strong>5. SELLER'S WARRANTIES</strong></p>
<p>The Seller warrants that the property is free from all encumbrances, charges, mortgages, claims, and disputes. The Seller shall provide all documents of title for verification.</p>
<p><strong>6. SPECIAL TERMS</strong></p>
<div style="white-space:pre-line;margin-left:16px;">{{terms}}</div>
<p style="margin-top:32px;"><strong>IN WITNESS WHEREOF</strong>, the parties have signed this Agreement on the day and year first above written.</p>
<div style="margin-top:60px;display:flex;justify-content:space-between;">
<div style="text-align:center;flex:1;"><p>__________________________</p><p><strong>SELLER</strong></p><p>({{seller}})</p></div>
<div style="text-align:center;flex:1;"><p>__________________________</p><p><strong>BUYER</strong></p><p>({{buyer}})</p></div>
</div>
</div>${F}`,
};

export const SALE_DEED: LegalTemplate = {
  id: "sale_deed",
  name: "Sale Deed",
  category: "Property",
  version: "v1.0",
  jurisdiction: "India",
  fields: [
    { name: "date", label: "Execution Date", type: "date", required: true, group: "Parties" },
    { name: "seller", label: "Seller Full Name", type: "text", required: true, group: "Parties", placeholder: "Harish Malhotra" },
    { name: "seller_father", label: "Seller Father's Name", type: "text", required: true, group: "Parties", placeholder: "Ramesh Malhotra" },
    { name: "seller_address", label: "Seller Address", type: "textarea", required: true, group: "Parties", placeholder: "22, Palam Vihar, Gurugram" },
    { name: "buyer", label: "Buyer Full Name", type: "text", required: true, group: "Parties", placeholder: "Deepak Mehta" },
    { name: "buyer_father", label: "Buyer Father's Name", type: "text", required: true, group: "Parties", placeholder: "Suresh Mehta" },
    { name: "buyer_address", label: "Buyer Address", type: "textarea", required: true, group: "Parties", placeholder: "5, DLF Phase 2, Gurugram" },
    { name: "property", label: "Property Description", type: "textarea", required: true, group: "Property Details", placeholder: "All that piece and parcel of land measuring [xxx] sq. yds. bearing Khasra No. [xxx]..." },
    { name: "consideration", label: "Sale Consideration (Amount)", type: "text", required: true, group: "Property Details", placeholder: "₹75,00,000/- (Rupees Seventy-Five Lakhs only)" },
    { name: "payment_mode", label: "Mode of Payment", type: "text", required: true, group: "Property Details", placeholder: "RTGS / Cheque No. [xxx] drawn on [Bank]" },
  ],
  template: `<div style="font-family:'Times New Roman',Times,serif;line-height:1.8;color:#1a1a1a;text-align:justify;">
<div style="text-align:center;margin-bottom:32px;"><h2 style="margin:0;text-transform:uppercase;text-decoration:underline;font-weight:bold;font-size:16pt;letter-spacing:2px;">SALE DEED</h2></div>
<p>THIS SALE DEED is executed on this <strong>{{date}}</strong> by and between:</p>
<p><strong>{{seller}}</strong>, S/o <strong>{{seller_father}}</strong>, residing at <span style="white-space:pre-line;">{{seller_address}}</span> (hereinafter referred to as the <strong>"Vendor/Seller"</strong>, which expression shall include his heirs, executors, administrators, legal representatives, and assigns)</p>
<p style="text-align:center;font-weight:bold;">IN FAVOUR OF</p>
<p><strong>{{buyer}}</strong>, S/o <strong>{{buyer_father}}</strong>, residing at <span style="white-space:pre-line;">{{buyer_address}}</span> (hereinafter referred to as the <strong>"Purchaser/Buyer"</strong>, which expression shall include his heirs, executors, administrators, legal representatives, and assigns)</p>
<hr style="margin:20px 0;border:none;border-top:1px solid #d1d5db;">
<p><strong>WHEREAS</strong> the Vendor is the absolute owner of the property described hereunder, free from all encumbrances, charges, and liabilities.</p>
<p><strong>1. DESCRIPTION OF PROPERTY</strong></p>
<p style="white-space:pre-line;">{{property}}</p>
<p><strong>2. CONSIDERATION</strong></p>
<p>In consideration of the sum of <strong>{{consideration}}</strong>, paid by the Purchaser to the Vendor before the execution of these presents by way of <strong>{{payment_mode}}</strong>, the receipt and adequacy whereof the Vendor hereby acknowledges, the Vendor hereby sells, transfers, and conveys the above described property unto and to the use of the Purchaser absolutely and forever.</p>
<p><strong>3. POSSESSION</strong></p>
<p>The Vendor has this day delivered actual, physical, and vacant possession of the said property to the Purchaser, who has accepted the same.</p>
<p><strong>4. WARRANTY OF TITLE</strong></p>
<p>The Vendor warrants that the property is free from all encumbrances, mortgages, charges, liens, claims, or any other liability. The Vendor shall do and execute all such acts and deeds as may be necessary for perfecting the title of the Purchaser.</p>
<p style="margin-top:32px;"><strong>IN WITNESS WHEREOF</strong>, the parties have executed this Sale Deed on the day, month and year first above written.</p>
<p style="margin-top:16px;"><strong>WITNESSES:</strong></p>
<div style="margin-top:60px;display:flex;justify-content:space-between;gap:40px;">
<div style="flex:1;"><p>1. ______________________</p><p>2. ______________________</p></div>
<div style="text-align:center;flex:1;"><p>__________________________</p><p><strong>VENDOR</strong></p><p>({{seller}})</p></div>
<div style="text-align:center;flex:1;"><p>__________________________</p><p><strong>PURCHASER</strong></p><p>({{buyer}})</p></div>
</div>
</div>${F}`,
};

export const DIVORCE_PETITION: LegalTemplate = {
  id: "divorce_petition",
  name: "Divorce Petition",
  category: "Family",
  version: "v1.0",
  jurisdiction: "India",
  fields: [
    { name: "court_name", label: "Family Court / Court Name", type: "text", required: true, group: "Court Details", placeholder: "Principal Judge, Family Court, New Delhi" },
    { name: "petition_number", label: "Petition Number", type: "text", required: false, group: "Court Details", placeholder: "HMA No. ___ / 2024" },
    { name: "petitioner_name", label: "Petitioner Name", type: "text", required: true, group: "Petitioner Details", placeholder: "Rohit Sharma" },
    { name: "petitioner_address", label: "Petitioner Address", type: "textarea", required: true, group: "Petitioner Details", placeholder: "12, Mayur Vihar Phase 1, Delhi – 110091" },
    { name: "respondent_name", label: "Respondent (Spouse) Name", type: "text", required: true, group: "Respondent Details", placeholder: "Priya Sharma" },
    { name: "respondent_address", label: "Respondent Address", type: "textarea", required: true, group: "Respondent Details", placeholder: "56, Laxmi Nagar, Delhi – 110092" },
    { name: "marriage_date", label: "Date of Marriage", type: "date", required: true, group: "Marriage Details", placeholder: "" },
    { name: "marriage_place", label: "Place of Marriage", type: "text", required: true, group: "Marriage Details", placeholder: "New Delhi" },
    { name: "marriage_act", label: "Law Governing Marriage", type: "text", required: true, group: "Marriage Details", placeholder: "Hindu Marriage Act, 1955" },
    { name: "children_details", label: "Children Details (if any)", type: "text", required: false, group: "Marriage Details", placeholder: "No children / One child, Aryan, aged 5 years" },
    { name: "grounds", label: "Grounds for Divorce", type: "textarea", required: true, group: "Grounds & Prayer", placeholder: "i. Cruelty (Section 13(1)(ia)): The respondent has treated the petitioner with cruelty...\nii. Desertion (Section 13(1)(ib)): The respondent deserted the petitioner since..." },
    { name: "prayer", label: "Prayer / Reliefs Sought", type: "textarea", required: true, group: "Grounds & Prayer", placeholder: "i. Decree of divorce dissolving the marriage.\nii. Custody of minor children.\niii. Permanent alimony." },
    { name: "advocate_name", label: "Advocate Name", type: "text", required: true, group: "Grounds & Prayer", placeholder: "Adv. Kavita Rao" },
    { name: "date", label: "Date of Filing", type: "date", required: true, group: "Grounds & Prayer" },
  ],
  template: `<div style="font-family:'Times New Roman',Times,serif;line-height:1.8;color:#1a1a1a;text-align:justify;">
<div style="text-align:center;margin-bottom:32px;">
<h2 style="margin:0;text-transform:uppercase;font-weight:bold;font-size:14pt;">IN THE COURT OF {{court_name}}</h2>
<p style="margin-top:6px;"><strong>{{petition_number}}</strong></p>
<p style="margin-top:8px;text-decoration:underline;font-weight:bold;font-size:13pt;">PETITION FOR DIVORCE</p>
<p style="margin-top:4px;font-size:10pt;">[Under <strong>{{marriage_act}}</strong>]</p>
</div>
<table style="width:100%;border-collapse:collapse;margin-bottom:8px;"><tr><td><strong>{{petitioner_name}}</strong><br><span style="white-space:pre-line;">{{petitioner_address}}</span></td><td style="text-align:right;vertical-align:top;"><em>...Petitioner</em></td></tr></table>
<p style="text-align:center;font-weight:bold;margin:10px 0;">VERSUS</p>
<table style="width:100%;border-collapse:collapse;margin-bottom:24px;"><tr><td><strong>{{respondent_name}}</strong><br><span style="white-space:pre-line;">{{respondent_address}}</span></td><td style="text-align:right;vertical-align:top;"><em>...Respondent</em></td></tr></table>
<p style="text-align:center;font-weight:bold;text-decoration:underline;margin:20px 0;">MOST RESPECTFULLY SHOWETH:</p>
<p><strong>1.</strong>&nbsp;&nbsp;That the petitioner and the respondent were married on <strong>{{marriage_date}}</strong> at <strong>{{marriage_place}}</strong> according to the rites and ceremonies prescribed under <strong>{{marriage_act}}</strong>.</p>
<p><strong>2.</strong>&nbsp;&nbsp;That the marriage was duly solemnised and the parties cohabited together as husband and wife.</p>
<p><strong>3.</strong>&nbsp;&nbsp;That from the said wedlock, the following children were born: <strong>{{children_details}}</strong>.</p>
<p><strong>4.</strong>&nbsp;&nbsp;That the marriage has broken down irretrievably due to the following grounds:</p>
<div style="margin-left:20px;white-space:pre-line;margin-top:8px;">{{grounds}}</div>
<p style="margin-top:16px;"><strong>5.</strong>&nbsp;&nbsp;That the petitioner has not in any manner condoned, connived at, or been accessory to the acts of the respondent referred to above.</p>
<p><strong>6.</strong>&nbsp;&nbsp;That this Hon'ble Court has jurisdiction to entertain and try this petition as the parties last resided together within the jurisdiction of this court.</p>
<div style="margin:28px 0;padding:16px;border:1px solid #1a1a1a;border-radius:4px;background:#f9f9f9;">
<p style="margin:0;font-weight:bold;text-align:center;text-decoration:underline;">PRAYER</p>
<p style="margin:10px 0 0 0;">It is therefore most respectfully prayed that this Hon'ble Court may be pleased to:</p>
<div style="white-space:pre-line;margin-left:16px;margin-top:8px;">{{prayer}}</div>
<p style="margin:10px 0 0 0;text-align:center;font-style:italic;">AND FOR THIS ACT OF KINDNESS, THE PETITIONER SHALL EVER PRAY.</p>
</div>
<div style="margin-top:40px;"><p>Filed by:</p><p><strong>{{advocate_name}}</strong><br>Advocate for Petitioner</p><p><strong>Date:</strong> {{date}}</p></div>
</div>${F}`,
};

export const MAINTENANCE_PETITION: LegalTemplate = {
  id: "maintenance_petition",
  name: "Maintenance Petition (Sec 125)",
  category: "Family",
  version: "v1.0",
  jurisdiction: "India",
  fields: [
    { name: "court_name", label: "Court Name", type: "text", required: true, group: "Court Details", placeholder: "Chief Judicial Magistrate, New Delhi" },
    { name: "applicant", label: "Applicant Name", type: "text", required: true, group: "Parties", placeholder: "Priya Sharma" },
    { name: "applicant_address", label: "Applicant Address", type: "textarea", required: true, group: "Parties", placeholder: "23, Rohini, Delhi – 110085" },
    { name: "respondent", label: "Respondent Name", type: "text", required: true, group: "Parties", placeholder: "Rohit Sharma" },
    { name: "respondent_address", label: "Respondent Address", type: "textarea", required: true, group: "Parties", placeholder: "45, Pitampura, Delhi – 110034" },
    { name: "relationship", label: "Relationship of Applicant", type: "text", required: true, group: "Application Details", placeholder: "Wife / Minor Child / Aged Parent" },
    { name: "facts", label: "Facts of the Case", type: "textarea", required: true, group: "Application Details", placeholder: "The parties were married on [date]. The respondent has deserted the applicant without reasonable cause..." },
    { name: "income_details", label: "Income / Financial Details", type: "textarea", required: true, group: "Application Details", placeholder: "The respondent is employed as a [designation] earning approx. ₹[x] per month. The applicant has no independent income..." },
    { name: "maintenance_amount", label: "Maintenance Amount Claimed", type: "text", required: true, group: "Application Details", placeholder: "₹25,000/- per month" },
    { name: "prayer", label: "Prayer", type: "textarea", required: true, group: "Application Details", placeholder: "Grant maintenance of ₹25,000/- per month to the applicant." },
    { name: "date", label: "Date", type: "date", required: true, group: "Application Details" },
  ],
  template: `<div style="font-family:'Times New Roman',Times,serif;line-height:1.8;color:#1a1a1a;text-align:justify;">
<div style="text-align:center;margin-bottom:32px;">
<h2 style="margin:0;text-transform:uppercase;font-weight:bold;font-size:14pt;">IN THE COURT OF {{court_name}}</h2>
<p style="margin-top:8px;text-decoration:underline;font-weight:bold;font-size:13pt;">APPLICATION UNDER SECTION 125 OF THE CODE OF CRIMINAL PROCEDURE, 1973</p>
<p style="margin-top:4px;font-size:10pt;">[For Grant of Maintenance]</p>
</div>
<table style="width:100%;border-collapse:collapse;margin-bottom:8px;"><tr><td><strong>{{applicant}}</strong> ({{relationship}})<br><span style="white-space:pre-line;">{{applicant_address}}</span></td><td style="text-align:right;vertical-align:top;"><em>...Applicant</em></td></tr></table>
<p style="text-align:center;font-weight:bold;margin:10px 0;">VERSUS</p>
<table style="width:100%;border-collapse:collapse;margin-bottom:24px;"><tr><td><strong>{{respondent}}</strong><br><span style="white-space:pre-line;">{{respondent_address}}</span></td><td style="text-align:right;vertical-align:top;"><em>...Respondent</em></td></tr></table>
<p style="text-align:center;font-weight:bold;text-decoration:underline;margin:20px 0;">MOST RESPECTFULLY SHOWETH:</p>
<p><strong>1.</strong>&nbsp;&nbsp;That {{facts}}</p>
<p><strong>2.</strong>&nbsp;&nbsp;That the respondent, despite having sufficient means, has neglected and refused to maintain the applicant, who is unable to maintain herself/himself.</p>
<p><strong>3. FINANCIAL DETAILS:</strong></p>
<div style="margin-left:16px;white-space:pre-line;">{{income_details}}</div>
<p style="margin-top:8px;"><strong>4.</strong>&nbsp;&nbsp;That the applicant is entitled to maintenance of <strong>{{maintenance_amount}}</strong> per month under Section 125 Cr.P.C.</p>
<div style="margin:28px 0;padding:16px;border:1px solid #1a1a1a;border-radius:4px;background:#f9f9f9;">
<p style="margin:0;font-weight:bold;text-align:center;text-decoration:underline;">PRAYER</p>
<p style="margin:10px 0 0 0;white-space:pre-line;">{{prayer}}</p>
</div>
<p><strong>Date:</strong> {{date}}</p>
<div style="margin-top:50px;text-align:right;"><p>__________________________</p><p><strong>APPLICANT</strong></p><p>({{applicant}})</p></div>
</div>${F}`,
};

export const POWER_OF_ATTORNEY: LegalTemplate = {
  id: "power_of_attorney",
  name: "Power of Attorney",
  category: "Misc",
  version: "v1.0",
  jurisdiction: "India",
  fields: [
    { name: "principal", label: "Principal (Grantor) Name", type: "text", required: true, group: "Principal Details", placeholder: "Vikram Singh" },
    { name: "principal_father", label: "Principal Father's Name", type: "text", required: true, group: "Principal Details", placeholder: "Ajit Singh" },
    { name: "principal_address", label: "Principal Address", type: "textarea", required: true, group: "Principal Details", placeholder: "78, Greater Kailash, New Delhi – 110048" },
    { name: "agent", label: "Attorney / Agent Name", type: "text", required: true, group: "Agent Details", placeholder: "Sandeep Verma" },
    { name: "agent_father", label: "Agent Father's Name", type: "text", required: true, group: "Agent Details", placeholder: "Suresh Verma" },
    { name: "agent_address", label: "Agent Address", type: "textarea", required: true, group: "Agent Details", placeholder: "12, Defence Colony, New Delhi – 110024" },
    { name: "powers", label: "Powers Granted", type: "textarea", required: true, group: "Powers", placeholder: "i. To sell, transfer, and execute sale deeds for property No. [xxx].\nii. To receive sale proceeds on my behalf.\niii. To sign all documents, agreements, and deeds related to the above." },
    { name: "date", label: "Date", type: "date", required: true, group: "Powers" },
    { name: "place", label: "Place of Execution", type: "text", required: true, group: "Powers", placeholder: "New Delhi" },
  ],
  template: `<div style="font-family:'Times New Roman',Times,serif;line-height:1.8;color:#1a1a1a;text-align:justify;">
<div style="text-align:center;margin-bottom:32px;"><h2 style="margin:0;text-transform:uppercase;text-decoration:underline;font-weight:bold;font-size:16pt;letter-spacing:2px;">POWER OF ATTORNEY</h2></div>
<p>KNOW ALL MEN BY THESE PRESENTS that I, <strong>{{principal}}</strong>, S/o <strong>{{principal_father}}</strong>, residing at <span style="white-space:pre-line;">{{principal_address}}</span> (hereinafter referred to as the <strong>"Principal"</strong>), do hereby nominate, constitute, and appoint <strong>{{agent}}</strong>, S/o <strong>{{agent_father}}</strong>, residing at <span style="white-space:pre-line;">{{agent_address}}</span> (hereinafter referred to as the <strong>"Attorney"</strong>), as my true and lawful attorney to act in my name, place, and stead, and to do and execute the following acts:</p>
<p><strong>POWERS GRANTED:</strong></p>
<div style="margin-left:16px;white-space:pre-line;">{{powers}}</div>
<p style="margin-top:16px;">I hereby ratify and confirm all acts done by the said Attorney in pursuance of the powers hereby granted, as if the same were done by me personally.</p>
<p>This Power of Attorney shall remain in force until expressly revoked by me in writing.</p>
<p>Executed at <strong>{{place}}</strong> on this <strong>{{date}}</strong>.</p>
<div style="margin-top:60px;"><p>__________________________</p><p><strong>{{principal}}</strong></p><p>PRINCIPAL / GRANTOR</p></div>
<p style="margin-top:24px;"><strong>WITNESSES:</strong></p>
<p>1. ______________________&nbsp;&nbsp;&nbsp;&nbsp;2. ______________________</p>
</div>${F}`,
};

export const INDEMNITY_BOND: LegalTemplate = {
  id: "indemnity_bond",
  name: "Indemnity Bond",
  category: "Misc",
  version: "v1.0",
  jurisdiction: "India",
  fields: [
    { name: "date", label: "Date", type: "date", required: true, group: "Bond Details" },
    { name: "indemnifier", label: "Indemnifier Name", type: "text", required: true, group: "Bond Details", placeholder: "Arun Kumar" },
    { name: "indemnifier_address", label: "Indemnifier Address", type: "textarea", required: true, group: "Bond Details", placeholder: "34, Janakpuri, New Delhi – 110058" },
    { name: "beneficiary", label: "Beneficiary (Indemnified Party) Name", type: "text", required: true, group: "Bond Details", placeholder: "State Bank of India, Branch: Connaught Place" },
    { name: "liability", label: "Nature of Liability / Loss Covered", type: "textarea", required: true, group: "Bond Details", placeholder: "any loss, damage, cost, charges, or expenses that may be incurred due to the loss of original documents of property bearing No. [xxx]" },
    { name: "bond_amount", label: "Bond Amount", type: "text", required: false, group: "Bond Details", placeholder: "₹10,00,000/- (Rupees Ten Lakhs only)" },
  ],
  template: `<div style="font-family:'Times New Roman',Times,serif;line-height:1.8;color:#1a1a1a;text-align:justify;">
<div style="text-align:center;margin-bottom:32px;"><h2 style="margin:0;text-transform:uppercase;text-decoration:underline;font-weight:bold;font-size:16pt;letter-spacing:2px;">INDEMNITY BOND</h2></div>
<p>THIS INDEMNITY BOND is executed on <strong>{{date}}</strong> by <strong>{{indemnifier}}</strong>, residing at <span style="white-space:pre-line;">{{indemnifier_address}}</span> (hereinafter referred to as the <strong>"Indemnifier"</strong>) in favour of <strong>{{beneficiary}}</strong> (hereinafter referred to as the <strong>"Indemnified Party"</strong>).</p>
<p><strong>WHEREAS</strong>, the Indemnifier has requested the Indemnified Party to provide certain services / facilities / relief, and the Indemnified Party has agreed to do so subject to the Indemnifier executing this Indemnity Bond.</p>
<p><strong>NOW THIS DEED WITNESSETH</strong> that in consideration of the above, the Indemnifier hereby agrees and undertakes to indemnify and keep indemnified the Indemnified Party from and against <strong>{{liability}}</strong>.</p>
<p>The Indemnifier agrees that this indemnity shall extend to <strong>{{bond_amount}}</strong> and shall be absolute, unconditional, and irrevocable.</p>
<p>The Indemnifier shall on demand pay to the Indemnified Party all sums due under this bond without demur or protest.</p>
<p>Executed at the place and on the date first above written.</p>
<div style="margin-top:60px;"><p>__________________________</p><p><strong>{{indemnifier}}</strong></p><p>INDEMNIFIER</p></div>
<p style="margin-top:24px;"><strong>WITNESSES:</strong></p>
<p>1. ______________________&nbsp;&nbsp;&nbsp;&nbsp;2. ______________________</p>
</div>${F}`,
};

export const UNDERTAKING: LegalTemplate = {
  id: "undertaking",
  name: "Undertaking",
  category: "Misc",
  version: "v1.0",
  jurisdiction: "India",
  fields: [
    { name: "date", label: "Date", type: "date", required: true, group: "Undertaking Details" },
    { name: "person_name", label: "Name of Person Giving Undertaking", type: "text", required: true, group: "Undertaking Details", placeholder: "Mahesh Gupta" },
    { name: "father_name", label: "Father's Name", type: "text", required: true, group: "Undertaking Details", placeholder: "Rakesh Gupta" },
    { name: "address", label: "Address", type: "textarea", required: true, group: "Undertaking Details", placeholder: "12, Sector 62, Noida – 201301" },
    { name: "given_to", label: "Undertaking Given To", type: "text", required: true, group: "Undertaking Details", placeholder: "The Registrar, Delhi University / SBI Bank Manager" },
    { name: "statement", label: "Undertaking Statement", type: "textarea", required: true, group: "Undertaking Details", placeholder: "i. I will abide by all terms and conditions imposed.\nii. I will not indulge in any unlawful activity.\niii. I will report as and when required." },
    { name: "place", label: "Place", type: "text", required: true, group: "Undertaking Details", placeholder: "New Delhi" },
  ],
  template: `<div style="font-family:'Times New Roman',Times,serif;line-height:1.8;color:#1a1a1a;text-align:justify;">
<div style="text-align:center;margin-bottom:32px;"><h2 style="margin:0;text-transform:uppercase;text-decoration:underline;font-weight:bold;font-size:16pt;letter-spacing:2px;">UNDERTAKING</h2></div>
<p>I, <strong>{{person_name}}</strong>, S/o <strong>{{father_name}}</strong>, residing at <span style="white-space:pre-line;">{{address}}</span>, do hereby give this Undertaking to <strong>{{given_to}}</strong> and solemnly affirm as under:</p>
<div style="margin:20px 0;white-space:pre-line;margin-left:16px;">{{statement}}</div>
<p style="margin-top:16px;">I further undertake that the above statements are true and correct to the best of my knowledge and belief. I am fully aware that if any statement herein is found to be false, I shall be liable for appropriate legal action.</p>
<p>Executed at <strong>{{place}}</strong> on <strong>{{date}}</strong>.</p>
<div style="margin-top:60px;display:flex;justify-content:space-between;">
<div><p>__________________________</p><p><strong>{{person_name}}</strong></p><p>DEPONENT</p></div>
<div><p style="margin-top:0;">WITNESSES:</p><p>1. ______________________</p><p>2. ______________________</p></div>
</div>
</div>${F}`,
};

export const LEGAL_NOTICE_RECOVERY: LegalTemplate = {
  id: "legal_notice_recovery",
  name: "Legal Notice (Money Recovery)",
  category: "Civil",
  version: "v1.0",
  jurisdiction: "India",
  fields: [
    { name: "advocate_name", label: "Advocate Name", type: "text", required: true, group: "Advocate Details", placeholder: "Adv. Ramesh Kumar" },
    { name: "advocate_address", label: "Advocate Address", type: "textarea", required: true, group: "Advocate Details", placeholder: "Chamber 12, District Court, New Delhi" },
    { name: "client_name", label: "Client Name", type: "text", required: true, group: "Client Details", placeholder: "Suresh Gupta" },
    { name: "client_address", label: "Client Address", type: "textarea", required: true, group: "Client Details", placeholder: "45, Lajpat Nagar, New Delhi" },
    { name: "recipient_name", label: "Recipient Name", type: "text", required: true, group: "Opponent Details", placeholder: "Anil Sharma" },
    { name: "recipient_address", label: "Recipient Address", type: "textarea", required: true, group: "Opponent Details", placeholder: "88, Saket, New Delhi" },
    { name: "amount", label: "Amount Due (in words & figures)", type: "text", required: true, group: "Recovery Details", placeholder: "₹3,50,000/- (Rupees Three Lakh Fifty Thousand only)" },
    { name: "loan_date", label: "Date of Loan / Transaction", type: "date", required: true, group: "Recovery Details" },
    { name: "instrument", label: "Instrument (Cheque / Agreement / Bond)", type: "text", required: false, group: "Recovery Details", placeholder: "Cheque No. 123456 dated [date] drawn on [Bank]" },
    { name: "notice_period", label: "Notice Period (days)", type: "text", required: true, group: "Recovery Details", placeholder: "15" },
    { name: "interest_rate", label: "Interest Rate (% p.a.)", type: "text", required: false, group: "Recovery Details", placeholder: "18" },
    { name: "date", label: "Notice Date", type: "date", required: true, group: "Recovery Details" },
    { name: "place", label: "Place", type: "text", required: true, group: "Recovery Details", placeholder: "New Delhi" },
  ],
  template: `<div style="font-family:'Times New Roman',Times,serif;line-height:1.8;color:#1a1a1a;text-align:justify;">
<div style="text-align:center;margin-bottom:32px;"><h2 style="margin:0;text-transform:uppercase;text-decoration:underline;font-weight:bold;font-size:16pt;letter-spacing:2px;">LEGAL NOTICE</h2><p style="margin-top:6px;font-size:11pt;">(Money Recovery)</p></div>
<p><strong>Date:</strong> {{date}}</p>
<p><strong>From,</strong><br><strong>{{advocate_name}}</strong><br>Advocate<br><span style="white-space:pre-line;">{{advocate_address}}</span></p>
<p style="margin-top:16px;"><strong>To,</strong><br><strong>{{recipient_name}}</strong><br><span style="white-space:pre-line;">{{recipient_address}}</span></p>
<p style="margin-top:16px;"><strong>Subject: Legal Notice for Recovery of ₹{{amount}}</strong></p>
<p>Sir/Madam,</p>
<p>Under instructions and on behalf of my client <strong>{{client_name}}</strong>, residing at <span style="white-space:pre-line;">{{client_address}}</span>, I hereby serve this legal notice upon you:</p>
<p><strong>1.</strong>&nbsp;&nbsp;That on <strong>{{loan_date}}</strong>, you borrowed / received a sum of <strong>{{amount}}</strong> from my client, with a promise to repay the same along with interest.</p>
<p><strong>2.</strong>&nbsp;&nbsp;That the said amount was secured by <strong>{{instrument}}</strong>.</p>
<p><strong>3.</strong>&nbsp;&nbsp;That despite repeated demands and requests, you have failed and neglected to repay the said amount along with interest @ <strong>{{interest_rate}}%</strong> per annum.</p>
<p><strong>4.</strong>&nbsp;&nbsp;That the total amount outstanding as on date is <strong>{{amount}}</strong> plus interest accrued thereon.</p>
<div style="margin:24px 0;padding:16px;border-left:4px solid #1a1a1a;background:#f9f9f9;">
<p style="margin:0;font-weight:bold;">YOU ARE HEREBY CALLED UPON TO:</p>
<p style="margin:8px 0 0 0;">Pay the entire outstanding amount of <strong>{{amount}}</strong> along with interest thereon to my client within <strong>{{notice_period}} days</strong> from the receipt of this notice.</p>
</div>
<p>Failing which, my client shall be constrained to initiate appropriate legal proceedings including a suit for recovery and/or criminal action for dishonour of cheque under Section 138 NI Act, entirely at your risk and cost.</p>
<div style="margin-top:40px;"><p>Yours faithfully,</p><p><strong>{{advocate_name}}</strong><br>Advocate</p><p><strong>Place:</strong> {{place}}&nbsp;&nbsp;|&nbsp;&nbsp;<strong>Date:</strong> {{date}}</p></div>
</div>${F}`,
};
