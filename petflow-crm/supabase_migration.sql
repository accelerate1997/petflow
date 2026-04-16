-- Pet Spa CRM — Supabase Migration
-- Run this in your Supabase SQL editor

-- Clients table
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  whatsapp_number text,
  email text,
  address text,
  total_spend numeric default 0,
  join_date date default current_date,
  created_at timestamptz default now()
);

-- Pets table
create table if not exists pets (
  id uuid primary key default gen_random_uuid(),
  pet_name text not null,
  species text check (species in ('dog', 'cat', 'other')) default 'dog',
  breed text,
  weight numeric,
  temperament_notes text,
  medical_alerts text,
  photo_url text,
  owner_id uuid references clients(id) on delete cascade,
  created_at timestamptz default now()
);

-- Enable Row Level Security (optional for now — open for dev)
alter table clients enable row level security;
alter table pets enable row level security;

-- Permissive policy for development (replace with auth-based policies in production)
drop policy if exists "Allow all (clients)" on clients;
create policy "Allow all (clients)" on clients for all using (true) with check (true);

drop policy if exists "Allow all (pets)" on pets;
create policy "Allow all (pets)" on pets for all using (true) with check (true);


-- Storage bucket for pet photos
insert into storage.buckets (id, name, public)
values ('pet-photos', 'pet-photos', true)
on conflict (id) do nothing;

drop policy if exists "Public read pet photos" on storage.objects;
create policy "Public read pet photos" on storage.objects
  for select using (bucket_id = 'pet-photos');

drop policy if exists "Authenticated upload pet photos" on storage.objects;
create policy "Authenticated upload pet photos" on storage.objects
  for insert with check (bucket_id = 'pet-photos');


-- Seed sample data
insert into clients (name, whatsapp_number, email, address, total_spend, join_date) values
  ('Sarah Mitchell', '+91 98765 43210', 'sarah.m@email.com', '12 Rose Garden, Mumbai', 8500, '2024-01-15'),
  ('Rahul Sharma', '+91 87654 32109', 'rahul.s@email.com', '45 Green Park, Delhi', 12000, '2024-02-01'),
  ('Priya Nair', '+91 76543 21098', 'priya.n@email.com', '78 Palm Avenue, Bangalore', 5200, '2024-03-10'),
  ('Amir Khan', '+91 65432 10987', 'amir.k@email.com', '23 Blue Hills, Pune', 9800, '2024-01-28'),
  ('Deepika Verma', '+91 54321 09876', 'deepika.v@email.com', '56 Sunset Colony, Chennai', 3400, '2024-04-05');

insert into pets (pet_name, species, breed, weight, temperament_notes, medical_alerts, owner_id)
select 'Mango', 'dog', 'Golden Retriever', 28.5, 'Friendly', null, id from clients where name = 'Sarah Mitchell';

insert into pets (pet_name, species, breed, weight, temperament_notes, medical_alerts, owner_id)
select 'Luna', 'cat', 'Persian', 4.2, 'Calm', 'Allergic to flea medicine', id from clients where name = 'Sarah Mitchell';

insert into pets (pet_name, species, breed, weight, temperament_notes, medical_alerts, owner_id)
select 'Bruno', 'dog', 'German Shepherd', 32.0, 'Anxious', 'Hip dysplasia – go gentle', id from clients where name = 'Rahul Sharma';

insert into pets (pet_name, species, breed, weight, temperament_notes, medical_alerts, owner_id)
select 'Coco', 'dog', 'Labrador', 25.5, 'Friendly', null, id from clients where name = 'Priya Nair';

insert into pets (pet_name, species, breed, weight, temperament_notes, medical_alerts, owner_id)
select 'Whiskers', 'cat', 'Siamese', 3.8, 'Aggressive', 'Do not touch ears', id from clients where name = 'Amir Khan';

insert into pets (pet_name, species, breed, weight, temperament_notes, medical_alerts, owner_id)
select 'Max', 'dog', 'Poodle', 12.0, 'Calm', null, id from clients where name = 'Deepika Verma';

-- Appointments table
create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid references pets(id) on delete cascade,
  service_type text not null,
  appointment_date date not null,
  appointment_time time not null,
  status text check (status in ('Lead', 'Booked', 'CheckedIn', 'InService', 'Done', 'CheckedOut', 'Cancelled', 'No-show')) default 'Booked',
  price numeric default 0,
  notes text,
  created_at timestamptz default now()
);

alter table appointments enable row level security;
drop policy if exists "Allow all (appointments)" on appointments;
create policy "Allow all (appointments)" on appointments for all using (true) with check (true);

-- Seed sample appointments for today and upcoming days
insert into appointments (pet_id, service_type, appointment_date, appointment_time, status, price, notes)
select id, 'Full Grooming', current_date, '10:30', 'Scheduled', 2500, 'Hand strip only'
from pets where pet_name = 'Mango';

insert into appointments (pet_id, service_type, appointment_date, appointment_time, status, price, notes)
select id, 'Bath & Brush', current_date, '14:00', 'Scheduled', 1200, 'Use sensitive skin shampoo'
from pets where pet_name = 'Luna';

insert into appointments (pet_id, service_type, appointment_date, appointment_time, status, price, notes)
select id, 'Nail Trim', current_date + interval '1 day', '11:00', 'Scheduled', 500, null
from pets where pet_name = 'Bruno';

select id, 'Full Grooming', current_date + interval '2 days', '09:30', 'Scheduled', 2200, null
from pets where pet_name = 'Coco';

-- Services catalog table
create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  thumbnail text, -- URL or emoji
  service_name text not null,
  pet_type text check (pet_type in ('dog', 'cat', 'other', 'all')) default 'all',
  description text,
  price numeric default 0,
  created_at timestamptz default now()
);

alter table services enable row level security;
drop policy if exists "Allow all (services)" on services;
create policy "Allow all (services)" on services for all using (true) with check (true);

-- Seed initial services
insert into services (thumbnail, service_name, pet_type, description, price) values
  ('✂️', 'Full Grooming', 'all', 'Complete haircut, bath, nail trim, and ear cleaning.', 2500),
  ('🧼', 'Bath & Brush', 'all', 'Refreshing bath, blow dry, and thorough brushing.', 1200),
  ('💅', 'Nail Trim', 'all', 'Professional nail clipping and filing.', 500),
  ('🐶', 'Puppy First Groom', 'dog', 'Gentle introduction for puppies under 6 months.', 1800),
  ('🐱', 'Lion Cut', 'cat', 'Traditional cat grooming style.', 2200);

-- Settings table (singleton)
create table if not exists settings (
  id int primary key default 1,
  spa_name text default 'PetFlow Spa',
  spa_whatsapp text,
  spa_email text,
  spa_address text,
  business_hours jsonb default '{
    "mon": {"open": "09:00", "close": "18:00", "closed": false},
    "tue": {"open": "09:00", "close": "18:00", "closed": false},
    "wed": {"open": "09:00", "close": "18:00", "closed": false},
    "thu": {"open": "09:00", "close": "18:00", "closed": false},
    "fri": {"open": "09:00", "close": "18:00", "closed": false},
    "sat": {"open": "10:00", "close": "16:00", "closed": false},
    "sun": {"open": "00:00", "close": "00:00", "closed": true}
  }'::jsonb,
  currency_symbol text default '₹',
  updated_at timestamptz default now(),
  constraint singleton_row check (id = 1)
);

alter table settings enable row level security;
drop policy if exists "Allow all (settings)" on settings;
create policy "Allow all (settings)" on settings for all using (true) with check (true);

-- Seed initial settings
insert into settings (id, spa_name, spa_whatsapp, spa_email, spa_address)
values (1, 'PetFlow Spa', '+91 98765 43210', 'hello@petflow.com', '12 Rose Garden, Mumbai')
on conflict (id) do nothing;

-- WhatsApp Integration Config (singleton)
create table if not exists whatsapp_config (
  id int primary key default 1,
  evolution_api_url text,
  evolution_api_key text,
  instance_name text default 'PetFlow_Spa',
  openai_api_key text,
  agent_public_url text,
  booking_link text,
  spa_name text default 'PetFlow Spa',
  updated_at timestamptz default now(),
  constraint whatsapp_config_singleton check (id = 1)
);

alter table whatsapp_config enable row level security;
drop policy if exists "Allow all (whatsapp_config)" on whatsapp_config;
create policy "Allow all (whatsapp_config)" on whatsapp_config for all using (true) with check (true);

-- Seed default whatsapp config
insert into whatsapp_config (id) values (1) on conflict (id) do nothing;



