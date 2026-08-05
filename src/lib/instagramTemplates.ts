export interface InstagramTopic {
  id: string;
  label: string;
  icon: string;
  templates: (detail: string) => string[];
  hashtags: string[];
}

const GENERAL_HASHTAGS = ['#SGFinance', '#SingaporeInsurance', '#FinancialPlanning', '#MoneyTalkSG'];

export const INSTAGRAM_TOPICS: InstagramTopic[] = [
  {
    id: 'cpf-retirement',
    label: 'CPF & Retirement',
    icon: '🏛️',
    templates: (detail) => [
      `Did you know your CPF LIFE payout typically replaces only 30-40% of your last-drawn income? 📊 ${detail ? detail + ' ' : ''}Let's talk about closing that retirement gap before it becomes a surprise.`,
      `Retirement planning isn't a "later" problem — it's a "now" habit. ${detail ? detail + ' ' : ''}Small, consistent steps today = a retirement on your terms tomorrow. 🌴`,
      `CPF is your foundation, not your finish line. ${detail ? detail + ' ' : ''}Message me if you'd like a free retirement gap check-up. 💬`,
    ],
    hashtags: ['#CPF', '#RetirementPlanning', '#CPFLife', '#SingaporeRetirement', ...GENERAL_HASHTAGS],
  },
  {
    id: 'critical-illness',
    label: 'Critical Illness Awareness',
    icon: '🎗️',
    templates: (detail) => [
      `1 in 4 Singaporeans is projected to develop cancer in their lifetime (Singapore Cancer Society). ${detail ? detail + ' ' : ''}Critical illness coverage isn't about expecting the worst — it's about protecting your income while you focus on getting better. 💛`,
      `Health scares don't wait for the "right time" in your finances. ${detail ? detail + ' ' : ''}Let's make sure you're covered before you need it, not after. 🩺`,
    ],
    hashtags: ['#CriticalIllness', '#HealthAwareness', '#CancerAwareness', ...GENERAL_HASHTAGS],
  },
  {
    id: 'market-update',
    label: 'Market Update',
    icon: '📈',
    templates: (detail) => [
      `Markets moved this week — here's what it means for your portfolio: ${detail || '[add your market commentary]'} 📊 As always, stay invested, stay diversified.`,
      `Quick market pulse 🔔 ${detail || '[add your market commentary]'} Questions on how this affects your plan? Drop me a message.`,
    ],
    hashtags: ['#MarketUpdate', '#InvestSmart', '#WealthManagement', ...GENERAL_HASHTAGS],
  },
  {
    id: 'financial-tip',
    label: 'Financial Literacy Tip',
    icon: '💡',
    templates: (detail) => [
      `Money tip of the day 💡 ${detail || 'Pay yourself first — automate your savings before you spend.'} Small habits compound into big outcomes.`,
      `Financial literacy Friday: ${detail || 'the difference between saving and investing — and why you need both.'} Save this post for later! 📌`,
    ],
    hashtags: ['#FinancialLiteracy', '#MoneyTips', '#PersonalFinance', ...GENERAL_HASHTAGS],
  },
  {
    id: 'insurance-basics',
    label: 'Insurance Awareness',
    icon: '🛡️',
    templates: (detail) => [
      `Insurance 101: ${detail || 'the difference between term and whole life — which one fits your stage of life?'} Let's break it down together. 🛡️`,
      `Coverage check-in ✅ ${detail || 'when was the last time you reviewed your policies?'} Life changes — your coverage should keep up.`,
    ],
    hashtags: ['#InsuranceMatters', '#ProtectYourFamily', '#InsuranceSingapore', ...GENERAL_HASHTAGS],
  },
  {
    id: 'festive',
    label: 'Festive / Seasonal Greeting',
    icon: '🎉',
    templates: (detail) => [
      `${detail || 'Wishing you and your family a wonderful festive season!'} 🎉 Grateful for every client who's trusted me with their financial journey this year.`,
    ],
    hashtags: ['#GreatEasternSG', ...GENERAL_HASHTAGS],
  },
  {
    id: 'milestone',
    label: 'Client Milestone / Testimonial',
    icon: '🌟',
    templates: (detail) => [
      `Proud moment 🌟 ${detail || 'Helped a client hit their savings goal ahead of schedule this month.'} This is why I do what I do.`,
    ],
    hashtags: ['#ClientSuccess', '#FinancialGoals', ...GENERAL_HASHTAGS],
  },
];
