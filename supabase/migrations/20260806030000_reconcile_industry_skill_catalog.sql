-- Idempotent hosted data reconciliation for the industry and skill catalog.
-- Hosted produces INVALID_WORKER_SKILLS from submit_worker_onboarding_identity
-- even though the app reads the catalog from the same database, which points to
-- drift in industries/service_categories rows (e.g. is_active toggled or an
-- industry_id mapping lost). Re-assert the authoritative 10-industry / 50-skill
-- catalog keyed on slug/name so existing row ids and all references are
-- preserved. The RPCs are intentionally not recreated here: the presence of the
-- taxonomy-era error on hosted already proves the function contract is live.

begin;

insert into public.industries(slug, name, description, sort_order, is_active)
values
  ('cleaning', 'Cleaning', 'Residential and property cleaning services.', 10, true),
  ('electrical', 'Electrical', 'Electrical installation, maintenance, and repair services.', 20, true),
  ('plumbing', 'Plumbing', 'Plumbing installation, maintenance, and repair services.', 30, true),
  ('carpentry', 'Carpentry', 'Woodwork, furniture, fixture, and partition services.', 40, true),
  ('painting', 'Painting', 'Interior, exterior, and decorative painting services.', 50, true),
  ('masonry-tiling', 'Masonry & Tiling', 'Masonry, concrete, plastering, and tile services.', 60, true),
  ('air-conditioning-refrigeration', 'Air Conditioning & Refrigeration', 'Cooling and refrigeration installation, maintenance, and repair services.', 70, true),
  ('appliance-repair', 'Appliance Repair', 'Household and small-appliance diagnosis and repair services.', 80, true),
  ('landscaping-gardening', 'Landscaping & Gardening', 'Garden, lawn, planting, irrigation, and yard services.', 90, true),
  ('roofing-waterproofing', 'Roofing & Waterproofing', 'Roof, gutter, leak, and waterproofing services.', 100, true)
on conflict (slug) do update
set name = excluded.name,
    description = excluded.description,
    sort_order = excluded.sort_order,
    is_active = true,
    updated_at = now();

with catalog(industry_slug, skill_slug, skill_name, skill_description) as (
  values
    ('cleaning', 'cleaning', 'Cleaning', 'General home and property cleaning.'),
    ('cleaning', 'deep-cleaning', 'Deep Cleaning', 'Detailed cleaning of high-use and hard-to-reach areas.'),
    ('cleaning', 'move-in-move-out-cleaning', 'Move-In/Move-Out Cleaning', 'Cleaning before occupancy or after vacating a property.'),
    ('cleaning', 'post-construction-cleaning', 'Post-Construction Cleaning', 'Removal of construction dust and debris after completed work.'),
    ('cleaning', 'carpet-upholstery-cleaning', 'Carpet & Upholstery Cleaning', 'Cleaning of carpets, rugs, and upholstered furniture.'),
    ('electrical', 'electrical', 'Electrical', 'General electrical diagnosis and repair.'),
    ('electrical', 'wiring-rewiring', 'Wiring & Rewiring', 'Installation or replacement of electrical wiring.'),
    ('electrical', 'lighting-installation', 'Lighting Installation', 'Installation and replacement of lighting fixtures.'),
    ('electrical', 'outlet-switch-installation', 'Outlet & Switch Installation', 'Installation and repair of outlets and switches.'),
    ('electrical', 'panel-circuit-breaker-service', 'Panel & Circuit Breaker Service', 'Inspection, repair, and replacement of panels and breakers.'),
    ('plumbing', 'plumbing', 'Plumbing', 'General plumbing diagnosis and repair.'),
    ('plumbing', 'leak-detection-repair', 'Leak Detection & Repair', 'Detection and repair of water leaks.'),
    ('plumbing', 'drain-unclogging', 'Drain Unclogging', 'Clearing blocked sinks, drains, and waste lines.'),
    ('plumbing', 'fixture-installation', 'Fixture Installation', 'Installation and replacement of plumbing fixtures.'),
    ('plumbing', 'pipe-installation-repair', 'Pipe Installation & Repair', 'Installation, replacement, and repair of water pipes.'),
    ('carpentry', 'furniture-repair', 'Furniture Repair', 'Repair and restoration of wooden furniture.'),
    ('carpentry', 'cabinet-installation-repair', 'Cabinet Installation & Repair', 'Installation, alignment, and repair of cabinets.'),
    ('carpentry', 'door-window-repair', 'Door & Window Repair', 'Repair and adjustment of wooden doors and windows.'),
    ('carpentry', 'custom-woodwork', 'Custom Woodwork', 'Made-to-measure wood fixtures and furnishings.'),
    ('carpentry', 'ceiling-partition-installation', 'Ceiling & Partition Installation', 'Installation and repair of ceilings and room partitions.'),
    ('painting', 'interior-painting', 'Interior Painting', 'Painting of indoor walls, ceilings, and fixtures.'),
    ('painting', 'exterior-painting', 'Exterior Painting', 'Weather-resistant painting of exterior surfaces.'),
    ('painting', 'repainting-touch-ups', 'Repainting & Touch-Ups', 'Refresh coats and localized paint repairs.'),
    ('painting', 'surface-preparation', 'Surface Preparation', 'Cleaning, sanding, patching, and priming before painting.'),
    ('painting', 'decorative-finishing', 'Decorative Finishing', 'Decorative paint effects and specialty finishes.'),
    ('masonry-tiling', 'tile-installation-repair', 'Tile Installation & Repair', 'Installation and replacement of wall and floor tiles.'),
    ('masonry-tiling', 'concrete-repair', 'Concrete Repair', 'Repair of damaged concrete surfaces and minor structures.'),
    ('masonry-tiling', 'wall-fence-construction', 'Wall & Fence Construction', 'Construction and repair of masonry walls and fences.'),
    ('masonry-tiling', 'plastering-rendering', 'Plastering & Rendering', 'Application and repair of plaster and cement render.'),
    ('masonry-tiling', 'minor-demolition', 'Minor Demolition', 'Controlled removal of small non-structural masonry work.'),
    ('air-conditioning-refrigeration', 'aircon-cleaning-maintenance', 'Aircon Cleaning & Maintenance', 'Routine cleaning and preventive maintenance of air conditioners.'),
    ('air-conditioning-refrigeration', 'aircon-installation', 'Aircon Installation', 'Installation and commissioning of air-conditioning units.'),
    ('air-conditioning-refrigeration', 'aircon-repair', 'Aircon Repair', 'Diagnosis and repair of air-conditioning faults.'),
    ('air-conditioning-refrigeration', 'refrigerant-charging', 'Refrigerant Charging', 'Leak-aware refrigerant diagnosis and charging.'),
    ('air-conditioning-refrigeration', 'refrigerator-freezer-repair', 'Refrigerator & Freezer Repair', 'Diagnosis and repair of household refrigeration appliances.'),
    ('appliance-repair', 'washing-machine-repair', 'Washing Machine Repair', 'Diagnosis and repair of washing machines.'),
    ('appliance-repair', 'stove-oven-repair', 'Stove & Oven Repair', 'Diagnosis and repair of electric or gas cooking appliances.'),
    ('appliance-repair', 'water-heater-repair', 'Water Heater Repair', 'Diagnosis and repair of household water heaters.'),
    ('appliance-repair', 'electric-fan-repair', 'Electric Fan Repair', 'Diagnosis and repair of electric fans.'),
    ('appliance-repair', 'small-appliance-repair', 'Small Appliance Repair', 'Diagnosis and repair of supported small household appliances.'),
    ('landscaping-gardening', 'lawn-garden-maintenance', 'Lawn & Garden Maintenance', 'Routine lawn and garden care.'),
    ('landscaping-gardening', 'tree-shrub-trimming', 'Tree & Shrub Trimming', 'Pruning and trimming of manageable trees and shrubs.'),
    ('landscaping-gardening', 'garden-design-planting', 'Garden Design & Planting', 'Garden layout, soil preparation, and planting.'),
    ('landscaping-gardening', 'irrigation-installation-repair', 'Irrigation Installation & Repair', 'Installation and repair of garden irrigation systems.'),
    ('landscaping-gardening', 'yard-cleanup', 'Yard Cleanup', 'Removal of leaves, cuttings, and ordinary yard debris.'),
    ('roofing-waterproofing', 'roof-inspection-repair', 'Roof Inspection & Repair', 'Inspection and repair of damaged roofing components.'),
    ('roofing-waterproofing', 'roof-leak-repair', 'Roof Leak Repair', 'Identification and repair of roof water entry points.'),
    ('roofing-waterproofing', 'gutter-installation-cleaning', 'Gutter Installation & Cleaning', 'Installation, repair, and cleaning of roof gutters.'),
    ('roofing-waterproofing', 'waterproofing', 'Waterproofing', 'Application and repair of waterproofing systems.'),
    ('roofing-waterproofing', 'roof-installation-replacement', 'Roof Installation & Replacement', 'Installation or replacement of roof covering systems.')
)
insert into public.service_categories(name, slug, description, is_active, industry_id)
select catalog.skill_name, catalog.skill_slug, catalog.skill_description, true, industry.id
from catalog
join public.industries industry on industry.slug = catalog.industry_slug
on conflict (name) do update
set slug = excluded.slug,
    description = coalesce(public.service_categories.description, excluded.description),
    is_active = true,
    industry_id = excluded.industry_id,
    updated_at = now();

commit;
