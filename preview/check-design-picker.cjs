const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');

const base = 'http://127.0.0.1:8091';
const currentDeepLink = '59327207-543e-496a-bbcb-48bfb9e4aafa';
const olderDeepLink = '17d08239-3997-4c08-98e8-3dc7b3bb038a';
const designName = name => name.replace(/ · (?:R\d+|Praya detail pass)$/, '');

function pickerExpectation(context) {
  const revisionsByDraft = new Map();
  for (const revision of context.revisions) {
    if (!revisionsByDraft.has(revision.draftId)) revisionsByDraft.set(revision.draftId, []);
    revisionsByDraft.get(revision.draftId).push(revision.createdAt);
  }
  const touchedAt = draft => [draft.createdAt || '', ...(revisionsByDraft.get(draft.id) || [])].sort().at(-1) || '';
  const byId = new Map(context.drafts.map(draft => [draft.id, draft]));
  const seen = new Set();
  const current = [
    ...[...context.revisions]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(revision => byId.get(revision.draftId))
      .filter(Boolean),
    ...context.drafts
  ].filter(draft => {
    if (seen.has(draft.project)) return false;
    seen.add(draft.project);
    return true;
  }).sort((a, b) => touchedAt(b).localeCompare(touchedAt(a)) || designName(a.name).localeCompare(designName(b.name)));

  const recent = current.slice(0, 4);
  const siteName = id => context.sites.find(site => site.id === id)?.name || 'Unknown site';
  const bySite = new Map();
  for (const draft of current.slice(recent.length)) {
    const key = draft.siteId || '';
    if (!bySite.has(key)) bySite.set(key, []);
    bySite.get(key).push(draft);
  }
  const groups = [
    { label: 'Recent', ids: recent.map(draft => draft.id) },
    ...[...bySite.entries()]
      .sort((a, b) => (a[0] ? 0 : 1) - (b[0] ? 0 : 1) || siteName(a[0]).localeCompare(siteName(b[0])))
      .map(([siteId, drafts]) => ({
        label: siteId ? siteName(siteId) : 'Studies without a site',
        ids: drafts.map(draft => draft.id)
      }))
  ];
  const currentIds = new Set(current.map(draft => draft.id));
  const earlier = context.drafts
    .filter(draft => !currentIds.has(draft.id))
    .sort((a, b) => touchedAt(b).localeCompare(touchedAt(a)))
    .map(draft => draft.id);
  return { current, groups, earlier };
}

async function pickerGroups(page) {
  return page.locator('#draft-select optgroup').evaluateAll(groups => groups.map(group => ({
    label: group.label,
    ids: [...group.querySelectorAll('option')].map(option => option.value),
    labels: [...group.querySelectorAll('option')].map(option => option.textContent)
  })));
}

(async () => {
  const browser = await chromium.launch({
    channel: process.env.CHROMIUM_PATH ? undefined : 'msedge',
    executablePath: process.env.CHROMIUM_PATH,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1000, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));

    await page.goto(`${base}/studio?draft=${currentDeepLink}`);
    await page.waitForFunction(() => window.studioStatus?.().ready);
    const context = await (await fetch(`${base}/api/workspace/context`)).json();
    const expected = pickerExpectation(context);
    assert.equal(await page.locator('#draft-select option').count(), expected.current.length + 1);
    assert.equal(await page.locator('#draft-title').textContent(), 'Stepped garden apartments');
    assert.equal(await page.locator('#draft-select').inputValue(), currentDeepLink);

    const currentGroups = await pickerGroups(page);
    assert.deepEqual(
      currentGroups.map(group => ({ label: group.label, ids: group.ids })),
      expected.groups
    );
    assert.equal(currentGroups[0].ids.length, Math.min(4, expected.current.length));
    assert.ok(currentGroups.flatMap(group => group.labels).every(label => !/(?:Claude|Astra|Operator)/.test(label)));

    await page.locator('#draft-history').click();
    assert.equal(await page.locator('#draft-select option').count(), context.drafts.length + 1);
    const allGroups = await pickerGroups(page);
    assert.deepEqual(
      allGroups.slice(0, -1).map(group => ({ label: group.label, ids: group.ids })),
      expected.groups
    );
    assert.equal(allGroups.at(-1).label, 'Earlier versions and working drafts');
    assert.deepEqual(allGroups.at(-1).ids, expected.earlier);

    await page.locator('#draft-history').click();
    await page.goto(`${base}/studio?draft=${olderDeepLink}`);
    await page.waitForFunction(() => window.studioStatus?.().ready);
    assert.equal(await page.locator('#draft-select').inputValue(), olderDeepLink);
    const olderOption = page.locator('#draft-select option:checked');
    assert.match(await olderOption.textContent(), /currently open/);
    assert.equal(await olderOption.evaluate(option => option.parentElement.tagName), 'SELECT');
    assert.equal(await page.locator('#draft-select option').count(), expected.current.length + 2);
    assert.deepEqual(errors, []);
    console.log(
      `PASS ${context.drafts.length} drafts grouped into ${expected.current.length} current designs; ` +
      `${expected.groups.length} groups and ${expected.earlier.length} earlier drafts ordered exactly; ` +
      'clean title, all-drafts access, older deep link retained'
    );
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
