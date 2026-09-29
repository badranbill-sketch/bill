/**
 * Every word in the guide, in both languages.
 *
 * Voice: Bill across a table. Short sentences, "you", Canadian terms, no
 * urgency, no promises. The facts below were checked against the official
 * pages listed in `sources` on the date in `checked`; re-check them before
 * each new edition (see guide/README.md).
 *
 * Inline marks: *italic* only. Nothing else is parsed.
 */
import type { Language } from "@/lib/business";

export type Item = { title: string; text: string };
export type Kind = { title: string; text: string; object: string };

export const checked = "2026-09-29";

const en = {
  lang: "en" as Language,
  meta: {
    title: "Before retirement, your investments change jobs",
    subject:
      "A practical guide to the questions worth asking before your portfolio becomes your paycheque. Bill Badran.",
    file: "bill-badran-before-retirement-guide-en",
  },
  running: "Before retirement, your investments change jobs",
  chapter: "Chapter",
  cover: {
    title: ["Before retirement,", "your investments", "change jobs."],
    subtitle:
      "A practical guide to the questions worth asking before your portfolio becomes your paycheque.",
    author: "Bill Badran",
  },
  letter: {
    title: "Before you start",
    body: [
      "If you are five to fifteen years from retirement, you have probably done the hard part already. You worked, you saved, and you put money aside in several places, often for different reasons, at different times.",
      "What’s usually missing isn’t another product. It’s a clear picture of how all of it will turn into a life.",
      "This guide can’t draw that picture for you. Your situation is yours. What it can do is show you the questions that matter in the years before you stop working, and why they start to depend on one another.",
      "Read it in one sitting or one chapter at a time. Most chapters end with a question worth bringing to a meeting, with me or with anyone you trust. They are gathered at the end, with room for your notes.",
    ],
    sign: "Bill",
    contents: "Inside",
  },
  statement: {
    before: "For most of your working life, the question was",
    q1: "How do I grow my money?",
    after: "Now it is becoming",
    q2: "How does all of this become my retirement?",
  },
  opening: {
    kicker: "Opening",
    title: "The question is changing.",
    body: [
      "For most of your working life, investing had a simple shape. You earned, you saved, you invested, and you tried to leave it alone. The accounts grew, or they didn’t, and there was time to wait.",
      "Near retirement, the shape changes. Your savings are about to become your income. From that moment, your investments stop being a subject of their own.",
      "They start to depend on everything around them: what you’ll spend, when a pension begins, when you apply for QPP or CPP and OAS, how each withdrawal is taxed, what your spouse will need, how markets behave, and how many years the money has to cover.",
      "None of this is complicated on its own. What is new is that it all moves together.",
    ],
    aloneLabel: "While you work",
    aloneCard: "Investments",
    aloneCaption: "While you work, investing mostly sits on its own.",
    tableTitle: "Now everyone is at the same table.",
    tableCaption:
      "As retirement approaches, subjects that used to sit apart start to affect one another.",
    cards: [
      "Spending",
      "Pension",
      "QPP / CPP",
      "OAS",
      "Taxes",
      "Withdrawals",
      "Your spouse",
      "Markets",
      "Time",
      "Investments",
    ],
    centre: "Your retirement income",
    note: "Decisions that connect.",
  },
  ch1: {
    n: "1",
    short: "What is all this money for?",
    title: "What is all this money actually for?",
    lead: "Before you look at a single investment, look at the life it is meant to pay for.",
    body: [
      "Investments are easier to judge when you know their purpose. A portfolio that will pay for ten years of travel and one that will quietly support a home for thirty years are not doing the same job. Neither is wrong. They are different.",
      "So start with the life. Not in general terms, in specifics. Where you will live. Who you will help. What you will do on a Tuesday morning in March.",
    ],
    listIntro: "Questions to think about, alone and together:",
    items: [
      {
        title: "Home",
        text: "Will you stay where you are? Will it still suit you at 80?",
      },
      {
        title: "Travel",
        text: "Where, how often, and for how many years?",
      },
      {
        title: "Family",
        text: "Will you help children or grandchildren? With what, and when?",
      },
      {
        title: "Work",
        text: "Stop all at once, or ease out over a few years?",
      },
      {
        title: "Projects",
        text: "A renovation, a cottage, a boat, a business, a cause?",
      },
      {
        title: "Health",
        text: "What would change if one of you needed more care?",
      },
      {
        title: "Security",
        text: "How much certainty do you need to sleep well?",
      },
      {
        title: "What remains",
        text: "Is leaving something behind a goal, or simply what is left?",
      },
    ] as Item[],
    couple:
      "If you are a couple, answer separately first. Where your answers differ is useful.",
    question: "If our next twenty years fit on one page, what would be on it?",
    notebook: [
      "The house?",
      "Travel",
      "The kids",
      "Work less",
      "The cottage",
      "Health",
      "Leave something",
    ],
    margin: "What really matters?",
  },
  ch2: {
    n: "2",
    short: "What will retirement cost?",
    title: "What will retirement actually cost?",
    lead: "There is no magic percentage. There is what you will actually spend.",
    body: [
      "You have probably heard a rule of thumb: that you will need some fixed share of your working income. It can start a conversation. It can’t answer the question. Two people with the same salary can retire into very different lives.",
      "A more useful estimate starts from spending you can picture. Not a perfect budget, a realistic one. It helps to separate spending into kinds, because each kind behaves differently over time.",
    ],
    kinds: [
      {
        title: "The basics",
        text: "Housing, food, transportation, insurance, utilities. Recurring and fairly predictable. This is the floor.",
        object: "Keys and the grocery list",
      },
      {
        title: "The life you choose",
        text: "Restaurants, hobbies, gifts, memberships. Flexible, and often underestimated.",
        object: "Two tickets",
      },
      {
        title: "Large, irregular costs",
        text: "A roof, a car, a kitchen, a wedding. Not every year, but they come.",
        object: "The roofer’s quote",
      },
      {
        title: "Early projects",
        text: "The travel and plans of the first active years. Often concentrated in the first years.",
        object: "A map and passports",
      },
      {
        title: "Later needs",
        text: "More help at home, more care, a different place to live. Harder to predict, important to name.",
        object: "A calendar of appointments",
      },
    ] as Kind[],
    shape:
      "For many people, spending in retirement isn’t a straight line. It can start higher, settle, and rise again later if more care is needed. The shape matters as much as the total.",
    plateTitle: "One year of retirement, laid out on the table",
    worksheetTitle: "A first estimate",
    worksheetCols: ["Per year, roughly", "When", "Notes"],
    margin: "Rough is fine.",
    question:
      "Which of our spending is truly fixed, and which could bend in a hard year?",
  },
  ch3: {
    n: "3",
    short: "What arrives on its own?",
    title: "What arrives without touching your savings?",
    lead: "Before asking what your investments must provide, list what will arrive on its own.",
    body: [
      "Some retirement income doesn’t depend on selling investments. Mapping it first shows what your savings actually need to do, and when.",
    ],
    sources: [
      {
        title: "A workplace pension",
        text: "If you have one: when it can start, what it pays, whether it rises with prices, and what continues for a surviving spouse.",
      },
      {
        title: "QPP or CPP",
        text: "People who work in Québec generally contribute to the QPP; elsewhere in Canada, to the CPP. The QPP can start between 60 and 72, the CPP between 60 and 70. Starting later means a larger payment for life. Starting earlier means more years of payments.",
      },
      {
        title: "Old Age Security (OAS)",
        text: "If you qualify, it can start at 65, or later, up to 70, for a larger payment. Part or all of it may have to be repaid when income is above a threshold that changes every year.",
      },
      {
        title: "Work",
        text: "Part-time work or consulting, for some people, for some years.",
      },
      {
        title: "Other income",
        text: "Rent from a property, an annuity, income from a business.",
      },
    ] as Item[],
    where:
      "Your numbers: Retraite Québec’s Statement of Participation, in My Account, estimates your QPP pension at different starting ages. If you live outside Québec, your CPP statement is in My Service Canada Account. Your pension plan sends an annual statement.",
    gapTitle: "The gap changes over time",
    gapBody:
      "Each source starts on its own date. So what your investments need to provide isn’t one number. It is often larger in the years before other income begins, and smaller after.",
    gapLabels: {
      spending: "What you spend",
      gap: "What your investments may need to provide",
      pension: "Workplace pension",
      qpp: "QPP / CPP",
      oas: "OAS",
      axis: ["Retirement", "QPP / CPP begins", "OAS begins", "Later years"],
    },
    gapCaption:
      "A hypothetical picture, with no amounts. Your sources, dates and order will be your own.",
    question:
      "When does each of our income sources begin, and what is the gap in each period?",
  },
  ch4: {
    n: "4",
    short: "Your portfolio is changing jobs",
    title: "Your portfolio is changing jobs.",
    lead: "For decades it had one job. Now it is taking on several at once.",
    oldCard: {
      heading: "The old job",
      role: "Savings, while you work",
      duties: ["Grow."],
      schedule: "No deadline.",
      badYear: "Wait. There is time, and new savings keep coming in.",
    },
    newCard: {
      heading: "The new job",
      role: "Savings, from retirement on",
      duties: [
        "Pay you an income, month after month",
        "Stay invested enough to keep growing",
        "Handle withdrawals without forced sales at the wrong time",
        "Absorb market declines",
        "Keep up with rising prices",
        "Pay for the big projects, often early",
        "Look after a spouse, possibly for longer",
        "Work alongside a pension, QPP or CPP and OAS",
        "Last for a lifetime whose length no one knows",
      ],
      schedule: "Starts soon. No end date.",
      badYear: "It still has to pay you.",
    },
    labels: {
      duties: "Duties",
      schedule: "Schedule",
      badYear: "In a bad year",
    },
    after:
      "Nothing in the new job is unusual. But it is a different job, and a portfolio built for the old one isn’t automatically ready for the new one. The years before retirement are when to hand it over properly, while more options are still open.",
    margin: "Same money. New job.",
    question: "Is our portfolio set up for the old job, or the new one?",
    stormCaption:
      "The same weather. What matters is where you are when it arrives.",
    seqTitle: "The same storm, at a different moment.",
    seqBody: [
      "This is the change that matters most, and the easiest to miss.",
      "While you are saving, a bad year hurts, but you are rarely forced to sell. Your contributions keep buying, at lower prices, and you have time to wait.",
      "Once you are drawing an income, a bad year works differently. To get the same amount when prices are down, you have to sell more. What you sold isn’t there if prices recover.",
    ],
    seqName:
      "That is why a decline just before or early in retirement can matter more than the same decline at 45. It is called *sequence-of-returns risk*. The name is dull. The idea is simple: once you withdraw, the order of good and bad years starts to count.",
    panels: {
      kicker: "A hypothetical example",
      intro:
        "Two hypothetical people. Exactly the same yearly returns over 25 years, in opposite order.",
      saving: "While saving",
      savingText:
        "Adding the same amount each year. A bad start meant buying at lower prices. In this example, it even helped.",
      drawing: "While withdrawing",
      drawingText:
        "Taking the same amount each year. A bad start meant selling at lower prices. It left a lasting mark.",
      first: "Bad years first",
      last: "Bad years last",
      start: "Start",
      years: "25 years",
    },
    seqNote:
      "Without any deposits or withdrawals, both would end in exactly the same place. The cash moving in or out is what makes the timing matter.",
    seqCaption:
      "Illustration only. It uses an invented series of returns to show the effect of order, not what markets will do, and it ignores fees and taxes.",
    question2:
      "If markets fell in our first two years of retirement, where would our income come from?",
  },
  ch5: {
    n: "5",
    short: "Risk is no longer one question",
    title: "Risk is no longer just “How much can I tolerate?”",
    lead: "For years, risk was a feeling measured on a questionnaire. Now it is also arithmetic.",
    items: [
      {
        title: "How much can I live with?",
        text: "Your comfort with seeing values fall. Still important: it tells you what you will actually stick with.",
      },
      {
        title: "How much does the plan need?",
        text: "The growth your plan relies on. Taking far less risk than the plan needs is a risk too: the money may not last, or may not keep up with prices.",
      },
      {
        title: "What could a loss do to what’s coming up?",
        text: "A drop matters less to money you won’t touch for fifteen years. It means a lot to money you need next spring.",
      },
      {
        title: "What money may be needed soon?",
        text: "The next withdrawals, a car, a gift to a child, a project you have already booked.",
      },
      {
        title: "What money has a much longer horizon?",
        text: "Some of your savings may not be spent for twenty years or more. That money can have a different job.",
      },
    ] as Item[],
    after:
      "None of these questions has a textbook answer, and none of them points to a particular mix of investments. They are the questions a sound answer has to account for.",
    thought:
      "The right amount of risk isn’t a score. It’s a fit between what you can live with, what the plan needs, and when the money will be spent.",
    canoe: "You pack a canoe for the trip ahead, not the one behind you.",
    question:
      "How large a decline could we live with, and how large a decline could the plan?",
  },
  ch6: {
    n: "6",
    short: "Not every dollar has the same timeline",
    title: "Not every dollar has the same timeline.",
    lead: "It is natural to think of your portfolio as one thing. In retirement, it is closer to money with different departure dates.",
    body: [
      "Some of it will be spent in the next year or two. Some of it in five or ten years. Some of it may not be touched for twenty years, or may never be spent at all.",
      "Each of those has a different job.",
    ],
    horizons: [
      {
        title: "Money for soon",
        text: "Its job is to be there, in full, when you need it. Stability matters more than growth.",
      },
      {
        title: "Money for a few years from now",
        text: "A balance: some growth, with room to wait out a bad stretch.",
      },
      {
        title: "Money for much later",
        text: "Its job is to keep growing and keep up with rising prices. It has more time to wait out bad years.",
      },
    ] as Item[],
    after:
      "Seen this way, holding different kinds of investments isn’t an academic idea. It is giving each part of your money the job that matches its timeline.",
    caveat:
      "This describes a way of thinking, not a structure to copy. Whether and how to divide money by timeline depends on the whole plan.",
    labels: ["Soon", "In a few years", "Much later"],
    margin: "Near things need to be steady.",
    question:
      "Which of our money is needed soon, and is it invested for “soon”?",
  },
  ch7: {
    n: "7",
    short: "Your accounts are not your plan",
    title: "Your accounts are not your plan.",
    lead: "An RRSP, a TFSA, a pension, a non-registered account: these are containers. The plan is how they work together.",
    body: [
      "Each container has its own rules. Money taken out of an RRSP or RRIF is added to your taxable income for the year. TFSA withdrawals are generally not taxed and don’t affect federal income-tested benefits such as OAS. In a non-registered account, interest, dividends and most fund distributions are generally taxed each year; other capital gains are taxed when you sell. Some pension income can be split with a spouse or common-law partner for tax purposes; RRIF withdrawals generally qualify from age 65, and Québec’s own return applies an age-65 condition to all of it.",
      "So the question isn’t only how much to take out. It is which account, in which year, and in what order. Drawing from one container rather than another can change your tax bill, whether part of your OAS has to be repaid, and what is left for later, for you and for a surviving spouse.",
      "There is no single right order. It depends on your income each year, your ages, your spouse, your wishes for your estate and the rules at the time. That is why it deserves a plan rather than a habit.",
    ],
    containers: ["RRSP", "TFSA", "Pension", "Non-registered", "Corporation"],
    containersCaption:
      "Five containers, opened at different times, for different reasons.",
    planCentre: "This year’s income",
    planEffects: ["Tax", "Government benefits", "What is left for later"],
    planCaption:
      "The plan is the same containers, looked at together, one year at a time.",
    good: {
      title: "Good to know",
      text: "An RRSP has to be closed by the end of the year you turn 71: usually converted into a RRIF or used to buy an annuity, or else cashed in, which is fully taxable. A RRIF then requires a minimum withdrawal every year after the year it is set up.",
    },
    question: "In what order do we plan to draw from our accounts, and why?",
  },
  ch8: {
    n: "8",
    short: "What fees are buying",
    title: "Fees are easier to understand when you ask what they are buying.",
    lead: "The useful question isn’t “Are fees bad?” It is “What am I paying, and what do I get for it?”",
    families: [
      {
        title: "The investment itself",
        text: "For a mutual fund or an ETF, the management expense ratio (MER): the fund’s yearly costs, as a percentage of what you hold.",
      },
      {
        title: "Advice and service",
        text: "An advisory fee you pay directly, or commissions paid to the advisor’s firm, including trailing commissions, which some funds pay out of their MER rather than as a separate charge.",
      },
      {
        title: "Occasional costs",
        text: "Trading, account, transfer or early-sale fees.",
      },
    ] as Item[],
    body: [
      "None of these is good or bad on its own. A fee can pay for real work: a plan, coordination with your taxes, someone who answers the phone in a bad month. The point is to know what you pay and what you receive for it.",
    ],
    good: {
      title: "Good to know",
      text: "Starting with the report for 2026, sent in early 2027, your annual report on charges will also show the ongoing costs of the funds you hold, as a percentage for each fund and as a total in dollars. It is a good document to bring to a meeting.",
    },
    askTitle: "Questions to ask any advisor",
    ask: [
      "What do I pay in total each year, in dollars?",
      "Which part is the investment, and which part is the advice?",
      "How are you paid: by me, by commission, or both?",
      "What is included, and how often will we meet?",
      "Would anything cost extra to change or to leave?",
    ],
    bill: "What Bill will do for you, and how he is paid, are explained before you commit to anything.",
    chartTitle: "What happens over long periods",
    chartText:
      "A difference that looks small compounds. Two hypothetical accounts, same starting amount, the same 5% yearly return before costs, for 25 years. One pays one percentage point more each year.",
    chartLabels: {
      lower: "Lower cost",
      higher: "One point more each year",
      result: "After 25 years, about 21% less",
      axis: ["Start", "25 years"],
    },
    chartCaption:
      "Simplified, constant assumptions: no taxes, deposits or withdrawals. Not a forecast, and not Bill’s fees. It shows why the question is worth asking, not which answer is right.",
    margin: "Ask what it’s for.",
    question: "What do we pay in total, and what do we get for it?",
  },
  ch9: {
    n: "9",
    short: "When markets fall",
    title: "What happens when markets fall?",
    lead: "A good retirement plan doesn’t need to predict the market. It needs to decide, in advance, how it will behave when markets are uncomfortable.",
    body: [
      "Markets will very likely fall at some point during your retirement. No one knows when, how far or for how long. That isn’t a reason for alarm. It is a reason to decide things on a calm day, rather than in the middle of the news.",
      "A plan can’t prevent a decline. What it can do is help you avoid decisions you would regret, because the hard thinking was done before you needed it.",
    ],
    sheetTitle: "A plan for bad weather, written in good weather",
    sheetIntro:
      "Answer these on a quiet day. Keep the page. If markets fall, you will be reading your own reasoning instead of the headlines.",
    questions: [
      "If markets fell tomorrow, what would we need to sell in the next two years?",
      "How much of our spending for the next few years depends on investments that go up and down?",
      "What would we change? Spending we could delay, a project we could postpone.",
      "What would we not change?",
      "Which parts of the plan were designed for exactly this?",
    ],
    dated: "Written on",
    caption: "Decided in advance.",
    question: "What have we decided to do, and not do, if markets fall?",
  },
  ch10: {
    n: "10",
    short: "Five years before retirement",
    title: "Five years before retirement",
    lead: "A checklist to print, fill in and bring along. You don’t need every box ticked.",
    groups: [
      {
        verb: "Know",
        q: "What do we actually have?",
        items: [
          "A list of every account: where it is, whose name, what it is for",
          "Pension plan statements, and the options at retirement",
          "QPP or CPP statements, and when OAS could start",
          "Debts, including the mortgage, and when they end",
        ],
      },
      {
        verb: "Estimate",
        q: "What might we spend?",
        items: [
          "The basics, per year",
          "The life we choose, per year",
          "Large costs expected in the next ten years",
          "Early projects: what, when, roughly how much",
        ],
      },
      {
        verb: "Understand",
        q: "How are the investments positioned, and what risks remain?",
        items: [
          "What each investment is, and what it costs",
          "How much may be needed in the next few years",
          "What we would do in a large decline",
        ],
      },
      {
        verb: "Coordinate",
        q: "When could each source of income begin?",
        items: [
          "A retirement date, and a plan B",
          "When the pension, QPP or CPP and OAS could each start",
          "Which accounts to draw from first, and the tax effect",
          "When the RRSP becomes a RRIF",
        ],
      },
      {
        verb: "Discuss",
        q: "What still needs professional, tax or legal advice?",
        items: [
          "Will, protection mandate and beneficiaries",
          "Insurance: still needed, or not",
          "A company, a rental or a cottage to pass on",
          "Questions for an accountant or a notary",
        ],
      },
    ],
  },
  questions: {
    title: "Your questions",
    lead: "The questions from chapters 1 to 9. Bring this page, with your notes.",
  },
  ending: {
    line1: "You don’t need to have every answer before a first meeting.",
    line2: "You need the right questions.",
    body: "You have most of them now. The rest usually come up across a table, over a coffee, once someone has listened to what you want your money to do.",
    margin: "One step at a time.",
  },
  meeting: {
    title: "Plan a first meeting.",
    body: [
      "A first meeting is a conversation. You don’t need to prepare anything, and there’s no obligation. Bring this guide if you have written in it, and your questions if you haven’t.",
      "In French or English.",
    ],
    bill: "What Bill will do for you, and how he is paid, are explained before you commit to anything.",
    cta: "Plan a first meeting",
    phone: "Phone",
    email: "Email",
    office: "Office",
    web: "Online",
  },
  colophon: {
    title: "About this guide",
    body: [
      "This guide is general information. It isn’t personalized financial, tax or legal advice, and it doesn’t recommend any product, allocation or withdrawal strategy. Examples are hypothetical and identified as such.",
      "Rules and amounts change. The facts in this guide were checked against the official sources below on September 29, 2026. Confirm them before acting, and ask about your own situation.",
    ],
    sources: "Sources",
    draft: "Review draft, September 2026. Not yet approved for distribution.",
    todo: "To complete before distribution: Bill’s registration category and his firm’s disclosure, reviewed by the firm.",
    /** Registration and firm disclosure, as approved. Required by `--final`. */
    disclosure: null as string | null,
    notes: "Notes",
  },
  back: {
    line: "A calm conversation, before the big decisions.",
  },
};

export type Copy = typeof en;

const fr: Copy = {
  lang: "fr",
  meta: {
    title: "Avant la retraite, vos placements changent de métier",
    subject:
      "Un guide pratique des questions à se poser avant que votre portefeuille prenne le relais de votre paie. Bill Badran.",
    file: "bill-badran-guide-avant-la-retraite-fr",
  },
  running: "Avant la retraite, vos placements changent de métier",
  chapter: "Chapitre",
  cover: {
    title: ["Avant la retraite,", "vos placements", "changent de métier."],
    subtitle:
      "Un guide pratique des questions à se poser avant que votre portefeuille prenne le relais de votre paie.",
    author: "Bill Badran",
  },
  letter: {
    title: "Avant de commencer",
    body: [
      "Si votre retraite est prévue d’ici 5 à 15\u00a0ans, vous avez sans doute déjà fait le plus dur. Vous avez travaillé, épargné et mis de l’argent de côté à plusieurs endroits, souvent pour des raisons différentes, à des moments différents.",
      "Ce qui manque, d’habitude, ce n’est pas un produit de plus. C’est une idée claire de la vie que tout cela vous permettra de mener.",
      "Ce guide ne peut pas dessiner cette image à votre place. Votre situation vous est propre. Il peut par contre vous montrer les questions qui comptent dans les années avant d’arrêter de travailler, et pourquoi elles commencent à dépendre les unes des autres.",
      "Lisez-le d’une traite ou un chapitre à la fois. La plupart des chapitres se terminent par une question à aborder en rencontre, avec moi ou avec une personne de confiance. Elles sont rassemblées à la fin, avec de la place pour vos notes.",
    ],
    sign: "Bill",
    contents: "Au sommaire",
  },
  statement: {
    before:
      "Pendant la plus grande partie de votre carrière, la question était",
    q1: "Comment faire fructifier mon argent?",
    after: "Elle devient maintenant",
    q2: "Comment tout cela devient-il ma retraite?",
  },
  opening: {
    kicker: "Ouverture",
    title: "La question change.",
    body: [
      "Pendant la plus grande partie de votre carrière, investir avait une forme simple. Vous gagniez, vous épargniez, vous investissiez, et vous tentiez de ne pas y toucher. Les comptes croissaient, ou pas, et il y avait du temps pour attendre.",
      "À l’approche de la retraite, la forme change. Votre épargne s’apprête à devenir votre revenu. À partir de ce moment, vos placements cessent d’être un sujet à part.",
      "Ils commencent à dépendre de tout ce qui les entoure\u00a0: ce que vous dépenserez, le début d’une rente de retraite, le moment de demander votre rente du RRQ (ou du RPC) et la PSV, l’imposition de chaque retrait, les besoins de votre conjoint, le comportement des marchés et le nombre d’années que l’argent doit couvrir.",
      "Rien de cela n’est compliqué en soi. Ce qui est nouveau, c’est que tout bouge en même temps.",
    ],
    aloneLabel: "Pendant votre carrière",
    aloneCard: "Placements",
    aloneCaption:
      "Pendant votre carrière, les placements vivent surtout de leur côté.",
    tableTitle: "Maintenant, tout le monde est à la même table.",
    tableCaption:
      "À l’approche de la retraite, des sujets autrefois séparés commencent à s’influencer.",
    cards: [
      "Dépenses",
      "Rente de retraite",
      "RRQ / RPC",
      "PSV",
      "Impôts",
      "Retraits",
      "Votre conjoint",
      "Marchés",
      "Le temps",
      "Placements",
    ],
    centre: "Votre revenu de retraite",
    note: "Des décisions qui se répondent.",
  },
  ch1: {
    n: "1",
    short: "À quoi sert tout cet argent?",
    title: "À quoi sert, au fond, tout cet argent?",
    lead: "Avant de regarder un seul placement, regardez la vie qu’il doit financer.",
    body: [
      "Un placement se juge mieux quand on connaît son but. Un portefeuille qui financera dix ans de voyages et un autre qui soutiendra tranquillement une maison pendant trente ans ne font pas le même travail. Ni l’un ni l’autre n’est mauvais. Ils sont différents.",
      "Commencez donc par la vie. Pas en termes généraux, en détails. Où vous habiterez. Qui vous aiderez. Ce que vous ferez un mardi matin de mars.",
    ],
    listIntro: "Des questions à se poser, seul et à deux\u00a0:",
    items: [
      {
        title: "La maison",
        text: "Resterez-vous où vous êtes? Vous conviendra-t-elle encore à 80\u00a0ans?",
      },
      {
        title: "Les voyages",
        text: "Où, à quelle fréquence, et pendant combien d’années?",
      },
      {
        title: "La famille",
        text: "Aiderez-vous vos enfants ou petits-enfants? Pour quoi, et quand?",
      },
      {
        title: "Le travail",
        text: "Arrêter d’un coup, ou ralentir sur quelques années?",
      },
      {
        title: "Les projets",
        text: "Une rénovation, un chalet, un bateau, une entreprise, une cause?",
      },
      {
        title: "La santé",
        text: "Qu’est-ce qui changerait si l’un de vous avait besoin de plus de soins?",
      },
      {
        title: "La sécurité",
        text: "De combien de certitude avez-vous besoin pour bien dormir?",
      },
      {
        title: "Ce qui restera",
        text: "Laisser quelque chose est-il un but, ou simplement ce qui restera?",
      },
    ],
    couple:
      "Si vous êtes en couple, répondez d’abord chacun de votre côté. Les différences sont utiles.",
    question:
      "Si nos vingt prochaines années tenaient sur une page, qu’y aurait-il dessus?",
    notebook: [
      "La maison?",
      "Voyager",
      "Les enfants",
      "Travailler moins",
      "Le chalet",
      "La santé",
      "Transmettre",
    ],
    margin: "Ce qui compte vraiment?",
  },
  ch2: {
    n: "2",
    short: "Combien coûtera la retraite?",
    title: "Combien coûtera vraiment votre retraite?",
    lead: "Il n’y a pas de pourcentage magique. Il y a ce que vous dépenserez vraiment.",
    body: [
      "Vous avez sans doute entendu une règle générale\u00a0: il faudrait une certaine part fixe de votre revenu de travail. Elle peut lancer la discussion. Elle ne répond pas à la question. Deux personnes au même salaire peuvent vivre des retraites très différentes.",
      "Une estimation plus utile part de dépenses que vous pouvez imaginer. Pas un budget parfait, un budget réaliste. Il est utile de séparer les dépenses par type, parce que chaque type évolue différemment avec le temps.",
    ],
    kinds: [
      {
        title: "L’essentiel",
        text: "Logement, épicerie, transport, assurances, électricité et chauffage. Récurrent et assez prévisible. C’est le plancher.",
        object: "Les clés et la liste d’épicerie",
      },
      {
        title: "La vie que vous choisissez",
        text: "Restaurants, loisirs, cadeaux, abonnements. Flexible, et souvent sous-estimé.",
        object: "Deux billets",
      },
      {
        title: "Les grosses dépenses ponctuelles",
        text: "Une toiture, une voiture, une cuisine, un mariage. Pas chaque année, mais elles arrivent.",
        object: "La soumission du couvreur",
      },
      {
        title: "Les projets du début",
        text: "Les voyages et les projets des premières années actives. Souvent concentrés au départ.",
        object: "Une carte et des passeports",
      },
      {
        title: "Les besoins de plus tard",
        text: "Plus d’aide à domicile, plus de soins, un autre milieu de vie. Plus difficiles à prévoir, importants à nommer.",
        object: "Un calendrier de rendez-vous",
      },
    ],
    shape:
      "Pour bien des gens, les dépenses à la retraite ne suivent pas une ligne droite. Elles peuvent commencer plus haut, se stabiliser, puis remonter plus tard si plus de soins deviennent nécessaires. La forme compte autant que le total.",
    plateTitle: "Une année de retraite, étalée sur la table",
    worksheetTitle: "Une première estimation",
    worksheetCols: ["Par année, à peu près", "Quand", "Notes"],
    margin: "Approximatif, c’est correct.",
    question:
      "Lesquelles de nos dépenses sont vraiment fixes, et lesquelles pourrions-nous réduire lors d’une année difficile?",
  },
  ch3: {
    n: "3",
    short: "Les revenus qui arrivent d’eux-mêmes",
    title: "Quels revenus recevrez-vous sans toucher à votre épargne?",
    lead: "Avant de demander ce que vos placements doivent fournir, dressez la liste des revenus qui arriveront d’eux-mêmes.",
    body: [
      "Une partie du revenu de retraite ne dépend pas de la vente de placements. La cartographier d’abord montre ce que votre épargne doit vraiment faire, et quand.",
    ],
    sources: [
      {
        title: "Un régime de retraite d’employeur",
        text: "S’il y a lieu\u00a0: quand la rente peut commencer, ce qu’elle verse, si elle est indexée, et ce qui continue pour un conjoint survivant.",
      },
      {
        title: "Le RRQ ou le RPC",
        text: "Les personnes qui travaillent au Québec cotisent généralement au RRQ; ailleurs au Canada, au RPC. La rente du RRQ peut commencer entre 60 et 72\u00a0ans, celle du RPC entre 60 et 70\u00a0ans. Commencer plus tard donne une rente plus élevée, à vie. Commencer plus tôt donne plus d’années de versements.",
      },
      {
        title: "La pension de la Sécurité de la vieillesse (PSV)",
        text: "Si vous y avez droit, elle peut commencer à 65\u00a0ans, ou plus tard, jusqu’à 70\u00a0ans, pour un paiement plus élevé. Une partie ou la totalité peut devoir être remboursée quand le revenu dépasse un seuil qui change chaque année.",
      },
      {
        title: "Le travail",
        text: "Un emploi à temps partiel ou de la consultation, pour certaines personnes, pendant quelques années.",
      },
      {
        title: "D’autres revenus",
        text: "Des loyers, une rente achetée, un revenu d’entreprise.",
      },
    ],
    where:
      "Vos chiffres\u00a0: le relevé de participation de Retraite Québec, dans Mon dossier, estime votre rente du RRQ selon l’âge de début. Si vous habitez hors Québec, votre relevé du RPC se trouve dans Mon dossier Service Canada. Votre régime de retraite vous envoie un relevé annuel.",
    gapTitle: "L’écart change avec le temps",
    gapBody:
      "Chaque source commence à sa propre date. Ce que vos placements doivent fournir n’est donc pas un seul chiffre. C’est souvent plus élevé dans les années avant que les autres revenus commencent, et moins élevé ensuite.",
    gapLabels: {
      spending: "Ce que vous dépensez",
      gap: "Ce que vos placements pourraient devoir fournir",
      pension: "Rente de l’employeur",
      qpp: "RRQ / RPC",
      oas: "PSV",
      axis: [
        "La retraite",
        "Début du RRQ / RPC",
        "Début de la PSV",
        "Plus tard",
      ],
    },
    gapCaption:
      "Une image hypothétique, sans montants. Vos sources, vos dates et leur ordre vous seront propres.",
    question:
      "Quand chacune de nos sources de revenu commence-t-elle, et quel est l’écart à chaque période?",
  },
  ch4: {
    n: "4",
    short: "Votre portefeuille change de métier",
    title: "Votre portefeuille change de métier.",
    lead: "Pendant des décennies, il avait une seule tâche. Il en prend maintenant plusieurs à la fois.",
    oldCard: {
      heading: "L’ancien métier",
      role: "L’épargne, pendant la carrière",
      duties: ["Croître."],
      schedule: "Aucune échéance.",
      badYear: "Attendre. Il y a du temps, et de nouvelles épargnes arrivent.",
    },
    newCard: {
      heading: "Le nouveau métier",
      role: "L’épargne, à partir de la retraite",
      duties: [
        "Vous verser un revenu, mois après mois",
        "Rester assez investi pour continuer de croître",
        "Gérer les retraits sans ventes forcées au mauvais moment",
        "Encaisser les baisses de marché",
        "Suivre la hausse des prix",
        "Financer les grands projets, souvent tôt",
        "Veiller sur un conjoint, parfois plus longtemps",
        "Compléter une rente, le RRQ ou le RPC et la PSV",
        "Durer toute une vie dont personne ne connaît la longueur",
      ],
      schedule: "Commence bientôt. Aucune date de fin.",
      badYear: "Il doit quand même vous payer.",
    },
    labels: {
      duties: "Tâches",
      schedule: "Échéancier",
      badYear: "Lors d’une mauvaise année",
    },
    after:
      "Rien dans ce nouveau métier n’est inhabituel. Mais c’est un autre métier, et un portefeuille bâti pour l’ancien n’est pas automatiquement prêt pour le nouveau. Les années avant la retraite sont le moment de faire la passation, pendant que plus d’options sont encore ouvertes.",
    margin: "Même argent. Nouveau métier.",
    question:
      "Notre portefeuille est-il organisé pour l’ancien métier, ou pour le nouveau?",
    stormCaption:
      "Le même orage. Ce qui compte, c’est où vous êtes quand il éclate.",
    seqTitle: "La même tempête, à un autre moment.",
    seqBody: [
      "C’est le changement le plus important, et le plus facile à manquer.",
      "Pendant que vous épargnez, une mauvaise année fait mal, mais vous êtes rarement obligé de vendre. Vos cotisations continuent d’acheter, à plus bas prix, et vous avez le temps d’attendre.",
      "Dès que vous tirez un revenu, une mauvaise année fonctionne autrement. Pour obtenir le même montant quand les prix sont bas, il faut vendre davantage. Ce qui a été vendu n’est plus là si les prix remontent.",
    ],
    seqName:
      "Voilà pourquoi une baisse juste avant ou au début de la retraite peut compter davantage que la même baisse à 45\u00a0ans. On l’appelle le *risque de séquence des rendements*. Le nom est aride. L’idée est simple\u00a0: dès qu’on retire, l’ordre des bonnes et des mauvaises années commence à compter.",
    panels: {
      kicker: "Un exemple hypothétique",
      intro:
        "Deux personnes hypothétiques. Exactement les mêmes rendements annuels sur 25\u00a0ans, dans l’ordre inverse.",
      saving: "Pendant l’épargne",
      savingText:
        "Le même montant ajouté chaque année. Un mauvais départ voulait dire acheter à plus bas prix. Dans cet exemple, cela a même aidé.",
      drawing: "Pendant les retraits",
      drawingText:
        "Le même montant retiré chaque année. Un mauvais départ voulait dire vendre à plus bas prix. Cela a laissé une marque durable.",
      first: "Mauvaises années d’abord",
      last: "Mauvaises années à la fin",
      start: "Départ",
      years: "25\u00a0ans",
    },
    seqNote:
      "Sans dépôts ni retraits, les deux aboutiraient exactement au même montant. Ce sont les entrées et les sorties d’argent qui rendent le moment important.",
    seqCaption:
      "Illustration seulement. Elle utilise une série de rendements inventée pour montrer l’effet de l’ordre, pas ce que feront les marchés, et elle ignore les frais et les impôts.",
    question2:
      "Si les marchés baissaient pendant nos deux premières années de retraite, d’où viendrait notre revenu?",
  },
  ch5: {
    n: "5",
    short: "Le risque, plus d’une question",
    title:
      "Le risque n’est plus seulement «\u00a0Combien puis-je tolérer?\u00a0»",
    lead: "Pendant des années, le risque était un sentiment mesuré par un questionnaire. C’est maintenant aussi de l’arithmétique.",
    items: [
      {
        title: "Quelle baisse puis-je supporter?",
        text: "Votre confort devant une baisse de valeur. Toujours important\u00a0: il indique ce que vous serez capable de maintenir.",
      },
      {
        title: "De combien le plan a-t-il besoin?",
        text: "La croissance sur laquelle votre plan compte. Prendre beaucoup moins de risque que nécessaire est aussi un risque\u00a0: l’argent pourrait ne pas durer, ou ne pas suivre les prix.",
      },
      {
        title: "Que ferait une perte à ce qui s’en vient?",
        text: "Une baisse compte moins pour de l’argent que vous ne toucherez pas avant quinze ans. Elle compte beaucoup pour l’argent dont vous aurez besoin au printemps.",
      },
      {
        title: "Quel argent pourrait servir bientôt?",
        text: "Les prochains retraits, une voiture, un coup de main à un enfant, un projet déjà réservé.",
      },
      {
        title: "Quel argent a un horizon beaucoup plus long?",
        text: "Une partie de votre épargne ne sera peut-être pas dépensée avant vingt ans ou plus. Cet argent peut avoir une autre tâche.",
      },
    ],
    after:
      "Aucune de ces questions n’a de réponse toute faite, et aucune ne mène à une répartition particulière. Ce sont les questions dont une réponse sérieuse doit tenir compte.",
    thought:
      "Le bon niveau de risque n’est pas une note. C’est un équilibre entre ce que vous êtes prêt à supporter, ce dont le plan a besoin et le moment où l’argent sera dépensé.",
    canoe:
      "On charge un canot pour le trajet à venir, pas pour celui qu’on a fait.",
    question:
      "Quelle baisse pourrions-nous supporter, et quelle baisse le plan pourrait-il supporter?",
  },
  ch6: {
    n: "6",
    short: "Tous les dollars n’ont pas le même horizon",
    title: "Tous les dollars n’ont pas le même horizon.",
    lead: "On pense naturellement à son portefeuille comme à un tout. À la retraite, il ressemble plutôt à plusieurs sommes, chacune avec sa propre date d’utilisation.",
    body: [
      "Une partie sera dépensée dans un an ou deux. Une autre dans cinq ou dix ans. Une autre ne sera peut-être pas touchée avant vingt ans, ou jamais.",
      "Chacune a une tâche différente.",
    ],
    horizons: [
      {
        title: "L’argent pour bientôt",
        text: "Sa tâche est d’être là, au complet, quand vous en aurez besoin. La stabilité compte plus que la croissance.",
      },
      {
        title: "L’argent pour dans quelques années",
        text: "Un équilibre\u00a0: un peu de croissance, avec la marge pour laisser passer une mauvaise période.",
      },
      {
        title: "L’argent pour beaucoup plus tard",
        text: "Sa tâche est de continuer de croître et de suivre la hausse des prix. Il a plus de temps pour traverser les mauvaises années.",
      },
    ],
    after:
      "Vue ainsi, la diversification n’a rien d’une idée théorique. C’est donner à chaque partie de votre argent la tâche qui correspond à son horizon.",
    caveat:
      "Ceci décrit une façon de penser, pas une structure à copier. Faut-il diviser l’argent par horizon, et comment\u00a0: cela dépend du plan complet.",
    labels: ["Bientôt", "Dans quelques années", "Beaucoup plus tard"],
    margin: "Ce qui est proche doit être stable.",
    question:
      "Quel argent servira bientôt, et est-il placé pour «\u00a0bientôt\u00a0»?",
  },
  ch7: {
    n: "7",
    short: "Vos comptes ne sont pas votre plan",
    title: "Vos comptes ne sont pas votre plan.",
    lead: "Un REER, un CELI, un régime de retraite, un compte non enregistré\u00a0: ce sont des contenants. Le plan, c’est la façon dont ils travaillent ensemble.",
    body: [
      "Chaque contenant a ses règles. L’argent retiré d’un REER ou d’un FERR s’ajoute à votre revenu imposable de l’année. Les retraits d’un CELI ne sont généralement pas imposés et n’affectent pas les prestations fédérales fondées sur le revenu, comme la PSV. Dans un compte non enregistré, les intérêts, les dividendes et la plupart des distributions de fonds sont généralement imposés chaque année; les autres gains en capital le sont à la vente. Certains revenus de pension peuvent être fractionnés avec un conjoint aux fins de l’impôt; les retraits d’un FERR sont généralement admissibles à partir de 65\u00a0ans, et au Québec, cette condition d’âge s’applique à tous ces revenus.",
      "La question n’est donc pas seulement combien retirer. C’est dans quel compte, quelle année, et dans quel ordre. Puiser dans un contenant plutôt que dans un autre peut changer votre facture d’impôt, le remboursement éventuel d’une partie de la PSV et ce qui reste pour plus tard, pour vous et pour un conjoint survivant.",
      "Il n’y a pas un seul bon ordre. Il dépend de votre revenu chaque année, de vos âges, de votre conjoint, de vos volontés pour votre succession et des règles du moment. C’est pour cela qu’il mérite un plan plutôt qu’une habitude.",
    ],
    containers: [
      "REER",
      "CELI",
      "Régime de retraite",
      "Non enregistré",
      "Société",
    ],
    containersCaption:
      "Cinq contenants, ouverts à des moments différents, pour des raisons différentes.",
    planCentre: "Le revenu de cette année",
    planEffects: [
      "Impôt",
      "Prestations gouvernementales",
      "Ce qui reste pour plus tard",
    ],
    planCaption:
      "Le plan, ce sont les mêmes contenants, regardés ensemble, une année à la fois.",
    good: {
      title: "Bon à savoir",
      text: "Un REER doit être fermé au plus tard à la fin de l’année de vos 71\u00a0ans\u00a0: le plus souvent converti en FERR ou utilisé pour acheter une rente, sinon encaissé, ce qui est entièrement imposable. Un FERR exige ensuite un retrait minimum chaque année après l’année de son ouverture.",
    },
    question:
      "Dans quel ordre prévoyons-nous puiser dans nos comptes, et pourquoi?",
  },
  ch8: {
    n: "8",
    short: "À quoi servent les frais",
    title:
      "Les frais se comprennent mieux quand on se demande à quoi ils servent.",
    lead: "La question utile n’est pas «\u00a0Les frais sont-ils mauvais?\u00a0» C’est «\u00a0Qu’est-ce que je paie, et qu’est-ce que je reçois en retour?\u00a0»",
    families: [
      {
        title: "Le placement lui-même",
        text: "Pour un fonds commun de placement ou un FNB, le ratio des frais de gestion (RFG)\u00a0: les frais annuels du fonds, en pourcentage de ce que vous détenez.",
      },
      {
        title: "Le conseil et le service",
        text: "Des honoraires que vous payez directement, ou des commissions versées à la société du représentant, y compris les commissions de suivi, que certains fonds versent à même leur RFG plutôt qu’en frais distincts.",
      },
      {
        title: "Les frais occasionnels",
        text: "Frais d’opération, de compte, de transfert ou de rachat anticipé.",
      },
    ],
    body: [
      "Aucun de ces frais n’est bon ou mauvais en soi. Des frais peuvent payer un vrai travail\u00a0: un plan, la coordination avec vos impôts, quelqu’un qui répond au téléphone lors d’un mauvais mois. L’important est de savoir ce que vous payez et ce que vous recevez en retour.",
    ],
    good: {
      title: "Bon à savoir",
      text: "À partir du rapport portant sur 2026, envoyé au début de 2027, votre rapport annuel sur les frais montrera aussi les frais des fonds que vous détenez, en pourcentage pour chaque fonds et en montant total, en dollars. C’est un bon document à apporter en rencontre.",
    },
    askTitle: "Des questions à poser à tout conseiller",
    ask: [
      "Combien est-ce que je paie au total chaque année, en dollars?",
      "Quelle partie va au placement, et quelle partie au conseil?",
      "Comment êtes-vous rémunéré\u00a0: par moi, par commission, ou les deux?",
      "Qu’est-ce qui est inclus, et à quelle fréquence nous verrons-nous?",
      "Est-ce que changer ou partir coûterait quelque chose?",
    ],
    bill: "Ce que Bill fera pour vous, et la façon dont il est rémunéré, vous sont expliqués avant tout engagement.",
    chartTitle: "Ce qui arrive sur de longues périodes",
    chartText:
      "Un écart qui semble petit s’accumule. Deux comptes hypothétiques, même montant de départ, même rendement de 5\u00a0% par année avant les frais, pendant 25\u00a0ans. L’un paie un point de pourcentage de plus chaque année.",
    chartLabels: {
      lower: "Frais moins élevés",
      higher: "Un point de plus par année",
      result: "Après 25\u00a0ans, environ 21\u00a0% de moins",
      axis: ["Départ", "25\u00a0ans"],
    },
    chartCaption:
      "Hypothèses simplifiées et constantes\u00a0: aucun impôt, dépôt ni retrait. Ce n’est ni une prévision ni les frais de Bill. L’illustration montre pourquoi la question mérite d’être posée, pas quelle réponse est la bonne.",
    margin: "Demandez à quoi ça sert.",
    question: "Combien payons-nous au total, et qu’obtenons-nous en retour?",
  },
  ch9: {
    n: "9",
    short: "Quand les marchés baissent",
    title: "Qu’arrive-t-il quand les marchés baissent?",
    lead: "Un bon plan de retraite n’a pas besoin de prédire les marchés. Il doit décider, à l’avance, comment il se comportera quand les marchés deviendront difficiles.",
    body: [
      "Les marchés baisseront très probablement à un moment ou un autre pendant votre retraite. Personne ne sait quand, de combien ni pour combien de temps. Ce n’est pas une raison de s’alarmer. C’est une raison de décider les choses par temps calme, plutôt qu’au milieu des nouvelles.",
      "Un plan ne peut pas empêcher une baisse. Il peut par contre vous aider à éviter des décisions que vous regretteriez, parce que la réflexion difficile a été faite avant que vous en ayez besoin.",
    ],
    sheetTitle: "Un plan pour le mauvais temps, écrit par beau temps",
    sheetIntro:
      "Répondez-y par une journée tranquille. Gardez la page. Si les marchés baissent, vous relirez votre propre raisonnement plutôt que les manchettes.",
    questions: [
      "Si les marchés baissaient demain, que devrions-nous vendre dans les deux prochaines années?",
      "Quelle part de nos dépenses des prochaines années dépend de placements qui montent et qui baissent?",
      "Que changerions-nous? Des dépenses à reporter, un projet à remettre.",
      "Que ne changerions-nous pas?",
      "Quelles parties du plan ont été prévues exactement pour cela?",
    ],
    dated: "Écrit le",
    caption: "Décidé à l’avance.",
    question:
      "Qu’avons-nous décidé de faire, et de ne pas faire, si les marchés baissent?",
  },
  ch10: {
    n: "10",
    short: "Cinq ans avant la retraite",
    title: "Cinq ans avant la retraite",
    lead: "Une liste à imprimer, à remplir et à apporter. Pas besoin que tout soit coché.",
    groups: [
      {
        verb: "Connaître",
        q: "Qu’avons-nous, au juste?",
        items: [
          "La liste de tous les comptes\u00a0: où, à quel nom, à quoi ils servent",
          "Les relevés du régime de retraite, et les options au départ",
          "Les relevés du RRQ ou du RPC, et quand la PSV pourrait commencer",
          "Les dettes, y compris l’hypothèque, et leur échéance",
        ],
      },
      {
        verb: "Estimer",
        q: "Que pourrions-nous dépenser?",
        items: [
          "L’essentiel, par année",
          "La vie que nous choisissons, par année",
          "Les grosses dépenses prévues d’ici dix ans",
          "Les projets du début\u00a0: quoi, quand, combien à peu près",
        ],
      },
      {
        verb: "Comprendre",
        q: "Comment nos placements sont-ils répartis, et quels risques subsistent?",
        items: [
          "Ce qu’est chaque placement, et ce qu’il coûte",
          "Combien pourrait servir dans les prochaines années",
          "Ce que nous ferions lors d’une forte baisse",
        ],
      },
      {
        verb: "Coordonner",
        q: "Quand chaque source de revenu pourrait-elle commencer?",
        items: [
          "Une date de retraite, et un plan B",
          "Quand la rente, le RRQ ou le RPC et la PSV pourraient commencer",
          "Dans quels comptes puiser d’abord, et l’effet sur l’impôt",
          "Quand le REER deviendra un FERR",
        ],
      },
      {
        verb: "Discuter",
        q: "Qu’est-ce qui demande encore un avis professionnel, fiscal ou juridique?",
        items: [
          "Testament, mandat de protection et bénéficiaires",
          "Assurances\u00a0: encore nécessaires ou non",
          "Une société, un immeuble locatif ou un chalet à transmettre",
          "Des questions pour un comptable ou un notaire",
        ],
      },
    ],
  },
  questions: {
    title: "Vos questions",
    lead: "Les questions des chapitres 1 à 9. Apportez cette page, avec vos notes.",
  },
  ending: {
    line1:
      "Vous n’avez pas besoin d’avoir toutes les réponses avant une première rencontre.",
    line2: "Il vous faut les bonnes questions.",
    body: "Vous en avez la plupart maintenant. Les autres viennent souvent autour d’une table, devant un café, une fois que quelqu’un a écouté ce que vous voulez que votre argent accomplisse.",
    margin: "Une étape à la fois.",
  },
  meeting: {
    title: "Planifier une première rencontre.",
    body: [
      "Une première rencontre est une conversation. Vous n’avez rien à préparer, et rien n’est obligatoire. Apportez ce guide si vous y avez écrit, et vos questions sinon.",
      "En français ou en anglais.",
    ],
    bill: "Ce que Bill fera pour vous, et la façon dont il est rémunéré, vous sont expliqués avant tout engagement.",
    cta: "Planifier une première rencontre",
    phone: "Téléphone",
    email: "Courriel",
    office: "Bureau",
    web: "En ligne",
  },
  colophon: {
    title: "À propos de ce guide",
    body: [
      "Ce guide est de l’information générale. Ce n’est pas un conseil financier, fiscal ou juridique personnalisé, et il ne recommande aucun produit, aucune répartition ni aucune stratégie de retrait. Les exemples sont hypothétiques et présentés comme tels.",
      "Les règles et les montants changent. Les faits de ce guide ont été vérifiés auprès des sources officielles ci-dessous le 29 septembre 2026. Confirmez-les avant d’agir, et posez vos questions sur votre propre situation.",
    ],
    sources: "Sources",
    draft:
      "Version de révision, septembre 2026. Pas encore approuvée pour diffusion.",
    todo: "À compléter avant diffusion\u00a0: la catégorie d’inscription de Bill et la mention de son cabinet, révisées par le cabinet.",
    disclosure: null,
    notes: "Notes",
  },
  back: {
    line: "Une conversation calme, avant les grandes décisions.",
  },
};

/**
 * Official pages the facts were checked against (titles in each language).
 * `urlFr` where a French page was checked too; otherwise the English page,
 * which links to its French version.
 */
export const sources: {
  fr: string;
  en: string;
  url: string;
  urlFr?: string;
}[] = [
  {
    fr: "Retraite Québec — À quel âge demander votre rente de retraite?",
    en: "Retraite Québec — At what age should you apply for your retirement pension?",
    url: "https://www.retraitequebec.gouv.qc.ca/en/citizens/retirement-planning/applying-your-retirement-pension/retirement-pension-quebec-pension-plan/what-age-should-you-apply-your-retirement-pension",
  },
  {
    fr: "Retraite Québec — Relevés de participation (Mon dossier)",
    en: "Retraite Québec — Statement of Participation (My Account)",
    url: "https://www.retraitequebec.gouv.qc.ca/en/citizens/work/your-job-quebec-pension-plan/statement-participation",
    urlFr:
      "https://www.retraitequebec.gouv.qc.ca/fr/services-en-ligne-outils/Pages/releve-de-participation.aspx",
  },
  {
    fr: "Canada.ca — RPC\u00a0: quand commencer votre pension",
    en: "Canada.ca — CPP: when to start your pension",
    url: "https://www.canada.ca/en/services/benefits/publicpensions/cpp/cpp-benefit/when-start.html",
  },
  {
    fr: "Canada.ca — Relevé de cotisations au RPC (Mon dossier Service Canada)",
    en: "Canada.ca — CPP Statement of Contributions (My Service Canada Account)",
    url: "https://www.canada.ca/en/services/benefits/publicpensions/cpp/statement-contributions.html",
  },
  {
    fr: "Canada.ca — PSV\u00a0: quand commencer",
    en: "Canada.ca — OAS: when to start",
    url: "https://www.canada.ca/en/services/benefits/publicpensions/old-age-security/when-start.html",
  },
  {
    fr: "Canada.ca — Impôt de récupération de la PSV",
    en: "Canada.ca — OAS recovery tax",
    url: "https://www.canada.ca/en/services/benefits/publicpensions/old-age-security/recovery-tax.html",
  },
  {
    fr: "ARC — Options pour votre REER l’année de vos 71\u00a0ans",
    en: "CRA — RRSP options when you turn 71",
    url: "https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/rrsps-related-plans/rrsp-options-when-you-turn-71/options-your-rrsps.html",
  },
  {
    fr: "ARC — Recevoir un revenu d’un REER",
    en: "CRA — Receiving income from an RRSP",
    url: "https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/rrsps-related-plans/receiving-income-rrsp.html",
  },
  {
    fr: "ARC — Montant minimum d’un FERR",
    en: "CRA — Minimum amount from a RRIF",
    url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/completing-slips-summaries/t4rsp-t4rif-information-returns/payments/minimum-amount-a-rrif.html",
  },
  {
    fr: "ARC — Qu’est-ce qu’un CELI",
    en: "CRA — What is a TFSA",
    url: "https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/tax-free-savings-account/what.html",
  },
  {
    fr: "ARC — Fractionnement du revenu de pension",
    en: "CRA — Pension income splitting",
    url: "https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/pension-income-splitting.html",
  },
  {
    fr: "ACVM — Types de frais",
    en: "CSA — Types of fees",
    url: "https://www.securities-administrators.ca/investor-tools/understanding-your-investments/types-of-fees/",
    urlFr:
      "https://www.autorites-valeurs-mobilieres.ca/investisseur/soyez-un-investisseur-avise/types-de-frais/",
  },
  {
    fr: "ACVM — Information sur le coût total des fonds d’investissement",
    en: "CSA — Total cost reporting for investment funds",
    url: "https://www.securities-administrators.ca/news/canadian-financial-regulators-enhance-cost-reporting-requirements-for-investment-funds-and-individual-segregated-fund-contracts/",
    urlFr:
      "https://www.autorites-valeurs-mobilieres.ca/nouvelles/des-autorites-de-reglementation-du-secteur-financier-canadien-rehaussent-les-obligations-dinformation-sur-le-cout-total-des-fonds-dinvestissement-et-des-contrats-individuels-de-fonds/",
  },
  {
    fr: "ACFC — Choisir un conseiller financier",
    en: "FCAC — Choosing a financial advisor",
    url: "https://www.canada.ca/en/financial-consumer-agency/services/savings-investments/choose-financial-advisor.html",
  },
];

export const copy: Record<Language, Copy> = { en, fr };
