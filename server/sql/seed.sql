-- =============================================================================
-- Community Food Wastage Reduction Portal - seed data
--
-- Run AFTER schema.sql:
--   npm run db:seed        (uses DATABASE_URL from server/.env)
--   psql "$DATABASE_URL" -f server/sql/seed.sql
--
-- ALL demo accounts share the password:  password
-- (bcrypt digest of "password", regenerated so the documented credentials
--  actually work - the previous literal did not verify).
-- CHANGE THESE CREDENTIALS (or delete the demo users) before any real deploy.
--
-- NOTE: every timestamp is expressed relative to NOW() (e.g. now() - interval
-- '2 days'), so the demo feed always has fresh, claimable listings no matter
-- when the seed is run. Do not replace these with fixed calendar dates.
-- =============================================================================

-- Reset every table and restart the identity sequences so ids are predictable.
TRUNCATE TABLE feedback, notifications, status_history, claims, donation_images,
  donations, food_categories, ngo_verifications, users
  RESTART IDENTITY CASCADE;

-- -----------------------------------------------------------------------------
-- 1. Users
-- -----------------------------------------------------------------------------

-- Admin
INSERT INTO users (email, password_hash, full_name, phone, city, address, latitude, longitude, org_type, role, account_status)
VALUES
 ('admin@portal.com',
  '$2a$10$EUfTO1HqjtN54gPh/S/Kbu2ItVpb/6SupzoAKvQmbdDblM8DQjVoW',
  'System Administrator', '+91 98765 43210', 'Bengaluru', 'Portal HQ, MG Road', 12.9756000, 77.6060000, 'ADMIN', 'ADMIN', 'ACTIVE');

-- Donors (restaurant, hotel, individual)
INSERT INTO users (email, password_hash, full_name, phone, city, address, latitude, longitude, org_type, role, account_status)
VALUES
 ('spiceroute@demo.com',
  '$2a$10$EUfTO1HqjtN54gPh/S/Kbu2ItVpb/6SupzoAKvQmbdDblM8DQjVoW',
  'Chef Arjun Nair', '+91 98110 22334', 'Bengaluru', '12 Residency Road, Bengaluru', 12.9716000, 77.5946000, 'RESTAURANT', 'DONOR', 'ACTIVE'),
 ('grandleaf@demo.com',
  '$2a$10$EUfTO1HqjtN54gPh/S/Kbu2ItVpb/6SupzoAKvQmbdDblM8DQjVoW',
  'Meera Krishnan', '+91 98450 55667', 'Bengaluru', '45 Lavelle Road, Bengaluru', 12.9698000, 77.6000000, 'HOTEL', 'DONOR', 'ACTIVE'),
 ('asha@demo.com',
  '$2a$10$EUfTO1HqjtN54gPh/S/Kbu2ItVpb/6SupzoAKvQmbdDblM8DQjVoW',
  'Asha Iyer', '+91 99001 11223', 'Bengaluru', 'Koramangala 5th Block, Bengaluru', 12.9352000, 77.6245000, 'INDIVIDUAL', 'DONOR', 'ACTIVE');

-- Recipients: NGO + shelter are approved, volunteer needs no documents.
INSERT INTO users (email, password_hash, full_name, phone, city, address, latitude, longitude, org_type, role, account_status)
VALUES
 ('helpinghands@demo.com',
  '$2a$10$EUfTO1HqjtN54gPh/S/Kbu2ItVpb/6SupzoAKvQmbdDblM8DQjVoW',
  'David Dsouza', '+91 98330 77889', 'Bengaluru', 'Indiranagar, Bengaluru', 12.9784000, 77.6408000, 'NGO', 'RECIPIENT', 'ACTIVE'),
 ('sunshine@demo.com',
  '$2a$10$EUfTO1HqjtN54gPh/S/Kbu2ItVpb/6SupzoAKvQmbdDblM8DQjVoW',
  'Farah Khan', '+91 97620 33445', 'Bengaluru', 'Jayanagar, Bengaluru', 12.9250000, 77.5938000, 'SHELTER', 'RECIPIENT', 'ACTIVE'),
 ('rahul@demo.com',
  '$2a$10$EUfTO1HqjtN54gPh/S/Kbu2ItVpb/6SupzoAKvQmbdDblM8DQjVoW',
  'Rahul Verma', '+91 98111 44556', 'Bengaluru', 'HSR Layout, Bengaluru', 12.9121000, 77.6446000, 'VOLUNTEER', 'RECIPIENT', 'ACTIVE');

-- A NEW NGO still waiting for admin approval (shows the admin queue + pending login block)
INSERT INTO users (email, password_hash, full_name, phone, city, address, latitude, longitude, org_type, role, account_status)
VALUES
 ('greenbites@demo.com',
  '$2a$10$EUfTO1HqjtN54gPh/S/Kbu2ItVpb/6SupzoAKvQmbdDblM8DQjVoW',
  'Nisha Rao', '+91 90909 12121', 'Bengaluru', 'Whitefield, Bengaluru', 12.9698000, 77.7500000, 'NGO', 'RECIPIENT', 'PENDING_VERIFICATION');

-- -----------------------------------------------------------------------------
-- 2. NGO verification documents
-- Approved records for the two active recipients, pending one for Green Bites.
-- -----------------------------------------------------------------------------
INSERT INTO ngo_verifications (user_id, document_type, document_url, status, reviewed_by, submitted_at, reviewed_at, review_note)
SELECT u.id, 'REGISTRATION_CERTIFICATE', '/uploads/verifications/helpinghands-registration.pdf',
       'APPROVED', a.id, now() - interval '47 days', now() - interval '46 days', 'Documents verified, NGO registered under Societies Act.'
FROM users u JOIN users a ON a.email = 'admin@portal.com'
WHERE u.email = 'helpinghands@demo.com';

INSERT INTO ngo_verifications (user_id, document_type, document_url, status, reviewed_by, submitted_at, reviewed_at, review_note)
SELECT u.id, 'TRUST_DEED', '/uploads/verifications/sunshine-trust-deed.pdf',
       'APPROVED', a.id, now() - interval '45 days', now() - interval '44 days', 'Shelter verified with municipal licence on file.'
FROM users u JOIN users a ON a.email = 'admin@portal.com'
WHERE u.email = 'sunshine@demo.com';

INSERT INTO ngo_verifications (user_id, document_type, document_url, status, submitted_at)
SELECT u.id, 'GST_CERTIFICATE', '/uploads/verifications/greenbites-gst.pdf',
       'PENDING', now() - interval '3 days'
FROM users u
WHERE u.email = 'greenbites@demo.com';

-- -----------------------------------------------------------------------------
-- 3. Food categories
-- -----------------------------------------------------------------------------
INSERT INTO food_categories (name, slug, type) VALUES
 ('Fresh Fruits & Vegetables', 'fresh-fruits-vegetables', 'VEG'),
 ('Vegetarian Meals',          'vegetarian-meals',        'VEG'),
 ('Bakery & Breads',           'bakery-breads',           'VEG'),
 ('Beverages',                 'beverages',               'VEG'),
 ('Dairy & Eggs',              'dairy-eggs',              'VEG'),
 ('Grains & Staples',          'grains-staples',          'VEG'),
 ('Non-Veg Main Course',       'non-veg-main-course',     'NON_VEG'),
 ('Non-Veg Snacks',            'non-veg-snacks',          'NON_VEG');

-- -----------------------------------------------------------------------------
-- 4. Donations (Bengaluru coordinates so the radius search demos nicely)
-- -----------------------------------------------------------------------------

-- 4.1 Fresh fruits - AVAILABLE
INSERT INTO donations
  (donor_id, category_id, title, description, quantity_kg, unit, best_before,
   pickup_address, pickup_city, pickup_latitude, pickup_longitude, status, created_at)
SELECT u.id, c.id, 'Fresh seasonal fruits',
       'Surplus fruit crate from today''s service. Apples, bananas, oranges - washed and packed.',
       20.00, 'kg', now() + interval '2 days',
       '12 Residency Road', 'Bengaluru', 12.9716000, 77.5946000, 'AVAILABLE', now() - interval '1 day 2 hours'
FROM users u JOIN food_categories c ON c.slug = 'fresh-fruits-vegetables'
WHERE u.email = 'spiceroute@demo.com';

-- 4.2 Bakery surplus - AVAILABLE (counted in servings)
INSERT INTO donations
  (donor_id, category_id, title, description, quantity_servings, unit, best_before,
   pickup_address, pickup_city, pickup_latitude, pickup_longitude, status, created_at)
SELECT u.id, c.id, 'Assorted bakery items',
       'Croissants, muffins and sourdough loaves baked this morning. Best consumed within 24 hours.',
       40, 'servings', now() + interval '1 day',
       '45 Lavelle Road', 'Bengaluru', 12.9698000, 77.6000000, 'AVAILABLE', now() - interval '1 day 3 hours'
FROM users u JOIN food_categories c ON c.slug = 'bakery-breads'
WHERE u.email = 'grandleaf@demo.com';

-- 4.3 Vegetarian thali - CLAIMED by Helping Hands NGO
INSERT INTO donations
  (donor_id, category_id, title, description, quantity_servings, unit, best_before,
   pickup_address, pickup_city, pickup_latitude, pickup_longitude, status, created_at)
SELECT u.id, c.id, 'Vegetarian thali set',
       '30 freshly prepared veg thalis (rice, dal, sabzi, roti). Ready for pickup from 6 PM.',
       30, 'servings', now() + interval '1 day',
       '12 Residency Road', 'Bengaluru', 12.9716000, 77.5946000, 'CLAIMED', now() - interval '1 day 4 hours'
FROM users u JOIN food_categories c ON c.slug = 'vegetarian-meals'
WHERE u.email = 'spiceroute@demo.com';

-- 4.4 Non-veg biryani - DELIVERED last week (feeds the feedback + reports demo)
INSERT INTO donations
  (donor_id, category_id, title, description, quantity_kg, unit, best_before,
   pickup_address, pickup_city, pickup_latitude, pickup_longitude, status, created_at)
SELECT u.id, c.id, 'Chicken biryani (bulk)',
       'Banquet surplus of 25 kg chicken biryani, held at safe temperature throughout.',
       25.00, 'kg', now() - interval '7 days',
       '45 Lavelle Road', 'Bengaluru', 12.9698000, 77.6000000, 'DELIVERED', now() - interval '9 days'
FROM users u JOIN food_categories c ON c.slug = 'non-veg-main-course'
WHERE u.email = 'grandleaf@demo.com';

-- 4.5 Fresh dairy - AVAILABLE (individual donor, Koramangala)
INSERT INTO donations
  (donor_id, category_id, title, description, quantity_kg, unit, best_before,
   pickup_address, pickup_city, pickup_latitude, pickup_longitude, status, created_at)
SELECT u.id, c.id, 'Fresh milk, curd & paneer',
       'Sealed dairy packets from a family function. Refrigerated since purchase.',
       15.00, 'kg', now() + interval '3 days',
       'Koramangala 5th Block', 'Bengaluru', 12.9352000, 77.6245000, 'AVAILABLE', now() - interval '1 day'
FROM users u JOIN food_categories c ON c.slug = 'dairy-eggs'
WHERE u.email = 'asha@demo.com';

-- 4.6 Packaged beverages - EXPIRED on purpose (proves auto-hide of stale listings)
INSERT INTO donations
  (donor_id, category_id, title, description, quantity_servings, unit, best_before,
   pickup_address, pickup_city, pickup_latitude, pickup_longitude, status, created_at)
SELECT u.id, c.id, 'Packaged juice cartons',
       'Leftover juice cartons from a corporate event. Already past best-before date.',
       50, 'servings', now() - interval '3 days',
       'Koramangala 5th Block', 'Bengaluru', 12.9352000, 77.6245000, 'AVAILABLE', now() - interval '4 days'
FROM users u JOIN food_categories c ON c.slug = 'beverages'
WHERE u.email = 'asha@demo.com';

-- -----------------------------------------------------------------------------
-- 5. Images (paths only; drop real files into server/uploads/donations to see them)
-- -----------------------------------------------------------------------------
INSERT INTO donation_images (donation_id, image_url, is_primary)
SELECT d.id, '/uploads/donations/demo-fruits.jpg', 1 FROM donations d WHERE d.title = 'Fresh seasonal fruits';
INSERT INTO donation_images (donation_id, image_url, is_primary)
SELECT d.id, '/uploads/donations/demo-bakery.jpg', 1 FROM donations d WHERE d.title = 'Assorted bakery items';
INSERT INTO donation_images (donation_id, image_url, is_primary)
SELECT d.id, '/uploads/donations/demo-thali.jpg', 1 FROM donations d WHERE d.title = 'Vegetarian thali set';

-- -----------------------------------------------------------------------------
-- 6. Claims
-- -----------------------------------------------------------------------------

-- Active claim on the veg thali
INSERT INTO claims (donation_id, recipient_id, status, pickup_note, claimed_at)
SELECT d.id, r.id, 'ACTIVE', 'Van will arrive at 6:15 PM. Contact: +91 98330 77889', now() - interval '1 day 3 hours'
FROM donations d JOIN users r ON r.email = 'helpinghands@demo.com'
WHERE d.title = 'Vegetarian thali set';

-- Completed claim on the biryani
INSERT INTO claims (donation_id, recipient_id, status, pickup_note, claimed_at, delivered_at, delivered_proof_url)
SELECT d.id, r.id, 'DELIVERED', 'Collected last week.', now() - interval '9 days', now() - interval '7 days',
       '/uploads/deliveries/demo-biryani-proof.jpg'
FROM donations d JOIN users r ON r.email = 'sunshine@demo.com'
WHERE d.title = 'Chicken biryani (bulk)';

-- -----------------------------------------------------------------------------
-- 7. Status history (audit trail for every seeded change)
-- -----------------------------------------------------------------------------
INSERT INTO status_history (donation_id, status, changed_by, note, changed_at)
SELECT d.id, 'AVAILABLE', u.id, 'Listing created', d.created_at
FROM donations d JOIN users u ON u.id = d.donor_id;

INSERT INTO status_history (donation_id, status, changed_by, note, changed_at)
SELECT d.id, 'CLAIMED', r.id, 'Claimed by Helping Hands NGO', now() - interval '1 day 3 hours'
FROM donations d JOIN users r ON r.email = 'helpinghands@demo.com'
WHERE d.title = 'Vegetarian thali set';

INSERT INTO status_history (donation_id, status, changed_by, note, changed_at)
SELECT d.id, 'CLAIMED', r.id, 'Claimed by Sunshine Shelter', now() - interval '9 days'
FROM donations d JOIN users r ON r.email = 'sunshine@demo.com'
WHERE d.title = 'Chicken biryani (bulk)';

INSERT INTO status_history (donation_id, status, changed_by, note, changed_at)
SELECT d.id, 'DELIVERED', r.id, 'Delivery confirmed by recipient', now() - interval '7 days'
FROM donations d JOIN users r ON r.email = 'sunshine@demo.com'
WHERE d.title = 'Chicken biryani (bulk)';

-- -----------------------------------------------------------------------------
-- 8. Feedback
-- -----------------------------------------------------------------------------
INSERT INTO feedback (donation_id, recipient_id, donor_id, rating, comment, created_at)
SELECT d.id, r.id, d.donor_id, 5, 'Excellent quality - the biryani was still warm and hygiene was spot on.', now() - interval '7 days'
FROM donations d JOIN users r ON r.email = 'sunshine@demo.com'
WHERE d.title = 'Chicken biryani (bulk)';

-- -----------------------------------------------------------------------------
-- 9. Notifications
-- -----------------------------------------------------------------------------
INSERT INTO notifications (user_id, type, title, message, payload, created_at)
SELECT a.id, 'VERIFICATION_SUBMITTED', 'New NGO awaiting approval',
       'Green Bites Foundation submitted verification documents for review.',
       jsonb_build_object('verificationId', 3, 'userId', u.id), now() - interval '3 days'
FROM users a JOIN users u ON u.email = 'greenbites@demo.com'
WHERE a.email = 'admin@portal.com';

INSERT INTO notifications (user_id, type, title, message, payload, created_at)
SELECT r.id, 'DONATION_POSTED', 'New food available nearby',
       'Fresh milk, curd & paneer (15 kg) is available 1.2 km away from Koramangala.',
       jsonb_build_object('donationId', d.id), now() - interval '1 day'
FROM users r JOIN donations d ON d.title = 'Fresh milk, curd & paneer'
WHERE r.email = 'helpinghands@demo.com';
