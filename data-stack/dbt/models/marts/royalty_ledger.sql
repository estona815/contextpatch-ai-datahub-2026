select
    settlement_id,
    reporting_month,
    artist_id,
    isrc,
    territory_code,
    currency,
    artist_payout_amount,
    source_schema_version
from {{ ref('int_royalty_calculation') }}

