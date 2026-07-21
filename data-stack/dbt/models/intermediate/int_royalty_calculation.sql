select
    settlement_id,
    reporting_month,
    artist_id,
    isrc,
    territory_code,
    currency,
    gross_revenue,
    platform_fee,
    net_amount,
    artist_share,
    round(net_amount * artist_share, 2) as artist_payout_amount,
    source_schema_version
from {{ ref('stg_dsp_streams') }}
where not invalid_rights_split

