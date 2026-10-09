const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, stopServer, call, newUser, newListing } = require('./helpers');

describe('listings', () => {
  let ctx, owner, other;

  before(async () => {
    ctx = await startServer();
    owner = await newUser(ctx.base, 'Owner');
    other = await newUser(ctx.base, 'Other');
  });
  after(() => stopServer(ctx.server));

  const create = (user, body) =>
    call(ctx.base, '/listings', { method: 'POST', token: user && user.token, body });

  test('creating a listing requires login', async () => {
    const { status } = await create(null, { type: 'tool', title: 'Drill' });
    assert.equal(status, 401);
  });

  test('creates a tool with a trimmed title and a deposit', async () => {
    const { status, data } = await create(owner, {
      type: 'tool',
      title: '  Ladder  ',
      deposit_amount: 300,
      area: 'Hilltop',
    });
    assert.equal(status, 201);
    assert.equal(data.title, 'Ladder');
    assert.equal(data.deposit_amount, 300);
    assert.equal(data.availability, 'available');
  });

  test('skills never carry a deposit', async () => {
    const { status, data } = await create(owner, {
      type: 'skill',
      title: 'Guitar lessons',
      deposit_amount: 400,
    });
    assert.equal(status, 201);
    assert.equal(data.deposit_amount, 0);
  });

  test('rejects invalid input', async () => {
    const cases = [
      { type: 'tool' },
      { type: 'gadget', title: 'Thing' },
      { type: 'tool', title: 'Thing', deposit_amount: -5 },
      { type: 'tool', title: 'Thing', deposit_amount: 2.5 },
      { type: 'tool', title: 'a'.repeat(101) },
    ];
    for (const body of cases) {
      const { status } = await create(owner, body);
      assert.equal(status, 400, `should reject ${JSON.stringify(body).slice(0, 60)}`);
    }
  });

  test('new listings start with no rating', async () => {
    const listing = await newListing(ctx.base, owner.token);
    const { data } = await call(ctx.base, `/listings/${listing.id}`);
    assert.equal(data.avg_rating, null);
    assert.equal(data.review_count, 0);
  });

  test('filters by search text, type, category and area, ignoring case', async () => {
    await newListing(ctx.base, owner.token, {
      title: 'Garden rake',
      category: 'Gardening',
      area: 'Lakeside',
    });
    await newListing(ctx.base, owner.token, {
      type: 'skill',
      title: 'Cooking basics',
      category: 'Cooking',
      area: 'Lakeside',
    });
    await newListing(ctx.base, owner.token, {
      title: 'Hedge trimmer',
      category: 'Gardening',
      area: 'Uptown',
    });

    const byArea = await call(ctx.base, '/listings?area=lakeside');
    assert.equal(byArea.data.length, 2);
    assert.ok(byArea.data.every((l) => l.area === 'Lakeside'));

    const byBoth = await call(ctx.base, '/listings?category=gardening&area=Lakeside');
    assert.equal(byBoth.data.length, 1);
    assert.equal(byBoth.data[0].title, 'Garden rake');

    const byType = await call(ctx.base, '/listings?type=skill&area=lakeside');
    assert.equal(byType.data.length, 1);
    assert.equal(byType.data[0].type, 'skill');

    const byText = await call(ctx.base, '/listings?q=rake');
    assert.equal(byText.data.length, 1);
    assert.equal(byText.data[0].title, 'Garden rake');
  });

  test('filter dropdown data lists categories and areas in use', async () => {
    await newListing(ctx.base, owner.token, { category: 'Metacat', area: 'Metaville' });
    const { data } = await call(ctx.base, '/listings/meta/filters');
    assert.ok(data.categories.includes('Metacat'));
    assert.ok(data.areas.includes('Metaville'));
  });

  test('only the owner can edit or delete a listing', async () => {
    const listing = await newListing(ctx.base, owner.token);

    const edit = await call(ctx.base, `/listings/${listing.id}`, {
      method: 'PUT',
      token: other.token,
      body: { title: 'Hijacked' },
    });
    assert.equal(edit.status, 403);

    const del = await call(ctx.base, `/listings/${listing.id}`, {
      method: 'DELETE',
      token: other.token,
    });
    assert.equal(del.status, 403);

    const still = await call(ctx.base, `/listings/${listing.id}`);
    assert.equal(still.data.title, 'Electric drill');
  });

  test('editing changes only the fields that are sent', async () => {
    const listing = await newListing(ctx.base, owner.token);

    const { status, data } = await call(ctx.base, `/listings/${listing.id}`, {
      method: 'PUT',
      token: owner.token,
      body: { title: 'New title' },
    });
    assert.equal(status, 200);
    assert.equal(data.title, 'New title');
    assert.equal(data.category, 'Tools');
    assert.equal(data.area, 'Riverside');
    assert.equal(data.deposit_amount, 500);

    const blank = await call(ctx.base, `/listings/${listing.id}`, {
      method: 'PUT',
      token: owner.token,
      body: { title: '' },
    });
    assert.equal(blank.status, 400);
  });

  test('returns 404 for an unknown listing', async () => {
    const { status } = await call(ctx.base, '/listings/999999');
    assert.equal(status, 404);
  });

  test('my listings only shows the current user listings', async () => {
    await newListing(ctx.base, owner.token);
    await newListing(ctx.base, other.token, { title: 'Other drill' });

    const { data } = await call(ctx.base, '/listings/mine/list', { token: other.token });
    assert.ok(data.length >= 1);
    assert.ok(data.every((l) => l.owner_id === other.id));
  });
});