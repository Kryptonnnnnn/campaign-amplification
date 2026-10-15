import React from 'react';
import { Linking, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, EmptyState, Expandable, Header, Notice, Txt } from '../../src/components/ui';
import { colors, space } from '../../src/theme';

type Block = { h?: string; p?: string; faq?: [string, string][]; note?: string; cta?: { label: string; href: string } };
const PAGES: Record<string, { title: string; intro: string; blocks: Block[] }> = {
  'how-it-works': {
    title: 'How it works', intro: 'Amplify helps important messages reach people beyond the creator’s own followers, paid for by a community of backers.',
    blocks: [
      { h: '1. Create', p: 'A creator writes a campaign in five steps: Basics, Story, Visuals, Reach and Submit. They add sources, ad images and the audience they want to reach, and they set their own funding goal.' },
      { h: '2. Review', p: 'Every campaign is reviewed before it can be backed. Reviewers check the story, sources, images and targeting against our community guidelines. They can approve, ask for changes, or decline.' },
      { h: '3. Amplify', p: 'Approved campaigns open for backing for 30 days. Backers pool contributions toward ad costs. When funding closes, we confirm payments and ad setup, then run the ads and publish a report.' },
      { note: 'Not a donation: a contribution pays for advertising that spreads a message. It is not a gift to the person, cause or organization in the message.' },
      { h: 'What do fees cover?', p: 'A 10% platform fee covers review, ad operations and reporting. The remaining 90% of each contribution is spent on that campaign’s advertising. A small payment-processing fee is added at checkout.' },
      { h: 'How is reach estimated?', p: 'We use demo assumptions about ad prices and how often people see an ad. The result is an estimate, not a promise. Final reports show measured delivery separately.' },
    ],
  },
  about: { title: 'About', intro: 'We believe good ideas shouldn’t depend on who already has a big audience.', blocks: [
    { p: 'Amplify is a community-funded advertising platform. Individuals, nonprofits, organizations and businesses can put a message in front of more people, and anyone can help pay for that reach.' },
    { p: 'We focus on clarity and trust: visible sources, transparent fees, honest estimates, and human review before anything is advertised.' },
    { note: 'This app is a hackathon prototype. Campaigns, figures and payments shown are demonstration data.' } ] },
  partners: { title: 'Partners', intro: 'Where ads run once a campaign is approved and funded.', blocks: [
    { h: 'Distribution partners', p: 'Meta (Facebook & Instagram), Google Display, YouTube and X (Twitter) are the channels creators can choose from. In this prototype delivery is simulated.' },
    { h: 'Review partners', p: 'Independent fact-checking and nonprofit review partners may be added later. We won’t claim independent verification for a campaign unless that process has actually taken place.' },
    { h: 'Become a partner', p: 'Interested in distributing campaigns, supporting review, or sponsoring reach for a cause area?', cta: { label: 'Contact us', href: '/info/contact' } } ] },
  faqs: { title: 'FAQs', intro: 'Quick answers to common questions.', blocks: [{ faq: [
    ['Is this a donation?', 'No. Your contribution pays for advertising that spreads the campaign’s message. It does not go to the creator, the cause or the organization.'],
    ['Do I need an account to browse?', 'No. Browse, read stories and check sources as a guest. You can even back a campaign as a guest with just an email for the receipt.'],
    ['What happens if the goal isn’t reached?', 'We decide whether a smaller campaign can still run well. If not, contributions are refunded.'],
    ['Does reaching the goal start the ads?', 'Not automatically. Ads start after approval, settled payments and ad setup checks are complete.'],
    ['Can the creator edit after it’s live?', 'Published content is locked. Material changes go back through review before advertising is updated.'],
    ['Is my name public when I back?', 'No. Backers are anonymous by default. You can choose to show your name at checkout. Payment records are always kept accurately.'],
    ['How accurate are reach numbers?', 'They’re estimates from demo assumptions. Actual reach depends on ad inventory, prices, targeting and performance. Final reports show what was measured.'],
  ] }] },
  help: { title: 'Help', intro: 'Stuck? Start here.', blocks: [
    { h: 'Creating a campaign', p: 'Your work saves automatically. Leave anytime and resume from the Create tab. Required fields are marked with a red asterisk.' },
    { h: 'Backing a campaign', p: 'Open a campaign, tap Back This Campaign, choose an amount, review the fees and pay. In this prototype use test card 4242 4242 4242 4242.' },
    { h: 'Something looks wrong?', p: 'Pull down on any list to refresh. If a screen says it can’t reach the server, check your connection or the server address in Account settings.' },
    { cta: { label: 'Read the FAQs', href: '/info/faqs' } }, { cta: { label: 'Contact us', href: '/info/contact' } } ] },
  contact: { title: 'Contact', intro: 'We’d love to hear from you.', blocks: [
    { h: 'Support', p: 'support@amplify.example. We reply within two business days.' },
    { h: 'Report a campaign', p: 'If you see a campaign that breaks the community guidelines, email report@amplify.example with the campaign title.' },
    { h: 'Partnerships', p: 'partners@amplify.example' },
    { note: 'These are placeholder addresses for the prototype.' } ] },
  terms: { title: 'Terms', intro: 'Plain-language summary for the prototype. Not legal advice.', blocks: [
    { h: 'What you’re paying for', p: 'Contributions fund advertising to distribute a campaign’s message. They are not donations, investments or purchases of goods.' },
    { h: 'Creators', p: 'You must own or have rights to everything you submit, cite accurate sources, and follow the community guidelines. We may decline or remove campaigns.' },
    { h: 'Fees and refunds', p: 'A 10% platform fee and a payment-processing fee apply. Contributions are refunded if a campaign can’t be promoted, and unspent advertising budget is returned proportionally.' },
    { h: 'No guarantees', p: 'We estimate reach but cannot guarantee an audience size, clicks or any outcome.' } ] },
  privacy: { title: 'Privacy', intro: 'What we collect and why.', blocks: [
    { h: 'What we collect', p: 'Account name and email, campaigns you create, and payment records for contributions. Guest backers provide only an email for a receipt.' },
    { h: 'Public information', p: 'Backers are anonymous by default. Only creators’ campaign content is public.' },
    { h: 'Advertising', p: 'Ads use the platforms’ standard audience tools. We never receive personal data about the people who see an ad, only aggregate delivery figures.' },
    { h: 'Your controls', p: 'You can edit your name, change notification preferences, and request account deletion by contacting support.' },
    { note: 'Card numbers are never stored. Checkout in this prototype is simulated.' } ] },
  'community-guidelines': { title: 'Community guidelines', intro: 'What we review campaigns against.', blocks: [
    { h: 'Be honest', p: 'Claims should be supported by credible, linkable sources. Don’t mislead with selective statistics or fake endorsements.' },
    { h: 'Be respectful', p: 'No hate, harassment, threats or targeting people by sensitive characteristics.' },
    { h: 'Be clear about who you are', p: 'Say who is behind the message. Disclose financial or organizational interests.' },
    { h: 'Not allowed', p: 'Illegal activity, scams, dangerous misinformation (for example medical or election misinformation), impersonation, and content you don’t have rights to.' },
    { h: 'How review works', p: 'Reviewers can approve, request changes with specific notes, or decline. Every decision is logged. Review is a rules check. It is not independent verification that every claim is true.' } ] },
};

export default function Info() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const page = PAGES[slug ?? ''];
  if (!page) return <View style={{ flex: 1, backgroundColor: colors.bg }}><Header title="Not found" /><EmptyState icon="help-circle-outline" title="Page not found" body="We couldn’t find that page." action="Go home" onAction={() => router.replace('/')} /></View>;
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title={page.title} />
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: space.xxl }}>
        <Txt v="h1">{page.title}</Txt>
        <Txt color={colors.muted}>{page.intro}</Txt>
        {page.blocks.map((b, i) => (
          <View key={i} style={{ gap: space.sm }}>
            {b.h && <Txt v="h2">{b.h}</Txt>}
            {b.p && <Txt>{b.p}</Txt>}
            {b.faq && <View style={{ gap: space.sm }}>{b.faq.map(([q, a]) => <Expandable key={q} title={q}><Txt v="small">{a}</Txt></Expandable>)}</View>}
            {b.note && <Notice tone="warning" title="Important">{b.note}</Notice>}
            {b.cta && <Button kind="secondary" title={b.cta.label} onPress={() => (b.cta!.href.startsWith('/') ? router.push(b.cta!.href as never) : Linking.openURL(b.cta!.href))} />}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
