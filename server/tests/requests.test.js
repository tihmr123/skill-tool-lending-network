const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, stopServer, call, newUser, newListing } = require('./helpers');

let ctx;

before(async () => {
  ctx = await startServer();
});
after(() => stopServer(ctx.server));

async function setup(overrides = {}) {
  const owner = await newUser(ctx.base, 'Owner');
  const borrower = await newUser(ctx.base, 'Borrower');
  const listing = await newListing(ctx.base, owner.token, overrides);
  return { owner, borrower, listing };
}

const ask = (user, listing, message) =>
  call(ctx.base, '/requests', {
    method: 'POST',
    token: user.token,
    body: { listing_id: listing.id, message },
  });

const respond = (user, requestId, status, extra = {}) =>
  call(ctx.base, `/requests/${requestId}`, {
    method: 'PUT',
    token: user.token,
    body: { status, ...extra },
  });

const setAvailability = (owner, listing, availability) =>
  call(ctx.base, `/listings/${listing.id}`, {
    method: 'PUT',
    token: owner.token,
    body: { availability },
  });

const availabilityOf = async (listing) =>
  (await call(ctx.base, `/listings/${listing.id}`)).data.availability;

describe('booking rules', () => {
  test('owners cannot request their own listing', async () => {
    const { owner, listing } = await setup();
    const { status } = await ask(owner, listing);
    assert.equal(status, 400);
  });

  test('blocks duplicate active requests', async () => {
    const { borrower, listing } = await setup();
    assert.equal((await ask(borrower, listing)).status, 201);
    assert.equal((await ask(borrower, listing)).status, 409);
  });

  test('cannot request a listing that is unavailable', async () => {
    const { owner, borrower, listing } = await setup();
    await setAvailability(owner, listing, 'unavailable');
    const { status } = await ask(borrower, listing);
    assert.equal(status, 400);
  });

  test('accepting a tool marks it unavailable and declines other pending requests', async () => {
    const { owner, borrower, listing } = await setup();
    const third = await newUser(ctx.base, 'Third');
    const first = await ask(borrower, listing);
    const second = await ask(third, listing);

    const accepted = await respond(owner, first.data.id, 'accepted');
    assert.equal(accepted.status, 200);
    assert.equal(await availabilityOf(listing), 'unavailable');

    const sent = await call(ctx.base, '/requests/sent', { token: third.token });
    const row = sent.data.find((r) => r.id === second.data.id);
    assert.equal(row.status, 'declined');
  });

  test('declining never frees an item', async () => {
    const { owner, borrower, listing } = await setup();
    const request = await ask(borrower, listing);
    await setAvailability(owner, listing, 'unavailable');

    const declined = await respond(owner, request.data.id, 'declined');
    assert.equal(declined.status, 200);
    assert.equal(await availabilityOf(listing), 'unavailable');
  });

  test('cannot accept while the listing is unavailable', async () => {
    const { owner, borrower, listing } = await setup();
    const request = await ask(borrower, listing);
    await setAvailability(owner, listing, 'unavailable');

    const { status, data } = await respond(owner, request.data.id, 'accepted');
    assert.equal(status, 400);
    assert.match(data.error, /unavailable/);
  });

  test('enforces status transitions', async () => {
    const { owner, borrower, listing } = await setup();
    const request = await ask(borrower, listing);
    const id = request.data.id;

    assert.equal((await respond(owner, id, 'returned')).status, 400);
    assert.equal((await respond(owner, id, 'declined')).status, 200);
    assert.equal((await respond(owner, id, 'accepted')).status, 400);
    assert.equal((await respond(owner, id, 'declined')).status, 400);
  });

  test('only the listing owner can respond to a request', async () => {
    const { borrower, listing } = await setup();
    const request = await ask(borrower, listing);
    const { status } = await respond(borrower, request.data.id, 'accepted');
    assert.equal(status, 403);
  });

  test('skills stay available after acceptance and can have several learners', async () => {
    const { owner, borrower, listing } = await setup({
      type: 'skill',
      title: 'Guitar lessons',
    });
    const third = await newUser(ctx.base, 'Third');
    const first = await ask(borrower, listing);
    const second = await ask(third, listing);

    assert.equal((await respond(owner, first.data.id, 'accepted')).status, 200);
    assert.equal((await respond(owner, second.data.id, 'accepted')).status, 200);
    assert.equal(await availabilityOf(listing), 'available');
  });

  test('returning a tool frees it and stores condition notes', async () => {
    const { owner, borrower, listing } = await setup();
    const request = await ask(borrower, listing);
    await respond(owner, request.data.id, 'accepted');

    const returned = await respond(owner, request.data.id, 'returned', {
      damage_notes: 'Small scratch',
    });
    assert.equal(returned.status, 200);
    assert.equal(await availabilityOf(listing), 'available');

    const sent = await call(ctx.base, '/requests/sent', { token: borrower.token });
    const row = sent.data.find((r) => r.id === request.data.id);
    assert.equal(row.status, 'returned');
    assert.equal(row.damage_notes, 'Small scratch');
  });

  test('contact emails stay hidden until a request is accepted', async () => {
    const { owner, borrower, listing } = await setup();
    const request = await ask(borrower, listing);
    const id = request.data.id;

    const find = async (path, user) =>
      (await call(ctx.base, path, { token: user.token })).data.find((r) => r.id === id);

    assert.equal((await find('/requests/received', owner)).requester_email, null);
    assert.equal((await find('/requests/sent', borrower)).owner_email, null);

    await respond(owner, id, 'accepted');

    assert.equal((await find('/requests/received', owner)).requester_email, borrower.email);
    assert.equal((await find('/requests/sent', borrower)).owner_email, owner.email);
  });

  test('a lent-out tool cannot be marked available by hand or deleted', async () => {
    const { owner, borrower, listing } = await setup();
    const request = await ask(borrower, listing);
    await respond(owner, request.data.id, 'accepted');

    assert.equal((await setAvailability(owner, listing, 'available')).status, 400);

    const del = await call(ctx.base, `/listings/${listing.id}`, {
      method: 'DELETE',
      token: owner.token,
    });
    assert.equal(del.status, 400);
  });

  test('requesters can cancel only their own pending requests', async () => {
    const { owner, borrower, listing } = await setup();
    const third = await newUser(ctx.base, 'Third');
    const request = await ask(borrower, listing);
    const cancel = (user, id) =>
      call(ctx.base, `/requests/${id}`, { method: 'DELETE', token: user.token });

    assert.equal((await cancel(third, request.data.id)).status, 403);
    assert.equal((await cancel(borrower, request.data.id)).status, 200);

    const again = await ask(borrower, listing);
    assert.equal(again.status, 201);

    await respond(owner, again.data.id, 'accepted');
    assert.equal((await cancel(borrower, again.data.id)).status, 400);
  });

  test('rejects overly long messages', async () => {
    const { borrower, listing } = await setup();
    const { status } = await ask(borrower, listing, 'a'.repeat(501));
    assert.equal(status, 400);
  });
});

describe('reviews', () => {
  async function borrowAndReturn(owner, borrower, listing) {
    const request = await ask(borrower, listing);
    await respond(owner, request.data.id, 'accepted');
    await respond(owner, request.data.id, 'returned');
    return request.data.id;
  }

  const review = (user, requestId, rating, comment) =>
    call(ctx.base, '/reviews', {
      method: 'POST',
      token: user.token,
      body: { request_id: requestId, rating, comment },
    });

  test('only allowed once the request is returned', async () => {
    const { owner, borrower, listing } = await setup();
    const request = await ask(borrower, listing);
    assert.equal((await review(borrower, request.data.id, 5)).status, 400);

    await respond(owner, request.data.id, 'accepted');
    assert.equal((await review(borrower, request.data.id, 5)).status, 400);
  });

  test('only the requester can review', async () => {
    const { owner, borrower, listing } = await setup();
    const requestId = await borrowAndReturn(owner, borrower, listing);
    assert.equal((await review(owner, requestId, 5)).status, 403);
  });

  test('rating must be a whole number from 1 to 5', async () => {
    const { owner, borrower, listing } = await setup();
    const requestId = await borrowAndReturn(owner, borrower, listing);

    for (const rating of [0, 6, 2.5, 'abc']) {
      const { status } = await review(borrower, requestId, rating);
      assert.equal(status, 400, `rating ${rating} should be rejected`);
    }
  });

  test('one review per request', async () => {
    const { owner, borrower, listing } = await setup();
    const requestId = await borrowAndReturn(owner, borrower, listing);

    assert.equal((await review(borrower, requestId, 4, 'Great')).status, 201);
    assert.equal((await review(borrower, requestId, 5)).status, 409);
  });

  test('listing shows the average rating and review count', async () => {
    const { owner, borrower, listing } = await setup();
    const third = await newUser(ctx.base, 'Third');

    const first = await borrowAndReturn(owner, borrower, listing);
    const second = await borrowAndReturn(owner, third, listing);
    await review(borrower, first, 5, 'Excellent');
    await review(third, second, 2, 'Meh');

    const { data } = await call(ctx.base, `/listings/${listing.id}`);
    assert.equal(data.avg_rating, 3.5);
    assert.equal(data.review_count, 2);

    const reviews = await call(ctx.base, `/reviews/listing/${listing.id}`);
    assert.equal(reviews.data.length, 2);
    assert.ok(reviews.data.every((r) => r.reviewer_name));
  });
});