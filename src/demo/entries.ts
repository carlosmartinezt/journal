import type { SceneKey } from './scenes'

/**
 * The demo journal's content: a few years in the life of a fictional writer.
 *
 * Dates are relative so the demo always looks current, whenever someone opens
 * it. Four ways to place an entry, in order of precedence:
 *
 *   md       most recent occurrence of a calendar date ("11-14"), so entries
 *            that mention frost or blossom stay in the right season
 *   yearsAgo same month + day, N years ago — this is what fills "On this day"
 *   d        N days before today (the default; keeps recent weeks dense)
 *   w        additionally snap backwards to a weekday, for the entries whose
 *            text names one
 *
 * The list is written newest-first, the way the timeline shows it — including
 * inside a cluster like a trip, so its last day appears above its first. A test
 * enforces that, which is what catches a "second day" dated before its arrival.
 *
 * Body lines use a tiny markup understood by `toDoc()`:
 *   "## text"  heading      "> text"  quote
 *   "- text"   list item    anything else is a paragraph
 */
export interface DemoEntrySpec {
  /** Days before today. */
  d?: number
  /** Same month + day, this many years ago. Takes precedence over `d`. */
  yearsAgo?: number
  /** "MM-DD" — the latest such date that isn't in the future. Wins over `d`. */
  md?: string
  /** Extra whole years to subtract from an `md` date. */
  back?: number
  /** Snap backwards (up to 6 days) to this weekday, 0 = Sunday. */
  w?: number
  /** Local time of day, "HH:MM". */
  t: string
  title?: string
  body: string[]
  photo?: SceneKey
}

export const DEMO_ENTRIES: DemoEntrySpec[] = [
  // ---- this week ---------------------------------------------------------
  {
    d: 0,
    t: '07:20',
    title: 'Morning, before anything',
    body: [
      'Woke before the alarm and let the flat stay quiet for a while. Coffee, the good mug, the window open just enough to hear the street waking up.',
      'I keep noticing that the days I like best are the ones that start slowly. Not earlier — slower. There is a difference and it took me an embarrassingly long time to learn it.',
    ],
  },
  {
    d: 0,
    t: '21:40',
    body: [
      'Long day, but a good one. Finished the section I have been circling for a week by deleting the first three paragraphs. They were throat-clearing. Everything after them was fine.',
      '> Cut the run-up. Start where the thinking starts.',
    ],
  },
  {
    d: 1,
    t: '18:05',
    title: 'Rain all afternoon',
    body: [
      'It rained from noon until dark. I stayed in, worked with the lamp on at two in the afternoon, and did not feel guilty about it once.',
      'Made soup out of whatever was in the drawer — a leek going soft, half a fennel, the end of a parmesan rind. It was better than most things I have made on purpose.',
    ],
    photo: 'rain',
  },
  {
    d: 2,
    t: '08:10',
    body: ['Ran 6k along the water. Cold hands the first kilometre, then fine. 34:12.'],
  },
  {
    d: 3,
    t: '13:30',
    title: 'Lunch with Nadia',
    body: [
      'Nadia is leaving the studio. She told me over lunch and then immediately apologised, which is such a Nadia thing — apologising for good news.',
      'She has been unhappy there for two years and did nothing about it for the first nineteen months. Then something small tipped it. I asked what and she said, "Someone asked what I was working on and I was bored answering."',
      'That has been sitting with me all afternoon.',
    ],
  },
  {
    d: 4,
    t: '22:15',
    body: [
      'Finished the Berger. The chapter on drawing as looking — that the point is not the drawing, it is the twenty minutes of actually seeing the thing.',
      'Applies to almost everything I care about.',
    ],
  },
  {
    d: 6,
    w: 6,
    t: '10:45',
    title: 'The market, Saturday',
    body: [
      'Went early for once and it was a completely different place. The tomato man remembered me. The bread was still warm on the bottom.',
      'Things bought that I did not need: a bunch of dahlias, a jar of honey with the comb still in it, a wooden spoon I already own in two sizes.',
      'Things bought that I did need: nothing, apparently.',
    ],
  },

  // ---- last month --------------------------------------------------------
  {
    d: 8,
    t: '19:20',
    body: ['Pepper spent the entire evening asleep on the warm laptop. Wrote nothing. Blameless.'],
  },
  {
    d: 9,
    t: '07:55',
    title: 'A small argument with myself',
    body: [
      'Woke up convinced the whole project is wrong and should be restarted. Made coffee. Read what I actually wrote last week. It is fine. Better than fine in two places.',
      'The 6am version of me is not a reliable narrator. Noting this here so I can be shown the evidence next time.',
    ],
  },
  { d: 11, t: '20:30', body: ['Ran 8k, slow and easy. Legs heavy, head clear. Fair trade.'] },
  {
    d: 12,
    t: '16:40',
    title: 'Hard week at work',
    body: [
      'Three deadlines collapsed into the same afternoon and the review meeting went the way those go. I defended a decision I no longer believed in, out of tiredness rather than conviction, which is the worst reason.',
      'Wrote an email afterwards saying I had changed my mind. Felt worse sending it, better an hour later.',
    ],
  },
  {
    d: 14,
    t: '09:15',
    title: 'When a flat becomes a home',
    body: [
      'I remember standing in the empty front room here thinking it was too big, then too small, then that I had made a mistake.',
      'Now I know which floorboard creaks, which neighbour takes the bins out on Tuesday, and where the light lands in October. That is roughly what home turns out to mean, and nobody tells you it arrives that quietly.',
    ],
    photo: 'sunrise',
  },
  {
    d: 16,
    t: '21:05',
    body: [
      'Theo called. We talked for an hour and eleven minutes about nothing in particular. Somewhere in there he mentioned, entirely in passing, that he has started swimming again.',
      'My brother buries the important sentence in the middle of the paragraph. Always has.',
    ],
  },
  { d: 17, t: '12:20', body: ['Sourdough, fourth attempt. Finally an open crumb. Photographed it like a proud parent.'] },
  {
    d: 19,
    t: '18:50',
    title: 'Walking home the long way',
    body: [
      'Got off two stops early and walked. The light comes in at a different angle now — it has moved a good half metre along the wall of the corner building since I last paid attention.',
      'A man was playing cello outside the station. Badly, and with total commitment. I stood there longer than was reasonable.',
    ],
  },
  { d: 21, t: '08:00', body: ['5k. 27:44. Rain the whole way. Grinning by the end, obviously.'] },
  {
    d: 23,
    t: '22:40',
    title: 'On keeping this',
    body: [
      'Someone asked why I write these when nobody reads them. I did not have a good answer at the time so here is the one I thought of afterwards.',
      'It is not for the record. It is that fifteen minutes of writing turns a day I merely survived into a day I actually noticed. The noticing is the whole product. The file is a by-product.',
      '> Most of my life happened while I was thinking about something else. This is the small correction.',
    ],
  },
  {
    d: 22,
    w: 6,
    t: '23:55',
    body: [
      'Nine people in the end. Someone brought a friend. We ran out of chairs and ate the last course standing in the kitchen, which was better than the plan.',
      'Nadia stayed to help wash up and we talked until two. Best night in months.',
    ],
  },
  {
    d: 26,
    t: '11:30',
    title: 'Dinner party, in advance',
    body: [
      'Eight people at the weekend. The plan:',
      '- Braise the shoulder the night before, reheat slowly',
      '- Something green and sharp to cut it',
      '- Buy the dessert and be at peace about it',
      '- Set the table before anyone arrives, not while',
      'I have hosted enough of these to know that every problem is caused by trying to do a fourth thing.',
    ],
  },

  // ---- two to three months back ------------------------------------------
  {
    md: '11-14',
    t: '07:40',
    title: 'First cold morning',
    body: [
      'Frost on the railings. Could see my breath waiting for the bus. Everyone at the stop had that slightly startled look, as if winter had been sprung on us rather than scheduled.',
    ],
  },
  { d: 35, t: '19:00', body: ['Long run, 14k. Furthest since spring. Ate an entire loaf afterwards without regret.'] },
  {
    d: 38,
    t: '17:20',
    title: 'The old photographs',
    body: [
      'Mum sent a box of photographs from the house. Most of them are badly framed and slightly out of focus and completely irreplaceable.',
      'There is one of my father at about my age, standing in a garden I do not recognise, laughing at whoever is holding the camera. I have never seen him look like that. He would have been about thirty-four.',
      'I sat on the floor with them for two hours and did not get up until my leg went numb.',
    ],
  },
  {
    d: 41,
    t: '20:15',
    body: ['Gave up on the novel at page 140. Life is short and the library is large.'],
  },
  {
    d: 44,
    t: '09:30',
    title: 'A day in the forest',
    body: [
      'Took the early train out and walked the ridge path for four hours. Fog until eleven, then it lifted all at once like someone pulling a sheet off furniture.',
      'Did not see another person until the last mile. Heard a woodpecker for ten minutes before I found it.',
    ],
    photo: 'forest',
  },
  { d: 47, t: '13:10', body: ['Haircut. The good barber. Feel like a person again.'] },
  {
    d: 50,
    t: '21:30',
    title: 'Something I keep relearning',
    body: [
      'Spent all day on the hardest part of the problem and got nowhere. Went for a walk to the shop for milk and solved it somewhere around the second corner.',
      'This has now happened enough times that I should probably schedule the walks as work. I never will.',
    ],
  },
  {
    md: '10-29',
    t: '18:45',
    body: [
      'The heating came on for the first time and the whole building made that noise, the pipes knocking their way up through the floors like something waking.',
    ],
  },
  {
    d: 58,
    t: '16:30',
    body: ['Same trip, second day. Rain from dawn. Played cards in the car park for an hour waiting for it to pass. It did not pass. Drove home happy anyway.'],
  },
  {
    d: 59,
    t: '10:00',
    title: 'Weekend in the mountains',
    body: [
      'Drove up with Theo and we barely spoke for the first hour, which with him means everything is fine.',
      'Walked to the lake. The water was clear enough to see the stones four metres down and cold enough that we lasted eleven seconds, timed.',
      'He asked, on the way down, whether I was happy. Not casually. I said mostly, and then spent the whole drive home wondering whether "mostly" is a good answer or an evasion.',
    ],
    photo: 'mountains',
  },
  { d: 63, t: '08:20', body: ['10k. 52:03. Negative split, which never happens. Writing it down as evidence.'] },
  {
    d: 67,
    t: '22:00',
    title: 'Late shift',
    body: [
      'Worked until eleven for the third night running. The building is unnervingly good at night — no phones, no one asking a quick question, just the hum of the lights.',
      'I get more done and I like myself less. Not sure what to do with that yet.',
    ],
  },
  {
    d: 72,
    t: '19:40',
    body: ['Cooked for one properly for once: cloth on the table, wine in a real glass, phone in the other room. Recommend.'],
  },
  {
    md: '09-16',
    t: '15:15',
    title: 'The end of the summer',
    body: [
      'Last properly warm afternoon, everybody outside, the city doing that thing where it refuses to admit the season is over.',
      'Sat by the water and read for three hours. A kid nearby spent the entire time trying to teach a dog to catch a frisbee. Neither improved. Both delighted.',
    ],
    photo: 'coast',
  },
  { d: 80, t: '07:15', body: ['Swim before work. Six lengths more than last time. Chlorine in my hair all day.'] },
  {
    d: 85,
    t: '20:50',
    title: 'A short list of good things',
    body: [
      '- Tomatoes that still taste of something',
      '- The five minutes after finishing a hard run',
      '- Reading the last forty pages in one sitting',
      '- Being early, on purpose, with a book',
      '- The particular quiet of a Sunday afternoon in a house where nothing is required of you',
    ],
  },

  // ---- three to eight months back ----------------------------------------
  {
    d: 88,
    t: '20:20',
    title: 'It did not survive contact with a Monday',
    body: ['Six days. Better than I expected, worse than I hoped.'],
  },
  {
    d: 94,
    t: '18:00',
    title: 'Last day',
    body: [
      'Packed slowly and left late. The drive back always feels twice as long as the drive out, which cannot be true and always is.',
      'Resolved, on the motorway, to keep one thing from the week. Chose: no phone before the first coffee. Let us see how long that survives contact with a Monday.',
    ],
  },
  {
    d: 95,
    t: '21:30',
    body: [
      'Watched the sun go down over the water and did not photograph it. Small experiment. I remember it better than the ones I did photograph, which is either meaningful or a coincidence.',
    ],
    photo: 'harbor',
  },
  { d: 96, t: '09:05', body: ['Swam before breakfast again. The water was so cold it made me laugh out loud, alone, at seven in the morning.'] },
  {
    d: 97,
    t: '11:20',
    title: 'Four days by the sea',
    body: [
      'A cottage twenty minutes walk from the beach, no wifi, a kettle that took four minutes to boil and that I came to love.',
      'The routine established itself by the second morning without anyone proposing it: swim, breakfast, read, walk, sleep, eat, cards. Nobody checked the time all week.',
    ],
    photo: 'coast',
  },
  { d: 110, t: '12:40', body: ['Bought a plant. Named it. Statistically it has four months.'] },
  {
    d: 118,
    w: 3,
    t: '17:50',
    title: 'A very ordinary Wednesday',
    body: [
      'Nothing happened today and I want to record that, because I suspect I will look back through this and find only the trips and the crises and get the average wrong.',
      'Worked. Ate a decent sandwich. Fixed a thing that had been annoying me for a month in about nine minutes. Walked home. Read.',
      'This is what most of it is. It is fine. It is actually quite good.',
    ],
  },
  { d: 126, t: '23:10', body: ['Walked back to the hotel at midnight through streets still completely awake. Ate something unidentifiable and excellent from a window.'] },
  {
    d: 127,
    t: '08:30',
    title: 'City in a hurry',
    body: [
      'Three days for the conference. The hotel room looked out over a junction that never once, at any hour I checked, was empty.',
      'Good conversations in the corridors and almost nothing useful in the actual sessions, which is apparently the universal law of these things.',
    ],
    photo: 'city-night',
  },
  {
    d: 134,
    t: '19:15',
    body: ['Ran into an old colleague on the platform. Fifteen minutes, entirely pleasant, and I could not for the life of me remember her name. Nodded my way through it like a fraud.'],
  },
  {
    d: 142,
    t: '10:10',
    title: 'Spring cleaning, so-called',
    body: [
      'Threw out: two dead phones, a box of cables for devices I no longer own, a jacket I have not worn in six years but kept because of who I was when I bought it.',
      'Kept: all of the letters, obviously.',
    ],
  },
  { md: '04-02', t: '18:30', body: ['First run in short sleeves. 7k. The light is back in the evenings and everything feels possible again, which is chemical and I do not care.'] },
  {
    d: 160,
    t: '21:45',
    title: 'On being wrong in public',
    body: [
      'Argued a position confidently in the meeting, got shown three numbers, and was straightforwardly wrong.',
      'Twenty years old me would have spent a week on it. Present me said "ah, you are right, let us do it your way", and then thought about it for approximately nine minutes total.',
      'I think this might be the single clearest sign of getting older, and I would not trade it back.',
    ],
  },
  {
    md: '04-18',
    t: '16:20',
    body: ['The blossom came out on the whole street in about four days. Walked to the shop twice for no reason.'],
  },
  {
    d: 185,
    t: '20:00',
    title: 'Two hard weeks',
    body: [
      'I have not written here since the beginning of the month, which is always the tell. When things are difficult the journal is the first thing to go, exactly when it would help most.',
      'It was work, mostly, and a bad cold on top of it, and a stretch where I did not see anyone socially for eleven days and did not notice until Nadia pointed it out.',
      'Better now. Writing it down partly so that next time I recognise the shape of it sooner.',
    ],
  },
  { d: 196, t: '13:00', body: ['Soup. Blanket. Third episode in a row. No notes.'] },
  {
    md: '01-21',
    t: '09:40',
    title: 'Snow, briefly',
    body: [
      'It snowed for about forty minutes this morning and the entire city stopped to look at it, including several people who I am confident have seen snow before.',
      'Gone by eleven. Worth it.',
    ],
  },
  {
    d: 221,
    t: '22:30',
    title: 'The year, counted up',
    body: [
      'Reading back through the last twelve months of this:',
      '- One trip that changed something and three that were just nice',
      '- Roughly 900 kilometres run, most of them the same 6k loop',
      '- Two friendships noticeably deeper, one quietly gone',
      '- Forty-one books, of which maybe five I will remember',
      '- No idea, still, what I want the next five years to look like — and less anxious about that than a year ago',
    ],
  },
  {
    d: 234,
    t: '11:50',
    body: ['Long lunch that turned into a long afternoon. Nobody had anywhere to be. Rare and unrepeatable.'],
  },
  {
    md: '12-06',
    t: '18:40',
    title: 'Winter walking',
    body: [
      'Dark by half four now. Walked the river path anyway with a torch and the whole thing was transformed — the water invisible, just the sound of it, and the bridge lights strung out ahead.',
    ],
    photo: 'rain',
  },
  { md: '02-09', t: '08:45', body: ['Cold enough that the run was really just an argument with myself for the first kilometre. Won it.'] },
  {
    d: 279,
    t: '20:10',
    title: 'A recipe that worked',
    body: [
      'Wrote it down properly this time so I stop reinventing it:',
      '- Onions, low and slow, far longer than feels sensible — forty minutes',
      '- Garlic, chilli, the anchovies (do not skip, nobody will know)',
      '- Tomatoes, then leave it entirely alone for an hour',
      '- Salt at the end, taste twice',
      'Feeds four, or two of us twice, which is the more honest measure.',
    ],
  },
  { d: 294, t: '06:30', body: ['Up before dawn for the light. Worth every minute of the alarm.'] },
  {
    d: 295,
    t: '15:30',
    title: 'The desert, unexpectedly',
    body: [
      'Never thought I would describe a landscape as loud with nothing in it, but there it is. Drove three hours and did not pass a building for the last forty minutes.',
      'The scale does something to you. Everything I had been chewing on for months got noticeably smaller for about a week afterwards.',
    ],
    photo: 'desert',
  },
  {
    d: 312,
    t: '19:55',
    body: ['Learned to make proper pasta by hand. Ruined a batch, ruined a second batch, third one was genuinely good. Kitchen looked like a crime scene.'],
  },
  {
    d: 330,
    t: '17:00',
    title: 'A note on friendship',
    body: [
      'Realised today that the three people I would call at four in the morning I met in three completely different decades and none of them at work.',
      'I do not think there is a lesson in it. I just wanted it written down somewhere.',
    ],
  },

  // ---- last year and before (also feeds "On This Day") -------------------
  {
    yearsAgo: 1,
    t: '19:30',
    title: 'One year ago today',
    body: [
      'Trying something new: writing on the same date each year, so future me gets a straight comparison rather than a vague impression.',
      'Today: work fine, running consistent, sleeping badly, generally optimistic. Worried about money in a low-level background way that never quite resolves into a plan.',
      'Question for next year: did the thing I keep almost starting ever get started?',
    ],
  },
  {
    yearsAgo: 2,
    t: '20:45',
    title: 'Two years ago today: moving day',
    body: [
      'Everything I own fits in a van, which is either liberating or an indictment depending on the hour of the day you ask me.',
      'The flat is still mostly boxes. Ate dinner off a chair. The neighbour brought up a plant and stayed forty minutes and I did not want her to leave.',
      'Everything is unfamiliar in the specific way that is exciting for about three weeks and then simply becomes your life.',
    ],
    photo: 'sunrise',
  },
  {
    yearsAgo: 3,
    t: '13:20',
    body: [
      'Handed in my notice this morning. Hands actually shaking. Walked around the block twice afterwards grinning like a lunatic.',
      'No plan beyond the end of the month, and somehow completely calm about it.',
    ],
  },
  {
    d: 358,
    t: '21:00',
    title: 'Reading the old entries',
    body: [
      'Went back and read the first month of this journal tonight. Cringed steadily throughout, which I am told is the correct and healthy response.',
      'What surprised me is how much I had already forgotten. Not the big things — the small ones. The name of the café. What we argued about. Which week the weather turned.',
      'That is the case for keeping it, right there.',
    ],
  },
  { d: 372, t: '07:50', body: ['Ran the loop in the dark before work. Saw a fox at the corner of the park. We regarded each other. It left first.'] },
  {
    md: '10-12',
    back: 1,
    t: '18:20',
    title: 'Harbour town, October',
    body: [
      'Went for the day with no plan beyond lunch. Ended up on the harbour wall for two hours watching the boats come in and the light go pink over the masts.',
      'Bought fish. Carried it home on the train wrapped in paper, feeling extremely pleased with myself and slightly conspicuous.',
    ],
    photo: 'harbor',
  },
  { d: 405, t: '12:00', body: ['Bad night, worse morning, decent afternoon. Recording the shape of it because the shape repeats.'] },
  {
    d: 428,
    t: '20:30',
    title: 'Started running again',
    body: [
      'Two kilometres and I had to walk twice. Genuinely humbling — a year ago I could do five without thinking about it.',
      'The only way through is the boring way. Three times a week, no heroics, and refuse to compare myself to the version who was already fit.',
    ],
  },
  {
    d: 455,
    t: '16:45',
    body: ['Spent the afternoon in the second-hand bookshop on the corner and left with four books and no memory of choosing any of them.'],
  },
  {
    d: 486,
    t: '09:20',
    title: 'The forest walk, first time',
    body: [
      'Nadia has been telling me to do this walk for a year and a half. She was right, which I have now admitted out loud, in writing, and will not be mentioning again.',
    ],
    photo: 'forest',
  },
  { d: 512, t: '22:20', body: ['Up too late reading. Regret it in advance, on the record, for the sake of consistency.'] },
  {
    d: 548,
    t: '14:10',
    title: 'Saying no',
    body: [
      'Turned down a piece of work today that I would have said yes to a year ago, purely because being asked is flattering.',
      'Spent about an hour drafting the reply, which is fifty-five minutes longer than the reply deserved. Everyone survived.',
    ],
  },
  {
    d: 590,
    t: '19:00',
    title: 'The decision',
    body: [
      'Said yes. After four months of turning it over from every angle, the actual decision took about ninety seconds and felt like putting something heavy down.',
      'I have noticed this before: the deliberation is not what decides it. The deliberation is what makes you ready to admit what you already decided.',
    ],
  },
  {
    md: '03-30',
    back: 1,
    t: '11:15',
    body: ['Sat in the sun on the steps for an hour doing absolutely nothing. First warm day. Everybody in the city had the same idea at the same moment.'],
  },
  {
    d: 1150,
    t: '20:40',
    title: 'The first entry',
    body: [
      'New journal, new attempt. I have started and abandoned six of these. The pattern is always the same: three weeks of diligent, well-written entries, then a gap, then the guilt, then nothing.',
      'So this time the rule is: no rules. A single line counts. Missing a month counts. The only failure is deciding it is too late to pick it up again.',
      '> Write it down or lose it. That is the whole of it.',
    ],
  },
]
