insert into public.sponsors (
  name,
  tagline,
  description,
  category,
  cta_text,
  cta_url,
  placement,
  city,
  badge,
  is_active
)
select
  'SPECIALS',
  'Your Richly Empowered & Loving Store.',
  'Your trusted fashion and beauty destination in the heart of Blantyre CBD. Discover a carefully selected range of clothes, shoes, handbags, beauty accessories, and more, with stylish, quality products at great value. Find us on Haile Selassie Avenue, in the same building as PEP & Sana, First Floor, Shop No. 11.',
  'Fashion & Beauty',
  'Find SPECIALS',
  'https://www.google.com/maps/search/?api=1&query=Specials%2C+Haile+Selassie+Avenue%2C+Blantyre%2C+Malawi',
  'all',
  'Blantyre',
  'Featured Partner',
  true
where not exists (
  select 1
  from public.sponsors
  where lower(name) = lower('SPECIALS')
);
