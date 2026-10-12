# Dummy Visitor Data — Reception Flow Testing

8 fictional visitors for manually exercising the Reception intake form. All names,
passport numbers, emails, and phone numbers are made up. Documents are intentionally
left for you to upload per visitor (`applicableDocuments` lists which doc types each
one would need, matching `DOC_TYPE_OWNERS` in `document-service.ts`).

Phone fields use the form's `<dial code> <number>` format.

---

## 1. Employee — Work — South Africa

**Visitor Details**
- Passport No: `A1234567`
- Full Name: `Thabo Nkosi`
- Date of Birth: `1985-03-14`
- Gender: `Male`
- Nationality: `South African`
- Email: `thabo.nkosi@example.com`
- Phone: `+27 821234567`
- Emergency Contact Name: `Lindiwe Nkosi`
- Emergency Contact Phone: `+27 837654321`
- Employment Status: `Employee`

**Company Details**
- Company Name: `Anglo Gold Ashanti`
- Contact Name (Monthly): `Sipho Dlamini`
- Contact Email: `sipho.dlamini@example.com`
- Company Emergency Contact Name: `Nomvula Khumalo`
- Company Emergency Contact Tel: `+27 845551234`
- GMC Liaison Person: `Kwame Asante`
- GMC Liaison Dept: `Operations`

**Access Details**
- Access Purpose: `Work`
- Arrival Date: `2026-07-28`
- Departure Date: `2026-09-15`
- Reason for Request: `Long-term technical support for processing plant upgrade`
- Visa Type: `Work Visa`
- Access Level: `Operational Employee Access`
- Ghana Visa Required: `true`

**Site Support Requirements**
- Airport Pickup: `true`
- Transport To: `Kotoka International Airport`
- Transport From: `GMC Site Guesthouse`
- Accommodation Required: `true`
- Accommodation Confirmed: `true`
- Permanent Access Badge: `true`
- General Site Induction: `true`
- Other Inductions: `Confined space entry training`
- Bringing Equipment: `true`
- PPE Required: `true`
- IT Access Required: `true`
- Itinerary Attached: `true`
- Inflight Updated: `false`
- Remarks: `Return visitor, previously cleared in 2025`
- Applicable Documents: `passport_biodata, valid_visa, work_residence_permit, assignment_letter, insurance_proof`

---

## 2. Contractor — Work — Nigeria

**Visitor Details**
- Passport No: `B9876543`
- Full Name: `Chidinma Okafor`
- Date of Birth: `1990-11-02`
- Gender: `Female`
- Nationality: `Nigerian`
- Email: `chidinma.okafor@example.com`
- Phone: `+234 8031234567`
- Emergency Contact Name: `Emeka Okafor`
- Emergency Contact Phone: `+234 8059876543`
- Employment Status: `Contractor`

**Company Details**
- Company Name: `Weir Minerals Africa`
- Contact Name (Monthly): `Ifeanyi Umeh`
- Contact Email: `ifeanyi.umeh@example.com`
- Company Emergency Contact Name: `Ngozi Eze`
- Company Emergency Contact Tel: `+234 8021239876`
- GMC Liaison Person: `Yaw Boateng`
- GMC Liaison Dept: `Maintenance`

**Access Details**
- Access Purpose: `Work`
- Arrival Date: `2026-08-02`
- Departure Date: `2026-08-20`
- Reason for Request: `Installation and commissioning of pump equipment`
- Visa Type: `Business Visa`
- Access Level: `Contractor/Service Personnel Access`
- Ghana Visa Required: `true`

**Site Support Requirements**
- Airport Pickup: `true`
- Transport To: `Kotoka International Airport`
- Transport From: `Contractor Camp`
- Accommodation Required: `true`
- Accommodation Confirmed: `false`
- Permanent Access Badge: `false`
- General Site Induction: `true`
- Other Inductions: `Lifting equipment safety briefing`
- Bringing Equipment: `true`
- PPE Required: `true`
- IT Access Required: `false`
- Itinerary Attached: `true`
- Inflight Updated: `true`
- Remarks: ``
- Applicable Documents: `passport_biodata, valid_visa, mincom_letter, insurance_proof`

---

## 3. Visitor (Expatriate) — Visit — China

**Visitor Details**
- Passport No: `E5566778`
- Full Name: `Li Wei`
- Date of Birth: `1982-06-21`
- Gender: `Male`
- Nationality: `Chinese`
- Email: `li.wei@example.com`
- Phone: `+86 13812345678`
- Emergency Contact Name: `Zhang Min`
- Emergency Contact Phone: `+86 13987654321`
- Employment Status: `Visitor(Expatriate)`

**Company Details**
- Company Name: `Sinosteel Equipment`
- Contact Name (Monthly): `Wang Fang`
- Contact Email: `wang.fang@example.com`
- Company Emergency Contact Name: `Chen Jie`
- Company Emergency Contact Tel: `+86 13611112222`
- GMC Liaison Person: `Ama Serwaa`
- GMC Liaison Dept: `Procurement`

**Access Details**
- Access Purpose: `Visit`
- Arrival Date: `2026-08-05`
- Departure Date: `2026-08-12`
- Reason for Request: `Site visit to evaluate equipment supply partnership`
- Visa Type: `Business Visa`
- Access Level: `Visitor Access`
- Ghana Visa Required: `true`

**Site Support Requirements**
- Airport Pickup: `true`
- Transport To: `Kotoka International Airport`
- Transport From: `Accra Hotel`
- Accommodation Required: `true`
- Accommodation Confirmed: `true`
- Permanent Access Badge: `false`
- General Site Induction: `true`
- Other Inductions: `None`
- Bringing Equipment: `false`
- PPE Required: `true`
- IT Access Required: `false`
- Itinerary Attached: `true`
- Inflight Updated: `false`
- Remarks: `Delegation of 1, single-day site tour`
- Applicable Documents: `passport_biodata, valid_visa`

---

## 4. Employee — VisitMine — India

**Visitor Details**
- Passport No: `F1122334`
- Full Name: `Priya Sharma`
- Date of Birth: `1988-01-30`
- Gender: `Female`
- Nationality: `Indian`
- Email: `priya.sharma@example.com`
- Phone: `+91 9812345678`
- Emergency Contact Name: `Raj Sharma`
- Emergency Contact Phone: `+91 9898765432`
- Employment Status: `Employee`

**Company Details**
- Company Name: `Tata Consulting Engineers`
- Contact Name (Monthly): `Arjun Mehta`
- Contact Email: `arjun.mehta@example.com`
- Company Emergency Contact Name: `Kavita Nair`
- Company Emergency Contact Tel: `+91 9876501234`
- GMC Liaison Person: `Kojo Mensah`
- GMC Liaison Dept: `Engineering`

**Access Details**
- Access Purpose: `VisitMine`
- Arrival Date: `2026-07-30`
- Departure Date: `2026-08-06`
- Reason for Request: `Underground mine inspection for geotechnical assessment`
- Visa Type: `Business Visa`
- Access Level: `High Security / Sensitive Areas`
- Ghana Visa Required: `true`

**Site Support Requirements**
- Airport Pickup: `false`
- Transport To: `Self-arranged`
- Transport From: `Self-arranged`
- Accommodation Required: `false`
- Accommodation Confirmed: `false`
- Permanent Access Badge: `false`
- General Site Induction: `true`
- Other Inductions: `Underground mine safety induction`
- Bringing Equipment: `true`
- PPE Required: `true`
- IT Access Required: `false`
- Itinerary Attached: `false`
- Inflight Updated: `false`
- Remarks: `Requires escort at all times underground`
- Applicable Documents: `passport_biodata, valid_visa, assignment_letter`

---

## 5. Contractor — Work — United Kingdom

**Visitor Details**
- Passport No: `G7788990`
- Full Name: `James Whitfield`
- Date of Birth: `1975-09-09`
- Gender: `Male`
- Nationality: `British`
- Email: `james.whitfield@example.com`
- Phone: `+44 7911123456`
- Emergency Contact Name: `Emily Whitfield`
- Emergency Contact Phone: `+44 7922234567`
- Employment Status: `Contractor`

**Company Details**
- Company Name: `SGS Mineral Services`
- Contact Name (Monthly): `Oliver Bennett`
- Contact Email: `oliver.bennett@example.com`
- Company Emergency Contact Name: `Sophie Clarke`
- Company Emergency Contact Tel: `+44 7933345678`
- GMC Liaison Person: `Abena Owusu`
- GMC Liaison Dept: `Quality Assurance`

**Access Details**
- Access Purpose: `Work`
- Arrival Date: `2026-08-10`
- Departure Date: `2026-10-01`
- Reason for Request: `Assay lab audit and process certification`
- Visa Type: `Work Visa`
- Access Level: `Standard Employee Access`
- Ghana Visa Required: `true`

**Site Support Requirements**
- Airport Pickup: `true`
- Transport To: `Kotoka International Airport`
- Transport From: `GMC Site Guesthouse`
- Accommodation Required: `true`
- Accommodation Confirmed: `true`
- Permanent Access Badge: `true`
- General Site Induction: `true`
- Other Inductions: `Laboratory safety training`
- Bringing Equipment: `false`
- PPE Required: `true`
- IT Access Required: `true`
- Itinerary Attached: `true`
- Inflight Updated: `true`
- Remarks: ``
- Applicable Documents: `passport_biodata, valid_visa, work_residence_permit, insurance_proof`

---

## 6. Visitor (Expatriate) — Visit — United States

**Visitor Details**
- Passport No: `H4455667`
- Full Name: `Michael Carter`
- Date of Birth: `1979-04-17`
- Gender: `Male`
- Nationality: `American`
- Email: `michael.carter@example.com`
- Phone: `+1 2025551234`
- Emergency Contact Name: `Susan Carter`
- Emergency Contact Phone: `+1 2025555678`
- Employment Status: `Visitor(Expatriate)`

**Company Details**
- Company Name: `Newmont Investments`
- Contact Name (Monthly): `Rachel Adams`
- Contact Email: `rachel.adams@example.com`
- Company Emergency Contact Name: `David Reed`
- Company Emergency Contact Tel: `+1 2025559876`
- GMC Liaison Person: `Efua Darko`
- GMC Liaison Dept: `Finance`

**Access Details**
- Access Purpose: `Visit`
- Arrival Date: `2026-08-15`
- Departure Date: `2026-08-19`
- Reason for Request: `Investor site visit and financial review meeting`
- Visa Type: `Business Visa`
- Access Level: `Executive / Emergency Access`
- Ghana Visa Required: `true`

**Site Support Requirements**
- Airport Pickup: `true`
- Transport To: `Kotoka International Airport`
- Transport From: `Accra Hotel`
- Accommodation Required: `true`
- Accommodation Confirmed: `true`
- Permanent Access Badge: `false`
- General Site Induction: `true`
- Other Inductions: `None`
- Bringing Equipment: `false`
- PPE Required: `false`
- IT Access Required: `false`
- Itinerary Attached: `true`
- Inflight Updated: `true`
- Remarks: `VIP visit, accompanied by GMC Finance Director`
- Applicable Documents: `passport_biodata, valid_visa`

---

## 7. Employee — Work — Lebanon

**Visitor Details**
- Passport No: `J2233445`
- Full Name: `Rania Haddad`
- Date of Birth: `1992-12-05`
- Gender: `Female`
- Nationality: `Lebanese`
- Email: `rania.haddad@example.com`
- Phone: `+961 3123456`
- Emergency Contact Name: `Karim Haddad`
- Emergency Contact Phone: `+961 3654321`
- Employment Status: `Employee`

**Company Details**
- Company Name: `CDE Global`
- Contact Name (Monthly): `Fadi Nassar`
- Contact Email: `fadi.nassar@example.com`
- Company Emergency Contact Name: `Layla Khoury`
- Company Emergency Contact Tel: `+961 3789456`
- GMC Liaison Person: `Nana Yaw`
- GMC Liaison Dept: `Processing`

**Access Details**
- Access Purpose: `Work`
- Arrival Date: `2026-07-26`
- Departure Date: `2026-08-23`
- Reason for Request: `Wash plant commissioning support`
- Visa Type: `Work Visa`
- Access Level: `Operational Employee Access`
- Ghana Visa Required: `true`

**Site Support Requirements**
- Airport Pickup: `true`
- Transport To: `Kotoka International Airport`
- Transport From: `Contractor Camp`
- Accommodation Required: `true`
- Accommodation Confirmed: `false`
- Permanent Access Badge: `true`
- General Site Induction: `true`
- Other Inductions: `Heavy machinery operation briefing`
- Bringing Equipment: `true`
- PPE Required: `true`
- IT Access Required: `true`
- Itinerary Attached: `false`
- Inflight Updated: `false`
- Remarks: `First-time visitor to site`
- Applicable Documents: `passport_biodata, valid_visa, work_residence_permit, mincom_letter, assignment_letter, insurance_proof`

---

## 8. Contractor — VisitMine — Australia

**Visitor Details**
- Passport No: `K6677889`
- Full Name: `Ethan Walker`
- Date of Birth: `1983-07-19`
- Gender: `Male`
- Nationality: `Australian`
- Email: `ethan.walker@example.com`
- Phone: `+61 412345678`
- Emergency Contact Name: `Chloe Walker`
- Emergency Contact Phone: `+61 423456789`
- Employment Status: `Contractor`

**Company Details**
- Company Name: `Orica Mining Services`
- Contact Name (Monthly): `Jack Thompson`
- Contact Email: `jack.thompson@example.com`
- Company Emergency Contact Name: `Grace Mitchell`
- Company Emergency Contact Tel: `+61 434567890`
- GMC Liaison Person: `Kojo Appiah`
- GMC Liaison Dept: `Blasting & Drilling`

**Access Details**
- Access Purpose: `VisitMine`
- Arrival Date: `2026-08-08`
- Departure Date: `2026-08-14`
- Reason for Request: `Blast design review and drill pattern audit`
- Visa Type: `Business Visa`
- Access Level: `High Security / Sensitive Areas`
- Ghana Visa Required: `true`

**Site Support Requirements**
- Airport Pickup: `true`
- Transport To: `Kotoka International Airport`
- Transport From: `GMC Site Guesthouse`
- Accommodation Required: `true`
- Accommodation Confirmed: `true`
- Permanent Access Badge: `false`
- General Site Induction: `true`
- Other Inductions: `Explosives handling awareness`
- Bringing Equipment: `false`
- PPE Required: `true`
- IT Access Required: `false`
- Itinerary Attached: `true`
- Inflight Updated: `true`
- Remarks: ``
- Applicable Documents: `passport_biodata, valid_visa, assignment_letter, insurance_proof`
