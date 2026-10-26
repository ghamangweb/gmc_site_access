import {
  type ActionErrorCode,
  DOCUMENT_LABELS,
  type DocType,
} from "@/lib/domain/types";

export type RegistrationLocale = "en" | "zh";

// Simplified Chinese for the public registration form only. Keyed by the
// English string the component already renders, so English mode returns the
// key untouched and the staff-facing ReceptionForm is byte-identical to how it
// rendered before this file existed. A missing key falls back to English
// rather than showing a key name to the visitor.
//
// Stored values are never translated — "Male", "Work Visa" and "Work" go to
// the database exactly as they always did. Only the display text changes.
const ZH_ENTRIES = {
  // --- Page chrome -------------------------------------------------------
  "Ghana Manganese Company Mine Site Access Registration":
    "加纳锰业公司矿区准入登记",
  "This invitation link is invalid": "此邀请链接无效",
  "It may have been revoked, already used, or copied incorrectly. Contact the Department Head who invited you for a new link.":
    "该链接可能已被撤销、已被使用，或复制有误。请联系邀请您的部门主管重新获取链接。",
  English: "English",
  中文: "中文",

  // --- Section headings --------------------------------------------------
  "Visitor Details": "访客信息",
  "Company Details": "公司信息",
  "Access Details": "准入信息",
  "Site Support Requirements": "现场支持需求",
  "Document Uploads": "文件上传",
  "Applicable Document Uploads": "适用文件上传",
  Administration: "行政管理",

  // --- Visitor details ---------------------------------------------------
  "Passport No.": "护照号码",
  "Ghana Card No.": "加纳身份证号码",
  "Full Name": "姓名",
  "Date of Birth": "出生日期",
  Gender: "性别",
  Nationality: "国籍",
  "Email Address": "电子邮箱",
  "Telephone No. (Off Site)": "电话号码（场外）",
  "Telephone No. (On Site)": "电话号码（现场）",
  "Emergency Contact Name": "紧急联系人姓名",
  "Emergency Contact No.": "紧急联系人电话",
  "Employment Status": "雇佣身份",
  "Nature of Visit": "来访性质",
  "Access Purpose": "准入目的",
  "Purpose of Visit": "来访目的",
  "Look up passport": "查询护照",

  // --- Company details ---------------------------------------------------
  "Company Name": "公司名称",
  "Contact Name (Monthly Reporting)": "联系人姓名（月度报告）",
  "Contact Email Address": "联系人电子邮箱",
  "Emergency Contact Name (Company)": "紧急联系人姓名（公司）",
  "Emergency Tel. (Company)": "紧急联系电话（公司）",

  // --- Access details ----------------------------------------------------
  "GMC Liaison Person": "GMC 联络人",
  "GMC Liaison Department": "GMC 联络部门",
  "Date of Arrival on Site": "抵达现场日期",
  "Date of Departure from Site": "离开现场日期",
  "Date of Arrival": "抵达日期",
  "Date of Departure": "离开日期",
  "Reason for Request": "申请事由",

  // --- Site support requirements -----------------------------------------
  "Airport Pickup / Protocol Required": "需要机场接机／礼宾服务",
  "Pickup Date": "接机日期",
  "Transport Required To": "需要前往交通安排",
  "Transport Required From": "需要返程交通安排",
  "Accommodation Required": "需要住宿安排",
  "Accommodation Location": "住宿地点",
  "Permanent Access Badge": "长期通行证",
  "Ghana Visa Required": "需要加纳签证",
  "General Site Induction": "通用现场入场培训",
  "Other Inductions / Training": "其他入场培训",
  "Bringing Equipment on Site": "携带设备进入现场",
  "PPE Required": "需要个人防护装备",
  "IT Access Required": "需要 IT 系统权限",
  "Visa Type": "签证类型",
  "Access Level": "准入级别",

  // --- Administration (staff only, kept for completeness) ----------------
  "Accommodation Confirmed": "住宿已确认",
  "Itinerary Attached": "已附行程",
  "Inflight Updated": "航班信息已更新",
  "Remarks / Other Information": "备注／其他信息",

  // --- Option values (display only — the stored value stays English) -----
  Male: "男",
  Female: "女",
  Other: "其他",
  Employee: "员工",
  Contractor: "承包商",
  "Visitor(Expatriate)": "访客（外籍人士）",
  "Require mine site access": "需要矿区准入",
  "Familiarization Visit (no mine site access)": "参观考察（不进入矿区）",
  "Require Mine Tour": "需要矿区参观",
  "Coming to work": "前来工作",
  "Coming to visit (no mine site access)": "前来参观（不进入矿区）",
  "Coming to visit + mine site access": "前来参观并进入矿区",
  "Tourist Visa": "旅游签证",
  "Business Visa": "商务签证",
  "Work Visa": "工作签证",
  "Transit Visa": "过境签证",
  "Diplomatic Visa": "外交签证",
  "Visa on Arrival": "落地签证",
  "Visitor Access": "访客权限",
  "Contractor/Service Personnel Access": "承包商／服务人员权限",
  "Standard Employee Access": "标准员工权限",
  "Operational Employee Access": "作业员工权限",
  "High Security / Sensitive Areas": "高安保／敏感区域",
  "Executive / Emergency Access": "高管／应急权限",
  Yes: "是",
  No: "否",

  // --- Document uploads --------------------------------------------------
  "Passport biodata page": "护照资料页",
  "Valid visa": "有效签证",
  "MINCOM letter of approval": "矿业委员会批准函",
  "Work or residence permit": "工作或居留许可",
  "Ghana Card": "加纳身份证",
  "Letter of assignment / contract": "派遣函／合同",
  "Proof of medical/travel insurance": "医疗／旅行保险证明",
  "Choose file": "选择文件",
  "Upload file": "上传文件",
  Required: "必填",
  Optional: "选填",
  "(optional)": "（选填）",
  View: "查看",
  Remove: "删除",

  // --- Placeholders ------------------------------------------------------
  "Select nationality": "请选择国籍",
  "Search nationality...": "搜索国籍…",
  "Select a location": "请选择地点",
  "Search locations in Ghana...": "搜索加纳的地点…",
  "Phone number": "电话号码",
  "No results found.": "未找到结果。",

  // --- Buttons and submission --------------------------------------------
  Submit: "提交",
  "Upload these documents to continue:": "请上传以下文件后继续：",
  "Thank you! Your registration has been submitted": "感谢您！登记已提交",
  "GMC staff will be in touch with next steps.":
    "GMC 工作人员将与您联系，告知后续步骤。",

  // --- Validation messages (zod keeps the English string as its key) -----
  Required_validation: "此项为必填",
  "Enter a valid email": "请输入有效的电子邮箱",
  "Enter a valid phone number for the selected country":
    "请输入与所选国家／地区匹配的有效电话号码",
  "Select a country code": "请选择国家／地区代码",
  "Required when airport pickup is needed": "需要机场接机时此项为必填",
  "Required when accommodation is needed": "需要住宿安排时此项为必填",

  // --- Server-returned messages (resolved from an error code) ------------
  "This invitation link is invalid, already used, or has been revoked":
    "此邀请链接无效、已被使用或已被撤销",
  "Upload these documents before submitting:": "提交前请先上传以下文件：",
  "Failed to submit form": "提交失败",
  "Submission received, but GMC staff may not have been notified by email":
    "提交已收到，但可能未能通过邮件通知 GMC 工作人员",
  "File exceeds the 10MB upload limit": "文件超过 10MB 上传限制",
  "Missing token, docType, or file": "缺少令牌、文件类型或文件",
  "Invalid document type": "文件类型无效",
  "That document is already uploaded. Remove it first":
    "该文件已上传，请先删除后再试",
  "This invitation link is invalid, already used, or revoked":
    "此邀请链接无效、已被使用或已被撤销",
  "Missing token or documentId": "缺少令牌或文件标识",
  "Document not found": "未找到该文件",
  "Not authorized": "无权执行此操作",
  "Internal server error": "服务器内部错误",
  "Upload failed": "上传失败",
  uploaded: "已上传",
  removed: "已删除",
  "Invalid file type": "文件格式无效",
  "File too large": "文件过大",
  "You can only upload 1 file": "一次只能上传 1 个文件",
  "Couldn't load the document": "无法打开该文件",
  "Failed to remove document": "删除文件失败",

  // --- Cookie consent and privacy policy ---------------------------------
  "Your cookie choices": "您的 Cookie 选择",
  "By clicking “Accept”, you agree to this site remembering your language choice on your device. We do not use cookies for analytics or marketing. The details you submit are used only to process your site-access request.":
    "点击“接受”，即表示您同意本网站在您的设备上记住您的语言选择。我们不使用 Cookie 进行分析或营销。您提交的信息仅用于处理您的矿区准入申请。",
  "Privacy Policy": "隐私政策",
  "(opens in a new tab)": "（在新标签页中打开）",
  Deny: "拒绝",
  Accept: "接受",
  "Our Commitment to Privacy": "我们对隐私的承诺",
  "Your privacy is important to us. This policy explains how Ghana Manganese Company collects, uses and protects your personal information when you register for site access.":
    "我们重视您的隐私。本政策说明加纳锰业公司在您登记矿区准入时如何收集、使用和保护您的个人信息。",
  "The Information We Collect": "我们收集的信息",
  "This notice applies to the information you submit through the Ghana Manganese Company (GMC) site-access registration form. The types of personal information we collect include:":
    "本通知适用于您通过加纳锰业公司（GMC）矿区准入登记表提交的信息。我们收集的个人信息类型包括：",
  "Your name, date of birth, gender and nationality":
    "您的姓名、出生日期、性别和国籍",
  "Passport or Ghana Card number, and copies of the identity, visa, permit and medical or training documents you upload":
    "护照或加纳身份证号码，以及您上传的身份、签证、许可、医疗或培训文件副本",
  "Your email address and telephone numbers": "您的电子邮箱和电话号码",
  "Emergency contact details": "紧急联系人信息",
  "Your employer or company details and the purpose of your visit":
    "您的雇主或公司信息以及来访目的",
  "Any additional information you choose to provide in the form":
    "您在表格中自愿提供的其他信息",
  "How We Use Your Information": "我们如何使用您的信息",
  "We use the information you provide only to:": "我们仅将您提供的信息用于：",
  "Process your site-access request and decide whether access can be granted":
    "处理您的矿区准入申请，并决定是否批准准入",
  "Arrange the medical, induction and security requirements for your visit":
    "安排您来访所需的体检、入场培训和安保手续",
  "Contact you, or your emergency contact, about your visit":
    "就您的来访事宜联系您或您的紧急联系人",
  "Keep records of who was on site, for safety and legal compliance":
    "出于安全和合规需要，留存人员入场记录",
  "We do not use your information for marketing and we do not sell it.":
    "我们不会将您的信息用于营销，也不会出售您的信息。",
  "Who Can See Your Information": "谁可以查看您的信息",
  "Your submission is visible only to GMC staff who need it to process your request, such as the Department Head who invited you, Reception, and the departments that clear you for site access.":
    "您提交的内容仅供处理您申请所需的 GMC 员工查看，例如邀请您的部门主管、前台接待，以及负责审核您准入的各部门。",
  "We use service providers to host our systems, store uploaded documents and send email. They process data on our behalf. We do not share your personal information with anyone else unless the law requires it.":
    "我们使用服务提供商来托管系统、存储上传的文件和发送邮件，他们代表我们处理数据。除非法律要求，我们不会与其他任何方分享您的个人信息。",
  "Cookies and Browser Storage": "Cookie 与浏览器存储",
  "This form does not use cookies for analytics, advertising or marketing. If you click “Accept”, we store your language choice in your browser so the form opens in the same language next time. If you click “Deny”, the language you pick applies to this visit only and nothing is stored.":
    "本表格不使用 Cookie 进行分析、广告或营销。如果您点击“接受”，我们会在浏览器中保存您的语言选择，下次打开时将使用相同语言。如果您点击“拒绝”，您选择的语言仅在本次访问中有效，不会保存任何内容。",
  "Our Commitment to Data Security": "我们对数据安全的承诺",
  "Sensitive information, including your personal details and submitted forms, is encrypted before it is stored. Access to it is limited to authorised GMC staff. No system is completely secure, but we take reasonable steps to protect your information from misuse, loss and unauthorised access.":
    "包括您的个人资料和已提交表格在内的敏感信息在存储前会经过加密，仅限获授权的 GMC 员工访问。没有任何系统是绝对安全的，但我们会采取合理措施，防止您的信息被滥用、丢失或被未经授权访问。",
  "How Long We Keep Your Information": "我们保留信息的时间",
  "We keep your information for as long as it is needed to manage your site access and to meet GMC's safety, security and legal record-keeping obligations.":
    "我们会在管理您的矿区准入以及履行 GMC 安全、保安和法定记录保存义务所需的期限内保留您的信息。",
  "Your Rights": "您的权利",
  "GMC handles personal information in line with the Data Protection Act, 2012 (Act 843) of Ghana. You may ask to see the information we hold about you, to have it corrected, or to have it deleted where the law allows. To do so, contact the GMC Department Head who invited you, and we will verify your identity before acting on your request.":
    "GMC 依照加纳《2012 年数据保护法》（第 843 号法案）处理个人信息。您可以要求查看我们持有的您的信息、更正信息，或在法律允许的情况下要求删除。请联系邀请您的 GMC 部门主管，我们会先核实您的身份，再处理您的请求。",
  "Changes to This Policy": "本政策的变更",
  "We may update this policy from time to time. The version on this page is the current one.":
    "我们可能会不时更新本政策，本页面显示的为现行版本。",
} satisfies Record<string, string>;

// A Map keeps the lookup honest: the literal above stays inferred (so a
// duplicate key is a type error) and reading an arbitrary visitor-supplied
// string needs no cast.
const ZH: ReadonlyMap<string, string> = new Map(Object.entries(ZH_ENTRIES));

export function translate(locale: RegistrationLocale, key: string): string {
  if (locale === "en") {
    return key;
  }

  // "Required" is both a zod message and the uploader's slot state, and the
  // two need different Chinese. The zod one is disambiguated by suffix.
  return ZH.get(key) ?? key;
}

export function translateValidationMessage(
  locale: RegistrationLocale,
  message: string,
): string {
  if (locale === "en") {
    return message;
  }

  return ZH.get(`${message}_validation`) ?? ZH.get(message) ?? message;
}

// Server Actions return an English sentence plus a code. Static sentences are
// translated by looking the sentence itself up (same keying as everything
// else); only the parameterized one needs the code and its parameters.
export function translateActionError(
  locale: RegistrationLocale,
  failure: {
    error: string;
    errorCode?: ActionErrorCode;
    missingDocTypes?: DocType[];
  },
): string {
  if (locale === "en") {
    return failure.error;
  }

  if (failure.errorCode === "missing_documents") {
    const labels = (failure.missingDocTypes ?? [])
      .map((docType) => translate(locale, DOCUMENT_LABELS[docType]))
      .join("、");

    return `${translate(locale, "Upload these documents before submitting:")}${labels}`;
  }

  return translate(locale, failure.error);
}
