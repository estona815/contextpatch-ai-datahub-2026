-- Legacy v1 model intentionally retained as the incident's pre-patch state.
select
    settlement_id,
    dsp_name,
    reporting_month,
    isrc,
    artist_id,
    territory_code,
    stream_count,
    gross_revenue,
    platform_fee,
    artist_share,
    net_amount,
    currency,
    payout_status,
    'provider-v1' as source_schema_version,
    false as invalid_rights_split
from {{ ref('raw_dsp_settlements_v1') }}

