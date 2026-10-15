import { db, id, now, run } from './db.js';
import { hashPassword } from './auth.js';
import { ASSUMPTIONS } from './config.js';

const ART_KEY: Record<string, string> = {
  Environment: 'environment', Health: 'health', Science: 'science', Education: 'education', 'Public Policy': 'policy',
  'Economic Policy': 'economy', Community: 'community', 'Arts & Culture': 'arts', Business: 'business', Other: 'other',
};
/** Seed imagery is in-app category art (the app renders "art:<key>"), so demo data always matches its topic. */
const art = (category: string) => `art:${ART_KEY[category] ?? 'other'}`;
const img = (seed: string, _w = 900, _h = 600) => `https://picsum.photos/seed/${seed}/900/600`; // only for the review-queue sample
const day = 86_400_000;
const ago = (d: number) => new Date(Date.now() - d * day).toISOString();
const ahead = (d: number) => new Date(Date.now() + d * day).toISOString();

type Seed = {
  key: string; title: string; category: string; creator: string; type: string; summary: string;
  goal: number; raised: number; backers: number; status: string; publishedDaysAgo?: number; deadlineIn?: number;
  headline: string; intro: string; paras: string[]; stats: [string, string][]; sources: [string, string][];
  actions: string[]; locations: string[]; interests: string[]; channels: string[]; owner?: string; note?: string;
};

const CAMPAIGNS: Seed[] = [
  {
    key: 'coastal', title: 'Why Mangrove Belts Are Our Cheapest Storm Defence', category: 'Environment', creator: 'Coastal Futures Trust', type: 'Nonprofit',
    summary: 'Restored mangroves cut wave energy by up to 66%. Most coastal planners have never seen the evidence.', goal: 800_000, raised: 524_000, backers: 312, status: 'funding', publishedDaysAgo: 9, deadlineIn: 21,
    headline: 'The wall that grows back', intro: 'When storms hit coastlines with healthy mangroves, the damage is measurably lower. Yet coastal budgets still favour concrete. This campaign puts the research in front of the people who vote on those budgets.',
    paras: ['Mangrove forests slow storm surge and absorb wave energy. A review of field measurements found that a 100-metre belt can reduce wave height by more than half.', 'Concrete sea walls cost far more per kilometre to build and maintain, and they do nothing for fisheries or carbon storage. Mangroves do both.', 'The aim is simple: get the evidence in front of more local residents and council members before the next budget cycle.'],
    stats: [['66%', 'wave energy reduction'], ['5×', 'cheaper than sea walls'], ['10 yrs', 'to maturity']],
    sources: [['Menéndez et al., Global flood protection benefits of mangroves (Scientific Reports)', 'https://www.nature.com/articles/s41598-020-61136-6'], ['IUCN: Mangroves and coastal protection', 'https://www.iucn.org/']],
    actions: ['Ask your council about natural coastal defences', 'Share with a neighbour who lives near the coast'], locations: ['United States', 'Philippines', 'India'], interests: ['Environment', 'Climate', 'Local government'], channels: ['Meta (Facebook & Instagram)', 'YouTube'],
  },
  {
    key: 'sleep', title: 'Teenagers Need Later School Start Times', category: 'Health', creator: 'Dr. Priya Raman', type: 'Individual',
    summary: 'Decades of sleep research point one way. This campaign brings it to parents deciding at school board meetings.', goal: 300_000, raised: 301_500, backers: 188, status: 'goal_reached', publishedDaysAgo: 24, deadlineIn: 6,
    headline: 'Eight hours is biology, not laziness', intro: 'Adolescent body clocks shift later during puberty. Starting school before 8:30 a.m. means many teens are awake against their biology every single morning.',
    paras: ['Schools that moved start times later report longer sleep, better attendance and fewer car accidents among teen drivers.', 'The policy decisions are made locally, and most parents never see the data that informs them.'],
    stats: [['+34 min', 'avg. extra sleep'], ['16%', 'fewer teen crashes']], sources: [['AAP Policy Statement: School Start Times for Adolescents', 'https://publications.aap.org/pediatrics/article/134/3/642/32500'], ['CDC: School Start Times and Sleep', 'https://www.cdc.gov/healthyschools/sleep.htm']],
    actions: ['Look up your district\'s start time', 'Bring the AAP statement to the next school board meeting'], locations: ['United States'], interests: ['Parenting', 'Education', 'Health'], channels: ['Meta (Facebook & Instagram)'],
  },
  {
    key: 'literacy', title: 'Teach Every Child to Read by Eight', category: 'Education', creator: 'ReadTogether Network', type: 'Nonprofit',
    summary: 'Structured literacy works. A short explainer for teachers and parents about what the evidence recommends.', goal: 450_000, raised: 168_000, backers: 97, status: 'funding', publishedDaysAgo: 5, deadlineIn: 25,
    headline: 'What reading science actually says', intro: 'Reading is not learned naturally the way speech is. Explicit, sequenced instruction in sounds and letters helps most children, and is essential for some.',
    paras: ['Many classrooms still rely on guessing from pictures or context. Research shows systematic phonics instruction is more reliable.', 'This campaign shares a plain-language summary and a free classroom checklist.'],
    stats: [['95%', 'of children can learn to read with good instruction']], sources: [['National Reading Panel Report', 'https://www.nichd.nih.gov/research/supported/nrp']],
    actions: ['Download the classroom checklist', 'Ask your school how it teaches phonics'], locations: ['United States', 'United Kingdom'], interests: ['Teaching', 'Parenting'], channels: ['Meta (Facebook & Instagram)', 'Google Display'],
  },
  {
    key: 'transit', title: 'Fund Frequent Buses, Not Just New Lines', category: 'Public Policy', creator: 'Riders Alliance Collective', type: 'Community group',
    summary: 'Frequency drives ridership more than coverage does. A visual guide for voters on the upcoming transit levy.', goal: 600_000, raised: 90_000, backers: 41, status: 'funding', publishedDaysAgo: 3, deadlineIn: 27,
    headline: 'If it comes every ten minutes, you just go', intro: 'People ride transit that shows up often. Cities that raised frequency on existing routes saw ridership gains faster than cities building new lines.',
    paras: ['A route that runs every 30 minutes forces riders to plan their day around a timetable. Every 10 minutes, they simply go.', 'The upcoming levy decides how the next decade of transit money is split.'],
    stats: [['10 min', 'frequency threshold'], ['+23%', 'ridership after redesigns']], sources: [['Transit Cooperative Research Program, Report 165', 'https://www.trb.org/Main/Blurbs/169437.aspx']],
    actions: ['Check the levy language on your ballot', 'Share with a neighbour who rides the bus'], locations: ['Seattle, WA', 'Portland, OR'], interests: ['Transit', 'Local politics'], channels: ['Meta (Facebook & Instagram)', 'X (Twitter)'],
  },
  {
    key: 'housing', title: 'What Building More Homes Does to Rents', category: 'Economic Policy', creator: 'Open Housing Lab', type: 'Organization',
    summary: 'Studies from several cities find new supply slows rent growth nearby. The case, with the caveats, in plain English.', goal: 500_000, raised: 212_500, backers: 129, status: 'funding', publishedDaysAgo: 12, deadlineIn: 18,
    headline: 'Supply and rent, with the caveats', intro: 'The research is not simple, but it is consistent: new housing tends to moderate rents nearby. This campaign explains the findings and where the evidence is weaker.',
    paras: ['Studies of new buildings in Helsinki, Minneapolis and New York found rents in nearby units grew more slowly.', 'The effects are local and gradual. We lay out what the evidence does and doesn\'t show.'],
    stats: [['5–7%', 'lower nearby rents (study range)']], sources: [['Asquith, Mast & Reed: Local Effects of Large New Apartment Buildings', 'https://www.upjohn.org/research-highlights/local-effects-large-new-apartment-buildings-low-income-areas']],
    actions: ['Read the full summary', 'Share with a local planning commissioner'], locations: ['United States'], interests: ['Housing', 'Economics'], channels: ['Meta (Facebook & Instagram)', 'Google Display'],
  },
  {
    key: 'quantum', title: 'What a Quantum Computer Can (and Can\'t) Do', category: 'Science', creator: 'Northfield Physics Outreach', type: 'Organization',
    summary: 'Cut through the hype: a clear 3-minute explainer from working physicists, aimed at curious non-experts.', goal: 250_000, raised: 250_000, backers: 204, status: 'promoting', publishedDaysAgo: 40, deadlineIn: -10,
    headline: 'Powerful, but not magic', intro: 'Quantum computers will be extraordinary at a narrow set of problems and unremarkable at most others. Understanding the difference matters for policy and investment.',
    paras: ['They do not simply try every answer at once. Useful algorithms rely on carefully engineered interference.', 'Near-term machines are noisy and small. Honest expectations help everyone.'],
    stats: [['~1,000', 'noisy physical qubits today']], sources: [['Preskill, Quantum Computing in the NISQ era and beyond', 'https://quantum-journal.org/papers/q-2018-08-06-79/']],
    actions: ['Watch the 3-minute explainer', 'Send it to someone who asks about quantum'], locations: ['United States', 'Canada', 'United Kingdom'], interests: ['Science', 'Technology'], channels: ['YouTube', 'Meta (Facebook & Instagram)'],
  },
  {
    key: 'muralists', title: 'Save the Neighbourhood Mural Trail', category: 'Arts & Culture', creator: 'Eastside Arts Collective', type: 'Community group',
    summary: 'Forty murals, fifteen artists, one funding gap. Help more neighbours discover the trail before the festival.', goal: 150_000, raised: 61_000, backers: 76, status: 'funding', publishedDaysAgo: 7, deadlineIn: 14,
    headline: 'A free gallery, two miles long', intro: 'The Eastside Mural Trail is a self-guided walk through forty works by local artists. Most people in the city have never heard of it.',
    paras: ['Walking the trail takes about 90 minutes and costs nothing.', 'The festival in spring is our best chance to bring in new visitors and commissions.'],
    stats: [['40', 'murals'], ['15', 'local artists']], sources: [['City Arts Council: Public Art Inventory', 'https://www.nea.gov/']],
    actions: ['Plan a visit', 'Share with a friend who loves street art'], locations: ['Austin, TX'], interests: ['Art', 'Local events'], channels: ['Meta (Facebook & Instagram)'],
  },
  {
    key: 'smallshops', title: 'Why Buying Local Keeps More Money in Town', category: 'Business', creator: 'Main Street Merchants Guild', type: 'Business',
    summary: 'A fair look at the local multiplier effect, and how to measure it for your own street.', goal: 200_000, raised: 38_000, backers: 22, status: 'funding', publishedDaysAgo: 2, deadlineIn: 28,
    headline: 'Where your dollar travels', intro: 'Money spent at locally owned businesses tends to recirculate more locally than money spent at national chains. How much more depends on the town.',
    paras: ['Independent studies give a range, not one magic number.', 'We share a simple worksheet any shop can use to estimate its own local impact.'],
    stats: [['48¢', 'vs 14¢ recirculated per $1 (one study)']], sources: [['Civic Economics: Indie Impact Studies', 'https://www.civiceconomics.com/']],
    actions: ['Download the worksheet', 'Pick one local purchase this week'], locations: ['United States'], interests: ['Small business', 'Shopping local'], channels: ['Meta (Facebook & Instagram)', 'Google Display'],
  },
  {
    key: 'foodbank', title: 'Neighbours Feeding Neighbours: Volunteer Drivers Needed', category: 'Community', creator: 'Riverside Community Pantry', type: 'Nonprofit',
    summary: 'We deliver groceries to housebound seniors. We need more people to hear we exist. Both drivers and recipients.', goal: 100_000, raised: 100_000, backers: 143, status: 'completed', publishedDaysAgo: 70, deadlineIn: -40,
    headline: 'Fifteen minutes can feed a week', intro: 'Every Saturday, volunteers deliver groceries to about 200 housebound seniors. Many more qualify but have not heard of the service.',
    paras: ['This campaign reached residents who do not follow our page.', 'The final report is available below.'],
    stats: [['200', 'weekly deliveries']], sources: [['Meals on Wheels America: Senior Hunger Facts', 'https://www.mealsonwheelsamerica.org/']],
    actions: ['Sign up to drive', 'Tell an older neighbour'], locations: ['Riverside, CA'], interests: ['Volunteering', 'Seniors'], channels: ['Meta (Facebook & Instagram)'],
  },
  {
    key: 'privacy', title: 'Understanding Your Data Rights in Plain English', category: 'Other', creator: 'Clear Terms Project', type: 'Organization',
    summary: 'You can ask companies what data they hold on you, and delete it. Here is how, step by step.', goal: 180_000, raised: 74_000, backers: 58, status: 'funding', publishedDaysAgo: 28, deadlineIn: 2,
    headline: 'Ask. They have to answer.', intro: 'Many people have legal rights to access and delete their personal data. Few know how to use them.',
    paras: ['Rights vary by region, but the request process is similar everywhere.', 'We provide templates and a short checklist.'],
    stats: [['30 days', 'typical response window']], sources: [['GDPR.eu: Right of access', 'https://gdpr.eu/right-of-access/']],
    actions: ['Send one request this week'], locations: ['United Kingdom', 'European Union', 'California'], interests: ['Privacy', 'Technology'], channels: ['Meta (Facebook & Instagram)', 'X (Twitter)'],
  },
];

export function seed() {
  const uid = (key: string) => `u-${key}`;
  const users: [string, string, string, string][] = [
    [uid('demo'), 'demo@amplify.demo', 'Alex Morgan', 'user'],
    [uid('admin'), 'admin@amplify.demo', 'Reviewer Team', 'admin'],
    [uid('creator'), 'creator@amplify.demo', 'Jordan Lee', 'user'],
    [uid('backer'), 'backer@amplify.demo', 'Sam Rivera', 'user'],
  ];
  for (const [i, email, name, role] of users)
    run('INSERT OR IGNORE INTO users (id,email,name,password_hash,role,created_at) VALUES (?,?,?,?,?,?)', i, email, name, hashPassword('demo1234'), role, now());

  for (const s of CAMPAIGNS) {
    const cid = `c-${s.key}`;
    const sections = s.paras.flatMap((t, i) => [
      ...(i === 0 ? [{ id: `${cid}-h`, type: 'heading', text: s.headline }] : []),
      { id: `${cid}-p${i}`, type: 'paragraph', text: t },
      ...(i === 0 ? [{ id: `${cid}-i`, type: 'image', text: '', imageUrl: art(s.category), caption: 'Illustration (demo image).', credit: 'Amplify' }] : []),
    ]);
    const story = { headline: s.headline, intro: s.intro, sections, stats: s.stats.map(([value, label]) => ({ value, label })), sources: s.sources.map(([title, url]) => ({ title, url })), actions: s.actions };
    const visuals = { adImages: [art(s.category), art(s.category)], headline: s.title.slice(0, 40), description: s.summary.slice(0, 120), cta: 'Learn more' };
    const reach = { locations: s.locations, interests: s.interests, channels: s.channels, durationDays: 21 };
    const published = ago(s.publishedDaysAgo ?? 1);
    run(`INSERT INTO campaigns (id,owner_id,status,step,title,category,creator_name,creator_type,summary,cover_image,story,visuals,reach,goal_cents,raised_cents,backers_count,submitted_at,published_at,deadline,created_at,updated_at)
         VALUES (?,?,?,5,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      cid, uid('creator'), s.status, s.title, s.category, s.creator, s.type, s.summary, art(s.category), JSON.stringify(story), JSON.stringify(visuals), JSON.stringify(reach),
      s.goal, s.raised, s.backers, ago((s.publishedDaysAgo ?? 1) + 2), published, ahead(s.deadlineIn ?? 20), ago((s.publishedDaysAgo ?? 1) + 5), published);

    if (s.status === 'promoting' || s.status === 'completed') {
      const budget = s.raised - Math.round(s.raised * ASSUMPTIONS.platformFeePct / 100);
      const done = s.status === 'completed';
      const spend = done ? budget : Math.round(budget * 0.55);
      const impressions = Math.round((spend / ASSUMPTIONS.cpmCents) * 1000 * 1.03);
      run('INSERT INTO reports (campaign_id,ad_spend_cents,impressions,measured_reach,clicks,final,updated_at) VALUES (?,?,?,?,?,?,?)',
        cid, spend, impressions, Math.round(impressions / ASSUMPTIONS.avgFrequency), Math.round(impressions * 0.014), done ? 1 : 0, now());
    }
    run('INSERT INTO updates (id,campaign_id,title,body,created_at) VALUES (?,?,?,?,?)', id(), cid, 'Campaign is live', 'Thank you for helping this message travel further. We will post progress here.', published);
  }
  // A mid-flight creator draft & one awaiting review so every dashboard tab has content.
  run(`INSERT INTO campaigns (id,owner_id,status,step,title,category,creator_name,summary,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)`,
    'c-draft', uid('creator'), 'draft', 2, 'Community Solar for Renters', 'Environment', 'Jordan Lee', 'Renters can share in solar savings too. Here is how community solar works.', ago(2), ago(1));
  run(`INSERT INTO campaigns (id,owner_id,status,step,title,category,creator_name,summary,cover_image,story,visuals,reach,goal_cents,submitted_at,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    'c-review', uid('creator'), 'submitted', 5, 'Free Tax Filing Exists. Here\'s Who Qualifies', 'Economic Policy', 'Jordan Lee',
    'Millions of households qualify for free tax filing and never use it. A short eligibility guide.', art('Economic Policy'),
    JSON.stringify({ headline: 'Free means free', intro: 'Many households qualify for free tax-filing programs and still pay for software. Here is how to check in five minutes.', sections: [{ id: 'a', type: 'paragraph', text: 'Eligibility depends on income and filing status.' }], stats: [], sources: [{ title: 'IRS Free File', url: 'https://www.irs.gov/filing/free-file-do-your-federal-taxes-for-free' }], actions: ['Check eligibility'] }),
    JSON.stringify({ adImages: [art('Economic Policy')], headline: 'Free tax filing exists', description: 'Check whether you qualify in 5 minutes.', cta: 'Learn more' }),
    JSON.stringify({ locations: ['United States'], interests: ['Personal finance'], channels: ['Meta (Facebook & Instagram)'], durationDays: 21 }), 120_000, ago(1), ago(3), ago(1));
  run(`INSERT INTO audit_log (id,campaign_id,actor_id,action,to_status,created_at) VALUES (?,?,?,?,?,?)`, id(), 'c-review', uid('creator'), 'submitted', 'submitted', ago(1));

  // A little conversation on one campaign, plus one reported comment for the moderation demo.
  const cm = (cid: string, user: string, body: string, d: number, parent?: string) => { const i = id(); run('INSERT INTO comments (id,campaign_id,user_id,parent_id,body,created_at) VALUES (?,?,?,?,?,?)', i, cid, uid(user), parent ?? null, body, ago(d)); return i; };
  const c1 = cm('c-coastal', 'backer', 'Is there data for tropical vs temperate coastlines? Would love to see that split.', 3);
  cm('c-coastal', 'creator', 'Good question. The Menéndez study covers both, and we added a note to the sources.', 2.5, c1);
  const spam = cm('c-coastal', 'backer', 'Great campaign, check my other work for more.', 1);
  run('INSERT INTO comment_reports (id,comment_id,user_id,reason,created_at) VALUES (?,?,?,?,?)', id(), spam, uid('demo'), 'spam', now());
  // Demo backer's history.
  const hist: [string, number, string][] = [['c-coastal', 2500, 'succeeded'], ['c-quantum', 1000, 'succeeded'], ['c-sleep', 5000, 'succeeded']];
  for (const [cid, amount, status] of hist) {
    run(`INSERT INTO contributions (id,campaign_id,user_id,amount_cents,platform_fee_cents,processing_fee_cents,total_cents,status,public,receipt_no,created_at) VALUES (?,?,?,?,?,?,?,?,0,?,?)`,
      id(), cid, uid('demo'), amount, Math.round(amount * 0.1), Math.round(amount * 0.029 + 30), amount + Math.round(amount * 0.029 + 30), status, 'RCP-' + id().slice(0, 8).toUpperCase(), ago(6));
  }
  run(`INSERT INTO follows (user_id,campaign_id,kind) VALUES (?,?,?)`, uid('demo'), 'c-transit', 'save');
  run(`INSERT INTO follows (user_id,campaign_id,kind) VALUES (?,?,?)`, uid('demo'), 'c-coastal', 'follow');

  const n = (u: string, kind: string, title: string, body: string, cid: string, read = 0, d = 1) =>
    run('INSERT INTO notifications (id,user_id,kind,title,body,campaign_id,read,created_at) VALUES (?,?,?,?,?,?,?,?)', id(), u, kind, title, body, cid, read, ago(d));
  n(uid('demo'), 'funding', 'Halfway there', '"Why Mangrove Belts Are Our Cheapest Storm Defence" has reached 50% of its goal.', 'c-coastal', 0, 0.2);
  n(uid('demo'), 'promotion', 'Promotion has begun', 'Ads for "What a Quantum Computer Can (and Can\'t) Do" are now running.', 'c-quantum', 0, 1);
  n(uid('demo'), 'contribution', 'Contribution successful', '$27.50 paid toward promoting "Teenagers Need Later School Start Times".', 'c-sleep', 1, 6);
  n(uid('creator'), 'review', 'Submission received', '"Free Tax Filing Exists. Here\'s Who Qualifies" is in the review queue.', 'c-review', 0, 1);
  n(uid('creator'), 'funding', 'Goal reached', '"Teenagers Need Later School Start Times" is fully funded. Promotion hasn\'t started yet.', 'c-sleep', 0, 0.5);
  console.log('Seeded demo data.');
}

if (process.argv.includes('--reset')) {
  for (const t of ['feedback', 'reports', 'audit_log', 'updates', 'follows', 'notifications', 'contributions', 'campaigns', 'users']) db.exec(`DELETE FROM ${t}`);
  seed();
}
