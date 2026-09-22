import {
  AA_BUTTON_LABEL,
  AA_CONNECTED_BADGE,
  ADVISOR_ERROR,
  ADVISOR_HEADING,
  ADVISOR_LOADING,
  ADVISOR_NOTE,
  APP_SUBTITLE,
  APP_TITLE,
  ASK_AI_LABEL,
  BANK_LABEL,
  BANK_SUM_CAPTION,
  BANK_SUM_LABEL,
  CASH_HELPER_TEXT,
  COPY_WHATSAPP,
  COPIED_NOTICE,
  DAILY_AVG_CAPTION,
  DAILY_AVG_LABEL,
  DATE_LABEL,
  ERROR_TEXT,
  GALLA_LABEL,
  HIGH_CASH_WARNING,
  LOADING_TEXT,
  PAYMENT_LABEL,
  PEAK_DAY_CAPTION,
  PEAK_DAY_LABEL,
  SAFE_BUDGET_CAPTION,
  SAFE_BUDGET_LABEL,
  SAMPLE_DATA_NOTE,
  SIMULATOR_HEADING,
  TOTAL_INFLOW_CAPTION,
  TOTAL_INFLOW_LABEL,
  VERDICT_GREEN_HEADING,
  VERDICT_GREEN_TEXT,
  VERDICT_IDLE_TEXT,
  VERDICT_RED_HEADING,
  VERDICT_YELLOW_HEADING,
} from "../copy";

export type Language = "en" | "hi" | "mr";

const english = {
  // ── Core app ──────────────────────────────────────────────────────
  appTitle: APP_TITLE,
  appSubtitle: APP_SUBTITLE,
  loading: LOADING_TEXT,
  error: ERROR_TEXT,
  retryButton: "Retry",
  thirtyDayOutlook: "30-day outlook",
  sampleDataNote: SAMPLE_DATA_NOTE,
  aaButton: AA_BUTTON_LABEL,
  aaConnected: AA_CONNECTED_BADGE,

  // ── Language selector ─────────────────────────────────────────────
  langLabel: "Language",
  langEn: "English",
  langHi: "हिंदी (Hindi)",
  langMr: "मराठी (Marathi)",

  // ── Section headers in App ────────────────────────────────────────
  planCashMixKicker: "Plan your cash mix",
  planCashMixHeading: "See what your next month can carry",
  planCashMixHint: "Adjust the estimate, then check the daily runway before placing an order.",
  makeDecisionKicker: "Make the decision",
  makeDecisionHeading: "Plan your next wholesaler payment",

  // ── ShopSetup ─────────────────────────────────────────────────────
  startWithToday: "Start with Today",
  shopSetupSubtitle: "Tell us about your shop",
  shopSetupIntro:
    "We will add what you already have and take away what must be paid before your next stock order.",
  bankTodayQuestion: "How much money is in your bank today?",
  bankTodayHelper: "Your current bank balance, not this month's sales.",
  drawerCashQuestion: "How much cash is in your drawer?",
  drawerCashHelper: "Count the cash you can use for the stock order.",
  moneyGoingOutQuestion: "How much money will go out before then?",
  moneyGoingOutHelper: "Rent, salaries, bills, or other usual payments.",
  promisedPaymentsQuestion: "How much do you already owe others?",
  promisedPaymentsHelper: "Supplier payments or bills due before this order.",
  shopSetupSubmit: "Show my stock money",

  // ── DataImport ────────────────────────────────────────────────────
  dataImportKicker: "Choose your numbers",
  dataImportHeading: "Use your payment history",
  dataImportIntro:
    "Upload a UPI or POS CSV to get a forecast from your shop's own payments. We only use digital payments here, so cash sales stay clearly marked as an estimate.",
  chooseCsv: "Choose a CSV file",
  uploadingForecast: "Making your forecast…",
  useThisFile: "Use this file",
  useSampleData: "Use sample data for now",

  // ── RetailSummary ─────────────────────────────────────────────────
  moneyTodayLabel: "Your money today",
  inBank: "in bank",
  inDrawer: "in drawer",
  goingOutLabel: "Going out before your order",
  goingOutCaption: "Bills and payments you told us about",
  leftBeforeSalesLabel: "Left before new sales",
  changeShopDetails: "Change shop details",
  totalInflowLabel: TOTAL_INFLOW_LABEL,
  totalInflowCaption: TOTAL_INFLOW_CAPTION,
  bankLabel: BANK_LABEL,
  gallaLabel: GALLA_LABEL,
  bankSummaryLabel: BANK_SUM_LABEL,
  bankSummaryCaption: BANK_SUM_CAPTION,
  dailyAverageLabel: DAILY_AVG_LABEL,
  dailyAverageCaption: DAILY_AVG_CAPTION,
  perDay: "/day",
  peakDayLabel: PEAK_DAY_LABEL,
  peakDayCaption: PEAK_DAY_CAPTION,
  safeBudgetLabel: SAFE_BUDGET_LABEL,
  safeBudgetCaption: SAFE_BUDGET_CAPTION,
  safetyNote: "75% kept aside for safety",

  // ── CalibrationSlider ─────────────────────────────────────────────
  cashCustomersQuestion: "Out of 10 customers, how many pay in cash?",
  cashSliderLabel: "Out of 10 customers, how many pay in physical cash?",
  cashSliderValueText: "out of 10",
  cashHelper: CASH_HELPER_TEXT,
  highCashWarning: HIGH_CASH_WARNING,

  // ── DualRunwayChart ───────────────────────────────────────────────
  totalForDay: "Total for the day",

  // ── RestockSimulator ──────────────────────────────────────────────
  simulatorHeading: SIMULATOR_HEADING,
  paymentLabel: PAYMENT_LABEL,
  dateLabel: DATE_LABEL,
  verdictIdleText: VERDICT_IDLE_TEXT,
  verdictGreenHeading: VERDICT_GREEN_HEADING,
  verdictGreenText: VERDICT_GREEN_TEXT,
  verdictYellowHeading: VERDICT_YELLOW_HEADING,
  verdictRedHeading: VERDICT_RED_HEADING,
  copyWhatsApp: COPY_WHATSAPP,
  copiedNotice: COPIED_NOTICE,
  moneyInBankAfterPayments: "Money in bank after payments till",
  cashInDrawer: "Cash in drawer",
  expectedCashCaption:
    "Expected cash includes the money already in your drawer and a guess based on",
  expectedCashCaptionSuffix: "out of 10 customers paying cash.",

  // ── AdvisorPanel ──────────────────────────────────────────────────
  advisorHeading: ADVISOR_HEADING,
  askAi: ASK_AI_LABEL,
  advisorLoading: ADVISOR_LOADING,
  advisorNote: ADVISOR_NOTE,
  advisorError: ADVISOR_ERROR,

  // ── AccountAggregatorModal ────────────────────────────────────────
  aaStep1Title: "Connect Bank via Account Aggregator",
  aaStep2Title: "Verify Consent OTP",
  aaStep3Title: "Fetching Ledger",
  aaStep1Desc: "Select your merchant current account to fetch verified digital history.",
  aaBankLabel: "Your bank",
  aaMobileLabel: "Registered mobile number",
  aaRequestOtp: "Request Consent OTP",
  aaOtpPrompt: "Enter OTP sent to your registered mobile",
  aaOtpDemoHint: "Enter demo OTP: 1234",
  aaOtpLabel: "OTP",
  aaVerify: "Verify & Fetch Ledger",
  aaFetching:
    "Fetching 12 months encrypted UPI ledger via Sahamati / Account Aggregator framework…",

  // ── LandingPage ───────────────────────────────────────────────────
  navHowItWorks: "How it works",
  navBuiltFor: "Built for retail",
  navWhyItMatters: "Why it matters",
  navGetStarted: "Get started",
  landingEyebrow: "Festival planning for everyday businesses",
  landingHeroHeading: "Know what your shop can carry next.",
  landingHeroText:
    "VyaparRunway helps Indian retailers turn payment history into a clearer stock plan before the festive rush.",
  landingSeeHow: "See how it works",
  landingNext30Days: "Next 30 days",
  landingForecastReady: "Forecast ready",
  landingProjectedInflow: "projected store inflow",
  landingBankUpi: "Bank UPI",
  landingEstimatedCash: "Estimated cash",
  landingProofText:
    "Built for the decisions that happen between today's sale and tomorrow's stock order.",
  landingProofItem1: "UPI history",
  landingProofItem2: "Cash estimates",
  landingProofItem3: "Festival demand",
  landingProofItem4: "Wholesaler planning",
  landingSection1Eyebrow: "One clearer view",
  landingSection1Heading: "From payment signals to a better stocking decision.",
  landingSection1Desc:
    "Not another accounting system. A focused planning layer for the moment when you need to decide how much stock to buy.",
  landingPoint1Title: "See the next 30 days",
  landingPoint1Text:
    "A simple forecast of the UPI money your shop may bring in before the next stock payment.",
  landingPoint2Title: "Bring cash into the picture",
  landingPoint2Text:
    "Adjust for walk-in customers who pay from the galla, without confusing estimates with bank money.",
  landingPoint3Title: "Plan before you commit",
  landingPoint3Text:
    "Test a wholesaler payment against your expected inflow and spot a risky order early.",
  landingSection2Eyebrow: "Designed for confidence, not certainty",
  landingSection2Heading:
    "Keep verified money and estimated cash in view at the same time.",
  landingSection2Copy:
    "See what comes from UPI, what depends on walk-ins, and how both change the shape of your next order.",
  landingAudienceEyebrow: "Built for the shop floor",
  landingAudienceHeading: "Useful when the festival rush is close.",
  landingAudience1: "Kirana stores",
  landingAudience2: "Festival stockists",
  landingAudience3: "Local wholesalers",
  landingAudience4: "Growing retail shops",
  landingCtaEyebrow: "Start with your next order",
  landingCtaHeading: "Make the next stock decision with more of the picture.",
  landingOpenApp: "Open VyaparRunway",
  landingFooterBrand: "VyaparRunway",
  landingFooterTagline: "Festival Stock Planner",
} as const;

export type TranslationKey = keyof typeof english;

const hindi: Record<TranslationKey, string> = {
  // ── Core app ──────────────────────────────────────────────────────
  appTitle: "व्यापार रनवे",
  appSubtitle: "त्योहार स्टॉक प्लानर",
  loading: "30-दिन का पूर्वानुमान तैयार हो रहा है…",
  error: "UPI डेटा लोड नहीं हो सका। कृपया सुनिश्चित करें कि बैकएंड सर्वर चल रहा है।",
  retryButton: "फिर कोशिश करें",
  thirtyDayOutlook: "30-दिन का दृष्टिकोण",
  sampleDataNote: "डेमो के लिए नमूना डेटा",
  aaButton: "बैंक कनेक्ट करें (AA)",
  aaConnected: "बैंक लिंक हुआ (AA सत्यापित)",

  // ── Language selector ─────────────────────────────────────────────
  langLabel: "भाषा",
  langEn: "English",
  langHi: "हिंदी (Hindi)",
  langMr: "मराठी (Marathi)",

  // ── Section headers in App ────────────────────────────────────────
  planCashMixKicker: "नकद मिश्रण की योजना बनाएं",
  planCashMixHeading: "अगले महीने आपकी दुकान क्या उठा सकती है",
  planCashMixHint: "अनुमान बदलें, फिर ऑर्डर देने से पहले दैनिक रनवे जांचें।",
  makeDecisionKicker: "निर्णय लें",
  makeDecisionHeading: "अगले थोक भुगतान की योजना बनाएं",

  // ── ShopSetup ─────────────────────────────────────────────────────
  startWithToday: "आज की स्थिति",
  shopSetupSubtitle: "अपनी दुकान के बारे में बताएं",
  shopSetupIntro:
    "हम आपके पास जो है उसे जोड़ेंगे और अगले स्टॉक ऑर्डर से पहले जो देना है उसे घटा देंगे।",
  bankTodayQuestion: "आज आपके बैंक में कितने पैसे हैं?",
  bankTodayHelper: "आपका वर्तमान बैंक बैलेंस, इस महीने की बिक्री नहीं।",
  drawerCashQuestion: "गल्ले में कितनी नकद राशि है?",
  drawerCashHelper: "वह नकद गिनें जो आप स्टॉक ऑर्डर के लिए उपयोग कर सकते हैं।",
  moneyGoingOutQuestion: "इससे पहले कितना पैसा जाएगा?",
  moneyGoingOutHelper: "किराया, वेतन, बिल या अन्य सामान्य भुगतान।",
  promisedPaymentsQuestion: "आप पर पहले से कितना बकाया है?",
  promisedPaymentsHelper: "इस ऑर्डर से पहले देय सप्लायर भुगतान या बिल।",
  shopSetupSubmit: "मेरा स्टॉक पैसा दिखाएं",

  // ── DataImport ────────────────────────────────────────────────────
  dataImportKicker: "अपने नंबर चुनें",
  dataImportHeading: "अपना भुगतान इतिहास उपयोग करें",
  dataImportIntro:
    "अपने शॉप के भुगतानों से पूर्वानुमान पाने के लिए UPI या POS CSV अपलोड करें। हम केवल डिजिटल भुगतान उपयोग करते हैं, इसलिए नकद बिक्री स्पष्ट रूप से अनुमान के रूप में चिह्नित रहती है।",
  chooseCsv: "CSV फ़ाइल चुनें",
  uploadingForecast: "आपका पूर्वानुमान बना रहे हैं…",
  useThisFile: "इस फ़ाइल का उपयोग करें",
  useSampleData: "अभी नमूना डेटा उपयोग करें",

  // ── RetailSummary ─────────────────────────────────────────────────
  moneyTodayLabel: "आज आपका पैसा",
  inBank: "बैंक में",
  inDrawer: "गल्ले में",
  goingOutLabel: "ऑर्डर से पहले जाने वाला पैसा",
  goingOutCaption: "आपके बताए बिल और भुगतान",
  leftBeforeSalesLabel: "नई बिक्री से पहले बचा हुआ",
  changeShopDetails: "दुकान की जानकारी बदलें",
  totalInflowLabel: "अपेक्षित कुल आमदनी · अगले 30 दिन",
  totalInflowCaption: "अपेक्षित UPI पैसा + अनुमानित नकद बिक्री",
  bankLabel: "अपेक्षित UPI पैसा",
  gallaLabel: "अनुमानित नकद बिक्री",
  bankSummaryLabel: "अपेक्षित UPI पैसा · अगले 30 दिन",
  bankSummaryCaption: "आपके पिछले UPI भुगतानों के आधार पर",
  dailyAverageLabel: "दैनिक औसत",
  dailyAverageCaption: "प्रति दिन अपेक्षित औसत आमदनी",
  perDay: "/दिन",
  peakDayLabel: "सबसे व्यस्त दिन",
  peakDayCaption: "सबसे अधिक बिक्री वाला दिन",
  safeBudgetLabel: "सुरक्षित स्टॉकिंग सीमा",
  safeBudgetCaption: "बफ़र बनाए रखने के लिए बैंक बैलेंस का 75%",
  safetyNote: "सुरक्षा के लिए 75% अलग रखा",

  // ── CalibrationSlider ─────────────────────────────────────────────
  cashCustomersQuestion: "10 में से कितने ग्राहक नकद देते हैं?",
  cashSliderLabel: "10 में से कितने ग्राहक नकद भुगतान करते हैं?",
  cashSliderValueText: "10 में से",
  cashHelper: "निश्चित नहीं? पिछले 10 ग्राहकों को याद करें। कितनों ने नकद दिया?",
  highCashWarning: "उच्च नकद निर्भरता: आपका अनुमान नकद खरीदारों पर बहुत निर्भर है। एक सुरक्षा बफ़र रखें।",

  // ── DualRunwayChart ───────────────────────────────────────────────
  totalForDay: "दिन का कुल",

  // ── RestockSimulator ──────────────────────────────────────────────
  simulatorHeading: "क्या मैं यह ऑर्डर दे सकता हूँ?",
  paymentLabel: "थोक भुगतान",
  dateLabel: "भुगतान की अंतिम तिथि",
  verdictIdleText: "राशि दर्ज करें और यह देखने के लिए तारीख चुनें कि यह सुरक्षित है या नहीं।",
  verdictGreenHeading: "खरीदना सुरक्षित है",
  verdictGreenText: "आपके पास और आने वाले पैसे इस भुगतान को कवर करेंगे।",
  verdictYellowHeading: "गल्ले की नकद की ज़रूरत है",
  verdictRedHeading: "जोखिम ज़्यादा है",
  copyWhatsApp: "व्हाट्सएप सारांश कॉपी करें",
  copiedNotice: "सारांश क्लिपबोर्ड पर कॉपी किया गया!",
  moneyInBankAfterPayments: "तक के भुगतान के बाद बैंक में पैसे",
  cashInDrawer: "गल्ले में नकद",
  expectedCashCaption: "अनुमानित नकद में गल्ले का पैसा और",
  expectedCashCaptionSuffix: "में से 10 ग्राहकों के नकद भुगतान का अनुमान शामिल है।",

  // ── AdvisorPanel ──────────────────────────────────────────────────
  advisorHeading: "नकदी जुटाने के उपाय",
  askAi: "एआई से पूछें",
  advisorLoading: "आपकी दुकान के लिए सुझाव तैयार हो रहे हैं…",
  advisorNote: "सुझाव सामान्य खुदरा मार्गदर्शन हैं। ऑर्डर देने से पहले अपने वास्तविक आंकड़ों से जांच लें।",
  advisorError: "सुझाव प्राप्त नहीं हो सके। बैकएंड सर्वर की जांच करें और पुनः प्रयास करें।",

  // ── AccountAggregatorModal ────────────────────────────────────────
  aaStep1Title: "अकाउंट एग्रीगेटर के ज़रिए बैंक कनेक्ट करें",
  aaStep2Title: "सहमति OTP सत्यापित करें",
  aaStep3Title: "लेजर प्राप्त हो रहा है",
  aaStep1Desc: "सत्यापित डिजिटल इतिहास प्राप्त करने के लिए अपना मर्चेंट खाता चुनें।",
  aaBankLabel: "आपका बैंक",
  aaMobileLabel: "पंजीकृत मोबाइल नंबर",
  aaRequestOtp: "सहमति OTP मांगें",
  aaOtpPrompt: "पंजीकृत मोबाइल पर भेजा गया OTP दर्ज करें",
  aaOtpDemoHint: "डेमो OTP दर्ज करें: 1234",
  aaOtpLabel: "OTP",
  aaVerify: "सत्यापित करें और लेजर प्राप्त करें",
  aaFetching: "Sahamati / Account Aggregator फ्रेमवर्क के ज़रिए 12 महीने का एन्क्रिप्टेड UPI लेजर प्राप्त हो रहा है…",

  // ── LandingPage ───────────────────────────────────────────────────
  navHowItWorks: "यह कैसे काम करता है",
  navBuiltFor: "खुदरा व्यापार के लिए",
  navWhyItMatters: "यह क्यों महत्वपूर्ण है",
  navGetStarted: "शुरू करें",
  landingEyebrow: "दुकानदारों के लिए त्योहार का स्टॉक प्लानर",
  landingHeroHeading: "जानें कि आपकी दुकान अगला कितना माल उठा सकती है।",
  landingHeroText:
    "व्यापार रनवे भारतीय खुदरा विक्रेताओं को त्योहारी भीड़ से पहले भुगतान इतिहास को एक स्पष्ट स्टॉक योजना में बदलने में मदद करता है।",
  landingSeeHow: "देखें यह कैसे काम करता है",
  landingNext30Days: "अगले 30 दिन",
  landingForecastReady: "पूर्वानुमान तैयार",
  landingProjectedInflow: "अनुमानित कुल आमदनी",
  landingBankUpi: "बैंक UPI",
  landingEstimatedCash: "अनुमानित नकद",
  landingProofText:
    "आज की बिक्री और कल के स्टॉक ऑर्डर के बीच के निर्णयों के लिए विशेष रूप से निर्मित।",
  landingProofItem1: "UPI इतिहास",
  landingProofItem2: "नकद अनुमान",
  landingProofItem3: "त्योहारी मांग",
  landingProofItem4: "थोक व्यापारी योजना",
  landingSection1Eyebrow: "एक स्पष्ट दृष्टिकोण",
  landingSection1Heading: "भुगतान संकेतों से बेहतर स्टॉकिंग निर्णय तक।",
  landingSection1Desc:
    "कोई जटिल बहीखाता नहीं। जब आपको तय करना हो कि कितना स्टॉक खरीदना है, तब के लिए एक केंद्रित नियोजन प्रणाली।",
  landingPoint1Title: "अगले 30 दिन देखें",
  landingPoint1Text:
    "अगले स्टॉक भुगतान से पहले आपकी दुकान में आने वाले संभावित UPI पैसों का सरल पूर्वानुमान।",
  landingPoint2Title: "नकद बिक्री को भी शामिल करें",
  landingPoint2Text:
    "गल्ले में नकद देने वाले ग्राहकों के लिए समायोजन करें, बिना बैंक पैसों और अनुमान में भ्रमित हुए।",
  landingPoint3Title: "ऑर्डर देने से पहले योजना बनाएं",
  landingPoint3Text:
    "अपेक्षित आमदनी के मुकाबले थोक भुगतान की जांच करें और जोखिम भरे ऑर्डर को पहले ही पहचानें।",
  landingSection2Eyebrow: "संदेह दूर करने और विश्वास बढ़ाने के लिए",
  landingSection2Heading:
    "सत्यापित बैंक राशि और अनुमानित नकद दोनों को एक साथ नज़र में रखें।",
  landingSection2Copy:
    "देखें कि UPI से क्या आता है, नकद ग्राहकों पर क्या निर्भर है, और दोनों आपके अगले ऑर्डर को कैसे प्रभावित करते हैं।",
  landingAudienceEyebrow: "दुकानदारों की ज़रूरतों के अनुसार",
  landingAudienceHeading: "जब त्योहार की भीड़ नज़दीक हो तो बेहद उपयोगी।",
  landingAudience1: "किराना दुकानें",
  landingAudience2: "त्योहार स्टॉकिस्ट",
  landingAudience3: "स्थानीय थोक व्यापारी",
  landingAudience4: "बढ़ती खुदरा दुकानें",
  landingCtaEyebrow: "अपने अगले ऑर्डर से शुरुआत करें",
  landingCtaHeading: "पूरी तस्वीर देखकर अगला स्टॉक निर्णय लें।",
  landingOpenApp: "व्यापार रनवे खोलें",
  landingFooterBrand: "व्यापार रनवे",
  landingFooterTagline: "त्योहार स्टॉक प्लानर",
};

const marathi: Record<TranslationKey, string> = {
  // ── Core app ──────────────────────────────────────────────────────
  appTitle: "व्यापार रनवे",
  appSubtitle: "उत्सव स्टॉक नियोजन",
  loading: "३० दिवसांचा अंदाज तयार होत आहे…",
  error: "UPI डेटा लोड करता आला नाही. कृपया बॅकएंड सर्व्हर चालू असल्याची खात्री करा.",
  retryButton: "पुन्हा प्रयत्न करा",
  thirtyDayOutlook: "३०-दिवस दृष्टिकोन",
  sampleDataNote: "डेमोसाठी नमुना डेटा",
  aaButton: "बँक जोडा (AA)",
  aaConnected: "बँक जोडली (AA सत्यापित)",

  // ── Language selector ─────────────────────────────────────────────
  langLabel: "भाषा",
  langEn: "English",
  langHi: "हिंदी (Hindi)",
  langMr: "मराठी (Marathi)",

  // ── Section headers in App ────────────────────────────────────────
  planCashMixKicker: "रोख मिश्रण नियोजन",
  planCashMixHeading: "पुढच्या महिन्यात दुकान किती पेलू शकते",
  planCashMixHint: "अंदाज बदला, नंतर ऑर्डर देण्यापूर्वी दैनंदिन रनवे तपासा.",
  makeDecisionKicker: "निर्णय घ्या",
  makeDecisionHeading: "पुढील घाऊक देयकाचे नियोजन करा",

  // ── ShopSetup ─────────────────────────────────────────────────────
  startWithToday: "आजची स्थिती",
  shopSetupSubtitle: "तुमच्या दुकानाबद्दल सांगा",
  shopSetupIntro:
    "आमच्याकडे जे आहे ते जोडू आणि पुढच्या स्टॉक ऑर्डरपूर्वी द्यायचे ते वजा करू.",
  bankTodayQuestion: "आज तुमच्या बँकेत किती पैसे आहेत?",
  bankTodayHelper: "तुमची सध्याची बँक शिल्लक, या महिन्याची विक्री नाही.",
  drawerCashQuestion: "गल्ल्यात किती रोख रक्कम आहे?",
  drawerCashHelper: "स्टॉक ऑर्डरसाठी वापरू शकता ती रोख रक्कम मोजा.",
  moneyGoingOutQuestion: "त्याआधी किती पैसे जाणार?",
  moneyGoingOutHelper: "भाडे, पगार, बिले किंवा इतर नेहमीची देयके.",
  promisedPaymentsQuestion: "तुम्ही आधीच किती देणे लागतो?",
  promisedPaymentsHelper: "या ऑर्डरपूर्वी द्यायची पुरवठादार देयके किंवा बिले.",
  shopSetupSubmit: "माझे स्टॉक पैसे दाखवा",

  // ── DataImport ────────────────────────────────────────────────────
  dataImportKicker: "तुमचे आकडे निवडा",
  dataImportHeading: "तुमचा देयक इतिहास वापरा",
  dataImportIntro:
    "तुमच्या दुकानाच्या देयकांवरून अंदाज मिळवण्यासाठी UPI किंवा POS CSV अपलोड करा. आम्ही फक्त डिजिटल देयके वापरतो, त्यामुळे रोख विक्री स्पष्टपणे अंदाज म्हणून दर्शविली जाते.",
  chooseCsv: "CSV फाईल निवडा",
  uploadingForecast: "तुमचा अंदाज तयार होत आहे…",
  useThisFile: "ही फाईल वापरा",
  useSampleData: "आत्ता नमुना डेटा वापरा",

  // ── RetailSummary ─────────────────────────────────────────────────
  moneyTodayLabel: "आजचे तुमचे पैसे",
  inBank: "बँकेत",
  inDrawer: "गल्ल्यात",
  goingOutLabel: "ऑर्डरपूर्वी जाणारे पैसे",
  goingOutCaption: "तुम्ही सांगितलेली बिले आणि देयके",
  leftBeforeSalesLabel: "नव्या विक्रीपूर्वी शिल्लक",
  changeShopDetails: "दुकानाचे तपशील बदला",
  totalInflowLabel: "अपेक्षित एकूण उत्पन्न · पुढील ३० दिवस",
  totalInflowCaption: "अपेक्षित UPI पैसे + अंदाजित रोख विक्री",
  bankLabel: "अपेक्षित UPI पैसे",
  gallaLabel: "अंदाजित रोख विक्री",
  bankSummaryLabel: "अपेक्षित UPI पैसे · पुढील ३० दिवस",
  bankSummaryCaption: "तुमच्या मागील UPI देयकांच्या आधारे",
  dailyAverageLabel: "दैनंदिन सरासरी",
  dailyAverageCaption: "प्रति दिन अपेक्षित सरासरी उत्पन्न",
  perDay: "/दिवस",
  peakDayLabel: "सर्वाधिक व्यस्त दिवस",
  peakDayCaption: "सर्वाधिक एकदिवसीय विक्री",
  safeBudgetLabel: "सुरक्षित स्टॉकिंग मर्यादा",
  safeBudgetCaption: "बफर ठेवण्यासाठी बँक शिल्लकीच्या ७५%",
  safetyNote: "सुरक्षिततेसाठी ७५% राखून ठेवले",

  // ── CalibrationSlider ─────────────────────────────────────────────
  cashCustomersQuestion: "१० पैकी किती ग्राहक रोख देतात?",
  cashSliderLabel: "१० पैकी किती ग्राहक रोख देतात?",
  cashSliderValueText: "पैकी १०",
  cashHelper: "खात्री नाही? मागच्या १० ग्राहकांचा विचार करा. किती जणांनी रोख दिले?",
  highCashWarning: "जास्त रोख अवलंबित्व: तुमचा अंदाज रोख खरेदीदारांवर खूप अवलंबून आहे. सुरक्षित राखीव ठेवा.",

  // ── DualRunwayChart ───────────────────────────────────────────────
  totalForDay: "दिवसाची एकूण रक्कम",

  // ── RestockSimulator ──────────────────────────────────────────────
  simulatorHeading: "मी हा ऑर्डर देऊ शकतो का?",
  paymentLabel: "घाऊक देयक",
  dateLabel: "देय तारीख",
  verdictIdleText: "रक्कम टाका आणि हे सुरक्षित आहे का ते पाहण्यासाठी तारीख निवडा.",
  verdictGreenHeading: "खरेदी सुरक्षित आहे",
  verdictGreenText: "तुमच्याकडे असलेले आणि येणारे पैसे हे देयक भरण्यासाठी पुरेसे आहेत.",
  verdictYellowHeading: "गल्ल्यातील रोखीची गरज आहे",
  verdictRedHeading: "धोका जास्त आहे",
  copyWhatsApp: "व्हॉट्सॲप सारांश कॉपी करा",
  copiedNotice: "सारांश क्लिपबोर्डवर कॉपी केला!",
  moneyInBankAfterPayments: "पर्यंतच्या देयकांनंतर बँकेतील पैसे",
  cashInDrawer: "गल्ल्यातील रोख",
  expectedCashCaption: "अपेक्षित रोखमध्ये गल्ल्यातील पैसे आणि",
  expectedCashCaptionSuffix: "पैकी १० ग्राहकांनी रोख दिल्याचा अंदाज समाविष्ट आहे.",

  // ── AdvisorPanel ──────────────────────────────────────────────────
  advisorHeading: "रोख रक्कम उभी करण्याचे उपाय",
  askAi: "एआय ला विचारा",
  advisorLoading: "तुमच्या दुकानासाठी कल्पना विचारत आहोत…",
  advisorNote: "सूचना सामान्य किरकोळ स्वरूपाच्या आहेत. ऑर्डर देण्यापूर्वी तुमच्या प्रत्यक्ष दुकानाच्या आकड्यांशी पडताळणी करा.",
  advisorError: "कल्पना मिळवता आल्या नाहीत. बॅकएंड सर्व्हर चालू असल्याची खात्री करा आणि पुन्हा प्रयत्न करा.",

  // ── AccountAggregatorModal ────────────────────────────────────────
  aaStep1Title: "अकाउंट ॲग्रीगेटरद्वारे बँक जोडा",
  aaStep2Title: "संमती OTP सत्यापित करा",
  aaStep3Title: "लेजर मिळवत आहे",
  aaStep1Desc: "सत्यापित डिजिटल इतिहास मिळवण्यासाठी तुमचे व्यापारी खाते निवडा.",
  aaBankLabel: "तुमची बँक",
  aaMobileLabel: "नोंदणीकृत मोबाईल नंबर",
  aaRequestOtp: "संमती OTP मागवा",
  aaOtpPrompt: "नोंदणीकृत मोबाईलवर पाठवलेला OTP टाका",
  aaOtpDemoHint: "डेमो OTP टाका: 1234",
  aaOtpLabel: "OTP",
  aaVerify: "सत्यापित करा आणि लेजर मिळवा",
  aaFetching: "Sahamati / Account Aggregator फ्रेमवर्कद्वारे १२ महिन्यांचा एनक्रिप्टेड UPI लेजर मिळवत आहे…",

  // ── LandingPage ───────────────────────────────────────────────────
  navHowItWorks: "हे कसे काम करते",
  navBuiltFor: "किरकोळ व्यापारासाठी",
  navWhyItMatters: "हे का महत्त्वाचे आहे",
  navGetStarted: "सुरू करा",
  landingEyebrow: "व्यापाऱ्यांसाठी सण-उत्सवाचे स्टॉक नियोजन",
  landingHeroHeading: "जाणून घ्या तुमची दुकान पुढे किती माल उचलू शकते.",
  landingHeroText:
    "व्यापार रनवे भारतीय किरकोळ व्यापाऱ्यांना सणांच्या गर्दीपूर्वी देयक इतिहासाचे स्पष्ट स्टॉक प्लॅनमध्ये रूपांतर करण्यास मदत करतो.",
  landingSeeHow: "हे कसे काम करते ते पहा",
  landingNext30Days: "पुढील ३० दिवस",
  landingForecastReady: "अंदाज तयार",
  landingProjectedInflow: "अपेक्षित एकूण आवक",
  landingBankUpi: "बँक UPI",
  landingEstimatedCash: "अंदाजित रोख",
  landingProofText:
    "आजची विक्री आणि उद्याची स्टॉक ऑर्डर यामधील निर्णयांसाठी तयार केलेले.",
  landingProofItem1: "UPI इतिहास",
  landingProofItem2: "रोख अंदाज",
  landingProofItem3: "उत्सवी मागणी",
  landingProofItem4: "घाऊक नियोजन",
  landingSection1Eyebrow: "एक स्पष्ट दृष्टिकोन",
  landingSection1Heading: "देयक संकेतांवरून अधिक चांगल्या स्टॉक निर्णयाकडे.",
  landingSection1Desc:
    "दुसरे कोणतेही हिशोबाचे ॲप नाही. जेव्हा तुम्हाला किती माल खरेदी करायचा हे ठरवायचे असते, तेव्हासाठी एक केंद्रित नियोजन साधन.",
  landingPoint1Title: "पुढील ३० दिवस पहा",
  landingPoint1Text:
    "पुढील स्टॉक देयकापूर्वी तुमच्या दुकानात येणाऱ्या संभाव्य UPI पैशांचा सोपा अंदाज.",
  landingPoint2Title: "रोख विक्रीही लक्षात घ्या",
  landingPoint2Text:
    "गल्ल्यात रोख देणाऱ्या ग्राहकांसाठी समायोजन करा, बँकेतील पैशांशी गल्लत न करता.",
  landingPoint3Title: "ऑर्डर देण्यापूर्वी योजना करा",
  landingPoint3Text:
    "अपेक्षित आवकेनुसार घाऊक देयकाची चाचणी घ्या आणि जोखमीची ऑर्डर आधीच ओळखा.",
  landingSection2Eyebrow: "खात्री आणि आत्मविश्वासासाठी डिझाइन केलेले",
  landingSection2Heading:
    "सत्यापित बँक शिल्लक आणि अंदाजित रोख दोन्ही एकाच वेळी नजरेसमोर ठेवा.",
  landingSection2Copy:
    "UPI मधून काय येते, थेट ग्राहकांवर काय अवलंबून आहे आणि दोन्ही तुमच्या पुढील ऑर्डरवर कसा परिणाम करतात ते पहा.",
  landingAudienceEyebrow: "दुकानदारांच्या गरजेनुसार",
  landingAudienceHeading: "जेव्हा सणांची गर्दी जवळ असते तेव्हा अत्यंत उपयुक्त.",
  landingAudience1: "किराणा दुकाने",
  landingAudience2: "सण-उत्सव विक्रेते",
  landingAudience3: "स्थानिक घाऊक व्यापारी",
  landingAudience4: "वाढती किरकोळ दुकाने",
  landingCtaEyebrow: "तुमच्या पुढच्या ऑर्डरपासून सुरुवात करा",
  landingCtaHeading: "संपूर्ण चित्र स्पष्ट असताना पुढील स्टॉक निर्णय घ्या.",
  landingOpenApp: "व्यापार रनवे उघडा",
  landingFooterBrand: "व्यापार रनवे",
  landingFooterTagline: "उत्सव स्टॉक नियोजन",
};

const translations: Record<Language, Record<TranslationKey, string>> = {
  en: english,
  hi: hindi,
  mr: marathi,
};

export function translate(language: Language, key: TranslationKey): string {
  return translations[language]?.[key] ?? english[key];
}