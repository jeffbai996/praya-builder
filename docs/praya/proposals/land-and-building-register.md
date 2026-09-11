# Proposed Praya land and building register

Status: product direction endorsed by the user on 2026-09-11, following the September 10 proposal. The detailed schema and implementation stages remain proposed; no registry has been implemented by this document. Institution names and boundaries are not established canon. The user confirmed that Praya already has street addresses for the most part: ingest and verify those existing records rather than inventing a new numbering system.

## Purpose

Organize hundreds of designs around persistent places and buildings. Address is a searchable human label, not the primary identifier. Keep unassigned architectural studies first-class.

## Records

- Municipality and neighbourhood: verified names and optional boundaries, with provenance and unknown boundaries explicitly allowed.
- Parcel: stable ID, Minecraft world ID, X/Z boundary polygon, lifecycle and optional survey records. A parcel is persistent land; a captured survey is dated evidence of terrain/buildings. Existing rectangular construction envelopes are not cadastral parcel boundaries.
- Address: street record, civic number, suffix/unit and verified alternate-language text, linked to the relevant entrances/buildings/parcels. Support multiple addresses per building and multiple buildings per parcel. Do not infer addresses or official boundaries from screenshots or proximity alone.
- Building: stable identity, name/use, footprint and links to parcels, entrances and addresses. Existing buildings can exist without any generated design.
- Design project: design alternatives, immutable saved versions and references. Can remain unassigned or be proposed for a building/site. Reusable designs can have multiple site applications; a design version is not proof of what exists in the world.
- Survey: captured time, extent, source and block snapshot/hash, linked to parcels/buildings without defining their identity.

Use Minecraft X/Z in block units and retain world identity. No invented latitude/longitude. Preserve Y for heights, entrances and construction envelopes.

## Product structure

Builder becomes the searchable/map-based register; Studio remains the editor. Municipality, neighbourhood, street/address, building use and status become filters. Offer places, buildings and unassigned studies. Each building/parcel page links maps, addresses, surveys, candidate designs and history. Clearly distinguish a proposed design from an observed existing building or an actually verified placement.

## Incremental implementation

1. Add persistent building/project identity, optional location/address fields and an Unassigned studies collection. Migrate existing drafts into projects without changing immutable saved artifacts or breaking links. Add search and filters to the library, backed by paginated summary endpoints that do not return complete plans and histories for every card.
2. Add a parcel map and selection workflow using the existing BlueMap location/survey integration as a starting point. Verify coordinate alignment and available overlay interfaces before choosing implementation. Initially allow manually drawn boundaries and uncertain/unverified records.
3. Add dated surveys, revisions to parcel boundaries, merge/split lineage, address verification and optional road/municipal boundary layers. Real-world placement remains separately controlled; this registry work does not lift the current placement pause.

## Reference models

ArcGIS parcel fabrics associate parcel geometry with source records and retain historical lineage. ArcGIS Address Data Management separates road names, road centerlines, site addresses and mailing addresses. Borrow these separations without reproducing a full legal-title, tax or ownership system.

Sources reviewed September 10:
- https://doc.esri.com/en/arcgis-pro/latest/help/data/parcel-editing/createaparcelfabric.html
- https://doc.arcgis.com/en/arcgis-solutions/latest/reference/introduction-to-address-data-management.htm

Existing-code review: preview/sites.cjs already provides bounded surveys, protected areas, world coordinates, placement transforms and site assessment. These are useful survey/construction primitives, not a current land register.
