/* mochii — financial literacy curriculum (see lesson-plan.md)
 * 12 units × 6 lessons. Each lesson: a short tip, quick exercises, then an open "explain it" question
 * that Gemini tutors (offline: regex `keys`, of which `min` must match; default all).
 * Exercise types: mc {o, a, why} · blank {q with ___, a[], bank[]} · num {a, pre, suf} · match {pairs} · open {target, keys, hint}
 */
(function (global) {
  const R = (global.R = global.R || {});
  const mc = (q, o, a, why) => ({ t: 'mc', q, o, a, why });
  const blank = (q, a, bank) => ({ t: 'blank', q, a, bank });
  const num = (q, a, pre = '$', suf = '') => ({ t: 'num', q, a, pre, suf });
  const match = (q, pairs) => ({ t: 'match', q, pairs });
  const open = (q, target, keys, hint, min) => ({ t: 'open', q, target, keys, hint, min });
  const L = (id, title, tip, ex) => ({ id, title, tip, ex, challenge: /\.6$/.test(id) });
  const U = (n, title, emoji, color, lessons) => ({ n, title, emoji, color, lessons });

  R.CURRICULUM = [
    U(1, 'Money and Your Choices', '💸', '#b5e48c', [
      L('1.1', 'Where money goes', 'Money moves four ways. **Income** comes in (pay, gifts). **Spending** goes out on stuff. **Savings** is money you park for later. **Borrowing** gets you money now that you must pay back, and that obligation is **debt**. Mia earns $80 babysitting, spends $25 on snacks, saves $30, and borrows $5 from her brother.', [
        match('Match each money move', [['Income', 'money coming in'], ['Spending', 'money going out on stuff'], ['Savings', 'money set aside for later'], ['Debt', 'money you owe back']]),
        blank('You borrow $10 from a friend. That $10 is ___ because you have to ___ it.', ['debt', 'repay'], ['debt', 'income', 'repay', 'spend', 'savings']),
        open('You earn $50, spend $20, save $15, and borrow $10 from a friend. Which amounts are income, spending, savings, and debt?',
          'Earnings ($50) are income; purchases ($20) are spending; money set aside ($15) is savings; the borrowed $10 is debt you must repay.',
          ['income|earn', 'spen', 'sav', 'debt|owe|borrow|pay (it )?back|repay'], 'Go amount by amount: did it come in, go out, get put aside, or does it have to be paid back?'),
      ]),
      L('1.2', 'Needs and wants', '**Needs** keep you safe, healthy, or able to do school and work. **Wants** are nice-to-haves. Context matters: a bus pass is a need if it gets you to work. A $300 designer backpack when a $30 one works? The extra $270 is a want.', [
        mc('You need shoes for your new café job. Which part is a want?', ['Non-slip shoes for the job', 'The $180 limited colorway instead of $45 basic ones', 'Buying them before your first shift'], 1, 'Shoes are the need; the premium version is the want.'),
        blank('Whether something is a need can depend on your ___.', ['situation'], ['situation', 'mood', 'friends', 'zodiac']),
        open('Your phone breaks. You need it for school and work. Is replacing it a need or a want? What about choosing the newest $1,200 model?',
          'A working phone can be a need here; the premium $1,200 features are a want. Circumstances decide.',
          ['need', 'want|extra|premium|newest|fancy|not (necessary|needed)|unnecessary|luxury'], 'Split it in two: having a working phone at all vs. the specific $1,200 model.'),
      ]),
      L('1.3', 'Opportunity cost', 'Every choice gives something up. **Opportunity cost** is the next-best option you didn’t pick. Spend $15 on a movie, and the opportunity cost might be $15 more toward a new game.', [
        mc('You work a $60 shift on Saturday instead of going to the beach. What’s your opportunity cost?', ['$60', 'The beach day', 'Nothing, you earned money'], 1, 'You gave up the beach day: the alternative you didn’t choose.'),
        blank('Opportunity cost is the ___ alternative you give up.', ['next-best'], ['next-best', 'cheapest', 'worst', 'newest']),
        open('You have $60. You can buy concert tickets or put it toward a bike. If you choose the concert, what is your opportunity cost?',
          'The forgone alternative: the $60 of bike savings and the progress toward the bike it would have provided.',
          ['bike'], 'What else could that exact $60 have done for you?'),
      ]),
      L('1.4', 'Money goals', 'A good goal has an **amount**, a **deadline**, and an **action**. “Save for a trip” becomes “$200 in 10 weeks = $20 a week from my Saturday shifts.”', [
        num('You want $90 in 6 weeks. How much should you save per week?', 15),
        mc('Which goal is most specific?', ['Spend less', 'Save $40 by June 1 by skipping two takeout meals a week', 'Be better with money'], 1, 'It has an amount, a deadline, and an action.'),
        open('Your goal is “I want to save more.” You want $120 headphones in eight weeks. How would you turn that into a specific plan?',
          'Save $15 per week for eight weeks ($120 ÷ 8), from a realistic source of money such as a shift or cutting a specific expense.',
          ['15|fifteen', 'week'], '$120 ÷ 8 weeks = ? Then say where that money comes from.'),
      ]),
      L('1.5', 'Spending pressure', 'FOMO and hype make buying feel urgent. “Only 2 left!” and countdown timers are designed to rush you. Before deciding: **pause** (even 24 hours), **check your budget**, and ask: would I still want this if nobody saw it?', [
        mc('A site shows “only 2 left!” with a countdown. What is it designed to do?', ['Inform you about stock', 'Rush your decision', 'Give you a discount'], 1, 'Urgency cues push fast decisions.'),
        blank('Before an impulse buy, ___ for a day and check your ___.', ['wait', 'budget'], ['wait', 'budget', 'post', 'horoscope', 'hurry']),
        open('Everyone in your group chat is buying limited-edition sneakers. You weren’t planning to buy them. What could you do before deciding?',
          'Pause before buying, check whether you can afford it given your priorities, and separate genuine personal interest from social pressure.',
          ['wait|pause|sleep on|think|24|a day|hold off', 'afford|budget|money|priorit|goal|need', 'pressure|everyone|actually want|really want|friends|fomo|myself|for me'], 'Name a way to slow down, and a question you’d ask yourself.', 2),
      ]),
      L('1.6', 'Challenge: Your first $100', 'Challenge time! You receive **$100**. You owe a friend **$20**, need **$30** for transport, and want a **$70** hoodie. One step at a time.', [
        num('After paying your friend and covering transport, how much of the $100 remains?', 50),
        num('The hoodie costs $70. How much more money would you need to buy it now?', 20),
        open('Suggest a plan for the hoodie and explain what you give up.',
          'A valid plan pays the $20 and $30 obligations first, then either waits and saves the extra $20, finds a cheaper hoodie, or earns more, and names the trade-off.',
          ['wait|save|cheaper|skip|next|later|another|earn|extra|sale|weeks?'], 'Obligations come first. With $50 left, how could you close the $20 gap, and what would that cost you?'),
      ]),
    ]),

    U(2, 'Spending With a Plan', '📊', '#ff8fb8', [
      L('2.1', 'Tracking spending', 'Small repeated purchases add up. A $4 snack, 3 days a week, for 4 weeks = **$48**. Tracking shows you the total so you can choose on purpose instead of by habit.', [
        num('A $3 snack, 4 days a week, for 4 weeks costs how much?', 48),
        blank('Tracking reveals the ___ cost of purchases that feel tiny one at a time.', ['total'], ['total', 'fake', 'zero', 'secret']),
        open('You buy a $6 drink five days a week. It feels small each time. How much is that over four weeks, and why might tracking it change your decision?',
          '$120 ($6 × 5 × 4). Tracking shows the cumulative cost, so you can decide deliberately whether it’s worth it.',
          ['120', 'track|add up|notice|see|total|aware|decid|realize|adds'], '$6 × 5 days × 4 weeks, then: what does seeing that number do?'),
      ]),
      L('2.2', 'Expense types', '**Fixed** expenses stay the same (phone plan, rent). **Variable** expenses change (groceries, gas). **Occasional** expenses show up irregularly (gifts, a yearly fee). All need a place in your plan. For occasional ones, set a little aside each month.', [
        match('Match each expense to its type', [['$10/mo streaming plan', 'Fixed'], ['Gas for the car', 'Variable'], ['Yearly car registration', 'Occasional']]),
        mc('A $120 fee is due in 6 months. Smartest move?', ['Ignore it until it arrives', 'Set aside $20 a month', 'Put it on a credit card later'], 1, '$120 ÷ 6 = $20 a month, so it won’t be a surprise.'),
        open('Your phone plan is $30 monthly, groceries change each week, and a school trip costs $90 next term. How would you classify these expenses?',
          'Phone plan = fixed, groceries = variable, school trip = occasional. All three need a place in the plan.',
          ['fixed', 'variable|changes', 'occasional|irregular|one.?time|once'], 'Which stays the same, which changes, and which comes up only once in a while?'),
      ]),
      L('2.3', 'Budget basics', 'A budget gives every dollar a job. Income − planned spending − savings should never go below zero. With $500 income, $300 essentials and $80 savings, **$120** is left for everything else.', [
        num('Take-home $800, essentials $500, savings $150. How much is left for other spending?', 150),
        blank('Everything you plan to spend and save should add up to ___ your income.', ['no more than'], ['no more than', 'double', 'more than']),
        open('You take home $600. Essentials cost $400, and you want to save $100. What is left for other spending?',
          '$100. All allocations must fit within the $600 available.',
          ['100'], '$600 − $400 − $100 = ?'),
      ]),
      L('2.4', 'Comparing deals', '**Unit price** = price ÷ quantity. 3 for $6 is $2 each; 5 for $9 is $1.80 each. But cheaper per item isn’t automatically better if you won’t use it all or can’t afford the bigger checkout total.', [
        num('12 granola bars cost $6. What’s the price per bar?', 0.5),
        mc('The bulk pack is cheaper per item, but it’ll expire before you finish it. Better deal?', ['Yes, always buy the lowest unit price', 'Not necessarily. Wasted items cost money too.'], 1),
        open('A six-pack costs $9 and a ten-pack costs $14. Which has the lower price per item? Is it automatically the better purchase?',
          '$1.50 vs $1.40, so the ten-pack is cheaper per item, but usefulness, waste, and whether you can afford the bigger total also matter.',
          ['1\\.40?\\b|ten.?pack|10.?pack', 'not (always|automatically|necessarily)|depends|need|use|afford|waste|spoil|space|no\\b'], 'Divide each price by its count, then think about whether cheaper-per-item is always the win.'),
      ]),
      L('2.5', 'Subscriptions', 'Monthly × 12 = yearly. An $8/month app is **$96 a year**. Ask: how often do I actually use it? What’s the cost per use? Is there something I value more?', [
        num('A $15/month streaming service for one year costs?', 180),
        mc('You used a $10/month app twice last month. Cost per use?', ['$5', '$10', '$20'], 0, '$10 ÷ 2 uses = $5 a use.'),
        open('You barely use a $12 monthly subscription. What will keeping it cost over a year, and what would help you decide whether to cancel?',
          '$144 a year. Compare how much you actually use it and the value you get with your other priorities.',
          ['144', 'use|value|worth|often|priorit|cancel|need'], '$12 × 12, then: what would make it worth keeping?'),
      ]),
      L('2.6', 'Challenge: Rescue the budget', 'Your **$700** income covers **$450** essentials, **$100** savings, and **$150** fun. Then a necessary **$80** repair appears.', [
        num('What do the original allocations add up to?', 700),
        num('If you cover the full $80 repair by cutting only fun money, how much fun money is left?', 70),
        open('How could you avoid relying on borrowing for surprises like this next time?',
          'Build an emergency buffer by setting a little aside regularly, so surprises come from savings, not debt.',
          ['emergenc|buffer|sav|set aside|cushion|fund|rainy'], 'What could you build ahead of time so a surprise doesn’t need a loan?'),
      ]),
    ]),

    U(3, 'Banking and Digital Money', '🏦', '#a18bff', [
      L('3.1', 'Choosing a money tool', 'A **checking account** (with a debit card) is for everyday spending. A **savings account** keeps goal money separate and may earn interest. **Payment apps** send money to people. Check what protections apply: bank deposits can be insured, but an app balance might not be.', [
        match('Match the tool to its main job', [['Checking account', 'everyday spending'], ['Savings account', 'money for goals'], ['Payment app', 'sending money to people']]),
        mc('Why keep goal money in a separate account?', ['So it’s harder to spend by accident', 'Checking accounts can’t hold much', 'It doubles automatically'], 0),
        open('You need money for weekly purchases and want to keep your laptop savings separate. Where might you keep each, and why?',
          'Spending money in an accessible checking/transaction account; laptop money in a suitable savings account, separate and protected.',
          ['check|debit|spending account|transaction|everyday', 'sav'], 'One account for spending, one for the goal. Which is which?'),
      ]),
      L('3.2', 'Account comparisons', 'Read the fee schedule: monthly fees and how to waive them, overdraft, ATM fees, and minimum balances. “No fee with a $1,000 balance” only helps if you actually keep $1,000.', [
        num('An account charges $4 a month. Yearly cost?', 48),
        mc('Account B is free “with a $500 minimum balance.” You usually keep $100. What matters most?', ['The fee when you’re below $500', 'The debit card color', 'How many branches it has'], 0),
        open('Account A charges $5 monthly. Account B charges no monthly fee if you keep $500 in it. You usually have $100. What must you find out before choosing?',
          'What B charges when you’re below $500, plus other fees, access, and deposit protection. The advertised price isn’t enough.',
          ['fee|charge|cost', 'below|under|less than|minimum|500|100'], 'You won’t hit $500. So what happens to you at B?'),
      ]),
      L('3.3', 'Available money', 'A **pending** transaction has happened but hasn’t been subtracted yet. Available = shown balance − pending − upcoming bills. $200 shown with $40 pending? Treat it as **$160**.', [
        num('Your app shows $150, with a $20 purchase pending. How much should you treat as available?', 130),
        blank('A ___ transaction has been made but not fully processed yet.', ['pending'], ['pending', 'refunded', 'frozen', 'posted']),
        open('Your app displays $100, but a $35 purchase hasn’t been deducted yet. How much should you treat as available, and why?',
          '$65 (assuming no other obligations). The pending purchase will come out, so plan around it.',
          ['65'], 'That $35 is already spent, just not shown yet.'),
      ]),
      L('3.4', 'Payment methods', 'Payment apps act like cash: once sent, money can be hard to get back. Double-check the username and confirm requests with the person through a channel you already trust, like a call or a text to their known number.', [
        mc('You sent $30 to the wrong username. Typically…', ['It’s instantly reversible', 'It’s often hard or impossible to get back', 'The bank always refunds it'], 1),
        blank('Before paying, ___ the request through a channel you already ___.', ['verify', 'trust'], ['verify', 'ignore', 'trust', 'like', 'post']),
        open('A friend requests $40 through a payment app, but the username is unfamiliar. What should you check before sending?',
          'Verify it’s really your friend and the payment details through a trusted channel (call/text their known number). Don’t assume the request is authentic.',
          ['check|verif|confirm|ask|call|text|message|contact', 'username|person|profile|friend|real|account|who|them'], 'How could you be sure it’s really them?'),
      ]),
      L('3.5', 'Account security', '**Phishing** pretends to be your bank to steal your login or one-time codes. Banks won’t ask for your code by text. Don’t click the link. Open the official app or call the number on your card.', [
        mc('A “bank” calls asking for the 6-digit code they just texted you. You…', ['Read it to them', 'Hang up and call the number on your card', 'Text it instead'], 1),
        blank('Never share your one-time ___.', ['code'], ['code', 'balance', 'birthday', 'bank name']),
        open('A text says your bank account is locked and asks you to click a link and share a login code. What would you do?',
          'Don’t click the link or share the code. Contact the bank through its official app or a verified number.',
          ['(don.?t|not|never|wouldn.?t|avoid|ignore|no).{0,40}(click|link|share|code|send|respond|reply)', 'official|app|call|number|website|contact|bank directly|card|report'], 'Two parts: what you won’t do, and how you’d check for real.'),
      ]),
      L('3.6', 'Challenge: A messy account day', 'You have **$90** before a pending **$25** purchase. A stranger requests **$20**, and a text asks for your bank password.', [
        num('How much can you safely budget?', 65),
        open('How would you handle the $20 request from a stranger?',
          'Don’t pay it. Decline or ignore it, and independently verify any request before sending money.',
          ['decline|ignore|don.?t|not|verif|check|confirm|reject|report|block|no\\b'], 'Do you know this person?'),
        open('How would you check whether the bank alert is real?',
          'Ignore the link, never share the password, and contact the bank through its official app or the number on your card.',
          ['official|app|call|number|website|bank directly|card|log ?in (myself|directly)'], 'Use a channel *you* choose, not the one in the text.'),
      ]),
    ]),

    U(4, 'Your First Paycheck', '💼', '#ffa173', [
      L('4.1', 'Calculating earnings', '**Gross pay** = hours × hourly rate. 10 hours at $14 = $140 gross. But that’s not what lands in your account, and it doesn’t land instantly: deductions come out and payday has a schedule.', [
        num('8 hours at $16/hour. Gross pay?', 128),
        mc('Is gross pay what lands in your account?', ['Yes, always', 'No. Taxes and deductions usually come out first.'], 1),
        open('You work 12 hours at $15 per hour. Your friend says you can spend $180 immediately. What is right about their calculation, and what might they be overlooking?',
          'Gross earnings are $180, but deductions (like taxes) reduce take-home pay, and you’re paid on a schedule, not immediately.',
          ['180|right|correct|math', 'tax|deduct|withh|net|timing|later|payday|when|not (all|yet|immediately)|schedule'], 'The math is fine. Is $180 what you get, and when do you get it?'),
      ]),
      L('4.2', 'Reading a pay stub', '**Gross pay** is before deductions. **Net pay** is what you take home: gross − taxes − other deductions. $400 gross − $45 taxes − $15 other = **$340** net.', [
        blank('___ pay is before deductions; ___ pay is what you take home.', ['Gross', 'Net'], ['Gross', 'Net', 'Bonus', 'Tip']),
        num('$450 gross, $50 taxes, $10 other deductions. Net pay?', 390),
        open('Your pay stub shows $500 gross pay, $60 in taxes, and $20 in other deductions. How much reaches you?',
          'Net pay is $420 ($500 − $60 − $20).',
          ['420'], 'Gross minus everything taken out.'),
      ]),
      L('4.3', 'Tax withholding', 'Employers **withhold** estimated tax from each paycheck. At tax time, if too much was withheld you get a **refund**; too little and you owe. A refund is mostly your own money coming back (credits can add to it). It isn’t a bonus.', [
        mc('A tax refund usually means…', ['The government gave you a gift', 'You prepaid more than you owed, and/or got credits', 'You earned extra wages'], 1),
        blank('Tax ___ is money taken from your paycheck to prepay taxes.', ['withholding'], ['withholding', 'refund', 'interest', 'tip']),
        open('Your friend gets a $600 tax refund and calls it free government money. How would you explain what a refund can represent?',
          'A refund often returns tax you overpaid through withholding (your own money), and credits can contribute. It isn’t necessarily extra earnings.',
          ['overpa|too much|already paid|withh|(your|their|own) money|paid in|prepa|extra.{0,20}(taken|paid)|credit'], 'Where did that $600 originally come from?'),
      ]),
      L('4.4', 'Side-hustle profit', '**Revenue** is what customers pay you. **Profit** = revenue − expenses. You sell $200 of baked goods with $70 of ingredients and $10 of fees: $120 profit. Taxes may still be owed on profit.', [
        num('You sell $250 of art prints. Printing costs $90 and fees are $15. Profit?', 145),
        mc('Is revenue the same as profit?', ['Yes', 'No. Profit subtracts your costs.'], 1),
        open('You sell custom shirts for $300. Materials cost $120 and platform fees cost $30. How much profit have you made before taxes?',
          '$150 ($300 − $120 − $30). Revenue isn’t profit, and taxes may still be owed.',
          ['150'], 'Revenue minus every cost.'),
      ]),
      L('4.5', 'Comparing offers', 'Compare what each job actually leaves you: pay − work costs (commute, parking, uniforms). Then weigh the non-money stuff: time, reliability, benefits.', [
        num('A job pays $18/hour for 10 hours but costs $30/week to park. What’s left before taxes?', 150),
        mc('Besides pay, what else matters?', ['Commute time, reliability, benefits', 'Only the hourly rate', 'The logo'], 0),
        open('Job A pays $16/hour and costs $40/week to commute. Job B pays $15/hour with no commute cost. Both offer 20 hours. Which leaves more before taxes and other costs?',
          'A leaves $280 ($320 − $40); B leaves $300. B leaves more. Benefits, reliability, and time can affect the wider decision.',
          ['300', '\\bb\\b|job b|second|no commute'], 'Work out each: pay × 20 hours, minus commute.'),
      ]),
      L('4.6', 'Challenge: Your first working week', 'You work **20 hours at $15/hour**, have **$35** deducted, and spend **$25** commuting. You also earn **$80** from a side hustle with **$30** in expenses.', [
        num('What’s your job’s gross pay?', 300),
        num('What’s your job’s net pay?', 265),
        num('What’s your side-hustle profit?', 50),
        num('Combined, how much remains after commuting (before any side-hustle tax)?', 290),
        open('What might you still need to plan for on the side-hustle money?',
          'Taxes: side-hustle profit can be taxable and nothing was withheld.',
          ['tax'], 'Your job withheld something from your pay. Did the side hustle?'),
      ]),
    ]),

    U(5, 'Saving and Money Over Time', '🌱', '#7fdcd0', [
      L('5.1', 'Emergency vs. planned savings', 'An **emergency fund** covers unexpected essentials. **Planned savings** are for known goals. Keeping them separate means a surprise doesn’t quietly eat your trip money, and you always know what’s left.', [
        match('Which bucket pays?', [['Emergency fund', 'surprise car repair'], ['Planned savings', 'concert in March'], ['Spending money', 'this week’s lunches']]),
        mc('Your bike chain snaps and you need the bike to get to work. Which bucket?', ['Emergency fund', 'Vacation fund'], 0),
        open('You’re saving for a holiday and your bike needs an unexpected repair. Why might keeping those savings in separate categories help?',
          'It protects the emergency reserve for essentials and makes the effect on planned goals visible, so you know what’s left for each.',
          ['emergenc|unexpected|surprise|protect|essential|repair', 'goal|holiday|see|track|separate|know|visible|plan|left|mix'], 'What could go wrong if it were all one big pile?', 1),
      ]),
      L('5.2', 'Saving to a deadline', 'Weekly savings = (goal − what you have) ÷ weeks left. $300 goal, $60 saved, 8 weeks → ($300 − $60) ÷ 8 = **$30/week**.', [
        num('$250 goal, $50 saved, 10 weeks. Per week?', 20),
        blank('Weekly savings = (goal − what you ___) ÷ ___ left.', ['have', 'weeks'], ['have', 'weeks', 'spend', 'dollars', 'owe']),
        open('A laptop costs $480. You already have $120 and want it in 12 weeks. How much must you save each week?',
          '$30 per week: ($480 − $120) ÷ 12.',
          ['30'], 'Subtract what you have first, then divide.'),
      ]),
      L('5.3', 'Compound interest', 'With **compound interest**, you earn interest on past interest. $200 at 5% a year: year 1 → $210, year 2 → $220.50, because year 2’s 5% is on $210. (Rates here are illustrative.)', [
        num('$100 at 10% simple interest. Balance after 1 year?', 110),
        mc('Why does compounding grow faster over time?', ['You earn interest on past interest', 'Banks add surprise bonuses', 'Inflation boosts it'], 0),
        open('You deposit $100 at 10% annual interest, compounded yearly, with no fees. Why is the balance $121 after two years rather than $120?',
          'Year two earns 10% on $110, which includes the first year’s $10 of interest, so it earns $11 instead of $10.',
          ['110|interest on (the )?interest|first year|previous|already earned|\\$?11\\b|compound'], 'What balance does year two’s interest get calculated on?'),
      ]),
      L('5.4', 'Comparing savings offers', 'Compare **net** benefit: interest earned − fees. $1,000 at 3% APY earns about $30 a year, but a $2 monthly fee costs $24 a year.', [
        num('$500 at 4% APY for one year earns about?', 20),
        mc('Higher APY but a monthly fee. What should you compare?', ['Interest earned minus fees', 'Only the APY', 'The bank logo'], 0),
        open('Account A offers 4% APY with no fee. Account B offers 5% APY but charges $5 monthly. You have $200. Is B necessarily better?',
          'No. B earns ~$10 vs A’s ~$8, but B’s fees are $60 a year, so B leaves you worse off. Compare net benefit, conditions, and access.',
          ['\\bno\\b|not|isn|worse|a is better|account a|\\ba\\b', 'fee|60|\\$5|cost'], 'Work out a year of interest for each, then subtract fees.'),
      ]),
      L('5.5', 'Inflation', '**Purchasing power** is what your money can actually buy. If prices rise faster than your balance grows, you can buy less, even though the number went up.', [
        mc('Prices rose 4% and your pay rose 4%. Your purchasing power…', ['Stayed roughly the same', 'Doubled', 'Fell sharply'], 0),
        blank('Inflation means ___ rise over time, so each dollar buys ___.', ['prices', 'less'], ['prices', 'less', 'more', 'wages', 'taxes']),
        open('Your savings grow by 2%, while the things you buy rise in price by 5%. Do you have more purchasing power?',
          'No. Purchasing power falls: your balance grew slower than prices.',
          ['\\bno\\b|not|less|lose|lost|fall|fell|decreas|lower|down|reduc|weaker'], 'Compare 2% vs 5%. Which is winning?'),
      ]),
      L('5.6', 'Challenge: Laptop or safety buffer?', 'You have **$200**, want a **$500** laptop in ten weeks, and can save **$40** a week. You also want to keep **$100** for emergencies.', [
        num('How much will you have after ten weeks (ignoring interest)?', 600),
        mc('Can you buy the laptop and keep $100 for emergencies?', ['Yes, exactly', 'No, you’re $100 short'], 0, '$600 − $500 = $100 left for emergencies.'),
        open('Where should money you need this soon generally stay, and why?',
          'Somewhere accessible and protected from market losses, like a savings account, not volatile investments.',
          ['sav|bank|account|cash|safe|access|protect|risk|not.{0,10}(invest|stock|crypto)'], 'Ten weeks isn’t long. What matters most for money needed that soon?'),
      ]),
    ]),

    U(6, 'Credit Without the Confusion', '💳', '#ffd97a', [
      L('6.1', 'Credit is borrowing', 'A **credit limit** is the most you can borrow, not money you have. Spend $200 on a $500-limit card and you **owe** $200.', [
        mc('$500 limit, you spend $200. You now…', ['Owe $200', 'Have $300 more income', 'Earned $200'], 0),
        blank('A credit limit is borrowing ___, not ___.', ['capacity', 'income'], ['capacity', 'income', 'savings', 'rewards']),
        open('Your bank gives you a $1,000 credit limit. Has your income increased by $1,000? Explain.',
          'No. It’s borrowing capacity; anything you spend becomes debt you must repay.',
          ['\\bno\\b|not|hasn|didn', 'borrow|debt|owe|pay (it )?back|loan|credit|repay'], 'Where does the $1,000 come from, and what happens if you use it?'),
      ]),
      L('6.2', 'Credit card statements', 'Your statement shows a **statement balance**, a **minimum payment**, and a **due date**. Paying the minimum on time avoids a late fee, but the rest carries over and can build **interest**.', [
        blank('Paying only the ___ avoids a late fee, but the rest can build ___.', ['minimum', 'interest'], ['minimum', 'interest', 'limit', 'rewards', 'balance']),
        num('Statement balance $180, you pay the $40 minimum. How much is unpaid?', 140),
        open('Your statement balance is $240, the minimum is $25, and the due date is Friday. What does paying only $25 accomplish, and what remains?',
          'It meets the minimum if paid on time, but leaves $215 unpaid, which may create interest costs.',
          ['215', 'interest|fee|owe|carry|remain|left'], '$240 − $25, and what happens to that leftover?'),
      ]),
      L('6.3', 'APR and grace periods', 'A **grace period** can let purchases avoid interest, but usually only if you pay the **full statement balance** by the due date. Some transactions, like **cash advances**, often start charging interest right away.', [
        mc('To typically keep a purchase grace period, you…', ['Pay the full statement balance by the due date', 'Pay the minimum', 'Pay whenever'], 0),
        mc('Which commonly starts charging interest right away?', ['Cash advances', 'Purchases paid in full', 'Refunds'], 0),
        open('A card advertises a purchase grace period. Does that mean every transaction stays interest-free regardless of how you pay?',
          'No. Conditions apply, commonly paying the statement balance in full, and some transaction types (like cash advances) have different rules.',
          ['\\bno\\b|not|depends|condition|only', 'full|entire|whole|statement balance|cash advance|type|condition|rules'], 'What do you usually have to do to keep it? Does it cover everything?'),
      ]),
      L('6.4', 'Reports vs. scores', 'A **credit report** is the detailed record: accounts, balances, payment history. A **credit score** is a number that summarizes parts of that report using a scoring model.', [
        match('Match each term', [['Credit report', 'detailed history of your accounts'], ['Credit score', 'a number summarizing that history'], ['Utilization', 'share of your limit you’re using']]),
        blank('A credit ___ is a record; a credit ___ is a summary number.', ['report', 'score'], ['report', 'score', 'limit', 'card']),
        open('A lender checks your credit report and credit score. Why are those two different things?',
          'The report records your credit history in detail; the score summarizes aspects of it as a number using a model.',
          ['record|history|detail|list|account', 'number|summar|rating|model|calculat'], 'One is the full story, one is a number. Which is which?'),
      ]),
      L('6.5', 'Credit-building myths', 'You don’t need to pay interest to build credit. **On-time payments** and **low utilization** (balance ÷ limit) matter. Paying in full is great for your wallet and your credit.', [
        mc('Best credit habit?', ['Pay on time, in full if you can', 'Carry a balance on purpose', 'Max out, then pay the minimum'], 0),
        num('Balance $150 on a $500 limit. Utilization?', 30, '', '%'),
        open('Someone says, “Carry a balance and pay interest to build credit.” How would you respond?',
          'That’s a myth. Paying interest is unnecessary; timely payments and responsible, low use build credit.',
          ['\\bno\\b|not|myth|false|wrong|don.?t (need|have)|unnecessary|isn', 'on.?time|pay(ing)? (it )?(off|in full)|full|responsib|utiliz|low balance|history'], 'Is interest actually what builds credit? What does?'),
      ]),
      L('6.6', 'Challenge: Handle your first statement', 'Your limit is **$1,000**, statement balance **$300**, minimum **$30**. You have **$400** after essentials.', [
        num('What payment could avoid purchase interest if the grace-period conditions are met?', 300),
        num('What share of your limit is $300?', 30, '', '%'),
        mc('Must you carry debt to build credit?', ['No', 'Yes'], 0, 'On-time payments build credit. Interest doesn’t.'),
      ]),
    ]),

    U(7, 'Borrowing and Getting Out of Debt', '⛓️', '#6fdba8', [
      L('7.1', 'Loan comparisons', 'Total cost = payment × number of payments (plus fees). A lower monthly payment over a longer time can cost **more** overall.', [
        num('18 payments of $50. Total paid?', 900),
        mc('A lower monthly payment usually means…', ['Always cheaper overall', 'It can cost more in total over a longer time'], 1),
        open('Loan A requires 12 payments of $100. Loan B requires 24 payments of $60. Which costs less overall, assuming no additional fees?',
          'A totals $1,200; B totals $1,440. A costs less, even though B’s monthly payment is lower.',
          ['1,?200', '1,?440', '\\ba\\b|loan a|first'], 'Multiply each payment by the number of payments.', 2),
      ]),
      L('7.2', 'Buy now, pay later', 'Each BNPL split looks small, but plans **stack**. Add up everything due on the same dates and compare it with the money you’ll actually have.', [
        num('Two BNPL plans each charge $40 on the 1st. Total due?', 80),
        mc('You’ll have $70 on the 1st. What happens?', ['You’re $10 short', 'You’re fine', 'You have $70 extra'], 0),
        open('Three purchases each require $25 next Friday. You expect $60 of available money. Why can each purchase seem affordable while the combination isn’t?',
          'Each $25 fits alone, but together they’re $75, leaving a $15 shortfall. Assess obligations together.',
          ['75', '15|short|not enough|combin|together|add up|total|more than'], 'Add them up. What’s due in total vs. what you have?', 1),
      ]),
      L('7.3', 'Borrowing fees', 'Quick cash costs money. Cost = what you repay − what you borrowed. Repeating it means fees stack and each paycheck shrinks, which can turn into a **cycle**.', [
        num('Borrow $200, repay $230. Borrowing cost?', 30),
        blank('Rolling over short-term loans can create a ___ of debt.', ['cycle'], ['cycle', 'discount', 'refund']),
        open('You borrow $100 and must repay $115 in two weeks. What does borrowing cost, and why might repeating it become a problem?',
          'A $15 borrowing cost. Repeating it piles up fees and eats into future income, which can become a cycle.',
          ['15', 'repeat|again|add up|stack|cycle|accumulat|pile|next (pay|check)|trap|keep|future'], 'What does it cost once? What happens to your next paycheck if you do it again?'),
      ]),
      L('7.4', 'Avalanche and snowball', 'After minimums: **avalanche** sends extra money to the highest interest rate (saves the most interest). **Snowball** sends it to the smallest balance (quick wins for motivation).', [
        match('Match each method', [['Avalanche', 'highest interest rate first'], ['Snowball', 'smallest balance first']]),
        mc('Which usually saves the most interest?', ['Avalanche', 'Snowball'], 0),
        open('You owe $200 at 10% APR and $800 at 25% APR. After minimum payments, which would avalanche target? Which would snowball target?',
          'Avalanche targets the 25% ($800) debt; snowball targets the $200 balance.',
          ['25|higher (rate|apr|interest)|800', '200|smaller|smallest|10%'], 'Avalanche looks at the rate; snowball looks at the balance.'),
      ]),
      L('7.5', 'Payment trouble', 'If you can’t make a payment, act **before** the due date: review your budget, contact the lender about hardship options, and get help from a credible source like nonprofit credit counseling. Ignoring it adds fees and credit damage.', [
        mc('Best first move when you see a missed payment coming?', ['Contact the lender before the due date', 'Ignore it and hope', 'Take a payday loan'], 0),
        blank('Nonprofit credit ___ can help you build a plan.', ['counseling'], ['counseling', 'cards', 'influencers']),
        open('You know you cannot make next month’s loan payment. What useful steps could you take before the due date?',
          'Review essentials and cash flow, contact the lender about options early, and seek credible assistance instead of ignoring it.',
          ['contact|call|talk|reach out|ask|lender|email|tell', 'budget|essential|cut|plan|help|counsel|option|hardship|extension|payment plan|review'], 'Who could you talk to before it’s late?', 1),
      ]),
      L('7.6', 'Challenge: Untangle your debt', 'You have **$150** for debt payments. Two BNPL payments total **$50**, credit card minimums total **$40**. Card A is **12%** APR; Card B is **28%**.', [
        num('What remains after required payments?', 60),
        mc('Where would avalanche direct the extra?', ['Card B (28%)', 'Card A (12%)'], 0),
        open('What should you do if next month’s payments become unaffordable?',
          'Contact creditors early about options, reassess the budget, and seek credible help.',
          ['contact|call|talk|reach out|lender|creditor|counsel|help|reassess|budget|plan'], 'Early action beats silence. Who do you talk to?'),
      ]),
    ]),

    U(8, 'Paying for Your Next Life Stage', '🎓', '#5b8cff', [
      L('8.1', 'Education choices', 'Price isn’t the whole story. Check **completion rates**, credible **job outcomes**, **accreditation**, total cost and financing, and personal fit. “High-paying careers” in an ad isn’t a guarantee.', [
        mc('A program advertises “90% job placement.” What should you check?', ['How it’s measured and who’s counted', 'Nothing, trust it'], 0),
        blank('An advertised salary is a ___, not a guarantee.', ['claim'], ['claim', 'promise', 'contract']),
        open('Program A costs $5,000; Program B costs $25,000 and advertises “high-paying careers.” What else would you investigate before deciding?',
          'Completion rates, credible employment outcomes, accreditation, total costs and financing, and personal fit.',
          ['complet|graduat|dropout|finish', 'job|employ|placement|outcome|salar|earn|career', 'accredit|legit|recogni', 'cost|debt|loan|tuition|fees|total|financ', 'fit|interest|enjoy|like'], 'Name at least two things beyond the price tag.', 2),
      ]),
      L('8.2', 'Financial aid', '**Grants** and **scholarships** usually don’t need repayment (check conditions). **Loans** must be repaid, often with interest. An “aid package” can mix both.', [
        match('Match each type of aid', [['Grant', 'usually no repayment'], ['Loan', 'repaid, often with interest'], ['Work-study', 'earned through a job']]),
        num('Aid: a $2,000 scholarship plus a $4,000 loan. How much must be repaid?', 4000),
        open('An aid offer includes a $3,000 grant and a $5,000 loan. Can you describe the whole $8,000 as free money?',
          'No. The $5,000 loan must be repaid; check grant conditions and loan terms.',
          ['\\bno\\b|not|can.?t|isn', 'loan|repa|pay (it )?back|owe|interest'], 'Which part has to be paid back?'),
      ]),
      L('8.3', 'Moving out', 'Moving costs more than rent. Upfront: often first month’s rent + a security deposit, plus moving and furniture. Ongoing: utilities, internet, food, renters insurance.', [
        num('Rent is $650. Move-in needs first month plus a $650 deposit. Upfront total?', 1300),
        mc('Which is an ongoing cost?', ['Utilities', 'Security deposit'], 0),
        open('Rent is $800. Moving in requires first month’s rent and an $800 deposit. Is having $800 enough? What else belongs in your plan?',
          'No. You need at least $1,600 for those upfront costs, plus utilities, moving, furnishings, and ongoing living costs.',
          ['1,?600|\\bno\\b|not enough', 'utilit|furnit|moving|food|grocer|internet|renter|insurance|bills|wifi|electric'], 'Add the two upfront costs, then list what else costs money.'),
      ]),
      L('8.4', 'Transport costs', 'A car costs more than the payment: insurance, fuel, maintenance, parking, registration. Compare the **total** with alternatives, and factor in time and access.', [
        mc('Which is NOT a car ownership cost?', ['Insurance', 'Gas', 'Bus fare'], 2),
        num('Car: $200 payment + $120 insurance + $80 gas. Monthly total?', 400),
        open('A car payment is $200/month. Public transport costs $90/month. What must you add before comparing them fairly?',
          'Insurance, fuel, maintenance, parking, registration, and other costs; also compare time and access.',
          ['insur', 'gas|fuel', 'maint|repair|oil|tire', 'park', 'regist|licen|tax', 'time|access|convenien'], 'The payment is only one line. What else does a car cost?', 2),
      ]),
      L('8.5', 'Co-signing and contracts', 'A **co-signer** is legally responsible if the main borrower doesn’t pay. The loan can also affect the co-signer’s credit and their ability to borrow.', [
        mc('If the main borrower stops paying, the co-signer…', ['Can be required to pay', 'Is off the hook'], 0),
        blank('Co-signing can affect your ___ even if you never use the loan.', ['credit'], ['credit', 'height', 'phone']),
        open('A friend asks you to co-sign a loan and promises to make every payment. What risk are you accepting?',
          'You could be responsible for repaying it, and it can affect your credit and borrowing capacity. A promise doesn’t remove the contract.',
          ['pay|responsib|liable|owe|on the hook|debt|repay', 'credit|score|borrow|promise|contract|friendship'], 'If they stop paying, who gets the bill?', 1),
      ]),
      L('8.6', 'Challenge: Can you move out?', 'Take-home pay **$1,800**. Rent **$700**, utilities **$100**, food **$250**, transport **$150**, other essentials **$200**. Move-in needs **$1,400** and you have **$1,600** saved.', [
        num('What remains each month after those costs?', 400),
        num('How much of your savings remains after move-in?', 200),
        open('What risks or missing costs should you check before deciding?',
          'The $200 buffer is thin; check omitted expenses (furniture, insurance, internet) and how stable your income is.',
          ['buffer|emergenc|thin|small|only \\$?200|income|job|stable|miss|insur|furnit|utilit|internet|surprise|cushion'], 'If something breaks the first month, what do you have left?'),
      ]),
    ]),

    U(9, 'Protecting Yourself From Shocks', '☂️', '#ff8fb8', [
      L('9.1', 'Understanding risk', 'Risk has two parts: how **likely** something is, and how **costly** it would be. A rare event can still deserve a plan if it would be a loss you couldn’t absorb.', [
        blank('Risk combines how ___ something is and how ___ it would be.', ['likely', 'costly'], ['likely', 'costly', 'cute', 'old']),
        mc('Which risk most needs a plan?', ['A rare event that could cost $20,000', 'A frequent $2 annoyance'], 0),
        open('Which deserves more planning: a frequent $10 inconvenience or an unlikely $10,000 loss? Explain what you’d consider.',
          'Consider both likelihood and impact, plus your ability to absorb the loss. Low probability doesn’t make a huge loss irrelevant.',
          ['likel|probab|chance|often|rare|unlikely', 'impact|severity|big|large|10,?000|afford|absorb|cost|devastat'], 'Think about how often, and how bad.'),
      ]),
      L('9.2', 'Insurance', 'With insurance, many people pay a **premium** so the few who face a big loss get covered. It shines for losses too large to handle yourself. Small, manageable costs can come from savings.', [
        blank('You pay a ___ to the insurer to keep coverage.', ['premium'], ['premium', 'deductible', 'refund']),
        mc('Insurance is most valuable for losses that are…', ['Too large to pay yourself', 'Tiny and frequent'], 0),
        open('Why might someone insure against a major accident but pay for a small repair from savings?',
          'Insurance protects against financially overwhelming losses; manageable losses can be covered personally.',
          ['big|large|major|afford|overwhelm|expensive|can.?t pay|huge', 'small|minor|cheap|manage|savings|handle'], 'Which loss could you handle yourself?'),
      ]),
      L('9.3', 'Premiums and deductibles', 'The **premium** keeps your policy active. The **deductible** is what you pay on a claim before the insurer pays. Simplified: $1,200 loss, $250 deductible → you pay $250, insurer pays $950.', [
        match('Match each insurance term', [['Premium', 'regular payment to keep coverage'], ['Deductible', 'what you pay before insurance pays'], ['Claim', 'request for the insurer to pay']]),
        num('Covered loss $900, deductible $300. Insurer pays?', 600),
        open('A covered repair costs $2,000 and your deductible is $500. Under a simplified policy that pays the rest, what do you pay and what does the insurer pay?',
          'You pay $500; the insurer pays $1,500. Premiums are separate.',
          ['500', '1,?500'], 'You pay the deductible first. Who pays the rest?'),
      ]),
      L('9.4', 'Health costs', 'Health plans often have a **deductible**, then **coinsurance**: you pay a % of the rest. $600 bill, $100 deductible left, 20% coinsurance → $100 + 20% of $500 = **$200**.', [
        num('A $500 covered bill, deductible already met, 20% coinsurance. You pay?', 100),
        mc('Coinsurance is…', ['A % of costs you share after the deductible', 'A monthly fee'], 0),
        open('A covered bill is $1,000. You have $200 of deductible remaining, then pay 20% coinsurance on the rest. What is your share?',
          '$360: the $200 deductible plus 20% of the remaining $800 ($160).',
          ['360'], 'Deductible first, then 20% of what’s left.'),
      ]),
      L('9.5', 'Matching coverage', '**Renters insurance** can cover your belongings (theft, fire) and liability. **Disability insurance** can replace part of your income if you can’t work. Different risks, different policies.', [
        match('Which coverage fits?', [['Renters insurance', 'laptop stolen from your apartment'], ['Disability insurance', 'can’t work after an injury'], ['Health insurance', 'doctor visit']]),
        mc('Your landlord’s insurance usually covers…', ['The building, not your stuff', 'All your belongings'], 0),
        open('You rent an apartment, own a laptop, and depend on your wages. What risks might renters and disability insurance address?',
          'Renters can cover eligible belongings (like the laptop) and liability; disability can replace some income if you can’t work.',
          ['belong|laptop|stuff|possess|theft|stolen|liabil|fire|property', 'income|wage|pay|work|job|earn'], 'One protects your stuff. One protects your paycheck.'),
      ]),
      L('9.6', 'Challenge: Pick a protection plan', 'Policy A: **$20/month**, **$1,000** deductible. Policy B: **$35/month**, **$250** deductible. Both fully cover the rest of a qualifying **$2,000** loss.', [
        num('Policy A’s annual premiums?', 240),
        num('Policy B’s annual premiums?', 420),
        num('Total yearly cost with A if the $2,000 loss happens?', 1240),
        num('Total yearly cost with B if the loss happens?', 670),
        open('Why might different people choose differently?',
          'It depends on available savings to cover a deductible, how likely the loss is, coverage, and what premium fits the budget, not hindsight alone.',
          ['sav|afford|risk|budget|likely|cash|emergenc|deductible|premium|monthly'], 'Who could handle a $1,000 deductible tomorrow, and who couldn’t?'),
      ]),
    ]),

    U(10, 'Investing Foundations', '📈', '#b5e48c', [
      L('10.1', 'Saving vs. investing', 'Match the tool to the deadline. Money needed **soon** should be accessible and safe. Money for **years** away can ride out ups and downs. Volatile investments can drop right when you need the cash.', [
        mc('Money for rent next month belongs…', ['In an accessible savings or checking account', 'In a volatile stock'], 0),
        blank('The ___ until you need the money affects how much risk fits.', ['time'], ['time', 'weather', 'logo']),
        open('You need $500 for school supplies next month. Would putting it in a volatile stock fit that goal? Why?',
          'No. With such a short deadline there’s little time to recover from a drop; prioritize access and preservation.',
          ['\\bno\\b|not|wouldn|bad|risky', 'month|soon|short|time|drop|fall|lose|loss|volatil|recover|down'], 'What if it drops 20% right before you need it?'),
      ]),
      L('10.2', 'Stocks, bonds, and funds', 'A **stock** is a slice of ownership in a company. A **bond** is generally a loan you make to a company or government. A **fund** holds a collection of many investments.', [
        match('Match each investment', [['Stock', 'owning part of a company'], ['Bond', 'lending to a company or government'], ['Fund', 'a basket of many investments']]),
        mc('An index fund holding 500 companies means you own…', ['Small slices of many companies', 'One company'], 0),
        open('Your friend says buying a stock, a bond, and a fund all means owning one company. How would you correct them?',
          'A stock is ownership; a bond is generally lending; a fund holds a collection of assets.',
          ['own|share|part', 'lend|loan|debt|borrow|iou', 'many|collection|basket|group|multiple|bunch|mix|several'], 'Go one by one: own, lend, or bundle?', 3),
      ]),
      L('10.3', 'Risk and return', 'Higher possible returns usually come with higher risk. Advertised returns are **possibilities, not promises**. Look at potential losses, time horizon, how easily you can get money out, and what you’re actually buying.', [
        mc('“Up to 30% returns!” means…', ['30% is possible, not promised', 'You’ll earn 30%'], 0),
        blank('Higher potential ___ usually comes with higher ___.', ['returns', 'risk'], ['returns', 'risk', 'fees', 'likes']),
        open('An investment advertises the possibility of high returns. Does that tell you what you will earn? What else do you need to know?',
          'No. Returns are uncertain; examine potential losses, time horizon, liquidity, fees, and what the investment actually is.',
          ['\\bno\\b|not|doesn|uncertain|possib|guarantee', 'risk|loss|lose|fee|time|horizon|liquid|what it is|invest(ing)? in|detail|research'], 'Possible ≠ promised. What could go wrong?'),
      ]),
      L('10.4', 'Diversification', '**Diversification** spreads money across different companies, industries, and asset types, so one bad event doesn’t sink everything. Five companies in the same industry can all fall together.', [
        mc('Which is more diversified?', ['A fund across many industries plus bonds', 'Three airline stocks'], 0),
        blank('Diversification spreads money across different ___.', ['investments'], ['investments', 'passwords', 'phones']),
        open('You own shares in five gaming companies. Are you necessarily well diversified?',
          'No. They share industry risks; diversify across sectors and asset types.',
          ['\\bno\\b|not|isn', 'same industry|one industry|gaming|sector|all|together|similar|concentrat'], 'What if something bad hits the whole gaming industry?'),
      ]),
      L('10.5', 'Fees', 'Fees come out every year, and the money lost to fees can’t grow. 1% of $10,000 is $100 a year vs $10 at 0.1%, and the gap compounds over decades.', [
        num('$5,000 in a fund with a 1% annual fee. Yearly fee?', 50),
        mc('Why do small fee differences matter over decades?', ['Fees reduce the money that compounds', 'They don’t'], 0),
        open('Two otherwise identical funds charge annual fees of 0.1% and 1%. Why could that difference matter over decades?',
          'Higher fees reduce the money left to compound, so small annual differences accumulate into a big gap.',
          ['compound|grow|add up|accumul|over time|decade|less money|reduce|eat|gap|bigger'], 'What happens to money that goes to fees instead of staying invested?'),
      ]),
      L('10.6', 'Challenge: Match money to goals', 'Sam has money for **rent next month**, a **trip in two years**, and **retirement in 40 years**.', [
        mc('Which goal most clearly needs immediate stability?', ['Rent next month', 'Trip in two years', 'Retirement in 40 years'], 0),
        open('Why might the goals use different tools?',
          'Their time horizons and risk capacity differ: short-term money needs safety, long-term money can handle more ups and downs.',
          ['time|horizon|when|soon|years|risk|long|short'], 'How long until Sam needs each pot?'),
        open('What would you check before choosing a long-term fund?',
          'Diversification, fees, what it holds, risk, and suitability for the goal.',
          ['fee|expense', 'divers|holding|what.{0,10}in it|invest(s|ed)? in', 'risk|suitab|goal|history|performance'], 'Think costs and contents.', 1),
      ]),
    ]),

    U(11, 'Investing Judgment', '🧠', '#a18bff', [
      L('11.1', 'Accounts vs. investments', 'An **account** (IRA, 401(k), brokerage) is a container. **Investments** are what you put inside. Money deposited can sit as cash until you choose investments.', [
        mc('You deposited into a retirement account but never picked investments. Your money may be…', ['Sitting as cash', 'Automatically in stocks'], 0),
        blank('An account is the ___; investments are what’s ___ it.', ['container', 'inside'], ['container', 'inside', 'logo', 'outside']),
        open('You open a retirement account and deposit money. Does that automatically mean you own stocks or funds?',
          'No. The account holds assets; check whether the money is still cash or has been invested.',
          ['\\bno\\b|not|doesn|isn', 'cash|invest|choose|pick|select|hold|container|check'], 'Container vs. contents.'),
      ]),
      L('11.2', 'Employer matching', 'With a **match**, your employer adds money when you contribute, up to a limit. Conditions apply, like **vesting**, where you may need to stay a while to keep the employer’s part.', [
        num('Salary $40,000, you contribute 4%. Your annual contribution?', 1600),
        mc('Vesting means…', ['You may need to stay a while to fully keep the match', 'Free money, no conditions'], 0),
        open('Your employer matches contributions dollar-for-dollar up to 3% of a $30,000 salary. If you contribute 3%, how much do you and the employer each contribute annually?',
          '$900 each, $1,800 combined, subject to eligibility and plan conditions like vesting.',
          ['900'], '3% of $30,000, and dollar-for-dollar means…'),
      ]),
      L('11.3', 'Volatility and rebalancing', 'Markets move your mix. Target 50/50 on $1,000, then stocks rise to $600 and bonds stay at $400, and now you’re 60% stocks. **Rebalancing** moves back toward your target, considering costs and taxes.', [
        num('Target 50/50 on $1,000. Stocks rise to $600, bonds stay $400. Stock share now?', 60, '', '%'),
        mc('Rebalancing means…', ['Adjusting back toward your target mix', 'Selling everything in a drop'], 0),
        open('Your target mix is 60% stocks and 40% bonds. After market changes it becomes 75% stocks. What changed, and what might rebalancing do?',
          'Stock exposure grew, generally raising risk; rebalancing restores the intended 60/40 mix, considering costs and taxes.',
          ['more stock|stocks? (grew|went up|increased|rose)|riskier|more risk|15|exposure|risk', 'rebalanc|back|restor|sell (some )?stock|buy (more )?bond|target|60'], 'Which part grew? What does getting back to 60/40 involve?'),
      ]),
      L('11.4', 'Finfluencers', 'Online creators can be helpful, but check **evidence**, **qualifications**, and **incentives**: affiliate links and sponsorships mean they get paid when you act. Popularity is not proof.', [
        mc('A creator gets paid when you click their link. That’s a…', ['Conflict of interest', 'Guarantee'], 0),
        blank('Popularity is not ___.', ['proof'], ['proof', 'fun', 'new']),
        open('A creator says a stock will double and shares an affiliate link. What would you investigate before acting?',
          'Evidence, qualifications, how they’re compensated and conflicts, the risks, and independent sources.',
          ['evidence|source|data|research|proof|independ', 'paid|affiliate|commission|incentive|conflict|money from|sponsor', 'risk|lose|guarantee|double', 'qualif|credential|licen|regist|expert'], 'Why are they telling you this? How would you check?', 2),
      ]),
      L('11.5', 'Speculation and leverage', '**Leverage** means investing with borrowed money. Gains get bigger, but so do losses, and you still owe the loan even if the investment crashes.', [
        num('You borrow $1,000 to invest. It drops 40%. What’s the investment worth now?', 600),
        mc('How much do you still owe?', ['$1,000 (plus interest)', '$600'], 0),
        open('A friend borrows money to buy a token because it “can’t lose.” What problems do you see?',
          'Gains aren’t guaranteed and it can lose value, while the loan still has to be repaid. Leverage adds risk, and “can’t lose” deserves scrutiny.',
          ['lose|loss|drop|fall|crash|not guaranteed|no such thing|risk|scam|lie|false|anything can', 'owe|debt|repay|pay back|borrow|loan|interest'], 'If the token drops, what still has to be paid?'),
      ]),
      L('11.6', 'Challenge: Hype meets a market drop', 'Your diversified retirement portfolio falls **15%**. A creator promises a **guaranteed** crypto return and suggests **borrowing** to buy in.', [
        open('What would you review before changing your existing plan?',
          'Your goals, time horizon, allocation, and financial circumstances, not just the recent drop.',
          ['goal|horizon|time|allocation|plan|diversif|retire|long.?term|circumstance|years'], 'Retirement is decades away. What should guide decisions?'),
        open('What makes the creator’s pitch suspicious?',
          'Guaranteed returns are a red flag, and the creator’s incentives are unclear.',
          ['guarantee|promis|too good|incentive|paid|affiliate|scam|borrow'], 'One word in the pitch is a classic red flag.'),
        open('How does borrowing change the downside?',
          'Debt adds an obligation that remains even if the investment loses value, so losses get amplified.',
          ['owe|debt|repay|loan|pay back|lose more|amplif|interest|still'], 'If the crypto drops, what’s left over?'),
      ]),
    ]),

    U(12, 'Build Your Financial Plan', '🗺️', '#ffa173', [
      L('12.1', 'Net worth and cash flow', '**Net worth** = assets − debts: a snapshot. **Cash flow** = money in − money out each month: a movie. You can have positive net worth and still be bleeding cash monthly.', [
        num('Assets $2,000, debts $500. Net worth?', 1500),
        blank('Net worth = assets − ___. Cash flow = money in − money ___.', ['debts', 'out'], ['debts', 'out', 'income', 'in']),
        open('You own $5,000 of assets and owe $2,000, but spend $100 more than you earn monthly. What is your net worth, and what problem remains?',
          'Net worth is $3,000; negative monthly cash flow is a separate problem that erodes it.',
          ['3,?000', 'cash flow|spend(ing)? more|overspend|negative|100|deficit|losing|shrink|erod'], 'Assets − debts, then look at the monthly picture.'),
      ]),
      L('12.2', 'Competing priorities', 'Your next dollar has many possible jobs. A common order: protect essentials and required payments, build a starter buffer, then weigh high-interest debt and long-term goals (like an employer match). Multiple plans can be reasonable.', [
        mc('Usually the first priority for your next dollar?', ['Essentials and required payments', 'A meme stock'], 0),
        mc('Why tackle high-interest card debt early?', ['Its interest cost often beats likely investment gains', 'Cards give rewards'], 0),
        open('You have no emergency savings, expensive credit card debt, and want to invest. How would you reason about where your next $100 goes?',
          'Protect essentials and minimum payments; weigh a starter buffer against high-interest debt; invest once those are handled (or for benefits like a match).',
          ['essential|bill|minimum|required|rent|food', 'emergenc|buffer|starter|savings|cushion', 'debt|credit card|interest|apr'], 'Rank the three, and say why.', 2),
      ]),
      L('12.3', 'Irregular income', 'If income varies, budget around a **conservative baseline** (your lower months), and save the surplus from good months to cover the lean ones.', [
        mc('Income varies $800–$1,400. Budget around…', ['A conservative baseline like $800', '$1,400'], 0),
        num('Average of $800 and $1,400?', 1100),
        open('You earn $900 one month and $1,500 the next. Why might budgeting as though you receive $1,200 every month cause trouble?',
          'The average hides timing: in the $900 month you’d be $300 short. Use a conservative baseline and save higher-month surpluses.',
          ['900|300|low(er)? month|short|less|gap|average hides|not every|timing|bad month|can.?t cover'], 'What happens in the $900 month?'),
      ]),
      L('12.4', 'Stress-testing', 'A budget that only works when nothing goes wrong is fragile. Add an emergency **buffer**, plan for **irregular** expenses, know your **flexible** spending, and consider protection or support options.', [
        mc('Which makes a budget more resilient?', ['An emergency buffer', 'Spending every dollar'], 0),
        blank('Planning for ___ expenses like car repairs makes a budget less fragile.', ['irregular'], ['irregular', 'imaginary', 'fixed']),
        open('Your budget works only if every paycheck arrives and nothing breaks. What changes could make it more resilient?',
          'Build an appropriate buffer, plan for irregular expenses, identify flexible spending, and consider relevant protection or support.',
          ['buffer|emergenc|savings|cushion', 'irregular|sinking|set aside|plan for', 'flexib|cut|discretion|wants', 'insur|support|help|side|second'], 'Name two ways to absorb a surprise.', 2),
      ]),
      L('12.5', 'Trustworthy help', 'Check any adviser: **qualifications** and **registration**, how they’re **paid** (conflicts), what services they provide, and independent evidence. “Guaranteed returns” is a red flag; transparency alone isn’t enough.', [
        mc('Strongest red flag?', ['Guaranteed high returns', 'Explains fees clearly'], 0),
        blank('Check an adviser’s ___ and how they get ___.', ['registration', 'paid'], ['registration', 'paid', 'followers', 'famous']),
        open('One adviser promises guaranteed returns; another explains risks and fees. What would you verify before trusting either?',
          'Qualifications, registration, compensation and conflicts, services, and independent evidence.',
          ['qualif|credential|licen|regist|certif|brokercheck|finra|sec', 'paid|compensat|fee|commission|conflict|incentive', 'review|independ|evidence|research|reference|track|background'], 'Who are they officially, and how do they make money?', 2),
      ]),
      L('12.6', 'Final: A year in your financial life', 'The big one. Start with **$1,600** monthly take-home, **$1,200** essentials, **$500** savings, and **$600** card debt at **24% APR**. Then life happens.', [
        num('What’s your initial monthly surplus?', 400),
        open('How would you split that $400? Include required debt payments.',
          'Pay at least the card minimum, then split between the high-interest debt and the savings buffer, justified by your priorities.',
          ['debt|card|minimum|payment', 'save|buffer|emergenc|sav'], 'Cover the required payment first, then choose between buffer and debt.', 2),
        open('A $250 repair hits. How do you respond?',
          'Cover it from the savings buffer or surplus rather than new debt, then rebuild.',
          ['sav|buffer|emergenc|cut|surplus|500|fund'], 'You have $500 saved…'),
        num('A low month brings $1,000 income against $1,200 essentials. What’s the gap?', 200),
        num('After a raise to $1,800, how much is left above essentials?', 600),
        open('When could investing enter your plan?',
          'Once essentials, a buffer, and high-interest debt are handled (or to capture an employer match), with money meant for the long term.',
          ['after|once|when|buffer|debt|emergenc|paid off|stable|long.?term|match'], 'What needs to be in place first?'),
      ]),
    ]),
  ];

  R.LESSONS = R.CURRICULUM.flatMap((u) => u.lessons.map((l) => ({ ...l, unit: u })));
})(typeof window !== 'undefined' ? window : globalThis);
