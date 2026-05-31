import React, { useState } from 'react';
import { Icons } from './Icons';

export default function Helpdesk({ darkMode = false }) {
  const [lang, setLang] = useState('en'); // 'en' or 'hi'
  const [activeTab, setActiveTab] = useState('overview');

  // Multi-language Text Content dictionary
  const content = {
    en: {
      title: 'Portal Helpdesk & Standard Operating Procedure (SOP)',
      subtitle: 'Complete technical reference guide, calculations, logic, and graph interpretations.',
      toggleLang: 'हिंदी में देखें',
      tabs: {
        overview: '1. Overview & Navigation',
        kpi: '2. KPIs & Health Score Logic',
        charts: '3. Chart & Graph Interpretations',
        rankings: '4. Best Performers & Rankings',
        checker: '5. Anomalies & Sync Checker'
      },
      kpiSection: {
        title: 'Key Performance Indicators (KPIs) Explained',
        desc: 'KPI Summary Cards provide a high-level view of filtered school networks. Each card represents a distinct data dimension.',
        formulaTitle: 'Calculation Formula',
        logicTitle: 'Business Logic & Impact',
        cards: [
          {
            name: 'Schools Covered',
            metric: '🏫 125 Schools',
            formula: 'Total count of unique schools matching active project, district, block, and coordinator filters.',
            logic: 'Establishes the denominator/baseline size for all other percentages. If a school has no records in any uploaded file, it is still included in this baseline.',
            visualType: 'card',
            color: 'border-teal-200 bg-emerald-50/20'
          },
          {
            name: 'Active CC/DEF',
            metric: '👤 12 Coordinators',
            formula: 'Distinct count of CC/DEF visitor names assigned to the filtered schools.',
            logic: 'Helps track supervisory resources. Visitor names are mapped and normalized using spelling correction lists to resolve personnel spelling duplicates.',
            visualType: 'card',
            color: 'border-teal-200 bg-emerald-50/20'
          },
          {
            name: 'Avg Performance',
            metric: '📊 72.4%',
            formula: 'Weighted average of JHPMS (30%), EduStat (25%), Visit Coverage (25%), and Manpower (20%) scores across schools.',
            logic: 'The overall health rating of the network. If any database stream is excluded in the filters, weights are dynamically redistributed to equal 100%.',
            visualType: 'card',
            color: 'border-teal-200 bg-emerald-50/20'
          },
          {
            name: 'Working Labs',
            metric: '🖥️ 88.0%',
            formula: '(Schools with at least 1 JHPMS class logged / Total Schools) * 100',
            logic: 'Calculates the ratio of active labs. If a school has 0 classes logged in JHPMS during the date range, the lab is flagged as Inactive/Non-Functional.',
            visualType: 'card',
            color: 'border-teal-200 bg-emerald-50/20'
          },
          {
            name: 'Schools Actually Visited',
            metric: '✅ 74.0%',
            formula: '(Schools meeting visit targets / Total Schools) * 100. Target = monthly_target * evaluation_duration_in_months.',
            logic: 'Measures physical visitor compliance. For targets, only unique visit dates representing actual visits are counted. Multiple visits on a single day to the same school count as 1.',
            visualType: 'card',
            color: 'border-teal-200 bg-emerald-50/20'
          },
          {
            name: 'Total Computer Usage Hours',
            metric: '⏱️ 4,250 Hrs',
            formula: 'Sum of all device usage hours extracted from filtered EduStat daily log sheets.',
            logic: 'Measures hardware utilization intensity. Robust parsing maps H:MM strings into decimal hours. Values are capped at 6 hours/day per school to ignore logs anomaly.',
            visualType: 'card',
            color: 'border-teal-200 bg-emerald-50/20'
          },
          {
            name: 'Schools Needing Urgent Help',
            metric: '🚨 14 Schools',
            formula: 'Count of schools with Composite Performance Score < 30% (excluding pure zero-data schools).',
            logic: 'Highlights critical bottleneck locations requiring technical operations or administrative deployment.',
            visualType: 'card',
            color: 'border-red-200 bg-rose-50/20'
          }
        ]
      },
      healthSection: {
        title: 'Composite Health Score & Grading System',
        desc: 'The portal aggregates JHPMS, EduStat, Visits, and Manpower inputs into a single performance percentage.',
        weightsTitle: 'Canonical Component Weights',
        weights: [
          { name: 'JHPMS Labs', weight: 30, desc: 'Evaluates classes conducted. Measured as ratio of schools logging any classes.' },
          { name: 'EduStat Hours', weight: 25, desc: 'Evaluates machine sync and CPU hours. Capped based on max hours.' },
          { name: 'Visit Coverage', weight: 25, desc: 'Evaluates physical oversight checks. Unique visit dates vs scaled target.' },
          { name: 'CC Manpower', weight: 20, desc: 'Evaluates instructor stability. Active = 100%, Pending = 40%, Vacant = 0%.' }
        ],
        gradingTitle: 'Overall Health Grading System',
        grades: [
          { label: 'Excellent', range: '≥ 80%', color: 'text-emerald-700 bg-emerald-100/50', action: 'Highly stable. Replicate teaching best practices to other zones.' },
          { label: 'On-Track', range: '60% - 79%', color: 'text-teal-700 bg-teal-100/50', action: 'Stable operations. Focus on improving device sync hours.' },
          { label: 'Needs Attention', range: '40% - 59%', color: 'text-amber-700 bg-amber-100/50', action: 'At-risk. Schedule physical inspection by CCs/DEFs immediately.' },
          { label: 'Critical', range: '< 40%', color: 'text-red-700 bg-red-100/50', action: 'Dysfunctional. Immediate technical dispatch and manpower deployment required.' }
        ]
      },
      overviewSection: {
        introTitle: 'Portal Standard Operating Procedure (SOP)',
        introDesc: 'This portal serves as an executive decision system for monitoring Jharkhand Government ICT labs and Smart Classes. It integrates diverse operational streams into a unified analytics cockpit.',
        menuTitle: 'Sidebar Menu Navigation & Capabilities',
        menus: [
          { name: 'Home', desc: 'Welcome landing pad. Displays user details, roles, district jurisdiction details, and general portal information.' },
          { name: 'Dashboard', desc: 'High-level maps and KPI cards. Aggregates data by district and displays touch targets vs actual visits.' },
          { name: 'Lab Visit', desc: 'Deep dive into visit logs. Includes search views, visit trends, planned vs completed charts, and data quality check indices.' },
          { name: 'Reports & Export', desc: 'Enables downloading raw, filtered records in Microsoft Excel format for further audit.' },
          { name: 'Overall Analysis', desc: 'The executive cockpit dashboard. Contains KPI summary cards, composite health radial gauges, auto-compiled narrative text, achievements, and data anomalies tables.' },
          { name: 'System Setup / Data Upload', desc: 'Admin upload area. Allows loading monthly Excel data files (JHPMS, EduStat, Visits, Manpower) into the cloud. Performs automated duplicate check and self-healing.' },
          { name: 'Profile Creation', desc: 'Access control area. Admin can create user profiles, manage roles (Admin vs Standard User), and apply district-level access gating.' }
        ]
      },
      chartsSection: {
        title: 'Chart & Graph Interpretations',
        desc: 'Guidelines on how to read and interpret the trend visualizations in the portal.',
        items: [
          {
            name: 'Overall Health Radial Gauge (ApexCharts)',
            detail: 'Displays the average composite health score as a semi-circle gauge. Colors transition dynamically from green (excellent) to amber (warning) to red (critical) based on the score tier.',
            howToRead: 'Look at the central percentage and grade. Tap or hover on the gauge to inspect individual weights and constituent scores.'
          },
          {
            name: 'Month-wise Class Status (Area Chart)',
            detail: 'Stacked area chart showing Smart Classes, ICT Classes, and MIS work counts month-by-month.',
            howToRead: 'Hover over points to see exact monthly counts. Legends are interactive: tap on any legend (e.g. MIS Work) to hide it from the view and analyze purely academic classes.'
          },
          {
            name: 'MoM KPI Comparison (Bar Chart)',
            detail: 'Compares current metrics against the previous equal date range. Green upward arrow (▲) shows gain, and red downward arrow (▼) shows decline.',
            howToRead: 'Tells you if the school network is improving or degrading. Used for reviewing monthly performance velocity.'
          },
          {
            name: 'Planned vs Completed Visits (Grouped Bar)',
            detail: 'Compares the target visit count (based on school targets) against completed unique visits grouped by Block.',
            howToRead: 'Grey bars represent Planned targets. Purple bars represent Completed visits. Large gaps represent visitor neglect blocks.'
          },
          {
            name: 'Field Visit Aging Status (Bar Chart)',
            detail: 'Groups schools based on how many days have passed since their last physical CC visit (e.g. 0-30 days, 31-60 days, etc.).',
            howToRead: 'Ideally, all bars should cluster in the "0-30 Days" column. Tall bars in "90+ Days" show severe neglect and require scheduling CC visits.'
          },
          {
            name: 'Geographic Treemap (Block Map)',
            detail: 'Interactive box-map. Size of each box represents the number of schools in that block. Color represents the average health score.',
            howToRead: 'Red boxes are priority areas. Hover over boxes to see block averages. Click the expand button to view a fullscreen map.'
          }
        ]
      },
      rankingsSection: {
        title: 'Achievements & Rankings Logic',
        desc: 'How the portal automatically calculates the rankings and awards badges under the "What\'s Going Well" panel.',
        rules: [
          {
            name: 'Top Performing District',
            logic: 'The district having the highest mathematical average of composite scores across all its schools.',
            detail: 'Requires at least 2 active schools in the district. Displays total classes and hours logged by the entire district.'
          },
          {
            name: 'Star Utilization School',
            logic: 'Calculated as the sum of JHPMS ICT classes, Smart classes, and EduStat device hours.',
            detail: 'Highest total sum wins. Highlights the school getting maximum utility out of their hardware investment.'
          },
          {
            name: 'Top Performing CC/DEF/Instructor',
            logic: 'Evaluates the performance of manpower. Schools are grouped by instructor name, and their average score is compared.',
            detail: 'The CC/Instructor with the highest average score is highlighted. Note: CC leaderboard lists the top 10 CCs.'
          }
        ]
      },
      checkerSection: {
        title: 'Mismatched-Data Checker & Sync Warnings',
        desc: 'The portal performs cross-source data triangulation. If two database files contradict each other, an anomaly is flagged.',
        warnings: [
          {
            name: 'Hardware Sync Mismatch',
            trigger: 'JHPMS logs >15 classes conducted, but EduStat records 0 PC hours.',
            meaning: 'The instructor logged classes manually, but the computer monitoring software recorded zero usage. This indicates either a device sync failure, power cut, or incorrect log entry.',
            level: 'Critical'
          },
          {
            name: 'Visit Inefficacy',
            trigger: 'CC visited a school >4 times in 30 days, but the school composite score remains <20%.',
            meaning: 'Despite multiple supervisory visits, the school\'s performance is not improving. Indicates that visits are not resolving local bottlenecks.',
            level: 'High'
          },
          {
            name: 'Roster Out of Sync',
            trigger: 'School is logging active JHPMS classes, but manpower list marks it as Vacant.',
            meaning: 'The database says there is no teacher assigned, but classes are actively being logged. Indicates the manpower list is outdated.',
            level: 'Medium'
          },
          {
            name: 'Device Sync Warning (Sync Gap)',
            trigger: 'Count of schools with JHPMS > 0 and EduStat hours = 0.',
            meaning: 'Sync gap flag showing the count of schools whose monitoring data is offline or not syncing to the central server.',
            level: 'Sync Gap'
          }
        ]
      }
    },
    hi: {
      title: 'पोर्टल हेल्पडेस्क और मानक संचालन प्रक्रिया (SOP)',
      subtitle: 'संपूर्ण तकनीकी संदर्भ गाइड, गणना, तर्क, और ग्राफ का अर्थ कैसे समझें।',
      toggleLang: 'View in English',
      tabs: {
        overview: '1. अवलोकन और नेविगेशन',
        kpi: '2. KPI और स्वास्थ्य स्कोर लॉजिक',
        charts: '3. चार्ट और ग्राफ का अर्थ',
        rankings: '4. रैंकिंग और श्रेष्ठ प्रदर्शन लॉजिक',
        checker: '5. विसंगतियां और सिंक चेकर'
      },
      kpiSection: {
        title: 'कुंजी प्रदर्शन संकेतक (KPIs) का विवरण',
        desc: 'KPI कार्ड आपके नेटवर्क का समग्र विवरण देते हैं। हर कार्ड एक विशेष माप को दर्शाता है।',
        formulaTitle: 'गणना का सूत्र (Formula)',
        logicTitle: 'तर्क और महत्व (Logic)',
        cards: [
          {
            name: 'कुल स्कूल (Schools Covered)',
            metric: '🏫 125 स्कूल',
            formula: 'सक्रिय प्रोजेक्ट, जिला, ब्लॉक और समन्वयक (CC) फ़िल्टर से मेल खाने वाले अद्वितीय स्कूलों की कुल संख्या।',
            logic: 'यह अन्य सभी गणनाओं के लिए बेसलाइन (Denominator) तय करता है। यदि किसी स्कूल का डेटा किसी फ़ाइल में उपलब्ध नहीं भी है, तो भी वह इस सूची में रहेगा।',
            visualType: 'card',
            color: 'border-teal-200 bg-emerald-50/20'
          },
          {
            name: 'सक्रिय सीसी/डीईएफ (Active CC/DEF)',
            metric: '👤 12 समन्वयक',
            formula: 'फ़िल्टर किए गए स्कूलों से जुड़े CC/DEF विजिटर्स की कुल संख्या।',
            logic: 'निगरानी टीम की ट्रैकिंग में मदद करता है। स्पेलिंग सुधार सूची का उपयोग करके नाम के डुप्लिकेट्स को ठीक किया जाता है।',
            visualType: 'card',
            color: 'border-teal-200 bg-emerald-50/20'
          },
          {
            name: 'औसत प्रदर्शन (Avg Performance)',
            metric: '📊 72.4%',
            formula: 'सभी स्कूलों के JHPMS (30%), EduStat (25%), विजिट कवरेज (25%), और मैनपावर (20%) स्कोर का भारित औसत (Weighted Average)।',
            logic: 'यह नेटवर्क का समग्र स्वास्थ्य स्कोर है। यदि कोई डेटा स्ट्रीम फ़िल्टर में बंद की जाती है, तो वेटेज को स्वचालित रूप से दोबारा री-डिस्ट्रिब्यूट कर दिया जाता है ताकि वह कुल 100% ही रहे।',
            visualType: 'card',
            color: 'border-teal-200 bg-emerald-50/20'
          },
          {
            name: 'सक्रिय लैब्स (Working Labs)',
            metric: '🖥️ 88.0%',
            formula: '(कम से कम 1 JHPMS क्लास चलाने वाले स्कूल / कुल स्कूल) * 100',
            logic: 'सक्रिय लैब्स का प्रतिशत। यदि किसी तिथि सीमा में किसी स्कूल ने 0 क्लास ली हैं, तो उसे "निष्क्रिय लैब" के रूप में चिह्नित किया जाता है।',
            visualType: 'card',
            color: 'border-teal-200 bg-emerald-50/20'
          },
          {
            name: 'विजिट लक्ष्य पूर्ण स्कूल (Visited Schools)',
            metric: '✅ 74.0%',
            formula: '(विजिट लक्ष्य पूरा करने वाले स्कूल / कुल स्कूल) * 100। लक्ष्य = मासिक लक्ष्य * अवधि (महीनों में)।',
            logic: 'समन्वयकों (CC) के विजिट अनुपालन को मापता है। विजिट टारगेट के लिए केवल अद्वितीय विजिट तिथियों को गिना जाता है (एक दिन में एक ही स्कूल में की गई अनेक विजिट को 1 गिना जाता है)।',
            visualType: 'card',
            color: 'border-teal-200 bg-emerald-50/20'
          },
          {
            name: 'कंप्यूटर उपयोग घंटे (Total Usage Hours)',
            metric: '⏱️ 4,250 घंटे',
            formula: 'EduStat दैनिक लॉग फ़ाइलों से प्राप्त कुल कंप्यूटर उपयोग के घंटों का योग।',
            logic: 'हार्डवेयर उपयोग की तीव्रता को दर्शाता है। यह H:MM फॉर्मेट को दशमलव घंटों में बदलता है और त्रुटियों को रोकने के लिए प्रति दिन अधिकतम 6 घंटे की सीमा लागू करता है।',
            visualType: 'card',
            color: 'border-teal-200 bg-emerald-50/20'
          },
          {
            name: 'तत्काल सहायता वाले स्कूल (Urgent Help Schools)',
            metric: '🚨 14 स्कूल',
            formula: 'कुल स्कूल जिनका समग्र स्वास्थ्य स्कोर (Composite Score) < 30% है (शून्य डेटा वाले स्कूलों को छोड़कर)।',
            logic: 'यह उन स्कूलों की पहचान करता है जहां तत्काल तकनीकी सहायता या शिक्षक नियुक्ति की आवश्यकता है।',
            visualType: 'card',
            color: 'border-red-200 bg-rose-50/20'
          }
        ]
      },
      healthSection: {
        title: 'समग्र स्वास्थ्य स्कोर और ग्रेडिंग प्रणाली',
        desc: 'यह पोर्टल JHPMS, EduStat, विजिट, और मैनपावर डेटा को जोड़कर एक प्रतिशत स्कोर बनाता है।',
        weightsTitle: 'घटकों का भार (Component Weights)',
        weights: [
          { name: 'JHPMS लैब्स', weight: 30, desc: 'क्लास लेने की दर को मापता है। JHPMS में दर्ज क्लास की संख्या पर आधारित।' },
          { name: 'EduStat घंटे', weight: 25, desc: 'कंप्यूटर चलने के घंटों को मापता है। अधिकतम उपयोग घंटों के आधार पर स्कोर।' },
          { name: 'विजिट कवरेज', weight: 25, desc: 'शारीरिक रूप से अधिकारियों के जाने को मापता है। विजिट लक्ष्य के सापेक्ष स्कोर।' },
          { name: 'CC मैनपावर', weight: 20, desc: 'शिक्षक की उपस्थिति। सक्रिय = 100%, प्रक्रियाधीन = 40%, खाली (Vacant) = 0%।' }
        ],
        gradingTitle: 'समग्र स्वास्थ्य ग्रेडिंग स्केल',
        grades: [
          { label: 'उत्कृष्ट (Excellent)', range: '≥ 80%', color: 'text-emerald-700 bg-emerald-100/50', action: 'पूरी तरह स्थिर। शिक्षण के अच्छे तरीकों को अन्य क्षेत्रों में लागू करें।' },
          { label: 'ट्रैक पर (On-Track)', range: '60% - 79%', color: 'text-teal-700 bg-teal-100/50', action: 'सामान्य संचालन। डिवाइस सिंक टाइम और कंप्यूटर आवर्स बढ़ाने पर ध्यान दें।' },
          { label: 'ध्यान दें (Needs Attention)', range: '40% - 59%', color: 'text-amber-700 bg-amber-100/50', action: 'जोखिम में। समन्वयकों को तुरंत भौतिक निरीक्षण के लिए भेजें।' },
          { label: 'गंभीर (Critical)', range: '< 40%', color: 'text-red-700 bg-red-100/50', action: 'अक्रिय लैब। तकनीकी टीम और नए शिक्षक की तत्काल तैनाती आवश्यक।' }
        ]
      },
      overviewSection: {
        introTitle: 'पोर्टल मानक संचालन प्रक्रिया (SOP)',
        introDesc: 'यह पोर्टल झारखंड सरकार के ICT लैब और स्मार्ट क्लास की निगरानी के लिए एक निर्णय प्रणाली है। यह विभिन्न परिचालन डेटा को एक ही स्थान पर एकत्रित करता है।',
        menuTitle: 'साइडबार मेनू विकल्प और उनकी क्षमताएं',
        menus: [
          { name: 'होम (Home)', desc: 'स्वागत पृष्ठ। यहां उपयोगकर्ता की भूमिका, जिला अधिकार क्षेत्र और पोर्टल की बुनियादी जानकारी दिखाई देती है।' },
          { name: 'डैशबोर्ड (Dashboard)', desc: 'उच्च स्तरीय मानचित्र और KPI विवरण। यह जिलों के अनुसार लक्ष्य और विजिट के अंतर को दर्शाता है।' },
          { name: 'लैब विजिट (Lab Visit)', desc: 'विजिट लॉग्स का गहन विवरण। इसमें सर्च व्यू, विजिट ट्रेंड्स, और डेटा विश्वसनीयता रिपोर्ट उपलब्ध हैं।' },
          { name: 'रिपोर्ट्स और एक्सपोर्ट (Reports & Export)', desc: 'आगे की ऑडिट के लिए पूरे पोर्टल के डेटा को माइक्रोसॉफ्ट एक्सेल फॉर्मेट में डाउनलोड करने की सुविधा।' },
          { name: 'समग्र विश्लेषण (Overall Analysis)', desc: 'डैशबोर्ड का मुख्य हिस्सा। इसमें KPI कार्ड्स, कंपोजिट हेल्थ गेज, एआई द्वारा लिखित विवरण और विसंगतियां दिखाई देती हैं।' },
          { name: 'सिस्टम सेटअप (Data Upload)', desc: 'प्रशासक (Admin) क्षेत्र। यहाँ Supabase क्लाउड में एक्सेल डेटा फाइलों (JHPMS, EduStat, विजिट, मैनपावर) को अपलोड किया जाता है।' },
          { name: 'प्रोफाइल निर्माण (Profile Creation)', desc: 'सुरक्षा और नियंत्रण। एडमिन यहाँ नए उपयोगकर्ताओं के खाते बना सकता है और उनके जिले के अधिकार क्षेत्र को तय कर सकता है।' }
        ]
      },
      chartsSection: {
        title: 'चार्ट और ग्राफ को कैसे पढ़ें और समझें',
        desc: 'पोर्टल में दिखाए जाने वाले विभिन्न ग्राफ और उनके विश्लेषण की व्याख्या नीचे दी गई है।',
        items: [
          {
            name: 'समग्र स्वास्थ्य रेडियल गेज (ApexCharts)',
            detail: 'यह अर्ध-वृत्ताकार गेज कुल स्वास्थ्य स्कोर को दर्शाता है। स्कोर के आधार पर इसका रंग स्वयं हरा (उत्कृष्ट), पीला (चेतावनी), या लाल (गंभीर) में बदल जाता है।',
            howToRead: 'मुख्य प्रतिशत स्कोर देखें। घटक स्कोर देखने के लिए गेज पर माउस ले जाएं (Hover करें) या उस पर टैप करें।'
          },
          {
            name: 'माहवार क्लास स्थिति (Area Chart)',
            detail: 'स्मार्ट क्लास, कंप्यूटर क्लास और एमआईएस वर्क को समय के साथ (माह-दर-माह) दिखाने वाला एक ढालू एरिया चार्ट।',
            howToRead: 'बिंदुओं पर होवर करके महीने का विवरण देखें। नीचे दिए गए लेजेंड्स पर क्लिक करके अवांछित श्रेणियों (जैसे MIS) को ग्राफ से छिपाया जा सकता है।'
          },
          {
            name: 'MoM तुलनात्मक प्रदर्शन (Bar Chart)',
            detail: 'यह चार्ट वर्तमान अवधि के डेटा की तुलना ठीक पिछली समान अवधि से करता है। हरा तीर (▲) बढ़त और लाल तीर (▼) गिरावट को दर्शाता है।',
            howToRead: 'यह देखने के लिए प्रयोग करें कि क्या नेटवर्क का प्रदर्शन सुधर रहा है या खराब हो रहा है।'
          },
          {
            name: 'नियोजित बनाम पूर्ण विजिट (Planned vs Completed)',
            detail: 'ब्लॉक के अनुसार कुल विजिट लक्ष्यों और पूर्ण की गई विजिट की तुलना करने वाला दोहरे बार का चार्ट।',
            howToRead: 'ग्रे बार तय लक्ष्य को दर्शाता है और बैंगनी बार पूरी की गई विजिट को। यदि दोनों के बीच बड़ा अंतर है, तो वह ब्लॉक विजिट की कमी से जूझ रहा है।'
          },
          {
            name: 'विजिट न होने के दिनों की स्थिति (Visit Aging Status)',
            detail: 'स्कूलों को उनके अंतिम विजिट के दिनों के अंतराल पर वर्गीकृत करता है (जैसे 0-30 दिन, 31-60 दिन आदि)।',
            howToRead: 'आदर्श रूप से सभी स्कूल "0-30 Days" वाले कॉलम में होने चाहिए। "90+ Days" वाले स्कूल गंभीर उपेक्षा को दर्शाते हैं।'
          },
          {
            name: 'भौगोलिक मानचित्र (Block performance Map)',
            detail: 'बॉक्स-मैप। बड़े बक्से अधिक स्कूलों वाले ब्लॉक दिखाते हैं, जबकि उनका रंग ब्लॉक के औसत स्कोर को दर्शाता है।',
            howToRead: 'लाल रंग के बक्से कमजोर प्रदर्शन वाले ब्लॉक हैं। विस्तृत विवरण देखने के लिए आप नीचे दाएं कोने में दिए गए विस्तार बटन (expand) का उपयोग कर सकते हैं।'
          }
        ]
      },
      rankingsSection: {
        title: 'उपलब्धियां और श्रेष्ठ प्रदर्शन रैंकिंग लॉजिक',
        desc: 'पोर्टल स्वचालित रूप से विजेताओं और उनके विवरणों की गणना किस प्रकार करता है, इसका विवरण यहाँ है।',
        rules: [
          {
            name: 'सर्वश्रेष्ठ प्रदर्शन करने वाला जिला (Top District)',
            logic: 'वह जिला जिसका अपने सभी स्कूलों के कंपोजिट स्कोर का गणितीय औसत सबसे अधिक होता है।',
            detail: 'जिले में कम से कम 2 स्कूल सक्रिय होने चाहिए। यह उस जिले द्वारा चलाए गए कुल क्लासेस और घंटों को भी प्रदर्शित करता है।'
          },
          {
            name: 'स्टार उपयोगिता स्कूल (Star School)',
            logic: 'स्कूल के JHPMS ICT क्लासेस, स्मार्ट क्लासेस, और EduStat घंटों का कुल योग।',
            detail: 'जिस स्कूल का यह योग सर्वाधिक होगा, वह विजेता बनेगा। यह दर्शाता है कि किस स्कूल में हार्डवेयर का सबसे ज्यादा उपयोग हुआ है।'
          },
          {
            name: 'सर्वश्रेष्ठ CC / DEF / अनुदेशक',
            logic: 'स्कूलों को उनके अनुदेशक/CC के नाम के आधार पर समूहीकृत किया जाता है और उनके स्कूलों के औसत स्कोर की तुलना की जाती है।',
            detail: 'सबसे अधिक स्कोर वाले व्यक्ति को विजेता घोषित किया जाता है। CC लीडरबोर्ड टॉप 10 समन्वयकों को उनके औसत स्कोर से सूचीबद्ध करता है।'
          }
        ]
      },
      checkerSection: {
        title: 'विसंगतियां और सिंक चेकर (Triangulation)',
        desc: 'पोर्टल विभिन्न फ़ाइलों के डेटा की तुलना करता है। यदि दो डेटा स्रोतों में असंगति होती है, तो उसे विसंगति (Anomaly) के रूप में चिह्नित किया जाता है।',
        warnings: [
          {
            name: 'हार्डवेयर सिंक असंगति (Sync Mismatch)',
            trigger: 'JHPMS पर 15 से अधिक क्लासेस दिखाई गई हैं, लेकिन EduStat पर 0 कंप्यूटर घंटे हैं।',
            meaning: 'शिक्षक ने क्लासेस तो ली हैं लेकिन कंप्यूटर ट्रैकिंग सॉफ्टवेयर ने कोई रिकॉर्ड नहीं भेजा। यह कंप्यूटर खराब होने, इंटरनेट न होने, या गलत एंट्री का संकेत देता है।',
            level: 'Critical (गंभीर)'
          },
          {
            name: 'विजिट प्रभावहीनता (Visit Inefficacy)',
            trigger: 'CC ने महीने में 4 से अधिक विजिट की हैं, लेकिन स्कूल का स्कोर अभी भी 20% से कम है।',
            meaning: 'बार-बार विजिट करने के बावजूद स्कूल के प्रदर्शन में सुधार नहीं हो रहा है। यह दर्शाता है कि भौतिक विजिट स्थानीय समस्याओं को सुलझाने में विफल हो रही हैं।',
            level: 'High (उच्च)'
          },
          {
            name: 'रोस्टर असंगति (Roster out of Sync)',
            trigger: 'स्कूल में कक्षाएं चल रही हैं, लेकिन मैनपावर शीट में वहां शिक्षक का पद खाली (Vacant) है।',
            meaning: 'बिना शिक्षक के क्लास चलना दर्शाता है कि मैनपावर सूची अपडेट नहीं है या कोई अन्य शिक्षक अतिरिक्त प्रभार में क्लास ले रहा है।',
            level: 'Medium (मध्यम)'
          },
          {
            name: 'डिवाइस सिंक चेतावनी (Sync Warning)',
            trigger: 'उन स्कूलों की संख्या जहाँ JHPMS में कक्षाएं दर्ज हैं पर EduStat घंटे 0 हैं।',
            meaning: 'यह उन स्कूलों की संख्या दर्शाता है जिनका कंप्यूटर मॉनिटरिंग सिस्टम ऑफलाइन है या सर्वर से सिंक नहीं हो पा रहा है।',
            level: 'Sync Gap'
          }
        ]
      }
    }
  };

  const t = content[lang];

  return (
    <div className={`p-4 md:p-6 space-y-6 font-sans select-none animate-fade-in ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
      
      {/* ═══════ HEADER SECTION WITH LANGUAGE TOGGLE ═══════ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-teal-800 to-emerald-800 p-5 rounded-2xl text-white shadow-lg border border-teal-700/50">
        <div>
          <h1 className="text-xl md:text-2xl font-black font-serif flex items-center gap-2">
            <Icons.Help className="w-7 h-7 text-teal-300" />
            {t.title}
          </h1>
          <p className="text-xs text-teal-200/90 font-medium mt-1 font-sans">{t.subtitle}</p>
        </div>
        <button
          onClick={() => setLang(l => l === 'en' ? 'hi' : 'en')}
          className="self-start md:self-auto bg-white text-teal-900 font-extrabold text-xs px-4 py-2 rounded-xl shadow-md border border-teal-200 hover:bg-slate-50 transition active:scale-95 duration-150 font-sans"
        >
          🌐 {t.toggleLang}
        </button>
      </div>

      {/* ═══════ TABBED NAVIGATION ═══════ */}
      <div className="flex flex-wrap gap-1.5 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 no-print">
        {Object.entries(t.tabs).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition font-sans ${
              activeTab === key
                ? 'bg-teal-700 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ═══════ TAB 1: OVERVIEW & NAVIGATION ═══════ */}
      {activeTab === 'overview' && (
        <div className="portal-card bg-white dark:bg-slate-900 p-5 border border-slate-250 dark:border-slate-800 space-y-6">
          <div className="border-b pb-3.5">
            <h2 className="text-base font-extrabold text-teal-900 dark:text-teal-400 uppercase tracking-wider font-serif">
              {t.overviewSection.introTitle}
            </h2>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed font-sans">{t.overviewSection.introDesc}</p>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-black text-slate-700 dark:text-slate-350 uppercase tracking-wide font-sans">
              {t.overviewSection.menuTitle}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {t.overviewSection.menus.map((item, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 hover:bg-teal-50/20 dark:hover:bg-teal-950/5 transition">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">
                      {idx === 0 && '🏠'}
                      {idx === 1 && '📊'}
                      {idx === 2 && '👥'}
                      {idx === 3 && '📥'}
                      {idx === 4 && '📋'}
                      {idx === 5 && '⚙️'}
                      {idx === 6 && '👤'}
                    </span>
                    <span className="font-extrabold text-xs uppercase tracking-wider text-teal-800 dark:text-teal-400 font-sans">
                      {item.name}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal font-sans">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════ TAB 2: KPI & HEALTH SCORE LOGIC ═══════ */}
      {activeTab === 'kpi' && (
        <div className="space-y-6">
          
          {/* KPI Summary Cards */}
          <div className="portal-card bg-white dark:bg-slate-900 p-5 border border-slate-250 dark:border-slate-800">
            <div className="border-b pb-3.5 mb-5">
              <h2 className="text-base font-extrabold text-teal-900 dark:text-teal-400 uppercase tracking-wider font-serif">
                {t.kpiSection.title}
              </h2>
              <p className="text-xs text-slate-500 mt-1 leading-normal font-sans">{t.kpiSection.desc}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {t.kpiSection.cards.map((kpi, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-slate-150 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/10 flex flex-col md:flex-row gap-4 items-start">
                  
                  {/* Miniature Visual Mockup Snapshot */}
                  <div className={`p-4 rounded-xl border w-full md:w-44 shrink-0 shadow-sm font-sans flex flex-col justify-between ${kpi.color}`}>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{kpi.name}</span>
                    <span className="text-lg font-black font-mono mt-2 block">{kpi.metric}</span>
                    <div className="mt-3 bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                      <div className="h-full bg-teal-700 rounded-full" style={{ width: '75%' }} />
                    </div>
                  </div>

                  {/* Documentation */}
                  <div className="flex-1 space-y-2">
                    <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-350 uppercase tracking-wider">{kpi.name}</h4>
                    <div>
                      <span className="text-[10px] font-black text-teal-800 dark:text-teal-400 uppercase tracking-widest block">{t.kpiSection.formulaTitle}</span>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed font-sans">{kpi.formula}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-teal-800 dark:text-teal-400 uppercase tracking-widest block">{t.kpiSection.logicTitle}</span>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed font-sans">{kpi.logic}</p>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          </div>

          {/* Health Score Weights & Grades */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            
            {/* Component Weights */}
            <div className="portal-card lg:col-span-2 bg-white dark:bg-slate-900 p-5 border border-slate-250 dark:border-slate-800">
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 uppercase tracking-wider border-b pb-3 mb-4 font-serif">
                {t.healthSection.weightsTitle}
              </h3>
              
              {/* Miniature SVG Gauge Representation */}
              <div className="flex flex-col items-center justify-center p-3 border border-dashed rounded-xl mb-4 bg-slate-50/50 dark:bg-slate-950/20">
                <svg viewBox="0 0 100 50" className="w-32 h-16">
                  <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#e2e8f0" strokeWidth="12" strokeLinecap="round" />
                  <path d="M 10 50 A 40 40 0 0 1 78 22" fill="none" stroke="#0d9488" strokeWidth="12" strokeLinecap="round" />
                  <circle cx="50" cy="50" r="4" fill="#1e293b" />
                  <line x1="50" y1="50" x2="72" y2="28" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
                </svg>
                <span className="text-[10px] font-black uppercase text-teal-800 tracking-wider mt-1">Composite Score: 72%</span>
              </div>

              <div className="space-y-3">
                {t.healthSection.weights.map((w, idx) => (
                  <div key={idx} className="text-xs">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-slate-700 dark:text-slate-350">{w.name}</span>
                      <span className="text-teal-700 font-black">{w.weight}%</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-normal font-sans">{w.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Grading Scale */}
            <div className="portal-card lg:col-span-3 bg-white dark:bg-slate-900 p-5 border border-slate-250 dark:border-slate-800">
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 uppercase tracking-wider border-b pb-3 mb-4 font-serif">
                {t.healthSection.gradingTitle}
              </h3>
              
              <div className="space-y-3">
                {t.healthSection.grades.map((g, idx) => (
                  <div key={idx} className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4 bg-slate-50/30 dark:bg-slate-950/5">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${g.color}`}>
                          {g.label}
                        </span>
                        <span className="text-xs font-black font-mono">{g.range}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-normal font-sans">{g.action}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ═══════ TAB 3: CHART & GRAPH INTERPRETATIONS ═══════ */}
      {activeTab === 'charts' && (
        <div className="portal-card bg-white dark:bg-slate-900 p-5 border border-slate-250 dark:border-slate-800">
          <div className="border-b pb-3.5 mb-5">
            <h2 className="text-base font-extrabold text-teal-900 dark:text-teal-400 uppercase tracking-wider font-serif">
              {t.chartsSection.title}
            </h2>
            <p className="text-xs text-slate-500 mt-1 leading-normal font-sans">{t.chartsSection.desc}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {t.chartsSection.items.map((chart, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-slate-150 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/10 flex flex-col justify-between">
                <div>
                  
                  {/* Miniature Visual Drawing of the specific chart type */}
                  <div className="h-28 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 mb-3.5 flex items-end justify-between relative overflow-hidden">
                    <span className="absolute top-2 left-2 text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Visual Snapshot Guide</span>
                    {idx === 0 && (
                      <div className="w-full h-full flex items-center justify-center pt-2">
                        <svg viewBox="0 0 100 50" className="w-24 h-12">
                          <path d="M 15 50 A 35 35 0 0 1 85 50" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                          <path d="M 15 50 A 35 35 0 0 1 70 20" fill="none" stroke="#22c55e" strokeWidth="8" />
                        </svg>
                      </div>
                    )}
                    {idx === 1 && (
                      <div className="w-full h-full flex items-end gap-1 pt-4">
                        <div className="w-1/6 bg-teal-500/20 border-t-2 border-teal-500 h-[30%]" />
                        <div className="w-1/6 bg-teal-500/20 border-t-2 border-teal-500 h-[45%]" />
                        <div className="w-1/6 bg-teal-500/20 border-t-2 border-teal-500 h-[60%]" />
                        <div className="w-1/6 bg-teal-500/20 border-t-2 border-teal-500 h-[50%]" />
                        <div className="w-1/6 bg-teal-500/20 border-t-2 border-teal-500 h-[75%]" />
                        <div className="w-1/6 bg-teal-500/20 border-t-2 border-teal-500 h-[90%]" />
                      </div>
                    )}
                    {idx === 2 && (
                      <div className="w-full h-full flex items-end justify-center gap-6 pt-4">
                        <div className="text-center">
                          <div className="w-10 bg-teal-600 h-16 rounded-t" />
                          <span className="text-[8px] text-slate-400 block mt-1">Current</span>
                        </div>
                        <div className="text-center">
                          <div className="w-10 bg-slate-300 h-12 rounded-t" />
                          <span className="text-[8px] text-slate-400 block mt-1">Previous</span>
                        </div>
                      </div>
                    )}
                    {idx === 3 && (
                      <div className="w-full h-full flex items-end justify-around pt-4">
                        <div className="text-center">
                          <div className="flex gap-0.5 items-end justify-center">
                            <div className="w-4 bg-slate-300 h-10" />
                            <div className="w-4 bg-violet-600 h-8" />
                          </div>
                          <span className="text-[8px] text-slate-400 block mt-1">Block A</span>
                        </div>
                        <div className="text-center">
                          <div className="flex gap-0.5 items-end justify-center">
                            <div className="w-4 bg-slate-300 h-12" />
                            <div className="w-4 bg-violet-600 h-12" />
                          </div>
                          <span className="text-[8px] text-slate-400 block mt-1">Block B</span>
                        </div>
                      </div>
                    )}
                    {idx === 4 && (
                      <div className="w-full h-full flex items-end justify-around gap-2 pt-4">
                        <div className="w-12 bg-violet-500/20 border-t border-violet-500 h-[80%] rounded-t flex items-center justify-center text-[9px] font-black text-violet-700">62%</div>
                        <div className="w-12 bg-violet-500/20 border-t border-violet-500 h-[15%] rounded-t flex items-center justify-center text-[9px] font-black text-violet-700">12%</div>
                        <div className="w-12 bg-violet-500/20 border-t border-violet-500 h-[5%] rounded-t flex items-center justify-center text-[9px] font-black text-violet-700">3%</div>
                      </div>
                    )}
                    {idx === 5 && (
                      <div className="w-full h-full grid grid-cols-3 gap-1 pt-4">
                        <div className="bg-emerald-600 rounded p-1 text-[8px] font-bold text-white flex flex-col justify-between">
                          <span>Block A</span>
                          <span>85%</span>
                        </div>
                        <div className="bg-emerald-500 rounded p-1 text-[8px] font-bold text-white flex flex-col justify-between">
                          <span>Block B</span>
                          <span>72%</span>
                        </div>
                        <div className="bg-rose-500 rounded p-1 text-[8px] font-bold text-white flex flex-col justify-between">
                          <span>Block C</span>
                          <span>24%</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <h3 className="font-extrabold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider">{chart.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-normal font-sans">{chart.detail}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-850">
                  <span className="text-[10px] font-black text-teal-800 dark:text-teal-400 uppercase tracking-widest block">How to Read Graph</span>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed font-sans">{chart.howToRead}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════ TAB 4: BEST PERFORMERS & RANKINGS ═══════ */}
      {activeTab === 'rankings' && (
        <div className="portal-card bg-white dark:bg-slate-900 p-5 border border-slate-250 dark:border-slate-800">
          <div className="border-b pb-3.5 mb-5">
            <h2 className="text-base font-extrabold text-teal-900 dark:text-teal-400 uppercase tracking-wider font-serif">
              {t.rankingsSection.title}
            </h2>
            <p className="text-xs text-slate-500 mt-1 leading-normal font-sans">{t.rankingsSection.desc}</p>
          </div>

          <div className="space-y-4">
            {t.rankingsSection.rules.map((rule, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-slate-150 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/10 flex flex-col md:flex-row gap-4 items-start">
                
                {/* Miniature Visual Badge representation */}
                <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center shrink-0 border border-amber-300">
                  <span className="text-xl">{['🏆', '🌟', '🎖️'][idx % 3]}</span>
                </div>

                <div className="flex-1 space-y-1">
                  <span className="text-[10px] font-black text-amber-800 dark:text-amber-400 uppercase tracking-widest block">Ranking Rule</span>
                  <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-350 uppercase tracking-wider">{rule.name}</h4>
                  <div>
                    <span className="text-[10px] font-black text-teal-800 dark:text-teal-400 uppercase tracking-widest block mt-2">Calculations / Criteria Logic</span>
                    <p className="text-xs text-slate-500 leading-relaxed font-sans">{rule.logic}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-teal-800 dark:text-teal-400 uppercase tracking-widest block mt-1.5">Detailed Outputs</span>
                    <p className="text-xs text-slate-500 leading-normal font-sans">{rule.detail}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════ TAB 5: ANOMALIES & SYNC CHECKER ═══════ */}
      {activeTab === 'checker' && (
        <div className="portal-card bg-white dark:bg-slate-900 p-5 border border-slate-250 dark:border-slate-800">
          <div className="border-b pb-3.5 mb-5">
            <h2 className="text-base font-extrabold text-teal-900 dark:text-teal-400 uppercase tracking-wider font-serif">
              {t.checkerSection.title}
            </h2>
            <p className="text-xs text-slate-500 mt-1 leading-normal font-sans">{t.checkerSection.desc}</p>
          </div>

          <div className="space-y-4">
            {t.checkerSection.warnings.map((warning, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-rose-100 dark:border-rose-950/40 bg-rose-50/10 dark:bg-rose-950/5 flex flex-col md:flex-row gap-4 items-start">
                
                {/* Miniature Visual Badge representation */}
                <div className={`text-[9px] font-black px-2.5 py-1 rounded-md shrink-0 uppercase tracking-wider ${
                  warning.level === 'Critical' ? 'bg-red-100 text-red-800 border border-red-200' :
                  warning.level === 'High' ? 'bg-orange-100 text-orange-850 border border-orange-200' :
                  warning.level === 'Sync Gap' ? 'bg-rose-100 text-rose-800 border border-rose-200 font-extrabold' :
                  'bg-amber-100 text-amber-850 border border-amber-200'
                }`}>
                  {warning.level}
                </div>

                <div className="flex-1 space-y-1">
                  <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-300 uppercase tracking-wider">{warning.name}</h4>
                  <div>
                    <span className="text-[10px] font-black text-rose-800 dark:text-rose-400 uppercase tracking-widest block">Trigger Condition Logic</span>
                    <p className="text-xs text-slate-500 mt-0.5 leading-normal font-mono font-bold bg-slate-100 dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800 inline-block font-sans">{warning.trigger}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-rose-800 dark:text-rose-400 uppercase tracking-widest block mt-2">What It Indicates</span>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed font-sans">{warning.meaning}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
