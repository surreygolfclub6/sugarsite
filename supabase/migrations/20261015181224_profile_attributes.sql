alter table profiles
  add column relationship_status text,
  add column relationship_goals text[] not null default '{}',
  add column height_cm int,
  add column body_type text,
  add column hair_colour text,
  add column ethnicity text;

alter table profiles
  add constraint relationship_status_valid check (relationship_status is null or relationship_status in
    ('single', 'separated', 'divorced', 'widowed', 'open', 'complicated')),
  add constraint relationship_goals_valid check (relationship_goals <@ array
    ['casual', 'no_strings', 'long_term', 'marriage', 'friendship', 'not_sure']::text[]),
  add constraint height_cm_valid check (height_cm is null or height_cm between 137 and 213),
  add constraint body_type_valid check (body_type is null or body_type in
    ('slim', 'athletic', 'average', 'curvy', 'muscular', 'few_extra', 'plus_size')),
  add constraint hair_colour_valid check (hair_colour is null or hair_colour in
    ('black', 'brown', 'blonde', 'red', 'grey', 'white', 'bald', 'other')),
  add constraint ethnicity_valid check (ethnicity is null or ethnicity in
    ('asian', 'black', 'hispanic', 'middle_eastern', 'mixed', 'white', 'other', 'prefer_not_to_say'));

-- Members edit their own descriptive columns; column grants must list the new ones.
grant update (relationship_status, relationship_goals, height_cm, body_type, hair_colour, ethnicity)
  on profiles to authenticated;
