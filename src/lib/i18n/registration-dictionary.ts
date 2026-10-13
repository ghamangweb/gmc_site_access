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
  "Familiarization Visit": "参观考察",
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
  "Fitness form": "体检表",
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
  "That document is already uploaded — remove it first":
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
